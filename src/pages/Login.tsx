import { useState, type SubmitEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: SubmitEvent) {
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
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-gray-800 p-8">
        <h1 className="mb-6 text-2xl font-bold text-white">Log in</h1>
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded bg-gray-700 px-3 py-2 text-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded bg-gray-700 px-3 py-2 text-white"
          required
        />
        <button type="submit" className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-500">
          Log in
        </button>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mt-3 w-full rounded bg-white py-2 font-medium text-gray-900 hover:bg-gray-200"
        >
          Continue with Google
        </button>
        <p className="mt-4 text-center text-sm text-gray-400">
          No account? <Link to="/signup" className="text-blue-400 hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  )
}