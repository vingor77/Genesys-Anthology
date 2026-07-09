// Seed data for the `keywords` Firestore collection — Backrooms Rule 1k.
// Same shape family as qualities.ts, so both can share one "Add Status"
// dropdown UI later. Keywords with no structured mechanism still carry
// full rules text so the dropdown always shows what a keyword does, even
// when applying it is manual (conditional checks, GM-narrated tables,
// action-economy effects, or anything tied to a system that doesn't exist
// yet — Critical Injuries, Sickness, Sanity).

export interface KeywordDoc {
  id: string
  name: string
  polarity: 'negative' | 'positive'
  rules: string
  diceModifier?: {
    mode: 'addBoost' | 'addSetback' | 'upgradeDifficulty' | 'downgradeDifficulty'
    amount: number
    appliesTo: string
  }[]
  perTurnEffect?: { wounds?: number; strain?: number }
  incomingDamageModifier?: { wounds?: number; strain?: number }
  blocksNaturalRecovery?: ('wounds' | 'strain')[]
  stackable?: boolean // true only for Brain Fog X — re-applying increments the instance's stacks rather than adding a duplicate
  isCondition?: boolean
}

export const KEYWORDS: KeywordDoc[] = [
  {
    id: 'ataxia',
    name: 'Ataxia',
    polarity: 'negative',
    rules: 'Loss of muscular coordination and motor control resulting in unsteady movement. The free maneuver each turn costs 2 strain instead of 0. Not auto-enforced — there is no tracked maneuver-economy system on the sheet; applied manually.',
    isCondition: true,
  },
  {
    id: 'tremors',
    name: 'Tremors',
    polarity: 'negative',
    rules: 'Involuntary shaking impairing precision and fine motor control. Adds 1 setback to all Ranged, Melee, and Skulduggery checks.',
    diceModifier: [{ mode: 'addSetback', amount: 1, appliesTo: 'Ranged, Melee, and Skulduggery checks' }],
  },
  {
    id: 'nausea',
    name: 'Nausea',
    polarity: 'negative',
    rules: 'Overwhelming physical discomfort impairing focus and exertion. At the start of each turn, succeed an Average Resilience check or lose the action this turn. Not auto-enforced — this is a recurring conditional roll, applied manually each turn.',
    isCondition: true,
  },
  {
    id: 'hemorrhage',
    name: 'Hemorrhage',
    polarity: 'negative',
    rules: 'Uncontrolled bleeding that worsens over time. Suffer 1 unsoakable wound at the start of each turn. Wounds cannot be naturally recovered while this condition is active.',
    perTurnEffect: { wounds: 1 },
    blocksNaturalRecovery: ['wounds'],
  },
  {
    id: 'necrosis',
    name: 'Necrosis',
    polarity: 'negative',
    rules: 'Irreversible tissue death in affected areas. Critical Injuries cannot be healed by any means while active. Add 10 to all Critical Injury severity rolls received. Not auto-enforced — ties to the Critical Injury system, which is a later phase; applied manually until then.',
    isCondition: true,
  },
  {
    id: 'thrombocytopenia',
    name: 'Thrombocytopenia',
    polarity: 'negative',
    rules: 'Inability to clot blood normally. All wounds received are increased by 2. Wounds cannot be naturally recovered while active.',
    incomingDamageModifier: { wounds: 2 },
    blocksNaturalRecovery: ['wounds'],
  },
  {
    id: 'haemophilia',
    name: 'Haemophilia',
    polarity: 'negative',
    rules: 'Autoimmune breakdown of clotting factors causing prolonged bleeding and weakened immune response. Wounds received cannot be naturally recovered while active. The character is considered immunocompromised and is susceptible to Sickness at the GM\'s discretion — not auto-enforced, ties to the Sickness system.',
    blocksNaturalRecovery: ['wounds'],
  },
  {
    id: 'gas-eye',
    name: 'Gas Eye',
    polarity: 'negative',
    rules: 'Inflammation of the eyes causing visual distortion, halos, twitching eyelids, and light sensitivity. All lighting is perceived as one step brighter toward Blinding (does not affect anything dimmer than Average) — not auto-enforced, ties to the lighting system. Upgrades the difficulty of all Melee, Brawl, and Ranged checks once.',
    diceModifier: [{ mode: 'upgradeDifficulty', amount: 1, appliesTo: 'Melee, Brawl, and Ranged checks' }],
  },
  {
    id: 'tinnitus',
    name: 'Tinnitus',
    polarity: 'negative',
    rules: 'Persistent ringing in the ears impairing sound-based awareness. Upgrades the difficulty of all Perception and Vigilance checks once.',
    diceModifier: [{ mode: 'upgradeDifficulty', amount: 1, appliesTo: 'Perception and Vigilance checks' }],
  },
  {
    id: 'tunnel-vision',
    name: 'Tunnel Vision',
    polarity: 'negative',
    rules: 'Loss of peripheral awareness reducing environmental detection. Upgrades the difficulty of all Vigilance checks once. The character cannot benefit from boost dice granted by allies — not auto-enforced, there is no per-source dice tracking; applied manually.',
    diceModifier: [{ mode: 'upgradeDifficulty', amount: 1, appliesTo: 'Vigilance checks' }],
  },
  {
    id: 'memory-loss',
    name: 'Memory Loss',
    polarity: 'negative',
    rules: 'Impairment of short-term recall and cognitive retrieval. Before making any Knowledge or Navigation check, succeed an Average Discipline check or the original check cannot be made this turn. Not auto-enforced — a recurring conditional roll, applied manually.',
    isCondition: true,
  },
  {
    id: 'vertigo',
    name: 'Vertigo',
    polarity: 'negative',
    rules: 'Disorienting sensation of spinning or imbalance. At the start of each turn, succeed an Average Coordination check or the character may only take 1 maneuver this turn. Not auto-enforced — a recurring conditional roll, applied manually.',
    isCondition: true,
  },
  {
    id: 'brain-fog',
    name: 'Brain Fog X',
    polarity: 'negative',
    rules: 'General cognitive dulling across all mental functions. Adds X setback dice to all Intellect and Cunning based checks, where X is the current severity number. When a source increases Brain Fog, increment X by 1 — the only keyword that explicitly stacks; every other keyword applies once regardless of repeat triggers.',
    diceModifier: [{ mode: 'addSetback', amount: 1, appliesTo: 'Intellect and Cunning based checks' }],
    stackable: true,
  },
  {
    id: 'dissociation',
    name: 'Dissociation',
    polarity: 'negative',
    rules: 'Detachment from immediate reality causing mental absence. Adds 2 setback dice to all checks except Out of Turn Incidentals.',
    diceModifier: [{ mode: 'addSetback', amount: 2, appliesTo: 'all checks except Out of Turn Incidentals' }],
  },
  {
    id: 'aphasia',
    name: 'Aphasia',
    polarity: 'negative',
    rules: 'Loss of clear verbal communication. Counts as mute.',
    isCondition: true,
  },
  {
    id: 'hypervigilance',
    name: 'Hypervigilance',
    polarity: 'negative',
    rules: 'Perpetual environmental threat scanning causing exhaustion alongside heightened awareness. Adds 1 boost to all Perception and Vigilance checks. Suffer 1 strain at the start of each turn.',
    diceModifier: [{ mode: 'addBoost', amount: 1, appliesTo: 'Perception and Vigilance checks' }],
    perTurnEffect: { strain: 1 },
  },
  {
    id: 'agoraphobia',
    name: 'Agoraphobia',
    polarity: 'negative',
    rules: 'Crippling anxiety in perceived unsafe or open spaces. Suffer 2 strain at the start of each turn in an unfamiliar or open room. Additionally, at the start of each turn succeed an Average Cool check or roll 1d8 and consult the Agoraphobia Table. The strain cost is conditional on room context, so not auto-applied — and the Cool check plus d8 table (8 distinct narrative outcomes) is GM-adjudicated play, not something to build a one-off roller for.',
    isCondition: true,
  },
  {
    id: 'pulmonary-fibrosis',
    name: 'Pulmonary Fibrosis',
    polarity: 'negative',
    rules: 'Scarred lung tissue causing progressive breathing difficulty, persistent dry cough, and physical exhaustion. Upgrades the difficulty of all Athletics, Coordination, and Brawn checks once. At the start of each turn, succeed an Average Resilience check or suffer 1 strain from the persistent cough — not auto-enforced, a recurring conditional roll. The cough also adds 1 setback to all Stealth checks while active.',
    diceModifier: [
      { mode: 'upgradeDifficulty', amount: 1, appliesTo: 'Athletics, Coordination, and Brawn checks' },
      { mode: 'addSetback', amount: 1, appliesTo: 'Stealth checks' },
    ],
  },
  {
    id: 'adrenaline',
    name: 'Adrenaline',
    polarity: 'positive',
    rules: 'Extraordinary physical output beyond normal limits. Adds 2 boost to all Brawn checks. Gain one additional free maneuver per turn — not auto-enforced, no maneuver-economy tracking exists. Ignore all Critical Injury penalties excluding loss of limb — ties to the Critical Injury system, a later phase. The character does not realize the severity of their injuries until the condition ends.',
    diceModifier: [{ mode: 'addBoost', amount: 2, appliesTo: 'Brawn checks' }],
  },
  {
    id: 'heightened-awareness',
    name: 'Heightened Awareness',
    polarity: 'positive',
    rules: 'Senses sharpened beyond normal capacity. Adds 2 boost to all Perception and Vigilance checks.',
    diceModifier: [{ mode: 'addBoost', amount: 2, appliesTo: 'Perception and Vigilance checks' }],
  },
  {
    id: 'clarity',
    name: 'Clarity',
    polarity: 'positive',
    rules: 'Mental focus sharpened to a fine point. Adds 2 boost to all Intellect based checks.',
    diceModifier: [{ mode: 'addBoost', amount: 2, appliesTo: 'Intellect based checks' }],
  },
  {
    id: 'euphoria',
    name: 'Euphoria',
    polarity: 'positive',
    rules: 'Intense feelings of wellbeing and invigoration. Recover 1 Sanity per interval — ties to the Sanity system, a later phase; not auto-enforced yet. Adds 1 boost to all social skill checks.',
    diceModifier: [{ mode: 'addBoost', amount: 1, appliesTo: 'social skill checks' }],
  },
  {
    id: 'hallucinogenic',
    name: 'Hallucinogenic',
    polarity: 'positive',
    rules: 'Profound alteration of sensory perception opening the mind to things normally imperceptible. The character can perceive Objects and Entities requiring a Sanity threshold up to 2 tiers lower than their current threshold. Entirely GM-facing and tied to the Sanity-tier system — descriptive only.',
    isCondition: true,
  },
]