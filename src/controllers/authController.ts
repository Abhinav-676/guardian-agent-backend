import type { Request, Response } from 'express'
import { User, UserZodSchema, type UserBase } from '../schemas/userSchema'
import { validateData, ValidationError } from '../utils/validation'
import { generateToken } from '../utils/auth'

export async function register(req: Request, res: Response): Promise<void> {
    try {
        const validatedData = validateData<UserBase>(UserZodSchema, req.body)

        const existingUser = await User.findOne({ email: validatedData.email })
        if (existingUser) {
            res.status(409).json({ error: 'User with this email already exists' })
            return
        }

        const user = new User(validatedData)
        await user.save()

        const token = generateToken({ userId: user._id.toString(), email: user.email })

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
            token,
        })
    } catch (error) {
        if (error instanceof ValidationError) {
            res.status(400).json({ error: 'Validation failed', details: error.errors })
            return
        }
        if (error instanceof Error) {
            res.status(500).json({ error: error.message })
            return
        }
        res.status(500).json({ error: 'Internal server error' })
    }
}

export async function login(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' })
            return
        }

        const user = await User.findOne({ email }).select('+password')

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' })
            return
        }

        const isMatch = await user.comparePassword(password)

        if (!isMatch) {
            res.status(401).json({ error: 'Invalid credentials' })
            return
        }

        const token = generateToken({ userId: user._id.toString(), email: user.email })

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
            token,
        })
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message })
            return
        }
        res.status(500).json({ error: 'Internal server error' })
    }
}
