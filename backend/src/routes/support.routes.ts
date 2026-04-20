import { Router } from 'express'
import { createTicket, getTickets, updateTicket } from '../controllers/support.controller'
import { authenticate } from '../middleware/errorHandler'

const router = Router()

// Khách vãng lai cũng có thể gửi ticket → không cần auth
router.post('/tickets', createTicket)
// Chỉ staff/admin mới xem được tickets
router.get('/tickets', authenticate, getTickets)
router.patch('/tickets/:id', authenticate, updateTicket)

export default router