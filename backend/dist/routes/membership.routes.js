"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const membership_controller_1 = require("../controllers/membership.controller");
const errorHandler_1 = require("../middleware/errorHandler"); // đổi tên nếu middleware của bạn khác
const router = (0, express_1.Router)();
router.get('/me', errorHandler_1.authenticate, membership_controller_1.getMyMembership);
router.get('/history', errorHandler_1.authenticate, membership_controller_1.getPointsHistory);
exports.default = router;
//# sourceMappingURL=membership.routes.js.map