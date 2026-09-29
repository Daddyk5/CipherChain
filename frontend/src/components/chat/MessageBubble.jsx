export function MessageBubble({ message }) {
  const own = message.own ?? message.sender === 'You'

  return (
    <article className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-2xl rounded-3xl border px-4 py-3 shadow-lg ${own ? 'border-blue-300/20 bg-blue-400/10' : 'border-slate-800 bg-slate-900/75'}`}>
        <div className="mb-1 flex items-center justify-between gap-4 text-xs text-slate-500">
          <span>{message.sender}</span>
          <time>{message.timestamp}</time>
        </div>
        <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-slate-200">{message.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-emerald-200">End-to-end encrypted</span>
        </div>
      </div>
    </article>
  )
}
