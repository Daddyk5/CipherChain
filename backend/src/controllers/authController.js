import { z } from 'zod'
import { bearerToken } from '../middleware/requireUser.js'

const nonceRequestSchema = z.object({
  address: z.string().min(1),
  chainId: z.coerce.number().int().positive(),
})

const verifyRequestSchema = z.object({
  address: z.string().min(1),
  signature: z.string().min(1).max(1024),
})

function badRequest(response, issues) {
  return response.status(400).json({ code: 'INVALID_REQUEST', message: 'Invalid request body.', issues })
}

export function createAuthController({ walletAuthService, sessionService }) {
  return {
    async issueNonce(request, response, next) {
      const parsed = nonceRequestSchema.safeParse(request.body)
      if (!parsed.success) {
        return badRequest(response, parsed.error.issues)
      }
      try {
        const { message, expiresAt } = await walletAuthService.issueChallenge(parsed.data)
        return response.json({ message, expiresAt })
      } catch (error) {
        return next(error)
      }
    },

    async verifyWalletSignature(request, response, next) {
      const parsed = verifyRequestSchema.safeParse(request.body)
      if (!parsed.success) {
        return badRequest(response, parsed.error.issues)
      }
      try {
        const walletAddress = await walletAuthService.verifyChallenge(parsed.data)
        const session = await sessionService.issueSession(walletAddress)
        return response.json(session)
      } catch (error) {
        return next(error)
      }
    },

    getSession(request, response) {
      const { walletAddress, displayName, isAdmin } = request.user
      return response.json({ walletAddress, displayName, isAdmin })
    },

    async logout(request, response, next) {
      try {
        await sessionService.revokeSession(bearerToken(request))
        return response.status(204).end()
      } catch (error) {
        return next(error)
      }
    },
  }
}
