import { Button } from '../ui/Button.jsx'
import { useWalletStore } from '../../store/walletStore.js'

export function WalletConnectButton() {
  const { account, connectWallet, disconnectWallet, isConnecting } = useWalletStore()
  const label = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect MetaMask'

  return (
    <Button onClick={account ? disconnectWallet : connectWallet} disabled={isConnecting}>
      {isConnecting ? 'Connecting...' : label}
    </Button>
  )
}
