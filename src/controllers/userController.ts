import type { Request, Response } from 'express'
import { User, UserZodSchema, type UserBase } from '../schemas/userSchema'
import { validateData, ValidationError } from '../utils/validation'

// Get all users
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const users = await User.find().select('-password')
    res.status(200).json({
      message: 'Users retrieved successfully',
      count: users.length,
      users,
    })
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message })
      return
    }

    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get user by ID
export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    if (!id) {
      res.status(400).json({ error: 'User ID is required' })
      return
    }

    const user = await User.findById(id).select('-password')

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.status(200).json({
      message: 'User retrieved successfully',
      user,
    })
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message })
      return
    }

    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update user by ID
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    if (!id) {
      res.status(400).json({ error: 'User ID is required' })
      return
    }

    // Validate only the provided fields
    const updateSchema = UserZodSchema.partial()
    const validatedData = validateData(updateSchema, req.body)

    // Check if email is being updated and if it's unique
    if (validatedData.email) {
      const existingUser = await User.findOne({
        email: validatedData.email,
        _id: { $ne: id },
      })
      if (existingUser) {
        res
          .status(409)
          .json({ error: 'User with this email already exists' })
        return
      }
    }

    const user = await User.findByIdAndUpdate(id, validatedData, {
      new: true,
      runValidators: true,
    }).select('-password')

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.status(200).json({
      message: 'User updated successfully',
      user,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      })
      return
    }

    if (error instanceof Error) {
      res.status(500).json({ error: error.message })
      return
    }

    res.status(500).json({ error: 'Internal server error' })
  }
}

// Delete user by ID
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    if (!id) {
      res.status(400).json({ error: 'User ID is required' })
      return
    }

    const user = await User.findByIdAndDelete(id)

    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    res.status(200).json({
      message: 'User deleted successfully',
      user: user.toObject(),
    })
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message })
      return
    }

    res.status(500).json({ error: 'Internal server error' })
  }
}
