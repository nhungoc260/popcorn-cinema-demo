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
exports.initiatePayment = initiatePayment;
exports.confirmPayment = confirmPayment;
exports.adminConfirmPayment = adminConfirmPayment;
exports.adminRejectPayment = adminRejectPayment;
exports.getPendingPayments = getPendingPayments;
exports.getPaymentStatus = getPaymentStatus;
exports.getPayment = getPayment;
exports.getPaymentByBooking = getPaymentByBooking;
const uuid_1 = require("uuid");
const qrcode_1 = __importDefault(require("qrcode"));
const models_1 = require("../models");
const redis_1 = require("../config/redis");
const socketServer_1 = require("../socket/socketServer");
// POST /payments/initiate
async function initiatePayment(req, res) {
    try {
        const { bookingId, method, finalAmount, pointsUsed = 0, couponCode } = req.body;
        const booking = await models_1.Booking.findById(bookingId);
        if (!booking)
            return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.status === 'confirmed')
            return res.status(400).json({ success: false, message: 'Already paid' });
        if (booking.status === 'cancelled')
            return res.status(400).json({ success: false, message: 'Booking đã bị hủy' });
        const showtime = await models_1.Showtime.findById(booking.showtime).lean();
        if (showtime) {
            const confirmedSeats = new Set((showtime.bookedSeats || []).map((id) => id.toString()));
            const conflictSeats = (booking.seats || []).filter((s) => confirmedSeats.has(s.toString()));
            if (conflictSeats.length > 0) {
                booking.status = 'cancelled';
                await booking.save();
                return res.status(409).json({
                    success: false,
                    message: 'Ghế trong vé này đã được người khác đặt và thanh toán. Vé của bạn đã bị hủy tự động.'
                });
            }
        }
        const existingPayment = await models_1.Payment.findOne({
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
        const transactionId = `TXN_${(0, uuid_1.v4)().split('-')[0].toUpperCase()}`;
        let qrData = '';
        if (method === 'momo') {
            qrData = await generateMoMoQR(booking.totalAmount, transactionId, booking.bookingCode);
        }
        else if (method === 'vietqr') {
            qrData = await generateVietQR(booking.totalAmount, booking.bookingCode);
        }
        else if (method === 'bank') {
            qrData = await generateBankQR(booking.totalAmount, booking.bookingCode);
        }
        const paymentStatus = method === 'cash' ? 'pending' : 'pending_confirmation';
        const isSellingForCustomer = ['admin', 'staff'].includes(req.user?.role || '')
            && booking.user.toString() !== req.user.id;
        const actualAmount = (finalAmount && finalAmount > 0 && finalAmount <= booking.totalAmount)
            ? finalAmount
            : booking.totalAmount;
        const payment = await models_1.Payment.create({
            booking: bookingId,
            user: booking.user,
            soldBy: isSellingForCustomer ? req.user.id : undefined,
            amount: actualAmount,
            originalAmount: booking.totalAmount,
            pointsUsed: pointsUsed || 0,
            couponCode: couponCode || null, // ✅ Lưu mã coupon vào payment
            method,
            transactionId,
            qrData,
            status: paymentStatus,
        });
        booking.status = 'pending_payment';
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /payments/confirm
async function confirmPayment(req, res) {
    try {
        const { transactionId } = req.body;
        const payment = await models_1.Payment.findOne({ transactionId });
        if (!payment)
            return res.status(404).json({ success: false, message: 'Payment not found' });
        payment.status = 'customer_confirmed';
        await payment.save();
        return res.json({ success: true, requiresAdminConfirm: true, message: 'Đã ghi nhận! Nhân viên sẽ xác nhận trong vài phút.' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /payments/admin-confirm
async function adminConfirmPayment(req, res) {
    try {
        if (!['admin', 'staff'].includes(req.user?.role || '')) {
            return res.status(403).json({ success: false, message: 'Chỉ Admin/Staff được xác nhận thanh toán' });
        }
        const { transactionId, paymentId } = req.body;
        const payment = await models_1.Payment.findOne(paymentId ? { _id: paymentId } : { transactionId });
        if (!payment)
            return res.status(404).json({ success: false, message: 'Payment not found' });
        if (payment.status === 'success') {
            return res.status(400).json({ success: false, message: 'Đã xác nhận rồi' });
        }
        await doConfirmPayment(payment, req.user.id);
        return res.json({ success: true, message: `✅ Xác nhận thanh toán ${payment.transactionId} thành công!` });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /payments/admin-reject
async function adminRejectPayment(req, res) {
    try {
        if (!['admin', 'staff'].includes(req.user?.role || '')) {
            return res.status(403).json({ success: false, message: 'Chỉ Admin/Staff được từ chối' });
        }
        const { paymentId, reason } = req.body;
        const payment = await models_1.Payment.findById(paymentId);
        if (!payment)
            return res.status(404).json({ success: false, message: 'Payment not found' });
        payment.status = 'failed';
        payment.rejectReason = reason || 'Admin từ chối';
        await payment.save();
        const booking = await models_1.Booking.findById(payment.booking);
        if (booking) {
            booking.status = 'pending';
            await booking.save();
        }
        (0, socketServer_1.getIO)().to(`user:${payment.user}`).emit('payment:rejected', {
            transactionId: payment.transactionId,
            reason: payment.rejectReason,
        });
        return res.json({ success: true, message: '❌ Đã từ chối thanh toán' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /payments/pending
async function getPendingPayments(req, res) {
    try {
        if (!['admin', 'staff'].includes(req.user?.role || '')) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }
        const payments = await models_1.Payment.find({
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
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /payments/status/:transactionId
async function getPaymentStatus(req, res) {
    try {
        const payment = await models_1.Payment.findOne({ transactionId: req.params.transactionId }).lean();
        if (!payment)
            return res.status(404).json({ success: false, message: 'Not found' });
        return res.json({ success: true, data: { status: payment.status, method: payment.method } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /payments/:id
async function getPayment(req, res) {
    try {
        const payment = await models_1.Payment.findById(req.params.id).lean();
        if (!payment)
            return res.status(404).json({ success: false, message: 'Not found' });
        return res.json({ success: true, data: payment });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// ────────────────────────────────────────────────────────────────
// Helper: Thực hiện xác nhận thanh toán
// ────────────────────────────────────────────────────────────────
async function doConfirmPayment(payment, confirmedBy) {
    payment.status = 'success';
    payment.paidAt = new Date();
    if (confirmedBy)
        payment.confirmedBy = confirmedBy;
    await payment.save();
    const booking = await models_1.Booking.findById(payment.booking);
    if (!booking)
        throw new Error('Booking not found');
    // 1. Cập nhật trạng thái booking
    booking.status = 'confirmed';
    booking.paymentId = payment._id;
    booking.paidAmount = payment.amount;
    await booking.save();
    // 2. Cập nhật ghế trong Showtime
    await models_1.Showtime.findByIdAndUpdate(booking.showtime, {
        $addToSet: { bookedSeats: { $each: booking.seats } }
    });
    // 3. Xóa seat lock trong Redis
    await (0, redis_1.unlockAllUserSeats)(booking.showtime.toString(), booking.user.toString());
    // 4. Tạo Ticket
    try {
        if (models_1.Ticket) {
            const seatIds = booking.seats.map((s) => s.toString());
            await Promise.all(seatIds.map((seatId, index) => models_1.Ticket.create({
                booking: booking._id,
                user: booking.user,
                showtime: booking.showtime,
                seat: seatId,
                seatLabel: booking.seatLabels?.[index] || seatId,
                bookingCode: booking.bookingCode,
                status: 'valid',
                issuedAt: new Date(),
            })));
        }
    }
    catch (ticketErr) {
        console.error('⚠️ Tạo Ticket thất bại:', ticketErr);
    }
    // ✅ 5. Tăng usedCount của coupon nếu có dùng mã
    if (payment.couponCode) {
        try {
            const { Coupon } = await Promise.resolve().then(() => __importStar(require('../models')));
            await Coupon.findOneAndUpdate({ code: payment.couponCode.toUpperCase(), isActive: true }, { $inc: { usedCount: 1 } });
            console.log(`✅ Coupon ${payment.couponCode} usedCount +1`);
        }
        catch (couponErr) {
            console.error('⚠️ Cập nhật coupon usedCount thất bại:', couponErr);
        }
    }
    // 6. Cộng điểm loyalty
    const bookingUser = await models_1.User.findById(booking.user).select('role').lean();
    const isCustomer = bookingUser?.role === 'customer';
    const pointsEarned = isCustomer ? Math.floor(booking.totalAmount / 1000) : 0;
    let loyalty = null;
    if (isCustomer) {
        const pointsUsed = payment.pointsUsed || 0;
        const netPoints = pointsEarned - pointsUsed;
        const historyEntries = [
            { action: 'earn', points: pointsEarned, date: new Date(), ref: booking.bookingCode },
        ];
        if (pointsUsed > 0) {
            historyEntries.push({ action: 'redeem', points: -pointsUsed, date: new Date(), ref: booking.bookingCode });
        }
        loyalty = await models_1.Loyalty.findOneAndUpdate({ user: booking.user }, {
            $inc: {
                points: netPoints,
                totalEarned: pointsEarned,
                totalSpent: pointsUsed,
            },
            $push: { history: { $each: historyEntries } },
            $setOnInsert: { user: booking.user },
        }, { upsert: true, new: true });
        // 7. Cập nhật hạng thẻ
        if (loyalty) {
            let tier = 'bronze';
            if (loyalty.totalEarned >= 5000)
                tier = 'platinum';
            else if (loyalty.totalEarned >= 2000)
                tier = 'gold';
            else if (loyalty.totalEarned >= 500)
                tier = 'silver';
            loyalty.tier = tier;
            await loyalty.save();
        }
    }
    // 8. Emit socket events
    const io = (0, socketServer_1.getIO)();
    const showtimeId = booking.showtime.toString();
    const seatIds = booking.seats.map((s) => s.toString());
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
async function generateMoMoQR(amount, txnId, bookingCode) {
    return qrcode_1.default.toDataURL(`momo://pay?amount=${amount}&note=POPCORN_${bookingCode}&txnId=${txnId}`);
}
async function generateVietQR(amount, bookingCode) {
    return qrcode_1.default.toDataURL(`https://vietqr.io/pay?bank=VCB&acc=1036219239&amount=${amount}&note=POPCORN_${bookingCode}`);
}
async function generateBankQR(amount, bookingCode) {
    return qrcode_1.default.toDataURL(`STK:1036219239|NH:Vietcombank|TEN:NGUYEN TRAN NHU NGOC|ST:${amount}|ND:POPCORN ${bookingCode}`);
}
// GET /payments/by-booking/:bookingId
async function getPaymentByBooking(req, res) {
    try {
        const payment = await models_1.Payment.findOne({
            booking: req.params.bookingId,
            status: { $in: ['success', 'pending_confirmation', 'customer_confirmed', 'pending'] },
        }).sort({ createdAt: -1 }).lean();
        if (!payment)
            return res.status(404).json({ success: false, message: 'Not found' });
        return res.json({ success: true, data: payment });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=payment.controller.js.map