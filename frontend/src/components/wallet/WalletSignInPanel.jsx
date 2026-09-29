import { Button } from '../ui/Button.jsx'
import { useAuthStore } from '../../store/authStore.js'

const ERROR_HINTS = {
  NO_WALLET: { title: 'No wallet detected', action: { href: 'https://metamask.io/download/', label: 'Install MetaMask' } },
  USER_REJECTED: { title: 'Signature request cancelled', hint: 'Nothing was signed. Try again when you are ready.' },
  WRONG_NETWORK: { title: 'Wrong network', hint: 'Approve the network switch in MetaMask to continue.' },
  UNSUPPORTED_CHAIN: { title: 'Wrong network', hint: 'Switch MetaMask to Polygon Amoy and try again.' },
  REQUEST_PENDING: { title: 'Request already open', hint: 'Finish or dismiss the pending MetaMask popup.' },
  NONCE_EXPIRED: { title: 'Sign-in request expired', hint: 'Start again to get a fresh request.' },
  RATE_LIMITED: { title: 'Too many attempts', hint: 'Wait a minute and try again.' },
}

export function WalletSignInPanel({ onSignedIn, variant = 'primary', label = 'Sign in with MetaMask' }) {
  const signInWithWallet = useAuthStore((state) => state.signInWithWallet)
  const isSigningIn = useAuthStore((state) => state.isSigningIn)
  const error = useAuthStore((state) => state.error)
  const details = error ? ERROR_HINTS[error.code] : null

  async function handleClick() {
    const session = await signInWithWallet()
    if (session) {
      onSignedIn?.(session)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant={variant} className="w-full" onClick={handleClick} disabled={isSigningIn}>
        {isSigningIn ? 'Check your wallet…' : label}
      </Button>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          <p className="font-medium">{details?.title ?? 'Sign-in failed'}</p>
          <p className="mt-1 text-rose-100/80">{details?.hint ?? error.message}</p>
          {details?.action && (
            <a className="mt-2 inline-block text-blue-200 underline" href={details.action.href} target="_blank" rel="noreferrer">
              {details.action.label}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
