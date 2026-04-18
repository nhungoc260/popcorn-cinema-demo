"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLoyaltyInfo = getLoyaltyInfo;
exports.applyPoints = applyPoints;
exports.createBooking = createBooking;
exports.getMyBookings = getMyBookings;
exports.getBooking = getBooking;
exports.cancelBooking = cancelBooking;
exports.checkIn = checkIn;
exports.requestRefund = requestRefund;
exports.staffRefund = staffRefund;
exports.getAllBookings = getAllBookings;
const qrcode_1 = __importDefault(require("qrcode"));
const models_1 = require("../models");
const redis_1 = require("../config/redis");
const socketServer_1 = require("../socket/socketServer");
// Email cố định của walk-in user (khách vãng lai tại quầy)
const WALKIN_EMAIL = 'walkin@popcorn.local';
// Cấu hình loyalty
const TIER_DISCOUNT = {
    bronze: 0, silver: 0.05, gold: 0.08, platinum: 0.10,
};
const POINTS_PER_VND = 100; // 100 điểm = 10.000đ
const POINTS_VALUE = 100; // 100đ mỗi điểm (100 điểm = 10.000đ)
const MAX_POINTS_RATIO = 0.30; // tối đa 30% giá trị đơn
// GET /bookings/loyalty
// Staff/Admin có thể truyền ?userId=xxx để tra điểm của khách
async function getLoyaltyInfo(req, res) {
    try {
        const isStaff = ['admin', 'staff'].includes(req.user?.role || '');
        // Staff được phép tra điểm của khách bất kỳ
        const targetUserId = (isStaff && req.query.userId)
            ? req.query.userId
            : req.user.id;
        const loyalty = await models_1.Loyalty.findOne({ user: targetUserId });
        if (!loyalty) {
            return res.json({ success: true, data: { points: 0, tier: 'bronze', tierDiscount: 0 } });
        }
        return res.json({
            success: true,
            data: {
                points: loyalty.points,
                tier: loyalty.tier,
                tierDiscount: TIER_DISCOUNT[loyalty.tier] || 0,
            }
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /bookings/apply-points
async function applyPoints(req, res) {
    try {
        const { bookingId, pointsToUse } = req.body;
        if (!bookingId || pointsToUse === undefined) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
        }
        const booking = await models_1.Booking.findById(bookingId);
        if (!booking)
            return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
        if (booking.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Không có quyền' });
        }
        if (!['pending', 'pending_payment'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: 'Booking không hợp lệ' });
        }
        // FIX: Luôn lấy điểm từ DB, không nhận từ request body
        const loyalty = await models_1.Loyalty.findOne({ user: req.user.id });
        const availablePoints = loyalty?.points || 0;
        if (pointsToUse > availablePoints) {
            return res.status(400).json({ success: false, message: 'Không đủ điểm' });
        }
        // Tính giảm giá từ điểm
        const originalAmount = booking.totalAmount;
        const maxDiscount = Math.floor(originalAmount * MAX_POINTS_RATIO);
        const pointsDiscount = Math.min(pointsToUse * POINTS_VALUE, maxDiscount);
        const actualPointsUsed = Math.ceil(pointsDiscount / POINTS_VALUE);
        // Tính giảm giá theo hạng thẻ
        const tier = loyalty?.tier || 'bronze';
        const tierDiscountAmount = Math.floor(originalAmount * (TIER_DISCOUNT[tier] || 0));
        const finalAmount = Math.max(0, originalAmount - pointsDiscount - tierDiscountAmount);
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
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /bookings
async function createBooking(req, res) {
    try {
        const { showtimeId, seatIds: rawSeatIds, seats: legacySeats, customerId, isCounterSale } = req.body;
        const seatIds = rawSeatIds || legacySeats || [];
        const isStaff = ['admin', 'staff'].includes(req.user?.role || '');
        // Xác định userId:
        // - Staff/Admin bán tại quầy + có customerId → gán cho khách có tài khoản
        // - Staff bán tại quầy + không có customerId → gán cho Khách Vãng Lai
        // - Staff/Admin tự đặt online (isCounterSale = false/undefined) → gán cho chính họ
        // - Customer → gán cho chính họ
        let userId = req.user.id;
        if (isStaff && isCounterSale) {
            if (customerId) {
                // Bán cho khách có tài khoản
                userId = customerId;
            }
            else {
                // Bán cho khách vãng lai
                let walkIn = await models_1.User.findOne({ email: WALKIN_EMAIL }).lean();
                if (!walkIn) {
                    walkIn = await models_1.User.create({
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
        const showtime = await models_1.Showtime.findById(showtimeId).populate('room');
        if (!showtime)
            return res.status(404).json({ success: false, message: 'Không tìm thấy suất chiếu' });
        const room = showtime.room;
        if (!room)
            return res.status(404).json({ success: false, message: 'Không tìm thấy phòng chiếu' });
        let allSeats = room.seats || [];
        if (allSeats.length === 0) {
            allSeats = await models_1.Seat.find({ room: room._id }).lean();
        }
        const selectedSeats = allSeats.filter((s) => seatIds.includes(s._id.toString()));
        if (selectedSeats.length !== seatIds.length) {
            return res.status(400).json({ success: false, message: 'Một hoặc nhiều ghế không hợp lệ' });
        }
        const bookedSeatIds = (showtime.bookedSeats || []).map((id) => id.toString());
        const conflictSeats = selectedSeats.filter((s) => bookedSeatIds.includes(s._id.toString()));
        if (conflictSeats.length > 0) {
            const labels = conflictSeats.map((s) => `${s.row}${s.number || s.col}`).join(', ');
            return res.status(409).json({ success: false, message: `Ghế ${labels} đã được đặt` });
        }
        const lockedByOther = [];
        for (const seatId of seatIds) {
            const owner = await (0, redis_1.getSeatLockOwner)(showtimeId, seatId);
            if (owner && owner !== userId)
                lockedByOther.push(seatId);
        }
        if (lockedByOther.length > 0) {
            const labels = selectedSeats
                .filter((s) => lockedByOther.includes(s._id.toString()))
                .map((s) => `${s.row}${s.number || s.col}`).join(', ');
            return res.status(409).json({ success: false, message: `Ghế ${labels} đang được người khác giữ, vui lòng chọn ghế khác` });
        }
        const pendingBookings = await models_1.Booking.find({
            showtime: showtimeId,
            status: { $in: ['pending', 'pending_payment'] },
            expiresAt: { $gt: new Date() },
            user: { $ne: userId },
        }).lean();
        const pendingSeats = new Set(pendingBookings.flatMap((b) => b.seats.map((s) => s.toString())));
        const conflictPending = seatIds.filter((id) => pendingSeats.has(id));
        if (conflictPending.length > 0) {
            const labels = selectedSeats
                .filter((s) => conflictPending.includes(s._id.toString()))
                .map((s) => `${s.row}${s.number || s.col}`).join(', ');
            return res.status(409).json({ success: false, message: `Ghế ${labels} đang được người khác giữ chỗ` });
        }
        await (0, redis_1.lockSeats)(showtimeId, userId, seatIds);
        // FIX: Sau khi lock thành công, emit seat:locked tới tất cả client trong room
        // (bao gồm nhân viên & admin đang xem cùng showtime)
        const expiresAt = Date.now() + (parseInt(process.env.SEAT_LOCK_TTL || '300') * 1000);
        try {
            const io = (0, socketServer_1.getIO)();
            // Emit từng ghế để frontend cập nhật trạng thái realtime
            seatIds.forEach(seatId => {
                io.to(`showtime:${showtimeId}`).emit('seat:locked', {
                    seatId,
                    userId,
                    showtimeId,
                    expiresAt, // Frontend dùng để hiển thị countdown
                });
            });
        }
        catch (e) {
            // Socket chưa init (unit test) → bỏ qua
        }
        // FIX: Track để watcher phát hiện khi TTL hết và emit seat:released
        (0, socketServer_1.trackSeatLock)(showtimeId, seatIds);
        // Lấy giá từ showtime (admin đã set) hoặc room.prices, fallback về giá mặc định
        const showtimePrices = {
            standard: showtime.priceStandard || (room.prices?.standard) || 85000,
            vip: showtime.priceVip || (room.prices?.vip) || 130000,
            couple: showtime.priceDouble || (room.prices?.couple) || 200000,
            recliner: showtime.priceRecliner || (room.prices?.recliner) || 150000,
        };
        const totalAmount = selectedSeats.reduce((sum, s) => sum + (s.price || showtimePrices[s.type] || showtimePrices.standard), 0);
        const bookingCode = `PC${Date.now().toString(36).toUpperCase()}`;
        const qrCode = await qrcode_1.default.toDataURL(bookingCode);
        const seatLabels = selectedSeats.map((s) => s.label || `${s.row}${s.number || s.col}`);
        const booking = await models_1.Booking.create({
            user: userId,
            soldBy: isStaff ? req.user.id : undefined, // ghi lại nhân viên bán nếu là staff
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /bookings/my
async function getMyBookings(req, res) {
    try {
        const bookings = await models_1.Booking.find({ user: req.user.id })
            .populate({ path: 'showtime', populate: [{ path: 'movie', select: 'title poster genre duration' }, { path: 'theater', select: 'name city' }, { path: 'room', select: 'name' }] })
            .sort({ createdAt: -1 });
        return res.json({ success: true, data: bookings });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /bookings/:id
async function getBooking(req, res) {
    try {
        const booking = await models_1.Booking.findById(req.params.id)
            .populate({ path: 'showtime', populate: [{ path: 'movie', select: 'title poster genre duration' }, { path: 'theater', select: 'name city address' }, { path: 'room', select: 'name' }] });
        if (!booking)
            return res.status(404).json({ success: false, message: 'Booking not found' });
        return res.json({ success: true, data: booking });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// DELETE /bookings/:id
async function cancelBooking(req, res) {
    try {
        const booking = await models_1.Booking.findById(req.params.id);
        if (!booking)
            return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.status === 'confirmed')
            return res.status(400).json({ success: false, message: 'Cannot cancel confirmed booking' });
        const showtimeId = booking.showtime.toString();
        const seatIds = booking.seats.map((s) => s.toString());
        booking.status = 'cancelled';
        await booking.save();
        // Giải phóng ghế trong Redis
        await (0, redis_1.releaseSeats)(showtimeId, req.user.id);
        // FIX: Emit seat:released tới TẤT CẢ client để cập nhật realtime
        // Nhân viên/khách đang xem cùng showtime sẽ thấy ghế trống ngay lập tức
        try {
            const io = (0, socketServer_1.getIO)();
            seatIds.forEach(seatId => {
                io.to(`showtime:${showtimeId}`).emit('seat:released', {
                    seatId,
                    showtimeId,
                });
            });
        }
        catch (e) {
            // Socket chưa init → bỏ qua
        }
        return res.json({ success: true, message: 'Booking cancelled' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /bookings/checkin
async function checkIn(req, res) {
    try {
        const { bookingCode } = req.body;
        if (!bookingCode)
            return res.status(400).json({ success: false, message: 'Thiếu mã vé' });
        const booking = await models_1.Booking.findOne({ bookingCode: bookingCode.trim().toUpperCase() })
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
            const statusMsg = {
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
        booking.checkedInBy = req.user.id;
        await booking.save();
        return res.json({ success: true, message: '✅ Check-in thành công!', data: booking });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /bookings/:id/request-refund — Staff tạo yêu cầu hoàn tiền gửi Admin duyệt
async function requestRefund(req, res) {
    try {
        const { reason } = req.body;
        if (!reason || reason.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do (tối thiểu 5 ký tự)' });
        }
        const booking = await models_1.Booking.findById(req.params.id);
        if (!booking)
            return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
        if (booking.status !== 'confirmed') {
            const msg = {
                pending: 'Vé chưa thanh toán', pending_payment: 'Vé chưa thanh toán',
                cancelled: 'Vé đã bị hủy', checked_in: 'Vé đã check-in',
            };
            return res.status(400).json({ success: false, message: msg[booking.status] || 'Vé không hợp lệ' });
        }
        const { Payment } = await Promise.resolve().then(() => __importStar(require('../models')));
        const payment = await Payment.findOne({ booking: booking._id, status: 'success' });
        if (!payment)
            return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
        // Kiểm tra đã có yêu cầu chưa
        if (payment.metadata?.refundRequest?.status === 'pending') {
            return res.status(400).json({ success: false, message: 'Đã có yêu cầu hoàn tiền đang chờ duyệt' });
        }
        // Ghi yêu cầu vào metadata
        const staffUser = await (await Promise.resolve().then(() => __importStar(require('../models')))).User.findById(req.user.id).select('name').lean();
        payment.metadata = {
            ...(payment.metadata || {}),
            refundRequest: {
                status: 'pending',
                reason: reason.trim(),
                requestedBy: req.user.id,
                requestedByName: staffUser?.name || 'Staff',
                requestedAt: new Date(),
            }
        };
        await payment.save();
        return res.json({ success: true, message: '📋 Đã gửi yêu cầu hoàn tiền lên Admin!' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /bookings/:id/refund  — Staff hoàn tiền có điều kiện
// Điều kiện: chưa check-in, còn ≥ 2 tiếng trước suất chiếu, ≤ 500.000đ/lần, bắt buộc có lý do
async function staffRefund(req, res) {
    try {
        const { reason } = req.body;
        if (!reason || reason.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do hoàn tiền (tối thiểu 5 ký tự)' });
        }
        const booking = await models_1.Booking.findById(req.params.id)
            .populate({ path: 'showtime', populate: [{ path: 'movie', select: 'title' }] })
            .populate('user', 'name email');
        if (!booking)
            return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
        // Chỉ hoàn vé đã confirmed (đã thanh toán), chưa check-in
        if (!['confirmed'].includes(booking.status)) {
            const msg = {
                pending: 'Vé chưa thanh toán',
                pending_payment: 'Vé chưa thanh toán',
                cancelled: 'Vé đã bị hủy',
                checked_in: 'Vé đã check-in, không thể hoàn',
            };
            return res.status(400).json({ success: false, message: msg[booking.status] || 'Vé không đủ điều kiện hoàn' });
        }
        // Kiểm tra còn ≥ 2 tiếng trước suất chiếu
        const showtime = booking.showtime;
        const startTime = new Date(showtime.startTime).getTime();
        const now = Date.now();
        const hoursLeft = (startTime - now) / (1000 * 60 * 60);
        if (hoursLeft < 2) {
            return res.status(400).json({
                success: false,
                message: `Chỉ hoàn được vé trước suất chiếu ít nhất 2 tiếng. Suất chiếu bắt đầu lúc ${new Date(showtime.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
            });
        }
        // Giới hạn số tiền hoàn tối đa 500.000đ/lần
        const refundAmount = booking.paidAmount || booking.totalAmount;
        if (refundAmount > 500000) {
            return res.status(400).json({
                success: false,
                message: `Vé có giá trị ${refundAmount.toLocaleString('vi-VN')}đ vượt quá hạn mức hoàn tiền của nhân viên (500.000đ). Vui lòng liên hệ Admin.`
            });
        }
        // Giới hạn nhân viên này hoàn tối đa 3 vé hôm nay
        const { Payment } = await Promise.resolve().then(() => __importStar(require('../models')));
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const refundedToday = await Payment.countDocuments({
            soldBy: req.user.id,
            status: 'refunded',
            updatedAt: { $gte: todayStart },
        });
        if (refundedToday >= 3) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã hoàn tối đa 3 vé hôm nay. Vui lòng liên hệ Admin để xử lý thêm.'
            });
        }
        // Cập nhật booking → cancelled
        const showtimeId = booking.showtime._id?.toString() || booking.showtime.toString();
        const seatIds = booking.seats.map((s) => s.toString());
        booking.status = 'cancelled';
        await booking.save();
        // Cập nhật payment → refunded, ghi lý do + nhân viên xử lý
        const payment = await Payment.findOne({ booking: booking._id, status: 'success' });
        if (payment) {
            payment.status = 'refunded';
            payment.refundReason = reason.trim();
            payment.refundedBy = req.user.id;
            payment.refundedAt = new Date();
            await payment.save();
        }
        // Giải phóng ghế trong Redis và emit socket
        await (0, redis_1.releaseSeats)(showtimeId, booking.user.toString());
        try {
            const io = (0, socketServer_1.getIO)();
            seatIds.forEach(seatId => {
                io.to(`showtime:${showtimeId}`).emit('seat:released', { seatId, showtimeId });
            });
        }
        catch { }
        return res.json({
            success: true,
            message: `✅ Đã hoàn vé thành công. Số tiền hoàn: ${refundAmount.toLocaleString('vi-VN')}đ`,
            data: { refundAmount, reason: reason.trim() }
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /admin/bookings
async function getAllBookings(req, res) {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const bookings = await models_1.Booking.find(filter)
            .populate({ path: 'showtime', populate: [{ path: 'movie', select: 'title' }, { path: 'theater', select: 'name' }] })
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip((+page - 1) * +limit).limit(+limit);
        const total = await models_1.Booking.countDocuments(filter);
        return res.json({ success: true, data: bookings, total });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=booking.controller.js.map