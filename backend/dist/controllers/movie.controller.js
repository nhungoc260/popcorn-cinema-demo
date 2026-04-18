"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMovies = getMovies;
exports.getMovie = getMovie;
exports.createMovie = createMovie;
exports.updateMovie = updateMovie;
exports.deleteMovie = deleteMovie;
const models_1 = require("../models");
// GET /movies
async function getMovies(req, res) {
    try {
        const { status, genre, search, page = 1, limit = 100 } = req.query;
        const filter = { isActive: true };
        if (status)
            filter.status = status;
        if (genre)
            filter.genres = { $in: [genre] };
        if (search)
            filter.title = { $regex: search, $options: 'i' };
        const movies = await models_1.Movie.find(filter)
            .sort({ createdAt: -1 })
            .skip((+page - 1) * +limit)
            .limit(+limit)
            .lean();
        const total = await models_1.Movie.countDocuments(filter);
        return res.json({ success: true, data: movies, total });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// GET /movies/:id
async function getMovie(req, res) {
    try {
        const movie = await models_1.Movie.findById(req.params.id).lean();
        if (!movie)
            return res.status(404).json({ success: false, message: 'Movie not found' });
        return res.json({ success: true, data: movie });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// POST /movies (admin)
async function createMovie(req, res) {
    try {
        const movie = await models_1.Movie.create(req.body);
        return res.status(201).json({ success: true, data: movie });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// PUT /movies/:id (admin)
async function updateMovie(req, res) {
    try {
        const movie = await models_1.Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!movie)
            return res.status(404).json({ success: false, message: 'Movie not found' });
        // Nếu phim chuyển sang "ended" hoặc "suspended" → ẩn TẤT CẢ suất chiếu
        if (req.body.status === 'ended' || req.body.status === 'suspended') {
            await models_1.Showtime.updateMany({ movie: req.params.id, isActive: true }, { isActive: false });
        }
        return res.json({ success: true, data: movie });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
// DELETE /movies/:id (admin)
async function deleteMovie(req, res) {
    try {
        await models_1.Movie.findByIdAndUpdate(req.params.id, { isActive: false });
        return res.json({ success: true, message: 'Movie deleted' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=movie.controller.js.map