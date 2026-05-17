import { WalletConnectButton } from '../../components/wallet/WalletConnectButton.jsx'
import { AuthShell } from '../../components/ui/AuthShell.jsx'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button.jsx'
import { useAuthStore } from '../../store/authStore.js'
import { useWalletStore } from '../../store/walletStore.js'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const loginUser = useAuthStore((state) => state.loginUser)
  const account = useWalletStore((state) => state.account)
  const redirectTo = location.state?.from?.pathname ?? '/app'

  function handleLogin(event) {
    event.preventDefault()
    loginUser({ walletAddress: account })
    navigate('/two-factor', { state: { redirectTo } })
  }

  return (
    <AuthShell
      eyebrow="CipherChain"
      title="Welcome back"
      description="Authenticate with your wallet, verify your device session, and return to encrypted collaboration."
      sideContent={<SecurityPreview />}
    >
      <form className="space-y-4" onSubmit={handleLogin}>
        <label className="block">
          <span className="text-sm text-slate-400">Email or wallet alias</span>
          <input className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-blue-300/60" placeholder="security@cipherchain.dev" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Password</span>
          <input type="password" className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-blue-300/60" placeholder="••••••••••••" />
        </label>
        <div className="flex items-center justify-between text-sm">
          <Link className="text-slate-500 hover:text-blue-200" to="/forgot-password">Forgot password?</Link>
          <Link className="text-blue-200 hover:text-blue-100" to="/register">Create account</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="submit">Continue securely</Button>
          <WalletConnectButton />
        </div>
      </form>
    </AuthShell>
  )
}

function SecurityPreview() {
  return (
    <div className="space-y-4">
      {['Nonce signed', '2FA required', 'Device session clean'].map((item) => (
        <div key={item} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="font-medium text-white">{item}</p>
          <p className="mt-2 text-sm text-slate-500">Protected by wallet identity and Firebase session controls.</p>
        </div>
      ))}
    </div>
  )
}
