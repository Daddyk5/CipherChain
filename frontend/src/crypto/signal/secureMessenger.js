import { PreKeyWhisperMessage } from '@privacyresearch/libsignal-protocol-protobuf-ts'
import { SessionBuilder, SessionCipher, SignalProtocolAddress } from '@privacyresearch/libsignal-protocol-typescript'
import { isDeviceSignedByWallet } from './deviceKeyStatement.js'
import {
  base64ToArrayBuffer,
  base64ToBinaryString,
  binaryStringToBase64,
  equalBuffers,
} from './encoding.js'

export class E2EError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const MESSAGE_TYPE = { WHISPER: 1, PREKEY: 3 }
const encoder = new TextEncoder()
const decoder = new TextDecoder()

// End-to-end encrypted messaging over the CipherChain relay (Signal X3DH +
// Double Ratchet via libsignal-protocol-typescript).
//
// Each message is encrypted separately for every active device of the
// recipient, and for this user's other devices so their history stays in sync.
// The server only ever sees base64 ciphertext envelopes.
export function createSecureMessenger({ store, api, walletAddress, deviceId }) {
  const self = walletAddress.toLowerCase()

  // Fetches a wallet's devices, drops any whose identity key isn't signed by
  // that wallet, and pins the rest as the only trusted keys for it.
  async function refreshVerifiedDevices(address, devices) {
    const listed = devices ?? (await api(`/keys/${address}/devices`)).devices
    const verified = listed.filter((device) => isDeviceSignedByWallet(address, device))
    await store.pinVerifiedDevices(
      address,
      verified.map((device) => ({ deviceId: device.deviceId, identityKey: base64ToArrayBuffer(device.identityKey) })),
    )
    return verified
  }

  async function ensureSessions(address, devices) {
    const needSession = []
    for (const device of devices) {
      const cipher = new SessionCipher(store, new SignalProtocolAddress(address, device.deviceId))
      if (!(await cipher.hasOpenSession())) {
        needSession.push(device.deviceId)
      }
    }
    if (!needSession.length) {
      return
    }

    // Bundles contain identity keys, so verify them against the wallet too.
    const { devices: bundles } = await api(`/keys/${address}/bundles`)
    const verifiedBundles = await refreshVerifiedDevices(address, bundles)
    for (const bundle of verifiedBundles.filter((b) => needSession.includes(b.deviceId))) {
      // processPreKey checks the signed-prekey signature against the identity
      // key and rejects identity keys that aren't pinned.
      await new SessionBuilder(store, new SignalProtocolAddress(address, bundle.deviceId)).processPreKey({
        identityKey: base64ToArrayBuffer(bundle.identityKey),
        registrationId: bundle.registrationId,
        signedPreKey: {
          keyId: bundle.signedPreKey.keyId,
          publicKey: base64ToArrayBuffer(bundle.signedPreKey.publicKey),
          signature: base64ToArrayBuffer(bundle.signedPreKey.signature),
        },
        preKey: bundle.preKey
          ? { keyId: bundle.preKey.keyId, publicKey: base64ToArrayBuffer(bundle.preKey.publicKey) }
          : undefined,
      })
    }
  }

  async function encryptForDevices(address, devices, plaintextBytes) {
    await ensureSessions(address, devices)
    const envelopes = []
    for (const device of devices) {
      const cipher = new SessionCipher(store, new SignalProtocolAddress(address, device.deviceId))
      const { type, body } = await cipher.encrypt(plaintextBytes.buffer)
      envelopes.push({ recipientAddress: address, recipientDeviceId: device.deviceId, type, body: binaryStringToBase64(body) })
    }
    return envelopes
  }

  // Workaround for a bug in libsignal-protocol-typescript 0.0.16: processV3
  // calls isTrustedIdentity without awaiting it, so the library never really
  // checks the sender identity on PreKeyWhisperMessages. We check it here,
  // against the exact sending device, before the library touches the message.
  async function assertPreKeyMessageIdentity(senderAddress, senderDeviceId, bodyBytes) {
    const bytes = new Uint8Array(bodyBytes)
    let identityKey
    try {
      identityKey = PreKeyWhisperMessage.decode(bytes.slice(1)).identityKey
    } catch {
      throw new E2EError('MALFORMED_MESSAGE', 'Could not parse the encrypted message.')
    }

    let pinned = (await store.getVerifiedDevices(senderAddress)).find((d) => d.deviceId === senderDeviceId)
    if (!pinned) {
      await refreshVerifiedDevices(senderAddress)
      pinned = (await store.getVerifiedDevices(senderAddress)).find((d) => d.deviceId === senderDeviceId)
    }
    if (!pinned || !identityKey || !equalBuffers(pinned.identityKey, identityKey)) {
      throw new E2EError('UNTRUSTED_IDENTITY', 'Sender identity key is not signed by their wallet. Message rejected.')
    }
  }

  return {
    deviceId,

    // Returns the request body for POST /messages.
    async encrypt(recipientAddress, payload) {
      const recipient = recipientAddress.toLowerCase()
      const plaintext = encoder.encode(JSON.stringify({ v: 1, to: recipient, ...payload }))

      const recipientDevices = await refreshVerifiedDevices(recipient)
      if (!recipientDevices.length) {
        throw new E2EError('NO_RECIPIENT_DEVICES', 'This wallet has not set up encrypted messaging yet.')
      }
      const messages = await encryptForDevices(recipient, recipientDevices, plaintext)

      if (recipient !== self) {
        const ownOtherDevices = (await refreshVerifiedDevices(self)).filter((d) => d.deviceId !== deviceId)
        messages.push(...(await encryptForDevices(self, ownOtherDevices, plaintext)))
      }
      return { senderDeviceId: deviceId, messages }
    },

    async send(recipientAddress, payload) {
      const body = await this.encrypt(recipientAddress, payload)
      return api('/messages', { method: 'POST', body: JSON.stringify(body) })
    },

    // Decrypts one envelope from the relay. Throws E2EError if it is not
    // authentic. Callers should ack an envelope only after this succeeds or
    // fails permanently.
    async decrypt(envelope) {
      const sender = envelope.senderAddress.toLowerCase()
      const address = new SignalProtocolAddress(sender, envelope.senderDeviceId)
      const cipher = new SessionCipher(store, address)
      const binary = base64ToBinaryString(envelope.body)

      let plaintextBuffer
      try {
        if (envelope.type === MESSAGE_TYPE.PREKEY) {
          await assertPreKeyMessageIdentity(sender, envelope.senderDeviceId, base64ToArrayBuffer(envelope.body))
          plaintextBuffer = await cipher.decryptPreKeyWhisperMessage(binary, 'binary')
        } else if (envelope.type === MESSAGE_TYPE.WHISPER) {
          if (!(await store.getVerifiedDevices(sender)).length) {
            await refreshVerifiedDevices(sender)
          }
          plaintextBuffer = await cipher.decryptWhisperMessage(binary, 'binary')
        } else {
          throw new E2EError('MALFORMED_MESSAGE', `Unknown message type ${envelope.type}.`)
        }
      } catch (error) {
        if (error instanceof E2EError) {
          throw error
        }
        throw new E2EError('DECRYPT_FAILED', error?.message ?? 'Decryption failed.')
      }

      const payload = JSON.parse(decoder.decode(plaintextBuffer))
      // The conversation partner: for our own sync copies it's the recipient, not us.
      const conversationWith = sender === self ? payload.to : sender
      return { id: envelope.id, sender, senderDeviceId: envelope.senderDeviceId, conversationWith, payload }
    },
  }
}
