import { randomBytes } from 'node:crypto'
import { Wallet } from 'ethers'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { createPostgresNonceStore } from '../src/auth/nonceStore.js'
import { createSessionService } from '../src/auth/sessionService.js'
import { createWalletAuthService } from '../src/auth/walletAuthService.js'
import { buildDeviceKeyStatement } from '../src/keys/deviceKeyStatement.js'
import { MAX_ACTIVE_DEVICES } from '../src/keys/keyDirectoryService.js'
import { createTestDb } from './helpers/testDb.js'

const b64 = (bytes) => Buffer.from(bytes).toString('base64')
const fakePublicKey = () => b64(Buffer.concat([Buffer.from([5]), randomBytes(32)]))
const fakeSignature = () => b64(randomBytes(64))

let db
let app
let notify

beforeEach(async () => {
  db = await createTestDb()
  notify = vi.fn()
  app = createApp({
    db,
    notify,
    bundleRateLimitPerMinute: 1000,
    auth: {
      sessionService: createSessionService({ db }),
      walletAuthService: createWalletAuthService({
        nonceStore: createPostgresNonceStore(db),
        domain: 'app.cipherchain.test',
        uri: 'https://app.cipherchain.test',
        allowedChainIds: [80002],
      }),
      rateLimitPerMinute: 1000,
    },
  })
})

afterEach(() => db.end())

async function signIn(wallet = Wallet.createRandom()) {
  const { body } = await request(app).post('/api/auth/nonce').send({ address: wallet.address, chainId: 80002 })
  const signature = await wallet.signMessage(body.message)
  const session = await request(app).post('/api/auth/verify-wallet').send({ address: wallet.address, signature })
  return { wallet, auth: { Authorization: `Bearer ${session.body.sessionToken}` } }
}

async function deviceRegistration(wallet, { preKeyCount = 3, signer = wallet } = {}) {
  const identityKey = fakePublicKey()
  const registrationId = 1 + Math.floor(Math.random() * 16000)
  const identitySignature = await signer.signMessage(
    buildDeviceKeyStatement({ walletAddress: wallet.address, identityKey, registrationId }),
  )
  return {
    registrationId,
    identityKey,
    identitySignature,
    signedPreKey: { keyId: 1, publicKey: fakePublicKey(), signature: fakeSignature() },
    preKeys: Array.from({ length: preKeyCount }, (_, i) => ({ keyId: i + 1, publicKey: fakePublicKey() })),
  }
}

async function registerDevice(user, options) {
  const body = await deviceRegistration(user.wallet, options)
  const response = await request(app).post('/api/keys/devices').set(user.auth).send(body)
  return { response, body, deviceId: response.body.deviceId }
}

describe('key directory', () => {
  it('registers a wallet-signed device and assigns sequential device ids', async () => {
    const alice = await signIn()
    const first = await registerDevice(alice)
    const second = await registerDevice(alice)

    expect(first.response.status).toBe(201)
    expect(first.deviceId).toBe(1)
    expect(second.deviceId).toBe(2)
  })

  it('rejects a device key not signed by the session wallet (server cannot be tricked into storing unvouched keys)', async () => {
    const alice = await signIn()
    const { response } = await registerDevice(alice, { signer: Wallet.createRandom() })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('INVALID_DEVICE_SIGNATURE')
  })

  it('rejects malformed keys', async () => {
    const alice = await signIn()
    const body = await deviceRegistration(alice.wallet)
    body.identityKey = b64(randomBytes(32))
    const response = await request(app).post('/api/keys/devices').set(alice.auth).send(body)
    expect(response.status).toBe(400)
  })

  it(`caps active devices at ${MAX_ACTIVE_DEVICES}`, async () => {
    const alice = await signIn()
    for (let i = 0; i < MAX_ACTIVE_DEVICES; i += 1) {
      expect((await registerDevice(alice)).response.status).toBe(201)
    }
    const extra = await registerDevice(alice)
    expect(extra.response.status).toBe(409)
    expect(extra.response.body.code).toBe('TOO_MANY_DEVICES')
  })

  it('hands out each one-time prekey exactly once, then falls back to signed-prekey-only bundles', async () => {
    const alice = await signIn()
    const bob = await signIn()
    const { body } = await registerDevice(bob, { preKeyCount: 2 })

    const fetch = () => request(app).get(`/api/keys/${bob.wallet.address}/bundles`).set(alice.auth)
    const keyIds = []
    for (let i = 0; i < 3; i += 1) {
      const { body: bundles } = await fetch()
      expect(bundles.devices).toHaveLength(1)
      expect(bundles.devices[0].identityKey).toBe(body.identityKey)
      expect(bundles.devices[0].identitySignature).toBe(body.identitySignature)
      keyIds.push(bundles.devices[0].preKey?.keyId ?? null)
    }
    expect(keyIds).toEqual([1, 2, null])

    const count = await request(app).get('/api/keys/devices/1/prekeys/count').set(bob.auth)
    expect(count.body.count).toBe(0)
  })

  it('lets only the owner rotate signed prekeys, upload prekeys, or revoke a device', async () => {
    const alice = await signIn()
    const mallory = await signIn()
    await registerDevice(alice)
    const spk = { keyId: 2, publicKey: fakePublicKey(), signature: fakeSignature() }

    expect((await request(app).put('/api/keys/devices/1/signed-prekey').set(mallory.auth).send(spk)).status).toBe(404)
    expect((await request(app).delete('/api/keys/devices/1').set(mallory.auth)).status).toBe(404)
    expect((await request(app).post('/api/keys/devices/1/prekeys').set(mallory.auth).send({ preKeys: [{ keyId: 9, publicKey: fakePublicKey() }] })).status).toBe(404)

    expect((await request(app).put('/api/keys/devices/1/signed-prekey').set(alice.auth).send(spk)).status).toBe(204)
    const { body } = await request(app).get(`/api/keys/${alice.wallet.address}/devices`).set(mallory.auth)
    expect(body.devices[0].signedPreKey.keyId).toBe(2)
  })

  it('revoked devices disappear from the directory', async () => {
    const alice = await signIn()
    await registerDevice(alice)
    await registerDevice(alice)
    expect((await request(app).delete('/api/keys/devices/1').set(alice.auth)).status).toBe(204)

    const { body } = await request(app).get(`/api/keys/${alice.wallet.address}/bundles`).set(alice.auth)
    expect(body.devices.map((d) => d.deviceId)).toEqual([2])
  })

  it('requires authentication', async () => {
    expect((await request(app).get(`/api/keys/${Wallet.createRandom().address}/bundles`)).status).toBe(401)
  })
})

describe('message relay', () => {
  async function pair() {
    const alice = await signIn()
    const bob = await signIn()
    const aliceDevice = (await registerDevice(alice)).deviceId
    const bobDevice = (await registerDevice(bob)).deviceId
    return { alice, bob, aliceDevice, bobDevice }
  }

  it('stores opaque ciphertext for the recipient device, pushes it, and deletes it on ack', async () => {
    const { alice, bob, aliceDevice, bobDevice } = await pair()
    const body = b64(randomBytes(80))

    const sent = await request(app)
      .post('/api/messages')
      .set(alice.auth)
      .send({ senderDeviceId: aliceDevice, messages: [{ recipientAddress: bob.wallet.address, recipientDeviceId: bobDevice, type: 3, body }] })
    expect(sent.status).toBe(201)
    expect(notify).toHaveBeenCalledWith(bob.wallet.address.toLowerCase(), expect.objectContaining({ body, type: 3 }))

    const inbox = await request(app).get(`/api/messages/inbox?deviceId=${bobDevice}`).set(bob.auth)
    expect(inbox.body.envelopes).toHaveLength(1)
    expect(inbox.body.envelopes[0]).toMatchObject({
      senderAddress: alice.wallet.address.toLowerCase(),
      senderDeviceId: aliceDevice,
      body,
    })

    const ack = await request(app).post('/api/messages/ack').set(bob.auth).send({ deviceId: bobDevice, ids: [inbox.body.envelopes[0].id] })
    expect(ack.body.deleted).toBe(1)
    expect((await db.query('SELECT count(*)::int AS n FROM message_envelopes')).rows[0].n).toBe(0)
  })

  it('rejects sending from a device the user does not own', async () => {
    const { alice, bob, bobDevice } = await pair()
    const response = await request(app)
      .post('/api/messages')
      .set(alice.auth)
      .send({ senderDeviceId: 99, messages: [{ recipientAddress: bob.wallet.address, recipientDeviceId: bobDevice, type: 1, body: 'AAAA' }] })
    expect(response.status).toBe(404)
  })

  it('rejects unknown recipient devices atomically (no partial sends)', async () => {
    const { alice, bob, aliceDevice, bobDevice } = await pair()
    const response = await request(app)
      .post('/api/messages')
      .set(alice.auth)
      .send({
        senderDeviceId: aliceDevice,
        messages: [
          { recipientAddress: bob.wallet.address, recipientDeviceId: bobDevice, type: 1, body: 'AAAA' },
          { recipientAddress: bob.wallet.address, recipientDeviceId: 42, type: 1, body: 'AAAA' },
        ],
      })
    expect(response.status).toBe(409)
    expect((await db.query('SELECT count(*)::int AS n FROM message_envelopes')).rows[0].n).toBe(0)
    expect(notify).not.toHaveBeenCalled()
  })

  it("does not let one user read or ack another user's mail", async () => {
    const { alice, bob, aliceDevice, bobDevice } = await pair()
    await request(app)
      .post('/api/messages')
      .set(alice.auth)
      .send({ senderDeviceId: aliceDevice, messages: [{ recipientAddress: bob.wallet.address, recipientDeviceId: bobDevice, type: 1, body: 'AAAA' }] })

    // Both users own a device with id 1, so Alice asking for "device 1" must
    // return only her own (empty) inbox, never Bob's.
    expect(bobDevice).toBe(aliceDevice)
    const aliceInbox = await request(app).get(`/api/messages/inbox?deviceId=${bobDevice}`).set(alice.auth)
    expect(aliceInbox.body.envelopes).toEqual([])
    const { rows } = await db.query('SELECT id FROM message_envelopes')
    const ack = await request(app).post('/api/messages/ack').set(alice.auth).send({ deviceId: bobDevice, ids: [String(rows[0].id)] })
    expect(ack.body.deleted).toBe(0)
    expect((await db.query('SELECT count(*)::int AS n FROM message_envelopes')).rows[0].n).toBe(1)
  })

  it('rejects non-base64 bodies and unknown message types', async () => {
    const { alice, bob, aliceDevice, bobDevice } = await pair()
    const send = (message) =>
      request(app)
        .post('/api/messages')
        .set(alice.auth)
        .send({ senderDeviceId: aliceDevice, messages: [{ recipientAddress: bob.wallet.address, recipientDeviceId: bobDevice, ...message }] })

    expect((await send({ type: 1, body: 'hello plaintext!' })).status).toBe(400)
    expect((await send({ type: 2, body: 'AAAA' })).status).toBe(400)
  })
})
