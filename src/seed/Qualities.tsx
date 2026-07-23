// Seed data for the `qualities` Firestore collection, matching
// Master_Schema.html's Qualities DB schema. 27 official Genesys
// qualities (Tractor excluded, vehicle-only) plus all 3 custom homebrew
// additions (Momentum, Improvised, Fragile) — 30 total, complete.
//
// Where a ranked quality's own effect scales with its rating (Accurate,
// Inaccurate, Defensive, Deflection), the amount below is the PER-RANK
// value — consuming code must multiply by the specific item's own rank
// for this quality (Object.qualities[].rank), not use this number as-is.

export interface QualityDoc {
  id: string
  name: string
  ranked: boolean
  activation: 'Passive' | 'Active'
  rules: string
  statModifiers?: { stat: string; amount: number; autoApply: boolean }[]
  poolModifiers?: { type: string; amount: number; appliesTo?: string; autoApply: boolean }[]
  resultModifiers?: { type: string; amount: number; appliesTo?: string; autoApply: boolean }[]
  requirement?: { characteristic: string; penaltyPerPoint: { type: string; amount: number } }
  appliesStatusId?: string
  overrides?: { remainingRounds?: number | 'rank' }
  autoFire?: boolean
  guided?: boolean
  requiresAmmo?: boolean
  slowFiring?: boolean
  destroysOnUse?: boolean
  momentumDamage?: boolean
  autoUnequipOnAttack?: boolean
}

export const QUALITIES: QualityDoc[] = [
  { id: 'accurate', name: 'Accurate', ranked: true, activation: 'Passive',
    rules: 'Add a boost die to combat checks with this weapon, per rank of Accurate.',
    poolModifiers: [{ type: 'AddBoost', amount: 1, autoApply: true }] },

  { id: 'auto-fire', name: 'Auto-fire', ranked: false, activation: 'Active',
    rules: 'Optional. When attacking, may activate to add a difficulty die to the attack roll, and may spend two advantages on a hit for an extra hit. May be activated any number of times.',
    poolModifiers: [{ type: 'AddDifficulty', amount: 1, autoApply: false }] },

  { id: 'blast', name: 'Blast', ranked: true, activation: 'Active',
    rules: "On a hit, may trigger to deal a hit to everyone engaged with the original target, equal to Blast's rating plus triumphs scored. May also trigger on a miss by spending three threat, hitting the original target and everyone engaged with them at Blast's rating with no bonus damage. Who counts as 'engaged' is spatial/GM judgment, not automated." },

  { id: 'breach', name: 'Breach', ranked: true, activation: 'Passive',
    rules: 'Hits ignore one point of vehicle armor per rating of Breach (10 soak per rating). Reduces the target\'s own soak, not the wielder\'s stats.' },

  { id: 'burn', name: 'Burn', ranked: true, activation: 'Active',
    rules: "Optional. When triggered, one target hit continues to suffer the weapon's base damage each round for a number of rounds equal to Burn's rating, applied at the start of each of their turns. May trigger on multiple targets hit. A victim may stop the damage with a Coordination check (Average on hard ground, Easy on soft) or by jumping into water. Applied manually via the Add Status dropdown's Burn preset, edited to match this weapon's actual damage/rating before confirming." },

  { id: 'concussive', name: 'Concussive', ranked: true, activation: 'Active',
    rules: 'Optional. On a hit, may spend two advantage to stagger the target for a number of rounds equal to this weapon\'s Concussive rating. May trigger multiple times if multiple targets are hit.',
    appliesStatusId: 'staggered-1-round', overrides: { remainingRounds: 'rank' } },

  { id: 'cumbersome', name: 'Cumbersome', ranked: true, activation: 'Passive',
    rules: "Requires a Brawn equal to or greater than this weapon's Cumbersome rating to use without penalty. Each point deficient increases the difficulty of all checks made with this weapon by one.",
    requirement: { characteristic: 'brawn', penaltyPerPoint: { type: 'AddDifficulty', amount: 1 } } },

  { id: 'defensive', name: 'Defensive', ranked: true, activation: 'Passive',
    rules: 'Increases the user\'s melee defense by this item\'s Defensive rating.',
    statModifiers: [{ stat: 'meleeDefense', amount: 1, autoApply: true }] },

  { id: 'deflection', name: 'Deflection', ranked: true, activation: 'Passive',
    rules: 'Increases the user\'s ranged defense by this item\'s Deflection rating.',
    statModifiers: [{ stat: 'rangedDefense', amount: 1, autoApply: true }] },

  { id: 'disorient', name: 'Disorient', ranked: true, activation: 'Active',
    rules: 'Optional. On a hit, may spend advantage/triumph to disorient the target for a number of rounds equal to this weapon\'s Disorient rating. May trigger multiple times if multiple targets are hit.',
    appliesStatusId: 'disoriented', overrides: { remainingRounds: 'rank' } },

  { id: 'ensnare', name: 'Ensnare', ranked: true, activation: 'Active',
    rules: 'Optional. On a hit, may spend advantage/triumph to immobilize the target for a number of rounds equal to this weapon\'s Ensnare rating (cannot perform maneuvers while immobilized). May trigger multiple times if multiple targets are hit. An immobilized target may attempt a Hard Athletics check on their turn to break free.',
    appliesStatusId: 'immobilized', overrides: { remainingRounds: 'rank' } },

  { id: 'guided', name: 'Guided', ranked: true, activation: 'Active',
    rules: 'Can only trigger if an attack misses. May make a combat check at the end of the round as an out-of-turn incidental, Average difficulty, adding ability dice equal to Guided\'s rating instead of building the pool normally. Requires three triumph to activate unless stated otherwise.',
    guided: true },

  { id: 'inaccurate', name: 'Inaccurate', ranked: true, activation: 'Passive',
    rules: 'Add a setback die to attacks with this weapon, per rank of Inaccurate.',
    poolModifiers: [{ type: 'AddSetback', amount: 1, autoApply: true }] },

  { id: 'inferior', name: 'Inferior', ranked: false, activation: 'Passive',
    rules: 'Generates automatic threat on all checks related to its use.',
    resultModifiers: [{ type: 'AddThreat', amount: 1, autoApply: true }] },

  { id: 'knockdown', name: 'Knockdown', ranked: false, activation: 'Active',
    rules: 'On a hit, may spend advantage (1, plus 1 more per target silhouette beyond 1) to knock the target prone. May trigger multiple times if multiple targets are hit.',
    appliesStatusId: 'prone' },

  { id: 'limited-ammo', name: 'Limited Ammo', ranked: true, activation: 'Passive',
    rules: 'Weapon can fire a number of times equal to its Limited Ammo rating before needing to reload with a maneuver (or, for one-use items like grenades, be replaced). Set the item\'s Uses field to match the rating.',
    requiresAmmo: true },

  { id: 'linked', name: 'Linked', ranked: true, activation: 'Active',
    rules: 'On a hit, deals one hit. May spend two advantage to gain an additional hit, up to Linked\'s rating. Additional hits only apply to the original target. Each hit deals base damage plus successes scored.' },

  { id: 'pierce', name: 'Pierce', ranked: true, activation: 'Passive',
    rules: "Hits ignore a number of points of the target's soak equal to this weapon's Pierce rating. If Pierce exceeds the target's total soak, it completely ignores it." },

  { id: 'prepare', name: 'Prepare', ranked: true, activation: 'Passive',
    rules: "Requires a number of preparation maneuvers equal to this item's Prepare rating before use. GM's discretion whether moving, being knocked prone, or other disruptions require redoing the preparation. Tracked informationally via the item's own preparationRemaining field." },

  { id: 'reinforced', name: 'Reinforced', ranked: false, activation: 'Passive',
    rules: 'Weapons/items with Reinforced are immune to Sunder. Armor with Reinforced makes the wearer\'s soak immune to Pierce and Breach.' },

  { id: 'slow-firing', name: 'Slow-Firing', ranked: true, activation: 'Passive',
    rules: 'Dictates the number of rounds that must pass before this weapon can be fired again after attacking. Tracked via the item\'s own cooldown field, set via a "Fired" button — informational only until an initiative tracker exists to enforce it.',
    slowFiring: true },

  { id: 'stun', name: 'Stun', ranked: true, activation: 'Active',
    rules: "Optional. On a hit, may trigger to inflict strain equal to this weapon's Stun rating in addition to normal damage — this is strain, not strain damage, so it isn't reduced by soak." },

  { id: 'stun-damage', name: 'Stun Damage', ranked: false, activation: 'Passive',
    rules: 'This weapon\'s damage is strain damage instead of wound damage — still reduced by soak normally, unlike Stun\'s bonus strain.' },

  { id: 'sunder', name: 'Sunder', ranked: false, activation: 'Active',
    rules: 'Choose one item openly wielded by the target. That item is damaged one step (undamaged→minor→moderate→major→destroyed). Requires one advantage to activate, may activate even on a failed attack, may activate multiple times on the same item in one attack.' },

  { id: 'superior', name: 'Superior', ranked: false, activation: 'Passive',
    rules: 'Generates automatic advantage on all checks related to its use.',
    resultModifiers: [{ type: 'AddAdvantage', amount: 1, autoApply: true }] },

  { id: 'unwieldy', name: 'Unwieldy', ranked: true, activation: 'Passive',
    rules: "Requires an Agility equal to or greater than this weapon's Unwieldy rating to use without penalty. Each point deficient increases the difficulty of all checks made with this weapon by one.",
    requirement: { characteristic: 'agility', penaltyPerPoint: { type: 'AddDifficulty', amount: 1 } } },

  { id: 'vicious', name: 'Vicious', ranked: true, activation: 'Passive',
    rules: 'On a Critical Injury or Hit result, add ten times this weapon\'s Vicious rating to the Critical roll (Vicious 3 = +30). Affects the target\'s own future roll, not the wielder\'s — cross-sheet, not automated.' },

  { id: 'fragile', name: 'Fragile', ranked: false, activation: 'Passive',
    rules: 'Destroyed after a single use.',
    destroysOnUse: true },

  { id: 'momentum', name: 'Momentum', ranked: false, activation: 'Passive',
    rules: "Deals bonus damage equal to half the wielder's Brawn, rounded up. Meant for thrown weapons — updates the weapon's displayed damage to include this bonus.",
    momentumDamage: true },

  { id: 'improvised', name: 'Improvised', ranked: false, activation: 'Passive',
    rules: 'Must be physically retrieved after being thrown before it can be thrown again — functionally Limited Ammo 1 for a thrown weapon. Attacking with this weapon automatically unequips it, since it\'s now out of hand until retrieved.',
    autoUnequipOnAttack: true },
]