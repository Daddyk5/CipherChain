export function StatusPill({ children, tone = 'secure' }) {
  const tones = {
    secure: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
    warning: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    danger: 'border-rose-300/25 bg-rose-300/10 text-rose-100',
    info: 'border-blue-300/25 bg-blue-300/10 text-blue-100',
    neutral: 'border-slate-600 bg-slate-800 text-slate-300',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}
