import type { TalentTier, Characteristics, TalentConfig, SkillDef } from '../genesysCalc'
import { GENESYS_TALENTS, GENESYS_SKILLS, mergeConfigsByName } from '../genesysCalc'
export type { TalentConfig }

export interface CareerConfig {
  name: string
  skills: string[]
  specialAbility: { name: string; description: string }
}

export const BBB_CAREERS: CareerConfig[] = [
  {
    name: 'Floor Staff',
    skills: [
      'Athletics', 'Charm', 'Coordination', 'Knowledge (Store)',
      'Negotiation', 'Perception', 'Resilience', 'Vigilance',
    ],
    specialAbility: {
      name: 'Know the Way',
      description:
        'Once per session, automatically know the fastest, safest route to reach any location, object, or person.',
    },
  },
  {
    name: 'Cashier',
    skills: [
      'Charm', 'Coercion', 'Cool', 'Coordination',
      'Deception', 'Knowledge (Store)', 'Operating', 'Perception',
    ],
    specialAbility: {
      name: 'Lightning Hands',
      description: 'Once per session, change any non-combat action into an incidental.',
    },
  },
  {
    name: 'Customer Service',
    skills: [
      'Charm', 'Coercion', 'Cool', 'Deception',
      'Discipline', 'Knowledge (Store)', 'Negotiation', 'Operating',
    ],
    specialAbility: {
      name: 'Customer Is Always Right',
      description:
        'Once per session, after failing a social check, pass it instead with 1 success and 2 advantage.',
    },
  },
  {
    name: 'Unloader',
    skills: [
      'Athletics', 'Coordination', 'Knowledge (Store)', 'Operating',
      'Perception', 'Resilience', 'Skulduggery', 'Vigilance',
    ],
    specialAbility: {
      name: 'Jury Rig',
      description:
        'Once per session, repair or bypass one broken object, jammed door, or malfunctioning equipment without a check.',
    },
  },
]

// Overrides and additions to the general skill catalog, specific to BB&B.
const BBB_SKILL_OVERRIDES: (Partial<SkillDef> & { name: string })[] = [
  {
    // Deliberate departure from the book: BB&B uses Agility here, not the
    // book's Cunning. General catalog keeps Cunning as the default for
    // any future game that wants the standard version.
    name: 'Skulduggery',
    characteristic: 'agility',
    description: 'Lockpicking, pickpocketing, disabling traps, moving unseen.',
  },
  { name: 'Knowledge (General)', characteristic: 'intellect', description: 'General facts and trivia.' },
  { name: 'Knowledge (Cosmic)', characteristic: 'intellect', description: 'Lore of the Beyond.' },
  { name: 'Knowledge (Store)', characteristic: 'intellect', description: 'Store layout and procedures.' },
]

const BBB_SKILL_POOL = mergeConfigsByName(GENESYS_SKILLS, BBB_SKILL_OVERRIDES)

export const BBB_SKILLS: string[] = [
  'Athletics', 'Cool', 'Coordination', 'Discipline', 'Operating', 'Perception',
  'Resilience', 'Skulduggery', 'Vigilance', 'Charm', 'Coercion', 'Deception',
  'Negotiation', 'Knowledge (General)', 'Knowledge (Cosmic)', 'Knowledge (Store)',
  'Melee', 'Ranged',
]

// Derived from the pool rather than hand-typed — a skill's characteristic
// can never drift out of sync with the general catalog by accident.
export const BBB_SKILL_CHARACTERISTIC: Record<string, keyof Characteristics> = Object.fromEntries(
  BBB_SKILLS.map((name) => {
    const def = BBB_SKILL_POOL.find((s) => s.name === name)
    if (!def) throw new Error(`BBB_SKILLS references "${name}" which has no definition`)
    return [name, def.characteristic]
  })
)

export const BBB_SKILL_DESCRIPTIONS: Record<string, string | undefined> = Object.fromEntries(
  BBB_SKILLS.map((name) => [name, BBB_SKILL_POOL.find((s) => s.name === name)?.description])
)

export type SkillCategory = 'Combat' | 'Social' | 'Knowledge' | 'General'

export const BBB_SKILL_CATEGORY: Record<string, SkillCategory> = {
  'Melee': 'Combat',
  'Ranged': 'Combat',
  'Charm': 'Social',
  'Coercion': 'Social',
  'Deception': 'Social',
  'Negotiation': 'Social',
  'Knowledge (General)': 'Knowledge',
  'Knowledge (Cosmic)': 'Knowledge',
  'Knowledge (Store)': 'Knowledge',
  'Athletics': 'General',
  'Cool': 'General',
  'Coordination': 'General',
  'Discipline': 'General',
  'Operating': 'General',
  'Perception': 'General',
  'Resilience': 'General',
  'Skulduggery': 'General',
  'Vigilance': 'General',
}

export const SKILL_CATEGORY_ORDER: SkillCategory[] = ['Combat', 'Social', 'Knowledge', 'General']

// Only 6 talents needed an actual change for BB&B — the ones referencing
// skills BB&B doesn't have (Leadership, Mechanics). Everything else in
// GENESYS_TALENTS carries over unmodified.
const BBB_TALENT_OVERRIDES: (Partial<TalentConfig> & { name: string })[] = [
  {
    name: 'Coordinated Assault',
    description: 'Once per turn, allies engaged with you (up to your Coordination ranks) gain a boost die on combat checks until your next turn. Range extends per rank beyond the first.',
  },
  {
    name: 'Inspiring Rhetoric',
    description: 'Make a Coordination check; each success heals one strain to an ally in short range, each advantage heals an extra strain to someone already helped.',
  },
  {
    name: 'Field Commander',
    description: 'Make a Coordination check; success lets a number of allies equal to your Presence each spend 1 strain to take a free maneuver out of turn.',
  },
  {
    name: 'Inspiring Rhetoric (Improved)',
    description: 'Requires Inspiring Rhetoric. Allies healed by your Inspiring Rhetoric also gain a boost die on checks for a number of rounds equal to your Coordination ranks.',
  },
  {
    name: 'How Convenient!',
    description: 'Once per session, a Hard Operating check makes a device involved in the current scene conveniently break down.',
  },
  {
    name: 'Mad Inventor',
    description: 'Once per session, an Operating check (difficulty set by rarity) jury-rigs a working equivalent of an item from scrap.',
  },
]

export const BBB_TALENTS: TalentConfig[] = mergeConfigsByName(GENESYS_TALENTS, BBB_TALENT_OVERRIDES)

export const BBB_STARTING_XP = 110
export const BBB_STARTING_CHARACTERISTIC = 2
export const BBB_MAX_STARTING_CHARACTERISTIC = 5
export const BBB_MAX_STARTING_SKILL_RANK = 2
export const BBB_FREE_CAREER_SKILL_PICKS = 4
export const BBB_SPECIES = 'Human'

// ---- Inventory ----

export type WeaponCategory = 'melee' | 'thrown' | 'special'

export interface WeaponTemplate {
  id: string
  name: string
  category: WeaponCategory
  skill: 'Melee' | 'Ranged'
  damage: number // melee: bonus added to Brawn. thrown/special: flat total (before Momentum)
  crit: number
  range: string
  encumbrance: number
  hasMomentum: boolean
}

export const BBB_WEAPON_TEMPLATES: WeaponTemplate[] = [
  { id: 'melee-small-light', name: 'Small Melee (Light)', category: 'melee', skill: 'Melee', damage: 1, crit: 5, range: 'Engaged', encumbrance: 0, hasMomentum: false },
  { id: 'melee-small-heavy', name: 'Small Melee (Heavy)', category: 'melee', skill: 'Melee', damage: 2, crit: 4, range: 'Engaged', encumbrance: 1, hasMomentum: false },
  { id: 'melee-medium-light', name: 'Medium Melee (Light)', category: 'melee', skill: 'Melee', damage: 3, crit: 4, range: 'Engaged', encumbrance: 2, hasMomentum: false },
  { id: 'melee-medium-heavy', name: 'Medium Melee (Heavy)', category: 'melee', skill: 'Melee', damage: 4, crit: 4, range: 'Engaged', encumbrance: 2, hasMomentum: false },
  { id: 'melee-large-light', name: 'Large Melee (Light)', category: 'melee', skill: 'Melee', damage: 5, crit: 3, range: 'Engaged', encumbrance: 3, hasMomentum: false },
  { id: 'melee-large-heavy', name: 'Large Melee (Heavy)', category: 'melee', skill: 'Melee', damage: 6, crit: 2, range: 'Engaged', encumbrance: 4, hasMomentum: false },
  { id: 'thrown-small-light', name: 'Small Thrown (Light)', category: 'thrown', skill: 'Ranged', damage: 2, crit: 6, range: 'Short', encumbrance: 0, hasMomentum: true },
  { id: 'thrown-small-heavy', name: 'Small Thrown (Heavy)', category: 'thrown', skill: 'Ranged', damage: 3, crit: 6, range: 'Short', encumbrance: 1, hasMomentum: true },
  { id: 'thrown-medium-light', name: 'Medium Thrown (Light)', category: 'thrown', skill: 'Ranged', damage: 4, crit: 5, range: 'Short', encumbrance: 1, hasMomentum: true },
  { id: 'thrown-medium-heavy', name: 'Medium Thrown (Heavy)', category: 'thrown', skill: 'Ranged', damage: 5, crit: 5, range: 'Short', encumbrance: 2, hasMomentum: true },
  { id: 'thrown-large-light', name: 'Large Thrown (Light)', category: 'thrown', skill: 'Ranged', damage: 6, crit: 4, range: 'Short', encumbrance: 3, hasMomentum: true },
  { id: 'thrown-large-heavy', name: 'Large Thrown (Heavy)', category: 'thrown', skill: 'Ranged', damage: 7, crit: 3, range: 'Short', encumbrance: 3, hasMomentum: true },
  { id: 'handgun', name: 'Handgun', category: 'special', skill: 'Ranged', damage: 6, crit: 3, range: 'Medium', encumbrance: 1, hasMomentum: false },
]

// Chargen restriction: only weapons at or below this damage are available
// when creating a character — stronger ones get found/earned during play.
export const BBB_MAX_STARTING_WEAPON_DAMAGE = 3

// Every character starts with this exact armor — new employees all get the
// same minimal gear. Only the name is player-chosen.
export const BBB_STARTING_ARMOR = {
  soak: 1,
  meleeDefense: 0,
  rangedDefense: 0,
  encumbrance: 1,
}