import { Response } from 'express'
import { AuthRequest } from '../middleware/errorHandler'
import { User, SupportTicket } from '../models'
import jwt from 'jsonwebtoken'

async function genTicketId(): Promise<string> {
  const count = await SupportTicket.countDocuments()
  return `SP${String(count + 1).padStart(4, '0')}`
}

// POST /api/v1/support/tickets
export const createTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { message, category } = req.body
    if (!message || message.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Vui lòng mô tả vấn đề' })
    }

    // Thử lấy user từ req.user (nếu có authenticate)
    // hoặc decode token thủ công từ header (route không có authenticate)
    let dbUser: any = null
    let userId: string | null = null

    if (req.user?.id) {
      userId = req.user.id
      dbUser = await User.findById(userId).select('name email').lean()
    } else {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1]
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
          userId = decoded.id
          dbUser = await User.findById(userId).select('name email').lean()
        } catch {
          // Token không hợp lệ → khách vãng lai
        }
      }
    }

    const ticketId = await genTicketId()

    const ticket = await SupportTicket.create({
      ticketId,
      userId:    userId || null,
      userName:  dbUser?.name || 'Khách vãng lai',
      userEmail: dbUser?.email || '',
      message:   message.trim(),
      category:  category || 'general',
      status:    'pending',
      note:      '',
    })

    res.status(201).json({
      success: true,
      data: {
        id:        ticket.ticketId,
        userName:  ticket.userName,
        userEmail: ticket.userEmail,
        message:   ticket.message,
        status:    ticket.status,
        createdAt: ticket.createdAt,
        note:      ticket.note,
      }
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/v1/support/tickets
export const getTickets = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query
    const filter: any = {}
    if (status) filter.status = status

    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    // Fix 304 cache issue - buộc server luôn trả data mới
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')

    const data = tickets.map(t => ({
      id:         t.ticketId,
      userName:   t.userName,
      userEmail:  t.userEmail,
      message:    t.message,
      status:     t.status,
      createdAt:  t.createdAt,
      note:       t.note,
      resolvedAt: t.resolvedAt,
    }))

    res.json({ success: true, data })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// PATCH /api/v1/support/tickets/:id
export const updateTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, note } = req.body

    const update: any = {}
    if (status) update.status = status
    if (note !== undefined) update.note = note
    if (status === 'resolved') update.resolvedAt = new Date()

    const ticket = await SupportTicket.findOneAndUpdate(
      { ticketId: id },
      update,
      { new: true }
    )

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ticket' })
    }

    res.json({
      success: true,
      data: {
        id:        ticket.ticketId,
        userName:  ticket.userName,
        message:   ticket.message,
        status:    ticket.status,
        note:      ticket.note,
        createdAt: ticket.createdAt,
      }
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}