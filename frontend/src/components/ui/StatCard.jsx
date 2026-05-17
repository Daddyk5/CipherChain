export function StatCard({ label, value, detail, tone = 'teal' }) {
  const tones = {
    teal: 'from-blue-400/25 to-sky-300/5 text-blue-200',
    emerald: 'from-emerald-300/20 to-blue-400/5 text-emerald-200',
    purple: 'from-orange-400/25 to-blue-400/5 text-orange-200',
    blue: 'from-sky-400/25 to-blue-500/5 text-sky-200',
  }

  return (
    <article className="glass-panel rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5 hover:border-blue-200/30">
      <div className={`mb-5 h-1.5 w-16 rounded-full bg-gradient-to-r ${tones[tone]}`} />
      <p className="text-sm text-slate-400">{label}</p>
      <strong className="mt-3 block text-3xl font-semibold text-white">{value}</strong>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </article>
  )
}
