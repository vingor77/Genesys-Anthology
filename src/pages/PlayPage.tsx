import { useState } from 'react'
import CharacterSheet from './CharacterSheet'
import RollModal from '../components/play/RollModal'
import ChatLog from '../components/play/ChatLog'
import InitiativeTracker from '../components/play/InitiativeTracker'
import type { RollChatEntry } from '../components/play/ChatLog'
import type {
  AppliedModifiers,
  AppliedResultModifiers,
  ManualToggleOption,
  DicePoolCounts,
  RolledDie,
  RollResult,
} from '../lib/genesysDice'

interface ActiveRoll {
  pool: DicePoolCounts
  appliedModifiers?: AppliedModifiers
  appliedResultModifiers?: AppliedResultModifiers
  // Every autoApply:false pool/result modifier the character has access
  // to for this specific roll — RollModal renders these as its own
  // checkbox panel and combines whichever get checked with the two
  // fixed auto-apply fields above. This page doesn't need to know
  // anything about what's inside the list, just pass it through.
  manualToggleOptions?: ManualToggleOption[]
  label: string
  characterName: string
  // Fires once the roll actually resolves (Roll clicked inside the
  // modal), not when the roll button that opened this modal was clicked
  // — lets CharacterSheet consume one-time effects like Stinger's
  // pending difficulty bump only once the roll genuinely happens,
  // rather than the moment the modal opens (which would still burn the
  // effect even if the player cancels out without rolling).
  onResolved?: (dice: RolledDie[], result: RollResult, strainSpent: number) => void
}

// Relies on CharacterSheet's own useParams() call for characterId — this
// page needs to be mounted on a route that still has :characterId in its
// path (e.g. /sessions/:sessionId/play/:characterId), same as the
// standalone sheet route does today. I don't have visibility into the
// actual router config, so wiring the route itself is a separate step.
export default function PlayPage() {
  const [activeRoll, setActiveRoll] = useState<ActiveRoll | null>(null)
  const [chatEntries, setChatEntries] = useState<RollChatEntry[]>([])
  // Lifted up from InitiativeTracker so CharacterSheet can see it too —
  // needed for Berserk's requiresActiveEncounter gate. InitiativeTracker
  // still owns the actual slot list; this is just the on/off state.
  const [encounterActive, setEncounterActive] = useState(false)

  function handleRollComplete(dice: RolledDie[], result: RollResult, strainSpent: number) {
    if (!activeRoll) return
    activeRoll.onResolved?.(dice, result, strainSpent)
    setChatEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        characterName: activeRoll.characterName,
        label: activeRoll.label,
        dice,
        result,
        timestamp: Date.now(),
      },
    ])
    // Closes the moment the roll resolves — "disappears after the roll
    // button is clicked, just shows results in the chat" was explicit.
    setActiveRoll(null)
  }

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      <div className="min-w-0 lg:flex-1">
        <CharacterSheet
          encounterActive={encounterActive}
          onRoll={(pool, label, characterName, appliedModifiers, appliedResultModifiers, manualToggleOptions, onResolved) =>
            setActiveRoll({
              pool,
              appliedModifiers,
              appliedResultModifiers,
              manualToggleOptions,
              label,
              characterName,
              onResolved,
            })
          }
        />
      </div>
      <div className="flex min-w-0 flex-col gap-4 lg:w-80 lg:shrink-0">
        <InitiativeTracker onActiveChange={setEncounterActive} />
        <ChatLog entries={chatEntries} />
      </div>

      {activeRoll && (
        <RollModal
          initialPool={activeRoll.pool}
          appliedModifiers={activeRoll.appliedModifiers}
          appliedResultModifiers={activeRoll.appliedResultModifiers}
          manualToggleOptions={activeRoll.manualToggleOptions}
          label={activeRoll.label}
          onComplete={handleRollComplete}
          onCancel={() => setActiveRoll(null)}
        />
      )}
    </div>
  )
}