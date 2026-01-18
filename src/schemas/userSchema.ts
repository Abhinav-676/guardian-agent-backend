import mongoose from 'mongoose'
import * as z from 'zod'

import bcrypt from 'bcrypt'

// Zod validation schema
export const UserZodSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  deviceId: z.string().optional(),
  mobileRunApiKey: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
})

export type UserBase = z.infer<typeof UserZodSchema>

export interface IUser extends UserBase {
  comparePassword(candidatePassword: string): Promise<boolean>
}

// Mongoose schema
const userSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          return UserZodSchema.shape.email.safeParse(v).success;
        },
        message: 'Invalid email address'
      }
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
    deviceId: {
      type: String,
      required: false,
    },
    mobileRunApiKey: {
      type: String,
      required: false,
      select: false,
    },
  },
  {
    timestamps: true,
  }
)

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password)
}

export const User = mongoose.model<IUser>('User', userSchema)
