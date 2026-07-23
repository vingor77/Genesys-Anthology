// Seed data for the `talents` Firestore collection, matching
// Master_Schema.html's Talents DB schema as finalized during the Phase A
// audit. 61 of the original 71 core-rulebook talents: 9 cut entirely
// (Defensive Sysops + its Improved, Animal Companion, Barrel Roll,
// Distinctive Style, Full Throttle, Defensive Driving, Overcharge + its
// Improved — either superseded by planned custom systems, setting
// mismatches, or reliant on subsystems this game will never build), 1
// deferred (Dual Wielder — needs the actual Two-Weapon Combat rules
// understood before it can be scoped, not locked either way yet).
//
// Knack For It's real purchase pattern (pick 1 skill first purchase, 2
// on every purchase after) is deliberately NOT encoded in skillChoice.count
// below — handled in code instead by counting the character's existing
// TalentEntry documents for this id, since it's the only talent with this
// shape and building schema support for a sample size of one would be
// premature generalization.

export interface TalentDoc {
  id: string
  name: string
  tier: 1 | 2 | 3 | 4 | 5
  activation: 'Passive' | 'Action' | 'Maneuver' | 'Incidental' | 'Incidental (Out of Turn)'
  ranked: boolean
  limit: 'None' | 'Per Round' | 'Per Encounter' | 'Per Session'
  rules: string
  prerequisite?: string

  statModifiers?: { stat?: string; amount: number; autoApply: boolean }[]
  poolModifiers?: {
    type: string
    amount: number
    appliesTo?: string
    autoApply: boolean
    scalesWithRank?: boolean
    costsStrainEqualToAmount?: boolean
    addsThreatEqualToAmount?: boolean
  }[]
  resultModifiers?: {
    type: string
    amount: number
    appliesTo?: string
    autoApply: boolean
    scalesWithRank?: boolean
    costsStrainEqualToAmount?: boolean
    addsThreatEqualToAmount?: boolean
  }[]
  scalingBonus?: { stat?: string; appliesTo: string }

  skillChoice?: { count: number; restriction: string; grantsCareer: boolean; fixedSkills: string[] }
  characteristicChoice?: { count: number }

  usesPerPeriod?: number
  criticalInjuryRollModifier?: number
  scalesWithRank?: boolean
  halvesDamage?: boolean
  reducesPrepareBy?: number
  manualHeal?: { stat: 'wounds' | 'strain'; amount: number }
  requiresActiveEncounter?: boolean
  usesStoryPoint?: boolean
  strainCost?: number
  manualStrainSpend?: boolean
  extendsRange?: boolean
  extendsRangeRequires?: 'thrown' | 'nonThrown'
  appliesStatusId?: string
}

export const TALENTS: TalentDoc[] = [
  // ================= TIER 1 (23) =================
  { id: 'bought-info', name: 'Bought Info', tier: 1, activation: 'Action', ranked: false, limit: 'None',
    rules: 'Instead of rolling a Knowledge check, spend currency equal to fifty times the difficulty to automatically succeed with one uncanceled success. GM may disallow for particularly sensitive/hard-to-find information.' },

  { id: 'clever-retort', name: 'Clever Retort', tier: 1, activation: 'Incidental (Out of Turn)', ranked: false, limit: 'Per Encounter', usesPerPeriod: 1,
    rules: "Once per encounter, add automatic advantage×2 to another character's social skill check." },

  { id: 'desperate-recovery', name: 'Desperate Recovery', tier: 1, activation: 'Passive', ranked: false, limit: 'None',
    rules: 'Before healing strain at the end of an encounter, if current strain is more than half of strain threshold, heal 2 additional strain.' },

  { id: 'duelist', name: 'Duelist', tier: 1, activation: 'Passive', ranked: false, limit: 'None',
    rules: 'Toggle: add a boost die to melee checks while engaged with a single opponent, or add a setback die while engaged with three or more.',
    poolModifiers: [
      { type: 'AddBoost', amount: 1, appliesTo: 'melee', autoApply: false },
      { type: 'AddSetback', amount: 1, appliesTo: 'melee', autoApply: false },
    ] },

  { id: 'durable', name: 'Durable', tier: 1, activation: 'Passive', ranked: true, limit: 'None',
    rules: 'Reduce any Critical Injury result suffered by 10 per rank, to a minimum of 01.',
    criticalInjuryRollModifier: -10, scalesWithRank: true },

  { id: 'forager', name: 'Forager', tier: 1, activation: 'Passive', ranked: false, limit: 'None',
    rules: 'Remove a setback die from Survival checks to find food, water, or shelter. Foraging/searching checks take half the normal time.',
    poolModifiers: [{ type: 'RemoveSetback', amount: 1, appliesTo: 'survival', autoApply: true }] },

  { id: 'grit', name: 'Grit', tier: 1, activation: 'Passive', ranked: true, limit: 'None',
    rules: 'Each rank increases strain threshold by one.',
    statModifiers: [{ stat: 'strainThreshold', amount: 1, autoApply: true }] },

  { id: 'hamstring-shot', name: 'Hamstring Shot', tier: 1, activation: 'Action', ranked: false, limit: 'Per Round', usesPerPeriod: 1,
    rules: "Once per round, make a ranged combat check against a non-vehicle target. On success, halve the damage inflicted (before soak) — toggle available to remind you of the halved damage — and the target is immobilized until the end of its next turn.",
    halvesDamage: true },

  { id: 'jump-up', name: 'Jump Up', tier: 1, activation: 'Incidental', ranked: false, limit: 'Per Round', usesPerPeriod: 1,
    rules: 'Once per round on your turn, stand from prone or seated as an incidental.' },

  { id: 'knack-for-it', name: 'Knack For It', tier: 1, activation: 'Passive', ranked: true, limit: 'None',
    rules: 'Choose 1 skill on first purchase, 2 additional skills on each subsequent purchase (not combat or magic skills). Remove a setback die from checks using any chosen skill.',
    skillChoice: { count: 2, restriction: 'no combat or magic skills', grantsCareer: false, fixedSkills: [] },
    poolModifiers: [{ type: 'RemoveSetback', amount: 1, autoApply: true }] },

  { id: 'know-somebody', name: 'Know Somebody', tier: 1, activation: 'Incidental', ranked: true, limit: 'None',
    rules: 'Once per session, when purchasing a legally available item, reduce its rarity by one per rank.' },

  { id: 'lets-ride', name: "Let's Ride", tier: 1, activation: 'Incidental', ranked: false, limit: 'Per Round', usesPerPeriod: 1,
    rules: 'Once per round on your turn, mount/dismount or reposition within a vehicle as an incidental. Suffer no damage and land on your feet from a short-range fall off a vehicle or animal.' },

  { id: 'one-with-nature', name: 'One with Nature', tier: 1, activation: 'Incidental', ranked: false, limit: 'None',
    rules: 'When in the wilderness, may make a Simple Survival check instead of Discipline or Cool to recover strain at the end of an encounter.' },

  { id: 'parry', name: 'Parry', tier: 1, activation: 'Incidental (Out of Turn)', ranked: true, limit: 'None', strainCost: 3,
    rules: 'When suffering a hit from a melee combat check, after damage but before soak, may suffer 3 strain to reduce the damage by two plus ranks in Parry. Once per hit, requires wielding a Melee weapon.' },

  { id: 'proper-upbringing', name: 'Proper Upbringing', tier: 1, activation: 'Incidental', ranked: true, limit: 'None',
    rules: 'When making a social skill check in polite company (GM discretion), may suffer strain (up to rank) to add an equal number of advantage.',
    resultModifiers: [{ type: 'AddAdvantage', amount: 1, appliesTo: 'Social', scalesWithRank: true, autoApply: false, costsStrainEqualToAmount: true }] },

  { id: 'quick-draw', name: 'Quick Draw', tier: 1, activation: 'Incidental', ranked: false, limit: 'Per Round', usesPerPeriod: 1,
    rules: "Once per round on your turn, draw or holster an easily accessible weapon/item as an incidental. Reduces a weapon's Prepare rating by one, to a minimum of one.",
    reducesPrepareBy: 1 },

  { id: 'quick-strike', name: 'Quick Strike', tier: 1, activation: 'Passive', ranked: true, limit: 'None',
    rules: 'Toggle: add a boost die per rank to combat checks against targets that have not yet taken a turn this encounter.',
    poolModifiers: [{ type: 'AddBoost', amount: 1, appliesTo: 'Combat', scalesWithRank: true, autoApply: false }] },

  { id: 'rapid-reaction', name: 'Rapid Reaction', tier: 1, activation: 'Incidental (Out of Turn)', ranked: true, limit: 'None',
    rules: 'May suffer strain (up to rank) to add an equal number of success to a Vigilance or Cool check made to determine Initiative order.',
    resultModifiers: [
      { type: 'AddSuccess', amount: 1, appliesTo: 'vigilance', scalesWithRank: true, autoApply: false, costsStrainEqualToAmount: true },
      { type: 'AddSuccess', amount: 1, appliesTo: 'cool', scalesWithRank: true, autoApply: false, costsStrainEqualToAmount: true },
    ] },

  { id: 'second-wind', name: 'Second Wind', tier: 1, activation: 'Incidental', ranked: true, limit: 'Per Encounter', usesPerPeriod: 1,
    rules: 'Once per encounter, heal strain equal to your ranks in Second Wind.',
    manualHeal: { stat: 'strain', amount: 1 }, scalesWithRank: true },

  { id: 'surgeon', name: 'Surgeon', tier: 1, activation: 'Passive', ranked: true, limit: 'None',
    rules: 'When making a Medicine check to heal wounds, the target heals one additional wound per rank of Surgeon.' },

  { id: 'swift', name: 'Swift', tier: 1, activation: 'Passive', ranked: false, limit: 'None',
    rules: 'No penalty for moving through difficult terrain — move at normal speed without spending additional maneuvers.' },

  { id: 'toughened', name: 'Toughened', tier: 1, activation: 'Passive', ranked: true, limit: 'None',
    rules: 'Each rank increases wound threshold by two.',
    statModifiers: [{ stat: 'woundThreshold', amount: 2, autoApply: true }] },

  { id: 'unremarkable', name: 'Unremarkable', tier: 1, activation: 'Passive', ranked: false, limit: 'None',
    rules: 'Other characters add a setback die to checks made to find or identify you in a crowd.' },

  // ================= TIER 2 (13) =================
  { id: 'basic-military-training', name: 'Basic Military Training', tier: 2, activation: 'Passive', ranked: false, limit: 'None',
    rules: 'Athletics, Ranged (Heavy), and Resilience become career skills.',
    skillChoice: { count: 0, restriction: '', grantsCareer: true, fixedSkills: ['athletics', 'ranged-heavy', 'resilience'] } },

  { id: 'berserk', name: 'Berserk', tier: 2, activation: 'Maneuver', ranked: false, limit: 'Per Encounter', usesPerPeriod: 1, requiresActiveEncounter: true,
    rules: "Once per encounter, until the encounter ends or you're incapacitated: add success+advantage×2 to melee checks; opponents add automatic success to checks targeting you; can't make ranged checks. Suffer 6 strain when it ends, whichever way it ends.",
    appliesStatusId: 'berserk' },

  { id: 'coordinated-assault', name: 'Coordinated Assault', tier: 2, activation: 'Maneuver', ranked: true, limit: 'None',
    rules: 'Once per turn, a number of allies engaged with you equal to your Leadership ranks add advantage to combat checks until the end of your next turn. Range increases one band per rank beyond the first.' },

  { id: 'counteroffer', name: 'Counteroffer', tier: 2, activation: 'Action', ranked: false, limit: 'Per Session', usesPerPeriod: 1, usesStoryPoint: true,
    rules: 'Once per session, opposed Negotiation vs. Discipline check on a non-nemesis adversary within medium range. On success, target is staggered until the end of their next turn. May spend Triumph to make the adversary a temporary ally.' },

  { id: 'daring-aviator', name: 'Daring Aviator', tier: 2, activation: 'Incidental', ranked: true, limit: 'None',
    rules: 'Before a Driving or Piloting check, may add threat (up to rank) to the results to add an equal number of success.',
    resultModifiers: [
      { type: 'AddSuccess', amount: 1, appliesTo: 'driving', scalesWithRank: true, autoApply: false, addsThreatEqualToAmount: true },
      { type: 'AddSuccess', amount: 1, appliesTo: 'piloting', scalesWithRank: true, autoApply: false, addsThreatEqualToAmount: true },
    ] },

  { id: 'defensive-stance', name: 'Defensive Stance', tier: 2, activation: 'Maneuver', ranked: true, limit: 'Per Round', usesPerPeriod: 1,
    rules: 'Once per round, suffer strain (up to rank) to upgrade the difficulty of melee checks targeting you a number of times equal to strain suffered, until the end of your next turn.',
    manualStrainSpend: true, scalesWithRank: true },

  { id: 'inventor', name: 'Inventor', tier: 2, activation: 'Incidental', ranked: true, limit: 'None',
    rules: 'Toggle: add a boost die per rank to a crafting/repair check (Fabrication, Fine Crafting, or Compounding, whichever fits). May attempt to reconstruct devices heard described but never seen.',
    poolModifiers: [
      { type: 'AddBoost', amount: 1, scalesWithRank: true, appliesTo: 'fabrication', autoApply: false },
      { type: 'AddBoost', amount: 1, scalesWithRank: true, appliesTo: 'fine-crafting', autoApply: false },
      { type: 'AddBoost', amount: 1, scalesWithRank: true, appliesTo: 'compounding', autoApply: false },
    ] },

  { id: 'fan-the-hammer', name: 'Fan the Hammer', tier: 2, activation: 'Incidental', ranked: false, limit: 'Per Session', usesPerPeriod: 1,
    rules: 'Once per session, may fire up to 4 shots in a single ranged attack. Each shot can target any target within range (not limited to the original target), and each deals the weapon\'s base damage plus successes scored on the check, plus any other applicable modifiers — same damage math as a normal hit, just up to 4 separate hits from one check.' },

  { id: 'heightened-awareness-talent', name: 'Heightened Awareness', tier: 2, activation: 'Passive', ranked: false, limit: 'None',
    rules: 'Allies within short range add a boost die to Perception and Vigilance checks. Allies engaged with you add a boost and setback die instead.' },

  { id: 'inspiring-rhetoric', name: 'Inspiring Rhetoric', tier: 2, activation: 'Action', ranked: false, limit: 'None',
    rules: 'Make an Average Leadership check. Per success, one ally within short range heals 1 strain. Per advantage, one ally benefiting from this heals 1 additional strain.' },

  { id: 'lucky-strike', name: 'Lucky Strike', tier: 2, activation: 'Incidental', ranked: false, limit: 'None', usesStoryPoint: true,
    rules: 'Choose one characteristic on purchase. After a successful combat check, may spend one Story Point to add damage equal to your rank in that characteristic to one hit.',
    characteristicChoice: { count: 1 },
    scalingBonus: { appliesTo: 'damage' } },

  { id: 'scathing-tirade', name: 'Scathing Tirade', tier: 2, activation: 'Action', ranked: false, limit: 'None',
    rules: 'Make an Average Coercion check. Per success, one enemy within short range suffers 1 strain. Per advantage, one enemy affected by this suffers 1 additional strain.' },

  { id: 'side-step', name: 'Side Step', tier: 2, activation: 'Action', ranked: true, limit: 'Per Round', usesPerPeriod: 1,
    rules: 'Once per round, suffer strain (up to rank) to upgrade the difficulty of ranged checks targeting you a number of times equal to strain suffered, until the end of your next turn.',
    manualStrainSpend: true, scalesWithRank: true },

  // ================= TIER 3 (12) =================
  { id: 'dodge', name: 'Dodge', tier: 3, activation: 'Incidental (Out of Turn)', ranked: true, limit: 'None',
    rules: 'When targeted by a combat check (ranged or melee), may suffer strain (up to rank) to upgrade the difficulty of that check a number of times equal to strain suffered.',
    manualStrainSpend: true, scalesWithRank: true },

  { id: 'forgot-to-count', name: 'Forgot to Count?', tier: 3, activation: 'Incidental (Out of Turn)', ranked: false, limit: 'None',
    rules: "When an opponent makes a ranged combat check, may spend threat×2 from that check to cause their weapon to run out of ammo, if it can normally do so." },

  { id: 'eagle-eyes', name: 'Eagle Eyes', tier: 3, activation: 'Passive', ranked: false, limit: 'None',
    rules: 'Increases the range of non-thrown ranged weapons by one band (to a maximum of Extreme).',
    extendsRange: true, extendsRangeRequires: 'nonThrown' },

  { id: 'field-commander', name: 'Field Commander', tier: 3, activation: 'Action', ranked: false, limit: 'None',
    rules: "Make an Average Leadership check. On success, a number of allies equal to your Presence may immediately suffer 1 strain to perform one maneuver out of turn. You arbitrate order disputes." },

  { id: 'good-arm', name: 'Good Arm', tier: 3, activation: 'Passive', ranked: false, limit: 'None',
    rules: 'Increases the range of thrown weapons by one band (to a maximum of Extreme).',
    extendsRange: true, extendsRangeRequires: 'thrown' },

  { id: 'inspiring-rhetoric-improved', name: 'Inspiring Rhetoric (Improved)', tier: 3, activation: 'Passive', ranked: false, limit: 'None',
    prerequisite: 'inspiring-rhetoric',
    rules: "Allies affected by your Inspiring Rhetoric add a boost die to all skill checks for a number of rounds equal to your Leadership ranks." },

  { id: 'painkiller-specialization', name: 'Painkiller Specialization', tier: 3, activation: 'Passive', ranked: true, limit: 'None',
    rules: 'When your character uses painkillers (or setting equivalent), the target heals one additional wound per rank. The sixth painkiller and beyond each day still has no effect.' },

  { id: 'scathing-tirade-improved', name: 'Scathing Tirade (Improved)', tier: 3, activation: 'Passive', ranked: false, limit: 'None',
    prerequisite: 'scathing-tirade',
    rules: "Enemies affected by your Scathing Tirade add a setback die to all skill checks for a number of rounds equal to your Coercion ranks." },

  { id: 'heroic-will', name: 'Heroic Will', tier: 3, activation: 'Incidental (Out of Turn)', ranked: false, limit: 'Per Session', usesPerPeriod: 1, usesStoryPoint: true,
    rules: 'Once per session, spend a Story Point to attempt to heal one Critical Injury inflicted on you, ignoring the normal once-per-week restriction on healing attempts — must be done entirely alone, without help from another character.' },

  { id: 'natural', name: 'Natural', tier: 3, activation: 'Incidental', ranked: false, limit: 'Per Session', usesPerPeriod: 1,
    rules: 'Choose two skills on purchase. Once per session, reroll one skill check using either chosen skill.',
    skillChoice: { count: 2, restriction: '', grantsCareer: false, fixedSkills: [] } },

  { id: 'fan-the-hammer-improved', name: 'Fan the Hammer (Improved)', tier: 3, activation: 'Passive', ranked: false, limit: 'None',
    prerequisite: 'fan-the-hammer',
    rules: 'While Fan the Hammer is active, each target hit takes an extra 2 damage per shot (up to 8 extra damage total across all 4 possible shots).' },

  { id: 'parry-improved', name: 'Parry (Improved)', tier: 3, activation: 'Incidental (Out of Turn)', ranked: false, limit: 'None',
    prerequisite: 'parry',
    rules: "When Parry reduces damage from a melee hit, after the attack resolves, may spend despair or threat×3 from the attacker's check to automatically hit the attacker once with a Brawl or Melee weapon you're wielding, dealing the weapon's base damage plus applicable bonuses. Can't be used if the original attack incapacitates you." },

  // ================= TIER 4 (9) =================
  { id: 'cant-we-talk-about-this', name: "Can't We Talk About This?", tier: 4, activation: 'Action', ranked: false, limit: 'None',
    rules: "Opposed Charm or Deception vs. Discipline check on a non-nemesis adversary within medium range. On success, the target can't attack or take hostile actions against you until the end of their next turn. May spend advantage×2 to extend one turn, triumph to extend to their allies within short range. Ends if you or a known ally attacks the target. GM may rule some targets immune." },

  { id: 'deadeye', name: 'Deadeye', tier: 4, activation: 'Incidental', ranked: false, limit: 'None', strainCost: 2,
    rules: 'After inflicting a Critical Injury with a ranged weapon, may suffer 2 strain to add 20 to the roll (same effect as the Vicious quality, but from the talent instead of the weapon).' },

  { id: 'defensive-talent', name: 'Defensive', tier: 4, activation: 'Passive', ranked: true, limit: 'None',
    rules: 'Each rank increases melee defense and ranged defense by one.',
    statModifiers: [
      { stat: 'meleeDefense', amount: 1, autoApply: true },
      { stat: 'rangedDefense', amount: 1, autoApply: true },
    ] },

  { id: 'enduring', name: 'Enduring', tier: 4, activation: 'Passive', ranked: true, limit: 'None',
    rules: 'Each rank increases soak by one.',
    statModifiers: [{ stat: 'soak', amount: 1, autoApply: true }] },

  { id: 'field-commander-improved', name: 'Field Commander (Improved)', tier: 4, activation: 'Passive', ranked: false, limit: 'None',
    prerequisite: 'field-commander',
    rules: 'When using Field Commander, affects a number of allies equal to twice your Presence instead of Presence. May spend triumph to let one ally suffer 1 strain to perform an action instead of a maneuver.' },

  { id: 'how-convenient', name: 'How Convenient!', tier: 4, activation: 'Action', ranked: false, limit: 'Per Session', usesPerPeriod: 1,
    rules: 'Once per session, make a Hard Mechanics check. On success, one device involved in the current encounter (GM approval) spontaneously fails — your doing or convenient timing.' },

  { id: 'inspiring-rhetoric-supreme', name: 'Inspiring Rhetoric (Supreme)', tier: 4, activation: 'Incidental', ranked: false, limit: 'None',
    prerequisite: 'inspiring-rhetoric', strainCost: 1,
    rules: 'May use Inspiring Rhetoric as a maneuver instead of an action.' },

  { id: 'mad-inventor', name: 'Mad Inventor', tier: 4, activation: 'Action', ranked: false, limit: 'Per Session', usesPerPeriod: 1,
    rules: "Once per session, make a check using whichever of the three crafting skills (Fabrication, Fine Crafting, or Compounding) fits what's being made, to cobble together the functional equivalent of any item using spare parts/salvage. Difficulty based on the item's rarity (0–2 Easy, 3–4 Average, 5–6 Hard, 7 Daunting, 8 Formidable, 9+ Impossible). GM may modify the check, rule some items uncraftable given circumstances, and may spend despair to make the result dangerous." },

  { id: 'scathing-tirade-supreme', name: 'Scathing Tirade (Supreme)', tier: 4, activation: 'Incidental', ranked: false, limit: 'None',
    prerequisite: 'scathing-tirade', strainCost: 1,
    rules: 'May use Scathing Tirade as a maneuver instead of an action.' },

  // ================= TIER 5 (4) =================
  { id: 'dedication', name: 'Dedication', tier: 5, activation: 'Passive', ranked: true, limit: 'None',
    rules: 'Each rank increases one chosen characteristic by one, to a maximum of 5. The same characteristic cannot be chosen twice.',
    characteristicChoice: { count: 1 },
    // stat deliberately omitted — substituted from TalentEntry.characteristicChoices at apply time
    statModifiers: [{ amount: 1, autoApply: true }] },

  { id: 'indomitable', name: 'Indomitable', tier: 5, activation: 'Incidental (Out of Turn)', ranked: false, limit: 'Per Encounter', usesPerPeriod: 1, usesStoryPoint: true,
    rules: 'Once per encounter, when you would be incapacitated from exceeding wound/strain threshold, spend a Story Point to avoid incapacitation until the end of your next turn. If reduced below threshold before then, you are not incapacitated.' },

  { id: 'master', name: 'Master', tier: 5, activation: 'Incidental', ranked: false, limit: 'Per Round', usesPerPeriod: 1, strainCost: 2,
    rules: 'Choose one skill on purchase. Once per round, may suffer 2 strain to reduce the difficulty of the next check using that skill by two, to a minimum of Easy.',
    skillChoice: { count: 1, restriction: '', grantsCareer: false, fixedSkills: [] },
    poolModifiers: [{ type: 'DowngradeDifficulty', amount: 2, autoApply: true }] },

  { id: 'ruinous-repartee', name: 'Ruinous Repartee', tier: 5, activation: 'Action', ranked: false, limit: 'Per Encounter', usesPerPeriod: 1,
    rules: 'Once per encounter, opposed Charm or Coercion vs. Discipline check on a target within medium range or earshot. On success, the target suffers strain equal to twice your Presence plus one per success scored. You heal strain equal to the strain inflicted.' },
]