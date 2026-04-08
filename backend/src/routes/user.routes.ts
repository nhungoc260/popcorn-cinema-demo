import { Router } from 'express';
import { User } from '../models';
import { authenticate, AuthRequest } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

router.get('/profile', async (req: AuthRequest, res) => {
  const user = await User.findById(req.user!.id).select('-password -refreshTokens');
  res.json({ success: true, data: user });
});

router.put('/profile', async (req: AuthRequest, res) => {
  const { name, phone, avatar, birthday, gender } = req.body;
  const user = await User.findByIdAndUpdate(req.user!.id, { name, phone, avatar, birthday: birthday || null, gender: gender || '' }, { new: true }).select('-password -refreshTokens');
  res.json({ success: true, data: user });
});

router.put('/change-password', async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user!.id);
  if (!user || !(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ success: false, message: 'Current password incorrect' });
  }
  // Hash thủ công, KHÔNG dùng user.save() để tránh pre-save hook hash lại lần 2
  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(req.user!.id, { password: hashed });
  return res.json({ success: true, message: 'Password updated' });
});

// GET /users/search?q=phone_or_email (staff/admin only)
router.get('/search', async (req: AuthRequest, res) => {
  try {
    if (!['admin', 'staff'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { q } = req.query;
    if (!q || String(q).length < 3) {
      return res.status(400).json({ success: false, message: 'Nhập ít nhất 3 ký tự' });
    }
    const users = await User.find({
      $or: [
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { name:  { $regex: q, $options: 'i' } },
      ]
    }).select('name email phone avatar role').limit(5).lean();
    return res.json({ success: true, data: users });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;