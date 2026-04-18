"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("../controllers/booking.controller");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(errorHandler_1.authenticate);
router.post('/', booking_controller_1.createBooking);
router.get('/my', booking_controller_1.getMyBookings);
router.get('/loyalty', booking_controller_1.getLoyaltyInfo);
router.post('/apply-points', booking_controller_1.applyPoints);
router.get('/:id', booking_controller_1.getBooking);
router.patch('/:id/cancel', booking_controller_1.cancelBooking);
router.post('/:id/refund', (0, errorHandler_1.authorize)('staff', 'admin'), booking_controller_1.staffRefund);
router.post('/:id/request-refund', (0, errorHandler_1.authorize)('staff', 'admin'), booking_controller_1.requestRefund);
router.post('/check-in', (0, errorHandler_1.authorize)('staff', 'admin'), booking_controller_1.checkIn);
exports.default = router;
//# sourceMappingURL=booking.routes.js.map