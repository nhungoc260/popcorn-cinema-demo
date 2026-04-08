import { Router } from 'express';
import { getMovies, getMovie, createMovie, updateMovie, deleteMovie } from '../controllers/movie.controller';
import { getReviews, createReview, deleteReview } from '../controllers/review.controller';
import { authenticate, authorize } from '../middleware/errorHandler';

const router = Router();

// Public
router.get('/', getMovies);
router.get('/:id', getMovie);
router.get('/:movieId/reviews', getReviews);

// Auth
router.post('/:movieId/reviews', authenticate, createReview);
router.delete('/reviews/:id', authenticate, deleteReview);

// Admin
router.post('/', authenticate, authorize('admin'), createMovie);
router.put('/:id', authenticate, authorize('admin'), updateMovie);
router.delete('/:id', authenticate, authorize('admin'), deleteMovie);

export default router;
