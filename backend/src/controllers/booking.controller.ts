import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { Booking, Showtime, Loyalty, Seat, User } from '../models';
import { AuthRequest } from '../middleware/errorHandler';
import { lockSeats, releaseSeats, getSeatLockOwner } from '../config/redis';
import { getIO, trackSeatLock } from '../socket/socketServer';

// Email cố định của walk-in user (khách vãng lai tại quầy)
const WALKIN_EMAIL = 'walkin@popcorn.local';

// Cấu hình loyalty
const TIER_DISCOUNT: Record<string, number> = {
  bronze: 0, silver: 0.05, gold: 0.08, platinum: 0.10,
}
const POINTS_PER_VND = 100      // 100 điểm = 10.000đ
const POINTS_VALUE = 100        // 100đ mỗi điểm (100 điểm = 10.000đ)
const MAX_POINTS_RATIO = 0.30   // tối đa 30% giá trị đơn

// GET /bookings/loyalty
// Staff/Admin có thể truyền ?userId=xxx để tra điểm của khách
export async function getLoyaltyInfo(req: AuthRequest, res: Response) {
  try {
    const isStaff = ['admin', 'staff'].includes(req.user?.role || '')
    // Staff được phép tra điểm của khách bất kỳ
    const targetUserId = (isStaff && req.query.userId)
      ? req.query.userId as string
      : req.user!.id

    const loyalty = await Loyalty.findOne({ user: targetUserId })
    if (!loyalty) {
      return res.json({ success: true, data: { points: 0, tier: 'bronze', tierDiscount: 0 } })
    }
    return res.json({
      success: true,
      data: {
        points: loyalty.points,
        tier: loyalty.tier,
        tierDiscount: TIER_DISCOUNT[loyalty.tier] || 0,
      }
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// POST /bookings/apply-points
export async function applyPoints(req: AuthRequest, res: Response) {
  try {
    const { bookingId, pointsToUse } = req.body
    if (!bookingId || pointsToUse === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin' })
    }

    const booking = await Booking.findById(bookingId)
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' })
    if (booking.user.toString() !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Không có quyền' })
    }
    if (!['pending', 'pending_payment'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Booking không hợp lệ' })
    }

    // FIX: Luôn lấy điểm từ DB, không nhận từ request body
    const loyalty = await Loyalty.findOne({ user: req.user!.id })
    const availablePoints = loyalty?.points || 0

    if (pointsToUse > availablePoints) {
      return res.status(400).json({ success: false, message: 'Không đủ điểm' })
    }

    // Tính giảm giá từ điểm
    const originalAmount = booking.totalAmount
    const maxDiscount = Math.floor(originalAmount * MAX_POINTS_RATIO)
    const pointsDiscount = Math.min(pointsToUse * POINTS_VALUE, maxDiscount)
    const actualPointsUsed = Math.ceil(pointsDiscount / POINTS_VALUE)

    // Tính giảm giá theo hạng thẻ
    const tier = loyalty?.tier || 'bronze'
    const tierDiscountAmount = Math.floor(originalAmount * (TIER_DISCOUNT[tier] || 0))

    const finalAmount = Math.max(0, originalAmount - pointsDiscount - tierDiscountAmount)

    return res.json({
      success: true,
      data: {
        originalAmount,
        pointsDiscount,
        tierDiscount: tierDiscountAmount,
        tierName: tier,
        tierPercent: (TIER_DISCOUNT[tier] || 0) * 100,
        finalAmount,
        actualPointsUsed,
        availablePoints,
      }
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// POST /bookings
export async function createBooking(req: AuthRequest, res: Response) {
  try {
    const { showtimeId, seatIds: rawSeatIds, seats: legacySeats, customerId, isCounterSale, isGroupBooking, groupMemberIds } = req.body;
    const seatIds: string[] = rawSeatIds || legacySeats || [];
    const isStaff = ['admin', 'staff'].includes(req.user?.role || '');

    // Xác định userId:
    // - Staff/Admin bán tại quầy + có customerId → gán cho khách có tài khoản
    // - Staff bán tại quầy + không có customerId → gán cho Khách Vãng Lai
    // - Staff/Admin tự đặt online (isCounterSale = false/undefined) → gán cho chính họ
    // - Customer → gán cho chính họ
    let userId = req.user!.id;

    if (isStaff && isCounterSale) {
      if (customerId) {
        // Bán cho khách có tài khoản
        userId = customerId;
      } else {
        // Bán cho khách vãng lai
        let walkIn = await User.findOne({ email: WALKIN_EMAIL }).lean() as any;
        if (!walkIn) {
          walkIn = await User.create({
            name: 'Khách Vãng Lai',
            email: WALKIN_EMAIL,
            password: 'walkin_not_login_' + Date.now(),
            role: 'customer',
            isVerified: false,
          });
        }
        userId = walkIn._id.toString();
      }
    }
    // isCounterSale = false/undefined → Staff/Admin/Customer tự đặt → userId = req.user!.id (giữ nguyên)

    if (!showtimeId || !seatIds.length) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin suất chiếu hoặc ghế' });
    }

    const showtime = await Showtime.findById(showtimeId).populate('room');
    if (!showtime) return res.status(404).json({ success: false, message: 'Không tìm thấy suất chiếu' });

    const room = showtime.room as any;
    if (!room) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng chiếu' });

    let allSeats: any[] = room.seats || [];
    if (allSeats.length === 0) {
      allSeats = await Seat.find({ room: room._id }).lean();
    }

    const selectedSeats = allSeats.filter((s: any) => seatIds.includes(s._id.toString()));
    if (selectedSeats.length !== seatIds.length) {
      return res.status(400).json({ success: false, message: 'Một hoặc nhiều ghế không hợp lệ' });
    }

    const bookedSeatIds = (showtime.bookedSeats || []).map((id: any) => id.toString());
    const conflictSeats = selectedSeats.filter((s: any) => bookedSeatIds.includes(s._id.toString()));
    if (conflictSeats.length > 0) {
      const labels = conflictSeats.map((s: any) => `${s.row}${s.number || s.col}`).join(', ');
      return res.status(409).json({ success: false, message: `Ghế ${labels} đã được đặt` });
    }

    const allowedLockers: string[] = isGroupBooking && Array.isArray(groupMemberIds) && groupMemberIds.length > 0
  ? [userId, ...groupMemberIds.map((id: string) => id.toString())]
  : [userId]

    const lockedByOther: string[] = [];
    for (const seatId of seatIds) {
      const owner = await getSeatLockOwner(showtimeId, seatId);
      // Nếu là group booking thì bỏ qua ghế do chính member trong nhóm lock
      if (owner && !allowedLockers.includes(owner.toString())) {
        lockedByOther.push(seatId);
      }
    }
    if (lockedByOther.length > 0) {
      const labels = selectedSeats
        .filter((s: any) => lockedByOther.includes(s._id.toString()))
        .map((s: any) => `${s.row}${s.number || s.col}`).join(', ');
      return res.status(409).json({ success: false, message: `Ghế ${labels} đang được người khác giữ, vui lòng chọn ghế khác` });
    }

    const pendingBookings = await Booking.find({
      showtime: showtimeId,
      status: { $in: ['pending', 'pending_payment'] },
      expiresAt: { $gt: new Date() },
      // Bỏ qua booking của chính các member trong nhóm
      user: { $nin: allowedLockers.map(id => id.toString()) },
    }).lean();
    const pendingSeats = new Set(pendingBookings.flatMap((b: any) => b.seats.map((s: any) => s.toString())));
    const conflictPending = seatIds.filter((id: string) => pendingSeats.has(id));
    if (conflictPending.length > 0) {
      const labels = selectedSeats
        .filter((s: any) => conflictPending.includes(s._id.toString()))
        .map((s: any) => `${s.row}${s.number || s.col}`).join(', ');
      return res.status(409).json({ success: false, message: `Ghế ${labels} đang được người khác giữ chỗ` });
    }

    await lockSeats(showtimeId, userId, seatIds);

    // FIX: Sau khi lock thành công, emit seat:locked tới tất cả client trong room
    // (bao gồm nhân viên & admin đang xem cùng showtime)
    const expiresAt = Date.now() + (parseInt(process.env.SEAT_LOCK_TTL || '300') * 1000);
    try {
      const io = getIO();
      // Emit từng ghế để frontend cập nhật trạng thái realtime
      seatIds.forEach(seatId => {
        io.to(`showtime:${showtimeId}`).emit('seat:locked', {
          seatId,
          userId,
          showtimeId,
          expiresAt, // Frontend dùng để hiển thị countdown
        });
      });
    } catch (e) {
      // Socket chưa init (unit test) → bỏ qua
    }

    // FIX: Track để watcher phát hiện khi TTL hết và emit seat:released
    trackSeatLock(showtimeId, seatIds);

    // Lấy giá từ showtime (admin đã set) hoặc room.prices, fallback về giá mặc định
    const showtimePrices: Record<string, number> = {
      standard: (showtime as any).priceStandard || (room.prices?.standard) || 85000,
      vip:      (showtime as any).priceVip      || (room.prices?.vip)      || 130000,
      couple:   (showtime as any).priceDouble   || (room.prices?.couple)   || 200000,
      recliner: (showtime as any).priceRecliner || (room.prices?.recliner) || 150000,
    };
    const totalAmount = selectedSeats.reduce((sum: number, s: any) =>
      sum + (s.price || showtimePrices[s.type] || showtimePrices.standard), 0);

    const bookingCode = `PC${Date.now().toString(36).toUpperCase()}`;
    const qrCode = await QRCode.toDataURL(bookingCode);

    const seatLabels = selectedSeats.map((s: any) =>
      s.label || `${s.row}${s.number || s.col}`);

    const booking = await Booking.create({
      user: userId,
      soldBy: isStaff ? req.user!.id : undefined, // ghi lại nhân viên bán nếu là staff
      showtime: showtimeId,
      seats: seatIds,
      seatLabels,
      totalAmount,
      bookingCode,
      qrCode,
      status: 'pending',
      expiresAt: new Date(expiresAt),
    });

    return res.status(201).json({ success: true, data: booking });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /bookings/my
export async function getMyBookings(req: AuthRequest, res: Response) {
  try {
    const bookings = await Booking.find({ user: req.user!.id })
      .populate({ path: 'showtime', populate: [{ path: 'movie', select: 'title poster genre duration' }, { path: 'theater', select: 'name city' }, { path: 'room', select: 'name' }] })
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: bookings });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /bookings/:id
export async function getBooking(req: AuthRequest, res: Response) {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'showtime', populate: [{ path: 'movie', select: 'title poster genre duration' }, { path: 'theater', select: 'name city address' }, { path: 'room', select: 'name' }] });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    return res.json({ success: true, data: booking });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /bookings/:id
export async function cancelBooking(req: AuthRequest, res: Response) {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status === 'confirmed') return res.status(400).json({ success: false, message: 'Cannot cancel confirmed booking' });

    const showtimeId = booking.showtime.toString();
    const seatIds = booking.seats.map((s: any) => s.toString());

    booking.status = 'cancelled';
    await booking.save();

    // Giải phóng ghế trong Redis
    await releaseSeats(showtimeId, req.user!.id);

    // FIX: Emit seat:released tới TẤT CẢ client để cập nhật realtime
    // Nhân viên/khách đang xem cùng showtime sẽ thấy ghế trống ngay lập tức
    try {
      const io = getIO();
      seatIds.forEach(seatId => {
        io.to(`showtime:${showtimeId}`).emit('seat:released', {
          seatId,
          showtimeId,
        });
      });
    } catch (e) {
      // Socket chưa init → bỏ qua
    }

    return res.json({ success: true, message: 'Booking cancelled' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /bookings/checkin
export async function checkIn(req: AuthRequest, res: Response) {
  try {
    const { bookingCode } = req.body;
    if (!bookingCode) return res.status(400).json({ success: false, message: 'Thiếu mã vé' });

    const booking = await Booking.findOne({ bookingCode: bookingCode.trim().toUpperCase() })
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie', select: 'title poster genre duration' },
          { path: 'theater', select: 'name city address' },
          { path: 'room', select: 'name' },
        ]
      })
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ success: false, message: `Không tìm thấy vé với mã: ${bookingCode}` });
    }

    if (booking.status === 'checked_in') {
      return res.status(400).json({
        success: false,
        message: `Vé này đã được check-in lúc ${booking.checkedInAt ? new Date(booking.checkedInAt).toLocaleString('vi-VN') : ''}`,
        data: booking
      });
    }

    if (booking.status !== 'confirmed') {
      const statusMsg: Record<string, string> = {
        pending: 'Vé chưa thanh toán',
        pending_payment: 'Vé đang chờ thanh toán',
        cancelled: 'Vé đã bị hủy',
      };
      return res.status(400).json({
        success: false,
        message: statusMsg[booking.status] || `Vé không hợp lệ (${booking.status})`,
        data: booking
      });
    }

    booking.status = 'checked_in';
    booking.checkedInAt = new Date();
    (booking as any).checkedInBy = req.user!.id;
    await booking.save();

    return res.json({ success: true, message: '✅ Check-in thành công!', data: booking });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /bookings/:id/request-refund — Staff tạo yêu cầu hoàn tiền gửi Admin duyệt
export async function requestRefund(req: AuthRequest, res: Response) {
  try {
    const { reason } = req.body
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do (tối thiểu 5 ký tự)' })
    }

    const booking = await Booking.findById(req.params.id)
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' })

    if (booking.status !== 'confirmed') {
      const msg: Record<string, string> = {
        pending: 'Vé chưa thanh toán', pending_payment: 'Vé chưa thanh toán',
        cancelled: 'Vé đã bị hủy', checked_in: 'Vé đã check-in',
      }
      return res.status(400).json({ success: false, message: msg[booking.status] || 'Vé không hợp lệ' })
    }

    const { Payment } = await import('../models')
    const payment = await Payment.findOne({ booking: booking._id, status: 'success' })
    if (!payment) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' })

    // Kiểm tra đã có yêu cầu chưa
    if ((payment.metadata as any)?.refundRequest?.status === 'pending') {
      return res.status(400).json({ success: false, message: 'Đã có yêu cầu hoàn tiền đang chờ duyệt' })
    }

    // Ghi yêu cầu vào metadata
    const staffUser = await (await import('../models')).User.findById(req.user!.id).select('name').lean() as any
    payment.metadata = {
      ...(payment.metadata || {}),
      refundRequest: {
        status: 'pending',
        reason: reason.trim(),
        requestedBy: req.user!.id,
        requestedByName: staffUser?.name || 'Staff',
        requestedAt: new Date(),
      }
    }
    await payment.save()

    return res.json({ success: true, message: '📋 Đã gửi yêu cầu hoàn tiền lên Admin!' })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// POST /bookings/:id/refund  — Staff hoàn tiền có điều kiện
// Điều kiện: chưa check-in, còn ≥ 2 tiếng trước suất chiếu, ≤ 500.000đ/lần, bắt buộc có lý do
export async function staffRefund(req: AuthRequest, res: Response) {
  try {
    const { reason } = req.body
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do hoàn tiền (tối thiểu 5 ký tự)' })
    }

    const booking = await Booking.findById(req.params.id)
      .populate({ path: 'showtime', populate: [{ path: 'movie', select: 'title' }] })
      .populate('user', 'name email')
    if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy booking' })

    // Chỉ hoàn vé đã confirmed (đã thanh toán), chưa check-in
    if (!['confirmed'].includes(booking.status)) {
      const msg: Record<string, string> = {
        pending: 'Vé chưa thanh toán',
        pending_payment: 'Vé chưa thanh toán',
        cancelled: 'Vé đã bị hủy',
        checked_in: 'Vé đã check-in, không thể hoàn',
      }
      return res.status(400).json({ success: false, message: msg[booking.status] || 'Vé không đủ điều kiện hoàn' })
    }

    // Kiểm tra còn ≥ 2 tiếng trước suất chiếu
    const showtime = booking.showtime as any
    const startTime = new Date(showtime.startTime).getTime()
    const now = Date.now()
    const hoursLeft = (startTime - now) / (1000 * 60 * 60)
    if (hoursLeft < 2) {
      return res.status(400).json({
        success: false,
        message: `Chỉ hoàn được vé trước suất chiếu ít nhất 2 tiếng. Suất chiếu bắt đầu lúc ${new Date(showtime.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
      })
    }

    // Giới hạn số tiền hoàn tối đa 500.000đ/lần
    const refundAmount = booking.paidAmount || booking.totalAmount
    if (refundAmount > 500000) {
      return res.status(400).json({
        success: false,
        message: `Vé có giá trị ${refundAmount.toLocaleString('vi-VN')}đ vượt quá hạn mức hoàn tiền của nhân viên (500.000đ). Vui lòng liên hệ Admin.`
      })
    }

    // Giới hạn nhân viên này hoàn tối đa 3 vé hôm nay
    const { Payment } = await import('../models')
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const refundedToday = await Payment.countDocuments({
      soldBy: req.user!.id,
      status: 'refunded',
      updatedAt: { $gte: todayStart },
    })
    if (refundedToday >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã hoàn tối đa 3 vé hôm nay. Vui lòng liên hệ Admin để xử lý thêm.'
      })
    }

    // Cập nhật booking → cancelled
    const showtimeId = booking.showtime._id?.toString() || booking.showtime.toString()
    const seatIds = booking.seats.map((s: any) => s.toString())

    booking.status = 'cancelled'
    await booking.save()

    // Cập nhật payment → refunded, ghi lý do + nhân viên xử lý
    const payment = await Payment.findOne({ booking: booking._id, status: 'success' })
    if (payment) {
      payment.status = 'refunded'
      ;(payment as any).refundReason = reason.trim()
      ;(payment as any).refundedBy = req.user!.id
      ;(payment as any).refundedAt = new Date()
      await payment.save()
    }

    // Giải phóng ghế trong Redis và emit socket
    await releaseSeats(showtimeId, booking.user.toString())
    try {
      const io = getIO()
      seatIds.forEach(seatId => {
        io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId })
      })
    } catch {}

    return res.json({
      success: true,
      message: `✅ Đã hoàn vé thành công. Số tiền hoàn: ${refundAmount.toLocaleString('vi-VN')}đ`,
      data: { refundAmount, reason: reason.trim() }
    })
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

// GET /admin/bookings
export async function getAllBookings(req: AuthRequest, res: Response) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    const bookings = await Booking.find(filter)
      .populate({ path: 'showtime', populate: [{ path: 'movie', select: 'title' }, { path: 'theater', select: 'name' }] })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit).limit(+limit);
    const total = await Booking.countDocuments(filter);
    return res.json({ success: true, data: bookings, total });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}