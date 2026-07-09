import { useEffect, useState } from 'react'
import { BBB_CAREERS } from '../../lib/gameConfigs/bbb'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepFreeSkills({ draft, updateDraft, setCanProceed, skillDocs }: StepProps) {
  const [viewingSkillId, setViewingSkillId] = useState<string | null>(null)
  const career = BBB_CAREERS.find((c) => c.name === draft.career.name)
  const pickCount = career?.chosenSkills.count ?? 0

  useEffect(() => {
    setCanProceed(draft.career.chosenSkills.length === pickCount)
  }, [draft.career.chosenSkills, pickCount, setCanProceed])

  if (!career) return null

  const atLimit = draft.career.chosenSkills.length >= pickCount

  function toggle(skillId: string) {
    setViewingSkillId(skillId)
    const isSelected = draft.career.chosenSkills.includes(skillId)
    if (!isSelected && atLimit) return

    const newChosenSkills = isSelected
      ? draft.career.chosenSkills.filter((s) => s !== skillId)
      : [...draft.career.chosenSkills, skillId]

    const newSkills = draft.skills.map((s) =>
      s.name === skillId ? { ...s, rank: isSelected ? 0 : 1 } : s
    )

    updateDraft({ career: { ...draft.career, chosenSkills: newChosenSkills }, skills: newSkills })
  }

  const viewingSkill = viewingSkillId ? skillDocs.find((s) => s.id === viewingSkillId) ?? null : null

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-fg">Free career skills</h2>
      <p className="mb-4 text-sm text-fg-secondary">
        Choose {pickCount} —{' '}
        <span className="font-medium text-accent">
          {draft.career.chosenSkills.length}/{pickCount} selected
        </span>
      </p>

      <div className="grid max-w-[800px] grid-cols-1 gap-2 sm:grid-cols-4">
        {career.chosenSkills.pool.map((skillId) => {
          const doc = skillDocs.find((s) => s.id === skillId)
          const selected = draft.career.chosenSkills.includes(skillId)
          const disabled = !selected && atLimit
          return (
            <button
              key={skillId}
              onClick={() => toggle(skillId)}
              disabled={disabled}
              className={`h-12 w-full rounded border px-3 py-2 text-sm disabled:opacity-40 ${
                selected
                  ? 'border-accent bg-accent/10 text-fg'
                  : 'border-border bg-surface text-fg-secondary hover:bg-surface-hover'
              }`}
            >
              {doc?.name ?? skillId}
              {selected && <span className="ml-1 text-accent">✓</span>}
            </button>
          )
        })}
      </div>

      {viewingSkill && (
        <div className="mt-4 max-w-[800px] rounded-lg border border-accent bg-surface p-4">
          <p className="font-semibold text-fg">
            {viewingSkill.name}{' '}
            <span className="text-xs text-fg-muted capitalize">({viewingSkill.characteristic})</span>
          </p>
          <p className="mt-1 text-sm text-fg-secondary">{viewingSkill.description}</p>
        </div>
      )}
    </div>
  )
}