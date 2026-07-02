import { useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createSession, type GameType } from '../lib/sessions'

const GAMES: { label: string; value: GameType }[] = [
  { label: 'Bed Bath & Beyond', value: 'bbb' },
  { label: 'Backrooms', value: 'backrooms' },
  { label: 'Lethal Company', value: 'lethal-company' },
]

export default function CreateSession() {
  const { user } = useAuth()
  const [gameType, setGameType] = useState<GameType>('bbb')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    setError('')
    try {
      const dmName = user.displayName ?? user.email ?? 'DM'
      const sessionId = await createSession(gameType, name, user.uid, dmName)
      navigate(`/sessions/${sessionId}`)
    } catch (err) {
      setError('Could not create session.')
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-fg">Create session</h1>
      <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
        {error && <p className="text-sm text-warning">{error}</p>}
        <div>
          <label className="mb-1 block text-sm text-fg-secondary">Game</label>
          <select
            value={gameType}
            onChange={(e) => setGameType(e.target.value as GameType)}
            className="w-full rounded border border-border-strong bg-page px-3 py-2 text-fg"
          >
            {GAMES.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-fg-secondary">Session name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-border-strong bg-page px-3 py-2 text-fg"
            required
          />
        </div>
        <button
          type="submit"
          className="rounded bg-accent px-4 py-2 text-accent-fg hover:bg-accent-hover"
        >
          Create
        </button>
      </form>
    </div>
  )
}