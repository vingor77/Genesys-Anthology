import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError('Invalid email or password.')
    }
  }

  async function handleGoogleLogin() {
    setError('')
    try {
      await loginWithGoogle()
      navigate('/')
    } catch (err) {
      setError('Google sign-in failed.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <h1 className="mb-6 text-2xl font-bold text-fg">Log in</h1>
        {error && <p className="mb-4 text-sm text-warning">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded border border-border-strong bg-page px-3 py-2 text-fg placeholder-fg-muted"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-border-strong bg-page px-3 py-2 text-fg placeholder-fg-muted"
          required
        />
        <button
          type="submit"
          className="w-full rounded bg-accent py-2 font-medium text-accent-fg hover:bg-accent-hover"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mt-3 w-full rounded border border-border-strong bg-transparent py-2 font-medium text-fg hover:bg-surface-hover"
        >
          Continue with Google
        </button>
        <p className="mt-4 text-center text-sm text-fg-secondary">
          No account? <Link to="/signup" className="text-accent hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  )
}