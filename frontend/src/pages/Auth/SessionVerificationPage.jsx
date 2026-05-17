import { AuthShell } from '../../components/ui/AuthShell.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'
import { useLocation, useNavigate } from 'react-router-dom'

export function SessionVerificationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.redirectTo ?? '/app'

  return (
    <AuthShell eyebrow="Session check" title="Approve this device" description="Confirm that this browser should be allowed to decrypt messages.">
      <div className="space-y-3">
        <StatusPill tone="warning">New device detected</StatusPill>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300">
          Windows desktop, Edge, Taipei region
        </div>
        <Button className="w-full" onClick={() => navigate(redirectTo)}>Trust device</Button>
      </div>
    </AuthShell>
  )
}
