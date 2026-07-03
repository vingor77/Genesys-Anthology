import { useEffect } from 'react'
import { BBB_CAREERS, BBB_FREE_CAREER_SKILL_PICKS } from '../../lib/gameConfigs/bbb'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepFreeSkills({ draft, updateDraft, setCanProceed }: StepProps) {
  const career = BBB_CAREERS.find((c) => c.name === draft.career)

  useEffect(() => {
    setCanProceed(draft.freeSkillNames.length === BBB_FREE_CAREER_SKILL_PICKS)
  }, [draft.freeSkillNames, setCanProceed])

  if (!career) return null

  const atLimit = draft.freeSkillNames.length >= BBB_FREE_CAREER_SKILL_PICKS

  function toggle(skillName: string) {
    const isSelected = draft.freeSkillNames.includes(skillName)
    if (!isSelected && atLimit) return

    const newFreeSkillNames = isSelected
      ? draft.freeSkillNames.filter((s) => s !== skillName)
      : [...draft.freeSkillNames, skillName]

    const newSkills = draft.skills.map((s) =>
      s.name === skillName ? { ...s, rank: isSelected ? 0 : 1 } : s
    )

    updateDraft({ freeSkillNames: newFreeSkillNames, skills: newSkills })
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-fg">Free career skills</h2>
      <p className="mb-4 max-w-md text-sm text-fg-secondary">
        Choose {BBB_FREE_CAREER_SKILL_PICKS} of {career.name}'s career skills to start with a free
        rank in ({draft.freeSkillNames.length}/{BBB_FREE_CAREER_SKILL_PICKS} selected).
      </p>
      <div className="flex max-w-2xl flex-wrap gap-2">
        {career.skills.map((skillName) => {
          const selected = draft.freeSkillNames.includes(skillName)
          const disabled = !selected && atLimit
          return (
            <button
              key={skillName}
              onClick={() => toggle(skillName)}
              disabled={disabled}
              className={`rounded border px-3 py-2 text-sm disabled:opacity-50 ${
                selected
                  ? 'border-accent bg-surface text-fg'
                  : 'border-border bg-surface text-fg-secondary hover:bg-surface-hover'
              }`}
            >
              {skillName}
            </button>
          )
        })}
      </div>
    </div>
  )
}