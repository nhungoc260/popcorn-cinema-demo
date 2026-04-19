import { Request, Response } from 'express';
import { Loyalty, Booking } from '../models';
import { AuthRequest } from '../middleware/errorHandler';

const TIER_CONFIG = {
  bronze:   { minPoints: 0,    discount: 0,    label: 'Đồng',      next: 'silver' },
  silver:   { minPoints: 500,  discount: 0.05, label: 'Bạc',       next: 'gold' },
  gold:     { minPoints: 2000, discount: 0.08, label: 'Vàng',      next: 'platinum' },
  platinum: { minPoints: 5000, discount: 0.10, label: 'Kim Cương', next: null },
};

function calcTier(points: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (points >= 5000) return 'platinum';
  if (points >= 2000) return 'gold';
  if (points >= 500)  return 'silver';
  return 'bronze';
}

// GET /api/v1/membership/me
export const getMyMembership = async (req: AuthRequest, res: Response) => {
  try {
    let loyalty = await Loyalty.findOne({ user: req.user!.id });

    // Tạo loyalty record nếu user chưa có
    if (!loyalty) {
      loyalty = await Loyalty.create({ user: req.user!.id });
    }

    const cfg = TIER_CONFIG[loyalty.tier as keyof typeof TIER_CONFIG];
    const nextKey = cfg.next as keyof typeof TIER_CONFIG | null;
    const nextCfg = nextKey ? TIER_CONFIG[nextKey] : null;
    const pointsToNext = nextCfg ? nextCfg.minPoints - loyalty.points : null;

    res.json({
      success: true,
      data: {
        points:       loyalty.points,
        tier:         loyalty.tier,
        tierLabel:    cfg.label,
        discount:     cfg.discount,
        totalEarned:  loyalty.totalEarned,
        totalSpent:   loyalty.totalSpent,
        pointsToNext,
        nextTier:     nextCfg?.label || null,
        history:      loyalty.history.slice(-10).reverse(),
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Hàm internal — gọi từ payment.controller sau khi payment success
export const addPoints = async (userId: string, amount: number, ref?: string) => {
  // 10.000đ = 1 điểm
  const pointsEarned = Math.floor(amount / 10000);
  if (pointsEarned <= 0) return null;

  let loyalty = await Loyalty.findOne({ user: userId });
  if (!loyalty) {
    loyalty = await Loyalty.create({ user: userId });
  }

  loyalty.points      += pointsEarned;
  loyalty.totalEarned += pointsEarned;
  loyalty.totalSpent  += amount;
  loyalty.history.push({
    action: `Đặt vé`,
    points: pointsEarned,
    date:   new Date(),
    ref:    ref || '',
  });

  // Cập nhật tier
  const newTier = calcTier(loyalty.points);
  const tierChanged = newTier !== loyalty.tier;
  loyalty.tier = newTier;

  await loyalty.save();
  return { pointsEarned, newTier, tierChanged };
};

// GET /api/v1/membership/history
export const getPointsHistory = async (req: AuthRequest, res: Response) => {
  try {
    const loyalty = await Loyalty.findOne({ user: req.user!.id });
    if (!loyalty) return res.json({ success: true, data: [] });

    res.json({ success: true, data: loyalty.history.slice().reverse() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};