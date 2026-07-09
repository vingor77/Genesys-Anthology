import { useEffect, useState } from 'react'
import { BBB_TALENTS, BBB_SKILLS } from '../../lib/gameConfigs/bbb'
import {
  canBuyTalent,
  totalSpentXP,
  reconcileTalents,
  tierForRank,
  computeCareerSkills,
  type Characteristics,
} from '../../lib/genesysCalc'
import type { TalentDoc, TalentEntry } from '../../lib/characters'
import type { StepProps } from '../../pages/CreateCharacter'

const TIERS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5]

const CHARACTERISTIC_OPTIONS: { key: keyof Characteristics; label: string }[] = [
  { key: 'brawn', label: 'Brawn' },
  { key: 'agility', label: 'Agility' },
  { key: 'intellect', label: 'Intellect' },
  { key: 'cunning', label: 'Cunning' },
  { key: 'willpower', label: 'Willpower' },
  { key: 'presence', label: 'Presence' },
]

export default function StepTalents({ draft, updateDraft, setCanProceed, talentDocs, skillDocs }: StepProps) {
  const [viewingTalentId, setViewingTalentId] = useState<string | null>(null)
  const bbbTalentDocs = talentDocs.filter((d) => BBB_TALENTS.includes(d.id))

  const career = draft.career
  const spent = totalSpentXP(
    draft.characteristics,
    draft.skills,
    computeCareerSkills(draft.career, draft.talents, talentDocs),
    career.chosenSkills,
    draft.talents
  )
  const available = draft.totalXP - spent

  function ownedEntries(id: string) {
    return draft.talents.filter((t) => t.id === id).sort((a, b) => a.rank - b.rank)
  }
  function currentRank(id: string): number {
    const entries = ownedEntries(id)
    return entries.length > 0 ? entries[entries.length - 1].rank : 0
  }
  function hasId(id: string): boolean {
    return draft.talents.some((t) => t.id === id)
  }

  // Needed skill/characteristic picks for a specific rank-entry. Knack For
  // It scales per rank (1 at rank 1, 2 more each rank after) — the schema
  // only stores a flat count, so this is a narrow, explicit special-case
  // rather than a general mechanism. If more rank-scaling talents show up
  // later, this is the spot to generalize.
  function neededSkillPicks(doc: TalentDoc, rank: number): number {
    if (doc.id === 'knack-for-it') return rank === 1 ? 1 : 2
    return doc.skillChoice?.count ?? 0
  }

  const skillChoiceEntries = draft.talents
    .map((t) => {
      const doc = bbbTalentDocs.find((d) => d.id === t.id)
      if (!doc?.skillChoice) return null
      return { entry: t, doc, needed: neededSkillPicks(doc, t.rank) }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const characteristicChoiceEntries = draft.talents
    .map((t) => {
      const doc = bbbTalentDocs.find((d) => d.id === t.id)
      if (!doc?.characteristicChoice) return null
      return { entry: t, doc, needed: doc.characteristicChoice.count }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const allSkillChoicesMade = skillChoiceEntries.every(
    ({ entry, needed }) => (entry.skillChoices ?? []).length === needed && (entry.skillChoices ?? []).every(Boolean)
  )
  const allCharacteristicChoicesMade = characteristicChoiceEntries.every(
    ({ entry, needed }) =>
      (entry.characteristicChoices ?? []).length === needed && (entry.characteristicChoices ?? []).every(Boolean)
  )

  useEffect(() => {
    setCanProceed(allSkillChoicesMade && allCharacteristicChoicesMade)
  }, [allSkillChoicesMade, allCharacteristicChoicesMade, setCanProceed])

  // Handles both "first purchase" (rank 0 -> 1, at the talent's base tier)
  // and "rank up" (rank N -> N+1, at an escalated tier) — same operation,
  // since a first purchase is just rank 1 of something with no prior rank.
  function buyNextRank(doc: TalentDoc) {
    const rank = currentRank(doc.id)
    if (rank >= 1 && !doc.ranked) return // already owned and not ranked — nothing more to buy

    const nextRank = rank + 1
    const nextTier = tierForRank(doc.tier, nextRank)

    if (rank === 0 && doc.prerequisite && !hasId(doc.prerequisite)) return
    if (!canBuyTalent(draft.talents, nextTier)) return
    if (5 * nextTier > available) return

    const newEntry: TalentEntry = { id: doc.id, tier: nextTier, rank: nextRank }
    if (doc.skillChoice) newEntry.skillChoices = []
    if (doc.characteristicChoice) newEntry.characteristicChoices = []

    updateDraft({ talents: [...draft.talents, newEntry] })
  }

  // Removes only the highest owned rank — for a non-ranked talent that's
  // its only rank, so this doubles as "Remove" for those. Choices are
  // stored directly on each entry now, so removing an entry removes its
  // choices automatically — no separate cleanup step needed.
  function rankDown(doc: TalentDoc) {
    const entries = ownedEntries(doc.id)
    if (entries.length === 0) return
    const topEntry = entries[entries.length - 1]
    const without = draft.talents.filter((t) => t !== topEntry)
    const reconciled = reconcileTalents(without, bbbTalentDocs)
    updateDraft({ talents: reconciled })
  }

  function setSkillChoicePick(targetEntry: TalentEntry, index: number, value: string) {
    updateDraft({
      talents: draft.talents.map((t) => {
        if (t !== targetEntry) return t
        const updated = [...(t.skillChoices ?? [])]
        updated[index] = value
        return { ...t, skillChoices: updated }
      }),
    })
  }

  function setCharacteristicChoicePick(targetEntry: TalentEntry, index: number, value: string) {
    updateDraft({
      talents: draft.talents.map((t) => {
        if (t !== targetEntry) return t
        const updated = [...(t.characteristicChoices ?? [])]
        updated[index] = value
        return { ...t, characteristicChoices: updated }
      }),
    })
  }

  const viewingTalent = viewingTalentId ? bbbTalentDocs.find((d) => d.id === viewingTalentId) ?? null : null

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
          const talentsAtTier = bbbTalentDocs.filter((d) => d.tier === tier)
          const slotsFilledAtTier = draft.talents.filter((t) => t.tier === tier).length

          return (
            <div key={tier}>
              <h3 className="mb-2 text-sm font-semibold text-fg-secondary">
                Tier {tier} <span className="text-fg-muted">({5 * tier} XP each)</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {talentsAtTier.map((doc) => {
                  const rank = currentRank(doc.id)
                  const owned = rank > 0
                  const viewing = viewingTalentId === doc.id

                  return (
                    <button
                      key={doc.id}
                      onClick={() => setViewingTalentId(doc.id)}
                      className={`flex h-12 w-full items-center justify-center rounded border px-2 text-center text-sm leading-tight transition-transform active:scale-95 ${
                        viewing ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-page' : ''
                      } ${
                        owned
                          ? 'border-accent bg-accent/10 text-fg'
                          : 'border-border bg-surface text-fg-secondary hover:bg-surface-hover'
                      }`}
                    >
                      {doc.name}
                      {owned && doc.ranked
                        ? doc.tier + rank - 1 > 5
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
        const doc = viewingTalent
        const rank = currentRank(doc.id)
        const owned = rank > 0
        const canBuyMore = doc.ranked || rank === 0
        const nextRank = rank + 1
        const nextTier = tierForRank(doc.tier, nextRank)
        const prereqDoc = doc.prerequisite ? bbbTalentDocs.find((d) => d.id === doc.prerequisite) : null
        const prereqMet = !doc.prerequisite || hasId(doc.prerequisite)
        const unlockedNext = canBuyTalent(draft.talents, nextTier)
        const affordableNext = 5 * nextTier <= available

        let blockedReason: string | null = null
        if (canBuyMore) {
          if (rank === 0 && !prereqMet) blockedReason = `Requires ${prereqDoc?.name ?? doc.prerequisite} first`
          else if (!unlockedNext) blockedReason = `Locked — own more Tier ${nextTier - 1} talents`
          else if (!affordableNext) blockedReason = 'Not enough XP'
        }

        return (
          <div className="mt-4 rounded-lg border border-accent bg-surface p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-semibold text-fg">
                {doc.name}
                {owned && doc.ranked && (
                  <span className="ml-2 text-xs text-accent">
                    Rank {rank}
                    {doc.tier + rank - 1 > 5 ? ' (Tier 5)' : ''}
                  </span>
                )}
              </p>
              <span className="text-xs text-fg-muted">Tier {doc.tier}</span>
            </div>
            <div className="mt-2 rounded border-l-4 border-accent bg-accent/10 px-3 py-2">
              <p className="text-sm text-fg">{doc.rules}</p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canBuyMore && (
                <button
                  onClick={() => buyNextRank(doc)}
                  disabled={!!blockedReason}
                  className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
                >
                  {rank === 0 ? `Buy (${5 * doc.tier} XP)` : `Rank up to ${nextRank} (${5 * nextTier} XP)`}
                </button>
              )}
              {owned && (
                <button
                  onClick={() => rankDown(doc)}
                  className="rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
                >
                  {doc.ranked && rank > 1 ? `Rank down to ${rank - 1}` : 'Remove'}
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
            {skillChoiceEntries.map(({ entry, doc, needed }) => {
              const picked = entry.skillChoices ?? []
              const usedByOtherRanks = draft.talents
                .filter((t) => t.id === doc.id && t !== entry)
                .flatMap((t) => t.skillChoices ?? [])
              const restricted = doc.skillChoice?.restriction

              return (
                <div key={`${doc.id}:${entry.rank}`} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-fg">
                    {doc.name}
                    {entry.rank > 1 ? ` (Rank ${entry.rank})` : ''}
                  </span>
                  <div className="flex flex-wrap justify-end gap-2">
                    {Array.from({ length: needed }).map((_, i) => {
                      const pickedElsewhereInThisEntry = picked.filter((_, idx) => idx !== i)
                      return (
                        <select
                          key={i}
                          value={picked[i] ?? ''}
                          onChange={(ev) => setSkillChoicePick(entry, i, ev.target.value)}
                          title={restricted}
                          className="rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                        >
                          <option value="" disabled>
                            Choose a skill
                          </option>
                          {BBB_SKILLS.filter(
                            (s) =>
                              !pickedElsewhereInThisEntry.includes(s) &&
                              (!usedByOtherRanks.includes(s) || s === picked[i])
                          ).map((skillId) => (
                            <option key={skillId} value={skillId}>
                              {skillDocs.find((d) => d.id === skillId)?.name ?? skillId}
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
            {characteristicChoiceEntries.map(({ entry, doc, needed }) => {
              const picked = entry.characteristicChoices ?? []
              // Excludes characteristics already used by OTHER ranks of the
              // same talent (e.g. Dedication can't boost the same stat twice).
              const usedElsewhere = draft.talents
                .filter((t) => t.id === doc.id && t !== entry)
                .flatMap((t) => t.characteristicChoices ?? [])

              return (
                <div key={`${doc.id}:${entry.rank}`} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-fg">
                    {doc.name}
                    {entry.rank > 1 ? ` (Rank ${entry.rank})` : ''}
                  </span>
                  <div className="flex gap-2">
                    {Array.from({ length: needed }).map((_, i) => {
                      const pickedElsewhereInThisEntry = picked.filter((_, idx) => idx !== i)
                      return (
                        <select
                          key={i}
                          value={picked[i] ?? ''}
                          onChange={(ev) => setCharacteristicChoicePick(entry, i, ev.target.value)}
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