import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  subscribeToSession,
  subscribeToRoster,
  type Session,
  type Membership,
} from '../lib/sessions'

export default function SessionPage() {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
  const [roster, setRoster] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  async function handleCopy(text: string, which: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 1500)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  useEffect(() => {
    if (!sessionId) return
    let sessionLoaded = false
    let rosterLoaded = false

    const unsubSession = subscribeToSession(sessionId, (s) => {
      setSession(s)
      sessionLoaded = true
      if (rosterLoaded) setLoading(false)
    })
    const unsubRoster = subscribeToRoster(sessionId, (r) => {
      setRoster(r)
      rosterLoaded = true
      if (sessionLoaded) setLoading(false)
    })

    return () => {
      unsubSession()
      unsubRoster()
    }
  }, [sessionId])

  if (loading) {
    return <p className="text-fg-secondary">Loading session…</p>
  }

  if (!session) {
    return <p className="text-fg-secondary">This session no longer exists.</p>
  }

  const isDM = user?.uid === session.dmId
  const inviteLink = `${window.location.origin}/join/${session.inviteCode}`

  return (
    <div>
      <h1 className="text-2xl font-bold text-fg">{session.name}</h1>
      <p className="mb-1 text-fg-secondary">Game: {session.gameType}</p>
      <p className="mb-4 text-fg-secondary">DM: {session.dmName}</p>

      {isDM && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-fg-secondary">Invite code (tap to copy)</p>
          <button
            onClick={() => handleCopy(session.inviteCode, 'code')}
            className="block text-left text-xl font-mono text-fg hover:text-accent"
          >
            {session.inviteCode}
          </button>
          {copied === 'code' && <p className="text-xs text-accent">Copied</p>}

          <p className="mt-3 text-sm text-fg-secondary">Invite link (tap to copy)</p>
          <button
            onClick={() => handleCopy(inviteLink, 'link')}
            className="block break-all text-left text-sm text-accent hover:underline"
          >
            {inviteLink}
          </button>
          {copied === 'link' && <p className="text-xs text-accent">Copied</p>}
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 font-semibold text-fg">Players ({roster.length})</h2>
        <ul className="space-y-1">
          {roster.map((m) => (
            <li key={m.uid} className="text-fg-secondary">
              {m.displayName}
              {m.role === 'dm' ? ' (DM)' : ''}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-sm text-fg-muted">
        {isDM ? 'You are the DM of this session.' : 'You are a player in this session.'}
      </p>

      <Link
        to={`/sessions/${session.id}/characters/new`}
        className="mt-4 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover"
      >
        Create a character
      </Link>
    </div>
  )
}