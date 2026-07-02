import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { label: 'Sessions', to: '/sessions' },
  { label: 'Create session', to: '/sessions/new' },
  { label: 'Join session', to: '/join' },
  { label: 'Manage account', to: '/manage' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="border-b border-border bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-fg">
          Genesys Anthology
        </Link>

        {/* Desktop links — hidden below the md breakpoint */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="text-sm text-fg-secondary hover:text-fg">
              {link.label}
            </Link>
          ))}
          <span className="text-sm text-fg-muted">{user?.displayName ?? user?.email}</span>
          <button
            onClick={handleLogout}
            className="rounded bg-warning px-3 py-1.5 text-sm font-medium text-warning-fg hover:bg-warning-hover"
          >
            Log out
          </button>
        </div>

        {/* Hamburger button — hidden at md and above */}
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded text-fg md:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown — only rendered when menuOpen is true */}
      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="rounded px-2 py-2 text-sm text-fg-secondary hover:bg-surface-hover hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-border pt-2">
            <p className="px-2 pb-2 text-sm text-fg-muted">{user?.displayName ?? user?.email}</p>
            <button
              onClick={handleLogout}
              className="w-full rounded bg-warning px-3 py-2 text-sm font-medium text-warning-fg hover:bg-warning-hover"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}