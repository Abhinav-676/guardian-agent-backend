import { Router } from 'express'
import { execute } from '../controllers/agentController'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// Protected routes
router.post('/execute', authenticate, execute)

export default router
