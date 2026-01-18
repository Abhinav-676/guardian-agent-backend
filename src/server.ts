import express from 'express'
import { connectDatabase } from './config/database'
import userRoutes from './routes/userRoutes'
import authRoutes from './routes/authRoutes'
import agentRoutes from './routes/agentRoutes'
import dotenv from 'dotenv'


const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/users', userRoutes)
app.use('/auth', authRoutes)
app.use('/agent', agentRoutes)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

// Initialize server
async function startServer() {
  dotenv.config()

  try {
    console.log("Yeah")
    // Connect to MongoDB
    await connectDatabase()

    // Start listening
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()