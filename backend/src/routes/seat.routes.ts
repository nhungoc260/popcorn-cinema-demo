// seat.routes.ts
import { Router } from 'express';
import { Seat, Room } from '../models';
import { authenticate, authorize } from '../middleware/errorHandler';

const router = Router();

router.get('/room/:roomId', async (req, res) => {
  const seats = await Seat.find({ room: req.params.roomId, isActive: true }).sort({ row: 1, col: 1 });
  res.json({ success: true, data: seats });
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const seat = await Seat.create(req.body);
  res.status(201).json({ success: true, data: seat });
});

export default router;
