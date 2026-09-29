import { useState } from 'react'
import { Button } from '../ui/Button.jsx'

export function MessageComposer({ onSend }) {
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!text.trim() || isSending) {
      return
    }
    setIsSending(true)
    setError(null)
    try {
      await onSend(text)
      setText('')
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form className="border-t border-slate-800 bg-slate-950/85 p-4 backdrop-blur-xl" onSubmit={handleSubmit}>
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full border border-slate-800 px-2 py-1">Double Ratchet</span>
        <span className="rounded-full border border-slate-800 px-2 py-1">Wallet-verified device keys</span>
      </div>
      {error && <p role="alert" className="mb-2 text-sm text-rose-200">{error}</p>}
      <div className="flex items-end gap-3 rounded-3xl border border-slate-800 bg-slate-900/80 p-2">
        <textarea
          className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
          placeholder="Encrypt and send a message..."
          rows="1"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              handleSubmit(event)
            }
          }}
        />
        <Button type="submit" disabled={isSending || !text.trim()}>{isSending ? 'Encrypting…' : 'Send'}</Button>
      </div>
    </form>
  )
}
