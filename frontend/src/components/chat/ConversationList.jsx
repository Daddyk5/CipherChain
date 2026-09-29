import { useState } from 'react'
import { isAddress } from 'ethers'
import { useChatStore } from '../../store/chatStore.js'

export function ConversationList({ onSelect }) {
  const conversations = useChatStore((state) => state.conversations)
  const activeConversationId = useChatStore((state) => state.activeConversationId)
  const [draft, setDraft] = useState('')
  const valid = isAddress(draft.trim())

  function handleStart(event) {
    event.preventDefault()
    if (valid) {
      onSelect(draft.trim())
      setDraft('')
    }
  }

  return (
    <aside className="w-full border-b border-slate-800 bg-slate-950/70 p-3 backdrop-blur-xl md:w-80 md:border-b-0 md:border-r">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Conversations</p>
      <form onSubmit={handleStart} className="mb-3 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="0x… wallet address"
          aria-label="Wallet address to message"
          className="min-w-0 flex-1 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-300/60"
        />
        <button
          type="submit"
          disabled={!valid}
          className="rounded-xl border border-slate-800 px-3 py-1.5 text-xs text-blue-200 hover:bg-slate-900 disabled:opacity-50"
        >
          New
        </button>
      </form>
      <div className="space-y-2">
        {conversations.map((address) => (
          <button
            key={address}
            onClick={() => onSelect(address)}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition hover:bg-slate-900 ${address === activeConversationId ? 'bg-slate-900 text-white' : 'text-slate-300'}`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-800 text-xs font-semibold text-blue-200">DM</span>
            <span className="truncate font-mono">{address}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
