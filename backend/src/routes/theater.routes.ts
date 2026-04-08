// theater.routes.ts
import { Router } from 'express';
import { Theater, Room } from '../models';
import { authenticate, authorize } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (_, res) => {
  const theaters = await Theater.find({ isActive: true });
  res.json({ success: true, data: theaters });
});

router.get('/:id', async (req, res) => {
  const theater = await Theater.findById(req.params.id);
  if (!theater) return res.status(404).json({ success: false, message: 'Theater not found' });
  const rooms = await Room.find({ theater: req.params.id, isActive: true });
  return res.json({ success: true, data: { theater, rooms } });
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const theater = await Theater.create(req.body);
  res.status(201).json({ success: true, data: theater });
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const theater = await Theater.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: theater });
});

export default router;
