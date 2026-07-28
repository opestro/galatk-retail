import { CorsOptions } from 'cors'
import { CustomError } from '../shared/types/error_type.js'

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
  'https://galatk.shop',
  'https://www.galatk.shop',
]

function configuredOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const frontend = process.env.FRONTEND_ORIGIN?.trim()
  return [...defaultOrigins, ...fromEnv, ...(frontend ? [frontend] : [])]
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    const allowedOrigins = configuredOrigins()
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*')
        return new RegExp(`^${pattern}$`).test(origin)
      }
      return allowedOrigin === origin
    })

    if (isAllowed) {
      callback(null, true)
    } else {
      callback(new CustomError('NOT_ALLOWED_BY_CORS', 'Not allowed by CORS', 403))
    }
  },
  credentials: true,
}
