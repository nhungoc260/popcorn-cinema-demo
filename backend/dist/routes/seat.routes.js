"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// seat.routes.ts
const express_1 = require("express");
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.get('/room/:roomId', async (req, res) => {
    const seats = await models_1.Seat.find({ room: req.params.roomId, isActive: true }).sort({ row: 1, col: 1 });
    res.json({ success: true, data: seats });
});
router.post('/', errorHandler_1.authenticate, (0, errorHandler_1.authorize)('admin'), async (req, res) => {
    const seat = await models_1.Seat.create(req.body);
    res.status(201).json({ success: true, data: seat });
});
exports.default = router;
//# sourceMappingURL=seat.routes.js.map