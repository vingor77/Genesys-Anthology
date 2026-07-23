import { useState } from 'react'
import DiceRoller from './DiceRoller'
import type { RolledDie, RollResult } from '../../lib/genesysDice'
import { addSlot, removeSlot, type InitiativeSlot } from '../../lib/initiativeTracker'

export default function InitiativeTracker({
  onActiveChange,
}: {
  // Reports Start/End Encounter up to a parent (PlayPage) that needs to
  // know too — Berserk's requiresActiveEncounter gate, specifically.
  // This tracker still owns the actual slot list; this is just the
  // on/off state, same "doesn't reach into anything else" boundary as
  // before, just now visible outside this component as well.
  onActiveChange?: (active: boolean) => void
} = {}) {
  const [active, setActive] = useState(false)
  const [slots, setSlots] = useState<InitiativeSlot[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [rollingLabel, setRollingLabel] = useState('')
  const [rollingSide, setRollingSide] = useState<'ally' | 'adversary'>('ally')
  const [showRoller, setShowRoller] = useState(false)

  function handleStart() {
    setActive(true)
    onActiveChange?.(true)
    setSlots([])
    setCurrentIndex(0)
  }

  // Deliberately just resets local state otherwise — this tracker
  // doesn't reach into anything else (usesRemaining resets, status
  // removal, etc.). Those are separate systems that would read "an
  // encounter just ended" from wherever this lives, not something this
  // component triggers, aside from the plain on/off signal above.
  function handleEnd() {
    setActive(false)
    onActiveChange?.(false)
    setSlots([])
    setCurrentIndex(0)
    setShowRoller(false)
  }

  function handleInitiativeRollComplete(_dice: RolledDie[], result: RollResult) {
    if (!rollingLabel.trim()) return
    setSlots((prev) => addSlot(prev, rollingLabel.trim(), rollingSide, result.netSuccess, result.netAdvantage))
    setRollingLabel('')
    setShowRoller(false)
  }

  function handleRemoveSlot(id: string) {
    setSlots((prev) => {
      const next = removeSlot(prev, id)
      if (currentIndex >= next.length) setCurrentIndex(0)
      return next
    })
  }

  function handleNextTurn() {
    if (slots.length === 0) return
    setCurrentIndex((i) => (i + 1) % slots.length)
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg">Initiative Tracker</h2>
        {!active ? (
          <button
            onClick={handleStart}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:bg-accent-hover"
          >
            Start Encounter
          </button>
        ) : (
          <button
            onClick={handleEnd}
            className="rounded border border-border-strong px-3 py-1.5 text-sm text-fg hover:bg-surface-hover"
          >
            End Encounter
          </button>
        )}
      </div>

      {active && (
        <>
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded border border-border-strong bg-page p-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-fg-muted">Name</label>
              <input
                value={rollingLabel}
                onChange={(e) => setRollingLabel(e.target.value)}
                placeholder="Who's rolling?"
                className="rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-fg-muted">Side</label>
              <select
                value={rollingSide}
                onChange={(e) => setRollingSide(e.target.value as 'ally' | 'adversary')}
                className="rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
              >
                <option value="ally">Ally</option>
                <option value="adversary">Adversary</option>
              </select>
            </div>
            <button
              onClick={() => setShowRoller((s) => !s)}
              disabled={!rollingLabel.trim()}
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
            >
              {showRoller ? 'Cancel' : 'Roll Initiative'}
            </button>
          </div>

          {showRoller && (
            <div className="mb-3">
              <DiceRoller onRollComplete={handleInitiativeRollComplete} />
            </div>
          )}

          {slots.length > 0 && (
            <>
              <div className="space-y-1.5">
                {slots.map((slot, i) => (
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
                      i === currentIndex
                        ? 'border-accent bg-accent/10 text-fg'
                        : 'border-border-strong bg-page text-fg-secondary'
                    }`}
                  >
                    <span>
                      {i === currentIndex && <span className="mr-2 font-semibold text-accent">▶</span>}
                      {slot.label}{' '}
                      <span className="text-xs text-fg-muted">
                        ({slot.side === 'ally' ? 'Ally' : 'Adversary'} — {slot.successes} success
                        {slot.successes !== 1 ? 'es' : ''}
                        {slot.advantages !== 0 ? `, ${slot.advantages} adv` : ''})
                      </span>
                    </span>
                    <button onClick={() => handleRemoveSlot(slot.id)} className="text-xs text-fg-muted hover:text-warning">
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleNextTurn}
                className="mt-3 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover"
              >
                Next Turn
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}