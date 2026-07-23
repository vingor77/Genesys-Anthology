// Genesys dice math — face tables straight from the core rulebook, plus
// the roll/result logic every dice-driven feature on this sheet will
// eventually share (the standalone roller now, skill/weapon pool
// building and poolModifiers/resultModifiers application later). Kept
// completely free of UI/React so it's trivial to reuse and to unit test.

export type DieType = 'ability' | 'proficiency' | 'boost' | 'difficulty' | 'challenge' | 'setback'

export type DieSymbol = 'success' | 'failure' | 'advantage' | 'threat' | 'triumph' | 'despair'

// Each die's faces, in order — index into this array is what a physical
// die roll actually lands on. Blank faces are empty arrays. A face can
// carry 0, 1, or 2 symbols (e.g. Ability's "SA" face nets both a success
// and an advantage from a single roll).
const DIE_FACES: Record<DieType, DieSymbol[][]> = {
  boost: [[], [], ['success'], ['success', 'advantage'], ['advantage', 'advantage'], ['advantage']],
  setback: [[], [], ['failure'], ['failure'], ['threat'], ['threat']],
  ability: [
    [], ['success'], ['success'], ['success', 'success'],
    ['advantage'], ['advantage'], ['success', 'advantage'], ['advantage', 'advantage'],
  ],
  difficulty: [
    [], ['failure'], ['failure', 'failure'], ['threat'],
    ['threat'], ['threat'], ['threat', 'threat'], ['failure', 'threat'],
  ],
  proficiency: [
    [], ['success'], ['success'], ['success', 'success'], ['success', 'success'],
    ['advantage'], ['success', 'advantage'], ['success', 'advantage'], ['success', 'advantage'],
    ['advantage', 'advantage'], ['advantage', 'advantage'], ['triumph'],
  ],
  challenge: [
    [], ['failure'], ['failure'], ['failure', 'failure'], ['failure', 'failure'],
    ['threat'], ['threat'], ['failure', 'threat'], ['failure', 'threat'],
    ['threat', 'threat'], ['threat', 'threat'], ['despair'],
  ],
}

export interface RolledDie {
  type: DieType
  faceIndex: number
  symbols: DieSymbol[]
}

export function rollDie(type: DieType): RolledDie {
  const faces = DIE_FACES[type]
  const faceIndex = Math.floor(Math.random() * faces.length)
  return { type, faceIndex, symbols: faces[faceIndex] }
}

export type DicePoolCounts = Partial<Record<DieType, number>>

const DIE_TYPE_ORDER: DieType[] = ['proficiency', 'ability', 'boost', 'challenge', 'difficulty', 'setback']

export function rollPool(counts: DicePoolCounts): RolledDie[] {
  const dice: RolledDie[] = []
  for (const type of DIE_TYPE_ORDER) {
    const n = counts[type] ?? 0
    for (let i = 0; i < n; i++) dice.push(rollDie(type))
  }
  return dice
}

// Every die's face index 0 is blank — true for all six types, not a
// coincidence worth re-verifying per type. So "what's queued" can reuse
// the exact same RolledDie shape and the exact same RolledDieDisplay
// component the results view already uses, just parked on that blank
// face instead of an actual roll outcome. Same ordering as rollPool so
// the tray's left-to-right order matches where each die will land once
// actually rolled.
export function buildTrayDice(counts: DicePoolCounts): RolledDie[] {
  const dice: RolledDie[] = []
  for (const type of DIE_TYPE_ORDER) {
    const n = counts[type] ?? 0
    for (let i = 0; i < n; i++) dice.push({ type, faceIndex: 0, symbols: [] })
  }
  return dice
}

export interface RollResult {
  // Net values — success/failure and advantage/threat cancel 1:1 against
  // each other; whichever side has more ends up here, the other side is
  // always 0. Triumph/despair never cancel against anything — they're
  // reported on their own, in addition to also having already counted
  // toward the raw success/failure totals below before cancellation.
  netSuccess: number
  netFailure: number
  netAdvantage: number
  netThreat: number
  triumph: number
  despair: number
}

export function computeResult(dice: RolledDie[]): RollResult {
  let success = 0
  let failure = 0
  let advantage = 0
  let threat = 0
  let triumph = 0
  let despair = 0

  for (const die of dice) {
    for (const symbol of die.symbols) {
      if (symbol === 'success') success++
      else if (symbol === 'failure') failure++
      else if (symbol === 'advantage') advantage++
      else if (symbol === 'threat') threat++
      else if (symbol === 'triumph') {
        triumph++
        success++ // a Triumph face also counts toward the success total
      } else if (symbol === 'despair') {
        despair++
        failure++ // a Despair face also counts toward the failure total
      }
    }
  }

  return {
    netSuccess: Math.max(0, success - failure),
    netFailure: Math.max(0, failure - success),
    netAdvantage: Math.max(0, advantage - threat),
    netThreat: Math.max(0, threat - advantage),
    triumph,
    despair,
  }
}

// Genesys's actual upgrade algorithm (core rulebook, Upgrading Dice)
// applies to exactly two pairs: Ability→Proficiency and Difficulty→
// Challenge. One shared implementation for both, parameterized by which
// pair — convert one die of "from" to "to" if any "from" remain; if none
// remain, ADD one "from" die instead (not a "to" die) — a single upgrade
// invocation only performs one step of the process. Calling this N times
// in a row naturally reproduces the book's own stated batch behavior
// (add, then convert, then add, then convert...), since each call
// re-checks the pool the previous call left behind.
function applyUpgrade(pool: DicePoolCounts, from: DieType, to: DieType): DicePoolCounts {
  const fromCount = pool[from] ?? 0
  const toCount = pool[to] ?? 0
  return fromCount > 0 ? { ...pool, [from]: fromCount - 1, [to]: toCount + 1 } : { ...pool, [from]: fromCount + 1 }
}

// Deliberately NOT the book's own downgrade rule (which just ignores
// further downgrades once the upgraded die type runs out, specifically
// to avoid overlapping with the separate Add/Remove mechanic) — this
// table's own ruling instead removes a die of the base type once
// there's nothing left to convert back, floored at 0 rather than going
// negative. Same shared shape as applyUpgrade: "from" is the upgraded
// die being converted away (Proficiency or Challenge), "to" is the base
// die it becomes (Ability or Difficulty).
function applyDowngrade(pool: DicePoolCounts, from: DieType, to: DieType): DicePoolCounts {
  const fromCount = pool[from] ?? 0
  const toCount = pool[to] ?? 0
  return fromCount > 0
    ? { ...pool, [from]: fromCount - 1, [to]: toCount + 1 }
    : { ...pool, [to]: Math.max(0, toCount - 1) }
}

export function applyDifficultyUpgrade(pool: DicePoolCounts): DicePoolCounts {
  return applyUpgrade(pool, 'difficulty', 'challenge')
}
export function applyDifficultyDowngrade(pool: DicePoolCounts): DicePoolCounts {
  return applyDowngrade(pool, 'challenge', 'difficulty')
}
export function applyAbilityUpgrade(pool: DicePoolCounts): DicePoolCounts {
  return applyUpgrade(pool, 'ability', 'proficiency')
}
export function applyAbilityDowngrade(pool: DicePoolCounts): DicePoolCounts {
  return applyDowngrade(pool, 'proficiency', 'ability')
}

// A character's persistent, ongoing pool effects — gathered from
// equipment, talents, active statuses, and pending one-time Critical
// Injury effects. Kept separate from whatever the player manually builds
// in the roller, and re-applied on top of it every time either one
// changes, so a constraint like Frazzled's "-999 boost" can't be
// silently undone by manually clicking +1 Boost afterward, and a
// pending effect like Stinger's "+1 to difficulty" applies regardless of
// which difficulty tier gets picked.
//
// difficultyDelta/abilityDelta are the flat Increase/Decrease mechanic
// (Stinger, Auto-fire) — a straight change to how many dice are in the
// pool. difficultyUpgrades/downgrades and abilityUpgrades/downgrades are
// the conversion mechanic (Compromised, Gas Eye) — genuinely different
// per the book, and easy to conflate; this schema keeps them as
// separate fields specifically so they can't get mixed up again.
export interface AppliedModifiers {
  boost?: number
  setback?: number
  difficultyDelta?: number
  difficultyUpgrades?: number
  difficultyDowngrades?: number
  abilityDelta?: number
  abilityUpgrades?: number
  abilityDowngrades?: number
}

// Folds one pool-modifier-type contribution into an existing
// AppliedModifiers total. Extracted as a pure, shared function so both
// CharacterSheet's own gathering (autoApply sources) and the roll-time
// toggle panel (manually checked sources) combine modifiers via the
// exact same logic — one place to get the type-dispatch right, not two
// copies that could quietly drift apart.
export function mergePoolModifier(applied: AppliedModifiers, type: string, amount: number): AppliedModifiers {
  const next = { ...applied }
  if (type === 'AddBoost') next.boost = (next.boost ?? 0) + amount
  else if (type === 'RemoveBoost') next.boost = (next.boost ?? 0) - amount
  else if (type === 'AddSetback') next.setback = (next.setback ?? 0) + amount
  else if (type === 'RemoveSetback') next.setback = (next.setback ?? 0) - amount
  else if (type === 'AddDifficulty') next.difficultyDelta = (next.difficultyDelta ?? 0) + amount
  else if (type === 'RemoveDifficulty') next.difficultyDelta = (next.difficultyDelta ?? 0) - amount
  else if (type === 'UpgradeDifficulty') next.difficultyUpgrades = (next.difficultyUpgrades ?? 0) + amount
  else if (type === 'DowngradeDifficulty') next.difficultyDowngrades = (next.difficultyDowngrades ?? 0) + amount
  else if (type === 'AddAbility') next.abilityDelta = (next.abilityDelta ?? 0) + amount
  else if (type === 'RemoveAbility') next.abilityDelta = (next.abilityDelta ?? 0) - amount
  else if (type === 'UpgradeAbility') next.abilityUpgrades = (next.abilityUpgrades ?? 0) + amount
  else if (type === 'DowngradeAbility') next.abilityDowngrades = (next.abilityDowngrades ?? 0) + amount
  return next
}

// Combines a manually-built pool with a character's persistent modifiers
// into the pool that actually gets rolled. Sequence matches the book:
// flat change first, then all upgrades, then all downgrades — same
// reasoning as poolForSkill's own version of this, just made shared and
// pure so the roller and the sheet can't drift apart on how it's
// computed. Applied independently for both pairs — nothing about
// Ability/Proficiency conversion touches Difficulty/Challenge or vice
// versa.
export function computeFinalPool(manual: DicePoolCounts, modifiers: AppliedModifiers): DicePoolCounts {
  const boost = Math.max(0, (manual.boost ?? 0) + (modifiers.boost ?? 0))
  const setback = Math.max(0, (manual.setback ?? 0) + (modifiers.setback ?? 0))

  let difficultyPool: DicePoolCounts = {
    difficulty: Math.max(0, (manual.difficulty ?? 0) + (modifiers.difficultyDelta ?? 0)),
    challenge: manual.challenge ?? 0,
  }
  for (let i = 0; i < (modifiers.difficultyUpgrades ?? 0); i++) difficultyPool = applyDifficultyUpgrade(difficultyPool)
  for (let i = 0; i < (modifiers.difficultyDowngrades ?? 0); i++) difficultyPool = applyDifficultyDowngrade(difficultyPool)

  let abilityPool: DicePoolCounts = {
    ability: Math.max(0, (manual.ability ?? 0) + (modifiers.abilityDelta ?? 0)),
    proficiency: manual.proficiency ?? 0,
  }
  for (let i = 0; i < (modifiers.abilityUpgrades ?? 0); i++) abilityPool = applyAbilityUpgrade(abilityPool)
  for (let i = 0; i < (modifiers.abilityDowngrades ?? 0); i++) abilityPool = applyAbilityDowngrade(abilityPool)

  const final: DicePoolCounts = {}
  if (abilityPool.ability) final.ability = abilityPool.ability
  if (abilityPool.proficiency) final.proficiency = abilityPool.proficiency
  if (boost > 0) final.boost = boost
  if (setback > 0) final.setback = setback
  if (difficultyPool.difficulty) final.difficulty = difficultyPool.difficulty
  if (difficultyPool.challenge) final.challenge = difficultyPool.challenge
  return final
}

// Autoapply resultModifiers (Superior's automatic Advantage, Inferior's
// automatic Threat) act on the ROLLED RESULT, not the dice pool — a
// genuinely different pipeline stage than everything above, which all
// happens before the dice are ever rolled. Applied the same way
// computeResult itself derives net values: reconstruct the raw
// success-vs-failure and advantage-vs-threat balance, add the bonus in,
// then re-clamp — so a Threat bonus can still cancel out an existing
// Advantage instead of just sitting alongside it unnaturally.
export interface AppliedResultModifiers {
  successBonus?: number
  failureBonus?: number
  advantageBonus?: number
  threatBonus?: number
  triumphBonus?: number
  despairBonus?: number
}

export function mergeResultModifier(applied: AppliedResultModifiers, type: string, amount: number): AppliedResultModifiers {
  const next = { ...applied }
  if (type === 'AddSuccess') next.successBonus = (next.successBonus ?? 0) + amount
  else if (type === 'AddFailure') next.failureBonus = (next.failureBonus ?? 0) + amount
  else if (type === 'AddAdvantage') next.advantageBonus = (next.advantageBonus ?? 0) + amount
  else if (type === 'AddThreat') next.threatBonus = (next.threatBonus ?? 0) + amount
  else if (type === 'AddTriumph') next.triumphBonus = (next.triumphBonus ?? 0) + amount
  else if (type === 'AddDespair') next.despairBonus = (next.despairBonus ?? 0) + amount
  return next
}

// One available-but-not-yet-applied effect for the roll-time toggle
// panel — every autoApply:false pool/result modifier the character has
// access to for this specific roll (item, quality, or talent), listed
// so the panel can show a checkbox for each and recompute the pool live
// as they're checked. Replaces the old persistent per-item/per-talent
// "Manual Effects" buttons entirely — everything toggleable now lives
// in one place, at the moment it actually matters.
export interface ManualToggleOption {
  id: string
  label: string
  kind: 'pool' | 'result'
  type: string
  // Simple checkbox toggles (Auto-fire, Quick Strike): a fixed benefit,
  // on or off. Variable ones (Rapid Reaction, Proper Upbringing, Daring
  // Aviator) instead let the player choose any value from 0 up to this
  // amount (the rank-scaled cap) via a number input, and that chosen
  // value both sets the benefit's actual magnitude and pays the cost
  // named in variableCost. undefined variableCost means this is a plain
  // checkbox; amount is then the fixed value applied when checked.
  amount: number
  variableCost?: {
    // 'strain' needs an actual character resource deducted once the
    // roll resolves (a real write, deferred the same way pending
    // Critical Injury effects are) — 'threat' is purely a result-level
    // effect, fully resolved within this same roll, no character write
    // at all.
    resource: 'strain' | 'threat'
  }
}

export function applyResultModifiers(result: RollResult, modifiers: AppliedResultModifiers): RollResult {
  const successBalance =
    result.netSuccess - result.netFailure + (modifiers.successBonus ?? 0) - (modifiers.failureBonus ?? 0)
  const advantageBalance =
    result.netAdvantage - result.netThreat + (modifiers.advantageBonus ?? 0) - (modifiers.threatBonus ?? 0)
  return {
    netSuccess: Math.max(0, successBalance),
    netFailure: Math.max(0, -successBalance),
    netAdvantage: Math.max(0, advantageBalance),
    netThreat: Math.max(0, -advantageBalance),
    triumph: result.triumph + (modifiers.triumphBonus ?? 0),
    despair: result.despair + (modifiers.despairBonus ?? 0),
  }
}