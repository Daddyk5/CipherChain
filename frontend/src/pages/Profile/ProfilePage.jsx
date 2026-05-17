import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'

export function ProfilePage() {
  return (
    <section className="flex-1 p-4 md:p-8">
      <PageHeader eyebrow="Identity" title="Profile and device trust" description="Manage wallet identity, public keys, devices, and recovery posture." />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="glass-panel rounded-3xl p-6">
          <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-blue-400 to-orange-300 text-3xl font-black text-slate-950">CC</div>
          <h3 className="mt-5 text-2xl font-semibold text-white">Cipher Operator</h3>
          <p className="mt-2 font-mono text-sm text-slate-500">0xA14...92c1</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill tone="secure">Wallet verified</StatusPill>
            <StatusPill tone="info">DID ready</StatusPill>
          </div>
        </div>
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white">Trusted devices</h3>
          <div className="mt-4 space-y-3">
            {['Edge on Windows', 'PWA on Android', 'Recovery vault'].map((device, index) => (
              <div key={device} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div>
                  <p className="font-medium text-white">{device}</p>
                  <p className="mt-1 text-xs text-slate-500">{index === 0 ? 'Current session' : 'Last verified recently'}</p>
                </div>
                <StatusPill tone={index === 0 ? 'secure' : 'neutral'}>{index === 0 ? 'Active' : 'Trusted'}</StatusPill>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
