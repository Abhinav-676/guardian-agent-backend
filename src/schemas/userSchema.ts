import mongoose from 'mongoose'
import * as z from 'zod'

import bcrypt from 'bcrypt'

// Zod validation schema
export const UserZodSchema = z.object({
  email: z.email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  mobileRunApiKey: z.string().optional(),
  deviceId: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
})

export type IUser = z.infer<typeof UserZodSchema>
export type UserBase = IUser

interface IUserMethods {
  comparePassword(password: string): Promise<boolean>
}

// Mongoose schema
const userSchema = new mongoose.Schema<IUser, mongoose.Model<IUser, {}, IUserMethods>, IUserMethods>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    mobileRunApiKey: {
      type: String,
      select: false,
    },
    deviceId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Pre-save hook to hash password
// Pre-save hook to hash password
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Method to compare password
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password)
}

export const User = mongoose.model<IUser, mongoose.Model<IUser, {}, IUserMethods>>('User', userSchema)
