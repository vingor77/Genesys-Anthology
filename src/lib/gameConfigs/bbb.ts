// Config only — no embedded data. Tells the sheet what to show and how;
// the actual skill/talent/quality/object data lives in Firestore.

export interface CareerConfig {
  name: string
  chosenSkills: { count: number; pool: string[] } // free ranks at creation — base Genesys, all careers grant these
  specialAbility: { name: string; description: string }
}

// specialAbility here is the SOURCE data — Phase 2's creation wizard
// copies it onto character.career.specialAbility at creation time. The
// config still needs to define it somewhere; only the long-term storage
// location changed (the character document, not a runtime lookup by name).
export const BBB_CAREERS: CareerConfig[] = [
  {
    name: 'Floor Staff',
    chosenSkills: {
      count: 4,
      pool: ['athletics', 'charm', 'coordination', 'knowledge-store', 'negotiation', 'perception', 'resilience', 'vigilance'],
    },
    specialAbility: {
      name: 'Know the Way',
      description: 'Once per session, automatically know the fastest, safest route to reach any location, object, or person.',
    },
  },
  {
    name: 'Cashier',
    chosenSkills: {
      count: 4,
      pool: ['charm', 'coercion', 'cool', 'coordination', 'deception', 'knowledge-store', 'operating', 'perception'],
    },
    specialAbility: {
      name: 'Lightning Hands',
      description: 'Once per session, change any non-combat action into an incidental.',
    },
  },
  {
    name: 'Customer Service',
    chosenSkills: {
      count: 4,
      pool: ['charm', 'coercion', 'cool', 'deception', 'discipline', 'knowledge-store', 'negotiation', 'operating'],
    },
    specialAbility: {
      name: 'Customer Is Always Right',
      description: 'Once per session, after failing a social check, pass it instead with 1 success and 2 advantage.',
    },
  },
  {
    name: 'Unloader',
    chosenSkills: {
      count: 4,
      pool: ['athletics', 'coordination', 'knowledge-store', 'operating', 'perception', 'resilience', 'skulduggery', 'vigilance'],
    },
    specialAbility: {
      name: 'Jury Rig',
      description: "Once per session, repair or bypass one broken object, jammed door, or malfunctioning equipment without a check.",
    },
  },
]

// Which skill documents (by id) are valid for BB&B — the sheet renders
// exactly this set, in this order, grouped by BBB_SKILL_CATEGORY below.
export const BBB_SKILLS: string[] = [
  'athletics', 'cool', 'coordination', 'discipline', 'operating', 'perception',
  'resilience', 'skulduggery', 'vigilance', 'charm', 'coercion', 'deception',
  'negotiation', 'knowledge', 'knowledge-cosmic', 'knowledge-store',
  'melee', 'ranged',
]

// Small, deliberate exception: BB&B uses Agility for Skulduggery, not the
// book's Cunning (folds lockpicking + stealth together, matching how
// these two are usually both Agility-based elsewhere). This is NOT data
// merging — the skill's real definition in Firestore is untouched and
// still says Cunning for any other game. This is just a one-field lookup
// the sheet checks after fetching a skill's default characteristic,
// specific to this one game and this one skill.
export const BBB_SKILL_CHARACTERISTIC_OVERRIDES: Record<string, string> = {
  skulduggery: 'agility',
}

export type SkillCategory = 'Combat' | 'Social' | 'Knowledge' | 'General'

export const SKILL_CATEGORY_ORDER: SkillCategory[] = ['General', 'Combat', 'Social', 'Knowledge']

export const BBB_SKILL_CATEGORY: Record<string, SkillCategory> = {
  melee: 'Combat',
  ranged: 'Combat',
  charm: 'Social',
  coercion: 'Social',
  deception: 'Social',
  negotiation: 'Social',
  knowledge: 'Knowledge',
  'knowledge-cosmic': 'Knowledge',
  'knowledge-store': 'Knowledge',
  athletics: 'General',
  cool: 'General',
  coordination: 'General',
  discipline: 'General',
  operating: 'General',
  perception: 'General',
  resilience: 'General',
  skulduggery: 'General',
  vigilance: 'General',
}

// Which talent documents (by id) are valid for BB&B.
export const BBB_TALENTS: string[] = [
  // Tier 1
  'bought-info', 'clever-retort', 'desperate-recovery', 'durable', 'grit', 'jump-up',
  'knack-for-it', 'know-somebody', 'parry', 'proper-upbringing', 'quick-draw', 'quick-strike',
  'rapid-reaction', 'second-wind', 'swift', 'toughened',
  // Tier 2
  'coordinated-assault', 'counteroffer', 'heightened-awareness-talent', 'inspiring-rhetoric',
  'inventor', 'lucky-strike', 'scathing-tirade', 'side-step',
  // Tier 3
  'dodge', 'field-commander', 'forgot-to-count', 'inspiring-rhetoric-improved',
  'painkiller-specialization', 'scathing-tirade-improved', 'heroic-will', 'natural',
  // Tier 4
  'cant-we-talk-about-this', 'deadeye', 'defensive', 'enduring', 'field-commander-improved',
  'how-convenient', 'inspiring-rhetoric-supreme', 'mad-inventor', 'scathing-tirade-supreme',
  // Tier 5
  'dedication', 'indomitable', 'master', 'ruinous-repartee',
]

export const BBB_STARTING_XP = 110
export const BBB_STARTING_CHARACTERISTIC = 2
export const BBB_MAX_STARTING_CHARACTERISTIC = 5
export const BBB_MAX_STARTING_SKILL_RANK = 2
export const BBB_FREE_CAREER_SKILL_PICKS = 4
export const BBB_MAX_STARTING_WEAPON_DAMAGE = 3

// Object ids for BB&B's actual starting items — filters out the earlier
// generic schema-validation Objects (Store Vest, etc.) that aren't part
// of BB&B's real catalog. Concrete, pre-named, pre-qualified items now,
// not templates — the player picks one directly, nothing to customize.
export const BBB_WEAPON_IDS: string[] = [
  'stress-ball', 'coffee-mug', 'candle', 'paperweight',
  'box-cutter', 'scissors', 'letter-opener', 'knife',
  'meat-tenderizer', 'wrench', 'mop-broom-handle', 'yardstick',
]

export const BBB_ARMOR_IDS: string[] = ['work-apron', 'thick-jacket', 'layered-cardboard', 'pot-lid-shield-rig']

export const BBB_UNIVERSAL_GEAR_ID = 'walkie-talkie'

export const BBB_GEAR_IDS: string[] = [
  'duct-tape', 'first-aid-kit', 'water-bottle-bbb', 'energy-drink', 'flashlight-bbb',
  'break-room-snacks', 'umbrella', 'cleaning-supplies', 'scanner', 'blanket',
]

// Not explicitly settled — picked 2 as a reasonable default (out of 10
// available), same shape as other "pick N" chargen steps. Easy to adjust.
export const BBB_FREE_GEAR_PICKS = 2

export const CURRENCY_LABEL = 'Dollars'

// BB&B has exactly one fixed species — every character is Human, no
// picker needed. CreateCharacter.tsx depends on this directly.
export const BBB_SPECIES = 'Human'

// Which equipment slots this game actually uses — BB&B is deliberately
// minimal, narrative combat isn't the focus.
export const ACTIVE_SLOTS = ['Main Hand', 'Off Hand', 'Chest'] as const

// Which sheet sections render for this game — survival tracks, sickness,
// and faction reputation are Backrooms-only concepts, hidden entirely here.
export const VISIBLE_SHEET_SECTIONS = [
  'characteristics', 'skills', 'talents', 'inventory', 'status',
  'motivations', 'description', 'currency', 'notes',
] as const

// Which Object fields render in item displays. The structure supports
// every field for any game — this only controls what BB&B specifically
// hides (crafting-system fields, per-stack removal counts, Light Source's
// sub-fields). A future Backrooms config would show all of these, since
// its crafting/survival systems actually use them.
export const VISIBLE_ITEM_FIELDS = {
  factionExclusive: false,
  craftingMaterial: false,
  repairMaterials: false,
  craftSkill: false,
  hungerStacksRemoved: false,
  thirstStacksRemoved: false,
  lightSourceDetails: false, // covers light_step_boost/light_cap/duration/fuel_type as a group
  noclip: false, // covers noclip_enabled/noclip_skill/noclip_difficulty as a group
  sanity: false, // covers sanity_restored/sanity_threshold_required as a group
  timekeeping: false, // covers timekeeping/timekeeping_accurate as a group
  suppressEffect: false,
  protectionType: false,
  curesSickness: false,
}