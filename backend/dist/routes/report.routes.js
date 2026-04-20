"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("../controllers/report.controller");
const errorHandler_1 = require("../middleware/errorHandler");
const r = (0, express_1.Router)();
r.use(errorHandler_1.authenticate);
// Admin + Staff đều xem được doanh thu
r.get('/revenue', (0, errorHandler_1.authorize)('admin', 'staff'), report_controller_1.getRevenueReport);
// Chỉ Admin mới xem occupancy
r.get('/occupancy', (0, errorHandler_1.authorize)('admin'), report_controller_1.getOccupancyReport);
r.get('/user-behavior/:userId', report_controller_1.getUserBehavior);
r.get('/admin/user-trends', (0, errorHandler_1.authorize)('admin'), report_controller_1.getUserTrends);
exports.default = r;
//# sourceMappingURL=report.routes.js.map