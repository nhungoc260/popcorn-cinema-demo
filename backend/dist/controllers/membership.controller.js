"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPointsHistory = exports.addPoints = exports.getMyMembership = void 0;
const models_1 = require("../models");
const TIER_CONFIG = {
    bronze: { minPoints: 0, discount: 0, label: 'Đồng', next: 'silver' },
    silver: { minPoints: 500, discount: 0.05, label: 'Bạc', next: 'gold' },
    gold: { minPoints: 2000, discount: 0.08, label: 'Vàng', next: 'platinum' },
    platinum: { minPoints: 5000, discount: 0.10, label: 'Kim Cương', next: null },
};
function calcTier(points) {
    if (points >= 5000)
        return 'platinum';
    if (points >= 2000)
        return 'gold';
    if (points >= 500)
        return 'silver';
    return 'bronze';
}
// GET /api/v1/membership/me
const getMyMembership = async (req, res) => {
    try {
        let loyalty = await models_1.Loyalty.findOne({ user: req.user.id });
        // Tạo loyalty record nếu user chưa có
        if (!loyalty) {
            loyalty = await models_1.Loyalty.create({ user: req.user.id });
        }
        const cfg = TIER_CONFIG[loyalty.tier];
        const nextKey = cfg.next;
        const nextCfg = nextKey ? TIER_CONFIG[nextKey] : null;
        const pointsToNext = nextCfg ? nextCfg.minPoints - loyalty.points : null;
        res.json({
            success: true,
            data: {
                points: loyalty.points,
                tier: loyalty.tier,
                tierLabel: cfg.label,
                discount: cfg.discount,
                totalEarned: loyalty.totalEarned,
                totalSpent: loyalty.totalSpent,
                pointsToNext,
                nextTier: nextCfg?.label || null,
                history: loyalty.history.slice(-10).reverse(),
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getMyMembership = getMyMembership;
// Hàm internal — gọi từ payment.controller sau khi payment success
const addPoints = async (userId, amount, ref) => {
    // 10.000đ = 1 điểm
    const pointsEarned = Math.floor(amount / 10000);
    if (pointsEarned <= 0)
        return null;
    let loyalty = await models_1.Loyalty.findOne({ user: userId });
    if (!loyalty) {
        loyalty = await models_1.Loyalty.create({ user: userId });
    }
    loyalty.points += pointsEarned;
    loyalty.totalEarned += pointsEarned;
    loyalty.totalSpent += amount;
    loyalty.history.push({
        action: `Đặt vé`,
        points: pointsEarned,
        date: new Date(),
        ref: ref || '',
    });
    // Cập nhật tier
    const newTier = calcTier(loyalty.points);
    const tierChanged = newTier !== loyalty.tier;
    loyalty.tier = newTier;
    await loyalty.save();
    return { pointsEarned, newTier, tierChanged };
};
exports.addPoints = addPoints;
// GET /api/v1/membership/history
const getPointsHistory = async (req, res) => {
    try {
        const loyalty = await models_1.Loyalty.findOne({ user: req.user.id });
        if (!loyalty)
            return res.json({ success: true, data: [] });
        res.json({ success: true, data: loyalty.history.slice().reverse() });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getPointsHistory = getPointsHistory;
//# sourceMappingURL=membership.controller.js.map