import { Router } from 'express';
import { getMyMembership, getPointsHistory } from '../controllers/membership.controller';
import { authenticate } from '../middleware/errorHandler'; // đổi tên nếu middleware của bạn khác

const router = Router();

router.get('/me',      authenticate, getMyMembership);
router.get('/history', authenticate, getPointsHistory);

export default router;