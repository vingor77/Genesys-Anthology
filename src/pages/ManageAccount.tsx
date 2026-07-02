import { useState } from 'react'
import { updateProfile } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function ManageAccount() {
  const { user, logout } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  async function handleSave() {
    if (!user) return
    await updateProfile(user, { displayName })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">Manage Account</h1>
      <div className="max-w-sm space-y-4">
        <div>
          <label className="mb-1 block text-sm text-gray-400">Email</label>
          <p className="text-gray-300">{user?.email}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-400">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded bg-gray-700 px-3 py-2"
          />
        </div>
        <button onClick={handleSave} className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500">
          Save changes
        </button>
        {saved && <p className="text-sm text-green-400">Saved.</p>}
        <button onClick={handleLogout} className="block rounded bg-red-700 px-4 py-2 hover:bg-red-600">
          Log out
        </button>
      </div>
    </div>
  )
}