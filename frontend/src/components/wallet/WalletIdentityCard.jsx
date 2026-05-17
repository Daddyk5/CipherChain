import { StatusPill } from '../ui/StatusPill.jsx'

export function WalletIdentityCard({ account }) {
  return (
    <article className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Decentralized identity</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{account ? 'Wallet verified' : 'Wallet pending'}</h3>
        </div>
        <StatusPill tone={account ? 'secure' : 'warning'}>{account ? 'Verified' : 'Required'}</StatusPill>
      </div>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 font-mono text-sm text-slate-300">
        {account ?? 'Connect MetaMask to bind identity'}
      </div>
    </article>
  )
}
