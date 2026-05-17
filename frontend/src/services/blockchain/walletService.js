import { BrowserProvider } from 'ethers'

export async function connectMetaMask() {
  if (!window.ethereum) {
    throw new Error('MetaMask is required to authenticate.')
  }

  const provider = new BrowserProvider(window.ethereum)
  const accounts = await provider.send('eth_requestAccounts', [])
  const network = await provider.getNetwork()

  return {
    account: accounts[0],
    chainId: Number(network.chainId),
  }
}
