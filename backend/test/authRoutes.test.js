import { Wallet } from 'ethers'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createPostgresNonceStore } from '../src/auth/nonceStore.js'
import { createSessionService } from '../src/auth/sessionService.js'
import { createWalletAuthService } from '../src/auth/walletAuthService.js'
import { createTestDb } from './helpers/testDb.js'

let db

async function buildApp({ rateLimitPerMinute = 1000, adminAddresses = [] } = {}) {
  const sessionService = createSessionService({ db, adminAddresses })
  const walletAuthService = createWalletAuthService({
    nonceStore: createPostgresNonceStore(db),
    domain: 'app.cipherchain.test',
    uri: 'https://app.cipherchain.test',
    allowedChainIds: [80002],
  })
  return createApp({ db, auth: { walletAuthService, sessionService, rateLimitPerMinute } })
}

async function signIn(app, wallet) {
  const { body } = await request(app).post('/api/auth/nonce').send({ address: wallet.address, chainId: 80002 })
  const signature = await wallet.signMessage(body.message)
  return request(app).post('/api/auth/verify-wallet').send({ address: wallet.address, signature })
}

beforeEach(async () => {
  db = await createTestDb()
})

afterEach(() => db.end())

describe('wallet sign-in over HTTP', () => {
  it('completes nonce -> sign -> verify, creates the user, and issues a working session', async () => {
    const app = await buildApp()
    const wallet = Wallet.createRandom()

    const response = await signIn(app, wallet)
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ walletAddress: wallet.address, isAdmin: false })
    expect(response.body.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/)

    const { rows } = await db.query('SELECT checksum_address FROM users WHERE wallet_address = $1', [wallet.address.toLowerCase()])
    expect(rows).toEqual([{ checksum_address: wallet.address }])

    const session = await request(app).get('/api/auth/session').set('Authorization', `Bearer ${response.body.sessionToken}`)
    expect(session.status).toBe(200)
    expect(session.body.walletAddress).toBe(wallet.address)
  })

  it('never exposes the raw nonce and stores only a hash of the session token', async () => {
    const app = await buildApp()
    const wallet = Wallet.createRandom()

    const nonceResponse = await request(app).post('/api/auth/nonce').send({ address: wallet.address, chainId: 80002 })
    expect(nonceResponse.body.nonce).toBeUndefined()

    const signature = await wallet.signMessage(nonceResponse.body.message)
    const { body } = await request(app).post('/api/auth/verify-wallet').send({ address: wallet.address, signature })
    const { rows } = await db.query("SELECT encode(token_hash, 'hex') AS h FROM sessions")
    expect(rows).toHaveLength(1)
    expect(rows[0].h).not.toContain(Buffer.from(body.sessionToken).toString('hex'))
  })

  it('returns 400 UNSUPPORTED_CHAIN for the wrong network', async () => {
    const app = await buildApp()
    const response = await request(app).post('/api/auth/nonce').send({ address: Wallet.createRandom().address, chainId: 1 })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('UNSUPPORTED_CHAIN')
  })

  it('returns 400 for a malformed body', async () => {
    const app = await buildApp()
    const response = await request(app).post('/api/auth/verify-wallet').send({ address: Wallet.createRandom().address })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('INVALID_REQUEST')
  })

  it('returns 401 and creates no user or session for a forged signature', async () => {
    const app = await buildApp()
    const wallet = Wallet.createRandom()
    const { body } = await request(app).post('/api/auth/nonce').send({ address: wallet.address, chainId: 80002 })
    const forged = await Wallet.createRandom().signMessage(body.message)

    const response = await request(app).post('/api/auth/verify-wallet').send({ address: wallet.address, signature: forged })
    expect(response.status).toBe(401)
    expect(response.body.code).toBe('SIGNATURE_MISMATCH')
    expect((await db.query('SELECT count(*)::int AS n FROM sessions')).rows[0].n).toBe(0)
    expect((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n).toBe(0)
  })

  it('rate-limits the sign-in endpoints', async () => {
    const app = await buildApp({ rateLimitPerMinute: 2 })
    const send = () => request(app).post('/api/auth/nonce').send({ address: Wallet.createRandom().address, chainId: 80002 })

    await send()
    await send()
    expect((await send()).status).toBe(429)
  })
})

describe('sessions', () => {
  it('rejects missing, unknown and revoked tokens', async () => {
    const app = await buildApp()
    const { body } = await signIn(app, Wallet.createRandom())
    const auth = { Authorization: `Bearer ${body.sessionToken}` }

    expect((await request(app).get('/api/auth/session')).status).toBe(401)
    expect((await request(app).get('/api/auth/session').set('Authorization', 'Bearer nope')).status).toBe(401)

    expect((await request(app).post('/api/auth/logout').set(auth)).status).toBe(204)
    expect((await request(app).get('/api/auth/session').set(auth)).status).toBe(401)
  })

  it('rejects expired sessions', async () => {
    const app = await buildApp()
    const { body } = await signIn(app, Wallet.createRandom())
    await db.query("UPDATE sessions SET expires_at = now() - interval '1 second'")

    const response = await request(app).get('/api/auth/session').set('Authorization', `Bearer ${body.sessionToken}`)
    expect(response.status).toBe(401)
  })
})

describe('authorization', () => {
  it('ignores the legacy x-wallet-address header and requires an admin session', async () => {
    const admin = Wallet.createRandom()
    const app = await buildApp({ adminAddresses: [admin.address.toLowerCase()] })
    const user = await signIn(app, Wallet.createRandom())

    const spoofed = await request(app)
      .get('/api/admin/status')
      .set('Authorization', `Bearer ${user.body.sessionToken}`)
      .set('x-wallet-address', admin.address)
    expect(spoofed.status).toBe(403)

    const adminSession = await signIn(app, admin)
    expect(adminSession.body.isAdmin).toBe(true)
    const allowed = await request(app).get('/api/admin/status').set('Authorization', `Bearer ${adminSession.body.sessionToken}`)
    expect(allowed.status).toBe(200)
    expect(allowed.body.database).toBe('ok')
  })

  it('lets users edit only their own profile, and only whitelisted fields', async () => {
    const app = await buildApp()
    const alice = Wallet.createRandom()
    const bob = Wallet.createRandom()
    const aliceToken = (await signIn(app, alice)).body.sessionToken
    await signIn(app, bob)
    const auth = { Authorization: `Bearer ${aliceToken}` }

    const own = await request(app).patch(`/api/users/${alice.address}`).set(auth).send({ displayName: 'Alice' })
    expect(own.status).toBe(200)
    expect(own.body.displayName).toBe('Alice')

    expect((await request(app).patch(`/api/users/${bob.address}`).set(auth).send({ displayName: 'pwned' })).status).toBe(403)
    expect((await request(app).patch(`/api/users/${alice.address}`).set(auth).send({ walletAddress: bob.address })).status).toBe(400)

    const bobProfile = await request(app).get(`/api/users/${bob.address}`).set(auth)
    expect(bobProfile.body.displayName).toBeNull()
  })
})
