"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_controller_1 = require("../controllers/review.controller");
const errorHandler_1 = require("../middleware/errorHandler");
const r = (0, express_1.Router)({ mergeParams: true });
r.get('/', review_controller_1.getReviews);
r.post('/', errorHandler_1.authenticate, review_controller_1.createReview);
r.delete('/:id', errorHandler_1.authenticate, review_controller_1.deleteReview);
exports.default = r;
//# sourceMappingURL=review.routes.js.map