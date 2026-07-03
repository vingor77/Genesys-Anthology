import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page text-center">
      <h1 className="text-4xl font-bold text-fg">404</h1>
      <p className="text-fg-secondary">This page doesn't exist.</p>
      <Link
        to="/"
        className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover"
      >
        Back to home
      </Link>
    </div>
  )
}