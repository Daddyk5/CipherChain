export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h2>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {action}
    </header>
  )
}
