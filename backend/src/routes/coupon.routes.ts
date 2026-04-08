import { Router } from 'express';
import { validateCoupon, applyCoupon, getMyLoyalty } from '../controllers/coupon.controller';
import { authenticate } from '../middleware/errorHandler';
const r = Router();
r.post('/validate', authenticate, validateCoupon);
r.post('/apply', authenticate, applyCoupon);
r.get('/loyalty', authenticate, getMyLoyalty);
export default r;
