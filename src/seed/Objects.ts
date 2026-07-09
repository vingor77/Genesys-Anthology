// Seed data for the `objects` Firestore collection, matching Master_Schema.html's
// Object DB schema. Deliberately minimal — 2 examples per type (14 total),
// just enough to validate the schema shape works end to end once Phase 3
// code actually reads from this collection. Not a real catalog yet; expand
// once character creation/inventory code is actually built and confirmed
// working against these. Per the automation-scope cutback, statModifiers/
// poolModifiers/resultModifiers are left unpopulated even where they'd
// apply — same treatment as Qualities/Talents/Keywords going forward.
//
// cures_sickness/recovery_roll_modifier intentionally left out of every
// entry below — there's no seeded Sickness collection yet, so populating
// either would be a dangling reference to IDs that don't exist.

export interface ObjectDoc {
  id: string
  name: string
  description: string
  type: 'Weapon' | 'Armor' | 'Food' | 'Drink' | 'Light Source' | 'Tool' | 'Mundane'
  rarity: number
  encumbrance: number
  // Null/absent = global catalog. Populated = custom item uploaded within
  // one session, visible only there (future feature, field added now so
  // no schema change is needed later).
  sessionId?: string
  price?: number
  slots?: string[]
  effect?: string
  situational?: { condition: string; effect: string }
  durability?: number
  uses?: number
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
  // Backrooms extension fields (only populated where a natural fit exists)
  noclip_enabled?: boolean
  noclip_skill?: string
  noclip_difficulty?: number
  sanity_restored?: number
}

export const OBJECTS: ObjectDoc[] = [
  // ---- Weapon (2) ----
  {
    id: 'schema-example-box-cutter', name: 'Box Cutter', type: 'Weapon',
    description: 'A retractable utility blade, standard store issue.',
    rarity: 0, encumbrance: 0, slots: ['Main Hand'], durability: 3,
    damage: 1, damageType: 'Brawn-based', crit: 4, range: 'Engaged', skill: 'melee-light',
    qualities: [{ name: 'Vicious', rank: 1 }],
  },
  {
    id: 'service-revolver', name: 'Service Revolver', type: 'Weapon',
    description: 'A basic sidearm, kept for emergencies.',
    rarity: 3, encumbrance: 1, slots: ['Main Hand'], durability: 3,
    damage: 6, damageType: 'Fixed', crit: 3, range: 'Medium', skill: 'ranged-light',
    qualities: [],
  },

  // ---- Armor (2) ----
  {
    id: 'store-vest', name: 'Store Vest', type: 'Armor',
    description: 'The standard-issue employee vest. Minimal protection, mostly for show.',
    rarity: 0, encumbrance: 1, slots: ['Chest'], durability: 3,
    soak: 1, meleeDefense: 0, rangedDefense: 0,
  },
  {
    id: 'reinforced-coveralls', name: 'Reinforced Coveralls', type: 'Armor',
    description: 'Padded work coveralls with a reinforced chest panel.',
    rarity: 4, encumbrance: 2, slots: ['Chest', 'Legs'], durability: 3,
    soak: 2, meleeDefense: 1, rangedDefense: 1,
  },

  // ---- Food (2) ----
  {
    id: 'stale-granola-bar', name: 'Stale Granola Bar', type: 'Food',
    description: 'Past its expiration date, but still edible.',
    rarity: 0, encumbrance: 0, uses: 1,
    hunger_stacks_removed: 1,
  },
  {
    id: 'canned-rations', name: 'Canned Rations', type: 'Food',
    description: 'A dense, long-shelf-life meal in a can.',
    rarity: 1, encumbrance: 1, uses: 1,
    hunger_stacks_removed: 3,
    bonus_effects: 'Also recovers 1 strain.',
  },

  // ---- Drink (2) ----
  {
    id: 'bottled-water', name: 'Bottled Water', type: 'Drink',
    description: 'A sealed bottle of drinking water.',
    rarity: 0, encumbrance: 0, uses: 1,
    thirst_stacks_removed: 2,
  },
  {
    id: 'strange-bottled-liquid', name: 'Strange Bottled Liquid', type: 'Drink',
    description: "Faintly sweet, almond-scented. Drinking it seems to loosen this place's grip on you.",
    rarity: 5, encumbrance: 0, uses: 1,
    thirst_stacks_removed: 1,
    noclip_enabled: true, noclip_skill: 'cool', noclip_difficulty: 2,
  },

  // ---- Light Source (2) ----
  {
    id: 'handheld-flashlight', name: 'Handheld Flashlight', type: 'Light Source',
    description: 'A battery-powered flashlight with a wide beam.',
    rarity: 1, encumbrance: 1,
    light_step_boost: 2, light_cap: 'Well Lit', duration: 50, fuel_type: 'Batteries',
  },
  {
    id: 'glow-stick', name: 'Glow Stick', type: 'Light Source',
    description: 'A single-use chemical light stick. Dim, but reliable.',
    rarity: 0, encumbrance: 0,
    light_step_boost: 1, light_cap: 'Dim', duration: 1, fuel_type: 'Single Use',
  },

  // ---- Tool (2) ----
  {
    id: 'duct-tape-object', name: 'Duct Tape', type: 'Tool',
    description: 'Holds together more than it should.',
    rarity: 0, encumbrance: 1, uses: 5,
    effect: 'Removes 1 setback die on repair attempts.',
  },
  {
    id: 'multi-tool-object', name: 'Multi-Tool', type: 'Tool',
    description: 'A compact folding tool with several attachments.',
    rarity: 2, encumbrance: 1,
    effect: 'Removes 1 setback die when fixing, building, or jury-rigging something.',
  },

  // ---- Mundane (2) ----
  {
    id: 'faded-name-tag', name: 'Faded Name Tag', type: 'Mundane',
    description: "A plastic name tag, the name worn away. Not yours, as far as you can tell.",
    rarity: 0, encumbrance: 0,
  },
  {
    id: 'personal-photograph', name: 'Personal Photograph', type: 'Mundane',
    description: 'A photo of someone or somewhere you knew, before all this.',
    rarity: 0, encumbrance: 0,
    sanity_restored: 2,
  },

  // ---- BB&B starting armor (4, all roughly tier-1 power, varied stats) ----
  { id: 'work-apron', name: 'Work Apron', type: 'Armor', description: 'The standard-issue employee apron. Minimal protection.', rarity: 0, encumbrance: 1, slots: ['Chest'], durability: 3, soak: 1, meleeDefense: 0, rangedDefense: 0 },
  { id: 'thick-jacket', name: 'Thick Jacket', type: 'Armor', description: 'A heavy jacket, awkward to swing at but decent to be swung at.', rarity: 0, encumbrance: 1, slots: ['Chest'], durability: 3, soak: 1, meleeDefense: 1, rangedDefense: 0 },
  { id: 'layered-cardboard', name: 'Layered Cardboard', type: 'Armor', description: 'Flattened boxes and packing tape, worn like a vest.', rarity: 0, encumbrance: 1, slots: ['Chest'], durability: 3, soak: 2, meleeDefense: 0, rangedDefense: 0 },
  { id: 'pot-lid-shield-rig', name: 'Pot-Lid Shield Rig', type: 'Armor', description: 'An apron with a pot lid strapped on as an improvised shield.', rarity: 1, encumbrance: 2, slots: ['Chest'], durability: 3, soak: 1, meleeDefense: 1, rangedDefense: 1 },

  // ---- BB&B starting ranged weapons (4, small, damage <= 3) ----
  // All four also carry Limited Ammo 1 and Momentum (bonus damage =
  // floor(Brawn/2) when thrown) per the standard thrown-weapon rule.
  { id: 'stress-ball', name: 'Stress Ball', type: 'Weapon', description: 'Squeezable foam, thrown with more enthusiasm than accuracy.', rarity: 0, encumbrance: 0, slots: ['Main Hand'], durability: 3, damage: 2, damageType: 'Fixed', crit: 6, range: 'Short', skill: 'ranged-light', qualities: [{ name: 'Stun', rank: 2 }, { name: 'Improvised' }, { name: 'Momentum' }] },
  { id: 'coffee-mug', name: 'Coffee Mug', type: 'Weapon', description: 'Shatters violently on impact.', rarity: 0, encumbrance: 0, slots: ['Main Hand'], durability: 3, damage: 2, damageType: 'Fixed', crit: 5, range: 'Short', skill: 'ranged-light', qualities: [{ name: 'Blast', rank: 1 }, { name: 'Fragile' }, { name: 'Momentum' }] },
  { id: 'candle', name: 'Candle', type: 'Weapon', description: 'A blunt wax cylinder — or a small fire hazard, if it happens to be lit when thrown.', rarity: 0, encumbrance: 0, slots: ['Main Hand'], durability: 3, damage: 1, damageType: 'Fixed', crit: 6, range: 'Short', skill: 'ranged-light', qualities: [{ name: 'Disorient', rank: 1 }, { name: 'Improvised' }, { name: 'Momentum' }], situational: { condition: 'Candle is lit when thrown', effect: 'Also applies Burn 1' } },
  { id: 'paperweight', name: 'Paperweight', type: 'Weapon', description: 'Dense glass, surprisingly sharp-edged where it fractures.', rarity: 0, encumbrance: 0, slots: ['Main Hand'], durability: 3, damage: 3, damageType: 'Fixed', crit: 5, range: 'Short', skill: 'ranged-light', qualities: [{ name: 'Vicious', rank: 1 }, { name: 'Fragile' }, { name: 'Momentum' }] },

  // ---- BB&B starting melee weapons (8, medium or smaller, damage <= 3) ----
  { id: 'box-cutter', name: 'Box Cutter', type: 'Weapon', description: 'A retractable utility blade, standard store issue.', rarity: 0, encumbrance: 0, slots: ['Main Hand'], durability: 3, damage: 1, damageType: 'Brawn-based', crit: 4, range: 'Engaged', skill: 'melee-light', qualities: [{ name: 'Vicious', rank: 1 }] },
  { id: 'scissors', name: 'Scissors', type: 'Weapon', description: 'Sharper than they look.', rarity: 0, encumbrance: 0, slots: ['Main Hand'], durability: 3, damage: 1, damageType: 'Brawn-based', crit: 5, range: 'Engaged', skill: 'melee-light', qualities: [{ name: 'Vicious', rank: 1 }] },
  { id: 'letter-opener', name: 'Letter Opener', type: 'Weapon', description: 'Thin and pointed — precise, if not powerful.', rarity: 0, encumbrance: 0, slots: ['Main Hand'], durability: 3, damage: 1, damageType: 'Brawn-based', crit: 3, range: 'Engaged', skill: 'melee-light', qualities: [{ name: 'Vicious', rank: 2 }] },
  { id: 'knife', name: 'Knife', type: 'Weapon', description: 'A proper kitchen knife.', rarity: 0, encumbrance: 1, slots: ['Main Hand'], durability: 3, damage: 2, damageType: 'Brawn-based', crit: 4, range: 'Engaged', skill: 'melee-heavy', qualities: [{ name: 'Vicious', rank: 1 }] },
  { id: 'meat-tenderizer', name: 'Meat Tenderizer', type: 'Weapon', description: 'A heavy, blunt kitchen mallet.', rarity: 0, encumbrance: 1, slots: ['Main Hand'], durability: 3, damage: 2, damageType: 'Brawn-based', crit: 5, range: 'Engaged', skill: 'melee-heavy', qualities: [{ name: 'Concussive', rank: 1 }] },
  { id: 'wrench', name: 'Wrench', type: 'Weapon', description: 'Solid metal, good leverage for knocking someone off their feet.', rarity: 0, encumbrance: 1, slots: ['Main Hand'], durability: 3, damage: 2, damageType: 'Brawn-based', crit: 4, range: 'Engaged', skill: 'melee-heavy', qualities: [{ name: 'Knockdown' }] },
  { id: 'mop-broom-handle', name: 'Mop/Broom Handle', type: 'Weapon', description: 'Snapped off at a useful length — decent reach, decent guard.', rarity: 0, encumbrance: 2, slots: ['Main Hand'], durability: 3, damage: 3, damageType: 'Brawn-based', crit: 4, range: 'Engaged', skill: 'melee-light', qualities: [{ name: 'Defensive', rank: 1 }] },
  { id: 'yardstick', name: 'Yardstick', type: 'Weapon', description: 'Light and quick to swing.', rarity: 0, encumbrance: 2, slots: ['Main Hand'], durability: 3, damage: 3, damageType: 'Brawn-based', crit: 5, range: 'Engaged', skill: 'melee-light', qualities: [{ name: 'Accurate', rank: 1 }] },

  // ---- Universal gear (everyone gets this one) ----
  { id: 'walkie-talkie', name: 'Walkie-Talkie', type: 'Tool', description: 'Long range, static-prone. Adds a boost die to coordinated actions with someone else carrying one.', rarity: 0, encumbrance: 1, effect: 'Adds a boost die to coordinated actions with another Walkie-Talkie carrier.' },

  // ---- Gear (10, spread across the original 5 categories) ----
  { id: 'duct-tape', name: 'Duct Tape', type: 'Tool', description: 'Holds together more than it should.', rarity: 0, encumbrance: 1, uses: 5, effect: 'Adds a boost die to repair attempts.' },
  { id: 'first-aid-kit', name: 'First Aid Kit', type: 'Tool', description: 'Bandages, antiseptic, the basics.', rarity: 1, encumbrance: 1, uses: 3, effect: 'Heal 2 wounds with an Average Resilience check.' },
  { id: 'water-bottle-bbb', name: 'Water Bottle', type: 'Drink', description: 'Refillable, mostly empty.', rarity: 0, encumbrance: 0, uses: 1, thirst_stacks_removed: 1, bonus_effects: 'Recover 1 strain.' },
  { id: 'energy-drink', name: 'Energy Drink', type: 'Drink', description: 'A jolt now, a crash later.', rarity: 0, encumbrance: 0, uses: 1, bonus_effects: 'Recover 2 strain and gain a boost die on your next check; suffer 2 strain from the crash after about an hour.' },
  { id: 'flashlight-bbb', name: 'Flashlight', type: 'Light Source', description: 'Standard store-issue flashlight.', rarity: 0, encumbrance: 1, effect: 'Removes a setback die caused by darkness.', light_step_boost: 1, light_cap: 'Dim', fuel_type: 'Batteries' },
  { id: 'break-room-snacks', name: 'Break Room Snacks', type: 'Food', description: 'Communal, and never quite enough.', rarity: 0, encumbrance: 0, uses: 1, bonus_effects: 'Recover 1 strain during a break.' },
  { id: 'umbrella', name: 'Umbrella', type: 'Tool', description: 'Awkward, but better than nothing when opened.', rarity: 0, encumbrance: 1, effect: 'Adds 1 ranged defense while opened.' },
  { id: 'cleaning-supplies', name: 'Cleaning Supplies', type: 'Tool', description: 'A caddy of sprays and rags.', rarity: 0, encumbrance: 2, effect: 'Adds a boost die to checks the supplies are relevant to.' },
  { id: 'scanner', name: 'Scanner', type: 'Tool', description: 'A barcode scanner. Purely flavor — no mechanical effect.', rarity: 0, encumbrance: 0 },
  { id: 'blanket', name: 'Blanket', type: 'Tool', description: 'Warmth, cover, or something to smother a small fire with.', rarity: 0, encumbrance: 2, effect: 'Provides warmth and concealment, or can smother a small fire.' },
]