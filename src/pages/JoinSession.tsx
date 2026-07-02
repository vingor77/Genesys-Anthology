import { useState, useEffect, type SubmitEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { findSessionByCode, joinSession } from '../lib/sessions'

export default function JoinSession() {
  const { code: codeFromUrl } = useParams()
  const [code, setCode] = useState(codeFromUrl ?? '')
  const [error, setError] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  async function attemptJoin(joinCode: string) {
    if (!user || !joinCode) return
    setError('')
    const session = await findSessionByCode(joinCode)
    if (!session) {
      setError('No session found with that code.')
      return
    }
    await joinSession(session.id, user.uid, user.displayName ?? user.email ?? 'Player')
    navigate(`/sessions/${session.id}`)
  }

  useEffect(() => {
    if (codeFromUrl) {
      attemptJoin(codeFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl])

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    attemptJoin(code)
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">Join Session</h1>
      <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div>
          <label className="mb-1 block text-sm text-gray-400">Invite code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded bg-gray-700 px-3 py-2 uppercase tracking-widest"
            required
          />
        </div>
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500">
          Join
        </button>
      </form>
    </div>
  )
}