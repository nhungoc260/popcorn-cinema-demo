"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicket = exports.getTickets = exports.createTicket = void 0;
const models_1 = require("../models");
async function genTicketId() {
    const count = await models_1.SupportTicket.countDocuments();
    return `SP${String(count + 1).padStart(4, '0')}`;
}
// POST /api/v1/support/tickets
const createTicket = async (req, res) => {
    try {
        const { message, category } = req.body;
        if (!message || message.trim().length < 5) {
            return res.status(400).json({ success: false, message: 'Vui lòng mô tả vấn đề' });
        }
        const dbUser = req.user?.id
            ? await models_1.User.findById(req.user.id).select('name email').lean()
            : null;
        const ticketId = await genTicketId();
        const ticket = await models_1.SupportTicket.create({
            ticketId,
            userId: req.user?.id || null,
            userName: dbUser?.name || 'Khách vãng lai',
            userEmail: dbUser?.email || '',
            message: message.trim(),
            category: category || 'general',
            status: 'pending',
            note: '',
        });
        res.status(201).json({ success: true, data: {
                id: ticket.ticketId,
                userName: ticket.userName,
                userEmail: ticket.userEmail,
                message: ticket.message,
                status: ticket.status,
                createdAt: ticket.createdAt,
                note: ticket.note,
            } });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.createTicket = createTicket;
// GET /api/v1/support/tickets
const getTickets = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        const tickets = await models_1.SupportTicket.find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        const data = tickets.map(t => ({
            id: t.ticketId,
            userName: t.userName,
            userEmail: t.userEmail,
            message: t.message,
            status: t.status,
            createdAt: t.createdAt,
            note: t.note,
            resolvedAt: t.resolvedAt,
        }));
        res.json({ success: true, data });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.getTickets = getTickets;
// PATCH /api/v1/support/tickets/:id
const updateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        const update = {};
        if (status)
            update.status = status;
        if (note !== undefined)
            update.note = note;
        if (status === 'resolved')
            update.resolvedAt = new Date();
        const ticket = await models_1.SupportTicket.findOneAndUpdate({ ticketId: id }, update, { new: true });
        if (!ticket)
            return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' });
        res.json({ success: true, data: {
                id: ticket.ticketId,
                userName: ticket.userName,
                message: ticket.message,
                status: ticket.status,
                note: ticket.note,
                createdAt: ticket.createdAt,
            } });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.updateTicket = updateTicket;
//# sourceMappingURL=support.controller.js.map