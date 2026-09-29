import { verifyMessage } from 'ethers'
import { z } from 'zod'
import { AuthError } from '../auth/walletAuthService.js'
import { buildDeviceKeyStatement } from './deviceKeyStatement.js'

export const MAX_ACTIVE_DEVICES = 5
export const MAX_PREKEYS_PER_UPLOAD = 100
export const MAX_STORED_PREKEYS = 200

// Curve25519 public keys in libsignal's encoding: 0x05 type byte + 32 bytes.
const publicKey = z.string().refine((value) => decodedLength(value) === 33, 'Expected a base64 33-byte public key')
// XEdDSA signatures are 64 bytes.
const xeddsaSignature = z.string().refine((value) => decodedLength(value) === 64, 'Expected a base64 64-byte signature')
const keyId = z.number().int().min(1).max(0xffffff)

function decodedLength(value) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    return -1
  }
  return Buffer.from(value, 'base64').length
}

const signedPreKeySchema = z.object({ keyId, publicKey, signature: xeddsaSignature }).strict()
const preKeysSchema = z.array(z.object({ keyId, publicKey }).strict()).max(MAX_PREKEYS_PER_UPLOAD)

export const registerDeviceSchema = z
  .object({
    registrationId: z.number().int().min(1).max(16380),
    identityKey: publicKey,
    identitySignature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
    signedPreKey: signedPreKeySchema,
    preKeys: preKeysSchema,
  })
  .strict()

export const rotateSignedPreKeySchema = signedPreKeySchema
export const uploadPreKeysSchema = z.object({ preKeys: preKeysSchema.min(1) }).strict()

function toBundle(row) {
  return {
    deviceId: row.device_id,
    registrationId: row.registration_id,
    identityKey: row.identity_key,
    identitySignature: row.identity_signature,
    signedPreKey: { keyId: row.signed_prekey_id, publicKey: row.signed_prekey, signature: row.signed_prekey_signature },
    preKey: row.prekey_id ? { keyId: row.prekey_id, publicKey: row.prekey_public } : null,
  }
}

export function createKeyDirectoryService({ db }) {
  async function requireOwnDevice(user, deviceId, query = db.query) {
    const { rows } = await query(
      'SELECT 1 FROM devices WHERE wallet_address = $1 AND device_id = $2 AND revoked_at IS NULL',
      [user.uid, deviceId],
    )
    if (!rows.length) {
      throw new AuthError('UNKNOWN_DEVICE', 'Device is not registered to this wallet.', 404)
    }
  }

  // Public device list (no prekeys consumed). Used to verify senders.
  async function listDevices(walletAddress) {
    const { rows } = await db.query(
      `SELECT device_id, registration_id, identity_key, identity_signature,
              signed_prekey_id, signed_prekey, signed_prekey_signature
       FROM devices WHERE wallet_address = $1 AND revoked_at IS NULL ORDER BY device_id`,
      [walletAddress.toLowerCase()],
    )
    return rows.map(toBundle)
  }

  async function insertPreKeys(tx, walletAddress, deviceId, preKeys) {
    for (const preKey of preKeys) {
      await tx.query(
        `INSERT INTO one_time_prekeys (wallet_address, device_id, key_id, public_key) VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [walletAddress, deviceId, preKey.keyId, preKey.publicKey],
      )
    }
  }

  return {
    requireOwnDevice,

    async registerDevice(user, input) {
      // Defense in depth: clients verify this signature themselves, but refuse to
      // store a key the wallet didn't vouch for.
      const statement = buildDeviceKeyStatement({
        walletAddress: user.walletAddress,
        identityKey: input.identityKey,
        registrationId: input.registrationId,
      })
      let signer
      try {
        signer = verifyMessage(statement, input.identitySignature)
      } catch {
        signer = null
      }
      if (signer?.toLowerCase() !== user.uid) {
        throw new AuthError('INVALID_DEVICE_SIGNATURE', 'Device key must be signed by your wallet.', 400)
      }

      return db.transaction(async (tx) => {
        const { rows: active } = await tx.query(
          'SELECT count(*)::int AS n FROM devices WHERE wallet_address = $1 AND revoked_at IS NULL',
          [user.uid],
        )
        if (active[0].n >= MAX_ACTIVE_DEVICES) {
          throw new AuthError('TOO_MANY_DEVICES', `At most ${MAX_ACTIVE_DEVICES} active devices. Remove one first.`, 409)
        }

        const { rows } = await tx.query(
          `INSERT INTO devices (wallet_address, device_id, registration_id, identity_key, identity_signature,
                                signed_prekey_id, signed_prekey, signed_prekey_signature)
           SELECT $1, COALESCE(MAX(device_id), 0) + 1, $2, $3, $4, $5, $6, $7 FROM devices WHERE wallet_address = $1
           RETURNING device_id`,
          [
            user.uid,
            input.registrationId,
            input.identityKey,
            input.identitySignature,
            input.signedPreKey.keyId,
            input.signedPreKey.publicKey,
            input.signedPreKey.signature,
          ],
        )
        const deviceId = rows[0].device_id
        await insertPreKeys(tx, user.uid, deviceId, input.preKeys)
        return { deviceId }
      })
    },

    async rotateSignedPreKey(user, deviceId, signedPreKey) {
      await requireOwnDevice(user, deviceId)
      await db.query(
        `UPDATE devices SET signed_prekey_id = $3, signed_prekey = $4, signed_prekey_signature = $5,
                            signed_prekey_updated_at = now()
         WHERE wallet_address = $1 AND device_id = $2`,
        [user.uid, deviceId, signedPreKey.keyId, signedPreKey.publicKey, signedPreKey.signature],
      )
    },

    async uploadPreKeys(user, deviceId, preKeys) {
      return db.transaction(async (tx) => {
        await requireOwnDevice(user, deviceId, tx.query)
        const { rows } = await tx.query(
          'SELECT count(*)::int AS n FROM one_time_prekeys WHERE wallet_address = $1 AND device_id = $2',
          [user.uid, deviceId],
        )
        if (rows[0].n + preKeys.length > MAX_STORED_PREKEYS) {
          throw new AuthError('TOO_MANY_PREKEYS', `At most ${MAX_STORED_PREKEYS} prekeys can be stored.`, 409)
        }
        await insertPreKeys(tx, user.uid, deviceId, preKeys)
        return { count: rows[0].n + preKeys.length }
      })
    },

    async countPreKeys(user, deviceId) {
      await requireOwnDevice(user, deviceId)
      const { rows } = await db.query(
        'SELECT count(*)::int AS n FROM one_time_prekeys WHERE wallet_address = $1 AND device_id = $2',
        [user.uid, deviceId],
      )
      return rows[0].n
    },

    async revokeDevice(user, deviceId) {
      await requireOwnDevice(user, deviceId)
      await db.transaction(async (tx) => {
        await tx.query('UPDATE devices SET revoked_at = now() WHERE wallet_address = $1 AND device_id = $2', [user.uid, deviceId])
        await tx.query('DELETE FROM one_time_prekeys WHERE wallet_address = $1 AND device_id = $2', [user.uid, deviceId])
        await tx.query('DELETE FROM message_envelopes WHERE recipient_address = $1 AND recipient_device_id = $2', [user.uid, deviceId])
      })
    },

    listDevices,

    // Prekey bundles for every active device, each consuming one one-time
    // prekey if one is available. Without one, X3DH falls back to the signed
    // prekey only, which is still secure but loses some forward secrecy.
    async fetchBundles(walletAddress) {
      const address = walletAddress.toLowerCase()
      const { rows: consumed } = await db.query(
        `DELETE FROM one_time_prekeys p
         WHERE (p.wallet_address, p.device_id, p.key_id) IN (
           SELECT o.wallet_address, o.device_id, MIN(o.key_id)
           FROM one_time_prekeys o
           JOIN devices d ON d.wallet_address = o.wallet_address AND d.device_id = o.device_id AND d.revoked_at IS NULL
           WHERE o.wallet_address = $1
           GROUP BY o.wallet_address, o.device_id)
         RETURNING p.device_id, p.key_id, p.public_key`,
        [address],
      )
      const preKeyByDevice = new Map(consumed.map((row) => [row.device_id, row]))
      const devices = await listDevices(address)
      return devices.map((device) => {
        const preKey = preKeyByDevice.get(device.deviceId)
        return { ...device, preKey: preKey ? { keyId: preKey.key_id, publicKey: preKey.public_key } : null }
      })
    },
  }
}
