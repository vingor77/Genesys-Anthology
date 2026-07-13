import type {
  SkillEntry,
  TalentEntry,
  SkillDoc,
  TalentDoc,
  QualityDoc,
  ObjectDoc,
  InventoryEntry,
  EquippedSlots,
  CriticalInjuryEntry,
  StatusEntry,
} from './characters'

export interface Characteristics {
  brawn: number
  agility: number
  intellect: number
  cunning: number
  willpower: number
  presence: number
}

export function characteristicCost(rank: number, base = 2): number {
  let cost = 0
  for (let r = base + 1; r <= rank; r++) {
    cost += 10 * r
  }
  return cost
}

export function skillCost(rank: number, isCareer: boolean, freeRank: 0 | 1 = 0): number {
  let cost = 0
  for (let r = freeRank + 1; r <= rank; r++) {
    cost += isCareer ? 5 * r : 5 * r + 5
  }
  return cost
}

export function talentCost(talents: TalentEntry[]): number {
  return talents.reduce((sum, t) => sum + 5 * t.tier, 0)
}

export function canBuyTalent(talents: TalentEntry[], tier: 1 | 2 | 3 | 4 | 5): boolean {
  if (tier === 1) return true
  const countAtTier = (t: number) => talents.filter((x) => x.tier === t).length
  return countAtTier(tier - 1) >= countAtTier(tier) + 2
}

export function tierForRank(baseTier: 1 | 2 | 3 | 4 | 5, rank: number): 1 | 2 | 3 | 4 | 5 {
  const t = baseTier + (rank - 1)
  return (t > 5 ? 5 : t) as 1 | 2 | 3 | 4 | 5
}

// Removes any TalentEntry that's no longer valid: its prerequisite was
// removed, a rank is stranded without the rank below it, or the pyramid
// slot-count rule is violated. Prerequisites are now looked up directly
// from each entry's TalentDoc.prerequisite (an explicit id reference) —
// the previous version inferred prerequisites by parsing name suffixes
// like " (Improved)"/" (Supreme)", which only worked because of BB&B's
// specific naming convention and breaks entirely once talents are
// identified by id rather than name. getTalentPrerequisiteName is gone
// for the same reason — nothing needs to infer a prerequisite from a
// name anymore, since it's now real, explicit data.
export function reconcileTalents(talents: TalentEntry[], talentDocs: TalentDoc[]): TalentEntry[] {
  let result = [...talents]
  let changed = true

  while (changed) {
    changed = false

    const orphan = result.find((t) => {
      const doc = talentDocs.find((d) => d.id === t.id)
      const prereqId = doc?.prerequisite
      return prereqId != null && !result.some((x) => x.id === prereqId)
    })
    if (orphan) {
      result = result.filter((x) => x !== orphan)
      changed = true
      continue
    }

    const strandedRank = result.find(
      (t) => t.rank > 1 && !result.some((x) => x.id === t.id && x.rank === t.rank - 1)
    )
    if (strandedRank) {
      result = result.filter((x) => x !== strandedRank)
      changed = true
      continue
    }

    for (const tier of [2, 3, 4, 5] as const) {
      const countBelow = result.filter((x) => x.tier === tier - 1).length
      const atTier = result.filter((x) => x.tier === tier)
      if (atTier.length > 0 && countBelow < atTier.length + 1) {
        const toRemove = atTier[atTier.length - 1]
        result = result.filter((x) => x !== toRemove)
        changed = true
        break
      }
    }
  }

  return result
}

export interface DerivedStatBonuses {
  soak?: number
  meleeDefense?: number
  rangedDefense?: number
  woundThreshold?: number
  strainThreshold?: number
}

// Sums stat bonuses from talents whose TalentDoc has statModifiers
// populated — per the automation-scope cutback, only Grit/Toughened/
// Defensive/Enduring/Dedication ever have this field set at all, so
// there's no autoApply flag to check: if it's populated, it applies.
// Uses only each talent's HIGHEST owned rank — a ranked talent has one
// TalentEntry per rank (rank 1, rank 2, etc. all coexist for the
// pyramid's slot counting), so summing every entry would multiply the
// bonus by however many ranks were bought, not by the rank itself.
export function computeTalentBonuses(talents: TalentEntry[], talentDocs: TalentDoc[]): Required<DerivedStatBonuses> {
  const highestRankById = new Map<string, number>()
  for (const t of talents) {
    const current = highestRankById.get(t.id) ?? 0
    if (t.rank > current) highestRankById.set(t.id, t.rank)
  }

  const totals = { soak: 0, meleeDefense: 0, rangedDefense: 0, woundThreshold: 0, strainThreshold: 0 }
  for (const [id, rank] of highestRankById) {
    const doc = talentDocs.find((d) => d.id === id)
    if (!doc?.statModifiers) continue
    for (const mod of doc.statModifiers) {
      if (mod.stat in totals) {
        totals[mod.stat as keyof typeof totals] += mod.amount * rank
      }
    }
  }
  return totals
}

// Sums statBonus from every active status — was built into the schema
// and the Add Status form, but never actually wired into the real stat
// calculation, so it had zero effect until now. Same pattern as
// computeTalentBonuses/computeEquippedStatBonuses above.
export function computeStatusBonuses(status: StatusEntry[]): Required<DerivedStatBonuses> {
  const totals = { soak: 0, meleeDefense: 0, rangedDefense: 0, woundThreshold: 0, strainThreshold: 0 }
  for (const s of status) {
    if (!s.statBonus) continue
    for (const [stat, amount] of Object.entries(s.statBonus) as [string, number | undefined][]) {
      if (amount !== undefined && stat in totals) {
        totals[stat as keyof typeof totals] += amount
      }
    }
  }
  return totals
}

// A status-driven characteristic change is a temporary overlay on top of
// the base value, never written into character.characteristics itself —
// that field stays reserved for permanent, XP-purchased increases. This
// computes what the characteristic actually IS right now, floored at 1
// (not the XP-spend floor of BBB_STARTING_CHARACTERISTIC, which only
// applies to voluntarily lowering a purchased increase — a status can
// genuinely push a character below their starting value).
export function computeEffectiveCharacteristics(base: Characteristics, status: StatusEntry[]): Characteristics {
  const effective = { ...base }
  for (const s of status) {
    if (!s.characteristicModifiers) continue
    for (const [key, amount] of Object.entries(s.characteristicModifiers) as [keyof Characteristics, number | undefined][]) {
      if (amount !== undefined) {
        effective[key] = Math.min(6, Math.max(1, effective[key] + amount))
      }
    }
  }
  return effective
}

export function derivedStats(characteristics: Characteristics, bonuses: DerivedStatBonuses = {}) {
  return {
    soak: characteristics.brawn + (bonuses.soak ?? 0),
    woundThreshold: 10 + characteristics.brawn + (bonuses.woundThreshold ?? 0),
    strainThreshold: 10 + characteristics.willpower + (bonuses.strainThreshold ?? 0),
    meleeDefense: bonuses.meleeDefense ?? 0,
    rangedDefense: bonuses.rangedDefense ?? 0,
  }
}

export interface DicePool {
  ability: number
  proficiency: number
}

export function calculateDicePool(characteristicRank: number, skillRank: number): DicePool {
  const total = Math.max(characteristicRank, skillRank)
  const proficiency = Math.min(characteristicRank, skillRank)
  return { ability: total - proficiency, proficiency }
}

export function totalSpentXP(
  characteristics: Characteristics,
  skills: SkillEntry[],
  careerSkillNames: string[],
  freeSkillNames: string[],
  talents: TalentEntry[]
): number {
  const charCost = Object.values(characteristics).reduce(
    (sum, rank) => sum + characteristicCost(rank),
    0
  )

  const skillsCost = skills.reduce((sum, skill) => {
    const isCareer = careerSkillNames.includes(skill.name)
    const freeRank: 0 | 1 = freeSkillNames.includes(skill.name) ? 1 : 0
    return sum + skillCost(skill.rank, isCareer, freeRank)
  }, 0)

  return charCost + skillsCost + talentCost(talents)
}

// Merges a career's chosen skills with any skills granted career status
// by a purchased talent's skillChoice.grantsCareer (currently only Basic
// Military Training) — its fixedSkills/skillChoices count as career for
// XP-cost purposes the instant the talent is bought, no refund logic
// needed since spent XP is always recalculated live, never stored
// per-purchase (see the "instant refund" reasoning from when this was
// first designed).
// careerPool is the career's full skill pool (typically 8 skills, all
// career-priced) — NOT character.career.chosenSkills, which is only the
// 4 skills that got a free starting rank. Those are two different
// concepts: every skill in the pool is priced as career, but only the
// chosen 4 also start with a free rank. An earlier version of this
// function conflated them, using chosenSkills as if it were the pool —
// silently meant only 4 skills were ever priced as career, in both the
// wizard and the sheet, until caught by testing.
export function computeCareerSkills(
  careerPool: string[],
  talents: TalentEntry[],
  talentDocs: TalentDoc[]
): string[] {
  const fromTalents = talents.flatMap((t) => {
    const doc = talentDocs.find((d) => d.id === t.id)
    if (!doc?.skillChoice?.grantsCareer) return []
    return [...(doc.skillChoice.fixedSkills ?? []), ...(t.skillChoices ?? [])]
  })
  return [...new Set([...careerPool, ...fromTalents])]
}

// Reads statModifiers from every equipped object, accounting for
// durability degradation on weapons/armor (a damaged item contributes
// less than full value — degradation curve intentionally simple for now:
// full value at durability 3-2, halved and floored at durability 1,
// zero at durability 0).
export function computeEquippedStatBonuses(
  equippedSlots: EquippedSlots,
  inventory: InventoryEntry[],
  objectDocs: Map<string, ObjectDoc>,
  qualityDocs: QualityDoc[]
): Required<DerivedStatBonuses> {
  const totals = { soak: 0, meleeDefense: 0, rangedDefense: 0, woundThreshold: 0, strainThreshold: 0 }
  const equippedEntryIds = new Set(Object.values(equippedSlots).filter((id): id is string => !!id))

  for (const entry of inventory) {
    if (!equippedEntryIds.has(entry.id)) continue
    const doc = objectDocs.get(entry.objectId)
    if (!doc) continue

    // Armor's own soak/defense — dedicated fields on the Object, not a
    // generic statModifiers array. Degradation follows the exact tiered
    // table (3 Intact / 2 Damaged / 1 Heavily Damaged / 0 Broken), not a
    // linear formula — an earlier version approximated this with a
    // simple multiplier, which didn't match the real rule at all.
    // Durability 0 is handled defensively here (0 contribution) even
    // though a Broken item should already be auto-unequipped elsewhere —
    // belt-and-suspenders in case that ever gets bypassed.
    if (doc.type === 'Armor') {
      const durability = entry.currentDurability ?? 3
      if (durability >= 3) {
        totals.soak += doc.soak ?? 0
        totals.meleeDefense += doc.meleeDefense ?? 0
        totals.rangedDefense += doc.rangedDefense ?? 0
      } else if (durability === 2) {
        totals.soak += Math.max(0, (doc.soak ?? 0) - 1)
        totals.meleeDefense += doc.meleeDefense ?? 0
        totals.rangedDefense += doc.rangedDefense ?? 0
      } else if (durability === 1) {
        totals.soak += Math.max(0, (doc.soak ?? 0) - 2)
        totals.meleeDefense += Math.max(0, (doc.meleeDefense ?? 0) - 1)
        totals.rangedDefense += Math.max(0, (doc.rangedDefense ?? 0) - 1)
      }
      // durability 0 (Broken): contributes nothing, matching "provides no soak or defense"
    }

    // Quality-derived passive bonuses — e.g. a weapon carrying Defensive
    // or Deflection. No durability scaling here: a Broken item is
    // auto-unequipped elsewhere, so it's never in the equipped set this
    // function sees in the first place — nothing left to degrade.
    for (const itemQuality of doc.qualities ?? []) {
      const qualityDoc = qualityDocs.find((q) => q.name === itemQuality.name)
      if (!qualityDoc?.statModifiers) continue
      const rank = itemQuality.rank ?? 1
      for (const mod of qualityDoc.statModifiers) {
        if (mod.stat in totals) {
          totals[mod.stat as keyof typeof totals] += mod.amount * rank
        }
      }
    }
  }
  return totals
}

export function encumbranceCapacity(brawn: number): number {
  return 5 + brawn
}

// Worn armor is lighter to carry than the same piece stuffed in a bag —
// matches the discount already established in the old sheet's inline
// calculation, just moved here so it's one source of truth like every
// other derived-stat formula instead of scattered in component code.
export function computeEncumbrance(
  inventory: InventoryEntry[],
  equippedSlots: EquippedSlots,
  objectDocs: Map<string, ObjectDoc>
): number {
  const equippedEntryIds = new Set(Object.values(equippedSlots).filter((id): id is string => !!id))

  return inventory.reduce((sum, entry) => {
    const doc = objectDocs.get(entry.objectId)
    if (!doc) return sum
    const enc = doc.encumbrance ?? 0
    if (doc.type === 'Armor' && equippedEntryIds.has(entry.id)) {
      return sum + Math.max(0, enc - 3)
    }
    return sum + enc
  }, 0)
}

export interface DurabilityState {
  label: 'Intact' | 'Damaged' | 'Heavily Damaged' | 'Broken'
  effect: string
}

// Weapon degradation (setback dice, upgraded difficulty) affects attack
// rolls, not a passive stat this app already tracks — there's no dice
// roller built yet to apply these automatically to. Informational only,
// same "display, don't force-automate a system that doesn't exist yet"
// approach used elsewhere. Armor's soak/defense penalties ARE already
// real passive stats, so those get computed for real in
// computeEquippedStatBonuses above — this is purely the display text.
export function getDurabilityState(durability: number, type: 'Weapon' | 'Armor'): DurabilityState {
  if (type === 'Armor') {
    if (durability >= 3) return { label: 'Intact', effect: 'Full stats — normal soak and defense.' }
    if (durability === 2) return { label: 'Damaged', effect: 'Soak reduced by 1.' }
    if (durability === 1) return { label: 'Heavily Damaged', effect: 'Soak reduced by 2. Defense reduced by 1.' }
    return { label: 'Broken', effect: 'Unusable. Provides no soak or defense.' }
  }
  if (durability >= 3) return { label: 'Intact', effect: 'Full stats — normal damage and qualities.' }
  if (durability === 2) return { label: 'Damaged', effect: 'Add 1 setback to all attack rolls made with this weapon.' }
  if (durability === 1) return { label: 'Heavily Damaged', effect: 'Upgrade the difficulty of all attack rolls once.' }
  return { label: 'Broken', effect: 'Unusable. Cannot be used to attack.' }
}

export function computeCritTotal(criticalInjuries: CriticalInjuryEntry[]): number {
  return criticalInjuries.reduce((sum, c) => sum + c.critContribution, 0)
}

export function getSanityTier(sanity: number): string {
  if (sanity >= 80) return 'Stable'
  if (sanity >= 60) return 'Shaken'
  if (sanity >= 40) return 'Rattled'
  if (sanity >= 20) return 'Breaking'
  if (sanity >= 1) return 'Gone'
  return 'Catatonic'
}

export function getReputationTier(reputation: number): string {
  if (reputation >= 80) return 'Allied'
  if (reputation >= 60) return 'Trusted'
  if (reputation >= 40) return 'Recognized'
  if (reputation >= 20) return 'Neutral'
  return 'Hostile'
}