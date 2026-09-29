import { randomBytes as nodeRandomBytes } from 'node:crypto'
import { getAddress, isAddress, verifyMessage } from 'ethers'
import { buildSiweMessage } from './siweMessage.js'

export class AuthError extends Error {
  constructor(code, message, statusCode = 401) {
    super(message)
    this.code = code
    this.statusCode = statusCode
  }
}

const DEFAULT_STATEMENT = 'Sign in to CipherChain. This request will not trigger a blockchain transaction or cost any gas.'

export function normalizeAddress(address) {
  if (typeof address !== 'string' || !isAddress(address)) {
    throw new AuthError('INVALID_ADDRESS', 'A valid wallet address is required.', 400)
  }
  return getAddress(address)
}

export function createWalletAuthService({
  nonceStore,
  domain,
  uri,
  allowedChainIds,
  ttlMs = 5 * 60 * 1000,
  statement = DEFAULT_STATEMENT,
  now = () => Date.now(),
  randomBytes = nodeRandomBytes,
}) {
  if (!domain || !uri) {
    throw new Error('Wallet auth requires a SIWE domain and uri.')
  }
  if (!allowedChainIds?.length) {
    throw new Error('Wallet auth requires at least one allowed chain id.')
  }

  return {
    async issueChallenge({ address, chainId }) {
      const checksumAddress = normalizeAddress(address)
      const numericChainId = Number(chainId)

      if (!allowedChainIds.includes(numericChainId)) {
        throw new AuthError(
          'UNSUPPORTED_CHAIN',
          `Chain ${chainId} is not supported. Switch to chain ${allowedChainIds[0]}.`,
          400,
        )
      }

      const issuedAtMs = now()
      const expiresAt = issuedAtMs + ttlMs
      const nonce = randomBytes(16).toString('hex')
      const message = buildSiweMessage({
        domain,
        address: checksumAddress,
        statement,
        uri,
        chainId: numericChainId,
        nonce,
        issuedAt: new Date(issuedAtMs).toISOString(),
        expirationTime: new Date(expiresAt).toISOString(),
      })

      await nonceStore.put(checksumAddress.toLowerCase(), { nonce, message, expiresAt })

      return { nonce, message, expiresAt }
    },

    // Resolves to the checksummed wallet address, or throws AuthError.
    async verifyChallenge({ address, signature }) {
      const checksumAddress = normalizeAddress(address)
      const key = checksumAddress.toLowerCase()

      if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]+$/.test(signature)) {
        throw new AuthError('INVALID_SIGNATURE', 'Signature is malformed.', 400)
      }

      const challenge = await nonceStore.get(key)
      if (!challenge) {
        throw new AuthError('NONCE_NOT_FOUND', 'No active sign-in request. Request a new nonce.')
      }
      if (now() >= challenge.expiresAt) {
        await nonceStore.consume(key, challenge.nonce)
        throw new AuthError('NONCE_EXPIRED', 'Sign-in request expired. Request a new nonce.')
      }

      let recovered
      try {
        recovered = verifyMessage(challenge.message, signature)
      } catch {
        throw new AuthError('INVALID_SIGNATURE', 'Signature could not be verified.', 400)
      }

      // A failed signature does not burn the nonce. Forging a valid signature is
      // infeasible, and burning it would let anyone who knows an address
      // cancel that user's login.
      if (recovered.toLowerCase() !== key) {
        throw new AuthError('SIGNATURE_MISMATCH', 'Signature does not match the wallet address.')
      }

      // Single use: of any concurrent verifications, only one can consume the nonce.
      const consumed = await nonceStore.consume(key, challenge.nonce)
      if (!consumed) {
        throw new AuthError('NONCE_NOT_FOUND', 'Sign-in request was already used. Request a new nonce.')
      }

      return checksumAddress
    },
  }
}
