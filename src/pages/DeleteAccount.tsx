import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deleteUser,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth'
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export default function DeleteAccount() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const navigate = useNavigate()

  const user = auth.currentUser
  const isGoogleUser = user?.providerData.some((p) => p.providerId === 'google.com')

  async function performDelete() {
    if (!user) return
    setError('')

    // Delete this user's memberships first — the account itself is about
    // to disappear, so nothing else will ever be able to clean these up.
    const membershipsSnap = await getDocs(
      query(collection(db, 'memberships'), where('uid', '==', user.uid))
    )
    await Promise.all(membershipsSnap.docs.map((m) => deleteDoc(m.ref)))

    await deleteDoc(doc(db, 'users', user.uid))
    await deleteUser(user)

    navigate('/login')
  }

  async function handleDeleteClick() {
    if (!user) return
    setError('')

    try {
      await performDelete()
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        // Session is too old — Firebase needs a fresh sign-in before it'll
        // allow account deletion, regardless of how the account was made.
        if (isGoogleUser) {
          try {
            await reauthenticateWithPopup(user, new GoogleAuthProvider())
            await performDelete()
          } catch {
            setError('Re-authentication failed. Please try again.')
          }
        } else {
          setConfirming(true)
        }
      } else {
        console.error('Delete account failed:', err)
        setError('Could not delete account. Check the console for details.')
      }
    }
  }

  async function handlePasswordReauth() {
    if (!user || !user.email) return
    setError('')
    try {
      const credential = EmailAuthProvider.credential(user.email, password)
      await reauthenticateWithCredential(user, credential)
      await performDelete()
    } catch (err) {
      setError('Incorrect password.')
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-fg">Delete account</h1>
      <p className="mb-6 max-w-sm text-sm text-fg-secondary">
        This permanently deletes your account and removes you from every session you're a
        member of. This cannot be undone.
      </p>

      {error && <p className="mb-4 max-w-sm text-sm text-warning">{error}</p>}

      {!confirming ? (
        <button
          onClick={handleDeleteClick}
          className="rounded bg-warning px-4 py-2 text-sm font-medium text-warning-fg hover:bg-warning-hover"
        >
          Delete my account
        </button>
      ) : (
        <div className="max-w-sm space-y-3">
          <p className="text-sm text-fg-secondary">
            For your security, please re-enter your password to confirm.
          </p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-border bg-page px-3 py-2 text-fg"
          />
          <button
            onClick={handlePasswordReauth}
            className="rounded bg-warning px-4 py-2 text-sm font-medium text-warning-fg hover:bg-warning-hover"
          >
            Confirm delete
          </button>
        </div>
      )}
    </div>
  )
}