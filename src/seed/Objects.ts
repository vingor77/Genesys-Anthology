// Seed data for the `objects` Firestore collection — the real BB&B
// catalog, replacing the original schema-validation placeholder data
// entirely. 6 Weapons (4 melee, 2 ranged), 4 Armor (Chest-only, per BBB's
// single-armor-slot design), 1 universal starting item, and 10 Gear items
// split 2-per-type across Food/Drink/Light Source/Tool/Mundane (4 one-use,
// 6 reusable — matches BBB_FREE_GEAR_PICKS_ONE_USE/REUSABLE in bbb.ts).
//
// The ObjectDoc interface below is kept in lockstep with the real one in
// characters.ts — this file used to define its own slightly-stale copy,
// which is exactly the kind of drift that's easy to miss. If characters.ts's
// ObjectDoc changes, update this one to match before seeding again.

export interface ObjectDoc {
  id: string
  name: string
  description: string
  type: 'Weapon' | 'Armor' | 'Food' | 'Drink' | 'Light Source' | 'Tool' | 'Mundane'
  rarity: number
  encumbrance: number
  // Null/absent = global catalog. Populated = player-created custom item,
  // scoped to one session (and optionally one owner). Every entry below
  // is global catalog data, so neither is ever set here.
  sessionId?: string
  ownerId?: string
  price?: number
  is_quest_item?: boolean
  faction_exclusive?: string
  is_crafting_material?: boolean
  slots?: string[]
  // Only meaningful when slots.length > 1. 'all' = fills every listed
  // slot at once (genuinely two-handed). 'any' = occupies exactly one of
  // the listed slots, player's choice at equip time.
  slotMode?: 'all' | 'any'
  effect?: string
  statModifiers?: { stat: string; amount: number; autoApply: boolean }[]
  poolModifiers?: { type: string; amount: number; appliesTo: string; autoApply: boolean }[]
  resultModifiers?: { type: string; amount: number; appliesTo: string; autoApply: boolean }[]
  situational?: { condition: string; effect: string }
  durability?: number
  uses?: number
  usesCannotRestore?: boolean
  repair_material?: string
  craft_skill?: 'Fabrication' | 'Fine Crafting' | 'Compounding'
  // Weapon fields
  damage?: number
  damageType?: 'Brawn-based' | 'Fixed'
  crit?: number
  range?: 'Engaged' | 'Short' | 'Medium' | 'Long' | 'Extreme'
  skill?: string
  qualities?: { name: string; rank?: number }[]
  // Armor fields
  soak?: number
  meleeDefense?: number
  rangedDefense?: number
  // Food & Drink fields
  hunger_stacks_removed?: number
  thirst_stacks_removed?: number
  bonus_effects?: string
  // Light Source fields
  light_step_boost?: number
  light_cap?: string
  duration?: number
  fuel_type?: 'Batteries' | 'Gasoline' | 'Single Use' | 'None'
  // Backrooms extension fields — none of BBB's catalog uses these, kept
  // here only so this interface stays a true match of characters.ts.
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

export const OBJECTS: ObjectDoc[] = [
  // ==================== Weapons (6: 4 melee, 2 ranged) ====================
  {
    id: 'box-cutter',
    name: 'Box Cutter',
    description: 'Small and easily concealed, kept sharp for pallets.',
    type: 'Weapon',
    rarity: 1,
    encumbrance: 0,
    price: 10,
    durability: 2,
    slots: ['Main Hand', 'Off Hand'],
    slotMode: 'any',
    damage: 3,
    damageType: 'Brawn-based',
    crit: 2,
    range: 'Engaged',
    skill: 'melee',
    qualities: [{ name: 'Vicious', rank: 1 }],
  },
  {
    id: 'meat-tenderizer',
    name: 'Meat Tenderizer',
    description: 'Heavy, blunt, extremely persuasive.',
    type: 'Weapon',
    rarity: 0,
    encumbrance: 3,
    price: 15,
    durability: 3,
    slots: ['Main Hand'],
    damage: 5,
    damageType: 'Brawn-based',
    crit: 4,
    range: 'Engaged',
    skill: 'melee',
    qualities: [
      { name: 'Disorient', rank: 1 },
      { name: 'Cumbersome', rank: 3 },
    ],
  },
  {
    id: 'wrench',
    name: 'Wrench',
    description: 'Adjustable, good for bolts or skulls.',
    type: 'Weapon',
    rarity: 0,
    encumbrance: 2,
    price: 15,
    durability: 3,
    slots: ['Main Hand'],
    damage: 4,
    damageType: 'Brawn-based',
    crit: 3,
    range: 'Engaged',
    skill: 'melee',
    qualities: [{ name: 'Knockdown', rank: 1 }],
  },
  {
    id: 'broom-handle',
    name: 'Broom Handle',
    description: 'Reach without really being a weapon; catches ankles.',
    type: 'Weapon',
    rarity: 0,
    encumbrance: 2,
    price: 15,
    durability: 3,
    slots: ['Main Hand', 'Off Hand'],
    slotMode: 'all',
    damage: 6,
    damageType: 'Fixed',
    crit: 4,
    range: 'Engaged',
    skill: 'melee',
    qualities: [{ name: 'Disorient', rank: 2 }],
  },
  {
    id: 'porcelain-mug',
    name: 'Porcelain Mug',
    description: 'Break room stock, thin-walled, throws true.',
    type: 'Weapon',
    rarity: 1,
    encumbrance: 0,
    price: 5,
    durability: 1,
    slots: ['Main Hand'],
    damage: 3,
    damageType: 'Fixed',
    crit: 4,
    range: 'Short',
    skill: 'ranged',
    qualities: [
      { name: 'Blast', rank: 2 },
      { name: 'Fragile' },
      { name: 'Momentum' },
    ],
    situational: {
      condition: 'If a hot liquid was in it when thrown',
      effect: 'Also inflicts Burn 2.',
    },
  },
  {
    id: 'makeshift-nail-gun',
    name: 'Makeshift Nail Gun',
    description: 'Real stopping power, real reload time.',
    type: 'Weapon',
    rarity: 3,
    encumbrance: 3,
    price: 30,
    durability: 3,
    uses: 10,
    slots: ['Main Hand'],
    damage: 6,
    damageType: 'Fixed',
    crit: 3,
    range: 'Short',
    skill: 'ranged',
    qualities: [
      { name: 'Slow-Firing', rank: 1 },
      { name: 'Limited Ammo', rank: 10 },
    ],
  },

  // ==================== Armor (4, all Chest) ====================
  {
    id: 'work-apron',
    name: 'Work Apron',
    description: 'Standard issue, offers basically nothing but pockets.',
    type: 'Armor',
    rarity: 0,
    encumbrance: 1,
    price: 10,
    durability: 3,
    slots: ['Chest'],
    soak: 1,
    meleeDefense: 0,
    rangedDefense: 0,
  },
  {
    id: 'thick-jacket',
    name: 'Thick Jacket',
    description:
      'Whatever was on the winter clearance rack. The soft fabric lessens the chance of taking damage from ranged attacks.',
    type: 'Armor',
    rarity: 0,
    encumbrance: 2,
    price: 20,
    durability: 3,
    slots: ['Chest'],
    soak: 1,
    meleeDefense: 0,
    rangedDefense: 1,
  },
  {
    id: 'riot-shield-rig',
    name: 'Riot Shield Rig',
    description: 'Pot lids and a mop bucket lid, load-bearing straps.',
    type: 'Armor',
    rarity: 2,
    encumbrance: 3,
    price: 35,
    durability: 3,
    slots: ['Chest'],
    soak: 0,
    meleeDefense: 1,
    rangedDefense: 1,
    qualities: [{ name: 'Reinforced' }],
  },
  {
    id: 'police-uniform',
    name: 'Police Uniform',
    description: "Not a real officer's, but it doesn't need to survive close scrutiny.",
    type: 'Armor',
    rarity: 4,
    encumbrance: 4,
    price: 100,
    durability: 3,
    slots: ['Chest'],
    soak: 1,
    meleeDefense: 1,
    rangedDefense: 1,
    situational: {
      condition: 'While worn',
      effect: "Add 1 setback die to all social skill checks — people don't like talking to cops, even fake ones.",
    },
  },

  // ==================== Universal starting gear (unchanged) ====================
  {
    id: 'walkie-talkie',
    name: 'Walkie-Talkie',
    description: 'Long range, static-prone. Adds a boost die to coordinated actions with someone else carrying one.',
    type: 'Tool',
    rarity: 0,
    encumbrance: 1,
    effect: 'Adds a boost die to coordinated actions with another Walkie-Talkie carrier.',
  },

  // ==================== Gear — Food (2, one-use) ====================
  {
    id: 'salad',
    name: 'Salad',
    description: 'Somehow still fresh. The focus is real, if brief.',
    type: 'Food',
    rarity: 0,
    encumbrance: 0,
    price: 6,
    uses: 1,
    usesCannotRestore: true,
    effect: 'Add 1 boost die to Operating checks for 2 hours after eating.',
  },
  {
    id: 'sandwich',
    name: 'Sandwich',
    description: "Real meat, real cheese. Sturdier than you'd expect.",
    type: 'Food',
    rarity: 0,
    encumbrance: 0,
    price: 6,
    uses: 1,
    usesCannotRestore: true,
    effect: 'Ignore the next instance of wound or strain damage received after eating.',
  },

  // ==================== Gear — Drink (2, one-use) ====================
  {
    id: 'energy-drink',
    name: 'Energy Drink',
    description: 'Jittery focus, briefly. The crash is real.',
    type: 'Drink',
    rarity: 0,
    encumbrance: 0,
    price: 4,
    uses: 1,
    usesCannotRestore: true,
    statModifiers: [{ stat: 'strainThreshold', amount: 2, autoApply: false }],
    effect: '+2 Strain Threshold for 1 hour after drinking. When it wears off, suffer 2 strain damage (the crash).',
  },
  {
    id: 'stale-coffee',
    name: 'Stale Coffee',
    description: 'Bitter, but it works.',
    type: 'Drink',
    rarity: 0,
    encumbrance: 0,
    price: 2,
    uses: 1,
    usesCannotRestore: true,
    statModifiers: [{ stat: 'strainThreshold', amount: 1, autoApply: false }],
    effect: '+1 Strain Threshold for 3 hours after drinking.',
  },

  // ==================== Gear — Light Source (2, reusable) ====================
  {
    id: 'store-flashlight',
    name: 'Store Flashlight',
    description: 'Standard issue, kept in the back office.',
    type: 'Light Source',
    rarity: 0,
    encumbrance: 1,
    price: 15,
    uses: 20,
    effect: 'Casts a steady beam, 20ft radius.',
  },
  {
    id: 'wind-up-lantern',
    name: 'Wind-Up Lantern',
    description: 'No batteries needed — cranks itself, at the cost of range.',
    type: 'Light Source',
    rarity: 1,
    encumbrance: 2,
    price: 25,
    effect: 'Casts a dim beam, 10ft radius. Never needs batteries.',
  },

  // ==================== Gear — Tool (2, reusable) ====================
  {
    id: 'utility-multitool',
    name: 'Utility Multitool',
    description: 'Screwdriver, pliers, bottle opener — always in a pocket.',
    type: 'Tool',
    rarity: 2,
    encumbrance: 0,
    price: 20,
    uses: 3,
    effect: '3 times per shift, gain an automatic success on any check — you have the tools for the job.',
  },
  {
    id: 'managers-clipboard',
    name: "Manager's Clipboard",
    description: 'Middle-management energy in physical form.',
    type: 'Tool',
    rarity: 1,
    encumbrance: 0,
    price: 10,
    effect: 'While inspecting, add 1 boost die to Perception checks within the store.',
  },

  // ==================== Gear — Mundane (2, reusable) ====================
  {
    id: 'employee-of-the-month-badge',
    name: 'Employee of the Month Badge',
    description: 'Hard-won. People respect it more than they should.',
    type: 'Mundane',
    rarity: 9,
    encumbrance: 0,
    price: 0,
    statModifiers: [{ stat: 'presence', amount: 1, autoApply: true }],
  },
  {
    id: 'crumpled-store-manual',
    name: 'Crumpled Store Manual',
    description: 'Answers questions nobody asked, occasionally useful.',
    type: 'Mundane',
    rarity: 0,
    encumbrance: 0,
    price: 1,
    effect: 'Add 1 boost die to Knowledge (Store) checks.',
  },

  // ==================== TEST ITEMS — not real BB&B catalog ====================
  // Everything below exists purely to exercise mechanics the real 22-item
  // catalog never happened to touch — qualities, craft_skill values, and
  // direct Object-level modifiers. Not meant to make narrative sense;
  // delete freely once testing is done.

  {
    id: 'test-blade',
    name: '[TEST] Accurate/Superior Blade',
    description: 'Tests: ranked Accurate (poolModifiers scaling by this item\'s own rank), Superior (autoApply resultModifiers).',
    type: 'Weapon',
    rarity: 0,
    encumbrance: 1,
    durability: 5,
    slots: ['Main Hand'],
    damage: 5,
    damageType: 'Brawn-based',
    crit: 3,
    range: 'Engaged',
    skill: 'melee',
    qualities: [
      { name: 'Accurate', rank: 2 },
      { name: 'Superior' },
    ],
  },
  {
    id: 'test-cannon',
    name: '[TEST] Inaccurate/Auto-fire/Breach Cannon',
    description: 'Tests: ranked Inaccurate (poolModifiers), Auto-fire (manual-toggle poolModifiers), Breach (text-only, cross-sheet vehicle armor).',
    type: 'Weapon',
    rarity: 0,
    encumbrance: 5,
    durability: 5,
    slots: ['Main Hand', 'Off Hand'],
    slotMode: 'all',
    damage: 8,
    damageType: 'Fixed',
    crit: 2,
    range: 'Long',
    skill: 'ranged',
    qualities: [
      { name: 'Inaccurate', rank: 2 },
      { name: 'Auto-fire' },
      { name: 'Breach', rank: 1 },
    ],
  },
  {
    id: 'test-spear',
    name: '[TEST] Defensive/Deflection/Pierce Spear',
    description: 'Tests: ranked Defensive (statModifiers meleeDefense), ranked Deflection (statModifiers rangedDefense), Pierce (text-only, target soak).',
    type: 'Weapon',
    rarity: 0,
    encumbrance: 2,
    durability: 5,
    slots: ['Main Hand', 'Off Hand'],
    slotMode: 'all',
    damage: 5,
    damageType: 'Brawn-based',
    crit: 3,
    range: 'Engaged',
    skill: 'melee',
    qualities: [
      { name: 'Defensive', rank: 2 },
      { name: 'Deflection', rank: 1 },
      { name: 'Pierce', rank: 2 },
    ],
  },
  {
    id: 'test-net-gun',
    name: '[TEST] Ensnare/Linked/Prepare Net Gun',
    description: 'Tests: Ensnare (appliesStatusId, cross-sheet target status), Linked (text-only extra hits), Prepare (preparationRemaining tracking).',
    type: 'Weapon',
    rarity: 0,
    encumbrance: 4,
    durability: 5,
    slots: ['Main Hand'],
    damage: 4,
    damageType: 'Fixed',
    crit: 5,
    range: 'Medium',
    skill: 'ranged',
    qualities: [
      { name: 'Ensnare', rank: 2 },
      { name: 'Linked', rank: 2 },
      { name: 'Prepare', rank: 1 },
    ],
  },
  {
    id: 'test-stunner',
    name: '[TEST] Stun/Stun Damage/Concussive Stunner',
    description: 'Tests: Stun (text-only bonus strain), Stun Damage (text-only — this weapon\'s damage is strain not wounds), Concussive (appliesStatusId, cross-sheet).',
    type: 'Weapon',
    rarity: 0,
    encumbrance: 2,
    durability: 5,
    slots: ['Main Hand'],
    damage: 5,
    damageType: 'Fixed',
    crit: 4,
    range: 'Short',
    skill: 'ranged',
    qualities: [
      { name: 'Stun', rank: 2 },
      { name: 'Stun Damage' },
      { name: 'Concussive', rank: 1 },
    ],
  },
  {
    id: 'test-rifle',
    name: '[TEST] Guided/Burn Rifle',
    description: 'Tests: Guided (text-only end-of-round reroll on a miss), Burn (text-only, applied via the Add Status dropdown\'s Burn preset).',
    type: 'Weapon',
    rarity: 0,
    encumbrance: 4,
    durability: 5,
    slots: ['Main Hand', 'Off Hand'],
    slotMode: 'all',
    damage: 7,
    damageType: 'Fixed',
    crit: 3,
    range: 'Extreme',
    skill: 'ranged',
    qualities: [
      { name: 'Guided', rank: 2 },
      { name: 'Burn', rank: 3 },
    ],
  },
  {
    id: 'test-cleaver',
    name: '[TEST] Sunder Cleaver',
    description: "Tests: Sunder (text-only, damages one item the target is wielding).",
    type: 'Weapon',
    rarity: 0,
    encumbrance: 2,
    durability: 5,
    slots: ['Main Hand'],
    damage: 6,
    damageType: 'Brawn-based',
    crit: 2,
    range: 'Engaged',
    skill: 'melee',
    qualities: [{ name: 'Sunder' }],
  },
  {
    id: 'test-unwieldy-hammer',
    name: '[TEST] Unwieldy Hammer',
    description: "Tests: ranked Unwieldy (requirement.penaltyPerPoint, scoped to this specific weapon via weaponEntryId — try equipping with low Agility).",
    type: 'Weapon',
    rarity: 0,
    encumbrance: 4,
    durability: 5,
    slots: ['Main Hand', 'Off Hand'],
    slotMode: 'all',
    damage: 8,
    damageType: 'Brawn-based',
    crit: 2,
    range: 'Engaged',
    skill: 'melee',
    qualities: [{ name: 'Unwieldy', rank: 4 }],
  },
  {
    id: 'test-throwing-javelin',
    name: '[TEST] Improvised Throwing Javelin',
    description: 'Tests: Improvised (autoUnequipOnAttack — should unequip itself after Roll Attack) paired with Momentum (mandatory on every thrown weapon; also tests momentumDamage\'s displayed damage bonus and Eagle Eyes/Good Arm\'s range extension against a thrown weapon specifically).',
    type: 'Weapon',
    rarity: 0,
    encumbrance: 1,
    durability: 1,
    slots: ['Main Hand'],
    damage: 4,
    damageType: 'Fixed',
    crit: 3,
    range: 'Short',
    skill: 'ranged',
    qualities: [
      { name: 'Improvised' },
      { name: 'Momentum' },
    ],
  },
  {
    id: 'test-direct-modifier-charm',
    name: '[TEST] Direct-Modifier Charm',
    description: 'Tests: Object-level poolModifiers directly (not via a quality) — one autoApply:true entry (always-on Boost to Charm) and one autoApply:false entry (manual-toggle Setback removal on Perception) on the same item.',
    type: 'Mundane',
    rarity: 0,
    encumbrance: 0,
    price: 5,
    poolModifiers: [
      { type: 'AddBoost', amount: 1, appliesTo: 'charm', autoApply: true },
      { type: 'RemoveSetback', amount: 1, appliesTo: 'perception', autoApply: false },
    ],
    resultModifiers: [{ type: 'AddAdvantage', amount: 1, appliesTo: 'negotiation', autoApply: true }],
  },
  {
    id: 'test-fabrication-kit',
    name: '[TEST] Fabrication Repair Kit',
    description: 'Tests: craft_skill = Fabrication, repair_material, is_crafting_material — now visible per the flipped VISIBLE_ITEM_FIELDS flags.',
    type: 'Tool',
    rarity: 0,
    encumbrance: 1,
    price: 15,
    is_crafting_material: true,
    repair_material: 'scrap metal',
    craft_skill: 'Fabrication',
  },
  {
    id: 'test-fine-crafting-kit',
    name: '[TEST] Fine Crafting Repair Kit',
    description: 'Tests: craft_skill = Fine Crafting.',
    type: 'Tool',
    rarity: 0,
    encumbrance: 1,
    price: 15,
    is_crafting_material: true,
    repair_material: 'thread and leather scrap',
    craft_skill: 'Fine Crafting',
  },
  {
    id: 'test-compounding-kit',
    name: '[TEST] Compounding Repair Kit',
    description: 'Tests: craft_skill = Compounding.',
    type: 'Tool',
    rarity: 0,
    encumbrance: 1,
    price: 15,
    is_crafting_material: true,
    repair_material: 'assorted chemicals',
    craft_skill: 'Compounding',
  },
  {
    id: 'test-inferior-chunk',
    name: '[TEST] Inferior Chunk',
    description: "Tests: Inferior (autoApply resultModifiers AddThreat) in isolation — kept off test-blade so Superior's AddAdvantage doesn't partially cancel it out in the same roll.",
    type: 'Weapon',
    rarity: 0,
    encumbrance: 1,
    durability: 3,
    slots: ['Main Hand'],
    damage: 4,
    damageType: 'Brawn-based',
    crit: 5,
    range: 'Engaged',
    skill: 'melee',
    qualities: [{ name: 'Inferior' }],
  },
]