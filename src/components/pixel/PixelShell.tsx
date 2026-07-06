export function PixelShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#08070d] text-white">
      <div className="scanlines" />
      <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 lg:px-8">
        <nav className="mb-5 pixel-nav">
          <div className="flex min-w-0 items-center gap-3">
            <div className="mini-pokeball" aria-hidden="true" />
            <div className="min-w-0">
              <span className="block font-black tracking-[0.18em] text-emerald-300">POKEHUB</span>
              <span className="block truncate text-[10px] uppercase tracking-[0.16em] text-slate-400">
                Shared DB: project_tag POKE
              </span>
            </div>
          </div>
          <div className="hidden text-right text-[10px] uppercase tracking-[0.18em] text-yellow-100 md:block">
            UUPM link active
          </div>
        </nav>
        {children}
      </div>
    </main>
  );
}
