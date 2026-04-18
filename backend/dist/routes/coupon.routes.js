"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coupon_controller_1 = require("../controllers/coupon.controller");
const errorHandler_1 = require("../middleware/errorHandler");
const r = (0, express_1.Router)();
r.post('/validate', errorHandler_1.authenticate, coupon_controller_1.validateCoupon);
r.post('/apply', errorHandler_1.authenticate, coupon_controller_1.applyCoupon);
r.get('/loyalty', errorHandler_1.authenticate, coupon_controller_1.getMyLoyalty);
exports.default = r;
//# sourceMappingURL=coupon.routes.js.map