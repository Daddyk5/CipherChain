import { ConversationList } from '../../components/chat/ConversationList.jsx'
import { MessageBubble } from '../../components/chat/MessageBubble.jsx'
import { MessageComposer } from '../../components/chat/MessageComposer.jsx'

const messages = [
  {
    sender: '0xA14...92c1',
    timestamp: '13:42',
    body: 'Session key rotated. Latest message hash is queued for Polygon Amoy verification.',
    hash: '0x8b7f9b65cc64d2e4a1b1c4a3a9f2c1d5',
    file: null,
  },
  {
    sender: 'You',
    timestamp: '13:44',
    body: 'Acknowledged. Keep ciphertext and signatures in Firebase only, never plaintext.',
    hash: '0x74d4d9b0cd41e98a48b5b0c9f0f65f12',
    file: 'incident-brief.enc.pdf',
  },
]

export function ChatPage() {
  return (
    <section className="flex min-h-svh flex-1 flex-col md:flex-row">
      <ConversationList />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-800 bg-slate-950/75 px-4 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Protocol Alpha</h2>
              <p className="text-xs text-slate-500">End-to-end encrypted. Blockchain verified.</p>
            </div>
            <div className="hidden gap-2 md:flex">
              <button className="rounded-2xl border border-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900">Voice</button>
              <button className="rounded-2xl border border-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900">Video</button>
              <button className="rounded-2xl bg-orange-400 px-3 py-2 text-xs font-semibold text-slate-950">Verify</button>
            </div>
          </div>
        </header>
        <div className="cc-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((message) => (
            <MessageBubble key={message.hash} message={message} />
          ))}
          <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-blue-300" />
              <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-blue-300" />
              <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-blue-300" />
            </span>
            Vault Team is typing in an encrypted session
          </div>
        </div>
        <MessageComposer />
      </div>
    </section>
  )
}
