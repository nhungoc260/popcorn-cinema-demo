"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const payment_controller_1 = require("../controllers/payment.controller");
const router = (0, express_1.Router)();
router.post('/initiate', errorHandler_1.authenticate, payment_controller_1.initiatePayment);
router.post('/confirm', errorHandler_1.authenticate, payment_controller_1.confirmPayment);
router.post('/admin-confirm', errorHandler_1.authenticate, payment_controller_1.adminConfirmPayment);
router.post('/admin-reject', errorHandler_1.authenticate, payment_controller_1.adminRejectPayment);
router.get('/pending', errorHandler_1.authenticate, payment_controller_1.getPendingPayments);
router.get('/status/:transactionId', errorHandler_1.authenticate, payment_controller_1.getPaymentStatus);
router.get('/by-booking/:bookingId', errorHandler_1.authenticate, payment_controller_1.getPaymentByBooking); // [MỚI] - đặt TRƯỚC /:id
exports.default = router;
//# sourceMappingURL=payment.routes.js.map