"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// theater.routes.ts
const express_1 = require("express");
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.get('/', async (_, res) => {
    const theaters = await models_1.Theater.find({ isActive: true });
    res.json({ success: true, data: theaters });
});
router.get('/:id', async (req, res) => {
    const theater = await models_1.Theater.findById(req.params.id);
    if (!theater)
        return res.status(404).json({ success: false, message: 'Theater not found' });
    const rooms = await models_1.Room.find({ theater: req.params.id, isActive: true });
    return res.json({ success: true, data: { theater, rooms } });
});
router.post('/', errorHandler_1.authenticate, (0, errorHandler_1.authorize)('admin'), async (req, res) => {
    const theater = await models_1.Theater.create(req.body);
    res.status(201).json({ success: true, data: theater });
});
router.put('/:id', errorHandler_1.authenticate, (0, errorHandler_1.authorize)('admin'), async (req, res) => {
    const theater = await models_1.Theater.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: theater });
});
exports.default = router;
//# sourceMappingURL=theater.routes.js.map