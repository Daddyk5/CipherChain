import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { createAuthController } from '../controllers/authController.js'

export function createAuthRouter({ walletAuthService, sessionService, requireUser, rateLimitPerMinute = 20 }) {
  const authRouter = Router()
  const controller = createAuthController({ walletAuthService, sessionService })
  const signInLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: rateLimitPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Try again shortly.' },
  })

  authRouter.post('/nonce', signInLimiter, controller.issueNonce)
  authRouter.post('/verify-wallet', signInLimiter, controller.verifyWalletSignature)
  authRouter.get('/session', requireUser, controller.getSession)
  authRouter.post('/logout', requireUser, controller.logout)

  return authRouter
}
