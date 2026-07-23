import type {
  SkillEntry,
  TalentEntry,
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

// Shared display labels for the 5 DerivedStatBonuses keys and the 6
// characteristics — lives here rather than on CharacterSheet.tsx because
// CustomItemForm.tsx also needs them, and CharacterSheet.tsx imports
// CustomItemForm.tsx. Defining them on the component that gets imported
// FROM creates a circular import — the child needs the constant before
// the parent module has finished initializing it ("Cannot access before
// initialization"). genesysCalc.ts has no dependency on either
// component, so both can import from here with no cycle.
export const STAT_LABELS: Record<string, string> = {
  soak: 'Soak',
  meleeDefense: 'Melee Defense',
  rangedDefense: 'Ranged Defense',
  woundThreshold: 'Wound Threshold',
  strainThreshold: 'Strain Threshold',
}

export const CHARACTERISTIC_LABELS: Record<string, string> = {
  brawn: 'Brawn',
  agility: 'Agility',
  intellect: 'Intellect',
  cunning: 'Cunning',
  willpower: 'Willpower',
  presence: 'Presence',
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
      if (!mod.stat) continue // characteristic-scoped (Dedication) — handled by computeTalentCharacteristicBonuses below
      if (mod.stat in totals) {
        totals[mod.stat as keyof typeof totals] += mod.amount * rank
      }
    }
  }
  return totals
}

// Companion to computeTalentBonuses above, same split-by-bucket reasoning
// as computeInventoryCharacteristicBonuses has for Objects — this gap
// existed even before this session's changes; Dedication (whose stat is
// deliberately left unset on the document, substituted from
// TalentEntry.characteristicChoices — see characters.ts's general
// substitution rule) is what actually surfaced it.
//
// Deliberately does NOT collapse to "highest rank per talent id" the way
// computeTalentBonuses above does — that collapse is only valid when
// every purchase of the same ranked talent contributes identically
// (Grit, Toughened). Dedication breaks that assumption: each purchase
// is its own TalentEntry with its OWN characteristicChoices (rank 1
// might pick Brawn, rank 2 Agility), so collapsing to a single max rank
// and applying it to only the last-seen choice would incorrectly dump
// the whole combined bonus onto one characteristic instead of +1 each
// to several different ones. Iterating every entry individually handles
// both cases correctly without needing to special-case which one this is.
//
// Callers need to sum this together with computeInventoryCharacteristicBonuses'
// result before passing into computeEffectiveCharacteristics' inventoryBonuses
// parameter — that wiring happens where CharacterSheet.tsx actually calls
// these, not here.
export function computeTalentCharacteristicBonuses(
  talents: TalentEntry[],
  talentDocs: TalentDoc[]
): Partial<Characteristics> {
  const totals: Partial<Characteristics> = {}
  for (const t of talents) {
    const doc = talentDocs.find((d) => d.id === t.id)
    if (!doc?.statModifiers || !t.characteristicChoices) continue
    for (const mod of doc.statModifiers) {
      if (mod.stat) continue // has a fixed stat — handled by computeTalentBonuses above, not this function
      for (const chosen of t.characteristicChoices) {
        const key = chosen as keyof Characteristics
        totals[key] = (totals[key] ?? 0) + mod.amount
      }
    }
  }
  return totals
}

// Sums the derived-stat entries out of every active status's unified
// statModifiers array (soak/meleeDefense/rangedDefense/woundThreshold/
// strainThreshold) — fixed to read the unified field after statBonus/
// characteristicModifiers got merged into one array mid-session. Same
// split-by-bucket convention computeInventoryStatBonuses already uses
// for Objects: one array, two buckets (this function's derived-stat
// bucket, computeEffectiveCharacteristics' characteristic bucket below),
// distinguished by whether the stat name is a characteristic or not.
export function computeStatusBonuses(status: StatusEntry[]): Required<DerivedStatBonuses> {
  const totals = { soak: 0, meleeDefense: 0, rangedDefense: 0, woundThreshold: 0, strainThreshold: 0 }
  for (const s of status) {
    if (!s.statModifiers) continue
    for (const mod of s.statModifiers) {
      if (!mod.stat) continue // substituted-but-unresolved entries (shouldn't reach here) — skip rather than crash
      if ((CHARACTERISTIC_KEYS as readonly string[]).includes(mod.stat)) continue // characteristic bucket, handled below
      const key = ITEM_STAT_ALIASES[mod.stat] ?? mod.stat
      if (key in totals) {
        totals[key as keyof typeof totals] += mod.amount
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
// inventoryBonuses is the same kind of overlay, sourced from
// computeInventoryCharacteristicBonuses below instead of Status — an
// item modifier targeting a characteristic (a ring of +1 Agility, say)
// applies through this exact same pipeline rather than a separate one.
export function computeEffectiveCharacteristics(
  base: Characteristics,
  status: StatusEntry[],
  inventoryBonuses: Partial<Characteristics> = {}
): Characteristics {
  const effective = { ...base }
  for (const s of status) {
    if (!s.statModifiers) continue
    for (const mod of s.statModifiers) {
      if (!mod.stat) continue
      if (!(CHARACTERISTIC_KEYS as readonly string[]).includes(mod.stat)) continue // derived-stat bucket, handled above
      const key = mod.stat as keyof Characteristics
      effective[key] = Math.min(6, Math.max(1, effective[key] + mod.amount))
    }
  }
  for (const [key, amount] of Object.entries(inventoryBonuses) as [keyof Characteristics, number | undefined][]) {
    if (amount !== undefined) {
      effective[key] = Math.min(6, Math.max(1, effective[key] + amount))
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

// Sums ObjectDoc.statModifiers across the whole inventory — separate
// from computeEquippedStatBonuses above, which only reads armor's own
// soak/defense fields and quality-derived modifiers on equipped items.
// This is the generic item-level field instead: a modifier applies
// automatically (regardless of equip state) if its own `autoApply` is
// true; otherwise it only counts once the player has flipped that
// instance's `applied` flag on via the sheet's Apply button. A broken
// (durability 0) or destroyed (Fragile, one-and-done) item contributes
// nothing either way — matches the same "unusable item grants nothing"
// rule equipped gear already follows, just applied here to inventory
// items generally rather than only equipped weapons/armor.
//
// The shared schema's stat enum also lists `wounds`/`strain` as valid
// targets alongside `woundThreshold`/`strainThreshold` — for a standing
// item modifier those only make sense as a max/threshold change (an
// always-on "subtract 2 from current wounds" isn't a real effect; an
// instant heal/damage tick is a `Use`-triggered thing, handled
// elsewhere, not a passive bonus). So `wounds`/`strain` alias directly
// into the threshold buckets here. The custom item form only ever
// offers "Wound Threshold"/"Strain Threshold" as the pick, but this
// alias stays as a defensive fallback for the raw enum value.
const ITEM_STAT_ALIASES: Record<string, keyof DerivedStatBonuses> = {
  wounds: 'woundThreshold',
  strain: 'strainThreshold',
}

export function computeInventoryStatBonuses(
  inventory: InventoryEntry[],
  objectDocs: Map<string, ObjectDoc>
): Required<DerivedStatBonuses> {
  const totals = { soak: 0, meleeDefense: 0, rangedDefense: 0, woundThreshold: 0, strainThreshold: 0 }
  for (const entry of inventory) {
    if (entry.destroyed) continue
    const doc = objectDocs.get(entry.objectId)
    if (!doc?.statModifiers) continue
    if (doc.durability !== undefined && (entry.currentDurability ?? doc.durability) === 0) continue

    for (const mod of doc.statModifiers) {
      const isActive = mod.autoApply || !!entry.applied
      if (!isActive) continue
      const key = ITEM_STAT_ALIASES[mod.stat] ?? mod.stat
      if (key in totals) {
        totals[key as keyof typeof totals] += mod.amount
      }
    }
  }
  return totals
}

const CHARACTERISTIC_KEYS = ['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'] as const

// Companion to computeInventoryStatBonuses above, split out because
// characteristic overlays go through computeEffectiveCharacteristics's
// own pipeline (same one Status uses), not the soak/defense/threshold
// totals dict — the two are structurally different shapes
// (Required<DerivedStatBonuses> vs Partial<Characteristics>), so one
// function returning a single merged blob would just mean the caller
// has to split it back apart anyway.
export function computeInventoryCharacteristicBonuses(
  inventory: InventoryEntry[],
  objectDocs: Map<string, ObjectDoc>
): Partial<Characteristics> {
  const totals: Partial<Characteristics> = {}
  for (const entry of inventory) {
    if (entry.destroyed) continue
    const doc = objectDocs.get(entry.objectId)
    if (!doc?.statModifiers) continue
    if (doc.durability !== undefined && (entry.currentDurability ?? doc.durability) === 0) continue

    for (const mod of doc.statModifiers) {
      if (!(CHARACTERISTIC_KEYS as readonly string[]).includes(mod.stat)) continue
      const isActive = mod.autoApply || !!entry.applied
      if (!isActive) continue
      const key = mod.stat as keyof Characteristics
      totals[key] = (totals[key] ?? 0) + mod.amount
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