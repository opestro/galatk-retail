import { createExpressApp, startServer } from './server.js'
import prisma from './resources/database/initDatabase.js'

async function bootstrap() {
  try {
    const expressApp = createExpressApp()
    expressApp.set('trust proxy', true)
    const server = startServer(expressApp)

    await prisma.$connect()
    console.log('⚡️[DB]: Database connection established')

    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server')
      server.close(() => {
        console.log('HTTP server closed')
      })
    })
  } catch (error) {
    console.error('Failed to start app:', error)
    process.exit(1)
  }
}

bootstrap()
