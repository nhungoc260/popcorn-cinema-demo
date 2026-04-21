import { Router } from 'express';
import { validateCoupon, applyCoupon, getMyLoyalty, getCoupons, createCoupon, deleteCoupon } from '../controllers/coupon.controller';
import { authenticate, authorize } from '../middleware/errorHandler';

const r = Router();

// ── User routes ──
r.post('/validate', authenticate, validateCoupon);
r.post('/apply', authenticate, applyCoupon);
r.get('/loyalty', authenticate, getMyLoyalty);

// ── Admin routes ──
r.get('/', authenticate, authorize('admin'), getCoupons);
r.post('/', authenticate, authorize('admin'), createCoupon);
r.delete('/:id', authenticate, authorize('admin'), deleteCoupon);

export default r;