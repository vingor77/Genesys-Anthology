import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  subscribeToCharacter,
  fetchSkills,
  fetchTalents,
  fetchQualities,
  fetchObjects,
  fetchCriticalInjuries,
  fetchStatusPresets,
  fetchUserDisplayName,
  updateCharacter,
  createCustomObject,
  type Character,
  type SkillDoc,
  type TalentDoc,
  type QualityDoc,
  type ObjectDoc,
  type CriticalInjuryDoc,
  type StatusPresetDoc,
  type EquippedSlots,
} from '../lib/characters'
import {
  derivedStats,
  computeTalentBonuses,
  computeEquippedStatBonuses,
  computeInventoryStatBonuses,
  computeInventoryCharacteristicBonuses,
  computeTalentCharacteristicBonuses,
  computeCareerSkills,
  computeEncumbrance,
  encumbranceCapacity,
  totalSpentXP,
  characteristicCost,
  skillCost,
  calculateDicePool,
  getDurabilityState,
  computeStatusBonuses,
  computeEffectiveCharacteristics,
  computeCritTotal,
  STAT_LABELS,
  CHARACTERISTIC_LABELS,
  type Characteristics,
} from '../lib/genesysCalc'
import {
  BBB_CAREERS,
  BBB_SPECIES,
  ACTIVE_SLOTS,
  VISIBLE_SHEET_SECTIONS,
  CURRENCY_LABEL,
  VISIBLE_ITEM_FIELDS,
  BBB_STARTING_CHARACTERISTIC,
  BBB_SKILLS,
  BBB_SKILL_CATEGORY,
  BBB_SKILL_CHARACTERISTIC_OVERRIDES,
  SKILL_CATEGORY_ORDER,
} from '../lib/gameConfigs/bbb'
import { DicePool, DifficultyDie } from '../icons/DiceIcons'
import {
  mergePoolModifier,
  mergeResultModifier,
  type AppliedModifiers,
  type AppliedResultModifiers,
  type ManualToggleOption,
  type DicePoolCounts,
  type RolledDie,
  type RollResult,
} from '../lib/genesysDice'
import StepTalents from '../components/characterCreator/StepTalents'
import CustomItemForm from '../components/sheet/CustomItemForm'
import type { TalentEntry, InventoryEntry, StatusEntry, CriticalInjuryEntry } from '../lib/characters'

// Genesys standard living-character skill cap — distinct from chargen's
// lower cap (2), which only applied during the wizard.
const LIVE_SKILL_RANK_CAP = 5

interface CritRollResult {
  rawRoll: number
  modifier: number
  automaticModifier: number
  finalRoll: number
  doc: CriticalInjuryDoc
  subRoll?: number
  alterationDescription?: string
}

const CRIT_SEVERITY_DICE: Record<string, number> = {
  Easy: 1,
  Average: 2,
  Hard: 3,
  Daunting: 4,
}

const TIERS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5]

// Real Firestore-backed statusPresetDocs replaces what used to be a
// hardcoded, incomplete local list here — one source of truth for
// preset statuses instead of two that could quietly drift apart.

const POOL_MODIFIER_LABELS: Record<string, string> = {
  AddBoost: 'Add Boost',
  RemoveBoost: 'Remove Boost',
  AddSetback: 'Add Setback',
  RemoveSetback: 'Remove Setback',
  UpgradeDifficulty: 'Upgrade Difficulty',
  DowngradeDifficulty: 'Downgrade Difficulty',
}

const RESULT_MODIFIER_LABELS: Record<string, string> = {
  AddSuccess: 'Add Success',
  AddFailure: 'Add Failure',
  AddAdvantage: 'Add Advantage',
  AddThreat: 'Add Threat',
  AddTriumph: 'Add Triumph',
  AddDespair: 'Add Despair',
}

function blankStatusForm(): Omit<StatusEntry, 'id'> {
  return {
    label: '',
    description: '',
    statModifiers: [],
    poolModifiers: [],
    resultModifiers: [],
    perTurnEffect: {},
    remainingRounds: undefined,
    blocksNaturalRecovery: [],
    stacks: undefined,
    isCondition: false,
    permanent: false,
  }
}

// Not exhaustively config-driven yet — only BB&B exists as a playable
// game, so this is the one spot the sheet currently assumes it. Once
// Backrooms has a real config, this becomes a lookup by character.gameType
// instead of a hardcoded import, matching how the rest of the sheet
// already reads from config constants rather than hardcoding BB&B values.
const GAME_CONFIG = {
  careers: BBB_CAREERS,
  species: BBB_SPECIES,
  activeSlots: ACTIVE_SLOTS,
  visibleSections: VISIBLE_SHEET_SECTIONS,
}

const CHARACTERISTIC_ORDER: { key: keyof Characteristics; label: string }[] = [
  { key: 'brawn', label: 'Brawn' },
  { key: 'agility', label: 'Agility' },
  { key: 'intellect', label: 'Intellect' },
  { key: 'cunning', label: 'Cunning' },
  { key: 'willpower', label: 'Willpower' },
  { key: 'presence', label: 'Presence' },
]

// Single shared display for an item's full details — used by both the
// main Inventory panel and the Add Item preview modal. Previously these
// were two separately-maintained blocks of near-identical JSX, which is
const RANGE_ORDER = ['Engaged', 'Short', 'Medium', 'Long', 'Extreme'] as const

// exactly how the "Add Item preview is missing weapon stats" bug
// happened — they'd quietly drifted apart. One component now, used in
// both places, so that can't happen again.
function ItemDetail({
  doc,
  entry,
  qualityDocs,
  skillDocs,
  talentDocs,
  characterTalents,
  brawn,
}: {
  doc: ObjectDoc
  entry?: InventoryEntry
  qualityDocs: QualityDoc[]
  skillDocs: SkillDoc[]
  talentDocs: TalentDoc[]
  characterTalents: TalentEntry[]
  brawn: number
}) {
  const combinedEffect = [doc.effect, doc.bonus_effects].filter(Boolean).join(' ')
  const usesValue = entry?.currentUses ?? doc.uses
  const durabilityValue = entry?.currentDurability ?? doc.durability

  // Momentum's damage bonus — half the wielder's Brawn, rounded up,
  // computed fresh from their current Brawn rather than stored as a
  // static number, per momentumDamage's own definition.
  const hasMomentumDamage = (doc.qualities ?? []).some(
    (q) => qualityDocs.find((qd) => qd.name === q.name)?.momentumDamage
  )
  const momentumBonus = hasMomentumDamage ? Math.ceil(brawn / 2) : 0

  // Eagle Eyes/Good Arm — both Passive, always in effect (no toggle),
  // scoped by whether this weapon carries Momentum (the canonical "is
  // this thrown" signal) via extendsRangeRequires.
  const isThrown = (doc.qualities ?? []).some((q) => q.name === 'Momentum')
  const ownsExtendsRangeTalent = characterTalents.some((t) => {
    const talentDoc = talentDocs.find((td) => td.id === t.id)
    if (!talentDoc?.extendsRange) return false
    if (talentDoc.extendsRangeRequires === 'thrown') return isThrown
    if (talentDoc.extendsRangeRequires === 'nonThrown') return !isThrown
    return true
  })
  const displayedRange =
    doc.type === 'Weapon' && doc.range && ownsExtendsRangeTalent
      ? RANGE_ORDER[Math.min(RANGE_ORDER.length - 1, RANGE_ORDER.indexOf(doc.range) + 1)]
      : doc.range

  const durabilityState =
    (doc.type === 'Weapon' || doc.type === 'Armor') && durabilityValue !== undefined
      ? getDurabilityState(durabilityValue, doc.type)
      : null
  const durabilityColor =
    durabilityState?.label === 'Broken'
      ? '#C0453D'
      : durabilityState?.label === 'Heavily Damaged'
        ? '#D97169'
        : durabilityState?.label === 'Damaged'
          ? '#E3BC80'
          : '#6FCBB9'

  // Everything secondary — logistics/flavor stats that matter but don't
  // need the same visual weight as Damage/Crit/Soak. One flowing line
  // instead of a tall stacked list, so a weapon's full info fits in far
  // less vertical space.
  const secondary: { label: string; value: string }[] = [
    { label: 'Rarity', value: String(doc.rarity) },
    { label: 'Encumbrance', value: String(doc.encumbrance) },
    { label: 'Price', value: String(doc.price ?? 0) },
  ]
  if (doc.slots && doc.slots.length > 0) secondary.push({ label: 'Slots', value: doc.slots.join(', ') })
  if (doc.type === 'Weapon' && displayedRange) secondary.push({ label: 'Range', value: displayedRange })
  if (doc.type === 'Weapon' && doc.skill) {
    secondary.push({ label: 'Skill', value: skillDocs.find((s) => s.id === doc.skill)?.name ?? doc.skill })
  }
  if (usesValue !== undefined) secondary.push({ label: 'Uses', value: `${usesValue} / ${doc.uses}` })
  if (VISIBLE_ITEM_FIELDS.factionExclusive && doc.faction_exclusive) {
    secondary.push({ label: 'Faction', value: doc.faction_exclusive })
  }
  if (VISIBLE_ITEM_FIELDS.craftingMaterial && doc.is_crafting_material) {
    secondary.push({ label: 'Crafting', value: 'Usable as material' })
  }
  if (VISIBLE_ITEM_FIELDS.repairMaterials && (doc.type === 'Weapon' || doc.type === 'Armor') && doc.repair_material) {
    secondary.push({ label: 'Repair material', value: doc.repair_material })
  }
  if (VISIBLE_ITEM_FIELDS.craftSkill && doc.craft_skill) {
    secondary.push({ label: 'Craft skill', value: doc.craft_skill })
  }
  if (VISIBLE_ITEM_FIELDS.craftingMaterial && doc.is_crafting_material) {
    secondary.push({ label: 'Crafting material', value: 'Yes' })
  }
  if (doc.poolModifiers && doc.poolModifiers.length > 0) {
    secondary.push({
      label: 'Pool',
      value: doc.poolModifiers
        .map((m) => `${POOL_MODIFIER_LABELS[m.type] ?? m.type} ${m.amount}${m.appliesTo ? ` (${m.appliesTo})` : ''}${m.autoApply ? '' : ' [manual]'}`)
        .join(', '),
    })
  }
  if (doc.resultModifiers && doc.resultModifiers.length > 0) {
    secondary.push({
      label: 'Result',
      value: doc.resultModifiers
        .map((m) => `${RESULT_MODIFIER_LABELS[m.type] ?? m.type} ${m.amount}${m.appliesTo ? ` (${m.appliesTo})` : ''}${m.autoApply ? '' : ' [manual]'}`)
        .join(', '),
    })
  }
  if (VISIBLE_ITEM_FIELDS.lightSourceDetails && doc.type === 'Light Source') {
    if (doc.light_step_boost !== undefined) secondary.push({ label: 'Light boost', value: String(doc.light_step_boost) })
    if (doc.light_cap) secondary.push({ label: 'Light cap', value: doc.light_cap })
    if (doc.duration !== undefined) secondary.push({ label: 'Duration', value: String(doc.duration) })
    if (doc.fuel_type) secondary.push({ label: 'Fuel', value: doc.fuel_type })
  }
  if (VISIBLE_ITEM_FIELDS.noclip && doc.noclip_enabled) {
    secondary.push({
      label: 'Noclip',
      value: `${doc.noclip_skill ?? ''}${doc.noclip_difficulty !== undefined ? ` (difficulty ${doc.noclip_difficulty})` : ''}`,
    })
  }
  if (VISIBLE_ITEM_FIELDS.sanity && doc.sanity_restored !== undefined) {
    secondary.push({
      label: 'Sanity restored',
      value: `${doc.sanity_restored}${doc.sanity_threshold_required !== undefined ? ` (requires ${doc.sanity_threshold_required}+)` : ''}`,
    })
  }
  if (VISIBLE_ITEM_FIELDS.timekeeping && doc.timekeeping) {
    secondary.push({ label: 'Timekeeping', value: doc.timekeeping_accurate ? 'Accurate' : 'Inaccurate' })
  }
  if (VISIBLE_ITEM_FIELDS.protectionType && doc.protection_type && doc.protection_type.length > 0) {
    secondary.push({ label: 'Protects against', value: doc.protection_type.join(', ') })
  }
  if (VISIBLE_ITEM_FIELDS.curesSickness && doc.cures_sickness && doc.cures_sickness.length > 0) {
    secondary.push({ label: 'Cures', value: doc.cures_sickness.join(', ') })
  }
  if (VISIBLE_ITEM_FIELDS.recoveryRollModifier && doc.recovery_roll_modifier !== undefined) {
    secondary.push({ label: 'Recovery roll modifier', value: String(doc.recovery_roll_modifier) })
  }
  if (VISIBLE_ITEM_FIELDS.suppressEffect && doc.suppress_effect) {
    secondary.push({ label: 'Suppresses', value: doc.suppress_effect })
  }
  if (VISIBLE_ITEM_FIELDS.hungerStacksRemoved && doc.type === 'Food' && doc.hunger_stacks_removed !== undefined) {
    secondary.push({ label: 'Hunger removed', value: String(doc.hunger_stacks_removed) })
  }
  if (VISIBLE_ITEM_FIELDS.thirstStacksRemoved && doc.type === 'Drink' && doc.thirst_stacks_removed !== undefined) {
    secondary.push({ label: 'Thirst removed', value: String(doc.thirst_stacks_removed) })
  }

  return (
    <>
      <p className="font-semibold text-fg">
        {doc.name}
        {doc.is_quest_item && (
          <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent">
            Quest Item
          </span>
        )}
        {entry?.destroyed && <span className="ml-2 text-xs text-warning">Destroyed</span>}
      </p>
      <p className="mt-1 text-sm text-fg-secondary">{doc.description}</p>

      {/* Key stats as colored tiles, matching Vitals' own visual language —
          Damage/Critical/Durability are the numbers worth catching at a
          glance, everything else is secondary. Soak/Defense reuse the
          exact same teal Vitals already uses for the same stats. */}
      {(doc.type === 'Weapon' || doc.type === 'Armor') && (
        <div className="mt-3 flex flex-wrap gap-2">
          {doc.type === 'Weapon' && (
            <>
              <div className="rounded-lg px-3 py-1.5 text-center" style={{ background: 'rgba(192,69,61,0.14)' }}>
                <p className="text-xs" style={{ color: '#C0453D' }}>Damage</p>
                <p className="text-base font-semibold" style={{ color: '#DD7A72' }}>
                  {doc.damageType === 'Brawn-based'
                    ? `Brawn + ${doc.damage}`
                    : momentumBonus > 0
                      ? `${doc.damage} + ${momentumBonus}`
                      : doc.damage}
                </p>
              </div>
              <div className="rounded-lg px-3 py-1.5 text-center" style={{ background: 'rgba(123,94,168,0.14)' }}>
                <p className="text-xs" style={{ color: '#7B5EA8' }}>Critical</p>
                <p className="text-base font-semibold" style={{ color: '#A688C9' }}>{doc.crit}</p>
              </div>
            </>
          )}
          {doc.type === 'Armor' && (
            <>
              <div className="rounded-lg px-3 py-1.5 text-center" style={{ background: 'rgba(111,203,185,0.14)' }}>
                <p className="text-xs" style={{ color: '#6FCBB9' }}>Soak</p>
                <p className="text-base font-semibold" style={{ color: '#8FE0D0' }}>+{doc.soak}</p>
              </div>
              <div className="rounded-lg px-3 py-1.5 text-center" style={{ background: 'rgba(111,203,185,0.14)' }}>
                <p className="text-xs" style={{ color: '#6FCBB9' }}>Defense (M/R)</p>
                <p className="text-base font-semibold" style={{ color: '#8FE0D0' }}>
                  {doc.meleeDefense}/{doc.rangedDefense}
                </p>
              </div>
            </>
          )}
          {durabilityValue !== undefined && (
            <div className="rounded-lg px-3 py-1.5 text-center" style={{ background: `${durabilityColor}24` }}>
              <p className="text-xs" style={{ color: durabilityColor }}>Durability</p>
              <p className="text-base font-semibold" style={{ color: durabilityColor }}>
                {durabilityValue}/{doc.durability}
                {durabilityState && <span className="ml-1 text-xs font-normal">({durabilityState.label})</span>}
              </p>
            </div>
          )}
        </div>
      )}

      {durabilityState && durabilityState.label !== 'Intact' && (
        <p className="mt-2 text-xs" style={{ color: durabilityColor }}>
          {durabilityState.effect}
        </p>
      )}

      {secondary.length > 0 && (
        <p className="mt-2 text-xs text-fg-muted">
          {secondary.map((s, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {s.label}: {s.value}
            </span>
          ))}
        </p>
      )}

      {doc.statModifiers && doc.statModifiers.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Stat Modifiers</p>
          <p className="text-sm text-fg">
            {doc.statModifiers.map((m, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {STAT_LABELS[m.stat] ?? CHARACTERISTIC_LABELS[m.stat] ?? m.stat} {m.amount > 0 ? '+' : ''}
                {m.amount}
                {m.autoApply ? (
                  <span className="text-xs text-fg-muted"> (auto)</span>
                ) : (
                  <span className={`text-xs ${entry?.applied ? 'text-accent' : 'text-fg-muted'}`}>
                    {' '}
                    ({entry?.applied ? 'applied' : 'not applied'})
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>
      )}

      {combinedEffect && (
        <div className="mt-3 rounded border-l-4 border-accent bg-accent/10 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Effect</p>
          <p className="text-sm text-fg">{combinedEffect}</p>
        </div>
      )}

      {doc.qualities && doc.qualities.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Traits</p>
          <div className="mt-1 space-y-1.5">
            {doc.qualities.map((q) => (
              <p key={q.name} className="text-sm text-fg">
                <span className="font-medium">{q.name}</span>
                {q.rank !== undefined ? ` ${q.rank}` : ''} —{' '}
                {qualityDocs.find((qd) => qd.name === q.name)?.rules ?? ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {doc.situational && (
        <p className="mt-3 text-sm text-fg">
          <span className="text-fg-muted">If {doc.situational.condition.toLowerCase()}:</span>{' '}
          {doc.situational.effect}
        </p>
      )}
    </>
  )
}

function SheetSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <span className="text-fg-muted">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  )
}

// onRoll is optional and undefined by default — the standalone sheet
// route never passes it, so no Roll buttons render there at all. Only
// the future Play page (which embeds this same component) provides it,
// turning the same skill/weapon UI into a click-to-roll trigger without
// needing a second, duplicated rendering of the skill/weapon lists.
export default function CharacterSheet({
  onRoll,
  encounterActive = false,
}: {
  onRoll?: (
    pool: DicePoolCounts,
    label: string,
    characterName: string,
    appliedModifiers?: AppliedModifiers,
    appliedResultModifiers?: AppliedResultModifiers,
    manualToggleOptions?: ManualToggleOption[],
    onResolved?: (dice: RolledDie[], result: RollResult, strainSpent: number) => void
  ) => void
  // Whether an encounter is currently active, per the (separately owned)
  // initiative tracker — needed for Berserk's requiresActiveEncounter
  // gate. Defaults to false so the standalone /characters/:id sheet
  // route (no tracker mounted at all) just always shows these Use
  // buttons as disabled rather than crashing on a missing prop.
  encounterActive?: boolean
} = {}) {
  const { characterId } = useParams()
  const { user } = useAuth()

  const [character, setCharacter] = useState<Character | null | undefined>(undefined)
  const [skillDocs, setSkillDocs] = useState<SkillDoc[] | null>(null)
  const [talentDocs, setTalentDocs] = useState<TalentDoc[] | null>(null)
  const [qualityDocs, setQualityDocs] = useState<QualityDoc[] | null>(null)
  const [objectDocs, setObjectDocs] = useState<ObjectDoc[] | null>(null)
  const [criticalInjuryDocs, setCriticalInjuryDocs] = useState<CriticalInjuryDoc[] | null>(null)
  const [statusPresetDocs, setStatusPresetDocs] = useState<StatusPresetDoc[] | null>(null)
  const [playerDisplayName, setPlayerDisplayName] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [showTalentModal, setShowTalentModal] = useState(false)
  const [viewingOwnedTalentId, setViewingOwnedTalentId] = useState<string | null>(null)
  const [talentStrainSpendInput, setTalentStrainSpendInput] = useState(0)
  const [viewingInventoryIndex, setViewingInventoryIndex] = useState<number | null>(null)
  // slotMode 'any' with 2+ eligible slots — asks which one, no confirmation
  // needed since replacing a single occupied slot has always been silent.
  const [equipChoice, setEquipChoice] = useState<{ entry: InventoryEntry; slots: string[] } | null>(null)
  // slotMode 'all' — only populated when equipping would actually displace
  // something; if nothing's in the way, equip happens immediately with no prompt.
  const [equipConfirm, setEquipConfirm] = useState<{
    entry: InventoryEntry
    slots: string[]
    displaced: { slot: string; name: string }[]
  } | null>(null)
  const [showAddCritModal, setShowAddCritModal] = useState(false)
  const [critModifierInput, setCritModifierInput] = useState('')
  const [critRollResult, setCritRollResult] = useState<CritRollResult | null>(null)
  const [viewingCritIndex, setViewingCritIndex] = useState<number | null>(null)
  const [showAddStatusModal, setShowAddStatusModal] = useState(false)
  const [statusForm, setStatusForm] = useState(blankStatusForm())
  const [viewingStatusId, setViewingStatusId] = useState<string | null>(null)
  const [confirmingRemoveStatusId, setConfirmingRemoveStatusId] = useState<string | null>(null)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [addItemQuery, setAddItemQuery] = useState('')
  const [addItemTypeFilter, setAddItemTypeFilter] = useState<string>('All')
  const [addItemSort, setAddItemSort] = useState<'name' | 'rarity' | 'encumbrance'>('name')
  const [showAddItemFilters, setShowAddItemFilters] = useState(false)
  const [viewingAddItemId, setViewingAddItemId] = useState<string | null>(null)
  const [showCustomItemForm, setShowCustomItemForm] = useState(false)

  useEffect(() => {
    if (!characterId) return
    return subscribeToCharacter(characterId, setCharacter)
  }, [characterId])

  useEffect(() => {
    if (!character) return
    fetchUserDisplayName(character.uid).then(setPlayerDisplayName)
  }, [character?.uid])

  useEffect(() => {
    fetchSkills().then(setSkillDocs)
    fetchTalents().then(setTalentDocs)
    fetchQualities().then(setQualityDocs)
    fetchCriticalInjuries().then(setCriticalInjuryDocs)
    fetchStatusPresets().then(setStatusPresetDocs)
  }, [])

  // Deliberately separate from the effect above — this one needs
  // character.sessionId, which isn't known until the character has
  // loaded. Re-running when sessionId changes also means the session's
  // custom items are picked up if this component ever mounts before the
  // character document arrives.
  useEffect(() => {
    if (!character) return
    fetchObjects(character.sessionId).then(setObjectDocs)
  }, [character?.sessionId])

  if (character === undefined) {
    return <p className="text-fg-secondary">Loading character…</p>
  }
  if (character === null) {
    return <p className="text-fg-secondary">This character doesn't exist, or you don't have access to it.</p>
  }
  if (character.gameType !== 'bbb') {
    return <p className="text-fg-secondary">The sheet for {character.gameType} isn't built yet — only BB&B is supported right now.</p>
  }
  if (!skillDocs || !talentDocs || !qualityDocs || !objectDocs || !criticalInjuryDocs || !statusPresetDocs) {
    return <p className="text-fg-secondary">Loading game data…</p>
  }

  const canEdit = character.uid === user?.uid
  const objectMap = new Map(objectDocs.map((o) => [o.id, o]))
  const career = GAME_CONFIG.careers.find((c) => c.name === character.career.name)

  const talentBonuses = computeTalentBonuses(character.talents, talentDocs)
  const equippedBonuses = computeEquippedStatBonuses(character.equippedSlots, character.inventory, objectMap, qualityDocs)
  const inventoryBonuses = computeInventoryStatBonuses(character.inventory, objectMap)
  const inventoryCharacteristicBonuses = computeInventoryCharacteristicBonuses(character.inventory, objectMap)
  const talentCharacteristicBonuses = computeTalentCharacteristicBonuses(character.talents, talentDocs)
  const statusBonuses = computeStatusBonuses(character.status)
  const effectiveCharacteristics = computeEffectiveCharacteristics(
    character.characteristics,
    character.status,
    // Merge both overlay sources into one map before passing in — Dedication
    // (talent) and an item like a ring of +1 Agility (inventory) both need
    // to land here, and computeEffectiveCharacteristics only accepts one
    // combined map, not a separate parameter per source.
    Object.fromEntries(
      (['brawn', 'agility', 'intellect', 'cunning', 'willpower', 'presence'] as const)
        .map((key) => [key, (inventoryCharacteristicBonuses[key] ?? 0) + (talentCharacteristicBonuses[key] ?? 0)])
        .filter(([, amount]) => amount !== 0)
    )
  )
  const stats = derivedStats(effectiveCharacteristics, {
    soak: talentBonuses.soak + equippedBonuses.soak + inventoryBonuses.soak + statusBonuses.soak,
    meleeDefense:
      talentBonuses.meleeDefense + equippedBonuses.meleeDefense + inventoryBonuses.meleeDefense + statusBonuses.meleeDefense,
    rangedDefense:
      talentBonuses.rangedDefense + equippedBonuses.rangedDefense + inventoryBonuses.rangedDefense + statusBonuses.rangedDefense,
    woundThreshold:
      talentBonuses.woundThreshold + equippedBonuses.woundThreshold + inventoryBonuses.woundThreshold + statusBonuses.woundThreshold,
    strainThreshold:
      talentBonuses.strainThreshold + equippedBonuses.strainThreshold + inventoryBonuses.strainThreshold + statusBonuses.strainThreshold,
  })

  const careerSkillNames = computeCareerSkills(career?.chosenSkills.pool ?? [], character.talents, talentDocs)

  // appliesTo resolution, per the schema's own documented convention:
  // an exact skill id, a characteristic name (checked against this
  // skill's actual governing characteristic, including BBB's own
  // override), or a skill category name. Absent appliesTo means unscoped
  // — applies regardless of what's being rolled.
  function poolModifierApplies(appliesTo: string | undefined, skillId: string, doc: SkillDoc): boolean {
    if (!appliesTo) return true
    if (appliesTo === skillId) return true
    const characteristic = BBB_SKILL_CHARACTERISTIC_OVERRIDES[skillId] ?? doc.characteristic
    if (appliesTo === characteristic) return true
    if (appliesTo === doc.category) return true
    return false
  }

  // Gathers every Add/RemoveBoost and Add/RemoveSetback modifier that
  // should silently shape a pool before rolling — equipped items (their
  // own direct poolModifiers, plus each carried quality's own, scaled by
  // that specific item's own rank for a ranked quality like Accurate),
  // owned talents (autoApply only — a manual-toggle talent poolModifier
  // has no UI to turn on yet, so it's skipped rather than treated as
  // silently always-on), and active statuses (always, since presence on
  // the sheet already means active).
  //
  // UpgradeDifficulty/DowngradeDifficulty are deliberately NOT gathered
  // here — there's no baseline difficulty in this pool to act on (that's
  // set by the GM at the table, via the roller's own difficulty
  // controls), so those stay a manual action in the roller itself rather
  // than something this function could apply blindly.
  function gatherPoolModifiers(
    skillId: string,
    weaponEntryId?: string
  ): {
    applied: AppliedModifiers
    manualToggleOptions: ManualToggleOption[]
    pendingInjuryIds: string[]
  } {
    const doc = skillDocs!.find((d) => d.id === skillId)
    if (!doc) return { applied: {}, manualToggleOptions: [], pendingInjuryIds: [] }

    let applied: AppliedModifiers = {}
    const manualToggleOptions: ManualToggleOption[] = []
    const pendingInjuryIds: string[] = []

    function addAuto(type: string, amount: number, appliesTo: string | undefined) {
      if (!poolModifierApplies(appliesTo, skillId, doc!)) return
      applied = mergePoolModifier(applied, type, amount)
    }
    function addManualOption(
      id: string,
      label: string,
      type: string,
      amount: number,
      appliesTo: string | undefined,
      variableCost?: ManualToggleOption['variableCost']
    ) {
      if (!poolModifierApplies(appliesTo, skillId, doc!)) return
      manualToggleOptions.push({ id, label, kind: 'pool', type, amount, variableCost })
    }

    // Slot-less items (a Mundane gadget like a charm bracelet) can never
    // be "equipped" at all, so requiring equipped-status for them would
    // mean their modifiers could never fire — they contribute from mere
    // possession instead, matching how carried statModifiers items
    // already work (computeInventoryStatBonuses doesn't require
    // equipping either). Slotted items still require being equipped.
    //
    // For an equipped WEAPON specifically, its own direct poolModifiers
    // still apply broadly (a passive aura, say), but its QUALITIES'
    // poolModifiers only apply when weaponEntryId matches — Accurate is
    // "this weapon's own attacks get a Boost," not "any check while this
    // weapon happens to be equipped." Non-weapon slotted items (Armor)
    // don't have this restriction; their qualities apply broadly, same
    // as before (Reinforced isn't scoped to a specific attack).
    const equippedIds = new Set(Object.values(character!.equippedSlots).filter((v): v is string => v !== null))
    for (const entry of character!.inventory) {
      if (entry.destroyed) continue
      const objDoc = objectMap.get(entry.objectId)
      if (!objDoc) continue

      const isSlotless = !objDoc.slots || objDoc.slots.length === 0
      const isEquipped = equippedIds.has(entry.id)
      if (!isSlotless && !isEquipped) continue

      objDoc.poolModifiers?.forEach((m, i) => {
        if (m.autoApply) addAuto(m.type, m.amount, m.appliesTo)
        else addManualOption(`item:${entry.id}:pool:${i}`, `${objDoc.name}: ${POOL_MODIFIER_LABELS[m.type] ?? m.type} ${m.amount}`, m.type, m.amount, m.appliesTo)
      })

      const qualitiesAreWeaponScoped = objDoc.type === 'Weapon'
      if (qualitiesAreWeaponScoped && entry.id !== weaponEntryId) continue
      for (const q of objDoc.qualities ?? []) {
        const qualityDoc = qualityDocs!.find((qd) => qd.name === q.name)
        qualityDoc?.poolModifiers?.forEach((m, i) => {
          const amount = qualityDoc.ranked ? m.amount * (q.rank ?? 1) : m.amount
          if (m.autoApply) addAuto(m.type, amount, m.appliesTo)
          else addManualOption(`itemquality:${entry.id}:${q.name}:${i}`, `${q.name} (${objDoc.name}): ${POOL_MODIFIER_LABELS[m.type] ?? m.type} ${amount}`, m.type, amount, m.appliesTo)
        })
      }
    }

    // Cumbersome/Unwieldy — always applied when the deficiency exists,
    // not a toggle at all (falling short of the requirement isn't
    // optional). Still scoped to weaponEntryId, same reasoning as before
    // — only relevant to a check made with this specific weapon.
    if (weaponEntryId) {
      const weaponEntry = character!.inventory.find((e) => e.id === weaponEntryId)
      const weaponDoc = weaponEntry ? objectMap.get(weaponEntry.objectId) : undefined
      for (const q of weaponDoc?.qualities ?? []) {
        const qualityDoc = qualityDocs!.find((qd) => qd.name === q.name)
        if (!qualityDoc?.requirement) continue
        const { characteristic, penaltyPerPoint } = qualityDoc.requirement
        const rating = q.rank ?? 1
        const have = effectiveCharacteristics[characteristic as keyof Characteristics] ?? 0
        const deficiency = Math.max(0, rating - have)
        if (deficiency > 0) addAuto(penaltyPerPoint.type, penaltyPerPoint.amount * deficiency, undefined)
      }
    }

    for (const t of character!.talents) {
      const talentDoc = talentDocs!.find((td) => td.id === t.id)
      talentDoc?.poolModifiers?.forEach((m, i) => {
        const amount = m.scalesWithRank ? m.amount * t.rank : m.amount
        if (m.autoApply) {
          addAuto(m.type, amount, m.appliesTo)
          return
        }
        const variableCost: ManualToggleOption['variableCost'] = m.costsStrainEqualToAmount
          ? { resource: 'strain' }
          : m.addsThreatEqualToAmount
            ? { resource: 'threat' }
            : undefined
        const label = variableCost
          ? `${talentDoc.name}: up to ${amount} ${POOL_MODIFIER_LABELS[m.type] ?? m.type} (costs equal ${variableCost.resource})`
          : `${talentDoc.name}: ${POOL_MODIFIER_LABELS[m.type] ?? m.type} ${amount}`
        addManualOption(`talent:${t.id}:${t.rank}:pool:${i}`, label, m.type, amount, m.appliesTo, variableCost)
      })
    }

    // Active statuses — presence on the sheet already means active,
    // never a toggle.
    for (const s of character!.status) {
      for (const m of s.poolModifiers ?? []) {
        const amount = m.scalesWithStacks ? m.amount * (s.stacks ?? 1) : m.amount
        addAuto(m.type, amount, m.appliesTo)
      }
    }

    // Pending one-time Critical Injury effects (Stinger, Off-Balance) —
    // deliberately unscoped, bypassing poolModifierApplies entirely,
    // since "your next check" in the book's own text means literally any
    // check, not one tied to a specific skill/characteristic/category.
    // Only gathered while unconsumed; the caller marks pendingInjuryIds
    // consumed once the roll this was gathered for actually resolves, so
    // the effect fires exactly once rather than reapplying forever.
    // Always applied — not a toggle, this is what actually happened.
    for (const entry of character!.criticalInjuries) {
      if (entry.oneTimeEffectConsumed) continue
      const injuryDoc = criticalInjuryDocs!.find((d) => d.id === entry.injuryId)
      if (!injuryDoc?.pendingPoolModifier) continue
      const { type, amount } = injuryDoc.pendingPoolModifier
      applied = mergePoolModifier(applied, type, amount)
      pendingInjuryIds.push(entry.id)
    }

    return { applied, manualToggleOptions, pendingInjuryIds }
  }

  // Same characteristic-resolution logic the Skills section already
  // computes inline per row — pulled out so the weapon Roll Attack
  // button (a different part of the sheet) can compute the identical
  // pool for a weapon's governing skill without duplicating it.
  //
  // Returns basePool (just ability/proficiency — the fixed starting
  // point) and appliedModifiers (boost/setback/difficulty effects)
  // SEPARATELY rather than baked into one static pool. This matters:
  // the roller re-combines them fresh every time the player changes
  // anything, so a persistent effect like Frazzled's "-999 boost" can't
  // be undone by manually clicking +1 Boost afterward, the way baking
  // everything into one pool up front would have allowed.
  // Mirror of gatherPoolModifiers, but for resultModifiers (Superior's
  // automatic Advantage, Inferior's automatic Threat, Berserk's
  // automatic Success+Advantage) — these act on the ROLLED RESULT, a
  // different pipeline stage than pool-building, so they're gathered and
  // applied separately rather than folded into the same function. Only
  // autoApply sources are gathered here, same reasoning as poolModifiers
  // — a manual-toggle resultModifier has no UI to turn on yet.
  function gatherResultModifiers(
    skillId: string,
    weaponEntryId?: string
  ): { applied: AppliedResultModifiers; manualToggleOptions: ManualToggleOption[] } {
    const doc = skillDocs!.find((d) => d.id === skillId)
    if (!doc) return { applied: {}, manualToggleOptions: [] }

    let applied: AppliedResultModifiers = {}
    const manualToggleOptions: ManualToggleOption[] = []

    function addAuto(type: string, amount: number, appliesTo: string | undefined) {
      if (!poolModifierApplies(appliesTo, skillId, doc!)) return
      applied = mergeResultModifier(applied, type, amount)
    }
    function addManualOption(
      id: string,
      label: string,
      type: string,
      amount: number,
      appliesTo: string | undefined,
      variableCost?: ManualToggleOption['variableCost']
    ) {
      if (!poolModifierApplies(appliesTo, skillId, doc!)) return
      manualToggleOptions.push({ id, label, kind: 'result', type, amount, variableCost })
    }

    // Same reasoning as gatherPoolModifiers' version of this loop — see
    // its comment for the full explanation. Slot-less items contribute
    // regardless of equip state; equipped weapons' own qualities are
    // scoped to weaponEntryId so Superior on a weapon only boosts checks
    // made with that weapon, not every roll while it happens to be equipped.
    const equippedIds = new Set(Object.values(character!.equippedSlots).filter((v): v is string => v !== null))
    for (const entry of character!.inventory) {
      if (entry.destroyed) continue
      const objDoc = objectMap.get(entry.objectId)
      if (!objDoc) continue

      const isSlotless = !objDoc.slots || objDoc.slots.length === 0
      const isEquipped = equippedIds.has(entry.id)
      if (!isSlotless && !isEquipped) continue

      objDoc.resultModifiers?.forEach((m, i) => {
        if (m.autoApply) addAuto(m.type, m.amount, m.appliesTo)
        else addManualOption(`item:${entry.id}:result:${i}`, `${objDoc.name}: ${RESULT_MODIFIER_LABELS[m.type] ?? m.type} ${m.amount}`, m.type, m.amount, m.appliesTo)
      })

      const qualitiesAreWeaponScoped = objDoc.type === 'Weapon'
      if (qualitiesAreWeaponScoped && entry.id !== weaponEntryId) continue
      for (const q of objDoc.qualities ?? []) {
        const qualityDoc = qualityDocs!.find((qd) => qd.name === q.name)
        qualityDoc?.resultModifiers?.forEach((m, i) => {
          const amount = qualityDoc.ranked ? m.amount * (q.rank ?? 1) : m.amount
          if (m.autoApply) addAuto(m.type, amount, m.appliesTo)
          else addManualOption(`itemquality:${entry.id}:${q.name}:result:${i}`, `${q.name} (${objDoc.name}): ${RESULT_MODIFIER_LABELS[m.type] ?? m.type} ${amount}`, m.type, amount, m.appliesTo)
        })
      }
    }

    for (const t of character!.talents) {
      const talentDoc = talentDocs!.find((td) => td.id === t.id)
      talentDoc?.resultModifiers?.forEach((m, i) => {
        const amount = m.scalesWithRank ? m.amount * t.rank : m.amount
        if (m.autoApply) {
          addAuto(m.type, amount, m.appliesTo)
          return
        }
        const variableCost: ManualToggleOption['variableCost'] = m.costsStrainEqualToAmount
          ? { resource: 'strain' }
          : m.addsThreatEqualToAmount
            ? { resource: 'threat' }
            : undefined
        const label = variableCost
          ? `${talentDoc.name}: up to ${amount} ${RESULT_MODIFIER_LABELS[m.type] ?? m.type} (costs equal ${variableCost.resource})`
          : `${talentDoc.name}: ${RESULT_MODIFIER_LABELS[m.type] ?? m.type} ${amount}`
        addManualOption(`talent:${t.id}:${t.rank}:result:${i}`, label, m.type, amount, m.appliesTo, variableCost)
      })
    }

    // Active statuses — presence on the sheet already means active,
    // never a toggle.
    for (const s of character!.status) {
      for (const m of s.resultModifiers ?? []) {
        addAuto(m.type, m.amount, m.appliesTo)
      }
    }

    return { applied, manualToggleOptions }
  }

  function poolForSkill(
    skillId: string,
    weaponEntryId?: string
  ): {
    basePool: DicePoolCounts
    appliedModifiers: AppliedModifiers
    appliedResultModifiers: AppliedResultModifiers
    manualToggleOptions: ManualToggleOption[]
    pendingInjuryIds: string[]
  } | null {
    const doc = skillDocs!.find((d) => d.id === skillId)
    if (!doc) return null
    const rank = character!.skills.find((s) => s.name === skillId)?.rank ?? 0
    const characteristic = (BBB_SKILL_CHARACTERISTIC_OVERRIDES[skillId] ?? doc.characteristic) as keyof Characteristics
    const basePool = calculateDicePool(effectiveCharacteristics[characteristic], rank)
    const poolResult = gatherPoolModifiers(skillId, weaponEntryId)
    const resultResult = gatherResultModifiers(skillId, weaponEntryId)

    return {
      basePool,
      appliedModifiers: poolResult.applied,
      appliedResultModifiers: resultResult.applied,
      manualToggleOptions: [...poolResult.manualToggleOptions, ...resultResult.manualToggleOptions],
      pendingInjuryIds: poolResult.pendingInjuryIds,
    }
  }

  // Marks any pending one-time Critical Injury effects (Stinger,
  // Off-Balance) as consumed. Called from PlayPage once the roll this
  // was gathered for actually resolves — passed along as part of what
  // onRoll hands to the parent below, rather than firing the moment the
  // roll button is clicked, so canceling out of the roller without
  // actually rolling doesn't burn the effect for nothing.
  function consumePendingInjuryEffects(pendingInjuryIds: string[]) {
    if (pendingInjuryIds.length === 0) return
    update({
      criticalInjuries: character!.criticalInjuries.map((e) =>
        pendingInjuryIds.includes(e.id) ? { ...e, oneTimeEffectConsumed: true } : e
      ),
    })
  }

  // The one "Use" handler for every talent with a manual mechanical
  // effect — manualHeal, manualStrainSpend, or flat strainCost. Only one
  // of those three is ever set on a given talent, so only one branch
  // below actually does anything for any specific call; strainOverride
  // is only meaningful for manualStrainSpend, where the amount is the
  // player's own choice rather than fixed by the document.
  function useTalentEntry(t: TalentEntry, doc: TalentDoc, strainOverride?: number) {
    const updates: Partial<Character> = {}

    if (doc.limit !== 'None') {
      const maxUses = doc.usesPerPeriod ?? 1
      const current = t.usesRemaining ?? maxUses
      if (current <= 0) return
      updates.talents = character!.talents.map((x) =>
        x.id === t.id && x.rank === t.rank ? { ...x, usesRemaining: current - 1 } : x
      )
    }

    if (doc.manualHeal) {
      const amount = doc.scalesWithRank ? doc.manualHeal.amount * t.rank : doc.manualHeal.amount
      if (doc.manualHeal.stat === 'wounds') {
        updates.currentWounds = Math.max(0, character!.currentWounds - amount)
      } else {
        updates.currentStrain = Math.max(0, character!.currentStrain - amount)
      }
    } else if (doc.manualStrainSpend && strainOverride !== undefined) {
      updates.currentStrain = Math.min(stats.strainThreshold, character!.currentStrain + strainOverride)
    } else if (doc.strainCost) {
      updates.currentStrain = Math.min(stats.strainThreshold, character!.currentStrain + doc.strainCost)
    } else if (doc.appliesStatusId) {
      // Creates a real Status from the referenced preset, same safe
      // construction as Critical Injuries' version of this (only assign
      // a key when the preset actually has a value — Firestore rejects
      // the whole write if anything anywhere is literally undefined).
      // sourceTalentId ties it to this talent rather than an injury.
      const preset = statusPresetDocs!.find((p) => p.id === doc.appliesStatusId)
      if (preset) {
        const newStatus: StatusEntry = { id: crypto.randomUUID(), label: preset.label, sourceTalentId: t.id }
        if (preset.statModifiers) newStatus.statModifiers = preset.statModifiers
        if (preset.poolModifiers) newStatus.poolModifiers = preset.poolModifiers
        if (preset.resultModifiers) newStatus.resultModifiers = preset.resultModifiers
        if (preset.perTurnEffect) newStatus.perTurnEffect = preset.perTurnEffect
        if (preset.tickTiming) newStatus.tickTiming = preset.tickTiming
        if (preset.remainingRounds !== undefined) newStatus.remainingRounds = preset.remainingRounds
        if (preset.blocksNaturalRecovery) newStatus.blocksNaturalRecovery = preset.blocksNaturalRecovery
        if (preset.suppressesInjuryEffects) newStatus.suppressesInjuryEffects = true
        if (preset.criticalInjuryRollModifier !== undefined) {
          newStatus.criticalInjuryRollModifier = preset.criticalInjuryRollModifier
        }
        if (preset.removedOnEncounterEnd) newStatus.removedOnEncounterEnd = true
        if (preset.blocksSkillIds) newStatus.blocksSkillIds = preset.blocksSkillIds
        if (preset.onRemoveEffect) newStatus.onRemoveEffect = preset.onRemoveEffect
        if (preset.stackable) newStatus.stacks = 1
        if (preset.isCondition) newStatus.isCondition = true
        updates.status = [...character!.status, newStatus]
      }
    }

    update(updates)
    setTalentStrainSpendInput(0)
  }

  const spentXP = totalSpentXP(
    character.characteristics,
    character.skills,
    careerSkillNames,
    character.career.chosenSkills,
    character.talents
  )
  const availableXP = character.totalXP - spentXP - (character.permanentXPLoss ?? 0)

  const xpInvalid = character.totalXP < spentXP
  const woundsRecoveryBlocked = character.status.some((s) => s.blocksNaturalRecovery?.includes('wounds'))
  const strainRecoveryBlocked = character.status.some((s) => s.blocksNaturalRecovery?.includes('strain'))

  const currentEncumbrance = computeEncumbrance(character.inventory, character.equippedSlots, objectMap)
  const capacity = encumbranceCapacity(character.characteristics.brawn)

  function update(updates: Partial<Character>) {
    if (!characterId) return
    updateCharacter(characterId, updates)
  }

  // blocksNaturalRecovery only ever comes from an active Status entry —
  // nothing else sets it. Lowering wounds/strain (recovering) is refused
  // outright while a blocking status is active; raising them (taking
  // more damage) is never affected.
  function applyVitalChange(field: 'currentWounds' | 'currentStrain', rawInput: string) {
    const newValue = Number(rawInput) || 0
    // Wounds can run over threshold (that's the "at death's door" state
    // in Genesys) but caps at 2x — beyond that the character is dead, so
    // there's nothing left to track. Strain has no equivalent overrun
    // state — it hard-caps at exactly the threshold. These are the only
    // enforced limits. Whether a status blocks recovery is purely
    // informational (a static warning), never enforced or tracked — the
    // player/DM can always freely act, same as choosing to ignore any
    // other rule at the table.
    const ceiling = field === 'currentWounds' ? stats.woundThreshold * 2 : stats.strainThreshold
    const clamped = Math.min(ceiling, Math.max(0, newValue))
    update({ [field]: clamped })
  }

  function adjustCharacteristic(key: keyof Characteristics, delta: 1 | -1) {
    const current = character!.characteristics[key]
    const next = current + delta
    if (next < BBB_STARTING_CHARACTERISTIC || next > 6) return
    if (delta === 1) {
      const cost = characteristicCost(next, BBB_STARTING_CHARACTERISTIC) - characteristicCost(current, BBB_STARTING_CHARACTERISTIC)
      if (cost > availableXP) return
    }
    update({ characteristics: { ...character!.characteristics, [key]: next } })
  }

  // Figures out what's currently occupying a set of target slots, keyed
  // by entry id so a two-handed item spanning two of those slots only
  // gets listed once rather than appearing as two separate displacements.
  function getDisplacedItems(slots: string[], excludeEntryId: string): { slot: string; name: string }[] {
    const seen = new Set<string>()
    const result: { slot: string; name: string }[] = []
    for (const slot of slots) {
      const occupantId = character!.equippedSlots[slot as keyof EquippedSlots]
      if (!occupantId || occupantId === excludeEntryId || seen.has(occupantId)) continue
      seen.add(occupantId)
      const occupantEntry = character!.inventory.find((e) => e.id === occupantId)
      const occupantDoc = occupantEntry ? objectMap.get(occupantEntry.objectId) : undefined
      result.push({ slot, name: occupantDoc?.name ?? 'Unknown item' })
    }
    return result
  }

  // The actual write, once we know exactly which slot(s) to fill and that
  // any confirmation needed has already happened. Clears every slot any
  // displaced entry occupies (not just the one being overwritten) — using
  // unequipItem's own logic inline, so a two-handed item being bumped out
  // never ends up half-equipped in whichever slot wasn't touched directly.
  function performEquip(entry: InventoryEntry, slots: string[]) {
    const newSlots = { ...character!.equippedSlots }
    for (const slot of slots) {
      const occupantId = newSlots[slot as keyof EquippedSlots]
      if (occupantId && occupantId !== entry.id) {
        for (const s of Object.keys(newSlots)) {
          if (newSlots[s as keyof EquippedSlots] === occupantId) newSlots[s as keyof EquippedSlots] = null
        }
      }
    }
    for (const slot of slots) {
      newSlots[slot as keyof EquippedSlots] = entry.id
    }
    update({ equippedSlots: newSlots })
  }

  function equipItem(entry: InventoryEntry) {
    const doc = objectMap.get(entry.objectId)
    const eligibleSlots = (doc?.slots ?? []).filter((s) => (GAME_CONFIG.activeSlots as readonly string[]).includes(s))
    if (eligibleSlots.length === 0) return

    // Single eligible slot — no ambiguity, no choice, no confirmation.
    // Matches the behavior this always had before slotMode existed.
    if (eligibleSlots.length === 1) {
      performEquip(entry, eligibleSlots)
      return
    }

    if (doc?.slotMode === 'all') {
      const displaced = getDisplacedItems(eligibleSlots, entry.id)
      if (displaced.length > 0) {
        setEquipConfirm({ entry, slots: eligibleSlots, displaced })
      } else {
        performEquip(entry, eligibleSlots)
      }
      return
    }

    // 'any' (including undefined — the safer default for 2+ slots)
    setEquipChoice({ entry, slots: eligibleSlots })
  }

  function unequipItem(entryId: string) {
    const newSlots = { ...character!.equippedSlots }
    for (const slot of Object.keys(newSlots)) {
      if (newSlots[slot as keyof typeof newSlots] === entryId) {
        newSlots[slot as keyof typeof newSlots] = null
      }
    }
    update({ equippedSlots: newSlots })
  }

  function damageItem(index: number) {
    const entry = character!.inventory[index]
    if (entry.currentDurability === undefined) return
    const newDurability = Math.max(0, entry.currentDurability - 1)
    const newInventory = character!.inventory.map((e, i) =>
      i === index ? { ...e, currentDurability: newDurability } : e
    )
    update({ inventory: newInventory })
    // Broken (0) is unusable — auto-unequip immediately, matching the
    // rule directly rather than leaving a broken item looking equipped.
    if (newDurability === 0) unequipItem(entry.id)
  }

  function repairItem(index: number) {
    const entry = character!.inventory[index]
    const doc = objectMap.get(entry.objectId)
    if (entry.currentDurability === undefined || doc?.durability === undefined) return
    const newInventory = character!.inventory.map((e, i) =>
      i === index ? { ...e, currentDurability: Math.min(doc.durability!, e.currentDurability! + 1) } : e
    )
    update({ inventory: newInventory })
  }

  // Only meaningful when the item's own usesCannotRestore flag allows it —
  // most consumables can be narratively restocked, but a genuine one-and-
  // done item shouldn't have this option at all.
  function restoreUses(index: number) {
    const entry = character!.inventory[index]
    const doc = objectMap.get(entry.objectId)
    if (doc?.uses === undefined || doc.usesCannotRestore) return
    const newInventory = character!.inventory.map((e, i) => (i === index ? { ...e, currentUses: doc.uses } : e))
    update({ inventory: newInventory })
  }

  // Consumables decrement uses; Fragile items (destroysOnUse quality) get
  // marked destroyed instead — entry stays on the sheet, grayed out, so
  // any notes attached to it survive, matching the design settled earlier.
  function useItem(index: number) {
    const entry = character!.inventory[index]
    const doc = objectMap.get(entry.objectId)
    const isFragile = doc?.qualities?.some((q) => qualityDocs!.find((qd) => qd.name === q.name)?.destroysOnUse)
    const newInventory = character!.inventory.map((e, i) => {
      if (i !== index) return e
      if (isFragile) return { ...e, destroyed: true }
      if (e.currentUses !== undefined) return { ...e, currentUses: Math.max(0, e.currentUses - 1) }
      return e
    })
    update({ inventory: newInventory })
  }

  // Manual counterpart to autoApply — flips whether this specific
  // instance's non-autoApply statModifiers count toward derived stats.
  // computeInventoryStatBonuses reads this flag directly; toggling it is
  // the entire effect, nothing else to update here.
  function toggleApplied(index: number) {
    const newInventory = character!.inventory.map((e, i) => (i === index ? { ...e, applied: !e.applied } : e))
    update({ inventory: newInventory })
  }

  function removeItem(index: number) {
    const entry = character!.inventory[index]
    unequipItem(entry.id)
    update({ inventory: character!.inventory.filter((_, i) => i !== index) })
    setViewingInventoryIndex(null)
  }

  function applyStatusPreset(presetId: string) {
    const preset = statusPresetDocs!.find((p) => p.id === presetId)
    if (!preset) {
      setStatusForm(blankStatusForm())
      return
    }
    // Pre-fills the form from the real preset — every field stays
    // editable afterward, same as before, since a preset's numbers are
    // often meant to be adjusted (Burn's damage/duration vary per
    // weapon, Characteristic Shift's stat/amount get overridden, etc.).
    setStatusForm({
      ...blankStatusForm(),
      label: preset.label,
      description: preset.description ?? '',
      statModifiers: preset.statModifiers ?? [],
      poolModifiers: preset.poolModifiers ?? [],
      resultModifiers: preset.resultModifiers ?? [],
      perTurnEffect: preset.perTurnEffect ?? {},
      tickTiming: preset.tickTiming,
      remainingRounds: preset.remainingRounds,
      blocksNaturalRecovery: preset.blocksNaturalRecovery ?? [],
      suppressesInjuryEffects: preset.suppressesInjuryEffects,
      criticalInjuryRollModifier: preset.criticalInjuryRollModifier,
      removedOnEncounterEnd: preset.removedOnEncounterEnd,
      blocksSkillIds: preset.blocksSkillIds,
      onRemoveEffect: preset.onRemoveEffect,
      stacks: preset.stackable ? 1 : undefined,
      isCondition: preset.isCondition ?? false,
    })
  }

  // Only label is actually required — every other field on StatusEntry
  // is optional, and stays optional here too. Empty poolModifiers/resultModifiers/
  // statModifiers/perTurnEffect objects and empty arrays are stripped before
  // saving so they don't clutter the stored entry with meaningless {}.
  // Used to gate "Is a condition" — a pure condition by definition has no
  // other mechanical data attached. If any of these have real content,
  // the checkbox becomes unavailable rather than letting the two
  // contradict each other.
  function statusFormHasMechanicalData(): boolean {
    const f = statusForm
    return (
      (f.statModifiers?.length ?? 0) > 0 ||
      (f.poolModifiers?.length ?? 0) > 0 ||
      (f.resultModifiers?.length ?? 0) > 0 ||
      Object.values(f.perTurnEffect ?? {}).some((v) => v !== undefined) ||
      f.remainingRounds !== undefined ||
      (f.blocksNaturalRecovery?.length ?? 0) > 0 ||
      f.stacks !== undefined
    )
  }

  function addStatus() {
    if (!statusForm.label.trim()) return
    const entry: StatusEntry = { id: crypto.randomUUID(), label: statusForm.label.trim() }
    if (statusForm.description?.trim()) entry.description = statusForm.description.trim()
    if (statusForm.statModifiers && statusForm.statModifiers.length > 0) entry.statModifiers = statusForm.statModifiers
    if (statusForm.poolModifiers && statusForm.poolModifiers.length > 0) entry.poolModifiers = statusForm.poolModifiers
    if (statusForm.resultModifiers && statusForm.resultModifiers.length > 0) entry.resultModifiers = statusForm.resultModifiers
    if (statusForm.perTurnEffect && Object.values(statusForm.perTurnEffect).some((v) => v !== undefined)) {
      entry.perTurnEffect = statusForm.perTurnEffect
    }
    if (statusForm.tickTiming) entry.tickTiming = statusForm.tickTiming
    if (statusForm.remainingRounds !== undefined) entry.remainingRounds = statusForm.remainingRounds
    if (statusForm.blocksNaturalRecovery && statusForm.blocksNaturalRecovery.length > 0) {
      entry.blocksNaturalRecovery = statusForm.blocksNaturalRecovery
    }
    if (statusForm.stacks !== undefined) entry.stacks = statusForm.stacks
    if (statusForm.isCondition && !statusFormHasMechanicalData()) entry.isCondition = true
    if (statusForm.permanent) entry.permanent = true
    if (statusForm.removedOnEncounterEnd) entry.removedOnEncounterEnd = true
    if (statusForm.blocksSkillIds && statusForm.blocksSkillIds.length > 0) entry.blocksSkillIds = statusForm.blocksSkillIds
    if (statusForm.onRemoveEffect) entry.onRemoveEffect = statusForm.onRemoveEffect
    if (statusForm.criticalInjuryRollModifier !== undefined) entry.criticalInjuryRollModifier = statusForm.criticalInjuryRollModifier
    if (statusForm.suppressesInjuryEffects) entry.suppressesInjuryEffects = true

    update({ status: [...character!.status, entry] })
    setStatusForm(blankStatusForm())
    setShowAddStatusModal(false)
  }

  // No automated turn engine yet — this is the manual equivalent of "a
  // round passes." Ticks remainingRounds down by 1; hitting 0 removes
  // the status outright rather than leaving an expired entry sitting on
  // the sheet.
  function tickStatusRound(id: string) {
    const s = character!.status.find((x) => x.id === id)
    if (!s || s.remainingRounds === undefined) return
    if (s.remainingRounds <= 1) {
      removeStatus(id)
      return
    }
    update({
      status: character!.status.map((x) => (x.id === id ? { ...x, remainingRounds: x.remainingRounds! - 1 } : x)),
    })
  }

  function removeStatus(id: string, skipConfirm = false) {
    const s = character!.status.find((x) => x.id === id)
    if (s?.permanent && !skipConfirm) {
      setConfirmingRemoveStatusId(id)
      return
    }
    update({ status: character!.status.filter((x) => x.id !== id) })
    setViewingStatusId(null)
    setConfirmingRemoveStatusId(null)
  }

  function findCritByRoll(roll: number): CriticalInjuryDoc | null {
    return criticalInjuryDocs!.find((d) => roll >= d.minRoll && roll <= d.maxRoll) ?? null
  }

  // Rolls 1d100, applies the entered modifier (clamped to the valid 1-100
  // table range), looks up the matching injury, and — if it's one of the
  // isAltering entries — also auto-rolls the alteration sub-table right
  // away rather than asking the player to roll and enter it separately.
  // Rolls and saves in one action, deliberately — no chance to see a bad
  // result and back out before it's committed. The result stays
  // displayed afterward purely for reference, not as a pending state
  // waiting on a separate confirm.
  function rollAndAddCriticalInjury() {
    const modifier = Number(critModifierInput) || 0
    // Real Genesys rule: each existing critical injury makes future ones
    // worse. Reuses the same running total already shown at the top of
    // this section (computeCritTotal), rather than a parallel number that
    // happens to agree with it today but could drift out of sync later.
    const automaticModifier = computeCritTotal(character!.criticalInjuries)
    const rawRoll = Math.floor(Math.random() * 100) + 1
    // No upper clamp — the seeded table already runs all the way to
    // 'Dead' at 151-9999, so nothing above needs special-casing here.
    const finalRoll = Math.max(1, rawRoll + modifier + automaticModifier)
    const doc = findCritByRoll(finalRoll)
    if (!doc) return

    const result: CritRollResult = { rawRoll, modifier, automaticModifier, finalRoll, doc }
    const entry: CriticalInjuryEntry = { id: crypto.randomUUID(), injuryId: doc.id, critContribution: 10 }

    // Per-outcome fields (Horrific/Gruesome Injury) take priority over the
    // injury-level ones when both exist, since they're specifically for an
    // effect that depends on which outcome was rolled rather than being
    // fixed regardless of it.
    let statusIdToApply = doc.appliesStatusId
    let statusOverrides: { statModifiers?: { stat: string; amount: number }[] } | undefined
    let instantEffectToApply = doc.instantEffect

    // rollResults existing (needs a sub-roll) and isAltering (is this
    // permanent) are independent — Horrific Injury needs a sub-roll to
    // find which characteristic is affected but ISN'T permanent (goes
    // away once healed); Gruesome Injury needs the same sub-roll AND is
    // permanent. Triggering the sub-roll only when both were true meant
    // Horrific Injury's roll never happened at all.
    if (doc.rollResults) {
      const subRoll = Math.floor(Math.random() * doc.rollResults.max) + 1
      const outcome = doc.rollResults.outcomes.find((o) => subRoll >= o.min && subRoll <= o.max)
      result.subRoll = subRoll
      result.alterationDescription = outcome?.result
      if (outcome) entry.alterationDescription = outcome.result
      entry.randomResult = String(subRoll)

      if (outcome?.statusPresetId) {
        statusIdToApply = outcome.statusPresetId
        statusOverrides = outcome.overrides
      }
      if (outcome?.instantEffect) {
        instantEffectToApply = outcome.instantEffect as typeof doc.instantEffect
      }
    }

    const updates: Partial<Character> = { criticalInjuries: [...character!.criticalInjuries, entry] }

    // instantEffect — fires once, the instant this injury is rolled. A
    // characteristic target is a permanent direct write into
    // characteristics itself (Gruesome Injury) rather than a temporary
    // Status overlay, matching isAltering's own permanence; wounds/strain
    // clamp the same way applyVitalChange already does elsewhere.
    if (instantEffectToApply) {
      const { stat, amount } = instantEffectToApply
      if (stat === 'wounds') {
        updates.currentWounds = Math.min(stats.woundThreshold * 2, Math.max(0, character!.currentWounds + amount))
      } else if (stat === 'strain') {
        updates.currentStrain = Math.min(stats.strainThreshold, Math.max(0, character!.currentStrain + amount))
      } else {
        const key = stat as keyof Characteristics
        const oldValue = character!.characteristics[key]
        const newValue = Math.max(1, oldValue + amount)
        updates.characteristics = { ...character!.characteristics, [key]: newValue }
        // Only reached by Gruesome Injury (the sole instantEffect that
        // targets a characteristic, and always permanent) — without
        // this, totalSpentXP would look smaller the instant the value
        // drops, silently freeing XP to buy the exact same rank back
        // with nothing actually lost. Cost of the specific step being
        // erased, added to a running forfeited total rather than
        // subtracted live — the rank can still be bought back later,
        // but with fresh XP, not the XP that already paid for it once.
        if (amount < 0) {
          const lostStepCost =
            characteristicCost(oldValue, BBB_STARTING_CHARACTERISTIC) - characteristicCost(newValue, BBB_STARTING_CHARACTERISTIC)
          updates.permanentXPLoss = (character!.permanentXPLoss ?? 0) + lostStepCost
        }
      }
    }

    // forcesUnequip — immediately drop whatever's in Main Hand and Off
    // Hand. Same all-slots-this-entry-occupies clearing unequipItem does,
    // inlined here since this needs to fold into the same combined update
    // as everything else this injury triggers, not a separate write.
    if (doc.forcesUnequip) {
      const newSlots = { ...character!.equippedSlots }
      for (const handSlot of ['Main Hand', 'Off Hand'] as const) {
        const occupantId = newSlots[handSlot]
        if (!occupantId) continue
        for (const slot of Object.keys(newSlots)) {
          if (newSlots[slot as keyof EquippedSlots] === occupantId) newSlots[slot as keyof EquippedSlots] = null
        }
      }
      updates.equippedSlots = newSlots
    }

    // appliesStatusId — creates a real Status from the referenced preset
    // instead of relying on a person to remember to add it by hand.
    // sourceInjuryId ties it to this specific occurrence (not just this
    // injury type), so healing this exact injury later removes precisely
    // this status, not any other status of the same label the character
    // might separately have.
    if (statusIdToApply) {
      const preset = statusPresetDocs!.find((p) => p.id === statusIdToApply)
      if (preset) {
        // Firestore's updateDoc rejects the entire write if ANY field
        // anywhere in the payload is literally undefined — not just this
        // object's own top-level keys, but anything nested inside the
        // array it's about to go into. Only assigning a key when the
        // preset actually has a value (same pattern addStatus() already
        // uses correctly) avoids silently poisoning the whole update.
        const newStatus: StatusEntry = { id: crypto.randomUUID(), label: preset.label, sourceInjuryId: entry.id }
        const statModifiersToUse = statusOverrides?.statModifiers ?? preset.statModifiers
        if (statModifiersToUse) newStatus.statModifiers = statModifiersToUse
        if (preset.poolModifiers) newStatus.poolModifiers = preset.poolModifiers
        if (preset.resultModifiers) newStatus.resultModifiers = preset.resultModifiers
        if (preset.perTurnEffect) newStatus.perTurnEffect = preset.perTurnEffect
        if (preset.tickTiming) newStatus.tickTiming = preset.tickTiming
        if (preset.remainingRounds !== undefined) newStatus.remainingRounds = preset.remainingRounds
        if (preset.blocksNaturalRecovery) newStatus.blocksNaturalRecovery = preset.blocksNaturalRecovery
        if (preset.suppressesInjuryEffects) newStatus.suppressesInjuryEffects = true
        if (preset.criticalInjuryRollModifier !== undefined) newStatus.criticalInjuryRollModifier = preset.criticalInjuryRollModifier
        if (preset.removedOnEncounterEnd) newStatus.removedOnEncounterEnd = true
        if (preset.blocksSkillIds) newStatus.blocksSkillIds = preset.blocksSkillIds
        if (preset.onRemoveEffect) newStatus.onRemoveEffect = preset.onRemoveEffect
        if (preset.stackable) newStatus.stacks = 1
        if (preset.isCondition) newStatus.isCondition = true
        updates.status = [...character!.status, newStatus]
      }
    }

    // forcesLastSlot and pendingPoolModifier both wait on systems that
    // don't exist yet (the initiative tracker's round-stepping, and the
    // dice roller's pool-building respectively) — deliberately not
    // touched here. The data's already on the injury doc, ready for when
    // those exist; there's nothing for this function to do with it yet.

    update(updates)
    setCritRollResult(result)
  }

  // Healing an injury cascade-removes any Status it created via
  // appliesStatusId — matched by sourceInjuryId (this specific occurrence's
  // own id), not by injuryId, so healing one of two simultaneous
  // occurrences of the same injury type only clears that one's status.
  function removeCriticalInjury(index: number) {
    const removedEntry = character!.criticalInjuries[index]
    update({
      criticalInjuries: character!.criticalInjuries.filter((_, i) => i !== index),
      status: character!.status.filter((s) => s.sourceInjuryId !== removedEntry.id),
    })
    setViewingCritIndex(null)
  }

  // Payload construction now lives entirely in CustomItemForm — this just
  // does the part that's actually tied to character/session state: the
  // Firestore write, appending to local objectDocs, adding the new item
  // to inventory, and closing the modal.
  async function handleCreateCustomItem(payload: Omit<ObjectDoc, 'id' | 'sessionId' | 'ownerId'>) {
    if (!character!.sessionId || !user) return
    const ownerDisplayName = user.displayName ?? user.email ?? 'player'
    const id = await createCustomObject(character!.sessionId, user.uid, ownerDisplayName, payload)
    const newDoc: ObjectDoc = { ...payload, id, sessionId: character!.sessionId, ownerId: user.uid }
    setObjectDocs((prev) => [...(prev ?? []), newDoc])
    // Passing newDoc directly rather than letting addItem fall back to
    // objectMap.get(id) — objectMap is derived from objectDocs state,
    // and setObjectDocs above hasn't landed yet by the time this line
    // runs (React batches the update). Without this, addItem would look
    // up a doc that doesn't exist yet and silently skip setting
    // currentDurability/currentUses, no matter what was in the form.
    addItem(id, newDoc)
    setShowCustomItemForm(false)
  }

  function addItem(objectId: string, docOverride?: ObjectDoc) {
    const doc = docOverride ?? objectMap.get(objectId)
    const entry: InventoryEntry = { id: crypto.randomUUID(), objectId }
    if (doc?.durability !== undefined) entry.currentDurability = doc.durability
    if (doc?.uses !== undefined) entry.currentUses = doc.uses
    update({ inventory: [...character!.inventory, entry] })
    setShowAddItemModal(false)
    setAddItemQuery('')
    setViewingAddItemId(null)
  }

  return (
    <div className="max-w-4xl rounded-lg border border-border bg-surface p-4">
      {/* Header — always visible, not collapsible */}
      <div className="mb-2 flex items-start justify-between border-b border-border pb-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">{character.characterName}</h1>
          {playerDisplayName && <p className="text-xs text-fg-muted">Player: {playerDisplayName}</p>}
          <p className="text-sm text-fg-secondary">
            {GAME_CONFIG.species} · {character.career.name}
          </p>
          {(character.species.specialAbility ?? career?.specialAbility) && (
            <p className="mt-2 text-sm text-fg-secondary">
              <span className="text-accent">
                {(character.species.specialAbility ?? career?.specialAbility)!.name}
              </span>{' '}
              — {(character.species.specialAbility ?? career?.specialAbility)!.description}
            </p>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setEditMode((e) => !e)}
            className={`shrink-0 rounded px-3 py-1.5 text-sm font-medium ${
              editMode
                ? 'bg-warning text-warning-fg hover:bg-warning-hover'
                : 'bg-accent text-accent-fg hover:bg-accent-hover'
            }`}
          >
            {editMode ? 'Done Editing' : 'Edit'}
          </button>
        )}
      </div>

      <SheetSection title="Characteristics">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CHARACTERISTIC_ORDER.map(({ key, label }) => {
            const value = character!.characteristics[key]
            const effective = effectiveCharacteristics[key]
            const isModified = effective !== value
            return (
              <div key={key} className="rounded-lg bg-page p-2 text-center">
                <p className="text-xs text-fg-muted">{label}</p>
                {canEdit && editMode ? (
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => adjustCharacteristic(key, -1)}
                      className="h-6 w-6 rounded border border-border-strong text-xs text-fg hover:bg-surface-hover"
                    >
                      −
                    </button>
                    <span className="w-6 text-lg font-semibold text-fg">
                      {effective}
                      {isModified && <span className="ml-0.5 text-xs text-fg-muted line-through">{value}</span>}
                    </span>
                    <button
                      onClick={() => adjustCharacteristic(key, 1)}
                      className="h-6 w-6 rounded border border-border-strong text-xs text-fg hover:bg-surface-hover"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-fg">
                    {effective}
                    {isModified && <span className="ml-1 text-xs text-fg-muted line-through">{value}</span>}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </SheetSection>

      <SheetSection title="Vitals">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(79,184,166,0.14)' }}>
            <p className="text-xs" style={{ color: '#6FCBB9' }}>Soak</p>
            <p className="text-lg font-semibold" style={{ color: '#8FE0D0' }}>{stats.soak}</p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(201,112,100,0.14)' }}>
            <p className="text-xs" style={{ color: '#E29073' }}>Wounds</p>
            {canEdit ? (
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  value={character.currentWounds}
                  onChange={(e) => applyVitalChange('currentWounds', e.target.value)}
                  className="w-12 rounded border border-border-strong bg-page px-1 py-0.5 text-center text-fg"
                />
                <span style={{ color: '#F0B79B' }}>/ {stats.woundThreshold}</span>
              </div>
            ) : (
              <p className="text-lg font-semibold" style={{ color: '#F0B79B' }}>
                {character.currentWounds} / {stats.woundThreshold}
              </p>
            )}
            {woundsRecoveryBlocked && canEdit && (
              <p className="mt-1 text-xs font-semibold text-red-500">A status is blocking recovery</p>
            )}
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(139,127,201,0.14)' }}>
            <p className="text-xs" style={{ color: '#A9A2E6' }}>Strain</p>
            {canEdit ? (
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  value={character.currentStrain}
                  onChange={(e) => applyVitalChange('currentStrain', e.target.value)}
                  className="w-12 rounded border border-border-strong bg-page px-1 py-0.5 text-center text-fg"
                />
                <span style={{ color: '#C4BEF2' }}>/ {stats.strainThreshold}</span>
              </div>
            ) : (
              <p className="text-lg font-semibold" style={{ color: '#C4BEF2' }}>
                {character.currentStrain} / {stats.strainThreshold}
              </p>
            )}
            {strainRecoveryBlocked && canEdit && (
              <p className="mt-1 text-xs font-semibold text-red-500">A status is blocking recovery</p>
            )}
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(79,184,166,0.14)' }}>
            <p className="text-xs" style={{ color: '#6FCBB9' }}>Defense (M/R)</p>
            <p className="text-lg font-semibold" style={{ color: '#8FE0D0' }}>
              {stats.meleeDefense}/{stats.rangedDefense}
            </p>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(217,160,87,0.14)' }}>
            <p className="text-xs" style={{ color: '#E3BC80' }}>XP Available</p>
            <p className="text-lg font-semibold" style={{ color: '#F0D19E' }}>{availableXP}</p>
          </div>
          <div className="rounded-lg bg-page p-2 text-center">
            <p className="text-xs text-fg-muted">XP Total</p>
            {canEdit && editMode ? (
              <input
                type="number"
                value={character.totalXP}
                onChange={(e) => update({ totalXP: Number(e.target.value) || 0 })}
                className={`w-16 rounded border px-1 py-0.5 text-center text-fg ${
                  xpInvalid ? 'border-red-500 bg-red-500/10' : 'border-border-strong bg-surface'
                }`}
              />
            ) : (
              <p className="text-lg font-semibold text-fg">{character.totalXP}</p>
            )}
            {xpInvalid && (
              <p className="mt-1 text-xs font-semibold text-red-500">Below spent XP ({spentXP})</p>
            )}
          </div>
          <div className="rounded-lg bg-page p-2 text-center">
            <p className="text-xs text-fg-muted">Encumbrance</p>
            <p className={`text-lg font-semibold ${currentEncumbrance > capacity ? 'text-warning' : 'text-fg'}`}>
              {currentEncumbrance} / {capacity}
            </p>
          </div>
        </div>
      </SheetSection>

      <SheetSection title="Equipment">
        {/* Only the slots this game actually uses render — no grayed-out
            placeholders for slots BB&B doesn't have. A Backrooms character
            would show all 12; this shows GAME_CONFIG.activeSlots.length (3). */}
        <div className="grid grid-cols-3 gap-2">
          {GAME_CONFIG.activeSlots.map((slotName) => {
            const entryId = character!.equippedSlots[slotName]
            const entry = entryId ? character!.inventory.find((e) => e.id === entryId) : null
            const doc = entry ? objectMap.get(entry.objectId) : null
            return (
              <div key={slotName} className="rounded-lg bg-page p-2 text-center">
                <p className="text-xs text-fg-muted">{slotName}</p>
                <p className="text-sm font-medium text-fg">{doc?.name ?? '—'}</p>
              </div>
            )
          })}
        </div>
      </SheetSection>

      <SheetSection title="Inventory">
        {canEdit && (
          <button
            onClick={() => setShowAddItemModal(true)}
            className="mb-3 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
          >
            Add Item
          </button>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {character.inventory.map((entry, index) => {
            const doc = objectMap.get(entry.objectId)
            const equipped = Object.values(character.equippedSlots).includes(entry.id)
            const viewing = viewingInventoryIndex === index
            // Distinct from `destroyed` (Fragile, one-and-done — grayed
            // out, functionally gone). This flags a still-present item
            // that's currently unusable: broken (durability 0) or out of
            // uses (0) — a glance-able warning border, not a fade-out,
            // since both of these can be reversed (Repair, Restore Uses).
            const unusable = entry.currentDurability === 0 || entry.currentUses === 0
            return (
              <button
                key={entry.id}
                onClick={() => setViewingInventoryIndex(viewing ? null : index)}
                className={`flex h-12 w-full items-center justify-center rounded border px-2 text-center text-xs leading-tight ${
                  entry.destroyed
                    ? 'border-border bg-page text-fg-muted opacity-50'
                    : viewing
                      ? `ring-2 ring-blue-400 ring-offset-1 ring-offset-page bg-accent/10 text-fg ${
                          unusable ? 'border-warning' : 'border-accent'
                        }`
                      : unusable
                        ? 'border-warning bg-page text-fg-muted'
                        : equipped
                          ? 'border-accent bg-accent/10 text-fg'
                          : 'border-border bg-page text-fg-secondary hover:bg-surface-hover'
                }`}
              >
                {doc?.name ?? entry.objectId}
              </button>
            )
          })}
          {character.inventory.length === 0 && <p className="text-sm text-fg-muted">No items.</p>}
        </div>

        {viewingInventoryIndex !== null && (() => {
          const entry = character.inventory[viewingInventoryIndex]
          const doc = objectMap.get(entry.objectId)
          if (!entry || !doc) return null
          const equipped = Object.values(character.equippedSlots).includes(entry.id)
          const canEquip = doc.type === 'Weapon' || doc.type === 'Armor'

          return (
            <div className="mt-3 rounded-lg border border-accent bg-surface p-4">
              <ItemDetail
                doc={doc}
                entry={entry}
                qualityDocs={qualityDocs}
                skillDocs={skillDocs}
                talentDocs={talentDocs}
                characterTalents={character.talents}
                brawn={effectiveCharacteristics.brawn}
              />

              {canEdit && !entry.destroyed && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {canEquip && (
                    <button
                      onClick={() => (equipped ? unequipItem(entry.id) : equipItem(entry))}
                      disabled={!equipped && entry.currentDurability === 0}
                      className="rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      {equipped ? 'Unequip' : 'Equip'}
                    </button>
                  )}
                  {equipped && doc.type === 'Weapon' && doc.skill && onRoll && (
                    <button
                      onClick={() => {
                        const result = poolForSkill(doc.skill!, entry.id)
                        if (!result) return
                        // Improvised — attacking with this weapon unequips
                        // it, since it's now out of hand until retrieved.
                        // Fragile — attacking with it (same as any other
                        // use) breaks it for good, same as clicking Use
                        // directly. Both bundled into onResolved alongside
                        // pending-injury consumption, same reasoning as
                        // that fix: only fires once the roll actually
                        // happens, not the instant the button is clicked.
                        // Combined into one update rather than two
                        // sequential ones (unequip, then destroy) to avoid
                        // the second call reading a character reference
                        // that hasn't caught up with the first yet.
                        const hasAutoUnequip = (doc.qualities ?? []).some(
                          (q) => qualityDocs.find((qd) => qd.name === q.name)?.autoUnequipOnAttack
                        )
                        const hasDestroysOnUse = (doc.qualities ?? []).some(
                          (q) => qualityDocs.find((qd) => qd.name === q.name)?.destroysOnUse
                        )
                        onRoll(
                          result.basePool,
                          `${doc.name} Attack`,
                          character.characterName,
                          result.appliedModifiers,
                          result.appliedResultModifiers,
                          result.manualToggleOptions,
                          (_dice, _rollResult, strainSpent) => {
                            consumePendingInjuryEffects(result.pendingInjuryIds)
                            const updates: Partial<Character> = {}
                            if (hasAutoUnequip || hasDestroysOnUse) {
                              const newSlots = { ...character!.equippedSlots }
                              for (const slot of Object.keys(newSlots)) {
                                if (newSlots[slot as keyof typeof newSlots] === entry.id) {
                                  newSlots[slot as keyof typeof newSlots] = null
                                }
                              }
                              updates.equippedSlots = newSlots
                            }
                            if (hasDestroysOnUse) {
                              updates.inventory = character!.inventory.map((e) =>
                                e.id === entry.id ? { ...e, destroyed: true } : e
                              )
                            }
                            // Rapid Reaction/Proper Upbringing-style variable
                            // toggles (choose an amount, pay strain equal to
                            // it) — deducted only now that the roll actually
                            // resolved, same deferred-consequence pattern as
                            // everything else here.
                            if (strainSpent > 0) {
                              updates.currentStrain = Math.min(stats.strainThreshold, character!.currentStrain + strainSpent)
                            }
                            if (Object.keys(updates).length > 0) update(updates)
                          }
                        )
                      }}
                      className="rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
                    >
                      Roll Attack
                    </button>
                  )}
                  {entry.currentUses !== undefined && entry.currentUses > 0 && (
                    <button
                      onClick={() => useItem(viewingInventoryIndex)}
                      className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
                    >
                      Use
                    </button>
                  )}
                  {doc.qualities?.some((q) => qualityDocs.find((qd) => qd.name === q.name)?.destroysOnUse) &&
                    entry.currentUses === undefined &&
                    doc.type !== 'Weapon' && (
                      <button
                        onClick={() => useItem(viewingInventoryIndex)}
                        className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
                      >
                        Use
                      </button>
                    )}
                  {entry.currentUses !== undefined && entry.currentUses < (doc.uses ?? 0) && !doc.usesCannotRestore && (
                    <button
                      onClick={() => restoreUses(viewingInventoryIndex)}
                      className="rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
                    >
                      Restore Uses
                    </button>
                  )}
                  {entry.currentDurability !== undefined && entry.currentDurability > 0 && (
                    <button
                      onClick={() => damageItem(viewingInventoryIndex)}
                      className="rounded border border-warning px-3 py-1.5 text-xs text-warning hover:bg-surface-hover"
                    >
                      Damage
                    </button>
                  )}
                  {entry.currentDurability !== undefined && entry.currentDurability < (doc.durability ?? 3) && (
                    <button
                      onClick={() => repairItem(viewingInventoryIndex)}
                      className="rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
                    >
                      Repair
                    </button>
                  )}
                  {doc.statModifiers?.some((m) => !m.autoApply) && (
                    <button
                      onClick={() => toggleApplied(viewingInventoryIndex)}
                      className={`rounded border px-3 py-1.5 text-xs hover:bg-surface-hover ${
                        entry.applied ? 'border-accent text-accent' : 'border-border-strong text-fg'
                      }`}
                    >
                      {entry.applied ? 'Remove Application' : 'Apply'}
                    </button>
                  )}
                  <button
                    onClick={() => removeItem(viewingInventoryIndex)}
                    className="rounded border border-border-strong px-3 py-1.5 text-xs text-warning hover:bg-surface-hover"
                  >
                    Remove
                  </button>
                </div>
              )}
              {entry.destroyed && canEdit && (
                <button
                  onClick={() => removeItem(viewingInventoryIndex)}
                  className="mt-4 rounded border border-border-strong px-3 py-1.5 text-xs text-warning hover:bg-surface-hover"
                >
                  Delete
                </button>
              )}
            </div>
          )
        })()}

        {showAddItemModal && (() => {
          const filtered = objectDocs
            .filter((o) => addItemTypeFilter === 'All' || o.type === addItemTypeFilter)
            .filter((o) => o.name.toLowerCase().includes(addItemQuery.toLowerCase()))
            .sort((a, b) => {
              if (addItemSort === 'rarity') return a.rarity - b.rarity
              if (addItemSort === 'encumbrance') return a.encumbrance - b.encumbrance
              return a.name.localeCompare(b.name)
            })
          const viewingDoc = viewingAddItemId ? objectDocs.find((o) => o.id === viewingAddItemId) : null

          function closeModal() {
            setShowAddItemModal(false)
            setAddItemQuery('')
            setAddItemTypeFilter('All')
            setViewingAddItemId(null)
            setShowCustomItemForm(false)
          }

          return (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 sm:p-4">
              <div className="flex h-full w-full flex-col overflow-y-auto border-border bg-surface p-4 sm:h-[85vh] sm:max-w-2xl sm:rounded-lg sm:border">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-fg">Add Item</h3>
                  <button
                    onClick={closeModal}
                    className="rounded border border-border-strong px-3 py-1 text-sm text-fg hover:bg-surface-hover"
                  >
                    Close
                  </button>
                </div>

                {!showCustomItemForm ? (
                  <>
                    <button
                      onClick={() => setShowAddItemFilters((s) => !s)}
                      className="mb-2 flex items-center gap-1 text-sm font-medium text-fg-secondary"
                    >
                      Filters {showAddItemFilters ? '▾' : '▸'}
                    </button>
                    {showAddItemFilters && (
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                        <select
                          value={addItemTypeFilter}
                          onChange={(e) => setAddItemTypeFilter(e.target.value)}
                          className="rounded border border-border-strong bg-page px-3 py-2 text-sm text-fg"
                        >
                          <option value="All">All types</option>
                          <option value="Weapon">Weapon</option>
                          <option value="Armor">Armor</option>
                          <option value="Food">Food</option>
                          <option value="Drink">Drink</option>
                          <option value="Light Source">Light Source</option>
                          <option value="Tool">Tool</option>
                          <option value="Mundane">Mundane</option>
                        </select>
                        <select
                          value={addItemSort}
                          onChange={(e) => setAddItemSort(e.target.value as typeof addItemSort)}
                          className="rounded border border-border-strong bg-page px-3 py-2 text-sm text-fg"
                        >
                          <option value="name">Sort: Name</option>
                          <option value="rarity">Sort: Rarity</option>
                          <option value="encumbrance">Sort: Encumbrance</option>
                        </select>
                        <input
                          value={addItemQuery}
                          onChange={(e) => setAddItemQuery(e.target.value)}
                          placeholder="Search items…"
                          className="flex-1 rounded border border-border-strong bg-page px-3 py-2 text-sm text-fg"
                        />
                      </div>
                    )}

                    <button
                      onClick={() => setShowCustomItemForm(true)}
                      className="mb-3 rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
                    >
                      Create a custom item
                    </button>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {filtered.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => setViewingAddItemId(viewingAddItemId === o.id ? null : o.id)}
                          className={`flex h-12 w-full items-center justify-center rounded border px-2 text-center text-xs leading-tight ${
                            viewingAddItemId === o.id
                              ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-page border-accent bg-accent/10 text-fg'
                              : 'border-border bg-page text-fg-secondary hover:bg-surface-hover'
                          }`}
                        >
                          {o.name}
                        </button>
                      ))}
                      {filtered.length === 0 && <p className="text-sm text-fg-muted">No items match.</p>}
                    </div>

                    {viewingDoc && (
                      <div className="mt-3 rounded border border-accent bg-page p-3">
                        <ItemDetail
                          doc={viewingDoc}
                          qualityDocs={qualityDocs}
                          skillDocs={skillDocs}
                          talentDocs={talentDocs}
                          characterTalents={character.talents}
                          brawn={effectiveCharacteristics.brawn}
                        />
                        <button
                          onClick={() => addItem(viewingDoc.id)}
                          className="mt-3 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
                        >
                          Add to Inventory
                        </button>
                      </div>
                    )}
                    </div>
                  </>
                ) : (
                  <CustomItemForm
                    activeSlots={GAME_CONFIG.activeSlots}
                    qualityDocs={qualityDocs}
                    skillDocs={skillDocs}
                    onCreate={handleCreateCustomItem}
                    onCancel={() => setShowCustomItemForm(false)}
                  />
                )}
              </div>
            </div>
          )
        })()}

        {equipChoice && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 sm:p-4">
            <div className="w-full max-w-sm rounded-lg border border-accent bg-surface p-4">
              <p className="text-sm font-semibold text-fg">
                Equip {objectMap.get(equipChoice.entry.objectId)?.name} — which slot?
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {equipChoice.slots.map((slot) => {
                  const occupantId = character.equippedSlots[slot as keyof EquippedSlots]
                  const occupantEntry = occupantId ? character.inventory.find((e) => e.id === occupantId) : null
                  const occupantName = occupantEntry ? objectMap.get(occupantEntry.objectId)?.name : null
                  return (
                    <button
                      key={slot}
                      onClick={() => {
                        performEquip(equipChoice.entry, [slot])
                        setEquipChoice(null)
                      }}
                      className="rounded border border-border-strong px-3 py-2 text-left text-sm text-fg hover:bg-surface-hover"
                    >
                      {slot}
                      {occupantName && <span className="block text-xs text-fg-muted">Replaces {occupantName}</span>}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setEquipChoice(null)}
                className="mt-3 rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {equipConfirm && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 sm:p-4">
            <div className="w-full max-w-sm rounded-lg border border-warning bg-surface p-4">
              <p className="text-sm font-semibold text-fg">
                Equip {objectMap.get(equipConfirm.entry.objectId)?.name}?
              </p>
              <p className="mt-2 text-sm text-fg-secondary">
                This fills {equipConfirm.slots.join(' and ')} at once, unequipping:
              </p>
              <ul className="mt-1 list-disc pl-5 text-sm text-fg">
                {equipConfirm.displaced.map((d, i) => (
                  <li key={i}>{d.name} (from {d.slot})</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    performEquip(equipConfirm.entry, equipConfirm.slots)
                    setEquipConfirm(null)
                  }}
                  className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
                >
                  Equip
                </button>
                <button
                  onClick={() => setEquipConfirm(null)}
                  className="rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </SheetSection>

      <SheetSection title="Skills">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {SKILL_CATEGORY_ORDER.map((category) => (
            <div key={category} className="lg:flex-1">
              <h4 className="mb-2 text-xs font-semibold text-fg-secondary">{category}</h4>
              <div className="space-y-1">
                {BBB_SKILLS.filter((s) => BBB_SKILL_CATEGORY[s] === category).map((skillId) => {
                  const doc = skillDocs!.find((d) => d.id === skillId)
                  if (!doc) return null
                  const rank = character!.skills.find((s) => s.name === skillId)?.rank ?? 0
                  const isCareer = careerSkillNames.includes(skillId)
                  const freeRank: 0 | 1 = character!.career.chosenSkills.includes(skillId) ? 1 : 0
                  const characteristic = (BBB_SKILL_CHARACTERISTIC_OVERRIDES[skillId] ??
                    doc.characteristic) as keyof Characteristics
                  const pool = calculateDicePool(effectiveCharacteristics[characteristic], rank)
                  const nextCost =
                    rank < LIVE_SKILL_RANK_CAP
                      ? skillCost(rank + 1, isCareer, freeRank) - skillCost(rank, isCareer, freeRank)
                      : null

                  function setRank(newRank: number) {
                    update({
                      skills: character!.skills.map((s) => (s.name === skillId ? { ...s, rank: newRank } : s)),
                    })
                  }

                  return (
                    <div
                      key={skillId}
                      className={`flex items-center justify-between rounded border bg-page px-2 py-1.5 ${
                        isCareer ? 'border-accent' : 'border-border'
                      }`}
                    >
                      <div>
                        <p className="text-sm text-fg">
                          {doc.name}{' '}
                          <span className="text-xs text-fg-muted">
                            ({characteristic.slice(0, 3).toUpperCase()})
                          </span>
                          {isCareer && <span className="ml-1 text-xs text-accent">★</span>}
                        </p>
                        <div className="flex items-center">
                          <DicePool ability={pool.ability} proficiency={pool.proficiency} />
                          {onRoll && (
                            <button
                              onClick={() => {
                                const result = poolForSkill(skillId)
                                if (!result) return
                                onRoll(
                                  result.basePool,
                                  doc.name,
                                  character.characterName,
                                  result.appliedModifiers,
                                  result.appliedResultModifiers,
                                  result.manualToggleOptions,
                                  (_dice, _rollResult, strainSpent) => {
                                    consumePendingInjuryEffects(result.pendingInjuryIds)
                                    if (strainSpent > 0) {
                                      update({
                                        currentStrain: Math.min(stats.strainThreshold, character!.currentStrain + strainSpent),
                                      })
                                    }
                                  }
                                )
                              }}
                              className="ml-1.5 rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-fg-secondary hover:bg-surface-hover"
                            >
                              Roll
                            </button>
                          )}
                        </div>
                      </div>
                      {canEdit && editMode ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={() => setRank(rank - 1)}
                            disabled={rank <= freeRank}
                            className="h-6 w-6 rounded border border-border-strong text-xs text-fg hover:bg-surface-hover disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-4 text-center text-sm text-fg">{rank}</span>
                          <button
                            onClick={() => setRank(rank + 1)}
                            disabled={rank >= LIVE_SKILL_RANK_CAP || (nextCost !== null && nextCost > availableXP)}
                            className="h-6 w-6 rounded border border-border-strong text-xs text-fg hover:bg-surface-hover disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-fg">{rank}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetSection>

      <SheetSection title="Talents">
        {canEdit && editMode && (
          <button
            onClick={() => setShowTalentModal(true)}
            className="mb-3 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
          >
            Edit Talents
          </button>
        )}

        {/* Pyramid orientation: Tier 5 at top, Tier 1 at bottom. Every
            owned rank renders so the pyramid's slot count stays visible,
            but only the highest rank per talent is highlighted — lower
            ranks grey out to signal "there's a higher rank of this
            elsewhere," rather than looking equally active. Clicking any
            rank of the same talent always shows the same (highest-rank)
            info below, since that's the one that actually applies. */}
        <div className="space-y-3">
          {TIERS.slice()
            .reverse()
            .map((tier) => {
              const atTier = character!.talents.filter((t) => t.tier === tier)
              if (atTier.length === 0) return null
              return (
                <div key={tier}>
                  <h4 className="mb-1 text-xs font-semibold text-fg-secondary">Tier {tier}</h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {atTier.map((t) => {
                      const doc = talentDocs!.find((d) => d.id === t.id)
                      if (!doc) return null
                      const highestRank = character!.talents
                        .filter((x) => x.id === t.id)
                        .reduce((max, x) => Math.max(max, x.rank), 0)
                      const isHighest = t.rank === highestRank
                      const viewing = viewingOwnedTalentId === t.id
                      return (
                        <button
                          key={`${t.id}:${t.rank}`}
                          onClick={() => setViewingOwnedTalentId(viewing ? null : t.id)}
                          className={`flex h-12 w-full items-center justify-center rounded border px-2 text-center text-xs leading-tight ${
                            viewing ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-page' : ''
                          } ${
                            isHighest
                              ? 'border-accent bg-accent/10 text-fg'
                              : 'border-border bg-page text-fg-muted opacity-50'
                          }`}
                        >
                          {doc.name}
                          {doc.ranked && t.rank > 1 ? ` R${t.rank}` : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          {character!.talents.length === 0 && <p className="text-sm text-fg-muted">No talents owned.</p>}
        </div>

        {viewingOwnedTalentId && (() => {
          const entries = character!.talents.filter((x) => x.id === viewingOwnedTalentId)
          const t = entries.reduce((best, x) => (x.rank > (best?.rank ?? 0) ? x : best), entries[0])
          const doc = t ? talentDocs!.find((d) => d.id === t.id) : null
          if (!t || !doc) return null
          // Each rank stores only ITS OWN picks (rank 2 of Knack For It
          // holds its 2 new skills, not rank 1's earlier pick) — showing
          // just the highest rank's own array silently dropped every
          // earlier rank's choice. Union across all owned ranks instead.
          const allSkillChoices = entries.flatMap((e) => e.skillChoices ?? [])
          const allCharacteristicChoices = entries.flatMap((e) => e.characteristicChoices ?? [])
          return (
            <div className="mt-3 rounded-lg border border-accent bg-surface p-4">
              <p className="font-semibold text-fg">
                {doc.name}
                {doc.ranked && t.rank > 1 ? ` (Rank ${t.rank})` : ''}
              </p>
              <p className="mt-1 text-sm text-fg-secondary">{doc.rules}</p>
              {allSkillChoices.length > 0 && (
                <p className="mt-2 text-xs text-fg-muted">
                  Skills: {allSkillChoices.map((id) => skillDocs!.find((d) => d.id === id)?.name ?? id).join(', ')}
                </p>
              )}
              {allCharacteristicChoices.length > 0 && (
                <p className="mt-1 text-xs text-fg-muted capitalize">
                  Characteristics: {allCharacteristicChoices.join(', ')}
                </p>
              )}
              {(doc.manualHeal || doc.manualStrainSpend || doc.strainCost || doc.appliesStatusId) &&
                (() => {
                  const maxUses = doc.usesPerPeriod ?? 1
                  const usesLeft = t.usesRemaining ?? maxUses
                  const isLimited = doc.limit !== 'None'
                  const encounterBlocked = Boolean(doc.requiresActiveEncounter) && !encounterActive
                  const disabled = (isLimited && usesLeft <= 0) || encounterBlocked
                  const cap = doc.scalesWithRank ? t.rank : Math.max(1, t.rank)
                  return (
                    <div className="mt-3 border-t border-border pt-3">
                      {isLimited && (
                        <p className="mb-2 text-xs text-fg-muted">
                          Uses left: {usesLeft} / {maxUses} ({doc.limit})
                        </p>
                      )}
                      {encounterBlocked && <p className="mb-2 text-xs text-warning">Requires an active encounter.</p>}
                      {doc.usesStoryPoint && (
                        <p className="mb-2 text-xs text-fg-muted">
                          Also transfers a Story Point — no Story Point pool exists yet, so this isn't tracked
                          automatically.
                        </p>
                      )}
                      {doc.manualStrainSpend ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={cap}
                            value={talentStrainSpendInput}
                            onChange={(e) =>
                              setTalentStrainSpendInput(Math.max(0, Math.min(cap, Number(e.target.value) || 0)))
                            }
                            className="w-16 rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                          />
                          <span className="text-xs text-fg-muted">strain (max {cap})</span>
                          <button
                            onClick={() => useTalentEntry(t, doc, talentStrainSpendInput)}
                            disabled={disabled}
                            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
                          >
                            Spend
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => useTalentEntry(t, doc)}
                          disabled={disabled}
                          className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
                        >
                          {doc.manualHeal
                            ? `Use (heal ${doc.scalesWithRank ? doc.manualHeal.amount * t.rank : doc.manualHeal.amount} ${doc.manualHeal.stat})`
                            : doc.strainCost
                              ? `Use (${doc.strainCost} strain)`
                              : 'Use'}
                        </button>
                      )}
                    </div>
                  )
                })()}
            </div>
          )
        })()}

        {showTalentModal && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 sm:p-4">
            <div className="flex h-full w-full flex-col overflow-y-auto border-border bg-surface p-4 sm:h-[90vh] sm:max-w-3xl sm:rounded-lg sm:border">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-fg">Edit Talents</h3>
                <button
                  onClick={() => setShowTalentModal(false)}
                  className="rounded border border-border-strong px-3 py-1 text-sm text-fg hover:bg-surface-hover"
                >
                  Close
                </button>
              </div>
              {/* Genuinely reusing the wizard's own StepTalents here, not
                  a hand-rolled reimplementation — same buying logic, same
                  pyramid rules, and (unlike the earlier hand-rolled
                  version) its already-working skill/characteristic choice
                  pickers. A minimal CharacterDraft-shaped object is built
                  from the live character; updateDraft just forwards
                  talent changes straight to the real character via
                  update(). Fields StepTalents never touches (weapon,
                  gear, personality, etc.) are harmless empty defaults. */}
              <StepTalents
                draft={{
                  characterName: character.characterName,
                  playerName: '',
                  species: character.species,
                  career: character.career,
                  characteristics: character.characteristics,
                  skills: character.skills,
                  talents: character.talents,
                  weaponObjectId: null,
                  armorObjectId: null,
                  gearObjectIds: [],
                  customItems: [],
                  identityNotes: ['', '', ''],
                  totalXP: character.totalXP,
                  strength: '',
                  flaw: '',
                  desire: '',
                  fear: '',
                  description: {},
                }}
                updateDraft={(updates) => update(updates as Partial<Character>)}
                setCanProceed={() => {}}
                skillDocs={skillDocs}
                talentDocs={talentDocs}
                qualityDocs={qualityDocs}
                objectDocs={objectDocs}
                sessionId={character.sessionId ?? ''}
              />
            </div>
          </div>
        )}
      </SheetSection>

      <SheetSection title="Status Effects">
        {canEdit && editMode && (
          <button
            onClick={() => setShowAddStatusModal(true)}
            className="mb-3 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
          >
            Add Status
          </button>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {character.status.map((s) => {
            const viewing = viewingStatusId === s.id
            return (
              <button
                key={s.id}
                onClick={() => setViewingStatusId(viewing ? null : s.id)}
                className={`flex h-12 w-full items-center justify-center rounded border px-2 text-center text-xs leading-tight ${
                  s.permanent ? 'border-2' : 'border'
                } ${
                  viewing
                    ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-page border-accent bg-accent/10 text-fg'
                    : 'border-accent bg-accent/10 text-fg hover:bg-surface-hover'
                }`}
              >
                {s.permanent && <span className="mr-1">🔒</span>}
                {s.label}
              </button>
            )
          })}
          {character.status.length === 0 && <p className="text-sm text-fg-muted">No active statuses.</p>}
        </div>

        {viewingStatusId && (() => {
          const s = character.status.find((x) => x.id === viewingStatusId)
          if (!s) return null
          return (
            <div className="mt-3 rounded-lg border border-accent bg-surface p-4">
              <p className="font-semibold text-fg">{s.label}</p>
              {s.description && <p className="mt-1 text-sm text-fg-secondary">{s.description}</p>}
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                {s.statModifiers && s.statModifiers.length > 0 && (
                  <>
                    <dt className="text-fg-muted">Stats:</dt>
                    <dd className="text-fg">
                      {s.statModifiers
                        .map((m) => `${STAT_LABELS[m.stat ?? ''] ?? CHARACTERISTIC_LABELS[m.stat ?? ''] ?? m.stat ?? '?'} ${m.amount > 0 ? '+' : ''}${m.amount}`)
                        .join(', ')}
                    </dd>
                  </>
                )}
                {s.poolModifiers && s.poolModifiers.length > 0 && (
                  <>
                    <dt className="text-fg-muted">Pool:</dt>
                    <dd className="text-fg">
                      {s.poolModifiers.map((m, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          {POOL_MODIFIER_LABELS[m.type] ?? m.type} {m.amount}
                          {m.appliesTo && ` (${m.appliesTo})`}
                        </span>
                      ))}
                    </dd>
                  </>
                )}
                {s.resultModifiers && s.resultModifiers.length > 0 && (
                  <>
                    <dt className="text-fg-muted">Result:</dt>
                    <dd className="text-fg">
                      {s.resultModifiers.map((m, i) => (
                        <span key={i}>
                          {i > 0 && ', '}
                          {RESULT_MODIFIER_LABELS[m.type] ?? m.type} {m.amount}
                          {m.appliesTo && ` (${m.appliesTo})`}
                        </span>
                      ))}
                    </dd>
                  </>
                )}
                {s.perTurnEffect && (s.perTurnEffect.wounds !== undefined || s.perTurnEffect.strain !== undefined || s.perTurnEffect.sanity !== undefined) && (
                  <>
                    <dt className="text-fg-muted">Per turn ({s.tickTiming ?? 'start'}):</dt>
                    <dd className="text-fg">
                      {[
                        s.perTurnEffect.wounds !== undefined && `${s.perTurnEffect.wounds} wounds`,
                        s.perTurnEffect.strain !== undefined && `${s.perTurnEffect.strain} strain`,
                        s.perTurnEffect.sanity !== undefined && `${s.perTurnEffect.sanity} sanity`,
                      ].filter(Boolean).join(', ')}
                    </dd>
                  </>
                )}
                {s.remainingRounds !== undefined && (
                  <>
                    <dt className="text-fg-muted">Rounds left:</dt>
                    <dd className="text-fg">{s.remainingRounds}</dd>
                  </>
                )}
                {s.removedOnEncounterEnd && (
                  <>
                    <dt className="text-fg-muted">Duration:</dt>
                    <dd className="text-fg">Until encounter ends</dd>
                  </>
                )}
                {s.blocksNaturalRecovery && s.blocksNaturalRecovery.length > 0 && (
                  <>
                    <dt className="text-fg-muted">Blocks recovery:</dt>
                    <dd className="text-fg">{s.blocksNaturalRecovery.map((k) => (k === 'wounds' ? 'Wounds' : 'Strain')).join(', ')}</dd>
                  </>
                )}
                {s.blocksSkillIds && s.blocksSkillIds.length > 0 && (
                  <>
                    <dt className="text-fg-muted">Blocks skills:</dt>
                    <dd className="text-fg">
                      {s.blocksSkillIds.map((id) => skillDocs!.find((d) => d.id === id)?.name ?? id).join(', ')}
                    </dd>
                  </>
                )}
                {s.onRemoveEffect && (
                  <>
                    <dt className="text-fg-muted">On removal:</dt>
                    <dd className="text-fg">{s.onRemoveEffect.amount} {s.onRemoveEffect.stat}</dd>
                  </>
                )}
                {s.criticalInjuryRollModifier !== undefined && (
                  <>
                    <dt className="text-fg-muted">Crit roll:</dt>
                    <dd className="text-fg">{s.criticalInjuryRollModifier > 0 ? '+' : ''}{s.criticalInjuryRollModifier}</dd>
                  </>
                )}
                {s.suppressesInjuryEffects && (
                  <>
                    <dt className="text-fg-muted">Suppresses:</dt>
                    <dd className="text-fg">All active Critical Injury effects</dd>
                  </>
                )}
                {s.stacks !== undefined && (
                  <>
                    <dt className="text-fg-muted">Stacks:</dt>
                    <dd className="text-fg">{s.stacks}</dd>
                  </>
                )}
              </dl>
              {canEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.remainingRounds !== undefined && (
                    <button
                      onClick={() => tickStatusRound(s.id)}
                      className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
                    >
                      −1 Round
                    </button>
                  )}
                  {confirmingRemoveStatusId === s.id ? (
                    <>
                      <span className="text-xs font-medium text-warning">Remove this permanent status?</span>
                      <button
                        onClick={() => removeStatus(s.id, true)}
                        className="rounded bg-warning px-3 py-1.5 text-xs font-medium text-warning-fg hover:bg-warning-hover"
                      >
                        Yes, remove
                      </button>
                      <button
                        onClick={() => setConfirmingRemoveStatusId(null)}
                        className="rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => removeStatus(s.id)}
                      className="rounded border border-border-strong px-3 py-1.5 text-xs text-warning hover:bg-surface-hover"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {showAddStatusModal && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 sm:p-4">
            <div className="flex h-full w-full flex-col overflow-y-auto border-border bg-surface p-4 sm:h-[85vh] sm:max-w-xl sm:rounded-lg sm:border">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-fg">Add Status</h3>
                <button
                  onClick={() => {
                    setShowAddStatusModal(false)
                    setStatusForm(blankStatusForm())
                  }}
                  className="rounded border border-border-strong px-3 py-1 text-sm text-fg hover:bg-surface-hover"
                >
                  Close
                </button>
              </div>

              <label className="mb-3 block text-xs text-fg-muted">
                Quick fill
                <select
                  onChange={(e) => applyStatusPreset(e.target.value)}
                  defaultValue=""
                  className="mt-0.5 w-full rounded border border-border-strong bg-page px-3 py-2 text-sm text-fg"
                >
                  <option value="">Custom (fill in manually)</option>
                  {statusPresetDocs!.map((preset) => (
                    <option key={preset.id} value={preset.id} title={preset.description}>{preset.label}</option>
                  ))}
                </select>
              </label>

              <label className="mb-2 block text-xs text-fg-muted">
                Label <span className="text-warning">(required)</span>
                <input
                  value={statusForm.label}
                  onChange={(e) => setStatusForm((f) => ({ ...f, label: e.target.value }))}
                  className="mt-0.5 w-full rounded border border-border-strong bg-page px-3 py-2 text-sm text-fg"
                />
              </label>

              <label className="mb-2 block text-xs text-fg-muted">
                Description
                <textarea
                  value={statusForm.description ?? ''}
                  onChange={(e) => setStatusForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="mt-0.5 w-full rounded border border-border-strong bg-page px-3 py-2 text-sm text-fg"
                />
              </label>

              <div className="mt-2 rounded border border-border-strong bg-page p-2">
                <p className="mb-1 flex items-center justify-between text-xs font-semibold text-fg-secondary">
                  Pool Modifiers
                  <button
                    onClick={() =>
                      setStatusForm((f) => ({
                        ...f,
                        poolModifiers: [...(f.poolModifiers ?? []), { type: 'AddSetback', amount: 1, appliesTo: '' }],
                      }))
                    }
                    className="rounded border border-border-strong px-2 py-0.5 text-xs text-fg hover:bg-surface-hover"
                  >
                    + Add
                  </button>
                </p>
                {(statusForm.poolModifiers ?? []).map((d, i) => (
                  <div key={i} className="mt-1 flex flex-wrap items-center gap-1">
                    <select
                      value={d.type}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          poolModifiers: (f.poolModifiers ?? []).map((x, j) =>
                            j === i ? { ...x, type: e.target.value } : x
                          ),
                        }))
                      }
                      className="rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    >
                      {Object.entries(POOL_MODIFIER_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={d.amount}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          poolModifiers: (f.poolModifiers ?? []).map((x, j) =>
                            j === i ? { ...x, amount: Number(e.target.value) || 0 } : x
                          ),
                        }))
                      }
                      className="w-14 rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                    <input
                      value={d.appliesTo ?? ''}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          poolModifiers: (f.poolModifiers ?? []).map((x, j) =>
                            j === i ? { ...x, appliesTo: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Applies to… (blank = everything)"
                      className="flex-1 rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                    <button
                      onClick={() =>
                        setStatusForm((f) => ({ ...f, poolModifiers: (f.poolModifiers ?? []).filter((_, j) => j !== i) }))
                      }
                      className="rounded border border-border-strong px-2 py-1 text-xs text-warning hover:bg-surface-hover"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 rounded border border-border-strong bg-page p-2">
                <p className="mb-1 flex items-center justify-between text-xs font-semibold text-fg-secondary">
                  Result Modifiers
                  <button
                    onClick={() =>
                      setStatusForm((f) => ({
                        ...f,
                        resultModifiers: [...(f.resultModifiers ?? []), { type: 'AddThreat', amount: 1, appliesTo: '' }],
                      }))
                    }
                    className="rounded border border-border-strong px-2 py-0.5 text-xs text-fg hover:bg-surface-hover"
                  >
                    + Add
                  </button>
                </p>
                {(statusForm.resultModifiers ?? []).map((d, i) => (
                  <div key={i} className="mt-1 flex flex-wrap items-center gap-1">
                    <select
                      value={d.type}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          resultModifiers: (f.resultModifiers ?? []).map((x, j) =>
                            j === i ? { ...x, type: e.target.value } : x
                          ),
                        }))
                      }
                      className="rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    >
                      {Object.entries(RESULT_MODIFIER_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={d.amount}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          resultModifiers: (f.resultModifiers ?? []).map((x, j) =>
                            j === i ? { ...x, amount: Number(e.target.value) || 0 } : x
                          ),
                        }))
                      }
                      className="w-14 rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                    <input
                      value={d.appliesTo ?? ''}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          resultModifiers: (f.resultModifiers ?? []).map((x, j) =>
                            j === i ? { ...x, appliesTo: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Applies to… (blank = everything)"
                      className="flex-1 rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                    <button
                      onClick={() =>
                        setStatusForm((f) => ({ ...f, resultModifiers: (f.resultModifiers ?? []).filter((_, j) => j !== i) }))
                      }
                      className="rounded border border-border-strong px-2 py-1 text-xs text-warning hover:bg-surface-hover"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 rounded border border-border-strong bg-page p-2">
                <p className="mb-1 flex items-center justify-between text-xs font-semibold text-fg-secondary">
                  Stat Modifiers
                  <button
                    onClick={() =>
                      setStatusForm((f) => ({
                        ...f,
                        statModifiers: [...(f.statModifiers ?? []), { stat: 'soak', amount: 1 }],
                      }))
                    }
                    className="rounded border border-border-strong px-2 py-0.5 text-xs text-fg hover:bg-surface-hover"
                  >
                    + Add
                  </button>
                </p>
                <p className="mb-1 text-xs text-fg-muted">
                  Covers both the 5 derived stats and the 6 characteristics — a status can push a
                  characteristic below its normal starting-value floor, unlike a permanent XP increase.
                </p>
                {(statusForm.statModifiers ?? []).map((m, i) => (
                  <div key={i} className="mt-1 flex flex-wrap items-center gap-1">
                    <select
                      value={m.stat ?? ''}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          statModifiers: (f.statModifiers ?? []).map((x, j) =>
                            j === i ? { ...x, stat: e.target.value } : x
                          ),
                        }))
                      }
                      className="rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    >
                      {Object.entries(STAT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                      {CHARACTERISTIC_ORDER.map(({ key, label }) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={m.amount}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          statModifiers: (f.statModifiers ?? []).map((x, j) =>
                            j === i ? { ...x, amount: Number(e.target.value) || 0 } : x
                          ),
                        }))
                      }
                      className="w-16 rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                    <button
                      onClick={() =>
                        setStatusForm((f) => ({ ...f, statModifiers: (f.statModifiers ?? []).filter((_, j) => j !== i) }))
                      }
                      className="rounded border border-border-strong px-2 py-1 text-xs text-warning hover:bg-surface-hover"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 rounded border border-border-strong bg-page p-2">
                <p className="mb-1 text-xs font-semibold text-fg-secondary">Per-Turn Effect</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="text-xs text-fg-muted">
                    Wounds
                    <input
                      type="number"
                      value={statusForm.perTurnEffect?.wounds ?? ''}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          perTurnEffect: { ...f.perTurnEffect, wounds: e.target.value === '' ? undefined : Number(e.target.value) },
                        }))
                      }
                      className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </label>
                  <label className="text-xs text-fg-muted">
                    Strain
                    <input
                      type="number"
                      value={statusForm.perTurnEffect?.strain ?? ''}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          perTurnEffect: { ...f.perTurnEffect, strain: e.target.value === '' ? undefined : Number(e.target.value) },
                        }))
                      }
                      className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </label>
                  <label className="text-xs text-fg-muted">
                    Sanity
                    <input
                      type="number"
                      value={statusForm.perTurnEffect?.sanity ?? ''}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          perTurnEffect: { ...f.perTurnEffect, sanity: e.target.value === '' ? undefined : Number(e.target.value) },
                        }))
                      }
                      className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                  </label>
                  <label className="text-xs text-fg-muted">
                    Ticks at
                    <select
                      value={statusForm.tickTiming ?? 'start'}
                      onChange={(e) => setStatusForm((f) => ({ ...f, tickTiming: e.target.value as 'start' | 'end' }))}
                      className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    >
                      <option value="start">Start of turn</option>
                      <option value="end">End of turn</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-end gap-4 rounded border border-border-strong bg-page p-2">
                <label className="text-xs text-fg-muted">
                  Remaining Rounds
                  <input
                    type="number"
                    value={statusForm.remainingRounds ?? ''}
                    onChange={(e) => setStatusForm((f) => ({ ...f, remainingRounds: e.target.value === '' ? undefined : Number(e.target.value) }))}
                    className="mt-0.5 w-24 rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </label>
                <label className="text-xs text-fg-muted">
                  Stacks
                  <input
                    type="number"
                    value={statusForm.stacks ?? ''}
                    onChange={(e) => setStatusForm((f) => ({ ...f, stacks: e.target.value === '' ? undefined : Number(e.target.value) }))}
                    className="mt-0.5 w-24 rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                  />
                </label>
                <label className={`flex items-center gap-1 text-xs ${statusFormHasMechanicalData() ? 'text-fg-muted opacity-40' : 'text-fg-muted'}`}>
                  <input
                    type="checkbox"
                    checked={statusForm.isCondition ?? false}
                    disabled={statusFormHasMechanicalData()}
                    onChange={(e) => setStatusForm((f) => ({ ...f, isCondition: e.target.checked }))}
                  />
                  Is a condition (narrative only, no numeric effect)
                  {statusFormHasMechanicalData() && (
                    <span className="ml-1 italic">— unavailable while other fields are filled in</span>
                  )}
                </label>
                <label className="flex items-center gap-1 text-xs text-fg-muted">
                  <input
                    type="checkbox"
                    checked={statusForm.permanent ?? false}
                    onChange={(e) => setStatusForm((f) => ({ ...f, permanent: e.target.checked }))}
                  />
                  Permanent (requires confirmation to remove)
                </label>
                <div className="flex gap-3 text-xs text-fg-muted">
                  {(['wounds', 'strain'] as const).map((k) => (
                    <label key={k} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={(statusForm.blocksNaturalRecovery ?? []).includes(k)}
                        onChange={(e) =>
                          setStatusForm((f) => ({
                            ...f,
                            blocksNaturalRecovery: e.target.checked
                              ? [...(f.blocksNaturalRecovery ?? []), k]
                              : (f.blocksNaturalRecovery ?? []).filter((x) => x !== k),
                          }))
                        }
                      />
                      Blocks {k === 'wounds' ? 'Wounds' : 'Strain'} recovery
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={addStatus}
                disabled={!statusForm.label.trim()}
                className="mt-4 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
              >
                Add Status
              </button>
            </div>
          </div>
        )}
      </SheetSection>

      <SheetSection title="Critical Injuries">
        <p className="mb-3 text-sm text-fg-secondary">
          Critical Injury Total: <span className="font-semibold text-accent">{computeCritTotal(character.criticalInjuries)}</span>{' '}
          <span className="text-xs text-fg-muted">(also the automatic modifier applied to your next roll)</span>
        </p>

        {canEdit && editMode && (
          <button
            onClick={() => setShowAddCritModal(true)}
            className="mb-3 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
          >
            Add Critical Injury
          </button>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {character.criticalInjuries.map((c, index) => {
            const doc = criticalInjuryDocs.find((d) => d.id === c.injuryId)
            const viewing = viewingCritIndex === index
            return (
              <button
                key={c.id}
                onClick={() => setViewingCritIndex(viewing ? null : index)}
                className={`flex h-12 w-full items-center justify-center rounded border px-2 text-center text-xs leading-tight ${
                  viewing
                    ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-page border-warning bg-warning/10 text-fg'
                    : 'border-warning bg-warning/10 text-fg hover:bg-surface-hover'
                }`}
              >
                {doc?.name ?? c.injuryId}
              </button>
            )
          })}
          {character.criticalInjuries.length === 0 && <p className="text-sm text-fg-muted">No critical injuries.</p>}
        </div>

        {viewingCritIndex !== null && (() => {
          const c = character.criticalInjuries[viewingCritIndex]
          const doc = criticalInjuryDocs.find((d) => d.id === c.injuryId)
          if (!c || !doc) return null
          const diceCount = CRIT_SEVERITY_DICE[doc.severity] ?? 1
          return (
            <div className="mt-3 rounded-lg border border-warning bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-fg">{doc.name}</p>
                <div className="flex items-center gap-1" title={`Severity: ${doc.severity}`}>
                  {Array.from({ length: diceCount }).map((_, i) => (
                    <DifficultyDie key={i} size={18} />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-base font-medium text-fg">
                {doc.effect}
                {doc.isAltering && (
                  <span className="ml-1 font-bold text-warning">(Permanent)</span>
                )}
                {c.alterationDescription && (
                  <>
                    {' — '}
                    {c.alterationDescription}
                  </>
                )}
              </p>
              {canEdit && (
                <button
                  onClick={() => removeCriticalInjury(viewingCritIndex)}
                  className="mt-3 rounded border border-border-strong px-3 py-1.5 text-xs text-warning hover:bg-surface-hover"
                >
                  Remove
                </button>
              )}
            </div>
          )
        })()}

        {showAddCritModal && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 sm:p-4">
            <div className="flex h-full w-full flex-col overflow-y-auto border-border bg-surface p-4 sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-lg sm:border">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-fg">Add Critical Injury</h3>
                <button
                  onClick={() => {
                    setShowAddCritModal(false)
                    setCritModifierInput('')
                    setCritRollResult(null)
                  }}
                  className="rounded border border-border-strong px-3 py-1 text-sm text-fg hover:bg-surface-hover"
                >
                  Close
                </button>
              </div>

              <label className="mb-2 block text-xs text-fg-muted">
                Modifier (added to or subtracted from the roll)
                <input
                  type="number"
                  value={critModifierInput}
                  onChange={(e) => setCritModifierInput(e.target.value)}
                  disabled={!!critRollResult}
                  placeholder="0"
                  className="mt-0.5 w-full rounded border border-border-strong bg-page px-3 py-2 text-sm text-fg disabled:opacity-50"
                />
              </label>

              {computeCritTotal(character.criticalInjuries) > 0 && (
                <p className="mb-2 text-xs text-fg-muted">
                  Automatic modifier from existing injuries:{' '}
                  <span className="font-semibold text-warning">+{computeCritTotal(character.criticalInjuries)}</span>{' '}
                  (not editable — applies on top of the modifier above)
                </p>
              )}

              <button
                onClick={rollAndAddCriticalInjury}
                disabled={!!critRollResult}
                className="mt-1 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
              >
                Roll 1d100{critModifierInput && Number(critModifierInput) !== 0 ? ` ${Number(critModifierInput) > 0 ? '+' : ''}${critModifierInput}` : ''}
              </button>

              {critRollResult && (
                <div className="mt-3 rounded border border-warning bg-warning/10 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Added to character</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    Rolled {critRollResult.rawRoll}
                    {critRollResult.modifier !== 0 && ` ${critRollResult.modifier > 0 ? '+' : ''}${critRollResult.modifier} (modifier)`}
                    {critRollResult.automaticModifier > 0 && ` +${critRollResult.automaticModifier} (existing injuries)`}
                    {' = '}
                    <span className="font-semibold text-fg">{critRollResult.finalRoll}</span>
                  </p>
                  <p className="mt-1 font-semibold text-fg">{critRollResult.doc.name}</p>
                  <p className="text-xs text-fg-muted">Severity: {critRollResult.doc.severity}</p>
                  <p className="mt-1 text-sm text-fg">{critRollResult.doc.effect}</p>

                  {critRollResult.subRoll !== undefined && (
                    <div className="mt-3 rounded border-l-4 border-warning bg-page px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                        Alteration roll: {critRollResult.subRoll}
                      </p>
                      <p className="text-sm text-fg">{critRollResult.alterationDescription}</p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowAddCritModal(false)
                      setCritModifierInput('')
                      setCritRollResult(null)
                    }}
                    className="mt-3 rounded border border-border-strong px-4 py-2 text-sm text-fg hover:bg-surface-hover"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetSection>

      <SheetSection title="Motivations">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              { key: 'strength', label: 'Strength', color: '#6FCBB9' },
              { key: 'desire', label: 'Desire', color: '#6FCBB9' },
              { key: 'flaw', label: 'Flaw', color: '#E3BC80' },
              { key: 'fear', label: 'Fear', color: '#E3BC80' },
            ] as const
          ).map(({ key, label, color }) => (
            <div key={key} className="rounded-lg bg-page p-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                {label}
              </p>
              {canEdit && editMode ? (
                <textarea
                  value={character!.motivations[key] ?? ''}
                  onChange={(e) => update({ motivations: { ...character!.motivations, [key]: e.target.value } })}
                  rows={2}
                  className="mt-1 w-full rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
                />
              ) : (
                <p className="mt-1 text-sm text-fg">{character!.motivations[key] || '—'}</p>
              )}
            </div>
          ))}
        </div>
      </SheetSection>

      <SheetSection title="Description" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              { key: 'gender', label: 'Gender' },
              { key: 'age', label: 'Age' },
              { key: 'height', label: 'Height' },
              { key: 'build', label: 'Build' },
              { key: 'hair', label: 'Hair' },
              { key: 'eyes', label: 'Eyes' },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="rounded-lg bg-page p-2">
              <p className="text-xs text-fg-muted">{label}</p>
              {canEdit && editMode ? (
                <input
                  value={character!.description[key] ?? ''}
                  onChange={(e) => update({ description: { ...character!.description, [key]: e.target.value } })}
                  className="mt-1 w-full rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
                />
              ) : (
                <p className="mt-1 text-sm text-fg">{character!.description[key] || '—'}</p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 rounded-lg bg-page p-2">
          <p className="text-xs text-fg-muted">Notable Features</p>
          {canEdit && editMode ? (
            <textarea
              value={character.description.notable ?? ''}
              onChange={(e) => update({ description: { ...character.description, notable: e.target.value } })}
              rows={2}
              className="mt-1 w-full rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
            />
          ) : (
            <p className="mt-1 text-sm text-fg">{character.description.notable || '—'}</p>
          )}
        </div>
      </SheetSection>

      <SheetSection title="Currency" defaultOpen={false}>
        <div className="flex items-center gap-2">
          {canEdit && editMode ? (
            <input
              type="number"
              value={character.currency.amount}
              onChange={(e) => update({ currency: { ...character.currency, amount: Number(e.target.value) || 0 } })}
              className="w-24 rounded border border-border-strong bg-page px-2 py-1 text-fg"
            />
          ) : (
            <span className="text-lg font-semibold text-fg">{character.currency.amount}</span>
          )}
          <span className="text-sm text-fg-secondary">{character.currency.label ?? CURRENCY_LABEL}</span>
        </div>
      </SheetSection>

      <SheetSection title="Notes" defaultOpen={false}>
        {canEdit && editMode ? (
          <textarea
            value={character.notes ?? ''}
            onChange={(e) => update({ notes: e.target.value })}
            rows={4}
            className="w-full rounded border border-border-strong bg-page px-3 py-2 text-sm text-fg"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-fg">{character.notes || '—'}</p>
        )}
      </SheetSection>

      {/* Phase 3a complete for BB&B — every section built.
          Config-gated (Backrooms only, not rendered for BB&B, not built yet):
          Survival Tracks, Active Sicknesses, Faction Reputation. */}
    </div>
  )
}