import { AuthShell } from '../../components/ui/AuthShell.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { useLocation, useNavigate } from 'react-router-dom'

export function TwoFactorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.redirectTo ?? '/app'

  return (
    <AuthShell eyebrow="Two-factor" title="Verify secure session" description="Enter the one-time code from your authenticator app.">
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <input key={index} maxLength="1" className="h-14 rounded-2xl border border-slate-800 bg-slate-950/80 text-center text-xl text-white outline-none focus:border-blue-300/60" />
        ))}
      </div>
      <Button className="mt-5 w-full" onClick={() => navigate('/verify-session', { state: { redirectTo } })}>Verify session</Button>
    </AuthShell>
  )
}
