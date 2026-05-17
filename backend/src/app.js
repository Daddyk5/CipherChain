import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { apiRouter } from './routes/index.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }))
  app.use(express.json({ limit: '1mb' }))
  app.use(requestLogger)
  app.use('/api', apiRouter)
  app.use(errorHandler)

  return app
}
