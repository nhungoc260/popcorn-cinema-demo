"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoupon = validateCoupon;
exports.applyCoupon = applyCoupon;
exports.getCoupons = getCoupons;
exports.createCoupon = createCoupon;
exports.deleteCoupon = deleteCoupon;
exports.getMyLoyalty = getMyLoyalty;
exports.addLoyaltyPoints = addLoyaltyPoints;
const models_1 = require("../models");
// POST /coupons/validate
async function validateCoupon(req, res) {
    try {
        const { code, amount } = req.body;
        const coupon = await models_1.Coupon.findOne({ code: code.toUpperCase(), isActive: true });
        if (!coupon)
            return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại' });
        if (new Date() > coupon.expiresAt)
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết hạn' });
        if (coupon.usedCount >= coupon.usageLimit)
            return res.status(400).json({ success: false, message: 'Mã giảm giá đã hết lượt sử dụng' });
        if (coupon.usedBy.map(id => id.toString()).includes(req.user.id))
            return res.status(400).json({ success: false, message: 'Bạn đã sử dụng mã này rồi' });
        if (amount < coupon.minOrder)
            return res.status(400).json({ success: false, message: `Đơn tối thiểu ${coupon.minOrder.toLocaleString('vi')}đ` });
        let discount = coupon.type === 'percent'
            ? Math.min(amount * coupon.value / 100, coupon.maxDiscount)
            : Math.min(coupon.value, coupon.maxDiscount);
        return res.json({ success: true, data: { coupon, discount: Math.round(discount), finalAmount: amount - Math.round(discount) } });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /coupons/apply
async function applyCoupon(req, res) {
    try {
        const { code } = req.body;
        const coupon = await models_1.Coupon.findOne({ code: code.toUpperCase(), isActive: true });
        if (!coupon)
            return res.status(404).json({ success: false, message: 'Mã không hợp lệ' });
        coupon.usedCount += 1;
        coupon.usedBy.push(req.user.id);
        await coupon.save();
        return res.json({ success: true, message: 'Áp dụng mã thành công' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /coupons (admin)
async function getCoupons(_req, res) {
    try {
        const coupons = await models_1.Coupon.find().sort({ createdAt: -1 });
        return res.json({ success: true, data: coupons });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /coupons (admin)
async function createCoupon(req, res) {
    try {
        const coupon = await models_1.Coupon.create(req.body);
        return res.status(201).json({ success: true, data: coupon });
    }
    catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ success: false, message: 'Mã đã tồn tại' });
        return res.status(500).json({ success: false, message: err.message });
    }
}
// DELETE /coupons/:id (admin)
async function deleteCoupon(req, res) {
    try {
        await models_1.Coupon.findByIdAndDelete(req.params.id);
        return res.json({ success: true, message: 'Đã xóa mã' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// ── Loyalty Points ──────────────────────────────────────────
async function getMyLoyalty(req, res) {
    try {
        let loyalty = await models_1.Loyalty.findOne({ user: req.user.id });
        if (!loyalty)
            loyalty = await models_1.Loyalty.create({ user: req.user.id });
        return res.json({ success: true, data: loyalty });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function addLoyaltyPoints(userId, points, action, ref) {
    let loyalty = await models_1.Loyalty.findOne({ user: userId });
    if (!loyalty)
        loyalty = await models_1.Loyalty.create({ user: userId });
    loyalty.points += points;
    loyalty.totalEarned += points;
    loyalty.history.push({ action, points, date: new Date(), ref });
    // Update tier
    if (loyalty.totalEarned >= 5000000)
        loyalty.tier = 'platinum';
    else if (loyalty.totalEarned >= 2000000)
        loyalty.tier = 'gold';
    else if (loyalty.totalEarned >= 500000)
        loyalty.tier = 'silver';
    else
        loyalty.tier = 'bronze';
    await loyalty.save();
    return loyalty;
}
//# sourceMappingURL=coupon.controller.js.map