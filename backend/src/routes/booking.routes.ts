import { Router } from 'express';
import { createBooking, getMyBookings, getBooking, cancelBooking, checkIn, getLoyaltyInfo, applyPoints } from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);
router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/loyalty', getLoyaltyInfo);
router.post('/apply-points', applyPoints);
router.get('/:id', getBooking);
router.patch('/:id/cancel', cancelBooking);
router.post('/check-in', authorize('staff', 'admin'), checkIn);

export default router;