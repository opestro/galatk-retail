import { CorsOptions } from 'cors'
import { CustomError } from '../shared/types/error_type.js'

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
]

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace('*', '.*')
        return new RegExp(pattern).test(origin)
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
