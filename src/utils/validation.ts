import { type ZodType, ZodError } from 'zod'

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: ZodError['issues']
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateData<T>(schema: ZodType<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Validation failed', error.issues)
    }
    throw error
  }
}
