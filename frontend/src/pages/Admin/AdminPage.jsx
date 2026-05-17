import { useState } from 'react'
import { Button } from '../../components/ui/Button.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { StatCard } from '../../components/ui/StatCard.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'
import { WalletConnectButton } from '../../components/wallet/WalletConnectButton.jsx'
import { apiRequest } from '../../services/api/httpClient.js'
import { useWalletStore } from '../../store/walletStore.js'

export function AdminPage() {
  const { account } = useWalletStore()
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  async function loadAdminStatus() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await apiRequest('/admin/status', {
        headers: {
          'x-wallet-address': account,
        },
      })

      setStatus(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="flex-1 p-4 md:p-8">
      <PageHeader
        eyebrow="Admin control plane"
        title="Security operations"
        description="Manage users, wallet verification, moderation queues, reported messages, security logs, chain monitors, broadcasts, roles, and permissions."
        action={<WalletConnectButton />}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <StatCard label="Active users" value="2,842" detail="Realtime tracked" tone="teal" />
        <StatCard label="Reports" value="17" detail="Needs review" tone="purple" />
        <StatCard label="Security events" value="94" detail="Last 24 hours" tone="blue" />
        <StatCard label="Wallet checks" value="99.2%" detail="Pass rate" tone="emerald" />
      </div>

      <div className="glass-panel max-w-3xl rounded-xl p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">Admin SDK status</h3>
            <p className="mt-1 text-sm text-slate-500">
              The service account stays on the backend and is never exposed to the browser.
            </p>
          </div>
          <Button onClick={loadAdminStatus} disabled={!account || isLoading}>
            {isLoading ? 'Checking...' : 'Check status'}
          </Button>
        </div>

        {!account && (
          <p className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            Connect an admin wallet before checking Firebase Admin status.
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-lg border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        )}

        {status && (
          <dl className="mt-6 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <dt className="text-slate-500">Initialized</dt>
              <dd className="mt-2 font-semibold text-blue-200">{String(status.firebaseAdminInitialized)}</dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <dt className="text-slate-500">Project</dt>
              <dd className="mt-2 truncate font-semibold text-white">{status.projectId}</dd>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <dt className="text-slate-500">Service</dt>
              <dd className="mt-2 font-semibold text-white">{status.service}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {[
          ['User management', 'Suspend risky accounts, inspect sessions, and manage workspace membership.', '248 online'],
          ['Wallet verification', 'Review wallet signatures, failed nonce checks, and identity conflicts.', '12 pending'],
          ['Moderation panel', 'Review reported ciphertext metadata and abuse signals without plaintext access.', '17 reports'],
          ['Security logs', 'Audit admin actions, auth events, key rotations, and chain submissions.', 'Live stream'],
          ['Blockchain monitor', 'Track pending hash commits, gas failures, confirmations, and contract health.', '3 queued'],
          ['Broadcast system', 'Send privacy-safe operational announcements to selected user cohorts.', 'Ready'],
          ['Roles and permissions', 'Configure admin roles, scoped capabilities, and least-privilege policies.', '4 roles'],
          ['Analytics', 'Measure adoption, uptime, delivery latency, and verification throughput.', 'Healthy'],
        ].map(([title, body, meta]) => (
          <article key={title} className="glass-panel rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
              </div>
              <StatusPill tone="neutral">{meta}</StatusPill>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
