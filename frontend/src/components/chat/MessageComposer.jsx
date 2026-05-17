import { Button } from '../ui/Button.jsx'

export function MessageComposer() {
  return (
    <form className="border-t border-slate-800 bg-slate-950/85 p-4 backdrop-blur-xl">
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full border border-slate-800 px-2 py-1">AES-GCM</span>
        <span className="rounded-full border border-slate-800 px-2 py-1">Device keys synced</span>
        <span className="rounded-full border border-slate-800 px-2 py-1">Hash on send</span>
      </div>
      <div className="flex items-end gap-3 rounded-3xl border border-slate-800 bg-slate-900/80 p-2">
        <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-800 text-sm text-slate-300">+</button>
        <textarea
          className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
          placeholder="Encrypt and send a message..."
          rows="1"
        />
        <Button type="submit">Send</Button>
      </div>
    </form>
  )
}
