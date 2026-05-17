import { motion } from 'framer-motion'
import { CipherLogo } from './Logo.jsx'

export function LoadingScreen({ label = 'Loading secure workspace' }) {
  return (
    <main className="cyber-grid grid min-h-svh place-items-center bg-[#050711] px-6 text-slate-100">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel rounded-[2rem] p-8 text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="mx-auto mb-5 w-fit"
        >
          <CipherLogo compact />
        </motion.div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-2 text-xs text-slate-500">Checking wallet identity, role policy, and device trust.</p>
      </motion.div>
    </main>
  )
}
