import { NavLink } from 'react-router-dom'

const links = [
  { to: '/app', label: 'Home', end: true },
  { to: '/app/chat', label: 'Chat' },
  { to: '/app/profile', label: 'Me' },
  { to: '/app/settings', label: 'Security' },
]

export function MobileNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-3xl border border-slate-800 bg-slate-950/95 p-1 shadow-2xl shadow-black/40 backdrop-blur-xl md:hidden">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `rounded-2xl px-2 py-3 text-center text-xs transition ${isActive ? 'bg-blue-400/12 text-blue-200' : 'text-slate-500'}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}
