import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/ui/AuthShell.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'
import { useAuthStore } from '../../store/authStore.js'

export function AdminVerifyPage() {
  const navigate = useNavigate()
  const admin = useAuthStore((state) => state.admin)

  return (
    <AuthShell eyebrow="Admin verification" title="Approve privileged session" description="Confirm role permissions, device posture, and wallet-backed admin policy.">
      <div className="space-y-4">
        <StatusPill tone="secure">RBAC policy matched</StatusPill>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300">
          Permissions: users:manage, reports:moderate, wallets:verify, logs:read, roles:manage
        </div>
        <Button className="w-full" onClick={() => navigate(admin ? '/admin' : '/admin/login')}>
          {admin ? 'Open admin dashboard' : 'Return to admin login'}
        </Button>
      </div>
    </AuthShell>
  )
}
