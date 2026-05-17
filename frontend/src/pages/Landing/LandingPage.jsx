import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button.jsx'
import { StatusPill } from '../../components/ui/StatusPill.jsx'

export function LandingPage() {
  return (
    <main className="min-h-svh overflow-hidden bg-[#050711] text-slate-100">
      <section className="cyber-grid flex min-h-svh items-center px-5 py-10 md:px-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <StatusPill tone="secure">E2EE Web3 messaging platform</StatusPill>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-7xl">
              Secure communication for blockchain-native teams.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400">
              CipherChain combines Signal-grade privacy, Discord-style collaboration, wallet identity, and on-chain message hash verification.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register"><Button>Create secure workspace</Button></Link>
              <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
              <Link to="/admin/login"><Button variant="ghost">Admin console</Button></Link>
            </div>
          </div>
          <div className="glass-panel rounded-[2rem] p-4 shadow-2xl shadow-blue-950/20">
            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/80 p-4">
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-blue-300">Live vault</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Incident Response</h2>
                </div>
                <StatusPill tone="info">Amoy verified</StatusPill>
              </div>
              {['Wallet identity verified', 'Message hash committed', 'Device keys rotated'].map((item, index) => (
                <div key={item} className="mb-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-sm font-medium text-white">{item}</p>
                  <p className="mt-1 text-xs text-slate-500">Step {index + 1} completed in secure session</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
