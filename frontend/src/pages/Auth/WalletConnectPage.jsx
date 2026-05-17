import { AuthShell } from '../../components/ui/AuthShell.jsx'
import { WalletConnectButton } from '../../components/wallet/WalletConnectButton.jsx'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button.jsx'

export function WalletConnectPage() {
  return (
    <AuthShell eyebrow="Wallet identity" title="Bind MetaMask" description="Use your wallet signature as decentralized identity proof.">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
          CipherChain signs a nonce only. It will never request your seed phrase or transfer permissions.
        </div>
        <WalletConnectButton />
        <Link to="/two-factor"><Button variant="ghost" className="w-full">Continue to 2FA</Button></Link>
      </div>
    </AuthShell>
  )
}
