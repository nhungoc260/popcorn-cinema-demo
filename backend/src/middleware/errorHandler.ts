import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { id: string; role: string; email: string };
    
    // Check isActive
    const user = await User.findById(decoded.id).select('isActive').lean() as any;
    if (!user || user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khoá. Vui lòng liên hệ admin.' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
}

// ── Error Handler ──────────────────────────────────────────
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ success: false, message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
}

export async function authenticateOptional(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(); // Không có token → tiếp tục bình thường

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { id: string; role: string; email: string };
    const user = await User.findById(decoded.id).select('isActive').lean() as any;
    if (user && user.isActive !== false) {
      req.user = decoded; // Chỉ set nếu tài khoản hợp lệ
    }
  } catch {
    // Token lỗi → bỏ qua, không báo lỗi
  }
  next();
}