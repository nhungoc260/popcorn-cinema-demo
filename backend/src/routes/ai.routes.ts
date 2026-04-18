import { Router } from 'express';
import { aiChat } from '../controllers/ai.controller';

const router = Router();
router.post('/chat', aiChat);
export default router;