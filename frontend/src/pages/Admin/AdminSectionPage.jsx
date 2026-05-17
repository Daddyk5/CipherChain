import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { StatCard } from '../../components/ui/StatCard.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'

const sectionData = {
  users: ['User management', 'Inspect sessions, revoke devices, suspend compromised accounts, and track realtime presence.'],
  reports: ['Reported messages', 'Review reports, AI moderation signals, toxicity detector output, and phishing risk scores.'],
  logs: ['Security logs', 'Audit login attempts, key rotations, admin actions, and anomaly events.'],
  blockchain: ['Blockchain monitor', 'Track hash commitments, failed relays, gas spikes, and contract verification health.'],
  roles: ['Roles and permissions', 'Manage least-privilege roles, permission bundles, and admin approval policies.'],
}

export function AdminSectionPage({ section }) {
  const [title, description] = sectionData[section]

  return (
    <section className="p-4 md:p-8">
      <PageHeader eyebrow="Admin module" title={title} description={description} />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Open items" value="24" detail="Needs review" tone="purple" />
        <StatCard label="Resolved" value="1.8k" detail="Last 30 days" tone="emerald" />
        <StatCard label="Risk score" value="Low" detail="SOC posture stable" tone="blue" />
      </div>
      <div className="glass-panel mt-4 overflow-hidden rounded-3xl">
        {['Threat analysis ready', 'AI moderation hook prepared', 'Scam detection queue prepared', 'Audit export ready'].map((item, index) => (
          <div key={item} className="flex items-center justify-between border-b border-slate-800 p-5 last:border-0">
            <div>
              <p className="font-medium text-white">{item}</p>
              <p className="mt-1 text-sm text-slate-500">Future-ready integration slot for enterprise monitoring.</p>
            </div>
            <StatusPill tone={index === 0 ? 'secure' : 'neutral'}>{index === 0 ? 'Live' : 'Ready'}</StatusPill>
          </div>
        ))}
      </div>
    </section>
  )
}
