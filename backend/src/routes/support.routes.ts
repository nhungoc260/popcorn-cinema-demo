import { Router } from 'express'
import { createTicket, getTickets, updateTicket } from '../controllers/support.controller'
import { authenticate } from '../middleware/errorHandler'

const router = Router()

router.post('/tickets', authenticate, createTicket)
router.get('/tickets', authenticate, getTickets)
router.patch('/tickets/:id', authenticate, updateTicket)

export default router