import { z } from 'zod'
import { AuthError } from '../auth/walletAuthService.js'

const deviceId = z.number().int().min(1)

export const sendMessagesSchema = z
  .object({
    senderDeviceId: deviceId,
    messages: z
      .array(
        z
          .object({
            recipientAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
            recipientDeviceId: deviceId,
            // Signal message types: 1 = WhisperMessage, 3 = PreKeyWhisperMessage.
            type: z.union([z.literal(1), z.literal(3)]),
            body: z.string().min(1).max(262144).regex(/^[A-Za-z0-9+/]+={0,2}$/),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict()

export const ackSchema = z.object({ deviceId, ids: z.array(z.string().regex(/^\d+$/)).min(1).max(500) }).strict()

function toEnvelope(row) {
  return {
    id: String(row.id),
    senderAddress: row.sender_address,
    senderDeviceId: row.sender_device_id,
    recipientDeviceId: row.recipient_device_id,
    type: row.type,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

// Stores and forwards opaque ciphertext envelopes. The server cannot read them.
// It only knows sender, recipient, size, and time (see THREAT_MODEL.md §4).
export function createMessageRelayService({ db, keyDirectory, notify = () => {} }) {
  return {
    async send(user, { senderDeviceId, messages }) {
      await keyDirectory.requireOwnDevice(user, senderDeviceId)

      const stored = await db.transaction(async (tx) => {
        const rows = []
        for (const message of messages) {
          const { rows: inserted } = await tx.query(
            `INSERT INTO message_envelopes (sender_address, sender_device_id, recipient_address, recipient_device_id, type, body)
             SELECT $1, $2, d.wallet_address, d.device_id, $5, $6
             FROM devices d WHERE d.wallet_address = $3 AND d.device_id = $4 AND d.revoked_at IS NULL
             RETURNING *`,
            [user.uid, senderDeviceId, message.recipientAddress.toLowerCase(), message.recipientDeviceId, message.type, message.body],
          )
          if (!inserted.length) {
            throw new AuthError(
              'UNKNOWN_RECIPIENT_DEVICE',
              `Device ${message.recipientDeviceId} of ${message.recipientAddress} is not active. Refresh their keys.`,
              409,
            )
          }
          rows.push(inserted[0])
        }
        return rows
      })

      const envelopes = stored.map(toEnvelope)
      for (const [index, envelope] of envelopes.entries()) {
        notify(stored[index].recipient_address, envelope)
      }
      return envelopes.map(({ id, recipientDeviceId }) => ({ id, recipientDeviceId }))
    },

    async inbox(user, recipientDeviceId, { limit = 100 } = {}) {
      await keyDirectory.requireOwnDevice(user, recipientDeviceId)
      const { rows } = await db.query(
        `SELECT * FROM message_envelopes WHERE recipient_address = $1 AND recipient_device_id = $2
         ORDER BY id LIMIT $3`,
        [user.uid, recipientDeviceId, limit],
      )
      return rows.map(toEnvelope)
    },

    // Deletes delivered envelopes. Only the recipient device can ack its own mail.
    async ack(user, { deviceId: recipientDeviceId, ids }) {
      const { rows } = await db.query(
        `DELETE FROM message_envelopes
         WHERE recipient_address = $1 AND recipient_device_id = $2 AND id = ANY($3::bigint[])
         RETURNING id`,
        [user.uid, recipientDeviceId, ids],
      )
      return rows.length
    },
  }
}
