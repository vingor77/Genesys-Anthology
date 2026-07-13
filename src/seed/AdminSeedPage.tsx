import { useState } from 'react'
import { Link } from 'react-router-dom'
import { writeBatch, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { QUALITIES } from './Qualities'
import { KEYWORDS } from './Keywords'
import { SKILLS } from './Skills'
import { TALENTS } from './Talents'
import { CRITICAL_INJURIES } from './CriticalInjuries'
import { OBJECTS } from './Objects'

// TEMPORARY — delete this whole file (and the route pointing to it) once
// all collections are seeded. Not linked from anywhere in the app nav;
// visit its route directly to use it.
export default function AdminSeedPage() {
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [testCharacterId, setTestCharacterId] = useState('')

  async function seedCollection(collectionName: string, items: { id: string }[]) {
    setStatus('working')
    setMessage('')
    try {
      const batch = writeBatch(db)
      for (const item of items) {
        batch.set(doc(db, collectionName, item.id), item)
      }
      await batch.commit()
      setStatus('done')
      setMessage(`Wrote ${items.length} documents to "${collectionName}".`)
    } catch (err) {
      console.error('Seed failed:', err)
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-xl font-semibold text-fg">Admin: Seed Database</h1>
      <p className="mb-4 text-sm text-fg-secondary">
        Temporary page. Writes seed collections to Firestore. Delete this file and its route
        once every collection is seeded.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => seedCollection('qualities', QUALITIES)}
          disabled={status === 'working'}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
        >
          {status === 'working' ? 'Seeding…' : `Seed Qualities (${QUALITIES.length})`}
        </button>
        <button
          onClick={() => seedCollection('keywords', KEYWORDS)}
          disabled={status === 'working'}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
        >
          {status === 'working' ? 'Seeding…' : `Seed Keywords (${KEYWORDS.length})`}
        </button>
        <button
          onClick={() => seedCollection('skills', SKILLS)}
          disabled={status === 'working'}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
        >
          {status === 'working' ? 'Seeding…' : `Seed Skills (${SKILLS.length})`}
        </button>
        <button
          onClick={() => seedCollection('talents', TALENTS)}
          disabled={status === 'working'}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
        >
          {status === 'working' ? 'Seeding…' : `Seed Talents (${TALENTS.length})`}
        </button>
        <button
          onClick={() => seedCollection('criticalInjuries', CRITICAL_INJURIES)}
          disabled={status === 'working'}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
        >
          {status === 'working' ? 'Seeding…' : `Seed Critical Injuries (${CRITICAL_INJURIES.length})`}
        </button>
        <button
          onClick={() => seedCollection('objects', OBJECTS)}
          disabled={status === 'working'}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
        >
          {status === 'working' ? 'Seeding…' : `Seed Objects (${OBJECTS.length})`}
        </button>
      </div>

      {message && (
        <p className={`mt-3 text-sm ${status === 'error' ? 'text-warning' : 'text-fg-secondary'}`}>
          {message}
        </p>
      )}

      <div className="mt-6 max-w-md rounded-lg border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-fg">Test: view a character sheet</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Paste a character's Firestore document ID (from the console) to jump straight to its sheet.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={testCharacterId}
            onChange={(e) => setTestCharacterId(e.target.value)}
            placeholder="Character document ID"
            className="flex-1 rounded border border-border-strong bg-page px-3 py-2 text-sm text-fg"
          />
          <Link
            to={`/characters/${testCharacterId}`}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover"
          >
            View Sheet
          </Link>
        </div>
      </div>

      {/* Add one button per collection here as each is drafted:
          Skills, Talents, Critical Injuries, Objects — same pattern,
          each importing its own seed array and writing via writeBatch. */}
    </div>
  )
}