import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  subscribeToSession,
  subscribeToPlayers,
  type Session,
  type SessionPlayer,
} from '../lib/sessions'

export default function SessionPage() {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<SessionPlayer[]>([])

  useEffect(() => {
    if (!sessionId) return
    const unsubSession = subscribeToSession(sessionId, setSession)
    const unsubPlayers = subscribeToPlayers(sessionId, setPlayers)
    return () => {
      unsubSession()
      unsubPlayers()
    }
  }, [sessionId])

  if (!session) {
    return <div className="p-8 text-white">Loading session…</div>
  }

  const isDM = user?.uid === session.dmId
  const inviteLink = `${window.location.origin}/join/${session.inviteCode}`

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="text-2xl font-bold">{session.name}</h1>
      <p className="mb-1 text-gray-400">Game: {session.gameType}</p>
      <p className="mb-4 text-gray-400">DM: {session.dmName}</p>

      {isDM && (
        <div className="mb-6 rounded bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Invite code</p>
          <p className="text-xl font-mono">{session.inviteCode}</p>
          <p className="mt-2 text-sm text-gray-400">Invite link</p>
          <p className="break-all text-sm text-blue-400">{inviteLink}</p>
        </div>
      )}

      <div className="rounded bg-gray-800 p-4">
        <h2 className="mb-2 font-semibold">Players ({players.length})</h2>
        <ul className="space-y-1">
          {players.map((p) => (
            <li key={p.uid} className="text-gray-300">
              {p.displayName}
              {p.uid === session.dmId ? ' (DM)' : ''}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-sm text-gray-500">
        {isDM ? 'You are the DM of this session.' : 'You are a player in this session.'}
      </p>
    </div>
  )
}