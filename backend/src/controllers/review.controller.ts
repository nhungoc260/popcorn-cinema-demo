import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review, Movie } from '../models';
import { AuthRequest } from '../middleware/errorHandler';

// GET /movies/:movieId/reviews
export async function getReviews(req: Request, res: Response) {
  try {
    const { movieId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const reviews = await Review.find({ movie: movieId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit).limit(+limit);
    const total = await Review.countDocuments({ movie: movieId });
    const avg = await Review.aggregate([
      { $match: { movie: new mongoose.Types.ObjectId(movieId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    return res.json({ success: true, data: reviews, total, avgRating: avg[0]?.avg?.toFixed(1) || 0 });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// POST /movies/:movieId/reviews
export async function createReview(req: AuthRequest, res: Response) {
  try {
    const { movieId } = req.params;
    const { rating, comment } = req.body;
    const existing = await Review.findOne({ user: req.user!.id, movie: movieId });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
      await existing.save();
      await updateMovieRating(movieId);
      return res.json({ success: true, data: existing, message: 'Đã cập nhật đánh giá' });
    }
    const review = await Review.create({ user: req.user!.id, movie: movieId, rating, comment });
    await updateMovieRating(movieId);
    const populated = await review.populate('user', 'name avatar');
    return res.status(201).json({ success: true, data: populated });
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Bạn đã đánh giá phim này' });
    return res.status(500).json({ success: false, message: err.message });
  }
}

// DELETE /reviews/:id
export async function deleteReview(req: AuthRequest, res: Response) {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user!.id });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    await updateMovieRating(review.movie.toString());
    return res.json({ success: true, message: 'Đã xóa đánh giá' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function updateMovieRating(movieId: string) {
  const agg = await Review.aggregate([
    { $match: { movie: new mongoose.Types.ObjectId(movieId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  await Movie.findByIdAndUpdate(movieId, {
    rating: agg[0]?.avg ? +agg[0].avg.toFixed(1) : 0,
    ratingCount: agg[0]?.count || 0,
  });
}
