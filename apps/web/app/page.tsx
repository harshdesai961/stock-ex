// Placeholder landing page for Milestone 0. The real landing screen is built in Milestone 3.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">
        stock<span className="text-windfall-400">-ex</span>
      </h1>
      <p className="text-lg text-ink-300">
        Trade shares in six fictional companies, read your hidden cards, out-think the table.
      </p>
      <p className="rounded-card border border-ink-700 bg-ink-900 px-4 py-2 text-sm text-ink-300">
        <span aria-hidden="true">▲</span> Bull <span aria-hidden="true">▼</span> Bear · In-game
        rupees are play money only and can never be bought or cashed out.
      </p>
    </main>
  );
}
