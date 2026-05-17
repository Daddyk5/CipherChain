export function Button({ className = '', variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-blue-500 text-white shadow-lg shadow-blue-950/30 hover:bg-blue-400',
    ghost: 'bg-slate-900/70 text-slate-100 ring-1 ring-slate-700 hover:bg-slate-800 hover:ring-blue-400/40',
    danger: 'bg-rose-500 text-white hover:bg-rose-400',
    warm: 'bg-orange-400 text-slate-950 shadow-lg shadow-orange-950/30 hover:bg-orange-300',
  }

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
