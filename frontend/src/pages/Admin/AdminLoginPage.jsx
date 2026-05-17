import { useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/ui/AuthShell.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'
import { useAuthStore } from '../../store/authStore.js'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const loginAdmin = useAuthStore((state) => state.loginAdmin)

  function handleSubmit(event) {
    event.preventDefault()
    loginAdmin()
    navigate('/admin/verify')
  }

  return (
    <AuthShell
      eyebrow="Admin access"
      title="Security operations login"
      description="Admin sessions are isolated from user sessions and require role validation before accessing operations."
      sideContent={<AdminProofPanel />}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm text-slate-400">Admin email</span>
          <input className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-orange-300/60" placeholder="admin@cipherchain.dev" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Privileged password</span>
          <input type="password" className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-orange-300/60" />
        </label>
        <Button className="w-full">Validate admin identity</Button>
      </form>
    </AuthShell>
  )
}

function AdminProofPanel() {
  return (
    <div className="space-y-4">
      <StatusPill tone="warning">Privileged area</StatusPill>
      {['RBAC policy validation', 'Security log binding', 'Admin wallet challenge'].map((item) => (
        <div key={item} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="font-medium text-white">{item}</p>
          <p className="mt-2 text-sm text-slate-500">Required before opening the admin control plane.</p>
        </div>
      ))}
    </div>
  )
}
