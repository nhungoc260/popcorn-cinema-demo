import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { Payment, Booking, Showtime, Loyalty, Ticket, User } from '../models';
import { AuthRequest } from '../middleware/errorHandler';
import { unlockAllUserSeats } from '../config/redis';
import { getIO } from '../socket/socketServer';

// POST /payments/initiate
export async function initiatePayment(req: AuthRequest, res: Response) {
  try {
    const { bookingId, method, finalAmount, pointsUsed = 0 } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status === 'confirmed') return res.status(400).json({ success: false, message: 'Already paid' });
    if (booking.status === 'cancelled') return res.status(400).json({ success: false, message: 'Booking đã bị hủy' });

    const showtime = await Showtime.findById(booking.showtime).lean() as any;
    if (showtime) {
      const confirmedSeats = new Set((showtime.bookedSeats || []).map((id: any) => id.toString()));
      const conflictSeats = (booking.seats || []).filter((s: any) => confirmedSeats.has(s.toString()));
      if (conflictSeats.length > 0) {
        booking.status = 'cancelled' as any;
        await booking.save();
        return res.status(409).json({ 
          success: false, 
          message: 'Ghế trong vé này đã được người khác đặt và thanh toán. Vé của bạn đã bị hủy tự động.' 
        });
      }
    }

    const existingPayment = await Payment.findOne({ 
      booking: bookingId, 
      status: { $in: ['pending', 'pending_confirmation', 'customer_confirmed'] } 
    });
    if (existingPayment) {
      return res.status(200).json({ 
        success: true, 
        data: { 
          payment: existingPayment, 
          qrData: existingPayment.qrData, 
          transactionId: existingPayment.transactionId,
          requiresConfirmation: true
        } 
      });
    }

    const transactionId = `TXN_${uuidv4().split('-')[0].toUpperCase()}`;
    let qrData = '';

    if (method === 'momo') {
      qrData = await generateMoMoQR(booking.totalAmount, transactionId, booking.bookingCode);
    } else if (method === 'vietqr') {
      qrData = await generateVietQR(booking.totalAmount, booking.bookingCode);
    } else if (method === 'bank') {
      qrData = await generateBankQR(booking.totalAmount, booking.bookingCode);
    }

    const paymentStatus = method === 'cash' ? 'pending' : 'pending_confirmation';

    // Nếu người gọi là staff/admin và booking.user khác req.user → bán hộ
    const isSellingForCustomer = ['admin', 'staff'].includes(req.user?.role || '')
      && booking.user.toString() !== req.user!.id;

    // Dùng finalAmount (sau giảm giá điểm + hạng thẻ) làm số tiền thực tế
    const actualAmount = (finalAmount && finalAmount > 0 && finalAmount <= booking.totalAmount)
      ? finalAmount
      : booking.totalAmount;

    const payment = await Payment.create({
      booking: bookingId,
      user: booking.user,
      soldBy: isSellingForCustomer ? req.user!.id : undefined,
      amount: actualAmount,            // số tiền THỰC TẾ khách trả (sau giảm giá)
      originalAmount: booking.totalAmount, // giá gốc để tham chiếu
      pointsUsed: pointsUsed || 0,        // số điểm đã dùng để giảm giá
      method,
      transactionId,
      qrData,
      status: paymentStatus,
    });

    booking.status = 'pending_payment' as any;
    await booking.save();

    return res.status(201).json({ 
      success: true, 
      data: { 
        payment, 
        qrData, 
        transactionId, 
        requiresConfirmation: method !== 'cash' 
      } 
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /payments/confirm
export async function confirmPayment(req: AuthRequest, res: Response) {
  try {
    const { transactionId } = req.body;
    const payment = await Payment.findOne({ transactionId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    // Tất cả user khi tự mua online đều phải chờ staff/admin khác duyệt
    payment.status = 'customer_confirmed' as any;
    await payment.save();
    return res.json({ success: true, requiresAdminConfirm: true, message: 'Đã ghi nhận! Nhân viên sẽ xác nhận trong vài phút.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /payments/admin-confirm
export async function adminConfirmPayment(req: AuthRequest, res: Response) {
  try {
    if (!['admin', 'staff'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, message: 'Chỉ Admin/Staff được xác nhận thanh toán' });
    }

    const { transactionId, paymentId } = req.body;
    const payment = await Payment.findOne(paymentId ? { _id: paymentId } : { transactionId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (payment.status === 'success') {
      return res.status(400).json({ success: false, message: 'Đã xác nhận rồi' });
    }

    await doConfirmPayment(payment, req.user!.id);
    return res.json({ success: true, message: `✅ Xác nhận thanh toán ${payment.transactionId} thành công!` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /payments/admin-reject
export async function adminRejectPayment(req: AuthRequest, res: Response) {
  try {
    if (!['admin', 'staff'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, message: 'Chỉ Admin/Staff được từ chối' });
    }

    const { paymentId, reason } = req.body;
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    payment.status = 'failed' as any;
    payment.rejectReason = reason || 'Admin từ chối';
    await payment.save();

    const booking = await Booking.findById(payment.booking);
    if (booking) {
      booking.status = 'pending' as any;
      await booking.save();
    }

    getIO().to(`user:${payment.user}`).emit('payment:rejected', {
      transactionId: payment.transactionId,
      reason: payment.rejectReason,
    });

    return res.json({ success: true, message: '❌ Đã từ chối thanh toán' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /payments/pending
export async function getPendingPayments(req: AuthRequest, res: Response) {
  try {
    if (!['admin', 'staff'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const payments = await Payment.find({
      status: { $in: ['pending_confirmation', 'customer_confirmed'] },
      method: { $in: ['bank', 'vietqr', 'momo'] },
    })
      .populate({
        path: 'booking',
        select: 'bookingCode seatLabels qrCode totalAmount',
        populate: { path: 'showtime', populate: { path: 'movie', select: 'title' } }
      })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: payments });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /payments/status/:transactionId
export async function getPaymentStatus(req: AuthRequest, res: Response) {
  try {
    const payment = await Payment.findOne({ transactionId: req.params.transactionId }).lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: { status: payment.status, method: payment.method } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// GET /payments/:id
export async function getPayment(req: AuthRequest, res: Response) {
  try {
    const payment = await Payment.findById(req.params.id).lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: payment });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ────────────────────────────────────────────────────────────────
// Helper: Thực hiện xác nhận thanh toán
// ────────────────────────────────────────────────────────────────
async function doConfirmPayment(payment: any, confirmedBy?: string) {
  payment.status = 'success';
  payment.paidAt = new Date();
  if (confirmedBy) payment.confirmedBy = confirmedBy;
  await payment.save();

  const booking = await Booking.findById(payment.booking);
  if (!booking) throw new Error('Booking not found');

  // 1. Cập nhật trạng thái booking + lưu số tiền thực tế đã thanh toán
  booking.status = 'confirmed';
  booking.paymentId = payment._id;
  (booking as any).paidAmount = payment.amount; // số tiền thực tế sau giảm giá
  await booking.save();

  // 2. Cập nhật ghế trong Showtime
  await Showtime.findByIdAndUpdate(booking.showtime, {
    $addToSet: { bookedSeats: { $each: booking.seats } }
  });

  // 3. Xóa seat lock trong Redis
  await unlockAllUserSeats(booking.showtime.toString(), booking.user.toString());

  // 4. Tạo Ticket
  try {
    if (Ticket) {
      const seatIds = booking.seats.map((s: any) => s.toString());
      await Promise.all(
        seatIds.map((seatId: string, index: number) =>
          Ticket.create({
            booking: booking._id,
            user: booking.user,
            showtime: booking.showtime,
            seat: seatId,
            seatLabel: booking.seatLabels?.[index] || seatId,
            bookingCode: booking.bookingCode,
            status: 'valid',
            issuedAt: new Date(),
          })
        )
      );
    }
  } catch (ticketErr) {
    console.error('⚠️ Tạo Ticket thất bại:', ticketErr);
  }

  // 5. Cộng điểm loyalty — chỉ áp dụng cho customer
  const bookingUser = await User.findById(booking.user).select('role').lean() as any;
  const isCustomer = bookingUser?.role === 'customer';
  const pointsEarned = isCustomer ? Math.floor(booking.totalAmount / 1000) : 0;
  let loyalty = null;

  if (isCustomer) {
    const pointsUsed = (payment as any).pointsUsed || 0;
    const netPoints = pointsEarned - pointsUsed; // cộng điểm mới, trừ điểm đã dùng

    const historyEntries: any[] = [
      { action: 'earn', points: pointsEarned, date: new Date(), ref: booking.bookingCode },
    ];
    if (pointsUsed > 0) {
      historyEntries.push({ action: 'redeem', points: -pointsUsed, date: new Date(), ref: booking.bookingCode });
    }

    loyalty = await Loyalty.findOneAndUpdate(
      { user: booking.user },
      {
        $inc: {
          points: netPoints,           // cộng điểm mới - trừ điểm đã dùng
          totalEarned: pointsEarned,   // tổng tích luỹ chỉ cộng, không trừ
          totalSpent: pointsUsed,      // tổng đã dùng
        },
        $push: { history: { $each: historyEntries } },
        $setOnInsert: { user: booking.user },
      },
      { upsert: true, new: true }
    );

    // 6. Cập nhật hạng thẻ
    if (loyalty) {
      let tier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
      if (loyalty.totalEarned >= 5000) tier = 'platinum';
      else if (loyalty.totalEarned >= 2000) tier = 'gold';
      else if (loyalty.totalEarned >= 500) tier = 'silver';
      loyalty.tier = tier;
      await loyalty.save();
    }
  }

  // 7. Emit socket events
  const io = getIO();
  const showtimeId = booking.showtime.toString();
  const seatIds = booking.seats.map((s: any) => s.toString());

  io.to(`showtime:${showtimeId}`).emit('seats:booked', { seatIds, showtimeId });

  seatIds.forEach(seatId => {
    io.to(`showtime:${showtimeId}`).emit('seat:update', { seatId, showtimeId, status: 'booked' });
  });

  io.to(`user:${booking.user}`).emit('payment:confirmed', {
    transactionId: payment.transactionId,
    bookingId: booking._id,
    bookingCode: booking.bookingCode,
    pointsEarned,
    newLoyaltyPoints: loyalty?.points || 0,
    newLoyaltyTier: loyalty?.tier || 'bronze',
  });

  io.to(`user:${booking.user}`).emit('booking:success', {
    bookingId: booking._id,
    bookingCode: booking.bookingCode,
    showtimeId,
    seatIds,
    totalAmount: booking.totalAmount,
    pointsEarned,
  });
}

// QR generators
async function generateMoMoQR(amount: number, txnId: string, bookingCode: string): Promise<string> {
  return QRCode.toDataURL(`momo://pay?amount=${amount}&note=POPCORN_${bookingCode}&txnId=${txnId}`);
}
async function generateVietQR(amount: number, bookingCode: string): Promise<string> {
  return QRCode.toDataURL(`https://vietqr.io/pay?bank=VCB&acc=1036219239&amount=${amount}&note=POPCORN_${bookingCode}`);
}
async function generateBankQR(amount: number, bookingCode: string): Promise<string> {
  return QRCode.toDataURL(`STK:1036219239|NH:Vietcombank|TEN:NGUYEN TRAN NHU NGOC|ST:${amount}|ND:POPCORN ${bookingCode}`);
}
// GET /payments/by-booking/:bookingId
export async function getPaymentByBooking(req: AuthRequest, res: Response) {
  try {
    const payment = await Payment.findOne({
      booking: req.params.bookingId,
      status: { $in: ['success', 'pending_confirmation', 'customer_confirmed', 'pending'] },
    }).sort({ createdAt: -1 }).lean();
    if (!payment) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: payment });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}