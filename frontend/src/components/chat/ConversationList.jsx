const conversations = [
  { id: 'alpha', name: 'Protocol Alpha', status: 'online', unread: 4, type: 'DM' },
  { id: 'vault', name: 'Vault Team', status: 'offline', unread: 0, type: 'Group' },
  { id: 'audit', name: 'Audit Room', status: 'online', unread: 9, type: 'Admin' },
  { id: 'incident', name: 'Incident Response', status: 'online', unread: 2, type: 'Ops' },
]

export function ConversationList() {
  return (
    <aside className="w-full border-b border-slate-800 bg-slate-950/70 p-3 backdrop-blur-xl md:w-80 md:border-b-0 md:border-r">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Conversations</p>
        <button className="rounded-xl border border-slate-800 px-3 py-1.5 text-xs text-blue-200 hover:bg-slate-900">New</button>
      </div>
      <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-500">
        Search secure channels
      </div>
      <div className="space-y-2">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-slate-300 transition hover:bg-slate-900"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-800 text-xs font-semibold text-blue-200">
              {conversation.type}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-white">{conversation.name}</span>
              <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                <span className={`h-2 w-2 rounded-full ${conversation.status === 'online' ? 'bg-emerald-300' : 'bg-slate-600'}`} />
                {conversation.status}
              </span>
            </span>
            {conversation.unread > 0 && <span className="rounded-full bg-orange-400 px-2 py-0.5 text-xs font-bold text-slate-950">{conversation.unread}</span>}
          </button>
        ))}
      </div>
    </aside>
  )
}
