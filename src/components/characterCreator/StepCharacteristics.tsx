import { useEffect } from 'react'
import {
  BBB_CAREERS,
  BBB_MAX_STARTING_CHARACTERISTIC,
  BBB_STARTING_CHARACTERISTIC,
} from '../../lib/gameConfigs/bbb'
import { characteristicCost, totalSpentXP, computeCareerSkills, type Characteristics } from '../../lib/genesysCalc'
import type { StepProps } from '../../pages/CreateCharacter'

const CHARACTERISTIC_LABELS: { key: keyof Characteristics; label: string }[] = [
  { key: 'brawn', label: 'Brawn' },
  { key: 'agility', label: 'Agility' },
  { key: 'intellect', label: 'Intellect' },
  { key: 'cunning', label: 'Cunning' },
  { key: 'willpower', label: 'Willpower' },
  { key: 'presence', label: 'Presence' },
]

export default function StepCharacteristics({ draft, updateDraft, setCanProceed, talentDocs }: StepProps) {
  useEffect(() => {
    setCanProceed(true) // no minimum spend required at this step
  }, [setCanProceed])

  const career = BBB_CAREERS.find((c) => c.name === draft.career.name)

  const spent = totalSpentXP(
    draft.characteristics,
    draft.skills,
    computeCareerSkills(draft.career, draft.talents, talentDocs),
    draft.career.chosenSkills,
    draft.talents
  )
  const available = draft.totalXP - spent

  function increase(key: keyof Characteristics) {
    const current = draft.characteristics[key]
    if (current >= BBB_MAX_STARTING_CHARACTERISTIC) return
    const nextCost = characteristicCost(current + 1) - characteristicCost(current)
    if (nextCost > available) return
    updateDraft({ characteristics: { ...draft.characteristics, [key]: current + 1 } })
  }

  function decrease(key: keyof Characteristics) {
    const current = draft.characteristics[key]
    if (current <= BBB_STARTING_CHARACTERISTIC) return
    updateDraft({ characteristics: { ...draft.characteristics, [key]: current - 1 } })
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-fg">Characteristics</h2>
      <p className="mb-4 text-sm text-fg-secondary">
        Available XP: <span className="font-semibold text-accent">{available}</span> / {draft.totalXP}
      </p>

      <div className="max-w-md space-y-2">
        {CHARACTERISTIC_LABELS.map(({ key, label }) => {
          const current = draft.characteristics[key]
          const nextCost =
            current < BBB_MAX_STARTING_CHARACTERISTIC
              ? characteristicCost(current + 1) - characteristicCost(current)
              : null

          return (
            <div
              key={key}
              className="flex items-center justify-between rounded border border-border bg-surface px-4 py-3"
            >
              <div>
                <p className="font-medium text-fg">{label}</p>
                {nextCost !== null && (
                  <p className="text-xs text-fg-muted">Next rank costs {nextCost} XP</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => decrease(key)}
                  disabled={current <= BBB_STARTING_CHARACTERISTIC}
                  className="h-8 w-8 rounded border border-border-strong text-fg hover:bg-surface-hover disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-6 text-center text-lg text-fg">{current}</span>
                <button
                  onClick={() => increase(key)}
                  disabled={
                    current >= BBB_MAX_STARTING_CHARACTERISTIC ||
                    (nextCost !== null && nextCost > available)
                  }
                  className="h-8 w-8 rounded border border-border-strong text-fg hover:bg-surface-hover disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}