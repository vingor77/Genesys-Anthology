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
    try {
      const session = await findSessionByCode(joinCode)
      if (!session) {
        setError('No session found with that code.')
        return
      }
      await joinSession(session.id, user.uid, user.displayName ?? user.email ?? 'Player')
      navigate(`/sessions/${session.id}`)
    } catch (err) {
      setError('Could not join that session. Please try again.')
    }
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
    <div>
      <h1 className="mb-6 text-2xl font-bold text-fg">Join session</h1>
      <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
        {error && <p className="text-sm text-warning">{error}</p>}
        <div>
          <label className="mb-1 block text-sm text-fg-secondary">Invite code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded border border-border-strong bg-page px-3 py-2 uppercase tracking-widest text-fg"
            required
          />
        </div>
        <button
          type="submit"
          className="rounded bg-accent px-4 py-2 text-accent-fg hover:bg-accent-hover"
        >
          Join
        </button>
      </form>
    </div>
  )
}