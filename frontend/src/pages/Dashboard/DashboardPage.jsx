import { WalletConnectButton } from '../../components/wallet/WalletConnectButton.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { StatCard } from '../../components/ui/StatCard.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'
import { WalletIdentityCard } from '../../components/wallet/WalletIdentityCard.jsx'
import { useWalletStore } from '../../store/walletStore.js'

export function DashboardPage() {
  const { account } = useWalletStore()
  const alerts = [
    ['E2EE session', 'All direct channels are encrypted with device-scoped keys.', 'secure'],
    ['Chain monitor', '3 message hashes waiting for Amoy confirmations.', 'warning'],
    ['Admin audit', 'No critical policy changes in the last 24 hours.', 'info'],
  ]

  return (
    <section className="flex-1 p-4 md:p-8">
      <PageHeader
        eyebrow="Command center"
        title="Encrypted workspace"
        description="Monitor secure communication, wallet identity, message verification, and active threat posture from one enterprise dashboard."
        action={<WalletConnectButton />}
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Verified messages" value="12.8k" detail="+18% this week" tone="teal" />
            <StatCard label="Active peers" value="248" detail="42 online now" tone="emerald" />
            <StatCard label="Pending rotations" value="2" detail="Device keys expiring" tone="purple" />
          </div>

          <section className="glass-panel overflow-hidden rounded-3xl">
            <div className="border-b border-slate-800 px-5 py-4">
              <h3 className="text-lg font-semibold text-white">Security activity</h3>
              <p className="text-sm text-slate-500">Realtime operational events across chat, wallet, and chain verification.</p>
            </div>
            <div className="divide-y divide-slate-800">
              {alerts.map(([title, body, tone]) => (
                <article key={title} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="font-medium text-white">{title}</h4>
                    <p className="mt-1 text-sm text-slate-500">{body}</p>
                  </div>
                  <StatusPill tone={tone}>{tone}</StatusPill>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <WalletIdentityCard account={account} />
          <section className="glass-panel rounded-3xl p-5">
            <h3 className="text-lg font-semibold text-white">Verification health</h3>
            <div className="mt-5 space-y-4">
              {['Firebase realtime', 'Web Crypto keys', 'Polygon verifier', 'Admin audit'].map((item, index) => (
                <div key={item}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-300">{item}</span>
                    <span className="text-blue-200">{[98, 92, 76, 88][index]}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-300" style={{ width: `${[98, 92, 76, 88][index]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}
