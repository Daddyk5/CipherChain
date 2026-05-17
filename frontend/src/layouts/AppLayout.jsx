import { motion } from 'framer-motion'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar.jsx'
import { MobileNav } from '../components/layout/MobileNav.jsx'

export function AppLayout() {
  return (
    <main className="cyber-grid min-h-svh overflow-hidden bg-[#050711] text-slate-100">
      <div className="mx-auto flex min-h-svh w-full max-w-[1600px]">
        <Sidebar />
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="cc-scrollbar flex max-h-svh min-w-0 flex-1 flex-col overflow-y-auto pb-24 md:pb-0"
        >
          <Outlet />
        </motion.section>
        <MobileNav />
      </div>
    </main>
  )
}
