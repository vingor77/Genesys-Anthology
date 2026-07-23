// Seed data for the `keywords` Firestore collection, matching
// Master_Schema.html's Keywords DB schema. Deliberately keeps mechanical
// fields directly on each document rather than routing through
// appliesStatusId/Status Presets — unlike Critical Injuries, a keyword's
// mechanical data has exactly one owner (itself), never reused across
// multiple different keywords, and Rule 1k already prevents duplicate
// application, so the extra indirection wouldn't earn its cost here.

export interface KeywordDoc {
  id: string
  name: string
  polarity: 'negative' | 'positive'
  rules: string
  poolModifiers?: { type: string; amount: number; appliesTo?: string; scalesWithStacks?: boolean }[]
  perTurnEffect?: { wounds?: number; strain?: number; sanity?: number }
  tickTiming?: 'start' | 'end'
  blocksNaturalRecovery?: string[]
  stackable?: boolean
  isCondition?: boolean
  criticalInjuryRollModifier?: number
  suppressesInjuryEffects?: boolean
}

export const KEYWORDS: KeywordDoc[] = [
  // ---- Negative conditions ----
  { id: 'ataxia', name: 'Ataxia', polarity: 'negative',
    rules: 'Loss of muscular coordination. The free maneuver each turn costs 2 strain instead of 0.' },

  { id: 'tremors', name: 'Tremors', polarity: 'negative',
    rules: 'Involuntary shaking impairing precision. Add 1 setback to all Ranged, Melee, and Skulduggery checks.',
    poolModifiers: [
      { type: 'AddSetback', amount: 1, appliesTo: 'ranged' },
      { type: 'AddSetback', amount: 1, appliesTo: 'melee' },
      { type: 'AddSetback', amount: 1, appliesTo: 'skulduggery' },
    ] },

  { id: 'nausea', name: 'Nausea', polarity: 'negative',
    rules: 'Overwhelming discomfort. At the start of each turn, succeed an Average Resilience check or lose the action this turn.' },

  { id: 'hemorrhage', name: 'Hemorrhage', polarity: 'negative',
    rules: 'Uncontrolled bleeding that worsens over time. Suffer 1 wound at the start of each turn. Wounds cannot be naturally recovered while active.',
    perTurnEffect: { wounds: 1 }, tickTiming: 'start', blocksNaturalRecovery: ['wounds'] },

  { id: 'necrosis', name: 'Necrosis', polarity: 'negative',
    rules: 'Irreversible tissue death. Critical Injuries cannot be healed by any means while active. Add 10 to all Critical Injury severity rolls received.',
    criticalInjuryRollModifier: 10 },

  { id: 'thrombocytopenia', name: 'Thrombocytopenia', polarity: 'negative',
    rules: 'Inability to clot blood normally. All wounds received are increased by 2. Wounds cannot be naturally recovered while active.',
    blocksNaturalRecovery: ['wounds'] },

  { id: 'haemophilia', name: 'Haemophilia', polarity: 'negative',
    rules: 'Autoimmune breakdown of clotting factors. Wounds received cannot be naturally recovered while active. Considered immunocompromised — susceptible to Sickness at GM discretion.',
    blocksNaturalRecovery: ['wounds'] },

  { id: 'gas-eye', name: 'Gas Eye', polarity: 'negative',
    rules: 'Inflammation causing visual distortion and light sensitivity. Lighting is perceived one step brighter toward Blinding (no effect below Average). Upgrade the difficulty of all Melee, Brawl, and Ranged checks once.',
    poolModifiers: [
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'melee' },
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'brawl' },
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'ranged' },
    ] },

  { id: 'tinnitus', name: 'Tinnitus', polarity: 'negative',
    rules: 'Persistent ringing impairing sound-based awareness. Upgrade the difficulty of all Perception and Vigilance checks once.',
    poolModifiers: [
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'perception' },
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'vigilance' },
    ] },

  { id: 'tunnel-vision', name: 'Tunnel Vision', polarity: 'negative',
    rules: 'Loss of peripheral awareness. Upgrade the difficulty of all Vigilance checks once. Cannot benefit from boost dice granted by allies.',
    poolModifiers: [{ type: 'UpgradeDifficulty', amount: 1, appliesTo: 'vigilance' }] },

  { id: 'memory-loss', name: 'Memory Loss', polarity: 'negative',
    rules: 'Impairment of short-term recall. Before making any Knowledge or Navigation check, succeed an Average Discipline check or the original check cannot be made this turn.' },

  { id: 'vertigo', name: 'Vertigo', polarity: 'negative',
    rules: 'Disorienting sensation of spinning or imbalance. At the start of each turn, succeed an Average Coordination check or the character may only take 1 maneuver this turn.' },

  { id: 'brain-fog', name: 'Brain Fog X', polarity: 'negative',
    rules: 'General cognitive dulling. Add X setback dice to all Intellect and Cunning checks, where X is the current severity. Increment X by 1 each time this worsens.',
    poolModifiers: [
      { type: 'AddSetback', amount: 0, appliesTo: 'intellect', scalesWithStacks: true },
      { type: 'AddSetback', amount: 0, appliesTo: 'cunning', scalesWithStacks: true },
    ], stackable: true },

  { id: 'dissociation', name: 'Dissociation', polarity: 'negative',
    rules: 'Detachment from immediate reality. Add 2 setback dice to all checks.',
    poolModifiers: [{ type: 'AddSetback', amount: 2 }] },

  { id: 'aphasia', name: 'Aphasia', polarity: 'negative',
    rules: 'Loss of clear verbal communication — counts as mute. Upgrade the difficulty of all Social checks twice.',
    poolModifiers: [{ type: 'UpgradeDifficulty', amount: 2, appliesTo: 'Social' }] },

  { id: 'hypervigilance', name: 'Hypervigilance', polarity: 'negative',
    rules: 'Perpetual threat-scanning causing exhaustion alongside heightened awareness. Add 1 boost to all Perception and Vigilance checks. Suffer 1 strain at the start of each turn.',
    poolModifiers: [
      { type: 'AddBoost', amount: 1, appliesTo: 'perception' },
      { type: 'AddBoost', amount: 1, appliesTo: 'vigilance' },
    ], perTurnEffect: { strain: 1 }, tickTiming: 'start' },

  { id: 'agoraphobia', name: 'Agoraphobia', polarity: 'negative',
    rules: 'Crippling anxiety in unsafe or open spaces. Suffer 2 strain at the start of each turn (for that turn only). Additionally, succeed an Average Cool check each turn or roll 1d8 on the Agoraphobia Table (Freeze/Flee/Cover/Cower/Scream/Hyperventilate/Lash Out/Paralysis, effect lasts that turn only).',
    perTurnEffect: { strain: 2 }, tickTiming: 'start' },

  { id: 'pulmonary-fibrosis', name: 'Pulmonary Fibrosis', polarity: 'negative',
    rules: 'Scarred lung tissue causing breathing difficulty and exhaustion. Upgrade the difficulty of all Athletics, Coordination, and Brawn checks once. At the start of each turn, succeed an Average Resilience check or suffer 1 strain and add 1 setback to Stealth checks (persistent cough).',
    poolModifiers: [
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'athletics' },
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'coordination' },
      { type: 'UpgradeDifficulty', amount: 1, appliesTo: 'brawn' },
    ] },

  // ---- Positive conditions ----
  { id: 'adrenaline', name: 'Adrenaline', polarity: 'positive',
    rules: 'Extraordinary physical output beyond normal limits. Add 2 boost to all Brawn checks. Gain one additional free maneuver per turn. Ignore all effects from currently-active Critical Injuries. The character does not realize the severity of their injuries until the condition ends.',
    poolModifiers: [{ type: 'AddBoost', amount: 2, appliesTo: 'brawn' }], suppressesInjuryEffects: true },

  { id: 'heightened-awareness', name: 'Heightened Awareness', polarity: 'positive',
    rules: 'Senses sharpened beyond normal capacity. Add 2 boost to all Perception and Vigilance checks.',
    poolModifiers: [
      { type: 'AddBoost', amount: 2, appliesTo: 'perception' },
      { type: 'AddBoost', amount: 2, appliesTo: 'vigilance' },
    ] },

  { id: 'clarity', name: 'Clarity', polarity: 'positive',
    rules: 'Mental focus sharpened to a fine point. Add 2 boost to all Intellect checks.',
    poolModifiers: [{ type: 'AddBoost', amount: 2, appliesTo: 'intellect' }] },

  { id: 'euphoria', name: 'Euphoria', polarity: 'positive',
    rules: 'Intense feelings of wellbeing. Recover 1 Sanity at the start of each round. Add 1 boost to all Social checks.',
    poolModifiers: [{ type: 'AddBoost', amount: 1, appliesTo: 'Social' }], perTurnEffect: { sanity: 1 }, tickTiming: 'start' },

  { id: 'hallucinogenic', name: 'Hallucinogenic', polarity: 'positive',
    rules: 'Profound alteration of sensory perception. Can perceive Objects and Entities requiring a Sanity threshold up to 2 tiers lower than the character\'s current threshold.',
    isCondition: true },
]