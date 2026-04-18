"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviews = getReviews;
exports.createReview = createReview;
exports.deleteReview = deleteReview;
const mongoose_1 = __importDefault(require("mongoose"));
const models_1 = require("../models");
// GET /movies/:movieId/reviews
async function getReviews(req, res) {
    try {
        const { movieId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const reviews = await models_1.Review.find({ movie: movieId })
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 })
            .skip((+page - 1) * +limit).limit(+limit);
        const total = await models_1.Review.countDocuments({ movie: movieId });
        const avg = await models_1.Review.aggregate([
            { $match: { movie: new mongoose_1.default.Types.ObjectId(movieId) } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        return res.json({ success: true, data: reviews, total, avgRating: avg[0]?.avg?.toFixed(1) || 0 });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /movies/:movieId/reviews
async function createReview(req, res) {
    try {
        const { movieId } = req.params;
        const { rating, comment } = req.body;
        const existing = await models_1.Review.findOne({ user: req.user.id, movie: movieId });
        if (existing) {
            existing.rating = rating;
            existing.comment = comment;
            await existing.save();
            await updateMovieRating(movieId);
            return res.json({ success: true, data: existing, message: 'Đã cập nhật đánh giá' });
        }
        const review = await models_1.Review.create({ user: req.user.id, movie: movieId, rating, comment });
        await updateMovieRating(movieId);
        const populated = await review.populate('user', 'name avatar');
        return res.status(201).json({ success: true, data: populated });
    }
    catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ success: false, message: 'Bạn đã đánh giá phim này' });
        return res.status(500).json({ success: false, message: err.message });
    }
}
// DELETE /reviews/:id
async function deleteReview(req, res) {
    try {
        const review = await models_1.Review.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!review)
            return res.status(404).json({ success: false, message: 'Review not found' });
        await updateMovieRating(review.movie.toString());
        return res.json({ success: true, message: 'Đã xóa đánh giá' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
async function updateMovieRating(movieId) {
    const agg = await models_1.Review.aggregate([
        { $match: { movie: new mongoose_1.default.Types.ObjectId(movieId) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    await models_1.Movie.findByIdAndUpdate(movieId, {
        rating: agg[0]?.avg ? +agg[0].avg.toFixed(1) : 0,
        ratingCount: agg[0]?.count || 0,
    });
}
//# sourceMappingURL=review.controller.js.map