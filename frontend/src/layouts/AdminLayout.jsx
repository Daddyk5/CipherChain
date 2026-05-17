import { motion } from 'framer-motion'
import { NavLink, Outlet } from 'react-router-dom'
import { CipherLogo } from '../components/ui/Logo.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useAuthStore } from '../store/authStore.js'

const adminLinks = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/logs', label: 'Security logs' },
  { to: '/admin/blockchain', label: 'Chain monitor' },
  { to: '/admin/roles', label: 'Roles' },
]

export function AdminLayout() {
  const logoutAdmin = useAuthStore((state) => state.logoutAdmin)

  return (
    <main className="cyber-grid min-h-svh bg-[#050711] text-slate-100">
      <div className="mx-auto grid min-h-svh max-w-[1680px] lg:grid-cols-[280px_1fr]">
        <motion.aside
          initial={{ x: -18, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="hidden border-r border-slate-800 bg-slate-950/85 p-5 backdrop-blur-xl lg:flex lg:flex-col"
        >
          <CipherLogo />
          <nav className="mt-8 space-y-2">
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `block rounded-2xl px-3 py-3 text-sm transition ${
                    isActive ? 'bg-orange-300/12 text-orange-100 ring-1 ring-orange-300/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <Button variant="ghost" className="mt-auto" onClick={logoutAdmin}>Secure admin logout</Button>
        </motion.aside>
        <section className="cc-scrollbar max-h-svh overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </section>
      </div>
    </main>
  )
}
