// Seed data for the `statusPresets` Firestore collection, matching
// Master_Schema.html's Status Presets DB schema. Deliberately separate
// from Keywords — Keywords are scoped to Rule 1k's universal condition
// definitions, these are unscoped and referenced by anything that
// creates a Status by reference (Critical Injuries' appliesStatusId
// today, Qualities' appliesStatusId as of this session too).
//
// Two of these are deliberately templates, not meant to be applied
// verbatim: Characteristic Shift (which stat/amount gets overridden per
// use) and Burn (base damage/duration vary per weapon, edited before
// confirming — same as a player picking a preset from the Add Status
// dropdown and adjusting the pre-filled numbers).

export interface StatusPresetDoc {
  id: string
  label: string
  description?: string
  statModifiers?: { stat: string; amount: number }[]
  poolModifiers?: { type: string; amount: number; appliesTo?: string; scalesWithStacks?: boolean }[]
  resultModifiers?: { type: string; amount: number; appliesTo?: string }[]
  perTurnEffect?: { wounds?: number; strain?: number; sanity?: number }
  tickTiming?: 'start' | 'end'
  remainingRounds?: number
  blocksNaturalRecovery?: string[]
  suppressesInjuryEffects?: boolean
  criticalInjuryRollModifier?: number
  removedOnEncounterEnd?: boolean
  blocksSkillIds?: string[]
  onRemoveEffect?: { stat: 'wounds' | 'strain'; amount: number }
  stackable?: boolean
  isCondition?: boolean
}

export const STATUS_PRESETS: StatusPresetDoc[] = [
  { id: 'prone', label: 'Prone', description: 'Knocked off your feet.',
    isCondition: true },

  { id: 'disoriented', label: 'Disoriented', description: 'Rattled, making the next actions clumsier.',
    poolModifiers: [{ type: 'AddSetback', amount: 1 }] },

  { id: 'staggered-1-round', label: 'Staggered (1 Round)', description: 'Rattled badly enough to lose your next action.',
    remainingRounds: 1, tickTiming: 'end',
    isCondition: true },

  { id: 'staggered-until-healed', label: 'Staggered (Until Healed)', description: 'Rattled badly enough to lose your next action, for as long as this lasts.',
    isCondition: true },

  { id: 'immobilized', label: 'Immobilized', description: 'Trapped in place until able to break free.',
    isCondition: true },

  { id: 'grievously-wounded', label: 'Grievously Wounded', description: 'Hurt badly enough that wounds cannot naturally recover.',
    blocksNaturalRecovery: ['wounds'] },

  { id: 'concussed', label: 'Concussed', description: 'Head trauma makes thinking clearly difficult.',
    poolModifiers: [
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'intellect' },
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'cunning' },
    ] },

  { id: 'cowed', label: 'Cowed', description: 'Shaken badly enough to undermine composure and resolve.',
    poolModifiers: [
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'presence' },
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'willpower' },
    ] },

  { id: 'agonized', label: 'Agonized', description: 'In enough pain that physical actions suffer.',
    poolModifiers: [
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'brawn' },
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'agility' },
    ] },

  { id: 'frazzled', label: 'Frazzled', description: 'Too overwhelmed to catch any lucky breaks.',
    poolModifiers: [{ type: 'RemoveBoost', amount: 999 }] },

  { id: 'compromised', label: 'Compromised', description: 'Something is generally wrong, making everything harder.',
    poolModifiers: [{ type: 'UpgradeDifficulty', amount: 1 }] },

  { id: 'blinded', label: 'Blinded', description: 'Unable to see.',
    poolModifiers: [
      { type: 'UpgradeDifficulty', amount: 2 },
      // +1 here, not +3 — the unscoped entry above already applies to
      // Perception/Vigilance too, so this just needs to make up the
      // difference to reach 3 total for these two specifically, per
      // this table's reading of the rules text (2 for everything,
      // 3 flat for Perception/Vigilance — not 2 stacked with 3).
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'perception' },
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'vigilance' },
    ] },

  { id: 'bleeding-out', label: 'Bleeding Out', description: 'Losing blood steadily, worsening each round.',
    perTurnEffect: { wounds: 1, strain: 1 }, tickTiming: 'start' },

  { id: 'characteristic-shift', label: 'Characteristic Shift', description: 'A temporary reduction to one characteristic (template — edit which one and by how much before confirming).',
    // Template — default is Brawn -1, but every real use overrides which
    // characteristic and by how much via the referencing document's own
    // overrides field. A positive amount would represent an increase.
    statModifiers: [{ stat: 'brawn', amount: -1 }] },

  { id: 'burn', label: 'Burn', description: 'On fire, taking damage again each round until it burns out or is treated (template — edit damage/duration to match the weapon before confirming).',
    // Template — base damage and duration both vary per weapon. Meant to
    // be edited before confirming, same as a player picking this preset
    // from the Add Status dropdown and adjusting the pre-filled numbers.
    perTurnEffect: { wounds: 1 }, tickTiming: 'start', remainingRounds: 1 },

  { id: 'berserk', label: 'Berserk', description: 'A reckless melee fury — hits harder, but leaves you open and unable to use ranged weapons until the encounter ends.',
    resultModifiers: [
      { type: 'AddSuccess', amount: 1, appliesTo: 'melee' },
      { type: 'AddAdvantage', amount: 2, appliesTo: 'melee' },
    ],
    blocksSkillIds: ['ranged', 'ranged-light', 'ranged-heavy', 'gunnery'],
    removedOnEncounterEnd: true,
    onRemoveEffect: { stat: 'strain', amount: 6 } },
]