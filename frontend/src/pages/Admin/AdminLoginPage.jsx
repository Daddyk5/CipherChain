import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/ui/AuthShell.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'
import { WalletSignInPanel } from '../../components/wallet/WalletSignInPanel.jsx'

export function AdminLoginPage() {
  const navigate = useNavigate()

  function handleSignedIn(session) {
    navigate(session.admin ? '/admin' : '/unauthorized', { replace: true })
  }

  return (
    <AuthShell
      eyebrow="Admin access"
      title="Security operations login"
      description="Admin access comes from an allow-listed wallet. The backend checks it on every admin request."
      sideContent={<AdminProofPanel />}
    >
      <WalletSignInPanel variant="warm" label="Sign in with admin wallet" onSignedIn={handleSignedIn} />
    </AuthShell>
  )
}

function AdminProofPanel() {
  return (
    <div className="space-y-4">
      <StatusPill tone="warning">Privileged area</StatusPill>
      {['Admin wallet allow-list', 'Signed nonce challenge', 'Server-side role enforcement'].map((item) => (
        <div key={item} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="font-medium text-white">{item}</p>
          <p className="mt-2 text-sm text-slate-500">Required before opening the admin control plane.</p>
        </div>
      ))}
    </div>
  )
}
