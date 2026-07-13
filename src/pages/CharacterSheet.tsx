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
  fetchUserDisplayName,
  updateCharacter,
  createCustomObject,
  type Character,
  type SkillDoc,
  type TalentDoc,
  type QualityDoc,
  type ObjectDoc,
  type CriticalInjuryDoc,
} from '../lib/characters'
import {
  derivedStats,
  computeTalentBonuses,
  computeEquippedStatBonuses,
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
import StepTalents from '../components/characterCreator/StepTalents'
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

// The 5 qualities that actually create a lingering Status entry (Burn,
// Concussive, Disorient, Ensnare, Knockdown) — everything else is either
// a passive item property or an instant one-time effect with nothing to
// track afterward. Labels use the condition name ("Prone"), not the
// quality name ("Knockdown") — reads more naturally on the sheet. These
// are starting defaults only; the actual magnitude depends on what rank
// hit the character, so every field stays editable after picking one.
const STATUS_QUICK_FILL: Record<string, Partial<StatusEntry>> = {
  Burning: {
    label: 'Burning',
    description: 'On fire. Deals damage again each round until it burns out or is treated.',
    perTurnEffect: { wounds: 1 },
    remainingRounds: 1,
  },
  Staggered: {
    label: 'Staggered',
    description: 'Rattled badly enough to lose the next few actions.',
    isCondition: true,
  },
  Disoriented: {
    label: 'Disoriented',
    description: 'Rattled, making the next actions clumsier.',
    diceModifier: [{ mode: 'upgradeDifficulty', amount: 1, appliesTo: 'combat checks' }],
  },
  Immobilized: {
    label: 'Immobilized',
    description: 'Trapped in place until able to break free.',
    isCondition: true,
  },
  Prone: {
    label: 'Prone',
    description: 'Knocked off their feet.',
    isCondition: true,
  },
}

const DICE_MODIFIER_LABELS: Record<string, string> = {
  addBoost: 'Add Boost',
  addSetback: 'Add Setback',
  upgradeDifficulty: 'Upgrade Difficulty',
  downgradeDifficulty: 'Downgrade Difficulty',
}

const STAT_LABELS: Record<string, string> = {
  soak: 'Soak',
  meleeDefense: 'Melee Defense',
  rangedDefense: 'Ranged Defense',
  woundThreshold: 'Wound Threshold',
  strainThreshold: 'Strain Threshold',
}

const CHARACTERISTIC_LABELS: Record<string, string> = {
  brawn: 'Brawn',
  agility: 'Agility',
  intellect: 'Intellect',
  cunning: 'Cunning',
  willpower: 'Willpower',
  presence: 'Presence',
}

function blankStatusForm(): Omit<StatusEntry, 'id'> {
  return {
    label: '',
    description: '',
    diceModifier: [],
    statBonus: {},
    characteristicModifiers: {},
    perTurnEffect: {},
    remainingRounds: undefined,
    incomingDamageModifier: {},
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
// exactly how the "Add Item preview is missing weapon stats" bug
// happened — they'd quietly drifted apart. One component now, used in
// both places, so that can't happen again.
function ItemDetail({
  doc,
  entry,
  qualityDocs,
  skillDocs,
}: {
  doc: ObjectDoc
  entry?: InventoryEntry
  qualityDocs: QualityDoc[]
  skillDocs: SkillDoc[]
}) {
  const combinedEffect = [doc.effect, doc.bonus_effects].filter(Boolean).join(' ')
  const usesValue = entry?.currentUses ?? doc.uses
  const durabilityValue = entry?.currentDurability ?? doc.durability
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
  if (doc.type === 'Weapon' && doc.range) secondary.push({ label: 'Range', value: doc.range })
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
  if (VISIBLE_ITEM_FIELDS.craftSkill && (doc.type === 'Weapon' || doc.type === 'Armor') && doc.craft_skill) {
    secondary.push({ label: 'Craft skill', value: doc.craft_skill })
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
                  {doc.damageType === 'Brawn-based' ? `Brawn + ${doc.damage}` : doc.damage}
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
            {doc.statModifiers.map((m, i) => `${i > 0 ? ', ' : ''}${m.stat} ${m.amount > 0 ? '+' : ''}${m.amount}`)}
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

export default function CharacterSheet() {
  const { characterId } = useParams()
  const { user } = useAuth()

  const [character, setCharacter] = useState<Character | null | undefined>(undefined)
  const [skillDocs, setSkillDocs] = useState<SkillDoc[] | null>(null)
  const [talentDocs, setTalentDocs] = useState<TalentDoc[] | null>(null)
  const [qualityDocs, setQualityDocs] = useState<QualityDoc[] | null>(null)
  const [objectDocs, setObjectDocs] = useState<ObjectDoc[] | null>(null)
  const [criticalInjuryDocs, setCriticalInjuryDocs] = useState<CriticalInjuryDoc[] | null>(null)
  const [playerDisplayName, setPlayerDisplayName] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [showTalentModal, setShowTalentModal] = useState(false)
  const [viewingOwnedTalentId, setViewingOwnedTalentId] = useState<string | null>(null)
  const [viewingInventoryIndex, setViewingInventoryIndex] = useState<number | null>(null)
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
  const [customItemForm, setCustomItemForm] = useState({
    name: '',
    description: '',
    type: 'Mundane' as ObjectDoc['type'],
    rarity: 0,
    encumbrance: 0,
    // Weapon
    damage: 0,
    damageType: 'Brawn-based' as 'Brawn-based' | 'Fixed',
    crit: 0,
    range: 'Engaged' as NonNullable<ObjectDoc['range']>,
    skill: '',
    qualityNames: [] as string[],
    // Armor
    soak: 0,
    meleeDefense: 0,
    rangedDefense: 0,
    // Food/Drink
    hungerStacksRemoved: 0,
    thirstStacksRemoved: 0,
    bonusEffects: '',
    // Light Source
    lightStepBoost: 0,
    lightCap: '',
    duration: 0,
    fuelType: 'Batteries' as NonNullable<ObjectDoc['fuel_type']>,
    // Tool/Mundane
    effect: '',
    // Shared
    durability: undefined as number | undefined,
    uses: undefined as number | undefined,
    usesCannotRestore: false,
  })

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
    fetchObjects().then(setObjectDocs)
    fetchCriticalInjuries().then(setCriticalInjuryDocs)
  }, [])

  if (character === undefined) {
    return <p className="text-fg-secondary">Loading character…</p>
  }
  if (character === null) {
    return <p className="text-fg-secondary">This character doesn't exist, or you don't have access to it.</p>
  }
  if (character.gameType !== 'bbb') {
    return <p className="text-fg-secondary">The sheet for {character.gameType} isn't built yet — only BB&B is supported right now.</p>
  }
  if (!skillDocs || !talentDocs || !qualityDocs || !objectDocs || !criticalInjuryDocs) {
    return <p className="text-fg-secondary">Loading game data…</p>
  }

  const canEdit = character.uid === user?.uid
  const objectMap = new Map(objectDocs.map((o) => [o.id, o]))
  const career = GAME_CONFIG.careers.find((c) => c.name === character.career.name)

  const talentBonuses = computeTalentBonuses(character.talents, talentDocs)
  const equippedBonuses = computeEquippedStatBonuses(character.equippedSlots, character.inventory, objectMap, qualityDocs)
  const statusBonuses = computeStatusBonuses(character.status)
  const effectiveCharacteristics = computeEffectiveCharacteristics(character.characteristics, character.status)
  const stats = derivedStats(effectiveCharacteristics, {
    soak: talentBonuses.soak + equippedBonuses.soak + statusBonuses.soak,
    meleeDefense: talentBonuses.meleeDefense + equippedBonuses.meleeDefense + statusBonuses.meleeDefense,
    rangedDefense: talentBonuses.rangedDefense + equippedBonuses.rangedDefense + statusBonuses.rangedDefense,
    woundThreshold: talentBonuses.woundThreshold + equippedBonuses.woundThreshold + statusBonuses.woundThreshold,
    strainThreshold: talentBonuses.strainThreshold + equippedBonuses.strainThreshold + statusBonuses.strainThreshold,
  })

  const careerSkillNames = computeCareerSkills(career?.chosenSkills.pool ?? [], character.talents, talentDocs)
  const spentXP = totalSpentXP(
    character.characteristics,
    character.skills,
    careerSkillNames,
    character.career.chosenSkills,
    character.talents
  )
  const availableXP = character.totalXP - spentXP

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

  // First active slot the item's own `slots` field matches — BB&B only
  // has 3, so there's never real ambiguity here; a fuller game would need
  // real slot-choice UI once an item can fit more than one active slot.
  function equipItem(entry: InventoryEntry) {
    const doc = objectMap.get(entry.objectId)
    const targetSlot = doc?.slots?.find((s) => (GAME_CONFIG.activeSlots as readonly string[]).includes(s))
    if (!targetSlot) return
    update({ equippedSlots: { ...character!.equippedSlots, [targetSlot]: entry.id } })
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

  function removeItem(index: number) {
    const entry = character!.inventory[index]
    unequipItem(entry.id)
    update({ inventory: character!.inventory.filter((_, i) => i !== index) })
    setViewingInventoryIndex(null)
  }

  function applyStatusPreset(presetName: string) {
    const preset = STATUS_QUICK_FILL[presetName]
    if (!preset) {
      setStatusForm(blankStatusForm())
      return
    }
    setStatusForm({ ...blankStatusForm(), ...preset })
  }

  // Only label is actually required — every other field on StatusEntry
  // is optional, and stays optional here too. Empty statBonus/perTurnEffect/
  // incomingDamageModifier objects and empty arrays are stripped before
  // saving so they don't clutter the stored entry with meaningless {}.
  // Used to gate "Is a condition" — a pure condition by definition has no
  // other mechanical data attached. If any of these have real content,
  // the checkbox becomes unavailable rather than letting the two
  // contradict each other.
  function statusFormHasMechanicalData(): boolean {
    const f = statusForm
    return (
      (f.diceModifier?.length ?? 0) > 0 ||
      Object.values(f.statBonus ?? {}).some((v) => v !== undefined) ||
      Object.values(f.characteristicModifiers ?? {}).some((v) => v !== undefined) ||
      Object.values(f.perTurnEffect ?? {}).some((v) => v !== undefined) ||
      f.remainingRounds !== undefined ||
      Object.values(f.incomingDamageModifier ?? {}).some((v) => v !== undefined) ||
      (f.blocksNaturalRecovery?.length ?? 0) > 0 ||
      f.stacks !== undefined
    )
  }

  function addStatus() {
    if (!statusForm.label.trim()) return
    const entry: StatusEntry = { id: crypto.randomUUID(), label: statusForm.label.trim() }
    if (statusForm.description?.trim()) entry.description = statusForm.description.trim()
    if (statusForm.diceModifier && statusForm.diceModifier.length > 0) entry.diceModifier = statusForm.diceModifier
    if (statusForm.statBonus && Object.values(statusForm.statBonus).some((v) => v !== undefined)) {
      entry.statBonus = statusForm.statBonus
    }
    if (statusForm.characteristicModifiers && Object.values(statusForm.characteristicModifiers).some((v) => v !== undefined)) {
      entry.characteristicModifiers = statusForm.characteristicModifiers
    }
    if (statusForm.perTurnEffect && Object.values(statusForm.perTurnEffect).some((v) => v !== undefined)) {
      entry.perTurnEffect = statusForm.perTurnEffect
    }
    if (statusForm.remainingRounds !== undefined) entry.remainingRounds = statusForm.remainingRounds
    if (statusForm.incomingDamageModifier && Object.values(statusForm.incomingDamageModifier).some((v) => v !== undefined)) {
      entry.incomingDamageModifier = statusForm.incomingDamageModifier
    }
    if (statusForm.blocksNaturalRecovery && statusForm.blocksNaturalRecovery.length > 0) {
      entry.blocksNaturalRecovery = statusForm.blocksNaturalRecovery
    }
    if (statusForm.stacks !== undefined) entry.stacks = statusForm.stacks
    if (statusForm.isCondition && !statusFormHasMechanicalData()) entry.isCondition = true
    if (statusForm.permanent) entry.permanent = true

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
    }

    update({ criticalInjuries: [...character!.criticalInjuries, entry] })
    setCritRollResult(result)
  }

  function removeCriticalInjury(index: number) {
    update({ criticalInjuries: character!.criticalInjuries.filter((_, i) => i !== index) })
    setViewingCritIndex(null)
  }

  async function handleCreateCustomItem() {
    if (!character!.sessionId || !user || !customItemForm.name.trim()) return
    const ownerDisplayName = user.displayName ?? user.email ?? 'player'
    const f = customItemForm

    const payload: Omit<ObjectDoc, 'id' | 'sessionId' | 'ownerId'> = {
      name: f.name.trim(),
      description: f.description.trim(),
      type: f.type,
      rarity: f.rarity,
      encumbrance: f.encumbrance,
    }
    if (f.durability !== undefined) payload.durability = f.durability
    if (f.uses !== undefined) {
      payload.uses = f.uses
      if (f.usesCannotRestore) payload.usesCannotRestore = true
    }
    if (f.type === 'Weapon') {
      payload.damage = f.damage
      payload.damageType = f.damageType
      payload.crit = f.crit
      payload.range = f.range
      if (f.skill) payload.skill = f.skill
      if (f.qualityNames.length > 0) payload.qualities = f.qualityNames.map((name) => ({ name }))
    }
    if (f.type === 'Armor') {
      payload.soak = f.soak
      payload.meleeDefense = f.meleeDefense
      payload.rangedDefense = f.rangedDefense
    }
    if (f.type === 'Food') payload.hunger_stacks_removed = f.hungerStacksRemoved
    if (f.type === 'Drink') payload.thirst_stacks_removed = f.thirstStacksRemoved
    if ((f.type === 'Food' || f.type === 'Drink') && f.bonusEffects.trim()) payload.bonus_effects = f.bonusEffects.trim()
    if (f.type === 'Light Source') {
      payload.light_step_boost = f.lightStepBoost
      if (f.lightCap) payload.light_cap = f.lightCap
      payload.duration = f.duration
      payload.fuel_type = f.fuelType
    }
    if ((f.type === 'Tool' || f.type === 'Mundane') && f.effect.trim()) payload.effect = f.effect.trim()

    const id = await createCustomObject(character!.sessionId, user.uid, ownerDisplayName, payload)
    setObjectDocs((prev) => [...(prev ?? []), { ...payload, id, sessionId: character!.sessionId, ownerId: user.uid }])
    addItem(id)
    setShowCustomItemForm(false)
    setCustomItemForm({
      name: '', description: '', type: 'Mundane', rarity: 0, encumbrance: 0,
      damage: 0, damageType: 'Brawn-based', crit: 0, range: 'Engaged', skill: '', qualityNames: [],
      soak: 0, meleeDefense: 0, rangedDefense: 0,
      hungerStacksRemoved: 0, thirstStacksRemoved: 0, bonusEffects: '',
      lightStepBoost: 0, lightCap: '', duration: 0, fuelType: 'Batteries',
      effect: '', durability: undefined, uses: undefined, usesCannotRestore: false,
    })
  }

  function addItem(objectId: string) {
    const doc = objectMap.get(objectId)
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
            return (
              <button
                key={entry.id}
                onClick={() => setViewingInventoryIndex(viewing ? null : index)}
                className={`flex h-12 w-full items-center justify-center rounded border px-2 text-center text-xs leading-tight ${
                  entry.destroyed
                    ? 'border-border bg-page text-fg-muted opacity-50'
                    : viewing
                      ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-page border-accent bg-accent/10 text-fg'
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
              <ItemDetail doc={doc} entry={entry} qualityDocs={qualityDocs} skillDocs={skillDocs} />

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
                  {entry.currentUses !== undefined && entry.currentUses > 0 && (
                    <button
                      onClick={() => useItem(viewingInventoryIndex)}
                      className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
                    >
                      Use
                    </button>
                  )}
                  {doc.qualities?.some((q) => qualityDocs.find((qd) => qd.name === q.name)?.destroysOnUse) &&
                    entry.currentUses === undefined && (
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
                        <ItemDetail doc={viewingDoc} qualityDocs={qualityDocs} skillDocs={skillDocs} />
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
                  <div className="min-h-0 flex-1 overflow-y-auto rounded border border-border bg-page p-3">
                    <p className="mb-2 text-sm text-fg-secondary">
                      Custom doesn't mean simple — every field a real item has is available here too,
                      not just name and description.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        value={customItemForm.name}
                        onChange={(e) => setCustomItemForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Item name"
                        className="w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm text-fg"
                      />
                      <select
                        value={customItemForm.type}
                        onChange={(e) => setCustomItemForm((f) => ({ ...f, type: e.target.value as ObjectDoc['type'] }))}
                        className="w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm text-fg"
                      >
                        <option value="Weapon">Weapon</option>
                        <option value="Armor">Armor</option>
                        <option value="Food">Food</option>
                        <option value="Drink">Drink</option>
                        <option value="Light Source">Light Source</option>
                        <option value="Tool">Tool</option>
                        <option value="Mundane">Mundane</option>
                      </select>
                    </div>
                    <textarea
                      value={customItemForm.description}
                      onChange={(e) => setCustomItemForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Description (optional)"
                      rows={2}
                      className="mt-2 w-full rounded border border-border-strong bg-surface px-3 py-2 text-sm text-fg"
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <label className="text-xs text-fg-muted">
                        Rarity
                        <input
                          type="number"
                          value={customItemForm.rarity}
                          onChange={(e) => setCustomItemForm((f) => ({ ...f, rarity: Number(e.target.value) || 0 }))}
                          className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
                        />
                      </label>
                      <label className="text-xs text-fg-muted">
                        Encumbrance
                        <input
                          type="number"
                          value={customItemForm.encumbrance}
                          onChange={(e) => setCustomItemForm((f) => ({ ...f, encumbrance: Number(e.target.value) || 0 }))}
                          className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
                        />
                      </label>
                      {(customItemForm.type === 'Weapon' || customItemForm.type === 'Armor') && (
                        <label className="text-xs text-fg-muted">
                          Durability
                          <input
                            type="number"
                            value={customItemForm.durability ?? 3}
                            onChange={(e) => setCustomItemForm((f) => ({ ...f, durability: Number(e.target.value) || 0 }))}
                            className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
                          />
                        </label>
                      )}
                      {(customItemForm.type === 'Food' || customItemForm.type === 'Drink' || customItemForm.type === 'Tool') && (
                        <>
                          <label className="text-xs text-fg-muted">
                            Uses
                            <input
                              type="number"
                              value={customItemForm.uses ?? ''}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, uses: e.target.value === '' ? undefined : Number(e.target.value) }))}
                              placeholder="Unlimited"
                              className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
                            />
                          </label>
                          <label className="flex items-center gap-1 self-end text-xs text-fg-muted">
                            <input
                              type="checkbox"
                              checked={customItemForm.usesCannotRestore}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, usesCannotRestore: e.target.checked }))}
                            />
                            Cannot restore uses
                          </label>
                        </>
                      )}
                    </div>

                    {customItemForm.type === 'Weapon' && (
                      <div className="mt-3 rounded border border-border-strong bg-surface p-2">
                        <p className="mb-2 text-xs font-semibold text-fg-secondary">Weapon fields</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <label className="text-xs text-fg-muted">
                            Damage
                            <input
                              type="number"
                              value={customItemForm.damage}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, damage: Number(e.target.value) || 0 }))}
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            />
                          </label>
                          <label className="text-xs text-fg-muted">
                            Damage Type
                            <select
                              value={customItemForm.damageType}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, damageType: e.target.value as 'Brawn-based' | 'Fixed' }))}
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            >
                              <option value="Brawn-based">Brawn-based</option>
                              <option value="Fixed">Fixed</option>
                            </select>
                          </label>
                          <label className="text-xs text-fg-muted">
                            Critical
                            <input
                              type="number"
                              value={customItemForm.crit}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, crit: Number(e.target.value) || 0 }))}
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            />
                          </label>
                          <label className="text-xs text-fg-muted">
                            Range
                            <select
                              value={customItemForm.range}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, range: e.target.value as NonNullable<ObjectDoc['range']> }))}
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            >
                              <option value="Engaged">Engaged</option>
                              <option value="Short">Short</option>
                              <option value="Medium">Medium</option>
                              <option value="Long">Long</option>
                              <option value="Extreme">Extreme</option>
                            </select>
                          </label>
                        </div>
                        <label className="mt-2 block text-xs text-fg-muted">
                          Governing skill
                          <select
                            value={customItemForm.skill}
                            onChange={(e) => setCustomItemForm((f) => ({ ...f, skill: e.target.value }))}
                            className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                          >
                            <option value="">None</option>
                            {BBB_SKILLS.map((skillId) => (
                              <option key={skillId} value={skillId}>
                                {skillDocs.find((d) => d.id === skillId)?.name ?? skillId}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="mt-2 block text-xs text-fg-muted">
                          Qualities (select any that apply)
                          <select
                            multiple
                            value={customItemForm.qualityNames}
                            onChange={(e) =>
                              setCustomItemForm((f) => ({
                                ...f,
                                qualityNames: Array.from(e.target.selectedOptions).map((o) => o.value),
                              }))
                            }
                            className="mt-0.5 h-24 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                          >
                            {qualityDocs.map((q) => (
                              <option key={q.name} value={q.name}>{q.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                    {customItemForm.type === 'Armor' && (
                      <div className="mt-3 rounded border border-border-strong bg-surface p-2">
                        <p className="mb-2 text-xs font-semibold text-fg-secondary">Armor fields</p>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="text-xs text-fg-muted">
                            Soak
                            <input
                              type="number"
                              value={customItemForm.soak}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, soak: Number(e.target.value) || 0 }))}
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            />
                          </label>
                          <label className="text-xs text-fg-muted">
                            Melee Defense
                            <input
                              type="number"
                              value={customItemForm.meleeDefense}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, meleeDefense: Number(e.target.value) || 0 }))}
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            />
                          </label>
                          <label className="text-xs text-fg-muted">
                            Ranged Defense
                            <input
                              type="number"
                              value={customItemForm.rangedDefense}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, rangedDefense: Number(e.target.value) || 0 }))}
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {(customItemForm.type === 'Food' || customItemForm.type === 'Drink') && (
                      <div className="mt-3 rounded border border-border-strong bg-surface p-2">
                        <p className="mb-2 text-xs font-semibold text-fg-secondary">
                          {customItemForm.type} fields
                        </p>
                        <label className="block text-xs text-fg-muted">
                          {customItemForm.type === 'Food' ? 'Hunger stacks removed' : 'Thirst stacks removed'}
                          <input
                            type="number"
                            value={customItemForm.type === 'Food' ? customItemForm.hungerStacksRemoved : customItemForm.thirstStacksRemoved}
                            onChange={(e) =>
                              setCustomItemForm((f) =>
                                f.type === 'Food'
                                  ? { ...f, hungerStacksRemoved: Number(e.target.value) || 0 }
                                  : { ...f, thirstStacksRemoved: Number(e.target.value) || 0 }
                              )
                            }
                            className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                          />
                        </label>
                        <label className="mt-2 block text-xs text-fg-muted">
                          Bonus effect (optional)
                          <input
                            value={customItemForm.bonusEffects}
                            onChange={(e) => setCustomItemForm((f) => ({ ...f, bonusEffects: e.target.value }))}
                            className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                          />
                        </label>
                      </div>
                    )}

                    {customItemForm.type === 'Light Source' && (
                      <div className="mt-3 rounded border border-border-strong bg-surface p-2">
                        <p className="mb-2 text-xs font-semibold text-fg-secondary">Light Source fields</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <label className="text-xs text-fg-muted">
                            Light boost
                            <input
                              type="number"
                              value={customItemForm.lightStepBoost}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, lightStepBoost: Number(e.target.value) || 0 }))}
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            />
                          </label>
                          <label className="text-xs text-fg-muted">
                            Light cap
                            <input
                              value={customItemForm.lightCap}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, lightCap: e.target.value }))}
                              placeholder="e.g. Well Lit"
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            />
                          </label>
                          <label className="text-xs text-fg-muted">
                            Duration
                            <input
                              type="number"
                              value={customItemForm.duration}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, duration: Number(e.target.value) || 0 }))}
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            />
                          </label>
                          <label className="text-xs text-fg-muted">
                            Fuel type
                            <select
                              value={customItemForm.fuelType}
                              onChange={(e) => setCustomItemForm((f) => ({ ...f, fuelType: e.target.value as NonNullable<ObjectDoc['fuel_type']> }))}
                              className="mt-0.5 w-full rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
                            >
                              <option value="Batteries">Batteries</option>
                              <option value="Gasoline">Gasoline</option>
                              <option value="Single Use">Single Use</option>
                              <option value="None">None</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    )}

                    {(customItemForm.type === 'Tool' || customItemForm.type === 'Mundane') && (
                      <label className="mt-3 block text-xs text-fg-muted">
                        Effect (optional — leave blank for a purely cosmetic item)
                        <input
                          value={customItemForm.effect}
                          onChange={(e) => setCustomItemForm((f) => ({ ...f, effect: e.target.value }))}
                          className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-sm text-fg"
                        />
                      </label>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handleCreateCustomItem}
                        disabled={!customItemForm.name.trim()}
                        className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
                      >
                        Create and Add
                      </button>
                      <button
                        onClick={() => setShowCustomItemForm(false)}
                        className="rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
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
                        <DicePool ability={pool.ability} proficiency={pool.proficiency} />
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
                {s.diceModifier && s.diceModifier.length > 0 && (
                  <>
                    <dt className="text-fg-muted">Dice:</dt>
                    <dd className="text-fg">
                      {s.diceModifier.map((d, i) => (
                        <span key={i}>{i > 0 && ', '}{DICE_MODIFIER_LABELS[d.mode] ?? d.mode} {d.amount} ({d.appliesTo})</span>
                      ))}
                    </dd>
                  </>
                )}
                {s.statBonus && Object.entries(s.statBonus).some(([, v]) => v !== undefined) && (
                  <>
                    <dt className="text-fg-muted">Stats:</dt>
                    <dd className="text-fg">
                      {(Object.entries(s.statBonus) as [string, number | undefined][])
                        .filter(([, v]) => v !== undefined)
                        .map(([k, v]) => `${STAT_LABELS[k] ?? k} ${v! > 0 ? '+' : ''}${v}`)
                        .join(', ')}
                    </dd>
                  </>
                )}
                {s.perTurnEffect && (s.perTurnEffect.wounds !== undefined || s.perTurnEffect.strain !== undefined) && (
                  <>
                    <dt className="text-fg-muted">Per turn:</dt>
                    <dd className="text-fg">
                      {s.perTurnEffect.wounds !== undefined && `${s.perTurnEffect.wounds} wounds`}
                      {s.perTurnEffect.wounds !== undefined && s.perTurnEffect.strain !== undefined && ', '}
                      {s.perTurnEffect.strain !== undefined && `${s.perTurnEffect.strain} strain`}
                    </dd>
                  </>
                )}
                {s.remainingRounds !== undefined && (
                  <>
                    <dt className="text-fg-muted">Rounds left:</dt>
                    <dd className="text-fg">{s.remainingRounds}</dd>
                  </>
                )}
                {s.incomingDamageModifier && (s.incomingDamageModifier.wounds !== undefined || s.incomingDamageModifier.strain !== undefined) && (
                  <>
                    <dt className="text-fg-muted">Incoming dmg:</dt>
                    <dd className="text-fg">
                      {s.incomingDamageModifier.wounds !== undefined && `${s.incomingDamageModifier.wounds > 0 ? '+' : ''}${s.incomingDamageModifier.wounds} wounds`}
                      {s.incomingDamageModifier.wounds !== undefined && s.incomingDamageModifier.strain !== undefined && ', '}
                      {s.incomingDamageModifier.strain !== undefined && `${s.incomingDamageModifier.strain > 0 ? '+' : ''}${s.incomingDamageModifier.strain} strain`}
                    </dd>
                  </>
                )}
                {s.blocksNaturalRecovery && s.blocksNaturalRecovery.length > 0 && (
                  <>
                    <dt className="text-fg-muted">Blocks recovery:</dt>
                    <dd className="text-fg">{s.blocksNaturalRecovery.map((k) => (k === 'wounds' ? 'Wounds' : 'Strain')).join(', ')}</dd>
                  </>
                )}
                {s.characteristicModifiers && Object.entries(s.characteristicModifiers).some(([, v]) => v !== undefined) && (
                  <>
                    <dt className="text-fg-muted">Characteristics:</dt>
                    <dd className="text-fg">
                      {(Object.entries(s.characteristicModifiers) as [string, number | undefined][])
                        .filter(([, v]) => v !== undefined)
                        .map(([k, v]) => `${CHARACTERISTIC_LABELS[k] ?? k} ${v! > 0 ? '+' : ''}${v}`)
                        .join(', ')}
                    </dd>
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
                  {Object.keys(STATUS_QUICK_FILL).map((name) => (
                    <option key={name} value={name}>{name}</option>
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
                  Dice Modifiers
                  <button
                    onClick={() =>
                      setStatusForm((f) => ({
                        ...f,
                        diceModifier: [...(f.diceModifier ?? []), { mode: 'addSetback', amount: 1, appliesTo: '' }],
                      }))
                    }
                    className="rounded border border-border-strong px-2 py-0.5 text-xs text-fg hover:bg-surface-hover"
                  >
                    + Add
                  </button>
                </p>
                {(statusForm.diceModifier ?? []).map((d, i) => (
                  <div key={i} className="mt-1 flex flex-wrap items-center gap-1">
                    <select
                      value={d.mode}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          diceModifier: (f.diceModifier ?? []).map((x, j) =>
                            j === i ? { ...x, mode: e.target.value as typeof d.mode } : x
                          ),
                        }))
                      }
                      className="rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    >
                      <option value="addBoost">Add Boost</option>
                      <option value="addSetback">Add Setback</option>
                      <option value="upgradeDifficulty">Upgrade Difficulty</option>
                      <option value="downgradeDifficulty">Downgrade Difficulty</option>
                    </select>
                    <input
                      type="number"
                      value={d.amount}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          diceModifier: (f.diceModifier ?? []).map((x, j) =>
                            j === i ? { ...x, amount: Number(e.target.value) || 0 } : x
                          ),
                        }))
                      }
                      className="w-14 rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                    <input
                      value={d.appliesTo}
                      onChange={(e) =>
                        setStatusForm((f) => ({
                          ...f,
                          diceModifier: (f.diceModifier ?? []).map((x, j) =>
                            j === i ? { ...x, appliesTo: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Applies to…"
                      className="flex-1 rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                    />
                    <button
                      onClick={() =>
                        setStatusForm((f) => ({ ...f, diceModifier: (f.diceModifier ?? []).filter((_, j) => j !== i) }))
                      }
                      className="rounded border border-border-strong px-2 py-1 text-xs text-warning hover:bg-surface-hover"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 rounded border border-border-strong bg-page p-2">
                <p className="mb-1 text-xs font-semibold text-fg-secondary">Stat Bonus</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(['soak', 'meleeDefense', 'rangedDefense', 'woundThreshold', 'strainThreshold'] as const).map((stat) => (
                    <label key={stat} className="text-xs text-fg-muted">
                      {STAT_LABELS[stat]}
                      <input
                        type="number"
                        value={statusForm.statBonus?.[stat] ?? ''}
                        onChange={(e) =>
                          setStatusForm((f) => ({
                            ...f,
                            statBonus: { ...f.statBonus, [stat]: e.target.value === '' ? undefined : Number(e.target.value) },
                          }))
                        }
                        className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-2 rounded border border-border-strong bg-page p-2">
                <p className="mb-1 text-xs font-semibold text-fg-secondary">Characteristic Modifiers</p>
                <p className="mb-1 text-xs text-fg-muted">
                  Temporary — separate from XP-purchased increases. Can push a characteristic below its starting value.
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {CHARACTERISTIC_ORDER.map(({ key, label }) => (
                    <label key={key} className="text-xs text-fg-muted">
                      {label}
                      <input
                        type="number"
                        min={-5}
                        max={5}
                        value={statusForm.characteristicModifiers?.[key] ?? ''}
                        onChange={(e) =>
                          setStatusForm((f) => ({
                            ...f,
                            characteristicModifiers: {
                              ...f.characteristicModifiers,
                              [key]: e.target.value === '' ? undefined : Number(e.target.value),
                            },
                          }))
                        }
                        className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded border border-border-strong bg-page p-2">
                  <p className="mb-1 text-xs font-semibold text-fg-secondary">Per-Turn Effect</p>
                  <div className="grid grid-cols-2 gap-2">
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
                  </div>
                </div>
                <div className="rounded border border-border-strong bg-page p-2">
                  <p className="mb-1 text-xs font-semibold text-fg-secondary">Incoming Damage Modifier</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-fg-muted">
                      Wounds
                      <input
                        type="number"
                        value={statusForm.incomingDamageModifier?.wounds ?? ''}
                        onChange={(e) =>
                          setStatusForm((f) => ({
                            ...f,
                            incomingDamageModifier: { ...f.incomingDamageModifier, wounds: e.target.value === '' ? undefined : Number(e.target.value) },
                          }))
                        }
                        className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                      />
                    </label>
                    <label className="text-xs text-fg-muted">
                      Strain
                      <input
                        type="number"
                        value={statusForm.incomingDamageModifier?.strain ?? ''}
                        onChange={(e) =>
                          setStatusForm((f) => ({
                            ...f,
                            incomingDamageModifier: { ...f.incomingDamageModifier, strain: e.target.value === '' ? undefined : Number(e.target.value) },
                          }))
                        }
                        className="mt-0.5 w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-fg"
                      />
                    </label>
                  </div>
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