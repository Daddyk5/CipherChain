import { createHash, randomBytes as nodeRandomBytes } from 'node:crypto'

function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest()
}

// Opaque, revocable bearer sessions stored in Postgres. The client receives a
// 256-bit random token. Only its SHA-256 is stored.
export function createSessionService({ db, adminAddresses = [], ttlMs = 7 * 24 * 60 * 60 * 1000, randomBytes = nodeRandomBytes }) {
  function toUser(row) {
    return {
      uid: row.wallet_address,
      walletAddress: row.checksum_address,
      displayName: row.display_name,
      // Evaluated on every request, so removing an address from the allow-list
      // takes effect immediately.
      isAdmin: adminAddresses.includes(row.wallet_address),
    }
  }

  return {
    async issueSession(checksumAddress) {
      const walletAddress = checksumAddress.toLowerCase()
      await db.query(
        `INSERT INTO users (wallet_address, checksum_address) VALUES ($1, $2)
         ON CONFLICT (wallet_address) DO UPDATE SET last_login_at = now()`,
        [walletAddress, checksumAddress],
      )

      const sessionToken = randomBytes(32).toString('base64url')
      const expiresAt = Date.now() + ttlMs
      await db.query(
        'INSERT INTO sessions (token_hash, wallet_address, expires_at) VALUES ($1, $2, to_timestamp($3 / 1000.0))',
        [hashToken(sessionToken), walletAddress, expiresAt],
      )

      return {
        sessionToken,
        expiresAt,
        walletAddress: checksumAddress,
        isAdmin: adminAddresses.includes(walletAddress),
      }
    },

    // Resolves to the session's user, or null if the token is unknown, expired or revoked.
    async verifySession(sessionToken) {
      if (typeof sessionToken !== 'string' || sessionToken.length > 128) {
        return null
      }
      const { rows } = await db.query(
        `SELECT u.wallet_address, u.checksum_address, u.display_name
         FROM sessions s JOIN users u ON u.wallet_address = s.wallet_address
         WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()`,
        [hashToken(sessionToken)],
      )
      return rows.length ? toUser(rows[0]) : null
    },

    async revokeSession(sessionToken) {
      await db.query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [hashToken(sessionToken)])
    },
  }
}
