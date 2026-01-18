import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guardian-agent'

export async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('MongoDB connected successfully')
    return mongoose.connection
  } catch (error) {
    console.error('MongoDB connection failed:', error)
    process.exit(1)
  }
}

export async function disconnectDatabase() {
  try {
    await mongoose.disconnect()
    console.log('MongoDB disconnected')
  } catch (error) {
    console.error('MongoDB disconnection failed:', error)
    throw error
  }
}
