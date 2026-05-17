export function MessageBubble({ message }) {
  const own = message.sender === 'You'

  return (
    <article className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-2xl rounded-3xl border px-4 py-3 shadow-lg ${own ? 'border-blue-300/20 bg-blue-400/10' : 'border-slate-800 bg-slate-900/75'}`}>
        <div className="mb-1 flex items-center justify-between gap-4 text-xs text-slate-500">
          <span>{message.sender}</span>
          <time>{message.timestamp}</time>
        </div>
        <p className="text-sm leading-6 text-slate-200">{message.body}</p>
        {message.file && (
          <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
            <p className="font-medium text-white">{message.file}</p>
            <p className="mt-1 text-xs text-slate-500">Encrypted preview, ready to decrypt locally</p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-emerald-200">Locked</span>
          <span className="rounded-full bg-blue-300/10 px-2 py-1 text-blue-200">Delivered</span>
          <span className="rounded-full bg-orange-300/10 px-2 py-1 text-orange-200">Chain verified</span>
        </div>
        <p className="mt-2 truncate font-mono text-xs text-blue-300/70">Hash: {message.hash}</p>
      </div>
    </article>
  )
}
