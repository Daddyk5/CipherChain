import { KeyHelper } from '@privacyresearch/libsignal-protocol-typescript'
import { buildDeviceKeyStatement } from './deviceKeyStatement.js'
import { arrayBufferToBase64 } from './encoding.js'

export const PREKEY_BATCH = 100
export const PREKEY_LOW_WATERMARK = 20
export const SIGNED_PREKEY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

async function generatePreKeys(store, count) {
  const firstId = (await store.getMeta('nextPreKeyId')) ?? 1
  const preKeys = []
  for (let i = 0; i < count; i += 1) {
    // Key ids wrap within the 24-bit space the server accepts.
    const keyId = ((firstId - 1 + i) % 0xfffffe) + 1
    const preKey = await KeyHelper.generatePreKey(keyId)
    await store.storePreKey(keyId, preKey.keyPair)
    preKeys.push({ keyId, publicKey: arrayBufferToBase64(preKey.keyPair.pubKey) })
  }
  await store.setMeta('nextPreKeyId', ((firstId - 1 + count) % 0xfffffe) + 1)
  return preKeys
}

async function generateSignedPreKey(store, identityKeyPair, now) {
  const keyId = (await store.getMeta('nextSignedPreKeyId')) ?? 1
  const signed = await KeyHelper.generateSignedPreKey(identityKeyPair, keyId)
  await store.storeSignedPreKey(keyId, signed.keyPair)
  await store.setMeta('nextSignedPreKeyId', (keyId % 0xfffffe) + 1)

  // Keep the previous signed prekey for one rotation period so that session
  // setups started against it can still complete. Delete anything older.
  const previous = await store.getMeta('signedPreKey')
  const older = await store.getMeta('previousSignedPreKeyId')
  if (older) {
    await store.removeSignedPreKey(older)
  }
  await store.setMeta('previousSignedPreKeyId', previous?.keyId ?? null)
  await store.setMeta('signedPreKey', { keyId, createdAt: now })

  return {
    keyId,
    publicKey: arrayBufferToBase64(signed.keyPair.pubKey),
    signature: arrayBufferToBase64(signed.signature),
  }
}

// Creates this device's keys (if needed) and registers them with the backend.
// `signStatement(text)` asks the wallet to sign. It is only called when the
// device registers for the first time.
//
// Idempotent and crash-safe: keys are persisted before the network call, and a
// retry reuses them instead of generating new ones.
export async function ensureDeviceRegistered({ store, api, walletAddress, signStatement, now = Date.now() }) {
  const existingDeviceId = await store.getDeviceId()
  if (existingDeviceId) {
    return existingDeviceId
  }

  let identityKeyPair = await store.getIdentityKeyPair()
  if (!identityKeyPair) {
    identityKeyPair = await KeyHelper.generateIdentityKeyPair()
    await store.setIdentity(identityKeyPair, KeyHelper.generateRegistrationId())
  }
  const registrationId = await store.getLocalRegistrationId()
  const identityKey = arrayBufferToBase64(identityKeyPair.pubKey)

  const signedPreKey = await generateSignedPreKey(store, identityKeyPair, now)
  const preKeys = await generatePreKeys(store, PREKEY_BATCH)
  const identitySignature = await signStatement(buildDeviceKeyStatement({ walletAddress, identityKey, registrationId }))

  const { deviceId } = await api('/keys/devices', {
    method: 'POST',
    body: JSON.stringify({ registrationId, identityKey, identitySignature, signedPreKey, preKeys }),
  })
  await store.setDeviceId(deviceId)
  return deviceId
}

// Routine maintenance: top up one-time prekeys and rotate the signed prekey.
// Call on app start and periodically.
export async function maintainDeviceKeys({ store, api, now = Date.now() }) {
  const deviceId = await store.getDeviceId()
  if (!deviceId) {
    return
  }

  const { count } = await api(`/keys/devices/${deviceId}/prekeys/count`)
  if (count < PREKEY_LOW_WATERMARK) {
    const preKeys = await generatePreKeys(store, PREKEY_BATCH - count)
    await api(`/keys/devices/${deviceId}/prekeys`, { method: 'POST', body: JSON.stringify({ preKeys }) })
  }

  const current = await store.getMeta('signedPreKey')
  if (!current || now - current.createdAt >= SIGNED_PREKEY_MAX_AGE_MS) {
    const signedPreKey = await generateSignedPreKey(store, await store.getIdentityKeyPair(), now)
    await api(`/keys/devices/${deviceId}/signed-prekey`, { method: 'PUT', body: JSON.stringify(signedPreKey) })
  }
}
