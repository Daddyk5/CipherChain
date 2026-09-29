import { getBytes, verifyMessage, Wallet } from 'ethers'
import { describe, expect, it, vi } from 'vitest'
import { ensureChain, getInjectedProvider, requestAccount } from '../blockchain/walletService.js'
import { authenticateWallet } from './walletAuth.js'

// Minimal EIP-1193 provider backed by a real key, with injectable failures.
function fakeEthereum({ wallet = Wallet.createRandom(), chainId = 80002, fail = {} } = {}) {
  const state = { chainId }
  const reject = (code) => Object.assign(new Error(`rejected ${code}`), { code })
  const request = vi.fn(async ({ method, params }) => {
    if (fail[method]) throw reject(fail[method])
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return [wallet.address.toLowerCase()]
      case 'eth_chainId':
        return `0x${state.chainId.toString(16)}`
      case 'wallet_switchEthereumChain':
        state.chainId = Number(params[0].chainId)
        return null
      case 'personal_sign':
        return wallet.signMessage(getBytes(params[0]))
      default:
        throw new Error(`unexpected ${method}`)
    }
  })
  return { request, wallet, state }
}

describe('wallet failure handling', () => {
  it('reports NO_WALLET when no extension is installed', () => {
    expect(() => getInjectedProvider(undefined)).toThrow(expect.objectContaining({ code: 'NO_WALLET' }))
  })

  it('prefers MetaMask when multiple wallets are injected', () => {
    const metamask = { isMetaMask: true }
    expect(getInjectedProvider({ providers: [{}, metamask] })).toBe(metamask)
  })

  it('maps a rejected account request to USER_REJECTED', async () => {
    const ethereum = fakeEthereum({ fail: { eth_requestAccounts: 4001 } })
    await expect(requestAccount(ethereum)).rejects.toMatchObject({ code: 'USER_REJECTED' })
  })

  it('switches to the target chain when on the wrong network', async () => {
    const ethereum = fakeEthereum({ chainId: 1 })
    await expect(ensureChain(ethereum, 80002)).resolves.toBe(80002)
    expect(ethereum.state.chainId).toBe(80002)
  })

  it('reports WRONG_NETWORK when the user declines the switch', async () => {
    const ethereum = fakeEthereum({ chainId: 1, fail: { wallet_switchEthereumChain: 4001 } })
    await expect(ensureChain(ethereum, 80002)).rejects.toMatchObject({ code: 'WRONG_NETWORK' })
  })
})

describe('authenticateWallet', () => {
  it('requests a nonce, signs the exact server message, and submits the signature', async () => {
    const ethereum = fakeEthereum()
    const serverMessage = 'cipherchain.test wants you to sign in with your Ethereum account:\n...Nonce: abc123'
    const api = vi.fn(async (path) =>
      path === '/auth/nonce' ? { message: serverMessage } : { sessionToken: 'tok', walletAddress: ethereum.wallet.address },
    )

    const result = await authenticateWallet({ api, ethereum })

    expect(result.sessionToken).toBe('tok')
    expect(JSON.parse(api.mock.calls[0][1].body)).toEqual({ address: ethereum.wallet.address, chainId: 80002 })
    const { address, signature } = JSON.parse(api.mock.calls[1][1].body)
    expect(address).toBe(ethereum.wallet.address)
    expect(verifyMessage(serverMessage, signature)).toBe(ethereum.wallet.address)
  })

  it('surfaces USER_REJECTED and never calls verify when the signature is declined', async () => {
    const ethereum = fakeEthereum({ fail: { personal_sign: 4001 } })
    const api = vi.fn(async () => ({ message: 'm' }))

    await expect(authenticateWallet({ api, ethereum })).rejects.toMatchObject({ code: 'USER_REJECTED' })
    expect(api).toHaveBeenCalledTimes(1)
  })
})
