// Server-side storage for outstanding sign-in challenges, keyed by lowercase
// wallet address. Each address has at most one outstanding challenge, and a new
// one replaces the old.
//
// Interface:
//   put(address, challenge)       -> Promise<void>
//   get(address)                  -> Promise<challenge | null>
//   consume(address, nonce)       -> Promise<boolean>  (atomic: true only for the caller that removed it)

export function createMemoryNonceStore() {
  const challenges = new Map()

  return {
    async put(address, challenge) {
      challenges.set(address, challenge)
    },
    async get(address) {
      return challenges.get(address) ?? null
    },
    async consume(address, nonce) {
      const current = challenges.get(address)
      if (!current || current.nonce !== nonce) {
        return false
      }
      challenges.delete(address)
      return true
    },
    // Test/ops helper: drop expired entries so the map cannot grow without bound.
    sweep(nowMs) {
      for (const [address, challenge] of challenges) {
        if (challenge.expiresAt <= nowMs) {
          challenges.delete(address)
        }
      }
    },
    get size() {
      return challenges.size
    },
  }
}

// Works across multiple backend instances. Expired rows are pruned
// opportunistically on each put, so no separate cleanup job is required.
export function createPostgresNonceStore(db) {
  return {
    async put(address, challenge) {
      await db.query('DELETE FROM auth_nonces WHERE expires_at < now()')
      await db.query(
        `INSERT INTO auth_nonces (wallet_address, nonce, message, expires_at)
         VALUES ($1, $2, $3, to_timestamp($4 / 1000.0))
         ON CONFLICT (wallet_address) DO UPDATE
           SET nonce = EXCLUDED.nonce, message = EXCLUDED.message, expires_at = EXCLUDED.expires_at`,
        [address, challenge.nonce, challenge.message, challenge.expiresAt],
      )
    },
    async get(address) {
      const { rows } = await db.query(
        `SELECT nonce, message, (extract(epoch FROM expires_at) * 1000)::float8 AS expires_at
         FROM auth_nonces WHERE wallet_address = $1`,
        [address],
      )
      if (!rows.length) {
        return null
      }
      return { nonce: rows[0].nonce, message: rows[0].message, expiresAt: Number(rows[0].expires_at) }
    },
    async consume(address, nonce) {
      // A single DELETE ... RETURNING is atomic, so only one caller can get the row.
      const { rows } = await db.query(
        'DELETE FROM auth_nonces WHERE wallet_address = $1 AND nonce = $2 RETURNING 1 AS consumed',
        [address, nonce],
      )
      return rows.length === 1
    },
  }
}
