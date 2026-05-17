export function CipherLogo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <svg className={compact ? 'h-12 w-12' : 'h-10 w-10'} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="cipherGradient" x1="8" y1="8" x2="56" y2="56">
            <stop stopColor="#57a8ff" />
            <stop offset="0.58" stopColor="#2f7df6" />
            <stop offset="1" stopColor="#ff8a34" />
          </linearGradient>
        </defs>
        <path d="M32 4 56 17.5v29L32 60 8 46.5v-29L32 4Z" fill="url(#cipherGradient)" opacity="0.24" />
        <path d="M32 8 52 19.5v25L32 56 12 44.5v-25L32 8Z" fill="#07111f" stroke="url(#cipherGradient)" strokeWidth="2" />
        <path d="M24 31.5 32 20l8 11.5L32 44 24 31.5Z" fill="url(#cipherGradient)" />
        <path d="M20 32h24M32 20v24" stroke="#dffcf8" strokeWidth="2" strokeLinecap="round" opacity="0.72" />
      </svg>
      {!compact && (
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-300">CipherChain</p>
          <p className="text-xs text-slate-500">Secure communications hub</p>
        </div>
      )}
    </div>
  )
}
