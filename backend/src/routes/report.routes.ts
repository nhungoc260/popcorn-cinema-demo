import { Router } from 'express';
import { getRevenueReport, getOccupancyReport } from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/errorHandler';

const r = Router();
r.use(authenticate);

// Admin + Staff đều xem được doanh thu
r.get('/revenue', authorize('admin', 'staff'), getRevenueReport);

// Chỉ Admin mới xem occupancy
r.get('/occupancy', authorize('admin'), getOccupancyReport);

export default r;