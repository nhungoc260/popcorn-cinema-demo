// ── auth.routes.ts ─────────────────────────────────────────
import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { authenticate } from '../middleware/errorHandler';

const router = Router();
router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/refresh', auth.refreshToken);
router.post('/logout', authenticate, auth.logout);
router.get('/me', authenticate, auth.getMe);
router.post('/send-otp', auth.sendOtp);
router.post('/verify-otp', auth.verifyOtp);

router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);

router.post('/google', auth.googleLogin);
router.post('/phone-send', auth.phoneSendOtp);
router.post('/phone-verify', auth.phoneVerifyOtp);

export default router;
