import { useState, useEffect, type ReactElement } from 'react'
import {
  AbilityDie,
  ProficiencyDie,
  BoostDie,
  DifficultyDie,
  ChallengeDie,
  SetbackDie,
  RolledDieDisplay,
  RolledDiceRow,
  RollResultSummary,
} from '../../icons/DiceIcons'
import {
  rollPool,
  computeResult,
  buildTrayDice,
  computeFinalPool,
  applyResultModifiers,
  type AppliedModifiers,
  type AppliedResultModifiers,
  type DicePoolCounts,
  type DieType,
  type RolledDie,
  type RollResult,
} from '../../lib/genesysDice'

const DIE_META: { type: DieType; label: string; Icon: (props: { size?: number }) => ReactElement }[] = [
  { type: 'proficiency', label: 'Proficiency', Icon: ProficiencyDie },
  { type: 'ability', label: 'Ability', Icon: AbilityDie },
  { type: 'boost', label: 'Boost', Icon: BoostDie },
  { type: 'challenge', label: 'Challenge', Icon: ChallengeDie },
  { type: 'difficulty', label: 'Difficulty', Icon: DifficultyDie },
  { type: 'setback', label: 'Setback', Icon: SetbackDie },
]

const DIFFICULTY_TIERS: { label: string; count: number }[] = [
  { label: 'None', count: 0 },
  { label: 'Easy', count: 1 },
  { label: 'Average', count: 2 },
  { label: 'Hard', count: 3 },
  { label: 'Daunting', count: 4 },
  { label: 'Formidable', count: 5 },
]

// Average is by far the most common difficulty in practice, so a blank
// pool defaults to it rather than zero — most rolls are usable as-is the
// moment the roller opens, and still fully adjustable when they're not.
function withDefaultDifficulty(pool: DicePoolCounts): DicePoolCounts {
  return pool.difficulty !== undefined ? pool : { ...pool, difficulty: 2 }
}

export default function DiceRoller({
  initialPool,
  appliedModifiers,
  appliedResultModifiers,
  onRollComplete,
}: {
  initialPool?: DicePoolCounts
  // The character's own persistent, ongoing pool effects — gathered from
  // equipment, talents, active statuses, and pending Critical Injury
  // effects. Kept as a genuinely separate layer from the manual pool
  // below, and re-combined via computeFinalPool on every render, so a
  // constraint like Frazzled's "no boost dice, ever" can't be silently
  // undone by manually clicking +1 Boost, and a pending effect like
  // Stinger's "+1 upgrade" applies no matter which difficulty tier gets
  // picked afterward. Absent means "nothing persistent to apply" —
  // final pool then just equals whatever's built manually.
  appliedModifiers?: AppliedModifiers
  // Autoapply resultModifiers (Superior, Inferior) — applied to the
  // ROLLED RESULT after the dice land, not to the pool beforehand, so
  // this is deliberately a separate prop from appliedModifiers above
  // rather than folded into it.
  appliedResultModifiers?: AppliedResultModifiers
  // Fired the instant a roll resolves — lets a host (the future Play
  // page's roll modal) capture the result for its chat log without this
  // component needing to know anything about chat, modals, or closing
  // itself. It still shows its own result display too; a host that wants
  // to immediately close/dismiss does that itself right after this fires.
  onRollComplete?: (dice: RolledDie[], result: RollResult) => void
} = {}) {
  // What the player's own buttons directly control — the tier buttons,
  // the manual Upgrade/Downgrade clicks, and the per-type +/- grid. Never
  // shown directly; everything displayed and rolled goes through
  // finalPool below, which is what actually enforces the character's
  // persistent effects.
  const [manualPool, setManualPool] = useState<DicePoolCounts>(withDefaultDifficulty(initialPool ?? {}))
  const [rolled, setRolled] = useState<RolledDie[] | null>(null)
  const [result, setResult] = useState<RollResult | null>(null)

  // Lets a future "click a skill/weapon" trigger hand this component a
  // freshly-computed starting pool. Caller's responsibility to only pass
  // a genuinely new object when the actual selection changes (e.g. build
  // it with useMemo keyed on the skill/weapon id) — a fresh object
  // literal on every render here would reset the tray on every re-render,
  // wiping out manual adjustments and any pending roll.
  useEffect(() => {
    if (initialPool) {
      setManualPool(withDefaultDifficulty(initialPool))
      setRolled(null)
      setResult(null)
    }
  }, [initialPool])

  // Recombined fresh every render — no separate state to keep in sync,
  // so a change to either the manual pool or the character's own
  // gathered modifiers (equipment changing, a status ending) shows up
  // immediately without any invalidation logic.
  const finalPool = computeFinalPool(manualPool, appliedModifiers ?? {})
  const totalDice = (Object.values(finalPool) as (number | undefined)[]).reduce((sum: number, n) => sum + (n ?? 0), 0)

  function adjust(type: DieType, delta: number) {
    setManualPool((prev: DicePoolCounts) => {
      const next = Math.max(0, (prev[type] ?? 0) + delta)
      return { ...prev, [type]: next }
    })
  }

  // Selecting a tier is a hard reset to that base difficulty, not
  // additive — picking Hard after previously upgrading Average should
  // give a clean 3 purple dice as the manual baseline, not 2 purple plus
  // whatever was upgraded on top before. The character's own persistent
  // upgrades (Stinger, an active status) still apply on top of whichever
  // tier gets picked, via finalPool — they're not part of this reset.
  function setDifficultyTier(count: number) {
    setManualPool((prev) => ({ ...prev, difficulty: count, challenge: 0 }))
  }

  // Manual upgrade/downgrade clicks act on the manual layer only — the
  // character's own gathered upgrades/downgrades are separate and always
  // additionally applied via finalPool, per the book's "apply all
  // upgrades, then all downgrades" sequencing regardless of source.
  function upgradeDifficulty() {
    setManualPool((prev) => {
      const difficulty = prev.difficulty ?? 0
      const challenge = prev.challenge ?? 0
      return difficulty > 0
        ? { ...prev, difficulty: difficulty - 1, challenge: challenge + 1 }
        : { ...prev, difficulty: difficulty + 1 }
    })
  }

  function downgradeDifficulty() {
    setManualPool((prev) => {
      const challenge = prev.challenge ?? 0
      const difficulty = prev.difficulty ?? 0
      return challenge > 0
        ? { ...prev, challenge: challenge - 1, difficulty: difficulty + 1 }
        : { ...prev, difficulty: Math.max(0, difficulty - 1) }
    })
  }

  function handleRoll() {
    if (totalDice === 0) return
    const dice = rollPool(finalPool)
    const rawResult = computeResult(dice)
    const rollResult = appliedResultModifiers ? applyResultModifiers(rawResult, appliedResultModifiers) : rawResult
    setRolled(dice)
    setResult(rollResult)
    onRollComplete?.(dice, rollResult)
  }

  // Reset, not Clear — goes back to what the pool was when this roll
  // opened (the actual initialPool, or plain Average difficulty if none
  // was given), not an empty pool. "Undo my manual changes" is the
  // expectation here, not "start completely from scratch."
  function handleReset() {
    setManualPool(withDefaultDifficulty(initialPool ?? {}))
    setRolled(null)
    setResult(null)
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-3 text-lg font-semibold text-fg">Dice Roller</h2>

      <div className="mb-3 rounded border border-border-strong bg-page p-2">
        <p className="mb-1.5 text-xs font-semibold text-fg-secondary">Difficulty</p>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTY_TIERS.map(({ label, count }) => (
            <button
              key={label}
              onClick={() => setDifficultyTier(count)}
              className={`rounded border px-2.5 py-1 text-xs font-medium ${
                manualPool.difficulty === count && (manualPool.challenge ?? 0) === 0
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-border-strong text-fg hover:bg-surface-hover'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={upgradeDifficulty}
            className="rounded border border-border-strong px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-hover"
          >
            Upgrade ↑
          </button>
          <button
            onClick={downgradeDifficulty}
            className="rounded border border-border-strong px-2.5 py-1 text-xs font-medium text-fg hover:bg-surface-hover"
          >
            Downgrade ↓
          </button>
        </div>
        {((appliedModifiers?.difficultyUpgrades ?? 0) > 0 ||
          (appliedModifiers?.difficultyDowngrades ?? 0) > 0 ||
          (appliedModifiers?.difficultyDelta ?? 0) !== 0) && (
          <p className="mt-1.5 text-[11px] text-fg-muted">
            Character effects already applied on top:{' '}
            {(appliedModifiers?.difficultyDelta ?? 0) !== 0 &&
              `${(appliedModifiers!.difficultyDelta ?? 0) > 0 ? '+' : ''}${appliedModifiers!.difficultyDelta} difficulty`}
            {(appliedModifiers?.difficultyUpgrades ?? 0) > 0 &&
              ` +${appliedModifiers!.difficultyUpgrades} upgrade${appliedModifiers!.difficultyUpgrades === 1 ? '' : 's'}`}
            {(appliedModifiers?.difficultyDowngrades ?? 0) > 0 &&
              ` +${appliedModifiers!.difficultyDowngrades} downgrade${appliedModifiers!.difficultyDowngrades === 1 ? '' : 's'}`}
          </p>
        )}
        {((appliedModifiers?.abilityUpgrades ?? 0) > 0 ||
          (appliedModifiers?.abilityDowngrades ?? 0) > 0 ||
          (appliedModifiers?.abilityDelta ?? 0) !== 0) && (
          <p className="mt-1 text-[11px] text-fg-muted">
            Character effects on ability dice:{' '}
            {(appliedModifiers?.abilityDelta ?? 0) !== 0 &&
              `${(appliedModifiers!.abilityDelta ?? 0) > 0 ? '+' : ''}${appliedModifiers!.abilityDelta} ability`}
            {(appliedModifiers?.abilityUpgrades ?? 0) > 0 &&
              ` +${appliedModifiers!.abilityUpgrades} upgrade${appliedModifiers!.abilityUpgrades === 1 ? '' : 's'}`}
            {(appliedModifiers?.abilityDowngrades ?? 0) > 0 &&
              ` +${appliedModifiers!.abilityDowngrades} downgrade${appliedModifiers!.abilityDowngrades === 1 ? '' : 's'}`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {DIE_META.map(({ type, label, Icon }) => (
          <div key={type} className="flex items-center gap-2 rounded border border-border-strong bg-page px-3 py-2">
            <Icon size={22} />
            <span className="flex-1 text-sm text-fg-secondary">{label}</span>
            <button
              onClick={() => adjust(type, -1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-border-strong text-sm text-fg hover:bg-surface-hover"
              aria-label={`Remove one ${label} die`}
            >
              −
            </button>
            {/* Shows the FINAL count (manual + character's persistent
                modifiers combined) — what will actually be rolled — even
                though the +/- buttons themselves only ever adjust the
                manual layer underneath it. */}
            <span className="w-4 text-center text-sm font-medium text-fg">{finalPool[type] ?? 0}</span>
            <button
              onClick={() => adjust(type, 1)}
              className="flex h-6 w-6 items-center justify-center rounded border border-border-strong text-sm text-fg hover:bg-surface-hover"
              aria-label={`Add one ${label} die`}
            >
              +
            </button>
          </div>
        ))}
      </div>

      {totalDice > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded border border-border-strong bg-page px-3 py-2">
          <span className="mr-1 text-xs text-fg-muted">Tray:</span>
          {buildTrayDice(finalPool).map((die, i) => (
            <RolledDieDisplay key={i} die={die} size={26} />
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleRoll}
          disabled={totalDice === 0}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
        >
          Roll{totalDice > 0 ? ` (${totalDice} ${totalDice === 1 ? 'die' : 'dice'})` : ''}
        </button>
        <button
          onClick={handleReset}
          className="rounded border border-border-strong px-4 py-2 text-sm text-fg hover:bg-surface-hover"
        >
          Reset
        </button>
      </div>

      {rolled && rolled.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <RolledDiceRow dice={rolled} />
          {result && (
            <div className="mt-3 rounded border border-border-strong bg-page px-3 py-2">
              <RollResultSummary result={result} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}