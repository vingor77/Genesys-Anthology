import { useEffect } from 'react'
import {
  BBB_CAREERS,
  BBB_SKILLS,
  BBB_SKILL_CATEGORY,
  BBB_SKILL_CHARACTERISTIC_OVERRIDES,
  SKILL_CATEGORY_ORDER,
  BBB_MAX_STARTING_SKILL_RANK,
} from '../../lib/gameConfigs/bbb'
import { skillCost, calculateDicePool, totalSpentXP, computeCareerSkills, type Characteristics } from '../../lib/genesysCalc'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepSkills({ draft, updateDraft, setCanProceed, maxSkillRank, skillDocs, talentDocs }: StepProps) {
  const rankCap = maxSkillRank ?? BBB_MAX_STARTING_SKILL_RANK

  useEffect(() => {
    setCanProceed(true)
  }, [setCanProceed])

  const career = BBB_CAREERS.find((c) => c.name === draft.career.name)
  const careerSkillNames = computeCareerSkills(career?.chosenSkills.pool ?? [], draft.talents, talentDocs)

  const spent = totalSpentXP(
    draft.characteristics,
    draft.skills,
    careerSkillNames,
    draft.career.chosenSkills,
    draft.talents
  )
  const available = draft.totalXP - spent

  function getRank(skillId: string): number {
    return draft.skills.find((s) => s.name === skillId)?.rank ?? 0
  }

  function setRank(skillId: string, rank: number) {
    updateDraft({
      skills: draft.skills.map((s) => (s.name === skillId ? { ...s, rank } : s)),
    })
  }

  function increase(skillId: string, isCareer: boolean, freeRank: 0 | 1) {
    const current = getRank(skillId)
    if (current >= rankCap) return
    const cost = skillCost(current + 1, isCareer, freeRank) - skillCost(current, isCareer, freeRank)
    if (cost > available) return
    setRank(skillId, current + 1)
  }

  function decrease(skillId: string, freeRank: 0 | 1) {
    const current = getRank(skillId)
    if (current <= freeRank) return
    setRank(skillId, current - 1)
  }

  function renderSkillRow(skillId: string) {
    const doc = skillDocs.find((s) => s.id === skillId)
    if (!doc) return null

    const isCareer = careerSkillNames.includes(skillId)
    const rank = getRank(skillId)
    const freeRank: 0 | 1 = draft.career.chosenSkills.includes(skillId) ? 1 : 0
    // BB&B overrides Skulduggery to Agility — checked after the doc's own
    // default, same lookup used everywhere this matters.
    const characteristic = (BBB_SKILL_CHARACTERISTIC_OVERRIDES[skillId] ??
      doc.characteristic) as keyof Characteristics
    const characteristicRank = draft.characteristics[characteristic]
    const pool = calculateDicePool(characteristicRank, rank)
    const nextCost =
      rank < rankCap
        ? skillCost(rank + 1, isCareer, freeRank) - skillCost(rank, isCareer, freeRank)
        : null

    return (
      <div
        key={skillId}
        className={`flex items-center justify-between rounded border bg-surface px-3 py-2 ${
          isCareer ? 'border-accent' : 'border-border'
        }`}
      >
        <div>
          <p className="text-sm text-fg">
            {doc.name}{' '}
            <span className="text-xs text-fg-muted">
              ({characteristic.slice(0, 3).toUpperCase()})
            </span>
            {isCareer && <span className="ml-1 text-xs text-accent">★</span>}
          </p>
          <p className="text-xs text-fg-muted">
            {pool.ability}A {pool.proficiency}P
            {nextCost !== null && ` · +1 costs ${nextCost}`}
          </p>
          <p className="mt-0.5 max-w-xs text-xs text-green-400">{doc.description}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => decrease(skillId, freeRank)}
            disabled={rank <= freeRank}
            className="h-7 w-7 rounded border border-border-strong text-fg hover:bg-surface-hover disabled:opacity-30"
          >
            −
          </button>
          <span className="w-4 text-center text-fg">{rank}</span>
          <button
            onClick={() => increase(skillId, isCareer, freeRank)}
            disabled={
              rank >= rankCap || (nextCost !== null && nextCost > available)
            }
            className="h-7 w-7 rounded border border-border-strong text-fg hover:bg-surface-hover disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
    )
  }

  const skillsByCategory = (category: (typeof SKILL_CATEGORY_ORDER)[number]) =>
    BBB_SKILLS.filter((s) => BBB_SKILL_CATEGORY[s] === category)

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-fg">Skills</h2>
      <p className="mb-4 text-sm text-fg-secondary">
        Available XP: <span className="font-semibold text-accent">{available}</span> / {draft.totalXP}
        {' · '}
        <span className="text-accent">★</span> = career skill (cheaper to raise)
      </p>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {SKILL_CATEGORY_ORDER.map((category) => (
          <div key={category} className="lg:flex-1">
            <h3 className="mb-2 text-sm font-semibold text-fg-secondary">{category}</h3>
            <div className="space-y-1">
              {skillsByCategory(category).map((s) => renderSkillRow(s))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}