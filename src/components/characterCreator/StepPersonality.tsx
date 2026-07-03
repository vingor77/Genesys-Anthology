import { useEffect } from 'react'
import type { StepProps } from '../../pages/CreateCharacter'

const FIELDS: { key: 'strength' | 'flaw' | 'desire' | 'fear'; label: string; placeholder: string }[] = [
  { key: 'strength', label: 'Strength', placeholder: 'What is this character good at, as a person?' },
  { key: 'flaw', label: 'Flaw', placeholder: 'What is this character bad at, or held back by?' },
  { key: 'desire', label: 'Desire', placeholder: 'What does this character want?' },
  { key: 'fear', label: 'Fear', placeholder: 'What does this character fear?' },
]

export default function StepPersonality({ draft, updateDraft, setCanProceed }: StepProps) {
  const allFilled = FIELDS.every((f) => draft[f.key].trim().length > 0)

  useEffect(() => {
    setCanProceed(allFilled)
  }, [allFilled, setCanProceed])

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-fg">Personality</h2>
      <div className="max-w-lg space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm text-fg-secondary">{f.label}</label>
            <textarea
              value={draft[f.key]}
              onChange={(e) => updateDraft({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
              rows={2}
              className="w-full rounded border border-border-strong bg-page px-3 py-2 text-fg placeholder-fg-muted"
            />
          </div>
        ))}
      </div>
    </div>
  )
}