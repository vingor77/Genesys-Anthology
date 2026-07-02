import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const GAMES = [
  { name: 'Bed Bath & Beyond', slug: 'bbb' },
  { name: 'Backrooms', slug: 'backrooms' },
  { name: 'Lethal Company', slug: 'lethal-company' },
]

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Genesys Anthology</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{user?.displayName ?? user?.email}</span>
          <Link to="/manage" className="hover:text-white">Manage Account</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {GAMES.map((game) => (
          <div key={game.slug} className="rounded-lg bg-gray-800 p-6">
            <h2 className="mb-2 text-xl font-semibold">{game.name}</h2>
            <p className="mb-4 text-sm text-gray-400">Placeholder — sessions coming soon</p>
            <button disabled className="rounded bg-gray-700 px-4 py-2 text-sm text-gray-500">
              Enter (coming soon)
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}