// Seed data for the `criticalInjuries` Firestore collection, matching
// Master_Schema.html's Critical Injuries DB schema. Effects paraphrased in
// original wording from the book's Table I.6-10. Per the automation-scope
// cutback (see Implementation Guide's Key Decisions Log): this table is
// reference data for manual lookup — roll d100 yourself, find the matching
// entry, read the effect. Not auto-rolled or auto-applied right now, same
// as everything else post-cutback. isAltering marks the two entries whose
// effect persists even after the Critical Injury itself is healed.

export interface CriticalInjuryDoc {
  id: string
  name: string
  minRoll: number
  maxRoll: number
  severity: 'Easy' | 'Average' | 'Hard' | 'Daunting'
  effect: string
  isAltering: boolean
  rollResults?: { max: number; outcomes: { min: number; max: number; result: string }[] }
}

const CHARACTERISTIC_ROLL_OUTCOMES = [
  { min: 1, max: 3, result: 'Brawn' },
  { min: 4, max: 6, result: 'Agility' },
  { min: 7, max: 7, result: 'Intellect' },
  { min: 8, max: 8, result: 'Cunning' },
  { min: 9, max: 9, result: 'Presence' },
  { min: 10, max: 10, result: 'Willpower' },
]

export const CRITICAL_INJURIES: CriticalInjuryDoc[] = [
  { id: 'minor-nick', name: 'Minor Nick', minRoll: 1, maxRoll: 5, severity: 'Easy',
    effect: 'Suffer 1 strain.', isAltering: false },
  { id: 'slowed-down', name: 'Slowed Down', minRoll: 6, maxRoll: 10, severity: 'Easy',
    effect: 'Act during the last allied initiative slot next turn.', isAltering: false },
  { id: 'sudden-jolt', name: 'Sudden Jolt', minRoll: 11, maxRoll: 15, severity: 'Easy',
    effect: 'Drop whatever is currently held.', isAltering: false },
  { id: 'distracted', name: 'Distracted', minRoll: 16, maxRoll: 20, severity: 'Easy',
    effect: "Can't take a free maneuver next turn.", isAltering: false },
  { id: 'off-balance', name: 'Off-Balance', minRoll: 21, maxRoll: 25, severity: 'Easy',
    effect: 'Add a setback die to your next skill check.', isAltering: false },
  { id: 'discouraging-wound', name: 'Discouraging Wound', minRoll: 26, maxRoll: 30, severity: 'Easy',
    effect: 'Move one Story Point from the player pool to the GM pool (reverse if the target is an NPC).', isAltering: false },
  { id: 'stunned', name: 'Stunned', minRoll: 31, maxRoll: 35, severity: 'Easy',
    effect: 'Staggered until the end of your next turn.', isAltering: false },
  { id: 'stinger', name: 'Stinger', minRoll: 36, maxRoll: 40, severity: 'Easy',
    effect: "Increase the difficulty of your next check by one.", isAltering: false },
  { id: 'bowled-over', name: 'Bowled Over', minRoll: 41, maxRoll: 45, severity: 'Average',
    effect: 'Knocked prone, and suffer 1 strain.', isAltering: false },
  { id: 'head-ringer', name: 'Head Ringer', minRoll: 46, maxRoll: 50, severity: 'Average',
    effect: 'Upgrade the difficulty of all Intellect and Cunning checks by one until healed.', isAltering: false },
  { id: 'fearsome-wound', name: 'Fearsome Wound', minRoll: 51, maxRoll: 55, severity: 'Average',
    effect: 'Upgrade the difficulty of all Presence and Willpower checks by one until healed.', isAltering: false },
  { id: 'agonizing-wound', name: 'Agonizing Wound', minRoll: 56, maxRoll: 60, severity: 'Average',
    effect: 'Upgrade the difficulty of all Brawn and Agility checks by one until healed.', isAltering: false },
  { id: 'slightly-dazed', name: 'Slightly Dazed', minRoll: 61, maxRoll: 65, severity: 'Average',
    effect: 'Disoriented until healed.', isAltering: false },
  { id: 'scattered-senses', name: 'Scattered Senses', minRoll: 66, maxRoll: 70, severity: 'Average',
    effect: 'Lose all boost dice from skill checks until healed.', isAltering: false },
  { id: 'hamstrung', name: 'Hamstrung', minRoll: 71, maxRoll: 75, severity: 'Average',
    effect: 'Lose your free maneuver each turn until healed.', isAltering: false },
  { id: 'overpowered', name: 'Overpowered', minRoll: 76, maxRoll: 80, severity: 'Average',
    effect: "Left open — the attacker immediately gets another attack against you as an incidental, using the same dice pool as the original attack." , isAltering: false },
  { id: 'winded', name: 'Winded', minRoll: 81, maxRoll: 85, severity: 'Average',
    effect: "Can't voluntarily suffer strain to activate abilities or gain extra maneuvers until healed.", isAltering: false },
  { id: 'compromised', name: 'Compromised', minRoll: 86, maxRoll: 90, severity: 'Average',
    effect: 'Upgrade the difficulty of all skill checks by one until healed.', isAltering: false },
  { id: 'at-the-brink', name: 'At the Brink', minRoll: 91, maxRoll: 95, severity: 'Hard',
    effect: 'Suffer 2 strain every time you perform an action, until healed.', isAltering: false },
  { id: 'crippled', name: 'Crippled', minRoll: 96, maxRoll: 100, severity: 'Hard',
    effect: 'A limb (GM picks which) is impaired until healed — upgrade the difficulty of any check requiring that limb by one.', isAltering: false },
  { id: 'maimed', name: 'Maimed', minRoll: 101, maxRoll: 105, severity: 'Hard',
    effect: "A limb (GM picks which) is permanently lost, unless replaced with a cybernetic or prosthetic. Actions requiring that limb are impossible without a replacement. Every other action gains a boost die until this injury is healed.", isAltering: true },
  { id: 'horrific-injury', name: 'Horrific Injury', minRoll: 106, maxRoll: 110, severity: 'Hard',
    effect: 'Roll 1d10 to determine the affected characteristic. It counts as one point lower until this injury is healed.', isAltering: false,
    rollResults: { max: 10, outcomes: CHARACTERISTIC_ROLL_OUTCOMES } },
  { id: 'temporarily-disabled', name: 'Temporarily Disabled', minRoll: 111, maxRoll: 115, severity: 'Hard',
    effect: 'Immobilized until healed.', isAltering: false },
  { id: 'blinded', name: 'Blinded', minRoll: 116, maxRoll: 120, severity: 'Hard',
    effect: 'Unable to see — upgrade the difficulty of all checks twice, and Perception/Vigilance checks a further three times, until healed.', isAltering: false },
  { id: 'knocked-senseless', name: 'Knocked Senseless', minRoll: 121, maxRoll: 125, severity: 'Hard',
    effect: 'Staggered until healed.', isAltering: false },
  { id: 'gruesome-injury', name: 'Gruesome Injury', minRoll: 126, maxRoll: 130, severity: 'Daunting',
    effect: 'Roll 1d10 to determine the affected characteristic. It is permanently reduced by one (minimum 1) — this does not go away even after the injury itself heals.', isAltering: true,
    rollResults: { max: 10, outcomes: CHARACTERISTIC_ROLL_OUTCOMES } },
  { id: 'bleeding-out', name: 'Bleeding Out', minRoll: 131, maxRoll: 140, severity: 'Daunting',
    effect: 'Every round, suffer 1 wound and 1 strain at the start of your turn until healed. Every 5 wounds suffered beyond your wound threshold from this inflicts another Critical Injury — roll again (and if this same result comes up again from that roll, roll once more).', isAltering: false },
  { id: 'the-end-is-nigh', name: 'The End Is Nigh', minRoll: 141, maxRoll: 150, severity: 'Daunting',
    effect: 'Death occurs after the last initiative slot of the next round, unless this injury is healed before then.', isAltering: false },
  { id: 'dead', name: 'Dead', minRoll: 151, maxRoll: 9999, severity: 'Daunting',
    effect: 'Complete, outright death.', isAltering: false },
]