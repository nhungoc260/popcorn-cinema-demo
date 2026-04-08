import { Router } from 'express';
import { getShowtimes, getShowtime, getShowtimeSeats } from '../controllers/showtime.controller';

const router = Router();
router.get('/', getShowtimes);
router.get('/:id', getShowtime);
router.get('/:id/seats', getShowtimeSeats);

export default router;
