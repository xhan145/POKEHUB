export function PixelShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#070512] text-white">
      <div className="scanlines" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center justify-between pixel-panel px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="pixel-orb" />
            <span className="font-black tracking-[0.25em] text-emerald-300">POKEHUB</span>
          </div>
          <div className="hidden gap-4 text-xs text-slate-300 md:flex">
            <span>DEX</span>
            <span>MARKET</span>
            <span>RADAR</span>
            <span>PORTFOLIO</span>
          </div>
        </nav>
        {children}
      </div>
    </main>
  );
}
