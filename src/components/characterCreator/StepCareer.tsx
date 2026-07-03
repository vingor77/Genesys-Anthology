import { useEffect } from 'react'
import { BBB_CAREERS } from '../../lib/gameConfigs/bbb'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepCareer({ draft, updateDraft, setCanProceed }: StepProps) {
  useEffect(() => {
    setCanProceed(!!draft.career)
  }, [draft.career, setCanProceed])

  function selectCareer(careerName: string) {
    updateDraft({ career: careerName, freeSkillNames: [] })
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-fg">Career</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BBB_CAREERS.map((career) => {
          const selected = draft.career === career.name
          return (
            <button
              key={career.name}
              onClick={() => selectCareer(career.name)}
              className={`rounded-lg border p-4 text-left ${
                selected ? 'border-accent bg-surface' : 'border-border bg-surface hover:bg-surface-hover'
              }`}
            >
              <p className="font-semibold text-fg">{career.name}</p>
              <p className="mt-1 text-sm text-accent">{career.specialAbility.name}</p>
              <p className="mt-1 text-sm text-fg-secondary">{career.specialAbility.description}</p>
              <p className="mt-2 text-xs text-fg-muted">{career.skills.join(', ')}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}