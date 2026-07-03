import { useEffect } from 'react'
import {
  BBB_CAREERS,
  BBB_SKILLS,
  BBB_SKILL_CHARACTERISTIC,
  BBB_SKILL_CATEGORY,
  BBB_SKILL_DESCRIPTIONS,
  SKILL_CATEGORY_ORDER,
  BBB_MAX_STARTING_SKILL_RANK,
} from '../../lib/gameConfigs/bbb'
import { skillCost, calculateDicePool, totalSpentXP } from '../../lib/genesysCalc'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepSkills({ draft, updateDraft, setCanProceed }: StepProps) {
  useEffect(() => {
    setCanProceed(true)
  }, [setCanProceed])

  const career = BBB_CAREERS.find((c) => c.name === draft.career)
  const careerSkillNames = career?.skills ?? []

  const spent = totalSpentXP(
    draft.characteristics,
    draft.skills,
    careerSkillNames,
    draft.freeSkillNames,
    draft.talents
  )
  const available = draft.totalXP - spent

  function getRank(skillName: string): number {
    return draft.skills.find((s) => s.name === skillName)?.rank ?? 0
  }

  function setRank(skillName: string, rank: number) {
    updateDraft({
      skills: draft.skills.map((s) => (s.name === skillName ? { ...s, rank } : s)),
    })
  }

  function increase(skillName: string, isCareer: boolean, freeRank: 0 | 1) {
    const current = getRank(skillName)
    if (current >= BBB_MAX_STARTING_SKILL_RANK) return
    const cost = skillCost(current + 1, isCareer, freeRank) - skillCost(current, isCareer, freeRank)
    if (cost > available) return
    setRank(skillName, current + 1)
  }

  function decrease(skillName: string, freeRank: 0 | 1) {
    const current = getRank(skillName)
    if (current <= freeRank) return
    setRank(skillName, current - 1)
  }

  function renderSkillRow(skillName: string) {
    const isCareer = careerSkillNames.includes(skillName)
    const rank = getRank(skillName)
    const freeRank: 0 | 1 = draft.freeSkillNames.includes(skillName) ? 1 : 0
    const characteristic = BBB_SKILL_CHARACTERISTIC[skillName]
    const characteristicRank = draft.characteristics[characteristic]
    const pool = calculateDicePool(characteristicRank, rank)
    const nextCost =
      rank < BBB_MAX_STARTING_SKILL_RANK
        ? skillCost(rank + 1, isCareer, freeRank) - skillCost(rank, isCareer, freeRank)
        : null

    return (
      <div
        key={skillName}
        className={`flex items-center justify-between rounded border bg-surface px-3 py-2 ${
          isCareer ? 'border-accent' : 'border-border'
        }`}
      >
        <div>
          <p className="text-sm text-fg">
            {skillName}{' '}
            <span className="text-xs text-fg-muted">
              ({characteristic.slice(0, 3).toUpperCase()})
            </span>
            {isCareer && <span className="ml-1 text-xs text-accent">★</span>}
          </p>
          <p className="text-xs text-fg-muted">
            {pool.ability}A {pool.proficiency}P
            {nextCost !== null && ` · +1 costs ${nextCost}`}
          </p>
          {BBB_SKILL_DESCRIPTIONS[skillName] && (
            <p className="mt-0.5 max-w-xs text-xs text-fg-muted">{BBB_SKILL_DESCRIPTIONS[skillName]}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => decrease(skillName, freeRank)}
            disabled={rank <= freeRank}
            className="h-7 w-7 rounded border border-border-strong text-fg hover:bg-surface-hover disabled:opacity-30"
          >
            −
          </button>
          <span className="w-4 text-center text-fg">{rank}</span>
          <button
            onClick={() => increase(skillName, isCareer, freeRank)}
            disabled={
              rank >= BBB_MAX_STARTING_SKILL_RANK || (nextCost !== null && nextCost > available)
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