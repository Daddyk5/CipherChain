import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'

export function SettingsPage() {
  const settings = [
    ['Notification privacy', 'Hide message previews from push notifications', 'Enabled'],
    ['Auto key rotation', 'Rotate device session keys on a timed schedule', '24h'],
    ['Verification network', 'Default chain for message hash commitments', 'Polygon Amoy'],
    ['File sharing', 'Encrypt files before upload and preview only locally', 'Locked'],
  ]

  return (
    <section className="flex-1 p-4 md:p-8">
      <PageHeader eyebrow="Settings" title="Security controls" description="Tune privacy, verification, notifications, device trust, and encrypted file behavior." />
      <div className="glass-panel overflow-hidden rounded-3xl">
        {settings.map(([title, body, state]) => (
          <div key={title} className="flex flex-col gap-3 border-b border-slate-800 p-5 last:border-0 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium text-white">{title}</p>
              <p className="mt-1 text-sm text-slate-500">{body}</p>
            </div>
            <StatusPill tone="info">{state}</StatusPill>
          </div>
        ))}
      </div>
    </section>
  )
}
