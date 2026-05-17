import { AuthShell } from '../../components/ui/AuthShell.jsx'
import { Button } from '../../components/ui/Button.jsx'

export function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Recovery" title="Recover access" description="Request a recovery link while preserving wallet and device security boundaries.">
      <div className="space-y-4">
        <input className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-blue-300/60" placeholder="account email" />
        <Button className="w-full">Send recovery link</Button>
      </div>
    </AuthShell>
  )
}
