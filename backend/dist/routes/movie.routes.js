"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const movie_controller_1 = require("../controllers/movie.controller");
const review_controller_1 = require("../controllers/review.controller");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// Public
router.get('/', movie_controller_1.getMovies);
router.get('/:id', movie_controller_1.getMovie);
router.get('/:movieId/reviews', review_controller_1.getReviews);
// Auth
router.post('/:movieId/reviews', errorHandler_1.authenticate, review_controller_1.createReview);
router.delete('/reviews/:id', errorHandler_1.authenticate, review_controller_1.deleteReview);
// Admin
router.post('/', errorHandler_1.authenticate, (0, errorHandler_1.authorize)('admin'), movie_controller_1.createMovie);
router.put('/:id', errorHandler_1.authenticate, (0, errorHandler_1.authorize)('admin'), movie_controller_1.updateMovie);
router.delete('/:id', errorHandler_1.authenticate, (0, errorHandler_1.authorize)('admin'), movie_controller_1.deleteMovie);
exports.default = router;
//# sourceMappingURL=movie.routes.js.map