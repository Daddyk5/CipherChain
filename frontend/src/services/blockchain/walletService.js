import { BrowserProvider, getAddress, toBeHex } from 'ethers'

export const TARGET_CHAIN_ID = Number(import.meta.env.VITE_POLYGON_CHAIN_ID ?? 80002)

const CHAIN_PARAMS = {
  80002: {
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: [import.meta.env.VITE_POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology'],
    blockExplorerUrls: ['https://amoy.polygonscan.com'],
  },
}

export class WalletError extends Error {
  constructor(code, message, cause) {
    super(message)
    this.code = code
    this.cause = cause
  }
}

// EIP-1193 / MetaMask error codes.
const USER_REJECTED = 4001
const REQUEST_PENDING = -32002
const UNRECOGNIZED_CHAIN = 4902

function providerErrorCode(error) {
  return error?.code ?? error?.info?.error?.code ?? error?.error?.code
}

export function toWalletError(error) {
  if (error instanceof WalletError) {
    return error
  }
  const code = providerErrorCode(error)
  if (code === USER_REJECTED || code === 'ACTION_REJECTED') {
    return new WalletError('USER_REJECTED', 'You cancelled the request in your wallet.', error)
  }
  if (code === REQUEST_PENDING) {
    return new WalletError('REQUEST_PENDING', 'A wallet request is already open. Check your MetaMask window.', error)
  }
  return new WalletError('WALLET_ERROR', error?.shortMessage ?? error?.message ?? 'Wallet request failed.', error)
}

export function getInjectedProvider(ethereum = globalThis.window?.ethereum) {
  if (!ethereum) {
    throw new WalletError('NO_WALLET', 'No wallet extension detected. Install MetaMask to continue.')
  }
  // When several wallets are installed, prefer MetaMask.
  return ethereum.providers?.find((provider) => provider.isMetaMask) ?? ethereum
}

export async function requestAccount(ethereum) {
  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
    if (!accounts?.length) {
      throw new WalletError('NO_ACCOUNT', 'No wallet account is available. Unlock MetaMask and try again.')
    }
    return getAddress(accounts[0])
  } catch (error) {
    throw toWalletError(error)
  }
}

export async function ensureChain(ethereum, chainId = TARGET_CHAIN_ID) {
  const current = Number(await ethereum.request({ method: 'eth_chainId' }))
  if (current === chainId) {
    return chainId
  }

  const hexChainId = toBeHex(chainId)
  try {
    await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] })
  } catch (error) {
    if (providerErrorCode(error) === UNRECOGNIZED_CHAIN && CHAIN_PARAMS[chainId]) {
      try {
        await ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: hexChainId, ...CHAIN_PARAMS[chainId] }] })
      } catch (addError) {
        throw wrongNetwork(addError, chainId)
      }
    } else {
      throw wrongNetwork(error, chainId)
    }
  }

  const switched = Number(await ethereum.request({ method: 'eth_chainId' }))
  if (switched !== chainId) {
    throw new WalletError('WRONG_NETWORK', `Switch your wallet to ${CHAIN_PARAMS[chainId]?.chainName ?? `chain ${chainId}`}.`)
  }
  return chainId
}

function wrongNetwork(error, chainId) {
  const walletError = toWalletError(error)
  if (walletError.code === 'USER_REJECTED') {
    return new WalletError('WRONG_NETWORK', `CipherChain needs ${CHAIN_PARAMS[chainId]?.chainName ?? `chain ${chainId}`}. You declined the network switch.`, error)
  }
  return walletError
}

export async function signMessage(ethereum, address, message) {
  try {
    const signer = await new BrowserProvider(ethereum).getSigner(address)
    return await signer.signMessage(message)
  } catch (error) {
    throw toWalletError(error)
  }
}

export async function connectMetaMask() {
  const ethereum = getInjectedProvider()
  const account = await requestAccount(ethereum)
  const chainId = Number(await ethereum.request({ method: 'eth_chainId' }))
  return { account, chainId }
}
