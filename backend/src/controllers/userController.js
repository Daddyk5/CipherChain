import { isAddress } from 'ethers'
import { z } from 'zod'

const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(64).nullable().optional(),
    avatarUrl: z.string().url().max(512).startsWith('https://').nullable().optional(),
  })
  .strict()

function toProfile(row) {
  return {
    walletAddress: row.checksum_address,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  }
}

export function createUserController({ db }) {
  return {
    async getProfile(request, response, next) {
      const { walletAddress } = request.params
      if (!isAddress(walletAddress)) {
        return response.status(400).json({ code: 'INVALID_ADDRESS', message: 'A valid wallet address is required.' })
      }
      try {
        const { rows } = await db.query(
          'SELECT checksum_address, display_name, avatar_url FROM users WHERE wallet_address = $1',
          [walletAddress.toLowerCase()],
        )
        if (!rows.length) {
          return response.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' })
        }
        return response.json(toProfile(rows[0]))
      } catch (error) {
        return next(error)
      }
    },

    async updateProfile(request, response, next) {
      if (request.params.walletAddress?.toLowerCase() !== request.user.uid) {
        return response.status(403).json({ code: 'FORBIDDEN', message: 'You can only edit your own profile.' })
      }
      const parsed = profileUpdateSchema.safeParse(request.body)
      if (!parsed.success) {
        return response.status(400).json({ code: 'INVALID_REQUEST', message: 'Invalid profile update.', issues: parsed.error.issues })
      }
      const { displayName, avatarUrl } = parsed.data
      try {
        const { rows } = await db.query(
          `UPDATE users SET
             display_name = CASE WHEN $2 THEN $3 ELSE display_name END,
             avatar_url   = CASE WHEN $4 THEN $5 ELSE avatar_url END
           WHERE wallet_address = $1
           RETURNING checksum_address, display_name, avatar_url`,
          [request.user.uid, displayName !== undefined, displayName ?? null, avatarUrl !== undefined, avatarUrl ?? null],
        )
        return response.json(toProfile(rows[0]))
      } catch (error) {
        return next(error)
      }
    },
  }
}
