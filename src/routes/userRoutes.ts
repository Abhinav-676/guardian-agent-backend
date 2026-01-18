import { Router } from 'express'
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// CRUD routes - all protected
router.get('/', authenticate, getAllUsers) // Get all users
router.get('/:id', authenticate, getUserById) // Get user by ID
router.put('/:id', authenticate, updateUser) // Update user
router.delete('/:id', authenticate, deleteUser) // Delete user

export default router
