import { apiRequest } from '../api/httpClient.js'
import { ensureChain, getInjectedProvider, requestAccount, signMessage, TARGET_CHAIN_ID } from '../blockchain/walletService.js'

// Full sign-in flow. Returns a backend session token for the verified wallet.
// Throws WalletError (NO_WALLET, USER_REJECTED, WRONG_NETWORK, ...) or ApiError.
export async function authenticateWallet({ api = apiRequest, ethereum = getInjectedProvider() } = {}) {
  const address = await requestAccount(ethereum)
  const chainId = await ensureChain(ethereum, TARGET_CHAIN_ID)

  const { message } = await api('/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ address, chainId }),
  })

  const signature = await signMessage(ethereum, address, message)

  return api('/auth/verify-wallet', {
    method: 'POST',
    body: JSON.stringify({ address, signature }),
  })
}
