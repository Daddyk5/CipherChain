import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button.jsx'
import { AuthShell } from '../../components/ui/AuthShell.jsx'

export function UnauthorizedPage() {
  return (
    <AuthShell eyebrow="Access denied" title="Permission required" description="This area requires a verified session with the correct role policy.">
      <div className="space-y-4">
        <p className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">
          Your current session does not include the permission required to view this workspace.
        </p>
        <div className="flex gap-3">
          <Link to="/login"><Button>Go to user login</Button></Link>
          <Link to="/admin/login"><Button variant="ghost">Admin login</Button></Link>
        </div>
      </div>
    </AuthShell>
  )
}
