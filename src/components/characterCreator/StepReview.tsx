import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { BBB_CAREERS, BBB_UNIVERSAL_GEAR_ID, BBB_SPECIES, CURRENCY_LABEL } from '../../lib/gameConfigs/bbb'
import { totalSpentXP, derivedStats, computeTalentBonuses, computeCareerSkills } from '../../lib/genesysCalc'
import { createCharacter, createCustomObject, type InventoryEntry } from '../../lib/characters'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepReview({ draft, objectDocs, skillDocs, talentDocs }: StepProps) {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const career = BBB_CAREERS.find((c) => c.name === draft.career.name)

  const spent = totalSpentXP(draft.characteristics, draft.skills, computeCareerSkills(career?.chosenSkills.pool ?? [], draft.talents, talentDocs), draft.career.chosenSkills, draft.talents)
  const available = draft.totalXP - spent

  const weapon = draft.weaponObjectId ? objectDocs.find((o) => o.id === draft.weaponObjectId) : null
  const armor = draft.armorObjectId ? objectDocs.find((o) => o.id === draft.armorObjectId) : null
  const universal = objectDocs.find((o) => o.id === BBB_UNIVERSAL_GEAR_ID)
  const gearItems = draft.gearObjectIds.map((id) => objectDocs.find((o) => o.id === id)).filter((o): o is NonNullable<typeof o> => !!o)

  const talentBonuses = computeTalentBonuses(draft.talents, talentDocs)
  const stats = derivedStats(draft.characteristics, {
    soak: (armor?.soak ?? 0) + talentBonuses.soak,
    meleeDefense: (armor?.meleeDefense ?? 0) + talentBonuses.meleeDefense,
    rangedDefense: (armor?.rangedDefense ?? 0) + talentBonuses.rangedDefense,
    woundThreshold: talentBonuses.woundThreshold,
    strainThreshold: talentBonuses.strainThreshold,
  })

  function weaponDamageDisplay(): string {
    if (!weapon) return ''
    if (weapon.damageType === 'Brawn-based') {
      const total = draft.characteristics.brawn + (weapon.damage ?? 0)
      return `${total} (Brawn ${draft.characteristics.brawn} + ${weapon.damage})`
    }
    return `${weapon.damage}`
  }

  const rankedSkills = draft.skills.filter((s) => s.rank > 0)

  // Turns the one-time chargen picks into the real, mutable inventory the
  // sheet will edit during play. Items reference Objects by id now — no
  // custom naming or baked-in qualities to materialize, since the picked
  // items are already fully defined. weaponEntryId/armorEntryId are
  // generated here (not inside materializeInventory) so handleCreate can
  // also use them to build equippedSlots correctly — equippedSlots
  // references InventoryEntry.id, never objectId, since two owned copies
  // of the same item must stay distinguishable.
  const weaponEntryId = crypto.randomUUID()
  const armorEntryId = crypto.randomUUID()

  async function materializeInventory(): Promise<InventoryEntry[]> {
    const entries: InventoryEntry[] = []
    if (draft.weaponObjectId) entries.push({ id: weaponEntryId, objectId: draft.weaponObjectId })
    if (draft.armorObjectId) entries.push({ id: armorEntryId, objectId: draft.armorObjectId, currentDurability: 3 })
    entries.push({ id: crypto.randomUUID(), objectId: BBB_UNIVERSAL_GEAR_ID })
    for (const gearId of draft.gearObjectIds) {
      const doc = objectDocs.find((o) => o.id === gearId)
      entries.push(doc?.uses !== undefined ? { id: crypto.randomUUID(), objectId: gearId, currentUses: doc.uses } : { id: crypto.randomUUID(), objectId: gearId })
    }
    // Custom items are only actually written to Firestore here, at the
    // moment the character is genuinely being created — not when the
    // player clicked "Add item" back in StepGear. That way abandoning
    // character creation partway through never leaves an orphaned item
    // in the database.
    if (draft.customItems.length > 0 && sessionId && user) {
      const ownerDisplayName = user.displayName ?? user.email ?? 'player'
      for (const item of draft.customItems) {
        const id = await createCustomObject(sessionId, user.uid, ownerDisplayName, {
          name: item.name,
          description: item.description,
          type: 'Mundane',
          rarity: 0,
          encumbrance: 0,
        })
        entries.push({ id: crypto.randomUUID(), objectId: id })
      }
    }
    return entries
  }

  async function handleCreate() {
    if (!sessionId || !user) return
    setSaving(true)
    setError('')
    try {
      const inventory = await materializeInventory()
      const equippedSlots: Record<string, string> = {}
      if (draft.weaponObjectId) equippedSlots['Main Hand'] = weaponEntryId
      if (draft.armorObjectId) equippedSlots['Chest'] = armorEntryId

      await createCharacter(user.uid, {
        sessionId,
        gameType: 'bbb',
        characterName: draft.characterName,
        species: draft.species,
        career: { name: draft.career.name, specialAbility: draft.career.specialAbility, chosenSkills: draft.career.chosenSkills },
        characteristics: draft.characteristics,
        skills: draft.skills,
        motivations: { strength: draft.strength, flaw: draft.flaw, desire: draft.desire, fear: draft.fear },
        talents: draft.talents,
        status: [],
        equippedSlots,
        inventory,
        criticalInjuries: [],
        description: draft.description,
        currency: { amount: 0, label: CURRENCY_LABEL },
        notes: draft.identityNotes.filter((n) => n.trim().length > 0).join('\n'),
        totalXP: draft.totalXP,
        currentWounds: 0,
        currentStrain: 0,
      })
      navigate(`/sessions/${sessionId}`)
    } catch (err) {
      console.error('Failed to create character:', err)
      setError('Could not save this character. Check the console for details.')
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-fg">Review</h2>

      <div className="max-w-2xl space-y-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h1 className="text-2xl font-bold text-fg">{draft.characterName}</h1>
          <p className="text-sm text-fg-secondary">
            {draft.playerName} · {BBB_SPECIES} · {draft.career.name}
          </p>
          {career && (
            <p className="mt-2 text-sm text-fg-secondary">
              <span className="text-accent">{career.specialAbility.name}</span> — {career.specialAbility.description}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Characteristics</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Object.entries(draft.characteristics).map(([key, value]) => (
              <div key={key} className="text-center">
                <p className="text-xs text-fg-muted capitalize">{key}</p>
                <p className="text-lg font-semibold text-fg">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Derived stats</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <p className="text-xs text-fg-muted">Soak</p>
              <p className="text-lg font-semibold text-fg">{stats.soak}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Wound Threshold</p>
              <p className="text-lg font-semibold text-fg">{stats.woundThreshold}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Strain Threshold</p>
              <p className="text-lg font-semibold text-fg">{stats.strainThreshold}</p>
            </div>
            <div>
              <p className="text-xs text-fg-muted">Defense (M/R)</p>
              <p className="text-lg font-semibold text-fg">{stats.meleeDefense}/{stats.rangedDefense}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">
            Skills {rankedSkills.length === 0 && <span className="text-fg-muted">(none trained)</span>}
          </h3>
          <div className="flex flex-wrap gap-2">
            {rankedSkills.map((s) => (
              <span key={s.name} className="rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg">
                {skillDocs.find((d) => d.id === s.name)?.name ?? s.name} {s.rank}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">
            Talents {draft.talents.length === 0 && <span className="text-fg-muted">(none owned)</span>}
          </h3>
          <div className="space-y-1">
            {draft.talents
              .filter((t) => {
                const maxRank = Math.max(...draft.talents.filter((x) => x.id === t.id).map((x) => x.rank))
                return t.rank === maxRank
              })
              .map((t) => {
                const talentName = talentDocs.find((d) => d.id === t.id)?.name ?? t.id
                return (
                <div key={t.id} className="rounded border border-accent bg-page px-3 py-2">
                  <p className="text-sm text-fg">
                    {talentName}
                    {t.rank > 1 ? ` (Rank ${t.rank})` : ''}
                  </p>
                  {t.skillChoices && t.skillChoices.length > 0 && (
                    <p className="text-xs text-fg-muted">
                      Skills: {t.skillChoices.map((id) => skillDocs.find((d) => d.id === id)?.name ?? id).join(', ')}
                    </p>
                  )}
                  {t.characteristicChoices && t.characteristicChoices.length > 0 && (
                    <p className="text-xs text-fg-muted capitalize">
                      Characteristics: {t.characteristicChoices.join(', ')}
                    </p>
                  )}
                </div>
                )
              })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Weapon</h3>
          {weapon ? (
            <div>
              <p className="text-fg">{weapon.name}</p>
              <p className="text-sm text-fg-secondary">
                Dmg {weaponDamageDisplay()} · Crit {weapon.crit} · {weapon.range} · Enc {weapon.encumbrance}
              </p>
              {weapon.qualities && weapon.qualities.length > 0 && (
                <p className="text-sm text-fg-secondary">
                  {weapon.qualities.map((q) => (q.rank !== undefined ? `${q.name} ${q.rank}` : q.name)).join(', ')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-fg-muted">None selected</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Armor</h3>
          {armor ? (
            <p className="text-fg">
              {armor.name}{' '}
              <span className="text-sm text-fg-muted">
                (Soak +{armor.soak}, Def {armor.meleeDefense}/{armor.rangedDefense})
              </span>
            </p>
          ) : (
            <p className="text-fg-muted">None selected</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Gear</h3>
          {universal && <p className="text-sm text-fg">{universal.name}</p>}
          {gearItems.map((item) => (
            <p key={item.id} className="text-sm text-fg">{item.name}</p>
          ))}
          {draft.customItems.map((item, i) => (
            <p key={i} className="text-sm text-fg">{item.name} <span className="text-xs text-fg-muted">(personal item)</span></p>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Personality</h3>
          <p className="text-sm text-fg-secondary"><span className="text-fg">Strength:</span> {draft.strength}</p>
          <p className="text-sm text-fg-secondary"><span className="text-fg">Flaw:</span> {draft.flaw}</p>
          <p className="text-sm text-fg-secondary"><span className="text-fg">Desire:</span> {draft.desire}</p>
          <p className="text-sm text-fg-secondary"><span className="text-fg">Fear:</span> {draft.fear}</p>
        </div>

        {Object.values(draft.description).some((v) => v && v.trim().length > 0) && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-fg">Appearance</h3>
            {draft.description.gender && <p className="text-sm text-fg-secondary"><span className="text-fg">Gender:</span> {draft.description.gender}</p>}
            {draft.description.age && <p className="text-sm text-fg-secondary"><span className="text-fg">Age:</span> {draft.description.age}</p>}
            {draft.description.height && <p className="text-sm text-fg-secondary"><span className="text-fg">Height:</span> {draft.description.height}</p>}
            {draft.description.build && <p className="text-sm text-fg-secondary"><span className="text-fg">Build:</span> {draft.description.build}</p>}
            {draft.description.hair && <p className="text-sm text-fg-secondary"><span className="text-fg">Hair:</span> {draft.description.hair}</p>}
            {draft.description.eyes && <p className="text-sm text-fg-secondary"><span className="text-fg">Eyes:</span> {draft.description.eyes}</p>}
            {draft.description.notable && <p className="text-sm text-fg-secondary"><span className="text-fg">Notable:</span> {draft.description.notable}</p>}
          </div>
        )}

        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-fg-secondary">
            XP: <span className="font-semibold text-accent">{available}</span> available / {spent} spent / {draft.totalXP} total
          </p>
        </div>

        {error && <p className="text-sm text-warning">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={saving}
          className="rounded bg-accent px-6 py-3 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg"
        >
          {saving ? 'Saving…' : 'Create Character'}
        </button>
      </div>
    </div>
  )
}