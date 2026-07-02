const GAMES = [
  { name: 'Bed Bath & Beyond', slug: 'bbb' },
  { name: 'Backrooms', slug: 'backrooms' },
  { name: 'Lethal Company', slug: 'lethal-company' },
]

export default function Landing() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-fg">Your games</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {GAMES.map((game) => (
          <div key={game.slug} className="rounded-lg border border-border bg-surface p-6">
            <h2 className="mb-2 text-xl font-semibold text-fg">{game.name}</h2>
            <p className="mb-4 text-sm text-fg-secondary">Placeholder — sessions coming soon</p>
            <button
              disabled
              className="rounded bg-disabled px-4 py-2 text-sm text-disabled-fg"
            >
              Enter (coming soon)
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}