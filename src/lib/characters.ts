import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Characteristics } from './genesysCalc'
import type { GameType } from './sessions'

// ============================================================
// Database document types — mirror the Firestore collections
// seeded in Phase 1a (qualities, skills, talents, criticalInjuries,
// objects, keywords). Defined here rather than imported from the
// temporary seed/ files, since those get deleted once seeding is
// done — these are the real, permanent shapes the app reads against.
// ============================================================

export interface SkillDoc {
  id: string
  name: string
  characteristic: keyof Characteristics
  description: string
}

export interface TalentDoc {
  id: string
  name: string
  tier: 1 | 2 | 3 | 4 | 5
  activation: 'Passive' | 'Action' | 'Maneuver' | 'Incidental' | 'Incidental (Out of Turn)'
  ranked: boolean
  limit: 'None' | 'Per Round' | 'Per Encounter' | 'Per Session'
  rules: string
  prerequisite?: string
  statModifiers?: { stat: string; amount: number }[]
  skillChoice?: { count: number; restriction?: string; grantsCareer?: boolean; fixedSkills?: string[] }
  characteristicChoice?: { count: number }
}

export interface QualityDoc {
  id: string
  name: string
  ranked: boolean
  activation: 'Passive' | 'Active'
  rules: string
  statModifiers?: { stat: string; amount: number }[]
  poolModifiers?: { type: string; amount: number; appliesTo: string }[]
  resultModifiers?: { type: string; amount: number; appliesTo: string }[]
  requirement?: { characteristic: string; penalty: string }
  immunity?: string[]
  autoFire?: boolean
  guided?: boolean
  requiresAmmo?: boolean
  slowFiring?: boolean
  destroysOnUse?: boolean // Fragile — item's InventoryEntry gets marked destroyed after one use, not deleted
}

export interface CriticalInjuryDoc {
  id: string
  name: string
  minRoll: number
  maxRoll: number
  severity: 'Easy' | 'Average' | 'Hard' | 'Daunting'
  effect: string
  isAltering: boolean
  rollResults?: { max: number; outcomes: { min: number; max: number; result: string }[] }
}

export interface ObjectDoc {
  id: string
  name: string
  description: string
  type: 'Weapon' | 'Armor' | 'Food' | 'Drink' | 'Light Source' | 'Tool' | 'Mundane'
  rarity: number
  encumbrance: number
  // Null/absent = part of the global, official catalog. Populated = a
  // custom item uploaded within one session, visible only there. Added
  // now so the future "upload new item" feature needs no schema change —
  // fetching just becomes "global items + anything matching this session."
  sessionId?: string
  // Further narrows a session-scoped item to one specific player — used
  // for personal cosmetic items created during character creation, which
  // shouldn't show up for anyone else in the session.
  ownerId?: string
  price?: number
  slots?: string[]
  effect?: string
  situational?: { condition: string; effect: string }
  statModifiers?: { stat: string; amount: number; autoApply: boolean }[]
  poolModifiers?: { type: string; amount: number; appliesTo: string; autoApply: boolean }[]
  resultModifiers?: { type: string; amount: number; appliesTo: string; autoApply: boolean }[]
  durability?: number
  uses?: number
  repair_material?: string
  craft_skill?: 'Metalworking' | 'Leatherworking' | 'Crafting'
  damage?: number
  damageType?: 'Brawn-based' | 'Fixed'
  crit?: number
  range?: 'Engaged' | 'Short' | 'Medium' | 'Long' | 'Extreme'
  skill?: string
  qualities?: { name: string; rank?: number }[]
  soak?: number
  meleeDefense?: number
  rangedDefense?: number
  hunger_stacks_removed?: number
  thirst_stacks_removed?: number
  bonus_effects?: string
  light_step_boost?: number
  light_cap?: string
  duration?: number
  fuel_type?: 'Batteries' | 'Gasoline' | 'Single Use' | 'None'
  noclip_enabled?: boolean
  noclip_skill?: string
  noclip_difficulty?: number
  sanity_restored?: number
  sanity_threshold_required?: number
  timekeeping?: boolean
  timekeeping_accurate?: boolean
  suppress_effect?: string
  protection_type?: ('Atmospheric' | 'Radiation' | 'Biological' | 'Anomalous' | 'Chemical')[]
  cures_sickness?: string[]
  recovery_roll_modifier?: number
}

// ============================================================
// Character sub-schema types
// ============================================================

export interface SkillEntry {
  name: string // matches a SkillDoc id
  rank: number // 0-5
}

export interface TalentEntry {
  id: string // matches a TalentDoc id
  rank: number
  tier: 1 | 2 | 3 | 4 | 5 // escalated tier this purchase occupies — climbs on repeat purchases of ranked talents
  skillChoices?: string[]
  characteristicChoices?: string[]
}

// Only ever holds entries the player has actively created — either by
// hitting "Use" on an item (sourceItemId set, for display context), a
// same-sheet talent (sourceTalentId), or by hand-adding a custom
// buff/debuff/condition. No auto-surfacing: an effect only shows here
// once someone has actually triggered it, and ends the moment it's
// removed. See Master Schema's Status Effects note for why this was
// simplified from an earlier draft (no auto-tick engine, no unused
// pool/result-modifier split).
export interface StatusEntry {
  id: string
  label: string
  sourceItemId?: string
  sourceTalentId?: string
  diceModifier?: {
    mode: 'addBoost' | 'addSetback' | 'upgradeDifficulty' | 'downgradeDifficulty'
    amount: number
    appliesTo: string
  }[]
  statBonus?: {
    soak?: number
    meleeDefense?: number
    rangedDefense?: number
    woundThreshold?: number
    strainThreshold?: number
  }
  perTurnEffect?: { wounds?: number; strain?: number }
  remainingRounds?: number
  incomingDamageModifier?: { wounds?: number; strain?: number }
  blocksNaturalRecovery?: ('wounds' | 'strain')[]
  stacks?: number
  isCondition?: boolean
}

export type EquipmentSlotName =
  | 'Head' | 'Chest' | 'Hands' | 'Legs' | 'Feet'
  | 'Ear' | 'Neck' | 'Wrist' | 'Left Ring' | 'Right Ring'
  | 'Main Hand' | 'Off Hand'

// Slot name -> id of the inventory entry occupying it (references
// character.inventory[] by objectId... actually by the inventory entry's
// own identity — see InventoryEntry note). Null/absent means empty.
export type EquippedSlots = Partial<Record<EquipmentSlotName, string | null>>

// References the Object document for all static data (name, description,
// damage, slots, effects). Only instance-specific mutable state lives
// here — durability degradation, remaining uses, weapon cooldown.
export interface InventoryEntry {
  objectId: string // matches an ObjectDoc id
  statModifiers?: { stat: string; amount: number }[]
  poolModifiers?: { type: string; amount: number; appliesTo: string }[]
  resultModifiers?: { type: string; amount: number; appliesTo: string }[]
  currentDurability?: number // 0-3 — gradual wear (weapons/armor), distinct from destroyed below
  currentUses?: number
  cooldown?: number // rounds remaining before a Slow-Firing weapon can fire again
  // Set true when a Fragile item is used. Entry stays on the sheet (any
  // notes or other state riding on it are preserved) but renders grayed
  // out with Equip/Use disabled, until the player manually deletes it.
  // Not the same concept as currentDurability — binary and permanent,
  // no partial state, no repair path.
  destroyed?: boolean
}

export interface CriticalInjuryEntry {
  id: string // UUID for this specific instance
  injuryId: string // matches a CriticalInjuryDoc id
  alterationDescription?: string
  randomResult?: string
  critContribution: number // default 10
  notes?: string
}

export interface ActiveSickness {
  sicknessId: string
  successes: number
  failures: number
  daysRemaining: number
  worseningCount: number
}

export interface Motivations {
  strength?: string
  flaw?: string
  desire?: string
  fear?: string
}

export interface CharacterDescription {
  gender?: string
  age?: string
  height?: string
  build?: string
  hair?: string
  eyes?: string
  notable?: string
}

export interface Currency {
  amount: number
  label: string // from game config — "Credits", "Almond Water", etc.
}

// ============================================================
// Base Character
// ============================================================

export interface Character {
  // Identity
  id: string
  uid: string
  gameType: GameType
  characterName: string
  species: { name: string; specialAbility?: { name: string; description: string } }
  career: {
    name: string
    specialAbility?: { name: string; description: string }
    chosenSkills: string[] // free ranks picked at creation
  }

  // Vitals (currentWounds/currentStrain stored; soak/maxWounds/maxStrain/
  // meleeDefense/rangedDefense are calculated at runtime, never stored —
  // see Calculated Fields reference in Master_Schema.html)
  currentWounds: number
  currentStrain: number

  // Experience (spentXP/availableXP calculated at runtime)
  totalXP: number

  // Sub-schemas
  characteristics: Characteristics
  skills: SkillEntry[]
  motivations: Motivations
  talents: TalentEntry[]
  status: StatusEntry[]
  equippedSlots: EquippedSlots
  inventory: InventoryEntry[]
  criticalInjuries: CriticalInjuryEntry[]
  description: CharacterDescription
  currency: Currency
  notes?: string

  // Session
  sessionId?: string

  // Survival Tracks (Backrooms — Rule 1c). Null/undefined for BB&B.
  hungerStacks?: number // 0-5
  thirstStacks?: number // 0-5
  sleepStacks?: number // 0-5
  sanity?: number // 0-100

  // Sickness (Backrooms — Rule 1l). Null/undefined for BB&B.
  activeSicknesses?: ActiveSickness[]

  // Reputation (Backrooms — Rule 1i). Null/undefined for BB&B.
  factionReputation?: Record<string, number> // faction id -> 0-100

  createdAt: string
  updatedAt: string
}

// ============================================================
// Character CRUD — same functions as before, updated to the new type
// ============================================================

export async function createCharacter(
  uid: string,
  data: Omit<Character, 'id' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = doc(collection(db, 'characters'))
  await setDoc(ref, {
    ...data,
    uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return ref.id
}

export async function updateCharacter(
  characterId: string,
  updates: Partial<Character>
): Promise<void> {
  await updateDoc(doc(db, 'characters', characterId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteCharacter(characterId: string): Promise<void> {
  await deleteDoc(doc(db, 'characters', characterId))
}

export function subscribeToCharacter(
  characterId: string,
  callback: (character: Character | null) => void
) {
  return onSnapshot(
    doc(db, 'characters', characterId),
    (snap) => {
      if (!snap.exists()) {
        callback(null)
        return
      }
      callback({ id: snap.id, ...snap.data() } as Character)
    },
    (error) => {
      console.error('subscribeToCharacter error:', error)
      callback(null)
    }
  )
}

// Every character belonging to one session — powers a GM's "party" view.
export function subscribeToSessionCharacters(
  sessionId: string,
  callback: (characters: Character[]) => void
) {
  const q = query(collection(db, 'characters'), where('sessionId', '==', sessionId))
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Character)))
    },
    (error) => {
      console.error('subscribeToSessionCharacters error:', error)
      callback([])
    }
  )
}

// ============================================================
// Database fetches — cached at module level. The sheet should never
// make redundant Firestore reads for static reference data (qualities,
// skills, talents, critical injuries, objects); each collection is
// fetched once and reused for the lifetime of the app session.
// ============================================================

let skillsCache: SkillDoc[] | null = null
let talentsCache: TalentDoc[] | null = null
let qualitiesCache: QualityDoc[] | null = null
let criticalInjuriesCache: CriticalInjuryDoc[] | null = null
let objectsCache: ObjectDoc[] | null = null
const objectCache = new Map<string, ObjectDoc>()

export async function fetchSkills(): Promise<SkillDoc[]> {
  if (skillsCache) return skillsCache
  const snap = await getDocs(collection(db, 'skills'))
  skillsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SkillDoc))
  return skillsCache
}

export async function fetchTalents(): Promise<TalentDoc[]> {
  if (talentsCache) return talentsCache
  const snap = await getDocs(collection(db, 'talents'))
  talentsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TalentDoc))
  return talentsCache
}

export async function fetchQualities(): Promise<QualityDoc[]> {
  if (qualitiesCache) return qualitiesCache
  const snap = await getDocs(collection(db, 'qualities'))
  qualitiesCache = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QualityDoc))
  return qualitiesCache
}

export async function fetchCriticalInjuries(): Promise<CriticalInjuryDoc[]> {
  if (criticalInjuriesCache) return criticalInjuriesCache
  const snap = await getDocs(collection(db, 'criticalInjuries'))
  criticalInjuriesCache = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CriticalInjuryDoc))
  return criticalInjuriesCache
}

// Fetches the global object catalog (items with no sessionId). Once the
// custom-item upload feature exists, this becomes the place to also merge
// in session-scoped items — but that's a fast-follow, not needed yet.
export async function fetchObjects(): Promise<ObjectDoc[]> {
  if (objectsCache) return objectsCache
  const snap = await getDocs(collection(db, 'objects'))
  objectsCache = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as ObjectDoc))
    .filter((o) => !o.sessionId)
  return objectsCache
}

export async function fetchObject(id: string): Promise<ObjectDoc | null> {
  const cached = objectCache.get(id)
  if (cached) return cached
  const snap = await getDoc(doc(db, 'objects', id))
  if (!snap.exists()) return null
  const object = { id: snap.id, ...snap.data() } as ObjectDoc
  objectCache.set(id, object)
  return object
}

// Creates a purely cosmetic, player-made item — scoped to one session and
// one player, never visible to anyone else. Everything mechanical is left
// blank on purpose (type is always Mundane), same as any other item with
// no mechanical fields populated.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item'
}

// Doc ID is built to be human-scannable in the Firestore console —
// custom-{session}-{player}-{item}-{random} — rather than Firestore's
// opaque auto-generated ID. The random suffix exists purely to avoid
// collisions (two players naming an item the same thing, or the same
// player creating two items with the same name); it's not meant to be
// read, just to guarantee uniqueness. ownerId (uid) stays the actual
// authoritative reference for anything code checks against — the
// player's display name in the ID is a readability aid only, and goes
// stale if they rename their account. That's an accepted tradeoff.
export async function createCustomObject(
  sessionId: string,
  ownerId: string,
  ownerDisplayName: string,
  data: { name: string; description: string }
): Promise<string> {
  const randomSuffix = Math.random().toString(36).slice(2, 6)
  const docId = `custom-${sessionId.slice(0, 8)}-${slugify(ownerDisplayName)}-${slugify(data.name)}-${randomSuffix}`
  const ref = doc(db, 'objects', docId)
  const object: ObjectDoc = {
    id: docId,
    name: data.name,
    description: data.description,
    type: 'Mundane',
    rarity: 0,
    encumbrance: 0,
    sessionId,
    ownerId,
  }
  await setDoc(ref, object)
  return docId
}