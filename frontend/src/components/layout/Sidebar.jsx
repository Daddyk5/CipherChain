import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { CipherLogo } from '../ui/Logo.jsx'
import { Button } from '../ui/Button.jsx'
import { useAuthStore } from '../../store/authStore.js'

const links = [
  { to: '/app', label: 'Command', badge: 'Live', end: true },
  { to: '/app/chat', label: 'Secure chat', badge: 'E2EE' },
  { to: '/app/profile', label: 'Identity', badge: 'DID' },
  { to: '/app/settings', label: 'Security', badge: null },
]

export function Sidebar() {
  const logoutUser = useAuthStore((state) => state.logoutUser)

  return (
    <motion.aside
      initial={{ x: -18, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden w-72 shrink-0 border-r border-slate-800/80 bg-slate-950/80 px-4 py-5 backdrop-blur-xl md:flex md:flex-col"
    >
      <div className="mb-7"><CipherLogo /></div>
      <nav className="space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition ${
                isActive
                  ? 'bg-blue-500/12 text-blue-100 shadow-lg shadow-blue-950/20 ring-1 ring-blue-300/25'
                  : 'text-slate-400 hover:bg-slate-900/80 hover:text-white hover:ring-1 hover:ring-slate-700'
              }`
            }
          >
            <span>{link.label}</span>
            {link.badge && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{link.badge}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="glass-panel mt-auto rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Network</p>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.8)]" />
        </div>
        <p className="text-sm font-medium text-white">Polygon Amoy</p>
        <p className="mt-1 text-xs text-slate-500">Verification relayer ready</p>
        <Button variant="ghost" className="mt-4 w-full" onClick={logoutUser}>Secure logout</Button>
      </div>
    </motion.aside>
  )
}
