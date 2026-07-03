import { useEffect, useState } from 'react'
import { BBB_CAREERS, BBB_TALENTS, BBB_SKILLS, type TalentConfig } from '../../lib/gameConfigs/bbb'
import {
  canBuyTalent,
  totalSpentXP,
  getTalentPrerequisiteName,
  reconcileTalents,
  tierForRank,
  type TalentTier,
  type Characteristics,
} from '../../lib/genesysCalc'
import type { StepProps } from '../../pages/CreateCharacter'

const TIERS: TalentTier[] = [1, 2, 3, 4, 5]

const CHARACTERISTIC_OPTIONS: { key: keyof Characteristics; label: string }[] = [
  { key: 'brawn', label: 'Brawn' },
  { key: 'agility', label: 'Agility' },
  { key: 'intellect', label: 'Intellect' },
  { key: 'cunning', label: 'Cunning' },
  { key: 'willpower', label: 'Willpower' },
  { key: 'presence', label: 'Presence' },
]

export default function StepTalents({ draft, updateDraft, setCanProceed }: StepProps) {
  const [viewingTalent, setViewingTalent] = useState<TalentConfig | null>(null)
  const career = BBB_CAREERS.find((c) => c.name === draft.career)

  const spent = totalSpentXP(
    draft.characteristics,
    draft.skills,
    career?.skills ?? [],
    draft.freeSkillNames,
    draft.talents
  )
  const available = draft.totalXP - spent

  function ownedEntries(name: string) {
    return draft.talents.filter((t) => t.name === name).sort((a, b) => a.rank - b.rank)
  }
  function currentRank(name: string): number {
    const entries = ownedEntries(name)
    return entries.length > 0 ? entries[entries.length - 1].rank : 0
  }
  function hasName(name: string): boolean {
    return draft.talents.some((t) => t.name === name)
  }

  // ---- choice bookkeeping, keyed by `${talentName}:${rank}` ----
  const skillChoiceEntries = draft.talents
    .map((t) => {
      const config = BBB_TALENTS.find((c) => c.name === t.name)
      if (!config?.requiresSkillChoice) return null
      const needed = config.skillChoiceCountAtRank
        ? config.skillChoiceCountAtRank(t.rank)
        : (config.skillChoiceCount ?? 1)
      return { key: `${t.name}:${t.rank}`, name: t.name, rank: t.rank, needed, exclude: config.skillChoiceExclude ?? [] }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const characteristicChoiceEntries = draft.talents
    .map((t) => {
      const config = BBB_TALENTS.find((c) => c.name === t.name)
      if (!config?.requiresCharacteristicChoice) return null
      const needed = config.characteristicChoiceCount ?? 1
      return { key: `${t.name}:${t.rank}`, name: t.name, rank: t.rank, needed }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const allSkillChoicesMade = skillChoiceEntries.every((e) => {
    const picked = draft.talentSkillChoices[e.key] ?? []
    return picked.length === e.needed && picked.every(Boolean)
  })
  const allCharacteristicChoicesMade = characteristicChoiceEntries.every((e) => {
    const picked = draft.talentCharacteristicChoices[e.key] ?? []
    return picked.length === e.needed && picked.every(Boolean)
  })

  useEffect(() => {
    setCanProceed(allSkillChoicesMade && allCharacteristicChoicesMade)
  }, [allSkillChoicesMade, allCharacteristicChoicesMade, setCanProceed])

  function cleanChoicesFor(reconciled: typeof draft.talents) {
    const stillPairs = new Set(reconciled.map((t) => `${t.name}:${t.rank}`))
    const cleanedSkills = Object.fromEntries(
      Object.entries(draft.talentSkillChoices).filter(([k]) => stillPairs.has(k))
    )
    const cleanedChars = Object.fromEntries(
      Object.entries(draft.talentCharacteristicChoices).filter(([k]) => stillPairs.has(k))
    )
    return { cleanedSkills, cleanedChars }
  }

  // Handles both "first purchase" (rank 0 -> 1, at the talent's base tier)
  // and "rank up" (rank N -> N+1, at an escalated tier) — same operation,
  // since a first purchase is just rank 1 of something with no prior rank.
  function buyNextRank(talent: TalentConfig) {
    const rank = currentRank(talent.name)
    if (rank >= 1 && !talent.ranked) return // already owned and not ranked — nothing more to buy

    const nextRank = rank + 1
    const nextTier = tierForRank(talent.tier, nextRank)

    if (rank === 0) {
      const prereq = getTalentPrerequisiteName(talent.name)
      if (prereq && !hasName(prereq)) return
    }
    if (!canBuyTalent(draft.talents, nextTier)) return
    if (5 * nextTier > available) return

    updateDraft({ talents: [...draft.talents, { name: talent.name, tier: nextTier, rank: nextRank }] })
  }

  // Removes only the highest owned rank — for a non-ranked talent that's
  // its only rank, so this doubles as "Remove" for those.
  function rankDown(talent: TalentConfig) {
    const entries = ownedEntries(talent.name)
    if (entries.length === 0) return
    const topEntry = entries[entries.length - 1]
    const without = draft.talents.filter((t) => t !== topEntry)
    const reconciled = reconcileTalents(without)
    const { cleanedSkills, cleanedChars } = cleanChoicesFor(reconciled)
    updateDraft({
      talents: reconciled,
      talentSkillChoices: cleanedSkills,
      talentCharacteristicChoices: cleanedChars,
    })
  }

  function setSkillChoicePick(key: string, index: number, value: string) {
    const current = draft.talentSkillChoices[key] ?? []
    const updated = [...current]
    updated[index] = value
    updateDraft({ talentSkillChoices: { ...draft.talentSkillChoices, [key]: updated } })
  }

  function setCharacteristicChoicePick(key: string, index: number, value: string) {
    const current = draft.talentCharacteristicChoices[key] ?? []
    const updated = [...current]
    updated[index] = value
    updateDraft({
      talentCharacteristicChoices: { ...draft.talentCharacteristicChoices, [key]: updated },
    })
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-fg">Talents</h2>
      <p className="mb-4 text-sm text-fg-secondary">
        Available XP: <span className="font-semibold text-accent">{available}</span> / {draft.totalXP}
        {' · '}each tier needs at least 2 more owned at the tier below it
      </p>

      <div className="mb-4 flex gap-2">
        {TIERS.map((tier) => {
          const count = draft.talents.filter((t) => t.tier === tier).length
          return (
            <div
              key={tier}
              className={`flex-1 rounded border px-2 py-2 text-center ${
                count > 0 ? 'border-accent bg-surface' : 'border-border bg-surface'
              }`}
            >
              <p className="text-xs text-fg-muted">Tier {tier}</p>
              <p className={`text-lg font-semibold ${count > 0 ? 'text-accent' : 'text-fg-muted'}`}>
                {count}
              </p>
            </div>
          )
        })}
      </div>

      <div className="space-y-4">
        {TIERS.map((tier) => {
          const talentsAtTier = BBB_TALENTS.filter((t) => t.tier === tier)
          const slotsFilledAtTier = draft.talents.filter((t) => t.tier === tier).length

          return (
            <div key={tier}>
              <h3 className="mb-2 text-sm font-semibold text-fg-secondary">
                Tier {tier} <span className="text-fg-muted">({5 * tier} XP each)</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {talentsAtTier.map((talent) => {
                  const rank = currentRank(talent.name)
                  const owned = rank > 0

                  return (
                    <button
                      key={talent.name}
                      onClick={() => setViewingTalent(talent)}
                      className={`rounded border px-3 py-2 text-sm ${
                        owned
                          ? 'border-accent bg-surface text-fg'
                          : 'border-border bg-surface text-fg-secondary hover:bg-surface-hover'
                      }`}
                    >
                      {talent.name}
                      {owned && talent.ranked
                        ? talent.tier + rank - 1 > 5
                          ? ` • R${rank} (Tier 5)`
                          : ` • R${rank}`
                        : ''}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-fg-muted">{slotsFilledAtTier} owned at Tier {tier}</p>
            </div>
          )
        })}
      </div>

      {viewingTalent && (() => {
        const talent = viewingTalent
        const rank = currentRank(talent.name)
        const owned = rank > 0
        const canBuyMore = talent.ranked || rank === 0
        const nextRank = rank + 1
        const nextTier = tierForRank(talent.tier, nextRank)
        const prereq = getTalentPrerequisiteName(talent.name)
        const prereqMet = !prereq || hasName(prereq)
        const unlockedNext = canBuyTalent(draft.talents, nextTier)
        const affordableNext = 5 * nextTier <= available

        let blockedReason: string | null = null
        if (canBuyMore) {
          if (rank === 0 && !prereqMet) blockedReason = `Requires ${prereq} first`
          else if (!unlockedNext) blockedReason = `Locked — own more Tier ${nextTier - 1} talents`
          else if (!affordableNext) blockedReason = 'Not enough XP'
        }

        return (
          <div className="mt-4 rounded-lg border border-border bg-surface p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-semibold text-fg">
                {talent.name}
                {owned && talent.ranked && (
                  <span className="ml-2 text-xs text-accent">
                    Rank {rank}
                    {talent.tier + rank - 1 > 5 ? ' (Tier 5)' : ''}
                  </span>
                )}
              </p>
              <span className="text-xs text-fg-muted">Tier {talent.tier}</span>
            </div>
            <p className="text-sm text-fg-secondary">
              {talent.description ?? 'No description added yet'}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canBuyMore && (
                <button
                  onClick={() => buyNextRank(talent)}
                  disabled={!!blockedReason}
                  className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
                >
                  {rank === 0 ? `Buy (${5 * talent.tier} XP)` : `Rank up to ${nextRank} (${5 * nextTier} XP)`}
                </button>
              )}
              {owned && (
                <button
                  onClick={() => rankDown(talent)}
                  className="rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
                >
                  {talent.ranked && rank > 1 ? `Rank down to ${rank - 1}` : 'Remove'}
                </button>
              )}
            </div>

            {blockedReason && <p className="mt-2 text-xs text-warning">{blockedReason}</p>}
          </div>
        )
      })()}

      {skillChoiceEntries.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-fg">Skill choices</h3>
          <div className="space-y-3">
            {skillChoiceEntries.map((e) => {
              const picked = draft.talentSkillChoices[e.key] ?? []
              const usedByOtherRanks = Object.entries(draft.talentSkillChoices)
                .filter(([k]) => k.startsWith(`${e.name}:`) && k !== e.key)
                .flatMap(([, v]) => v)

              return (
                <div key={e.key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-fg">
                    {e.name}
                    {e.rank > 1 ? ` (Rank ${e.rank})` : ''}
                  </span>
                  <div className="flex flex-wrap justify-end gap-2">
                    {Array.from({ length: e.needed }).map((_, i) => {
                      const pickedElsewhereInThisEntry = picked.filter((_, idx) => idx !== i)
                      return (
                        <select
                          key={i}
                          value={picked[i] ?? ''}
                          onChange={(ev) => setSkillChoicePick(e.key, i, ev.target.value)}
                          className="rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                        >
                          <option value="" disabled>
                            Choose a skill
                          </option>
                          {BBB_SKILLS.filter(
                            (s) =>
                              !e.exclude.includes(s) &&
                              !pickedElsewhereInThisEntry.includes(s) &&
                              (!usedByOtherRanks.includes(s) || s === picked[i])
                          ).map((skill) => (
                            <option key={skill} value={skill}>
                              {skill}
                            </option>
                          ))}
                        </select>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {characteristicChoiceEntries.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-fg">Characteristic choices</h3>
          <div className="space-y-3">
            {characteristicChoiceEntries.map((e) => {
              const picked = draft.talentCharacteristicChoices[e.key] ?? []
              // Excludes characteristics already used by OTHER ranks of the
              // same talent (e.g. Dedication can't boost the same stat twice).
              const usedElsewhere = Object.entries(draft.talentCharacteristicChoices)
                .filter(([k]) => k.startsWith(`${e.name}:`) && k !== e.key)
                .flatMap(([, v]) => v)

              return (
                <div key={e.key} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-fg">
                    {e.name}
                    {e.rank > 1 ? ` (Rank ${e.rank})` : ''}
                  </span>
                  <div className="flex gap-2">
                    {Array.from({ length: e.needed }).map((_, i) => {
                      const pickedElsewhereInThisEntry = picked.filter((_, idx) => idx !== i)
                      return (
                        <select
                          key={i}
                          value={picked[i] ?? ''}
                          onChange={(ev) => setCharacteristicChoicePick(e.key, i, ev.target.value)}
                          className="rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                        >
                          <option value="" disabled>
                            Choose
                          </option>
                          {CHARACTERISTIC_OPTIONS.filter(
                            (c) =>
                              (!usedElsewhere.includes(c.key) && !pickedElsewhereInThisEntry.includes(c.key)) ||
                              c.key === picked[i]
                          ).map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}