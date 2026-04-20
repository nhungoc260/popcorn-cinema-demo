"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const support_controller_1 = require("../controllers/support.controller");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// Khách vãng lai cũng có thể gửi ticket → không cần auth
router.post('/tickets', support_controller_1.createTicket);
// Chỉ staff/admin mới xem được tickets
router.get('/tickets', errorHandler_1.authenticate, support_controller_1.getTickets);
router.patch('/tickets/:id', errorHandler_1.authenticate, support_controller_1.updateTicket);
exports.default = router;
//# sourceMappingURL=support.routes.js.map