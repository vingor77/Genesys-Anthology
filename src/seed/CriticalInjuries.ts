// Seed data for the `criticalInjuries` Firestore collection, matching
// Master_Schema.html's Critical Injuries DB schema as finalized during
// the Phase A audit. appliesStatusId references documents in the
// `statusPresets` collection — that collection isn't seeded yet
// (deferred to the end of Phase A, after Talents), so these references
// won't resolve to anything until it is. That's expected, not a bug.

export interface CriticalInjuryDoc {
  id: string
  name: string
  minRoll: number
  maxRoll: number
  severity: 'Easy' | 'Average' | 'Hard' | 'Daunting'
  effect: string
  isAltering: boolean
  instantEffect?: {
    stat: 'wounds' | 'strain' | 'brawn' | 'agility' | 'intellect' | 'cunning' | 'presence' | 'willpower'
    amount: number
  }
  forcesLastSlot?: boolean
  forcesUnequip?: boolean
  pendingPoolModifier?: { type: string; amount: number }
  appliesStatusId?: string
  rollResults?: {
    max: number
    outcomes: {
      min: number
      max: number
      result: string
      statusPresetId?: string
      overrides?: { statModifiers?: { stat: string; amount: number }[] }
      instantEffect?: { stat: string; amount: number }
    }[]
  }
}

const CHARACTERISTIC_SHIFT_OUTCOMES = [
  { min: 1, max: 3, result: 'Brawn', statusPresetId: 'characteristic-shift', overrides: { statModifiers: [{ stat: 'brawn', amount: -1 }] } },
  { min: 4, max: 6, result: 'Agility', statusPresetId: 'characteristic-shift', overrides: { statModifiers: [{ stat: 'agility', amount: -1 }] } },
  { min: 7, max: 7, result: 'Intellect', statusPresetId: 'characteristic-shift', overrides: { statModifiers: [{ stat: 'intellect', amount: -1 }] } },
  { min: 8, max: 8, result: 'Cunning', statusPresetId: 'characteristic-shift', overrides: { statModifiers: [{ stat: 'cunning', amount: -1 }] } },
  { min: 9, max: 9, result: 'Presence', statusPresetId: 'characteristic-shift', overrides: { statModifiers: [{ stat: 'presence', amount: -1 }] } },
  { min: 10, max: 10, result: 'Willpower', statusPresetId: 'characteristic-shift', overrides: { statModifiers: [{ stat: 'willpower', amount: -1 }] } },
]

const PERMANENT_CHARACTERISTIC_OUTCOMES = [
  { min: 1, max: 3, result: 'Brawn', instantEffect: { stat: 'brawn', amount: -1 } },
  { min: 4, max: 6, result: 'Agility', instantEffect: { stat: 'agility', amount: -1 } },
  { min: 7, max: 7, result: 'Intellect', instantEffect: { stat: 'intellect', amount: -1 } },
  { min: 8, max: 8, result: 'Cunning', instantEffect: { stat: 'cunning', amount: -1 } },
  { min: 9, max: 9, result: 'Presence', instantEffect: { stat: 'presence', amount: -1 } },
  { min: 10, max: 10, result: 'Willpower', instantEffect: { stat: 'willpower', amount: -1 } },
]

export const CRITICAL_INJURIES: CriticalInjuryDoc[] = [
  { id: 'minor-nick', name: 'Minor Nick', minRoll: 1, maxRoll: 5, severity: 'Easy',
    effect: 'Suffer 1 strain, applied automatically the moment this injury is rolled.',
    isAltering: false, instantEffect: { stat: 'strain', amount: 1 } },

  { id: 'slowed-down', name: 'Slowed Down', minRoll: 6, maxRoll: 10, severity: 'Easy',
    effect: 'Forced into the last ally initiative slot next round.',
    isAltering: false, forcesLastSlot: true },

  { id: 'sudden-jolt', name: 'Sudden Jolt', minRoll: 11, maxRoll: 15, severity: 'Easy',
    effect: 'Immediately drop whatever is held in Main Hand and Off Hand.',
    isAltering: false, forcesUnequip: true },

  { id: 'distracted', name: 'Distracted', minRoll: 16, maxRoll: 20, severity: 'Easy',
    effect: "Can't take a free maneuver next turn.",
    isAltering: false },

  { id: 'off-balance', name: 'Off-Balance', minRoll: 21, maxRoll: 25, severity: 'Easy',
    effect: 'Add a setback die to your next skill check.',
    isAltering: false, pendingPoolModifier: { type: 'AddSetback', amount: 1 } },

  { id: 'discouraging-wound', name: 'Discouraging Wound', minRoll: 26, maxRoll: 30, severity: 'Easy',
    effect: 'Move one Story Point from the player pool to the GM pool (reverse if the target is an NPC).',
    isAltering: false },

  { id: 'stunned', name: 'Stunned', minRoll: 31, maxRoll: 35, severity: 'Easy',
    effect: 'Staggered until the end of your next turn.',
    isAltering: false, appliesStatusId: 'staggered-1-round' },

  { id: 'stinger', name: 'Stinger', minRoll: 36, maxRoll: 40, severity: 'Easy',
    effect: 'Increase the difficulty of your next check by one.',
    isAltering: false, pendingPoolModifier: { type: 'AddDifficulty', amount: 1 } },

  { id: 'bowled-over', name: 'Bowled Over', minRoll: 41, maxRoll: 45, severity: 'Average',
    effect: 'Knocked prone, and suffer 1 strain.',
    isAltering: false, instantEffect: { stat: 'strain', amount: 1 }, appliesStatusId: 'prone' },

  { id: 'head-ringer', name: 'Head Ringer', minRoll: 46, maxRoll: 50, severity: 'Average',
    effect: 'Upgrade the difficulty of all Intellect and Cunning checks by one until healed.',
    isAltering: false, appliesStatusId: 'concussed' },

  { id: 'fearsome-wound', name: 'Fearsome Wound', minRoll: 51, maxRoll: 55, severity: 'Average',
    effect: 'Upgrade the difficulty of all Presence and Willpower checks by one until healed.',
    isAltering: false, appliesStatusId: 'cowed' },

  { id: 'agonizing-wound', name: 'Agonizing Wound', minRoll: 56, maxRoll: 60, severity: 'Average',
    effect: 'Upgrade the difficulty of all Brawn and Agility checks by one until healed.',
    isAltering: false, appliesStatusId: 'agonized' },

  { id: 'slightly-dazed', name: 'Slightly Dazed', minRoll: 61, maxRoll: 65, severity: 'Average',
    effect: 'Disoriented until healed.',
    isAltering: false, appliesStatusId: 'disoriented' },

  { id: 'scattered-senses', name: 'Scattered Senses', minRoll: 66, maxRoll: 70, severity: 'Average',
    effect: 'Lose all boost dice from skill checks until healed.',
    isAltering: false, appliesStatusId: 'frazzled' },

  { id: 'hamstrung', name: 'Hamstrung', minRoll: 71, maxRoll: 75, severity: 'Average',
    effect: 'Lose your free maneuver each turn until healed.',
    isAltering: false },

  { id: 'overpowered', name: 'Overpowered', minRoll: 76, maxRoll: 80, severity: 'Average',
    effect: 'Left open — the attacker immediately gets another attack against you as an incidental, using the same dice pool as the original attack.',
    isAltering: false },

  { id: 'winded', name: 'Winded', minRoll: 81, maxRoll: 85, severity: 'Average',
    effect: "Can't voluntarily suffer strain to activate abilities or gain extra maneuvers until healed.",
    isAltering: false },

  { id: 'compromised', name: 'Compromised', minRoll: 86, maxRoll: 90, severity: 'Average',
    effect: 'Upgrade the difficulty of all skill checks by one until healed.',
    isAltering: false, appliesStatusId: 'compromised' },

  { id: 'at-the-brink', name: 'At the Brink', minRoll: 91, maxRoll: 95, severity: 'Hard',
    effect: 'Suffer 2 strain every time you perform an action, until healed.',
    isAltering: false },

  { id: 'crippled', name: 'Crippled', minRoll: 96, maxRoll: 100, severity: 'Hard',
    effect: 'A limb (GM picks which) is impaired until healed — upgrade the difficulty of any check requiring that limb by one.',
    isAltering: false },

  { id: 'grievously-wounded', name: 'Grievously Wounded', minRoll: 101, maxRoll: 105, severity: 'Hard',
    effect: 'Cannot naturally recover wounds until this injury is healed.',
    isAltering: false, appliesStatusId: 'grievously-wounded' },

  { id: 'horrific-injury', name: 'Horrific Injury', minRoll: 106, maxRoll: 110, severity: 'Hard',
    effect: 'Roll 1d10 to determine the affected characteristic. It counts as one point lower (temporarily) until this injury is healed.',
    isAltering: false, rollResults: { max: 10, outcomes: CHARACTERISTIC_SHIFT_OUTCOMES } },

  { id: 'temporarily-disabled', name: 'Temporarily Disabled', minRoll: 111, maxRoll: 115, severity: 'Hard',
    effect: 'Immobilized until healed.',
    isAltering: false, appliesStatusId: 'immobilized' },

  { id: 'blinded', name: 'Blinded', minRoll: 116, maxRoll: 120, severity: 'Hard',
    effect: 'Unable to see — upgrade the difficulty of all checks twice; Perception and Vigilance checks are upgraded three times total instead, until healed.',
    isAltering: false, appliesStatusId: 'blinded' },

  { id: 'knocked-senseless', name: 'Knocked Senseless', minRoll: 121, maxRoll: 125, severity: 'Hard',
    effect: 'Staggered until healed.',
    isAltering: false, appliesStatusId: 'staggered-until-healed' },

  { id: 'gruesome-injury', name: 'Gruesome Injury', minRoll: 126, maxRoll: 130, severity: 'Daunting',
    effect: 'Roll 1d10 to determine the affected characteristic. It is permanently reduced by one (minimum 1) — this does not go away even after the injury itself heals.',
    isAltering: true, rollResults: { max: 10, outcomes: PERMANENT_CHARACTERISTIC_OUTCOMES } },

  { id: 'bleeding-out', name: 'Bleeding Out', minRoll: 131, maxRoll: 140, severity: 'Daunting',
    effect: 'Every round, suffer 1 wound and 1 strain at the start of your turn until healed. Every 5 wounds suffered beyond your wound threshold from this inflicts another Critical Injury — roll again (and if this same result comes up again from that roll, roll once more).',
    isAltering: false, appliesStatusId: 'bleeding-out' },

  { id: 'the-end-is-nigh', name: 'The End Is Nigh', minRoll: 141, maxRoll: 150, severity: 'Daunting',
    effect: 'Death occurs after the last initiative slot of the next round, unless this injury is healed before then.',
    isAltering: false },

  { id: 'dead', name: 'Dead', minRoll: 151, maxRoll: 9999, severity: 'Daunting',
    effect: 'Complete, outright death.',
    isAltering: false },
]