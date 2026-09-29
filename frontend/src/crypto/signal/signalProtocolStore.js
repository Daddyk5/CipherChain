import { equalBuffers } from './encoding.js'

// libsignal StorageType backed by a key-value store (IndexedDB in the app).
// Private keys never leave this store. They are not sent to the backend.
//
// Trust model: an identity key is trusted only if it was pinned from the
// wallet-verified device directory (see deviceKeyStatement.js). There is no
// trust-on-first-use. An unknown key is rejected, so a server-substituted key
// fails even on the very first message.
export function createSignalProtocolStore(kv) {
  const store = {
    // --- libsignal StorageType ---
    getIdentityKeyPair: () => kv.get('identityKey'),
    getLocalRegistrationId: () => kv.get('registrationId'),

    // `identifier` is the wallet address (libsignal passes the address name,
    // without the device id). The key must match one of that wallet's verified devices.
    async isTrustedIdentity(identifier, identityKey) {
      const pinned = (await kv.get(`verified:${identifier}`)) ?? []
      return pinned.some((device) => equalBuffers(device.identityKey, identityKey))
    },
    // libsignal calls this after a successful trust check. The pinned directory
    // stays the source of truth, so this only records the last-seen key.
    async saveIdentity(encodedAddress, publicKey) {
      await kv.set(`seen:${encodedAddress}`, publicKey)
      return false
    },

    loadPreKey: (keyId) => kv.get(`preKey:${keyId}`),
    storePreKey: (keyId, keyPair) => kv.set(`preKey:${keyId}`, keyPair),
    removePreKey: (keyId) => kv.delete(`preKey:${keyId}`),

    loadSignedPreKey: (keyId) => kv.get(`signedPreKey:${keyId}`),
    storeSignedPreKey: (keyId, keyPair) => kv.set(`signedPreKey:${keyId}`, keyPair),
    removeSignedPreKey: (keyId) => kv.delete(`signedPreKey:${keyId}`),

    loadSession: (encodedAddress) => kv.get(`session:${encodedAddress}`),
    storeSession: (encodedAddress, record) => kv.set(`session:${encodedAddress}`, record),

    // --- CipherChain extensions ---
    setIdentity: async (identityKeyPair, registrationId) => {
      await kv.set('identityKey', identityKeyPair)
      await kv.set('registrationId', registrationId)
    },
    getDeviceId: () => kv.get('deviceId'),
    setDeviceId: (deviceId) => kv.set('deviceId', deviceId),
    getMeta: (key) => kv.get(`meta:${key}`),
    setMeta: (key, value) => kv.set(`meta:${key}`, value),

    // Replaces the pinned, wallet-verified devices for a wallet.
    // devices: [{ deviceId, identityKey: ArrayBuffer }]
    pinVerifiedDevices: (walletAddress, devices) => kv.set(`verified:${walletAddress.toLowerCase()}`, devices),
    getVerifiedDevices: async (walletAddress) => (await kv.get(`verified:${walletAddress.toLowerCase()}`)) ?? [],
  }
  return store
}
