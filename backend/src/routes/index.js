import { Router } from 'express'
import { createKeyDirectoryService } from '../keys/keyDirectoryService.js'
import { createMessageRelayService } from '../messaging/messageRelayService.js'
import { createRequireUser } from '../middleware/requireUser.js'
import { createAdminRouter } from './admin.routes.js'
import { createAuthRouter } from './auth.routes.js'
import { healthRouter } from './health.routes.js'
import { createKeysRouter } from './keys.routes.js'
import { createMessagesRouter } from './messages.routes.js'
import { createUsersRouter } from './users.routes.js'

// `notify(recipientAddress, envelope)` pushes new ciphertext to connected
// clients (Socket.io in production, a no-op or spy in tests).
export function createApiRouter({ db, auth, notify, bundleRateLimitPerMinute }) {
  const apiRouter = Router()
  const requireUser = createRequireUser(auth.sessionService)
  const keyDirectory = createKeyDirectoryService({ db })
  const messageRelay = createMessageRelayService({ db, keyDirectory, notify })

  apiRouter.use('/health', healthRouter)
  apiRouter.use('/admin', createAdminRouter({ db, requireUser }))
  apiRouter.use('/auth', createAuthRouter({ ...auth, requireUser }))
  apiRouter.use('/keys', createKeysRouter({ keyDirectory, requireUser, bundleRateLimitPerMinute }))
  apiRouter.use('/messages', createMessagesRouter({ messageRelay, requireUser }))
  apiRouter.use('/users', createUsersRouter({ db, requireUser }))

  return apiRouter
}
