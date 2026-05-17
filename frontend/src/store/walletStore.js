import { create } from 'zustand'
import { connectMetaMask } from '../services/blockchain/walletService.js'

export const useWalletStore = create((set) => ({
  account: null,
  chainId: null,
  isConnecting: false,
  error: null,
  connectWallet: async () => {
    set({ isConnecting: true, error: null })
    try {
      const wallet = await connectMetaMask()
      set({ ...wallet, isConnecting: false })
    } catch (error) {
      set({ error: error.message, isConnecting: false })
    }
  },
  disconnectWallet: () => set({ account: null, chainId: null, error: null }),
}))
