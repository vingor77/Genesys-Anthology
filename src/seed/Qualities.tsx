// Seed data for the `qualities` Firestore collection, matching Master_Schema.html's
// Quality DB schema. Import this into a temporary admin/seed page and write each
// entry with setDoc(doc(db, 'qualities', q.id), q).
//
// `rules` is player-facing — short, plain, one sentence, no formulas or
// implementation notes. Anything about how/why a quality is (or isn't)
// automated lives in the `//` comment above each entry instead.

export interface QualityDoc {
  id: string
  name: string
  ranked: boolean
  activation: 'Passive' | 'Active'
  rules: string
  statModifiers?: { stat: string; amount: number }[] // amount is PER RANK — always affects the wielder's own stats. Nothing here ever targets another character's sheet.
  poolModifiers?: { type: string; amount: number; appliesTo: string }[] // type: AddBoost | RemoveSetback | AddSetback | UpgradeDifficulty | DowngradeDifficulty | AddDifficulty
  resultModifiers?: { type: string; amount: number; appliesTo: string }[]
  requirement?: { characteristic: string; penalty: string }
  immunity?: string[]
  autoFire?: boolean
  guided?: boolean
  requiresAmmo?: boolean
  slowFiring?: boolean // cooldown length = this quality's rank on the specific item, not a fixed value here
  destroysOnUse?: boolean // Fragile — item's InventoryEntry gets marked destroyed after one use, not deleted
}

export const QUALITIES: QualityDoc[] = [
  {
    id: 'accurate',
    name: 'Accurate',
    ranked: true,
    activation: 'Passive',
    rules: 'Makes attacks with this weapon a little easier to land.',
    poolModifiers: [{ type: 'AddBoost', amount: 1, appliesTo: 'attacks with this weapon' }],
  },
  {
    // Auto-fire's actual targeting rule (highest-difficulty targets, locked
    // in before rolling) stays out of player-facing text — described in
    // detail in the Implementation Guide's Phase 3c dice roller spec.
    id: 'auto-fire',
    name: 'Auto-fire',
    ranked: false,
    activation: 'Active',
    rules: 'Sprays a burst of shots, letting you hit more than one target at the cost of accuracy.',
    autoFire: true,
  },
  {
    // Multi-target, GM-adjudicated — same bucket as Linked/Sunder.
    id: 'blast',
    name: 'Blast',
    ranked: true,
    activation: 'Active',
    rules: 'On a hit, everyone standing near the target also takes damage.',
  },
  {
    // Reduces the TARGET's soak — a different character's stat, stays
    // manual per the automation-scope cutback.
    id: 'breach',
    name: 'Breach',
    ranked: true,
    activation: 'Passive',
    rules: "Punches through a target's armor, ignoring a large chunk of their protection.",
  },
  {
    // Applying this creates a Status entry with a perTurnEffect/
    // remainingRounds pair — see the Status Effects sub-schema.
    id: 'burn',
    name: 'Burn',
    ranked: true,
    activation: 'Active',
    rules: 'Sets the target on fire, dealing damage again each round until it burns out or is treated.',
  },
  {
    // Condition tracking only — "cannot take actions" isn't enforceable
    // without a full turn-based action-economy engine.
    id: 'concussive',
    name: 'Concussive',
    ranked: true,
    activation: 'Active',
    rules: 'Rattles the target badly enough that they lose their next few actions.',
  },
  {
    id: 'cumbersome',
    name: 'Cumbersome',
    ranked: true,
    activation: 'Passive',
    rules: "Heavy enough that it's harder to use without the strength to back it up.",
    requirement: { characteristic: 'brawn', penalty: 'Adds 1 difficulty per point short' },
  },
  {
    id: 'defensive',
    name: 'Defensive',
    ranked: true,
    activation: 'Passive',
    rules: 'Improves melee defense while carried.',
    statModifiers: [{ stat: 'meleeDefense', amount: 1 }],
  },
  {
    id: 'deflection',
    name: 'Deflection',
    ranked: true,
    activation: 'Passive',
    rules: 'Improves ranged defense while carried.',
    statModifiers: [{ stat: 'rangedDefense', amount: 1 }],
  },
  {
    id: 'disorient',
    name: 'Disorient',
    ranked: true,
    activation: 'Active',
    rules: "Rattles the target, making their next actions clumsier.",
  },
  {
    id: 'ensnare',
    name: 'Ensnare',
    ranked: true,
    activation: 'Active',
    rules: 'Traps the target in place until they can break free.',
  },
  {
    id: 'guided',
    name: 'Guided',
    ranked: true,
    activation: 'Active',
    rules: 'Can curve back around for a second try if the first shot misses.',
    guided: true,
  },
  {
    id: 'inaccurate',
    name: 'Inaccurate',
    ranked: true,
    activation: 'Passive',
    rules: 'Makes attacks with this weapon a little harder to land.',
    poolModifiers: [{ type: 'AddSetback', amount: 1, appliesTo: 'attacks with this weapon' }],
  },
  {
    id: 'inferior',
    name: 'Inferior',
    ranked: false,
    activation: 'Passive',
    rules: 'Poorly made — checks made with it always carry a little extra bad luck.',
    resultModifiers: [{ type: 'AddThreat', amount: 1, appliesTo: 'checks made with this item' }],
  },
  {
    id: 'knockdown',
    name: 'Knockdown',
    ranked: false,
    activation: 'Active',
    rules: 'Can knock the target clean off their feet.',
  },
  {
    id: 'limited-ammo',
    name: 'Limited Ammo',
    ranked: true,
    activation: 'Passive',
    rules: 'Only holds a limited number of shots before it needs reloading.',
    requiresAmmo: true,
  },
  {
    // Custom, homebrew — not official Genesys. UI-special-cased by name,
    // same as Vicious/Stun Damage: the bonus is floor(Brawn/2), which
    // doesn't fit a flat statModifiers number, so the sheet computes it
    // directly rather than storing a formula here.
    id: 'momentum',
    name: 'Momentum',
    ranked: false,
    activation: 'Passive',
    rules: 'A stronger throw hits harder — thrown by someone tougher, it deals a bit more damage.',
  },
  {
    // Custom, homebrew. Retrieval is GM-adjudicated (distance, whether it
    // rolled somewhere inconvenient, whether someone else grabs it first)
    // — same bucket as Blast/Linked/Sunder, not something the sheet
    // auto-resolves.
    id: 'improvised',
    name: 'Improvised',
    ranked: false,
    activation: 'Passive',
    rules: "Not a real weapon — once thrown, it has to be picked back up before it can be used again.",
  },
  {
    // Custom, homebrew. destroysOnUse drives InventoryEntry.destroyed —
    // the entry stays on the sheet (grayed out) rather than being deleted,
    // so any notes attached to it survive.
    id: 'fragile',
    name: 'Fragile',
    ranked: false,
    activation: 'Passive',
    rules: 'Breaks after a single use.',
    destroysOnUse: true,
  },
  {
    id: 'linked',
    name: 'Linked',
    ranked: true,
    activation: 'Active',
    rules: 'Can strike the same target more than once in a single attack.',
  },
  {
    // Reduces the TARGET's soak — same treatment as Breach.
    id: 'pierce',
    name: 'Pierce',
    ranked: true,
    activation: 'Passive',
    rules: "Cuts clean through a target's armor.",
  },
  {
    id: 'prepare',
    name: 'Prepare',
    ranked: true,
    activation: 'Passive',
    rules: 'Needs a moment of setup before it can be used.',
  },
  {
    // Meaning depends on parent Object's type (weapon vs armor) — the
    // sheet checks that directly by name, same pattern as Vicious/Stun
    // Damage, rather than storing two contradictory immunity values.
    id: 'reinforced',
    name: 'Reinforced',
    ranked: false,
    activation: 'Passive',
    rules: 'Built tough — resistant to being broken or damaged.',
  },
  {
    // Cooldown length = this quality's rank on the specific item, not a
    // fixed value stored here (it scales per weapon).
    id: 'slow-firing',
    name: 'Slow-Firing',
    ranked: true,
    activation: 'Passive',
    rules: 'Needs time to reset before it can be fired again.',
    slowFiring: true,
  },
  {
    // Own-sheet display/calculation change — applying the resulting
    // damage to a target is manual like any weapon, same as Stun Damage.
    id: 'stun',
    name: 'Stun',
    ranked: true,
    activation: 'Active',
    rules: "Delivers a jolt that wears someone down without truly wounding them.",
  },
  {
    // Sheet detects by name, relabels the damage line as strain instead
    // of wounds.
    id: 'stun-damage',
    name: 'Stun Damage',
    ranked: false,
    activation: 'Passive',
    rules: 'Knocks the wind out of a target rather than truly wounding them.',
  },
  {
    id: 'sunder',
    name: 'Sunder',
    ranked: false,
    activation: 'Active',
    rules: 'Can break or damage whatever the target is holding.',
  },
  {
    id: 'superior',
    name: 'Superior',
    ranked: false,
    activation: 'Passive',
    rules: 'Exceptionally well made — checks made with it tend to go a little better.',
    resultModifiers: [{ type: 'AddSuccess', amount: 1, appliesTo: 'checks made with this item' }],
  },
  {
    id: 'unwieldy',
    name: 'Unwieldy',
    ranked: true,
    activation: 'Passive',
    rules: "Awkward enough that it's harder to use without a steady hand.",
    requirement: { characteristic: 'agility', penalty: 'Adds 1 difficulty per point short' },
  },
  {
    // No schema field — crit roller shows a pre-roll toggle adding
    // rank x 10 to the d100 result.
    id: 'vicious',
    name: 'Vicious',
    ranked: true,
    activation: 'Passive',
    rules: 'Makes any wound it causes especially severe.',
  },
]