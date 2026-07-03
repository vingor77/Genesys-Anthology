import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { auth } from '../lib/firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [resetMessage, setResetMessage] = useState('')
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

  async function handleForgotPassword() {
    setError('')
    setResetMessage('')
    if (!email) {
      setError('Enter your email above first, then click "Forgot password?"')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      setResetMessage('Password reset email sent — check your inbox.')
    } catch (err) {
      setError('Could not send reset email. Check that the address is correct.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <h1 className="mb-6 text-2xl font-bold text-fg">Log in</h1>
        {error && <p className="mb-4 text-sm text-warning">{error}</p>}
        {resetMessage && <p className="mb-4 text-sm text-accent">{resetMessage}</p>}
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
          className="mb-2 w-full rounded border border-border-strong bg-page px-3 py-2 text-fg placeholder-fg-muted"
          required
        />
        <button
          type="button"
          onClick={handleForgotPassword}
          className="mb-4 text-sm text-accent hover:underline"
        >
          Forgot password?
        </button>
        <button
          type="submit"
          className="w-full rounded bg-accent py-2 font-medium text-accent-fg hover:bg-accent-hover"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mt-3 w-full rounded border border-border bg-transparent py-2 font-medium text-fg hover:bg-surface-hover"
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