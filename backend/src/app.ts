import { createExpressApp, startServer } from './server.js'
import prisma from './resources/database/initDatabase.js'

async function bootstrap() {
  const expressApp = createExpressApp()
  expressApp.set('trust proxy', true)

  // Bind before DB so platform health checks (GET /) can succeed.
  const server = startServer(expressApp)

  try {
    await prisma.$connect()
    console.log('⚡️[DB]: Database connection established')
  } catch (error) {
    // Do not exit — keep listening so health checks / logs stay available.
    console.error('⚡️[DB]: Database connection failed (server still listening):', error)
  }

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server')
    server.close(() => {
      console.log('HTTP server closed')
      void prisma.$disconnect().finally(() => process.exit(0))
    })
  })
}

bootstrap().catch((error) => {
  console.error('Failed to start app:', error)
  process.exit(1)
})
