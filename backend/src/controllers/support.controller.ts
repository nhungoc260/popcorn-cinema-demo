import { Response } from 'express'
import { AuthRequest } from '../middleware/errorHandler'
import { User } from '../models'

let supportTickets: any[] = []
let ticketCounter = 1

// POST /api/v1/support/tickets — User gửi yêu cầu từ chatbot
export const createTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { message, category } = req.body
    if (!message || message.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Vui lòng mô tả vấn đề' })
    }

    const dbUser = req.user?.id
      ? await User.findById(req.user.id).select('name email').lean() as any
      : null

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
    }

    supportTickets.unshift(ticket)
    if (supportTickets.length > 100) supportTickets = supportTickets.slice(0, 100)

    res.status(201).json({ success: true, data: ticket })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/v1/support/tickets — Staff xem danh sách
export const getTickets = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query
    const filtered = status
      ? supportTickets.filter(t => t.status === status)
      : supportTickets
    res.json({ success: true, data: filtered })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// PATCH /api/v1/support/tickets/:id — Staff cập nhật trạng thái
export const updateTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, note } = req.body
    const ticket = supportTickets.find(t => t.id === id)
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' })

    if (status) ticket.status = status
    if (note !== undefined) ticket.note = note
    if (status === 'resolved') ticket.resolvedAt = new Date()

    res.json({ success: true, data: ticket })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}