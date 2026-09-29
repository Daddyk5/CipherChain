import { useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/ui/AuthShell.jsx'
import { WalletSignInPanel } from '../../components/wallet/WalletSignInPanel.jsx'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname ?? '/app'

  return (
    <AuthShell
      eyebrow="CipherChain"
      title="Welcome back"
      description="Your wallet is your identity. Sign a one-time message to prove you own it. No password, no gas, no transaction."
      sideContent={<SecurityPreview />}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-400">
          CipherChain only asks you to sign a sign-in message. It will never ask for your seed phrase or for approval to move funds.
        </div>
        <WalletSignInPanel onSignedIn={() => navigate(redirectTo, { replace: true })} />
      </div>
    </AuthShell>
  )
}

function SecurityPreview() {
  return (
    <div className="space-y-4">
      {[
        ['One-time nonce', 'Every sign-in request expires after a few minutes and can only be used once.'],
        ['Signature verified server-side', 'The backend recovers your address from the signature before issuing a session.'],
        ['No password to leak', 'There is no email or password on file, only your wallet address.'],
      ].map(([title, detail]) => (
        <div key={title} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="font-medium text-white">{title}</p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
      ))}
    </div>
  )
}
