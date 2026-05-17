export function AuthShell({ eyebrow, title, description, children, sideContent }) {
  return (
    <main className="min-h-svh overflow-hidden bg-[#050711] text-slate-100">
      <div className="cyber-grid grid min-h-svh lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex items-center px-5 py-10 md:px-12">
          <div className="mx-auto w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">{eyebrow}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">{title}</h1>
            <p className="mt-4 text-sm leading-6 text-slate-400">{description}</p>
            <div className="glass-panel mt-8 rounded-3xl p-5 md:p-6">{children}</div>
          </div>
        </section>
        <aside className="hidden border-l border-slate-800/70 bg-slate-950/55 p-10 lg:flex lg:items-center">
          <div className="w-full">{sideContent}</div>
        </aside>
      </div>
    </main>
  )
}
