import { useState } from 'react'
import type { ObjectDoc, QualityDoc, SkillDoc } from '../../lib/characters'
import { VISIBLE_ITEM_FIELDS, BBB_SKILLS, BBB_SKILL_CATEGORY } from '../../lib/gameConfigs/bbb'
import { STAT_LABELS, CHARACTERISTIC_LABELS } from '../../lib/genesysCalc'

// Not part of the master schema — a homebrew ruleset call about which
// qualities make sense for which item type. 'all' means no filtering;
// an array restricts the picker to just those names; an empty array
// hides the Qualities section entirely for that type.
const QUALITIES_BY_TYPE: Record<ObjectDoc['type'], 'all' | string[]> = {
  Weapon: 'all',
  Armor: ['Reinforced', 'Cumbersome'],
  Food: [],
  Drink: [],
  'Light Source': ['Fragile', 'Burn'],
  Tool: ['Fragile'],
  Mundane: ['Fragile'],
}

// Pool/result modifier type enums — from the Shared Enums section of the
// master schema. Kept here rather than inline in the JSX since both
// dropdowns reference them.
const POOL_MODIFIER_TYPES = ['AddBoost', 'RemoveSetback', 'UpgradeDifficulty', 'DowngradeDifficulty'] as const
const RESULT_MODIFIER_TYPES = ['AddSuccess', 'AddFailure', 'AddAdvantage', 'AddThreat', 'AddTriumph', 'AddDespair'] as const

// The statModifiers dropdown offers every DerivedStatBonuses key plus
// every characteristic — 11 options total. `wounds`/`strain` from the
// shared stat enum are deliberately NOT offered as separate options:
// for a standing item modifier they'd do the exact same thing as
// woundThreshold/strainThreshold (see genesysCalc.ts's ITEM_STAT_ALIASES),
// so showing both would just be two identical-effect entries with
// different labels — confusing, not more complete.
const STAT_MODIFIER_OPTIONS: { value: string; label: string }[] = [
  ...Object.entries(STAT_LABELS).map(([value, label]) => ({ value, label })),
  ...Object.entries(CHARACTERISTIC_LABELS).map(([value, label]) => ({ value, label })),
]

interface StatModifierRow {
  stat: string
  amount: number
  autoApply: boolean
}

interface PoolResultModifierRow {
  type: string
  amount: number
  appliesTo: string
  autoApply: boolean
}

function blankForm() {
  return {
    // Universal — Identity
    name: '',
    description: '',
    type: 'Mundane' as ObjectDoc['type'],
    rarity: 0,
    encumbrance: 0,
    price: 0,
    isQuestItem: false,
    factionExclusive: '',
    isCraftingMaterial: false,
    // Universal — Effects
    effect: '',
    situationalCondition: '',
    situationalEffect: '',
    statModifiers: [] as StatModifierRow[],
    poolModifiers: [] as PoolResultModifierRow[],
    resultModifiers: [] as PoolResultModifierRow[],
    // Universal — Durability & Uses
    durability: undefined as number | undefined,
    uses: undefined as number | undefined,
    usesCannotRestore: false,
    repairMaterial: '',
    craftSkill: '' as NonNullable<ObjectDoc['craft_skill']> | '',
    // Slots (Weapon/Armor)
    slots: [] as string[],
    // Only meaningful once 2+ slots are checked — 'any' means the player
    // picks one slot at equip time, 'all' means it fills every checked
    // slot at once (genuinely two-handed).
    slotMode: 'any' as 'all' | 'any',
    // Weapon
    damage: 0,
    damageType: 'Brawn-based' as 'Brawn-based' | 'Fixed',
    crit: 0,
    range: 'Engaged' as NonNullable<ObjectDoc['range']>,
    skill: '',
    qualities: [] as { name: string; rank?: number }[],
    // Armor
    soak: 0,
    meleeDefense: 0,
    rangedDefense: 0,
    // Food/Drink
    hungerStacksRemoved: 0,
    thirstStacksRemoved: 0,
    // Light Source
    lightStepBoost: 0,
    lightCap: '',
    duration: 0,
    fuelType: 'Batteries' as NonNullable<ObjectDoc['fuel_type']>,
    // Backrooms extension fields — cross-cutting, not tied to one type
    noclipEnabled: false,
    noclipSkill: '',
    noclipDifficulty: 0,
    sanityRestored: 0,
    sanityThresholdRequired: 0,
    timekeeping: false,
    timekeepingAccurate: false,
    suppressEffect: '',
    protectionType: [] as string[],
    curesSickness: '',
    recoveryRollModifier: 0,
  }
}

type FormState = ReturnType<typeof blankForm>

const inputCls = 'mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg'
const labelCls = 'text-xs text-fg-muted'
// Neutral box — used for the Universal section and the Backrooms
// section, both of which apply regardless of which type is selected.
const boxCls = 'mt-4 rounded-xl border border-border-strong bg-surface p-4'
const boxTitleCls = 'mb-3 text-[11px] font-medium uppercase tracking-wide text-fg-muted'
// Accent box — used only for whichever type-specific section is
// currently active (Weapon/Armor/Food/Drink/Light Source), so the one
// section that actually depends on your Type selection visually pops
// out from the rest of the form instead of looking like just another
// gray box in a stack of gray boxes.
const accentBoxCls = 'mt-4 rounded-xl border border-accent bg-accent/10 p-4'
const accentBoxTitleCls = 'mb-3 text-[11px] font-medium uppercase tracking-wide text-accent'
const checkboxRowCls = 'mt-1 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3'
const checkboxLabelCls = 'flex items-center gap-1.5 text-xs text-fg'

// Melee/ranged only — a weapon's governing skill should never be a
// social or general skill, so the dropdown is filtered down instead of
// showing all 18 BBB skills and hoping the person picks correctly.
const COMBAT_SKILLS = BBB_SKILLS.filter((id) => BBB_SKILL_CATEGORY[id] === 'Combat')

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className={labelCls}>
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={inputCls}
      />
    </label>
  )
}

// Distinct from NumberField above — blank genuinely means "no value set"
// (e.g. unlimited uses), not 0. NumberField always coerces to a number,
// so an item with e.g. `uses` would flicker undefined every time the
// input passed through an empty intermediate state while typing,
// silently yanking away anything gated on "is this field set" (like the
// Cannot Restore Uses checkbox). This keeps blank and 0 genuinely
// different states.
function OptionalNumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: number | undefined
  onChange: (n: number | undefined) => void
  placeholder?: string
}) {
  return (
    <label className={labelCls}>
      {label}
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (s: string) => void
  placeholder?: string
}) {
  return (
    <label className={labelCls}>
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </label>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-1 self-end text-xs text-fg-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

// Shared editor for statModifiers — a repeatable list of {stat, amount,
// autoApply} rows. Used once, in the Universal section; every item type
// can carry stat modifiers, not just Weapon/Armor.
function StatModifierEditor({ rows, onChange }: { rows: StatModifierRow[]; onChange: (rows: StatModifierRow[]) => void }) {
  return (
    <div className="mt-3">
      <p className={labelCls}>
        Stat Modifiers{' '}
        <span className="text-fg-muted/70">
          (Auto Apply = always on while owned; otherwise applied manually with the sheet's Apply button)
        </span>
      </p>
      {rows.map((mod, i) => (
        <div key={i} className="mt-1 flex flex-wrap items-center gap-2">
          <select
            value={mod.stat}
            onChange={(e) => onChange(rows.map((m, j) => (j === i ? { ...m, stat: e.target.value } : m)))}
            className="rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
          >
            {STAT_MODIFIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="number"
            value={mod.amount}
            onChange={(e) => onChange(rows.map((m, j) => (j === i ? { ...m, amount: Number(e.target.value) || 0 } : m)))}
            className="w-20 rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
          />
          <label className="flex items-center gap-1 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={mod.autoApply}
              onChange={(e) => onChange(rows.map((m, j) => (j === i ? { ...m, autoApply: e.target.checked } : m)))}
            />
            Auto Apply
          </label>
          <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-xs text-warning hover:underline">
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...rows, { stat: 'soak', amount: 1, autoApply: false }])}
        className="mt-1 rounded border border-border-strong px-2 py-1 text-xs text-fg hover:bg-surface-hover"
      >
        + Add Stat Modifier
      </button>
    </div>
  )
}

// Shared editor for poolModifiers/resultModifiers — identical shape
// apart from which type enum populates the dropdown. Both stay entirely
// hidden until VISIBLE_ITEM_FIELDS turns them on (no dice roller exists
// yet to consume them), so this only ever renders once that's true.
// Turns a PascalCase enum value into readable spaced words for display —
// "AddBoost" -> "Add Boost". The stored value stays the raw enum
// (that's what the schema expects); this only affects what's shown.
function humanize(pascalCase: string): string {
  return pascalCase.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function PoolResultModifierEditor({
  title,
  rows,
  typeOptions,
  onChange,
}: {
  title: string
  rows: PoolResultModifierRow[]
  typeOptions: readonly string[]
  onChange: (rows: PoolResultModifierRow[]) => void
}) {
  return (
    <div className="mt-3">
      <p className={labelCls}>{title}</p>
      {rows.map((mod, i) => (
        <div key={i} className="mt-1 flex flex-wrap items-center gap-2">
          <select
            value={mod.type}
            onChange={(e) => onChange(rows.map((m, j) => (j === i ? { ...m, type: e.target.value } : m)))}
            className="rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
          >
            {typeOptions.map((opt) => (
              <option key={opt} value={opt}>{humanize(opt)}</option>
            ))}
          </select>
          <input
            type="number"
            value={mod.amount}
            onChange={(e) => onChange(rows.map((m, j) => (j === i ? { ...m, amount: Number(e.target.value) || 0 } : m)))}
            className="w-16 rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
          />
          <input
            value={mod.appliesTo}
            onChange={(e) => onChange(rows.map((m, j) => (j === i ? { ...m, appliesTo: e.target.value } : m)))}
            placeholder="Applies to…"
            className="w-32 rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
          />
          <label className="flex items-center gap-1 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={mod.autoApply}
              onChange={(e) => onChange(rows.map((m, j) => (j === i ? { ...m, autoApply: e.target.checked } : m)))}
            />
            Auto Apply
          </label>
          <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-xs text-warning hover:underline">
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...rows, { type: typeOptions[0], amount: 1, appliesTo: '', autoApply: false }])}
        className="mt-1 rounded border border-border-strong px-2 py-1 text-xs text-fg hover:bg-surface-hover"
      >
        + Add {title.split(' ')[0]}
      </button>
    </div>
  )
}

interface QualityRow {
  name: string
  rank?: number
}

// Same add-row shape as StatModifierEditor/PoolResultModifierEditor —
// dropdown to pick which quality, plus a rank number input that only
// shows up when the selected quality is actually ranked (QualityDoc.ranked).
// Renders nothing if the current type has no qualities available at all
// (Food/Drink), rather than showing an empty box.
function QualityEditor({
  rows,
  onChange,
  availableQualities,
}: {
  rows: QualityRow[]
  onChange: (rows: QualityRow[]) => void
  availableQualities: QualityDoc[]
}) {
  if (availableQualities.length === 0) return null
  return (
    <div className="mt-3">
      <p className={labelCls}>Qualities</p>
      {rows.map((q, i) => {
        const doc = availableQualities.find((d) => d.name === q.name)
        return (
          <div key={i} className="mt-1 flex flex-wrap items-center gap-2">
            <select
              value={q.name}
              onChange={(e) => {
                const nextDoc = availableQualities.find((d) => d.name === e.target.value)
                onChange(rows.map((r, j) => (j === i ? { name: e.target.value, rank: nextDoc?.ranked ? (r.rank ?? 1) : undefined } : r)))
              }}
              className="rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
            >
              {availableQualities.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
            {doc?.ranked && (
              <label className="flex items-center gap-1 text-xs text-fg-muted">
                Rank
                <input
                  type="number"
                  min={1}
                  value={q.rank ?? 1}
                  onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, rank: Number(e.target.value) || 1 } : r)))}
                  className="w-16 rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
                />
              </label>
            )}
            <button onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-xs text-warning hover:underline">
              Remove
            </button>
          </div>
        )
      })}
      <button
        onClick={() => {
          const first = availableQualities[0]
          onChange([...rows, { name: first.name, rank: first.ranked ? 1 : undefined }])
        }}
        className="mt-1 rounded border border-border-strong px-2 py-1 text-xs text-fg hover:bg-surface-hover"
      >
        + Add Quality
      </button>
    </div>
  )
}

export default function CustomItemForm({
  activeSlots,
  qualityDocs,
  skillDocs,
  onCreate,
  onCancel,
  fixedType,
  hideMechanics,
}: {
  activeSlots: readonly string[]
  qualityDocs: QualityDoc[]
  skillDocs: SkillDoc[]
  onCreate: (payload: Omit<ObjectDoc, 'id' | 'sessionId' | 'ownerId'>) => void
  onCancel: () => void
  // When set, the Type dropdown is replaced with a plain label and the
  // form never leaves that type — used by character creation's Personal
  // Items, which is always Mundane and never shows a type picker at all.
  fixedType?: ObjectDoc['type']
  // Hides everything that grants a mechanical benefit (Effect,
  // Situational, Stat Modifiers, Qualities, Uses/Cannot Restore) —
  // same use case as fixedType: a purely cosmetic personal item during
  // character creation shouldn't be able to smuggle in a stat bonus.
  hideMechanics?: boolean
}) {
  const [f, setForm] = useState<FormState>(() => (fixedType ? { ...blankForm(), type: fixedType } : blankForm()))
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const canEquip = f.type === 'Weapon' || f.type === 'Armor'
  const allowedQualityNames = QUALITIES_BY_TYPE[f.type]
  const availableQualities =
    allowedQualityNames === 'all' ? qualityDocs : qualityDocs.filter((q) => allowedQualityNames.includes(q.name))
  const backroomsFieldsVisible =
    VISIBLE_ITEM_FIELDS.noclip ||
    VISIBLE_ITEM_FIELDS.sanity ||
    VISIBLE_ITEM_FIELDS.timekeeping ||
    VISIBLE_ITEM_FIELDS.suppressEffect ||
    VISIBLE_ITEM_FIELDS.protectionType ||
    VISIBLE_ITEM_FIELDS.curesSickness ||
    VISIBLE_ITEM_FIELDS.recoveryRollModifier

  function handleSubmit() {
    if (!f.name.trim()) return

    const payload: Omit<ObjectDoc, 'id' | 'sessionId' | 'ownerId'> = {
      name: f.name.trim(),
      description: f.description.trim(),
      type: f.type,
      rarity: f.rarity,
      encumbrance: f.encumbrance,
    }
    if (f.price) payload.price = f.price
    if (f.isQuestItem) payload.is_quest_item = true
    if (VISIBLE_ITEM_FIELDS.factionExclusive && f.factionExclusive.trim()) payload.faction_exclusive = f.factionExclusive.trim()
    if (VISIBLE_ITEM_FIELDS.craftingMaterial && f.isCraftingMaterial) payload.is_crafting_material = true

    if (f.effect.trim()) payload.effect = f.effect.trim()
    if (f.situationalCondition.trim() && f.situationalEffect.trim()) {
      payload.situational = { condition: f.situationalCondition.trim(), effect: f.situationalEffect.trim() }
    }
    if (f.statModifiers.length > 0) payload.statModifiers = f.statModifiers
    if (VISIBLE_ITEM_FIELDS.poolModifiers && f.poolModifiers.length > 0) {
      payload.poolModifiers = f.poolModifiers
    }
    if (VISIBLE_ITEM_FIELDS.resultModifiers && f.resultModifiers.length > 0) {
      payload.resultModifiers = f.resultModifiers
    }

    if (f.durability !== undefined) payload.durability = f.durability
    if (f.uses !== undefined) {
      payload.uses = f.uses
      if (f.usesCannotRestore) payload.usesCannotRestore = true
    }
    if (VISIBLE_ITEM_FIELDS.repairMaterials && canEquip && f.repairMaterial.trim()) payload.repair_material = f.repairMaterial.trim()
    if (VISIBLE_ITEM_FIELDS.craftSkill && canEquip && f.craftSkill) payload.craft_skill = f.craftSkill

    // Armor slot isn't a user choice in BBB — there's exactly one
    // (Chest), so it's set automatically rather than shown as a picker.
    // Weapon keeps the picker since Main Hand/Off Hand is a real choice.
    // Checked against the actual type, not just "not Armor" — otherwise
    // switching from Weapon (with a slot checked) to Food would still
    // silently carry that stale slot selection onto a Food item.
    if (f.type === 'Armor') payload.slots = ['Chest']
    else if (f.type === 'Weapon' && f.slots.length > 0) {
      payload.slots = f.slots
      if (f.slots.length > 1) payload.slotMode = f.slotMode
    }

    // Same staleness guard — if qualities were picked while a different
    // type was selected (e.g. Weapon), re-filter against what's actually
    // valid for the type being submitted now, so switching types doesn't
    // silently smuggle an invalid quality onto the item.
    const validQualities = f.qualities.filter((q) => availableQualities.some((d) => d.name === q.name))
    if (validQualities.length > 0) {
      payload.qualities = validQualities.map((q) => (q.rank !== undefined ? { name: q.name, rank: q.rank } : { name: q.name }))
    }

    if (f.type === 'Weapon') {
      payload.damage = f.damage
      payload.damageType = f.damageType
      payload.crit = f.crit
      payload.range = f.range
      if (f.skill) payload.skill = f.skill
    }
    if (f.type === 'Armor') {
      payload.soak = f.soak
      payload.meleeDefense = f.meleeDefense
      payload.rangedDefense = f.rangedDefense
    }
    if (VISIBLE_ITEM_FIELDS.hungerStacksRemoved && f.type === 'Food') payload.hunger_stacks_removed = f.hungerStacksRemoved
    if (VISIBLE_ITEM_FIELDS.thirstStacksRemoved && f.type === 'Drink') payload.thirst_stacks_removed = f.thirstStacksRemoved
    if (VISIBLE_ITEM_FIELDS.lightSourceDetails && f.type === 'Light Source') {
      payload.light_step_boost = f.lightStepBoost
      if (f.lightCap) payload.light_cap = f.lightCap
      payload.duration = f.duration
      payload.fuel_type = f.fuelType
    }

    if (VISIBLE_ITEM_FIELDS.noclip && f.noclipEnabled) {
      payload.noclip_enabled = true
      if (f.noclipSkill) payload.noclip_skill = f.noclipSkill
      payload.noclip_difficulty = f.noclipDifficulty
    }
    if (VISIBLE_ITEM_FIELDS.sanity && f.sanityRestored) {
      payload.sanity_restored = f.sanityRestored
      if (f.sanityThresholdRequired) payload.sanity_threshold_required = f.sanityThresholdRequired
    }
    if (VISIBLE_ITEM_FIELDS.timekeeping && f.timekeeping) {
      payload.timekeeping = true
      payload.timekeeping_accurate = f.timekeepingAccurate
    }
    if (VISIBLE_ITEM_FIELDS.suppressEffect && f.suppressEffect.trim()) payload.suppress_effect = f.suppressEffect.trim()
    if (VISIBLE_ITEM_FIELDS.protectionType && f.protectionType.length > 0) {
      payload.protection_type = f.protectionType as NonNullable<ObjectDoc['protection_type']>
    }
    if (VISIBLE_ITEM_FIELDS.curesSickness && f.curesSickness.trim()) {
      payload.cures_sickness = f.curesSickness.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (VISIBLE_ITEM_FIELDS.recoveryRollModifier && f.recoveryRollModifier) payload.recovery_roll_modifier = f.recoveryRollModifier

    onCreate(payload)
    setForm(fixedType ? { ...blankForm(), type: fixedType } : blankForm())
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded border border-border bg-page p-3">
      {/* ============ UNIVERSAL — always visible, any type ============ */}
      <div className={boxCls}>
        <p className={boxTitleCls}>Every item</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <TextField label="Name" value={f.name} onChange={(v) => set('name', v)} placeholder="Item name" />
          {fixedType ? (
            <div>
              <p className={labelCls}>Type</p>
              <p className="mt-0.5 text-sm text-fg">{fixedType}</p>
            </div>
          ) : (
            <label className={labelCls}>
              Type
              <select
                value={f.type}
                onChange={(e) => set('type', e.target.value as ObjectDoc['type'])}
                className={inputCls}
              >
                <option value="Weapon">Weapon</option>
                <option value="Armor">Armor</option>
                <option value="Food">Food</option>
                <option value="Drink">Drink</option>
                <option value="Light Source">Light Source</option>
                <option value="Tool">Tool</option>
                <option value="Mundane">Mundane</option>
              </select>
            </label>
          )}
        </div>

        <label className={`mt-2 block ${labelCls}`}>
          Description
          <textarea
            value={f.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className={inputCls}
          />
        </label>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <NumberField label="Rarity" value={f.rarity} onChange={(v) => set('rarity', v)} />
          <NumberField label="Encumbrance" value={f.encumbrance} onChange={(v) => set('encumbrance', v)} />
          <NumberField label="Price" value={f.price} onChange={(v) => set('price', v)} />
          <CheckboxField label="Quest item" checked={f.isQuestItem} onChange={(v) => set('isQuestItem', v)} />
          {VISIBLE_ITEM_FIELDS.factionExclusive && (
            <TextField label="Faction exclusive" value={f.factionExclusive} onChange={(v) => set('factionExclusive', v)} />
          )}
          {VISIBLE_ITEM_FIELDS.craftingMaterial && (
            <CheckboxField label="Crafting material" checked={f.isCraftingMaterial} onChange={(v) => set('isCraftingMaterial', v)} />
          )}
          {!hideMechanics && (
            <>
              <OptionalNumberField label="Uses" value={f.uses} onChange={(v) => set('uses', v)} placeholder="Unlimited" />
              {f.uses !== undefined && (
                <CheckboxField label="Cannot restore uses" checked={f.usesCannotRestore} onChange={(v) => set('usesCannotRestore', v)} />
              )}
            </>
          )}
        </div>

        {!hideMechanics && (
          <>
            <label className={`mt-3 block ${labelCls}`}>
              Effect (free-text mechanical effect, any type)
              <input value={f.effect} onChange={(e) => set('effect', e.target.value)} className={inputCls} />
            </label>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <TextField
                label="Situational condition"
                value={f.situationalCondition}
                onChange={(v) => set('situationalCondition', v)}
                placeholder="e.g. If underwater"
              />
              <TextField
                label="Situational effect"
                value={f.situationalEffect}
                onChange={(v) => set('situationalEffect', v)}
                placeholder="e.g. Add 1 setback to all checks"
              />
            </div>

            <QualityEditor rows={f.qualities} onChange={(rows) => set('qualities', rows)} availableQualities={availableQualities} />

            <StatModifierEditor rows={f.statModifiers} onChange={(rows) => set('statModifiers', rows)} />
          </>
        )}

        {!hideMechanics && VISIBLE_ITEM_FIELDS.poolModifiers && (
          <PoolResultModifierEditor
            title="Pool Modifiers"
            rows={f.poolModifiers}
            typeOptions={POOL_MODIFIER_TYPES}
            onChange={(rows) => set('poolModifiers', rows)}
          />
        )}
        {!hideMechanics && VISIBLE_ITEM_FIELDS.resultModifiers && (
          <PoolResultModifierEditor
            title="Result Modifiers"
            rows={f.resultModifiers}
            typeOptions={RESULT_MODIFIER_TYPES}
            onChange={(rows) => set('resultModifiers', rows)}
          />
        )}
      </div>

      {/* ============ WEAPON ============ */}
      {f.type === 'Weapon' && (
        <div className={accentBoxCls}>
          <p className={accentBoxTitleCls}>Weapon fields</p>
          <div>
            <p className={labelCls}>Slots (needed for the Equip button to work at all)</p>
            <div className={checkboxRowCls}>
              {activeSlots.filter((slot) => slot !== 'Chest').map((slot) => (
                <label key={slot} className={checkboxLabelCls}>
                  <input
                    type="checkbox"
                    checked={f.slots.includes(slot)}
                    onChange={(e) => set('slots', e.target.checked ? [...f.slots, slot] : f.slots.filter((s) => s !== slot))}
                  />
                  {slot}
                </label>
              ))}
            </div>
            {f.slots.length > 1 && (
              <div className="mt-2">
                <p className={labelCls}>Both slots checked — how does equipping this work?</p>
                <div className="mt-1 flex flex-col gap-1">
                  <label className={checkboxLabelCls}>
                    <input type="radio" checked={f.slotMode === 'any'} onChange={() => set('slotMode', 'any')} />
                    Player picks one slot at equip time (a light weapon usable in either hand)
                  </label>
                  <label className={checkboxLabelCls}>
                    <input type="radio" checked={f.slotMode === 'all'} onChange={() => set('slotMode', 'all')} />
                    Fills both slots at once, unequipping anything there (genuinely two-handed)
                  </label>
                </div>
              </div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumberField label="Durability" value={f.durability ?? 3} onChange={(v) => set('durability', v)} />
            <NumberField label="Damage" value={f.damage} onChange={(v) => set('damage', v)} />
            <label className={labelCls}>
              Damage type
              <select
                value={f.damageType}
                onChange={(e) => set('damageType', e.target.value as 'Brawn-based' | 'Fixed')}
                className={inputCls}
              >
                <option value="Brawn-based">Brawn-based</option>
                <option value="Fixed">Fixed</option>
              </select>
            </label>
            <NumberField label="Crit" value={f.crit} onChange={(v) => set('crit', v)} />
            <label className={labelCls}>
              Range
              <select value={f.range} onChange={(e) => set('range', e.target.value as NonNullable<ObjectDoc['range']>)} className={inputCls}>
                <option value="Engaged">Engaged</option>
                <option value="Short">Short</option>
                <option value="Medium">Medium</option>
                <option value="Long">Long</option>
                <option value="Extreme">Extreme</option>
              </select>
            </label>
            <label className={labelCls}>
              Skill
              <select value={f.skill} onChange={(e) => set('skill', e.target.value)} className={inputCls}>
                <option value="">None</option>
                {COMBAT_SKILLS.map((skillId) => (
                  <option key={skillId} value={skillId}>{skillDocs.find((d) => d.id === skillId)?.name ?? skillId}</option>
                ))}
              </select>
            </label>
            {VISIBLE_ITEM_FIELDS.repairMaterials && (
              <TextField label="Repair material" value={f.repairMaterial} onChange={(v) => set('repairMaterial', v)} />
            )}
            {VISIBLE_ITEM_FIELDS.craftSkill && (
              <label className={labelCls}>
                Craft skill
                <select
                  value={f.craftSkill}
                  onChange={(e) => set('craftSkill', e.target.value as NonNullable<ObjectDoc['craft_skill']> | '')}
                  className={inputCls}
                >
                  <option value="">None</option>
                  <option value="Metalworking">Metalworking</option>
                  <option value="Leatherworking">Leatherworking</option>
                  <option value="Crafting">Crafting</option>
                </select>
              </label>
            )}
          </div>
        </div>
      )}

      {/* ============ ARMOR ============ */}
      {f.type === 'Armor' && (
        <div className={accentBoxCls}>
          <p className={accentBoxTitleCls}>Armor fields</p>
          <p className="mb-2 text-xs text-fg-muted">This game only has one armor slot — Chest — so it's set automatically.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumberField label="Durability" value={f.durability ?? 3} onChange={(v) => set('durability', v)} />
            <NumberField label="Soak" value={f.soak} onChange={(v) => set('soak', v)} />
            <NumberField label="Melee defense" value={f.meleeDefense} onChange={(v) => set('meleeDefense', v)} />
            <NumberField label="Ranged defense" value={f.rangedDefense} onChange={(v) => set('rangedDefense', v)} />
            {VISIBLE_ITEM_FIELDS.repairMaterials && (
              <TextField label="Repair material" value={f.repairMaterial} onChange={(v) => set('repairMaterial', v)} />
            )}
            {VISIBLE_ITEM_FIELDS.craftSkill && (
              <label className={labelCls}>
                Craft skill
                <select
                  value={f.craftSkill}
                  onChange={(e) => set('craftSkill', e.target.value as NonNullable<ObjectDoc['craft_skill']> | '')}
                  className={inputCls}
                >
                  <option value="">None</option>
                  <option value="Metalworking">Metalworking</option>
                  <option value="Leatherworking">Leatherworking</option>
                  <option value="Crafting">Crafting</option>
                </select>
              </label>
            )}
          </div>
        </div>
      )}

      {/* ============ FOOD / DRINK ============ */}
      {(f.type === 'Food' || f.type === 'Drink') && (
        <div className={accentBoxCls}>
          <p className={accentBoxTitleCls}>{f.type} fields</p>
          {f.type === 'Food' && VISIBLE_ITEM_FIELDS.hungerStacksRemoved && (
            <NumberField label="Hunger stacks removed" value={f.hungerStacksRemoved} onChange={(v) => set('hungerStacksRemoved', v)} />
          )}
          {f.type === 'Drink' && VISIBLE_ITEM_FIELDS.thirstStacksRemoved && (
            <NumberField label="Thirst stacks removed" value={f.thirstStacksRemoved} onChange={(v) => set('thirstStacksRemoved', v)} />
          )}
          {!((f.type === 'Food' && VISIBLE_ITEM_FIELDS.hungerStacksRemoved) || (f.type === 'Drink' && VISIBLE_ITEM_FIELDS.thirstStacksRemoved)) && (
            <p className="text-xs text-fg-muted">
              Hunger/thirst tracking isn't used in this game — the Effect field above covers anything this needs.
            </p>
          )}
        </div>
      )}

      {/* ============ LIGHT SOURCE ============ */}
      {f.type === 'Light Source' && (
        <div className={accentBoxCls}>
          <p className={accentBoxTitleCls}>Light Source fields</p>
          {VISIBLE_ITEM_FIELDS.lightSourceDetails ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <NumberField label="Light boost" value={f.lightStepBoost} onChange={(v) => set('lightStepBoost', v)} />
              <TextField label="Light cap" value={f.lightCap} onChange={(v) => set('lightCap', v)} placeholder="e.g. Well Lit" />
              <NumberField label="Duration" value={f.duration} onChange={(v) => set('duration', v)} />
              <label className={labelCls}>
                Fuel type
                <select
                  value={f.fuelType}
                  onChange={(e) => set('fuelType', e.target.value as NonNullable<ObjectDoc['fuel_type']>)}
                  className={inputCls}
                >
                  <option value="Batteries">Batteries</option>
                  <option value="Gasoline">Gasoline</option>
                  <option value="Single Use">Single Use</option>
                  <option value="None">None</option>
                </select>
              </label>
            </div>
          ) : (
            <p className="text-xs text-fg-muted">
              Mechanical light-source fields aren't used in this game — the Effect field above covers it
              narratively (e.g. "casts a dim glow, 10ft radius").
            </p>
          )}
        </div>
      )}

      {/* ============ BACKROOMS EXTENSION FIELDS ============ */}
      {/* Cross-cutting, not tied to one Object type — a Tool can noclip, a
          Drink can restore sanity, an Armor can have protection_type. The
          whole box only renders if at least one of its flags is on. */}
      {backroomsFieldsVisible && (
        <div className={boxCls}>
          <p className={boxTitleCls}>Backrooms fields</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {VISIBLE_ITEM_FIELDS.noclip && (
              <>
                <CheckboxField label="Noclip enabled" checked={f.noclipEnabled} onChange={(v) => set('noclipEnabled', v)} />
                {f.noclipEnabled && (
                  <>
                    <TextField label="Noclip skill" value={f.noclipSkill} onChange={(v) => set('noclipSkill', v)} />
                    <NumberField label="Noclip difficulty" value={f.noclipDifficulty} onChange={(v) => set('noclipDifficulty', v)} />
                  </>
                )}
              </>
            )}
            {VISIBLE_ITEM_FIELDS.sanity && (
              <>
                <NumberField label="Sanity restored" value={f.sanityRestored} onChange={(v) => set('sanityRestored', v)} />
                <NumberField
                  label="Sanity threshold required"
                  value={f.sanityThresholdRequired}
                  onChange={(v) => set('sanityThresholdRequired', v)}
                />
              </>
            )}
            {VISIBLE_ITEM_FIELDS.timekeeping && (
              <>
                <CheckboxField label="Timekeeping" checked={f.timekeeping} onChange={(v) => set('timekeeping', v)} />
                {f.timekeeping && (
                  <CheckboxField label="Accurate" checked={f.timekeepingAccurate} onChange={(v) => set('timekeepingAccurate', v)} />
                )}
              </>
            )}
            {VISIBLE_ITEM_FIELDS.recoveryRollModifier && (
              <NumberField label="Recovery roll modifier" value={f.recoveryRollModifier} onChange={(v) => set('recoveryRollModifier', v)} />
            )}
          </div>
          {VISIBLE_ITEM_FIELDS.suppressEffect && (
            <label className={`mt-2 block ${labelCls}`}>
              Suppress effect
              <input value={f.suppressEffect} onChange={(e) => set('suppressEffect', e.target.value)} className={inputCls} />
            </label>
          )}
          {VISIBLE_ITEM_FIELDS.protectionType && (
            <div className="mt-2">
              <p className={labelCls}>Protects against</p>
              <div className={checkboxRowCls}>
                {(['Atmospheric', 'Radiation', 'Biological', 'Anomalous', 'Chemical'] as const).map((hazard) => (
                  <label key={hazard} className={checkboxLabelCls}>
                    <input
                      type="checkbox"
                      checked={f.protectionType.includes(hazard)}
                      onChange={(e) =>
                        set('protectionType', e.target.checked ? [...f.protectionType, hazard] : f.protectionType.filter((p) => p !== hazard))
                      }
                    />
                    {hazard}
                  </label>
                ))}
              </div>
            </div>
          )}
          {VISIBLE_ITEM_FIELDS.curesSickness && (
            <label className={`mt-2 block ${labelCls}`}>
              Cures sickness (comma-separated sickness IDs)
              <input value={f.curesSickness} onChange={(e) => set('curesSickness', e.target.value)} className={inputCls} />
            </label>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!f.name.trim()}
          className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
        >
          Create and Add
        </button>
        <button onClick={onCancel} className="rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover">
          Cancel
        </button>
      </div>
    </div>
  )
}