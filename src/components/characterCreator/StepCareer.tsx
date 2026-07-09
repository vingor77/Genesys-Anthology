import { useEffect, useState } from 'react'
import { BBB_CAREERS } from '../../lib/gameConfigs/bbb'
import { buildInitialDraft } from '../../pages/CreateCharacter'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepCareer({ draft, updateDraft, setCanProceed, skillDocs }: StepProps) {
  const [viewingCareerName, setViewingCareerName] = useState<string | null>(null)

  useEffect(() => {
    setCanProceed(!!draft.career.name)
  }, [draft.career.name, setCanProceed])

  function selectCareer(careerName: string) {
    const career = BBB_CAREERS.find((c) => c.name === careerName)
    if (!career) return
    setViewingCareerName(careerName)

    const isActualChange = draft.career.name !== '' && draft.career.name !== careerName
    if (isActualChange) {
      // Full reset — every field gets rebuilt fresh from the same
      // function the wizard uses to initialize itself, rather than
      // manually listing which fields to clear. That was the bug last
      // time: only skills/talents got reset by hand, and anything else
      // added later (weapon, armor, gear, custom items, personality) was
      // silently left stale. Only identity fields the player already
      // typed in survive the reset.
      updateDraft({
        ...buildInitialDraft(draft.playerName),
        characterName: draft.characterName,
        career: { name: career.name, specialAbility: career.specialAbility, chosenSkills: [] },
      })
    } else {
      updateDraft({
        career: { name: career.name, specialAbility: career.specialAbility, chosenSkills: [] },
      })
    }
  }

  function skillName(id: string): string {
    return skillDocs.find((s) => s.id === id)?.name ?? id
  }

  const viewingCareer = viewingCareerName ? BBB_CAREERS.find((c) => c.name === viewingCareerName) ?? null : null

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-fg">Career</h2>
      <p className="mb-4 text-sm text-fg-secondary">
        {draft.career.name && (
          <span className="font-medium text-accent">{draft.career.name} selected</span>
        )}
      </p>

      <div className="grid max-w-[800px] grid-cols-1 gap-2 sm:grid-cols-4">
        {BBB_CAREERS.map((career) => {
          const selected = draft.career.name === career.name
          return (
            <button
              key={career.name}
              onClick={() => selectCareer(career.name)}
              className={`h-12 w-full rounded border px-3 py-2 text-sm ${
                selected
                  ? 'border-accent bg-accent/10 text-fg'
                  : 'border-border bg-surface text-fg-secondary hover:bg-surface-hover'
              }`}
            >
              {career.name}
              {selected && <span className="ml-1 text-accent">✓</span>}
            </button>
          )
        })}
      </div>

      {viewingCareer && (
        <div className="mt-4 max-w-[800px] rounded-lg border border-accent bg-surface p-4">
          <p className="font-semibold text-fg">{viewingCareer.name}</p>

          <div className="mt-3 rounded border-l-4 border-accent bg-accent/10 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {viewingCareer.specialAbility.name}
            </p>
            <p className="text-sm text-fg">{viewingCareer.specialAbility.description}</p>
          </div>

          <p className="mt-3 text-xs text-fg-muted">
            Career skills: {viewingCareer.chosenSkills.pool.map(skillName).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}