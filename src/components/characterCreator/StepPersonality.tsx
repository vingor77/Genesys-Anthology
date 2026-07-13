import { useEffect } from 'react'
import type { StepProps } from '../../pages/CreateCharacter'

const FIELDS: { key: 'strength' | 'flaw' | 'desire' | 'fear'; label: string; placeholder: string }[] = [
  { key: 'strength', label: 'Strength', placeholder: 'What is this character good at, as a person?' },
  { key: 'flaw', label: 'Flaw', placeholder: 'What is this character bad at, or held back by?' },
  { key: 'desire', label: 'Desire', placeholder: 'What does this character want?' },
  { key: 'fear', label: 'Fear', placeholder: 'What does this character fear?' },
]

const APPEARANCE_FIELDS: { key: 'gender' | 'age' | 'height' | 'build' | 'hair' | 'eyes'; label: string }[] = [
  { key: 'gender', label: 'Gender' },
  { key: 'age', label: 'Age' },
  { key: 'height', label: 'Height' },
  { key: 'build', label: 'Build' },
  { key: 'hair', label: 'Hair' },
  { key: 'eyes', label: 'Eyes' },
]

export default function StepPersonality({ draft, updateDraft, setCanProceed }: StepProps) {
  const allFilled = FIELDS.every((f) => draft[f.key].trim().length > 0)

  // Personality alone gates moving forward — Appearance is genuinely
  // optional here, since it's often easier to settle once a character's
  // actually been played a bit rather than decided up front.
  useEffect(() => {
    setCanProceed(allFilled)
  }, [allFilled, setCanProceed])

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-fg">Identity</h2>

      <h3 className="mb-2 text-sm font-semibold text-fg-secondary">Personality</h3>
      <div className="grid max-w-[800px] grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium text-fg-secondary">{f.label}</label>
            <textarea
              value={draft[f.key]}
              onChange={(e) => updateDraft({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
              rows={2}
              className="w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm text-fg placeholder-fg-muted"
            />
          </div>
        ))}
      </div>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-fg-secondary">
        Appearance <span className="font-normal text-fg-muted">(optional — fine to leave for later)</span>
      </h3>
      <div className="grid max-w-[800px] grid-cols-2 gap-4 sm:grid-cols-3">
        {APPEARANCE_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium text-fg-secondary">{f.label}</label>
            <input
              value={draft.description[f.key] ?? ''}
              onChange={(e) => updateDraft({ description: { ...draft.description, [f.key]: e.target.value } })}
              className="w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm text-fg"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 max-w-[800px]">
        <label className="mb-1 block text-sm font-medium text-fg-secondary">Notable Features</label>
        <textarea
          value={draft.description.notable ?? ''}
          onChange={(e) => updateDraft({ description: { ...draft.description, notable: e.target.value } })}
          rows={2}
          placeholder="Scars, tattoos, anything that stands out"
          className="w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm text-fg placeholder-fg-muted"
        />
      </div>
    </div>
  )
}