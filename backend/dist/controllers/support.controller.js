"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicket = exports.getTickets = exports.createTicket = void 0;
const models_1 = require("../models");
let supportTickets = [];
let ticketCounter = 1;
// POST /api/v1/support/tickets — User gửi yêu cầu từ chatbot
const createTicket = async (req, res) => {
    try {
        const { message, category } = req.body;
        if (!message || message.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Vui lòng mô tả vấn đề' });
        }
        const dbUser = req.user?.id
            ? await models_1.User.findById(req.user.id).select('name email').lean()
            : null;
        const ticket = {
            id: `SP${String(ticketCounter++).padStart(4, '0')}`,
            userId: req.user?.id || null,
            userName: dbUser?.name || 'Khách vãng lai',
            userEmail: dbUser?.email || req.user?.email || '',
            message: message.trim(),
            category: category || 'general',
            status: 'pending',
            createdAt: new Date(),
            resolvedAt: null,
            note: '',
        };
        supportTickets.unshift(ticket);
        if (supportTickets.length > 100)
            supportTickets = supportTickets.slice(0, 100);
        res.status(201).json({ success: true, data: ticket });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.createTicket = createTicket;
// GET /api/v1/support/tickets — Staff xem danh sách
const getTickets = async (req, res) => {
    try {
        const { status } = req.query;
        const filtered = status
            ? supportTickets.filter(t => t.status === status)
            : supportTickets;
        res.json({ success: true, data: filtered });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getTickets = getTickets;
// PATCH /api/v1/support/tickets/:id — Staff cập nhật trạng thái
const updateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        const ticket = supportTickets.find(t => t.id === id);
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' });
        if (status)
            ticket.status = status;
        if (note !== undefined)
            ticket.note = note;
        if (status === 'resolved')
            ticket.resolvedAt = new Date();
        res.json({ success: true, data: ticket });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.updateTicket = updateTicket;
//# sourceMappingURL=support.controller.js.map