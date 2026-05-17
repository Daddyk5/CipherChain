import { env } from '../config/env.js'

export function requireAdmin(request, response, next) {
  const walletAddress = request.header('x-wallet-address')?.toLowerCase()

  if (!walletAddress || !env.ADMIN_WALLET_ADDRESSES.includes(walletAddress)) {
    return response.status(403).json({ message: 'Admin wallet is required.' })
  }

  return next()
}
