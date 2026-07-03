import { useEffect } from 'react'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepBasics({ draft, updateDraft, setCanProceed }: StepProps) {
  const canContinue = draft.characterName.trim().length > 0 && draft.playerName.trim().length > 0

  useEffect(() => {
    setCanProceed(canContinue)
  }, [canContinue, setCanProceed])

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-fg">Basics</h2>
      <div className="max-w-sm space-y-4">
        <div>
          <label className="mb-1 block text-sm text-fg-secondary">Character name</label>
          <input
            value={draft.characterName}
            onChange={(e) => updateDraft({ characterName: e.target.value })}
            className="w-full rounded border border-border bg-page px-3 py-2 text-fg"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-fg-secondary">Player name</label>
          <input
            value={draft.playerName}
            onChange={(e) => updateDraft({ playerName: e.target.value })}
            className="w-full rounded border border-border bg-page px-3 py-2 text-fg"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-fg-secondary">Species / Archetype</label>
          <p className="text-fg">{draft.speciesArchetype}</p>
        </div>
      </div>
    </div>
  )
}