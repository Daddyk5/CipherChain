import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/requestLogger.js'
import { createApiRouter } from './routes/index.js'

export function createApp(deps) {
  const app = express()

  // Set TRUST_PROXY (e.g. 1) only behind a reverse proxy. Otherwise clients can spoof X-Forwarded-For and dodge rate limits.
  if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY))
  }
  app.use(helmet())
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }))
  app.use(express.json({ limit: '1mb' }))
  app.use(requestLogger)
  app.use('/api', createApiRouter(deps))
  app.use(errorHandler)

  return app
}
