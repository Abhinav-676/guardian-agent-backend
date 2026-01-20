import type { Request, Response, NextFunction } from 'express'
import { verifyToken, type TokenPayload } from '../utils/auth'

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload
        }
    }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization
    const clientIP = req.ip

    if (clientIP != process.env.AUTHERISED_CLIENT_IP) {
        res.status(401).json({ error: 'Unauthorized' })
        return
    }

    if (!authHeader) {
        res.status(401).json({ error: 'No token provided' })
        return
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
        res.status(401).json({ error: 'invalid token format' })
        return
    }

    try {
        const payload = verifyToken(token)
        req.user = payload
        next()
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' })
        return
    }
}
