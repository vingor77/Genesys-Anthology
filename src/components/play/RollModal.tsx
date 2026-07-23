import { useState } from 'react'
import DiceRoller from './DiceRoller'
import {
  mergePoolModifier,
  mergeResultModifier,
  type AppliedModifiers,
  type AppliedResultModifiers,
  type ManualToggleOption,
  type DicePoolCounts,
  type RolledDie,
  type RollResult,
} from '../../lib/genesysDice'

export default function RollModal({
  initialPool,
  appliedModifiers,
  appliedResultModifiers,
  manualToggleOptions,
  label,
  onComplete,
  onCancel,
}: {
  initialPool: DicePoolCounts
  // Auto-apply effects only — anything the character always benefits
  // from for this specific roll, gathered once and fixed.
  appliedModifiers?: AppliedModifiers
  appliedResultModifiers?: AppliedResultModifiers
  // Everything toggleable — every autoApply:false pool/result modifier
  // the character has access to for this roll, from items, qualities,
  // and talents alike, all in one list. Replaces what used to be
  // separate persistent "Manual Effects" buttons scattered across the
  // sheet: now it's one panel, live at the moment it actually matters,
  // and nothing here is a saved setting — it resets blank every time
  // this modal opens.
  manualToggleOptions?: ManualToggleOption[]
  label: string
  // strainSpent is the total across every checked variableCost:'strain'
  // option (Rapid Reaction, Proper Upbringing) — the character-side
  // strain deduction itself happens up in CharacterSheet's onResolved,
  // not here; this modal just reports how much was spent.
  onComplete: (dice: RolledDie[], result: RollResult, strainSpent: number) => void
  onCancel: () => void
}) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  // Only for variableCost options — how much the player chose, 0 up to
  // that option's amount (the rank-scaled cap). Absent/0 means "not
  // using this one for this roll."
  const [variableAmounts, setVariableAmounts] = useState<Record<string, number>>({})

  function toggleSimple(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function setVariableAmount(opt: ManualToggleOption, raw: number) {
    const clamped = Math.max(0, Math.min(opt.amount, Math.round(raw) || 0))
    setVariableAmounts((prev) => ({ ...prev, [opt.id]: clamped }))
  }

  // Combines the fixed auto-apply base with whichever toggles are
  // currently active — recomputed on every render, so checking a box or
  // changing a variable amount updates the pool immediately, the same
  // way the roller's own manual +/- controls do.
  let combinedPool = appliedModifiers ?? {}
  let combinedResult = appliedResultModifiers ?? {}
  let strainSpent = 0
  for (const opt of manualToggleOptions ?? []) {
    if (opt.variableCost) {
      const chosen = variableAmounts[opt.id] ?? 0
      if (chosen <= 0) continue
      if (opt.kind === 'pool') combinedPool = mergePoolModifier(combinedPool, opt.type, chosen)
      else combinedResult = mergeResultModifier(combinedResult, opt.type, chosen)
      if (opt.variableCost.resource === 'strain') strainSpent += chosen
      // 'threat' cost is purely a result-level effect, fully resolved
      // within this same roll — the chosen amount adds straight to the
      // roll's own Threat, no character-side write needed at all.
      else combinedResult = mergeResultModifier(combinedResult, 'AddThreat', chosen)
    } else {
      if (!checkedIds.has(opt.id)) continue
      if (opt.kind === 'pool') combinedPool = mergePoolModifier(combinedPool, opt.type, opt.amount)
      else combinedResult = mergeResultModifier(combinedResult, opt.type, opt.amount)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl gap-3 overflow-y-auto">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-fg">{label}</p>
            <button onClick={onCancel} className="text-xs text-fg-secondary hover:text-fg">
              Cancel
            </button>
          </div>
          <DiceRoller
            initialPool={initialPool}
            appliedModifiers={combinedPool}
            appliedResultModifiers={combinedResult}
            onRollComplete={(dice, result) => onComplete(dice, result, strainSpent)}
          />
        </div>

        {manualToggleOptions && manualToggleOptions.length > 0 && (
          <div className="w-64 shrink-0 rounded-lg border border-border bg-surface p-3">
            <p className="mb-2 text-xs font-semibold text-fg-secondary">Optional Effects</p>
            <div className="space-y-2">
              {manualToggleOptions.map((opt) =>
                opt.variableCost ? (
                  <div key={opt.id} className="text-xs text-fg">
                    <p>{opt.label}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={opt.amount}
                        value={variableAmounts[opt.id] ?? 0}
                        onChange={(e) => setVariableAmount(opt, Number(e.target.value))}
                        className="w-16 rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                      />
                      <span className="text-fg-muted">of {opt.amount} max</span>
                    </div>
                  </div>
                ) : (
                  <label key={opt.id} className="flex items-start gap-2 text-xs text-fg">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(opt.id)}
                      onChange={() => toggleSimple(opt.id)}
                      className="mt-0.5"
                    />
                    <span>{opt.label}</span>
                  </label>
                )
              )}
            </div>
            {strainSpent > 0 && (
              <p className="mt-2 border-t border-border pt-2 text-[11px] text-fg-muted">
                Will cost {strainSpent} strain once you roll.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}