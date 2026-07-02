import { useState } from 'react'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { auth, db } from '../lib/firebase'

export default function ManageAccount() {
  const { user, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!auth.currentUser) return

    await updateProfile(auth.currentUser, { displayName })
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName })

    await refreshUser()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-fg">Manage account</h1>
      <div className="max-w-sm space-y-4">
        <div>
          <label className="mb-1 block text-sm text-fg-secondary">Email</label>
          <p className="text-fg">{user?.email}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-fg-secondary">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded border border-border-strong bg-page px-3 py-2 text-fg"
          />
        </div>
        <button
          onClick={handleSave}
          className="rounded bg-accent px-4 py-2 text-accent-fg hover:bg-accent-hover"
        >
          Save changes
        </button>
        {saved && <p className="text-sm text-accent">Saved.</p>}
      </div>
    </div>
  )
}