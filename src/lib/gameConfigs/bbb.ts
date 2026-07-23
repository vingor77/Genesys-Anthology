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

// TEST MODE — every skill in the shared collection unlocked, not just
// BBB's real curated 27. Restore the real BBB_SKILLS list (documented in
// data_audit_plan.md) once this test pass is done.
export const BBB_SKILLS: string[] = [
  'charm', 'coercion', 'deception', 'leadership', 'negotiation',
  'alchemy', 'astrocartography', 'athletics', 'computers', 'cool', 'coordination',
  'discipline', 'driving', 'mechanics', 'medicine', 'operating', 'perception',
  'piloting', 'resilience', 'riding', 'skulduggery', 'stealth', 'streetwise',
  'survival', 'vigilance', 'fabrication', 'fine-crafting', 'compounding',
  'knowledge', 'knowledge-anomalous', 'knowledge-store',
  'brawl', 'melee', 'melee-light', 'melee-heavy', 'ranged', 'ranged-light', 'ranged-heavy', 'gunnery',
]

// Small, deliberate exception: BB&B uses Agility for Skulduggery, not the
// book's Cunning (folds lockpicking + stealth together, matching how
// these two are usually both Agility-based elsewhere). This is NOT data
// merging — the skill's real definition in Firestore is untouched and
// still says Cunning for any other game. This is just a one-field lookup
// the sheet checks after fetching a skill's default characteristic,
// specific to this one game and this one skill.
// Was an Agility override folding Stealth into Skulduggery — reverted
// once Stealth became its own separate BBB skill again, since the whole
// reason for the fold no longer applied. That decision was made but the
// actual code change was never carried out until now — Skulduggery goes
// back to the book default (Cunning), no override needed.
export const BBB_SKILL_CHARACTERISTIC_OVERRIDES: Record<string, string> = {}

export type SkillCategory = 'Combat' | 'Social' | 'Knowledge' | 'General'

export const SKILL_CATEGORY_ORDER: SkillCategory[] = ['General', 'Combat', 'Social', 'Knowledge']

// TEST MODE — full category map for all 39 skills, matching Skills.ts.
export const BBB_SKILL_CATEGORY: Record<string, SkillCategory> = {
  charm: 'Social', coercion: 'Social', deception: 'Social', leadership: 'Social', negotiation: 'Social',
  alchemy: 'General', astrocartography: 'General', athletics: 'General', computers: 'General', cool: 'General',
  coordination: 'General', discipline: 'General', driving: 'General', mechanics: 'General', medicine: 'General',
  operating: 'General', perception: 'General', piloting: 'General', resilience: 'General', riding: 'General',
  skulduggery: 'General', stealth: 'General', streetwise: 'General', survival: 'General', vigilance: 'General',
  fabrication: 'General', 'fine-crafting': 'General', compounding: 'General',
  knowledge: 'Knowledge', 'knowledge-anomalous': 'Knowledge', 'knowledge-store': 'Knowledge',
  brawl: 'Combat', melee: 'Combat', 'melee-light': 'Combat', 'melee-heavy': 'Combat',
  ranged: 'Combat', 'ranged-light': 'Combat', 'ranged-heavy': 'Combat', gunnery: 'Combat',
}

// TEST MODE — every talent in the shared collection unlocked, not just
// BBB's real curated subset. Restore the real BBB_TALENTS list once this
// test pass is done.
export const BBB_TALENTS: string[] = [
  // Tier 1 (23)
  'bought-info', 'clever-retort', 'desperate-recovery', 'duelist', 'durable', 'forager', 'grit',
  'hamstring-shot', 'jump-up', 'knack-for-it', 'know-somebody', 'lets-ride', 'one-with-nature',
  'parry', 'proper-upbringing', 'quick-draw', 'quick-strike', 'rapid-reaction', 'second-wind',
  'surgeon', 'swift', 'toughened', 'unremarkable',
  // Tier 2 (13)
  'basic-military-training', 'berserk', 'coordinated-assault', 'counteroffer', 'daring-aviator',
  'defensive-stance', 'inventor', 'fan-the-hammer', 'heightened-awareness-talent', 'inspiring-rhetoric',
  'lucky-strike', 'scathing-tirade', 'side-step',
  // Tier 3 (12)
  'dodge', 'forgot-to-count', 'eagle-eyes', 'field-commander', 'good-arm', 'inspiring-rhetoric-improved',
  'painkiller-specialization', 'scathing-tirade-improved', 'heroic-will', 'natural',
  'fan-the-hammer-improved', 'parry-improved',
  // Tier 4 (9)
  'cant-we-talk-about-this', 'deadeye', 'defensive-talent', 'enduring', 'field-commander-improved',
  'how-convenient', 'inspiring-rhetoric-supreme', 'mad-inventor', 'scathing-tirade-supreme',
  // Tier 5 (4)
  'dedication', 'indomitable', 'master', 'ruinous-repartee',
]

// TEST MODE — bumped up so nothing during testing is budget-constrained.
// Restore the real BBB starting values once this test pass is done.
export const BBB_STARTING_XP = 99999
export const BBB_STARTING_CHARACTERISTIC = 2
export const BBB_MAX_STARTING_CHARACTERISTIC = 6
export const BBB_MAX_STARTING_SKILL_RANK = 5
export const BBB_FREE_CAREER_SKILL_PICKS = 8

// BBB_WEAPON_IDS below is a curated list — every weapon in it is already
// meant to be selectable at chargen. A separate damage cap on top of that
// was a holdover from before the catalog became fixed pre-named items;
// once BBB_WEAPON_IDS itself is the curation, a second filter on top is
// redundant and, worse, silently hides anything above the cap without
// the picker saying why. Removed rather than raised.

// Object ids for BB&B's actual starting items — filters out the earlier
// generic schema-validation Objects (Store Vest, etc.) that aren't part
// of BB&B's real catalog. Concrete, pre-named, pre-qualified items now,
// not templates — the player picks one directly, nothing to customize.
export const BBB_WEAPON_IDS: string[] = [
  'box-cutter', 'meat-tenderizer', 'wrench', 'broom-handle', 'porcelain-mug', 'makeshift-nail-gun',
  // TEST MODE additions — remove after this test pass
  'test-blade', 'test-cannon', 'test-spear', 'test-net-gun', 'test-stunner', 'test-rifle',
  'test-cleaver', 'test-unwieldy-hammer', 'test-throwing-javelin', 'test-inferior-chunk',
]

export const BBB_ARMOR_IDS: string[] = ['work-apron', 'thick-jacket', 'riot-shield-rig', 'police-uniform']

export const BBB_UNIVERSAL_GEAR_ID = 'walkie-talkie'

// Normally employee-of-the-month-badge is deliberately excluded here —
// obtainable during play through the sheet's Add Item catalog (which
// reads the full objects collection, not this list), just not available
// as a free chargen pick. Included above for this test pass only.
// TEST MODE — includes employee-of-the-month-badge, which is normally
// deliberately excluded here (play-only, obtained through the sheet's
// own Add Item catalog rather than a chargen pick). Remove it again once
// this test pass is done.
export const BBB_GEAR_IDS: string[] = [
  'salad', 'sandwich', 'energy-drink', 'stale-coffee',
  'store-flashlight', 'wind-up-lantern', 'utility-multitool', 'managers-clipboard', 'crumpled-store-manual',
  'employee-of-the-month-badge',
  // TEST MODE additions — remove after this test pass
  'test-direct-modifier-charm', 'test-fabrication-kit', 'test-fine-crafting-kit', 'test-compounding-kit',
]

// Split into two required picks rather than one flat "pick N" — a
// one-use item and two reusable items. "One-use" isn't a literal use
// count; it means gone for good once exhausted (usesCannotRestore, or
// carries the Fragile quality), regardless of whether that's 1 use or 5.
// Which of the 10 catalog items falls into which pool is entirely
// data-driven off those fields — nothing here needs to change once the
// catalog is redesigned.
export const BBB_FREE_GEAR_PICKS_ONE_USE = 1
export const BBB_FREE_GEAR_PICKS_REUSABLE = 2

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
  craftingMaterial: true,
  // Flagging: these two look like they were mistakenly hidden rather
  // than deliberately — BBB has a real crafting/repair system (three
  // crafting skills, Jury Rig, Mad Inventor), so hiding the fields that
  // drive it doesn't match "this game doesn't use it" the way the other
  // false flags above genuinely do. Flipped on here to actually test
  // them; worth deciding whether this should just stay on permanently
  // rather than reverting after this test pass.
  repairMaterials: true,
  craftSkill: true,
  hungerStacksRemoved: false,
  thirstStacksRemoved: false,
  lightSourceDetails: false, // covers light_step_boost/light_cap/duration/fuel_type as a group
  noclip: false, // covers noclip_enabled/noclip_skill/noclip_difficulty as a group
  sanity: false, // covers sanity_restored/sanity_threshold_required as a group
  timekeeping: false, // covers timekeeping/timekeeping_accurate as a group
  suppressEffect: false,
  protectionType: false,
  curesSickness: false,
  recoveryRollModifier: false, // pairs with curesSickness — was missing its own gate before
  // Was "false everywhere, any game, until a dice roller exists to
  // consume them" — that roller now exists and does consume them, so
  // this gate is genuinely outdated rather than a test-mode loosening.
  // Flipped on for good, not just for this test pass.
  poolModifiers: true,
  resultModifiers: true,
}