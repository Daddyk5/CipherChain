import { Wallet } from 'ethers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryNonceStore, createPostgresNonceStore } from '../src/auth/nonceStore.js'
import { createTestDb } from './helpers/testDb.js'
import { createWalletAuthService } from '../src/auth/walletAuthService.js'

const TTL_MS = 5 * 60 * 1000

const STORES = [
  ['memory', async () => ({ nonceStore: createMemoryNonceStore(), close: async () => {} })],
  ['postgres', async () => {
    const db = await createTestDb()
    return { nonceStore: createPostgresNonceStore(db), close: () => db.end() }
  }],
]

async function setup(createStore) {
  // The Postgres store prunes rows by the DB clock, so keep the fake clock near real time.
  const clock = { now: Date.now() }
  const { nonceStore, close } = await createStore()
  const service = createWalletAuthService({
    nonceStore,
    domain: 'app.cipherchain.test',
    uri: 'https://app.cipherchain.test',
    allowedChainIds: [80002],
    ttlMs: TTL_MS,
    now: () => clock.now,
  })
  return { clock, nonceStore, service, close }
}

async function expectAuthError(promise, code) {
  await expect(promise).rejects.toMatchObject({ code })
}

describe.each(STORES)('walletAuthService (%s nonce store)', (_name, createStore) => {
  let ctx
  let wallet

  beforeEach(async () => {
    ctx = await setup(createStore)
    wallet = Wallet.createRandom()
  })

  afterEach(() => ctx.close())

  describe('issueChallenge', () => {
    it('returns an EIP-4361 message bound to the address, chain, domain and nonce', async () => {
      const { message, nonce, expiresAt } = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })

      expect(nonce).toMatch(/^[0-9a-f]{32}$/)
      expect(message.split('\n')[0]).toBe('app.cipherchain.test wants you to sign in with your Ethereum account:')
      expect(message).toContain(`\n${wallet.address}\n`)
      expect(message).toContain('Chain ID: 80002')
      expect(message).toContain(`Nonce: ${nonce}`)
      expect(message).toContain(`Issued At: ${new Date(ctx.clock.now).toISOString()}`)
      expect(message).toContain(`Expiration Time: ${new Date(ctx.clock.now + TTL_MS).toISOString()}`)
      expect(expiresAt).toBe(ctx.clock.now + TTL_MS)
    })

    it('generates a unique nonce per request', async () => {
      const nonces = new Set()
      for (let i = 0; i < 50; i += 1) {
        const { nonce } = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })
        nonces.add(nonce)
      }
      expect(nonces.size).toBe(50)
    })

    it('stores challenges keyed by lowercase address and replaces the previous one', async () => {
      await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })
      const second = await ctx.service.issueChallenge({ address: wallet.address.toLowerCase(), chainId: 80002 })

      expect((await ctx.nonceStore.get(wallet.address.toLowerCase())).nonce).toBe(second.nonce)
    })

    it('rejects invalid addresses', async () => {
      await expectAuthError(ctx.service.issueChallenge({ address: '0x123', chainId: 80002 }), 'INVALID_ADDRESS')
      await expectAuthError(ctx.service.issueChallenge({ address: undefined, chainId: 80002 }), 'INVALID_ADDRESS')
    })

    it('rejects unsupported chains (wrong network selected)', async () => {
      await expectAuthError(ctx.service.issueChallenge({ address: wallet.address, chainId: 1 }), 'UNSUPPORTED_CHAIN')
    })
  })

  describe('verifyChallenge', () => {
    it('accepts a valid signature and returns the checksummed address', async () => {
      const { message } = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })
      const signature = await wallet.signMessage(message)

      await expect(
        ctx.service.verifyChallenge({ address: wallet.address.toLowerCase(), signature }),
      ).resolves.toBe(wallet.address)
    })

    it('makes nonces single-use (replaying a valid signature fails)', async () => {
      const { message } = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })
      const signature = await wallet.signMessage(message)

      await ctx.service.verifyChallenge({ address: wallet.address, signature })
      await expectAuthError(ctx.service.verifyChallenge({ address: wallet.address, signature }), 'NONCE_NOT_FOUND')
    })

    it('allows only one of several concurrent verifications to succeed', async () => {
      const { message } = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })
      const signature = await wallet.signMessage(message)

      const results = await Promise.allSettled([
        ctx.service.verifyChallenge({ address: wallet.address, signature }),
        ctx.service.verifyChallenge({ address: wallet.address, signature }),
        ctx.service.verifyChallenge({ address: wallet.address, signature }),
      ])
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    })

    it('rejects an expired nonce and removes it', async () => {
      const { message } = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })
      const signature = await wallet.signMessage(message)

      ctx.clock.now += TTL_MS
      await expectAuthError(ctx.service.verifyChallenge({ address: wallet.address, signature }), 'NONCE_EXPIRED')
      expect(await ctx.nonceStore.get(wallet.address.toLowerCase())).toBeNull()
    })

    it('accepts a signature just before expiry', async () => {
      const { message } = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })
      const signature = await wallet.signMessage(message)

      ctx.clock.now += TTL_MS - 1
      await expect(ctx.service.verifyChallenge({ address: wallet.address, signature })).resolves.toBe(wallet.address)
    })

    it('rejects when no nonce was issued', async () => {
      const signature = await wallet.signMessage('anything')
      await expectAuthError(ctx.service.verifyChallenge({ address: wallet.address, signature }), 'NONCE_NOT_FOUND')
    })

    it('rejects a signature from a different wallet claiming the address', async () => {
      const attacker = Wallet.createRandom()
      const { message } = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })
      const forged = await attacker.signMessage(message)

      await expectAuthError(ctx.service.verifyChallenge({ address: wallet.address, signature: forged }), 'SIGNATURE_MISMATCH')
    })

    it('does not burn the nonce on a mismatched signature (no login-cancellation DoS)', async () => {
      const attacker = Wallet.createRandom()
      const { message } = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })

      await expectAuthError(
        ctx.service.verifyChallenge({ address: wallet.address, signature: await attacker.signMessage(message) }),
        'SIGNATURE_MISMATCH',
      )
      await expect(
        ctx.service.verifyChallenge({ address: wallet.address, signature: await wallet.signMessage(message) }),
      ).resolves.toBe(wallet.address)
    })

    it('rejects a signature over a different message (e.g. an older nonce)', async () => {
      const first = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })
      const staleSignature = await wallet.signMessage(first.message)
      await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })

      await expectAuthError(
        ctx.service.verifyChallenge({ address: wallet.address, signature: staleSignature }),
        'SIGNATURE_MISMATCH',
      )
    })

    it('rejects a nonce issued for one address when used by another', async () => {
      const other = Wallet.createRandom()
      const { message } = await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })
      const signature = await other.signMessage(message)

      await expectAuthError(ctx.service.verifyChallenge({ address: other.address, signature }), 'NONCE_NOT_FOUND')
    })

    it('rejects malformed signatures', async () => {
      await ctx.service.issueChallenge({ address: wallet.address, chainId: 80002 })

      await expectAuthError(ctx.service.verifyChallenge({ address: wallet.address, signature: 'not-hex' }), 'INVALID_SIGNATURE')
      await expectAuthError(ctx.service.verifyChallenge({ address: wallet.address, signature: '0xdeadbeef' }), 'INVALID_SIGNATURE')
      await expectAuthError(ctx.service.verifyChallenge({ address: wallet.address, signature: undefined }), 'INVALID_SIGNATURE')
    })
  })
})

describe('createMemoryNonceStore', () => {
  it('consume is atomic and nonce-specific', async () => {
    const store = createMemoryNonceStore()
    await store.put('0xabc', { nonce: 'n1', message: 'm', expiresAt: 10 })

    expect(await store.consume('0xabc', 'wrong')).toBe(false)
    expect(await store.consume('0xabc', 'n1')).toBe(true)
    expect(await store.consume('0xabc', 'n1')).toBe(false)
  })

  it('sweep drops expired challenges only', async () => {
    const store = createMemoryNonceStore()
    await store.put('0xa', { nonce: 'a', message: 'm', expiresAt: 100 })
    await store.put('0xb', { nonce: 'b', message: 'm', expiresAt: 300 })

    store.sweep(200)
    expect(await store.get('0xa')).toBeNull()
    expect(await store.get('0xb')).not.toBeNull()
  })
})
