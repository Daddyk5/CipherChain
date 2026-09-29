import { Wallet } from 'ethers'
import { IDBFactory } from 'fake-indexeddb'
import { SessionCipher, SignalProtocolAddress } from '@privacyresearch/libsignal-protocol-typescript'
import { beforeEach, describe, expect, it } from 'vitest'
import { ensureDeviceRegistered, maintainDeviceKeys, PREKEY_BATCH, SIGNED_PREKEY_MAX_AGE_MS } from './deviceKeys.js'
import { base64ToBinaryString } from './encoding.js'
import { createIndexedDbKeyValueStore, keyDatabaseName } from './keyValueStore.js'
import { createSecureMessenger } from './secureMessenger.js'
import { createSignalProtocolStore } from './signalProtocolStore.js'

// In-memory stand-in for the backend relay (same routes and semantics as
// backend/src/routes/keys.routes.js and messages.routes.js). Tests can tamper
// with it to play a malicious server.
function createFakeServer() {
  const devices = new Map() // address -> [{ deviceId, ..., preKeys: [] }]
  const inboxes = new Map() // `${address}.${deviceId}` -> envelopes
  let nextEnvelopeId = 1

  const publicDevice = ({ preKeys: _preKeys, ...device }) => ({ ...device, preKey: null })

  function apiFor(walletAddress) {
    const me = walletAddress.toLowerCase()
    return async (path, { method = 'GET', body } = {}) => {
      const input = body ? JSON.parse(body) : undefined
      let match
      if (method === 'POST' && path === '/keys/devices') {
        const list = devices.get(me) ?? []
        const deviceId = list.length + 1
        list.push({ deviceId, ...input, preKeys: [...input.preKeys] })
        devices.set(me, list)
        return { deviceId }
      }
      if ((match = path.match(/^\/keys\/(0x[0-9a-f]+)\/devices$/i))) {
        return { devices: (devices.get(match[1].toLowerCase()) ?? []).map(publicDevice) }
      }
      if ((match = path.match(/^\/keys\/(0x[0-9a-f]+)\/bundles$/i))) {
        return {
          devices: (devices.get(match[1].toLowerCase()) ?? []).map((device) => ({
            ...publicDevice(device),
            preKey: device.preKeys.shift() ?? null,
          })),
        }
      }
      if ((match = path.match(/^\/keys\/devices\/(\d+)\/prekeys\/count$/))) {
        return { count: devices.get(me).find((d) => d.deviceId === Number(match[1])).preKeys.length }
      }
      if (method === 'POST' && (match = path.match(/^\/keys\/devices\/(\d+)\/prekeys$/))) {
        devices.get(me).find((d) => d.deviceId === Number(match[1])).preKeys.push(...input.preKeys)
        return {}
      }
      if (method === 'PUT' && (match = path.match(/^\/keys\/devices\/(\d+)\/signed-prekey$/))) {
        devices.get(me).find((d) => d.deviceId === Number(match[1])).signedPreKey = input
        return {}
      }
      if (method === 'POST' && path === '/messages') {
        for (const message of input.messages) {
          const key = `${message.recipientAddress}.${message.recipientDeviceId}`
          const envelope = {
            id: String(nextEnvelopeId++),
            senderAddress: me,
            senderDeviceId: input.senderDeviceId,
            type: message.type,
            body: message.body,
          }
          inboxes.set(key, [...(inboxes.get(key) ?? []), envelope])
        }
        return { sent: input.messages.length }
      }
      throw new Error(`fake server: unhandled ${method} ${path}`)
    }
  }

  return {
    apiFor,
    devices,
    // Delivers and clears a device's inbox (like GET /messages/inbox + ack).
    drain(address, deviceId) {
      const key = `${address.toLowerCase()}.${deviceId}`
      const envelopes = inboxes.get(key) ?? []
      inboxes.set(key, [])
      return envelopes
    },
    inject(address, deviceId, envelope) {
      const key = `${address.toLowerCase()}.${deviceId}`
      inboxes.set(key, [...(inboxes.get(key) ?? []), envelope])
    },
  }
}

let indexedDB
let server

async function createDevice(wallet, { label = 'device' } = {}) {
  const kv = createIndexedDbKeyValueStore(`${keyDatabaseName(wallet.address)}-${label}`, { indexedDB })
  const store = createSignalProtocolStore(kv)
  const api = server.apiFor(wallet.address)
  const deviceId = await ensureDeviceRegistered({
    store,
    api,
    walletAddress: wallet.address,
    signStatement: (text) => wallet.signMessage(text),
  })
  const messenger = createSecureMessenger({ store, api, walletAddress: wallet.address, deviceId })
  return { wallet, kv, store, api, deviceId, messenger, address: wallet.address.toLowerCase() }
}

async function receiveAll(device) {
  const envelopes = server.drain(device.address, device.deviceId)
  const results = []
  for (const envelope of envelopes) {
    results.push(await device.messenger.decrypt(envelope))
  }
  return results
}

beforeEach(() => {
  indexedDB = new IDBFactory()
  server = createFakeServer()
})

describe('E2E round trip (X3DH + Double Ratchet)', () => {
  it('establishes a session on first message and decrypts both directions', async () => {
    const alice = await createDevice(Wallet.createRandom())
    const bob = await createDevice(Wallet.createRandom())

    const sent = await alice.messenger.encrypt(bob.address, { text: 'hello bob' })
    expect(sent.messages).toHaveLength(1)
    expect(sent.messages[0].type).toBe(3) // PreKeyWhisperMessage (X3DH)
    expect(atob(sent.messages[0].body)).not.toContain('hello bob')
    await alice.api('/messages', { method: 'POST', body: JSON.stringify(sent) })

    const [received] = await receiveAll(bob)
    expect(received.payload.text).toBe('hello bob')
    expect(received.conversationWith).toBe(alice.address)

    await bob.messenger.send(alice.address, { text: 'hi alice' })
    const [reply] = await receiveAll(alice)
    expect(reply.payload.text).toBe('hi alice')
  })

  it('advances the ratchet: every message changes session state and repeated plaintext never repeats ciphertext', async () => {
    const alice = await createDevice(Wallet.createRandom())
    const bob = await createDevice(Wallet.createRandom())
    const bobAddressForAlice = new SignalProtocolAddress(bob.address, bob.deviceId).toString()

    const sessionStates = new Set()
    const ciphertexts = new Set()
    for (let round = 0; round < 4; round += 1) {
      for (let i = 0; i < 3; i += 1) {
        const { messages } = await alice.messenger.encrypt(bob.address, { text: 'same text' })
        ciphertexts.add(messages[0].body)
        sessionStates.add(await alice.store.loadSession(bobAddressForAlice))
        await alice.api('/messages', { method: 'POST', body: JSON.stringify({ senderDeviceId: alice.deviceId, messages }) })
      }
      const received = await receiveAll(bob)
      expect(received.map((m) => m.payload.text)).toEqual(['same text', 'same text', 'same text'])

      await bob.messenger.send(alice.address, { text: `ack ${round}` })
      expect((await receiveAll(alice)).map((m) => m.payload.text)).toEqual([`ack ${round}`])
    }

    expect(ciphertexts.size).toBe(12)
    expect(sessionStates.size).toBe(12)
  })

  it('switches from PreKey messages to normal messages once the recipient has replied', async () => {
    const alice = await createDevice(Wallet.createRandom())
    const bob = await createDevice(Wallet.createRandom())

    await alice.messenger.send(bob.address, { text: '1' })
    await receiveAll(bob)
    await bob.messenger.send(alice.address, { text: '2' })
    await receiveAll(alice)

    const { messages } = await alice.messenger.encrypt(bob.address, { text: '3' })
    expect(messages[0].type).toBe(1)
  })

  it('decrypts out-of-order delivery', async () => {
    const alice = await createDevice(Wallet.createRandom())
    const bob = await createDevice(Wallet.createRandom())

    await alice.messenger.send(bob.address, { text: 'first' })
    await receiveAll(bob)
    await bob.messenger.send(alice.address, { text: 'reply' })
    await receiveAll(alice)

    for (const text of ['m1', 'm2', 'm3']) {
      await alice.messenger.send(bob.address, { text })
    }
    const envelopes = server.drain(bob.address, bob.deviceId)
    const order = [2, 0, 1].map((i) => envelopes[i])
    const texts = []
    for (const envelope of order) {
      texts.push((await bob.messenger.decrypt(envelope)).payload.text)
    }
    expect(texts).toEqual(['m3', 'm1', 'm2'])
  })

  it('rejects replayed envelopes', async () => {
    const alice = await createDevice(Wallet.createRandom())
    const bob = await createDevice(Wallet.createRandom())

    await alice.messenger.send(bob.address, { text: 'first' })
    await receiveAll(bob)
    await bob.messenger.send(alice.address, { text: 'reply' })
    await receiveAll(alice)
    await alice.messenger.send(bob.address, { text: 'once' })

    const [envelope] = server.drain(bob.address, bob.deviceId)
    expect((await bob.messenger.decrypt(envelope)).payload.text).toBe('once')
    await expect(bob.messenger.decrypt(envelope)).rejects.toMatchObject({ code: 'DECRYPT_FAILED' })
  })

  it('rejects tampered ciphertext', async () => {
    const alice = await createDevice(Wallet.createRandom())
    const bob = await createDevice(Wallet.createRandom())
    await alice.messenger.send(bob.address, { text: 'integrity' })

    const [envelope] = server.drain(bob.address, bob.deviceId)
    const bytes = Uint8Array.from(base64ToBinaryString(envelope.body), (c) => c.charCodeAt(0))
    bytes[bytes.length - 12] ^= 0x01
    const tampered = { ...envelope, body: btoa(String.fromCharCode(...bytes)) }

    await expect(bob.messenger.decrypt(tampered)).rejects.toBeInstanceOf(Error)
  })

  it('survives a reload: sessions persist in IndexedDB', async () => {
    const aliceWallet = Wallet.createRandom()
    const alice = await createDevice(aliceWallet, { label: 'laptop' })
    const bob = await createDevice(Wallet.createRandom())
    await alice.messenger.send(bob.address, { text: 'before reload' })
    await receiveAll(bob)

    // Simulate a page reload: new store/messenger objects over the same database.
    await alice.kv.close()
    const reloaded = await createDevice(aliceWallet, { label: 'laptop' })
    expect(reloaded.deviceId).toBe(alice.deviceId)

    await bob.messenger.send(alice.address, { text: 'after reload' })
    expect((await receiveAll(reloaded)).map((m) => m.payload.text)).toEqual(['after reload'])
  })
})

describe('malicious server', () => {
  it('cannot substitute a recipient identity key it controls (not signed by the wallet)', async () => {
    const alice = await createDevice(Wallet.createRandom())
    const bob = await createDevice(Wallet.createRandom())
    const mallory = await createDevice(Wallet.createRandom())

    // The server swaps in Mallory's keys under Bob's address.
    const [malloryDevice] = server.devices.get(mallory.address)
    server.devices.set(bob.address, [{ ...malloryDevice, deviceId: 1, preKeys: [...malloryDevice.preKeys] }])

    await expect(alice.messenger.encrypt(bob.address, { text: 'secret' })).rejects.toMatchObject({ code: 'NO_RECIPIENT_DEVICES' })
  })

  it('cannot inject a PreKey message pretending to be another user (library trust-check bug workaround)', async () => {
    const aliceWallet = Wallet.createRandom()
    const alice = await createDevice(aliceWallet)
    const bob = await createDevice(Wallet.createRandom())

    // The server holds keys for a fake "Alice device 2" that Alice's wallet never signed.
    const impostorWallet = Wallet.createRandom()
    const impostor = await createDevice(impostorWallet)
    const [impostorDevice] = server.devices.get(impostor.address)
    server.devices.get(alice.address).push({ ...impostorDevice, deviceId: 2 })

    const { messages } = await impostor.messenger.encrypt(bob.address, { text: 'send me your seed phrase' })
    server.inject(bob.address, bob.deviceId, {
      id: 'x', senderAddress: alice.address, senderDeviceId: 2, type: messages[0].type, body: messages[0].body,
    })

    const [forged] = server.drain(bob.address, bob.deviceId)
    await expect(bob.messenger.decrypt(forged)).rejects.toMatchObject({ code: 'UNTRUSTED_IDENTITY' })
  })

  it('documents the upstream bug: libsignal alone accepts an unpinned identity on PreKey messages', async () => {
    // If this test starts failing, upstream fixed processV3 and the workaround
    // in secureMessenger.assertPreKeyMessageIdentity could be revisited.
    const alice = await createDevice(Wallet.createRandom())
    const bob = await createDevice(Wallet.createRandom())
    await alice.messenger.send(bob.address, { text: 'hi' })
    const [envelope] = server.drain(bob.address, bob.deviceId)

    // Bob has pinned nothing for Alice, so a correct library would reject this.
    await bob.store.pinVerifiedDevices(alice.address, [])
    const cipher = new SessionCipher(bob.store, new SignalProtocolAddress(alice.address, alice.deviceId))
    const plaintext = await cipher.decryptPreKeyWhisperMessage(base64ToBinaryString(envelope.body), 'binary')
    expect(new TextDecoder().decode(plaintext)).toContain('hi')
  })

  it('rejects a normal message after the sending device was revoked (key unpinned)', async () => {
    const alice = await createDevice(Wallet.createRandom())
    const bob = await createDevice(Wallet.createRandom())
    await alice.messenger.send(bob.address, { text: 'first' })
    await receiveAll(bob)
    await bob.messenger.send(alice.address, { text: 'reply' })
    await receiveAll(alice)
    await alice.messenger.send(bob.address, { text: 'after revoke' })

    await bob.store.pinVerifiedDevices(alice.address, [])
    server.devices.set(alice.address, [])
    const [envelope] = server.drain(bob.address, bob.deviceId)
    await expect(bob.messenger.decrypt(envelope)).rejects.toMatchObject({ code: 'DECRYPT_FAILED' })
  })
})

describe('multi-device', () => {
  it('delivers to every recipient device and syncs a copy to the sender’s other devices', async () => {
    const aliceWallet = Wallet.createRandom()
    const bobWallet = Wallet.createRandom()
    const aliceLaptop = await createDevice(aliceWallet, { label: 'laptop' })
    const alicePhone = await createDevice(aliceWallet, { label: 'phone' })
    const bobPhone = await createDevice(bobWallet, { label: 'phone' })
    const bobTablet = await createDevice(bobWallet, { label: 'tablet' })

    const { messages } = await aliceLaptop.messenger.encrypt(bobPhone.address, { text: 'to all of bob' })
    expect(messages.map((m) => `${m.recipientAddress === aliceLaptop.address ? 'alice' : 'bob'}:${m.recipientDeviceId}`).sort())
      .toEqual(['alice:2', 'bob:1', 'bob:2'])
    await aliceLaptop.api('/messages', { method: 'POST', body: JSON.stringify({ senderDeviceId: aliceLaptop.deviceId, messages }) })

    expect((await receiveAll(bobPhone))[0].payload.text).toBe('to all of bob')
    expect((await receiveAll(bobTablet))[0].payload.text).toBe('to all of bob')
    const [synced] = await receiveAll(alicePhone)
    expect(synced.payload.text).toBe('to all of bob')
    expect(synced.conversationWith).toBe(bobPhone.address)
  })
})

describe('device key lifecycle', () => {
  it('registration is crash-safe: a failed upload is retried with the same identity key', async () => {
    const wallet = Wallet.createRandom()
    const store = createSignalProtocolStore(createIndexedDbKeyValueStore('crash-test', { indexedDB }))
    const realApi = server.apiFor(wallet.address)
    let failures = 1
    const flakyApi = async (...args) => {
      if (failures-- > 0) throw new Error('network down')
      return realApi(...args)
    }
    const signStatement = (text) => wallet.signMessage(text)

    await expect(ensureDeviceRegistered({ store, api: flakyApi, walletAddress: wallet.address, signStatement })).rejects.toThrow('network down')
    const identityBefore = await store.getIdentityKeyPair()
    const deviceId = await ensureDeviceRegistered({ store, api: flakyApi, walletAddress: wallet.address, signStatement })

    expect(deviceId).toBe(1)
    expect(await store.getIdentityKeyPair()).toEqual(identityBefore)
  })

  it('never uploads private keys', async () => {
    const wallet = Wallet.createRandom()
    const uploads = []
    const store = createSignalProtocolStore(createIndexedDbKeyValueStore('upload-test', { indexedDB }))
    const api = server.apiFor(wallet.address)
    await ensureDeviceRegistered({
      store,
      api: (path, options) => {
        uploads.push(options?.body ?? '')
        return api(path, options)
      },
      walletAddress: wallet.address,
      signStatement: (text) => wallet.signMessage(text),
    })

    const identity = await store.getIdentityKeyPair()
    const privateB64 = btoa(String.fromCharCode(...new Uint8Array(identity.privKey)))
    expect(uploads.join('')).not.toContain(privateB64)
    expect(uploads.join('')).not.toMatch(/privKey/i)
  })

  it('replenishes one-time prekeys and rotates the signed prekey when due', async () => {
    const alice = await createDevice(Wallet.createRandom())
    const bob = await createDevice(Wallet.createRandom())
    const [bobServerDevice] = server.devices.get(bob.address)
    bobServerDevice.preKeys.splice(0, PREKEY_BATCH - 5)
    const originalSignedPreKey = bobServerDevice.signedPreKey

    await maintainDeviceKeys({ store: bob.store, api: bob.api, now: Date.now() + SIGNED_PREKEY_MAX_AGE_MS })

    expect(bobServerDevice.preKeys).toHaveLength(PREKEY_BATCH)
    expect(new Set(bobServerDevice.preKeys.map((k) => k.keyId)).size).toBe(PREKEY_BATCH)
    expect(bobServerDevice.signedPreKey.keyId).not.toBe(originalSignedPreKey.keyId)

    // New sessions against the rotated keys still work end to end.
    await alice.messenger.send(bob.address, { text: 'after rotation' })
    expect((await receiveAll(bob))[0].payload.text).toBe('after rotation')
  })
})
