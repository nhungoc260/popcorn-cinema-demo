import { Router } from 'express';
import { getReviews, createReview, deleteReview } from '../controllers/review.controller';
import { authenticate } from '../middleware/errorHandler';
const r = Router({ mergeParams: true });
r.get('/', getReviews);
r.post('/', authenticate, createReview);
r.delete('/:id', authenticate, deleteReview);
export default r;
