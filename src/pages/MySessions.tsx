import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { subscribeToMyMemberships, leaveSession, endSession, type Membership } from '../lib/sessions'

const GAME_LABELS: Record<string, string> = {
  bbb: 'Bed Bath & Beyond',
  backrooms: 'Backrooms',
  'lethal-company': 'Lethal Company',
}

export default function MySessions() {
  const { user } = useAuth()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToMyMemberships(user.uid, (m) => {
      setMemberships(m)
      setLoading(false)
    })
    return unsub
  }, [user])

  async function handleLeave(sessionId: string) {
    if (!user) return
    if (!confirm('Leave this session?')) return
    try {
      await leaveSession(sessionId, user.uid)
    } catch (err) {
      console.error('Failed to leave session:', err)
      alert('Could not leave the session. Check the console for details.')
    }
  }

  async function handleEnd(sessionId: string) {
    if (!confirm('End this session for everyone? This cannot be undone.')) return
    try {
      await endSession(sessionId)
    } catch (err) {
      console.error('Failed to end session:', err)
      alert('Could not end the session. Check the console for details.')
    }
  }

  if (loading) {
    return <p className="text-fg-secondary">Loading your sessions…</p>
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-fg">Your sessions</h1>
        <div className="flex gap-3">
          <Link
            to="/sessions/new"
            className="rounded bg-accent px-4 py-2 text-sm text-accent-fg hover:bg-accent-hover"
          >
            Create session
          </Link>
          <Link
            to="/join"
            className="rounded border border-border-strong px-4 py-2 text-sm text-fg hover:bg-surface-hover"
          >
            Join session
          </Link>
        </div>
      </div>

      {memberships.length === 0 ? (
        <p className="text-fg-secondary">
          You're not in any sessions yet.{' '}
          <Link to="/sessions/new" className="text-accent hover:underline">
            Create one
          </Link>
          , or ask a DM for an invite code to join theirs.
        </p>
      ) : (
        <div className="space-y-3">
          {memberships.map((m) => (
            <div
              key={m.sessionId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-fg">{m.sessionName}</p>
                  {m.role === 'dm' && (
                    <span className="rounded border border-border bg-page px-2 py-0.5 text-xs text-warning">
                      DM
                    </span>
                  )}
                </div>
                <p className="text-sm text-fg-secondary">{GAME_LABELS[m.gameType] ?? m.gameType}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/sessions/${m.sessionId}`}
                  className="rounded bg-accent px-3 py-1.5 text-sm text-accent-fg hover:bg-accent-hover"
                >
                  Enter
                </Link>
                {m.role === 'dm' ? (
                  <button
                    onClick={() => handleEnd(m.sessionId)}
                    className="rounded bg-warning px-3 py-1.5 text-sm text-warning-fg hover:bg-warning-hover"
                  >
                    End session
                  </button>
                ) : (
                  <button
                    onClick={() => handleLeave(m.sessionId)}
                    className="rounded border border-border-strong px-3 py-1.5 text-sm text-fg hover:bg-surface-hover"
                  >
                    Leave
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}