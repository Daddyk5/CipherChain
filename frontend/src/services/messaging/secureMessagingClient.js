import { io } from 'socket.io-client'
import { ensureDeviceRegistered, maintainDeviceKeys } from '../../crypto/signal/deviceKeys.js'
import { createIndexedDbKeyValueStore, keyDatabaseName } from '../../crypto/signal/keyValueStore.js'
import { createSecureMessenger } from '../../crypto/signal/secureMessenger.js'
import { createSignalProtocolStore } from '../../crypto/signal/signalProtocolStore.js'

const MAX_HISTORY_PER_CONVERSATION = 1000

// Connects this browser as a CipherChain device. It sets up keys, pulls queued
// ciphertext, decrypts locally, and keeps the history on this device only.
// The server deletes each envelope once we ack it.
//
// Decrypted history lives in this origin's IndexedDB, in plaintext. That is
// within the threat model: a compromised device is out of scope.
export async function startSecureMessaging({ walletAddress, api, sessionToken, signStatement, socketUrl, onMessage, onError }) {
  const kv = createIndexedDbKeyValueStore(keyDatabaseName(walletAddress))
  const store = createSignalProtocolStore(kv)
  const deviceId = await ensureDeviceRegistered({ store, api, walletAddress, signStatement })
  await maintainDeviceKeys({ store, api }).catch((error) => onError?.(error))
  const messenger = createSecureMessenger({ store, api, walletAddress, deviceId })
  const self = walletAddress.toLowerCase()

  async function appendHistory(conversationWith, message) {
    const key = `history:${conversationWith}`
    const history = (await kv.get(key)) ?? []
    history.push(message)
    await kv.set(key, history.slice(-MAX_HISTORY_PER_CONVERSATION))
  }

  // Serialize inbox processing: ratchet state must advance one message at a time.
  let draining = Promise.resolve()
  function drainInbox() {
    draining = draining.then(async () => {
      const { envelopes } = await api(`/messages/inbox?deviceId=${deviceId}`)
      const processed = []
      for (const envelope of envelopes) {
        try {
          const decrypted = await messenger.decrypt(envelope)
          const message = {
            id: `${decrypted.sender}:${envelope.id}`,
            from: decrypted.sender,
            conversationWith: decrypted.conversationWith,
            text: String(decrypted.payload.text ?? ''),
            sentAt: decrypted.payload.sentAt ?? envelope.createdAt,
          }
          await appendHistory(message.conversationWith, message)
          onMessage?.(message)
        } catch (error) {
          // Unauthentic or undecryptable envelopes can never succeed, so drop
          // them (ack) and report. Nothing is shown to the user as a message.
          onError?.(error)
        }
        processed.push(envelope.id)
      }
      if (processed.length) {
        await api('/messages/ack', { method: 'POST', body: JSON.stringify({ deviceId, ids: processed }) })
      }
    }).catch((error) => onError?.(error))
    return draining
  }

  const socket = io(socketUrl, { auth: { token: sessionToken } })
  socket.on('message:new', (envelope) => {
    if (envelope.recipientDeviceId === deviceId) {
      drainInbox()
    }
  })
  socket.on('connect', () => drainInbox())

  return {
    deviceId,
    async send(recipientAddress, text) {
      const sentAt = new Date().toISOString()
      const result = await messenger.send(recipientAddress, { text, sentAt })
      const conversationWith = recipientAddress.toLowerCase()
      const message = { id: `${self}:local:${result.sent?.[0]?.id ?? sentAt}`, from: self, conversationWith, text, sentAt }
      await appendHistory(conversationWith, message)
      onMessage?.(message)
      return message
    },
    loadHistory: async (conversationWith) => (await kv.get(`history:${conversationWith.toLowerCase()}`)) ?? [],
    drainInbox,
    stop() {
      socket.disconnect()
      kv.close()
    },
  }
}
