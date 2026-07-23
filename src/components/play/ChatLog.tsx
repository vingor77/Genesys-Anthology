import { RolledDiceRow, RollResultSummary } from '../../icons/DiceIcons'
import type { RolledDie, RollResult } from '../../lib/genesysDice'

export interface RollChatEntry {
  id: string
  characterName: string
  label: string
  dice: RolledDie[]
  result: RollResult
  timestamp: number
}

// Local only for now — lives in the Play page's own React state, not
// Firestore. Sharing this across every player in a session (the actual
// end goal) needs a real design pass of its own: does each roll write to
// a session-scoped collection, does every client subscribe to it, does
// it get pruned after a session ends. Deliberately not guessed at here.
export default function ChatLog({ entries }: { entries: RollChatEntry[] }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-2">
        <h2 className="text-sm font-semibold text-fg">Chat</h2>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {entries.length === 0 && <p className="text-sm text-fg-muted">No rolls yet.</p>}
        {entries.map((entry) => (
          <div key={entry.id} className="rounded border border-border-strong bg-page p-3">
            <p className="text-xs text-fg-muted">
              <span className="font-medium text-fg">{entry.characterName}</span> rolled {entry.label}
            </p>
            <div className="mt-2">
              <RolledDiceRow dice={entry.dice} size={22} />
            </div>
            <div className="mt-2">
              <RollResultSummary result={entry.result} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}