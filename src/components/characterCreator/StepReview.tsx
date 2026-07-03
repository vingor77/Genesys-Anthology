import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  BBB_CAREERS,
  BBB_WEAPON_TEMPLATES,
  BBB_STARTING_ARMOR,
} from '../../lib/gameConfigs/bbb'
import { totalSpentXP, derivedStats } from '../../lib/genesysCalc'
import { createCharacter } from '../../lib/characters'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepReview({ draft }: StepProps) {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const career = BBB_CAREERS.find((c) => c.name === draft.career)
  const careerSkillNames = career?.skills ?? []

  const spent = totalSpentXP(
    draft.characteristics,
    draft.skills,
    careerSkillNames,
    draft.freeSkillNames,
    draft.talents
  )
  const available = draft.totalXP - spent

  const stats = derivedStats(
    draft.characteristics,
    draft.armor ? BBB_STARTING_ARMOR.soak : 0,
    draft.armor ? BBB_STARTING_ARMOR.meleeDefense : 0,
    draft.armor ? BBB_STARTING_ARMOR.rangedDefense : 0
  )

  const weaponTemplate = draft.weapon
    ? BBB_WEAPON_TEMPLATES.find((t) => t.id === draft.weapon!.templateId)
    : null

  function weaponDamageDisplay(): string {
    if (!weaponTemplate) return ''
    if (weaponTemplate.category === 'melee') {
      const total = draft.characteristics.brawn + weaponTemplate.damage
      return `${total} (Brawn ${draft.characteristics.brawn} + ${weaponTemplate.damage})`
    }
    const momentumBonus = weaponTemplate.hasMomentum ? Math.floor(draft.characteristics.brawn / 2) : 0
    if (momentumBonus > 0) {
      return `${weaponTemplate.damage + momentumBonus} (${weaponTemplate.damage} base + ${momentumBonus} Momentum)`
    }
    return `${weaponTemplate.damage}`
  }

  const rankedSkills = draft.skills.filter((s) => s.rank > 0)
  const filledIdentityNotes = draft.identityNotes.filter((n) => n.trim().length > 0)

  // Choices are stored per-rank (e.g. Knack For It's rank 1 and rank 2 each
  // pick their own skills) — this gathers everything picked across every
  // owned rank of a given talent, since that's what's actually relevant
  // to show for "what did this talent give me."
  function skillChoicesFor(name: string): string[] {
    return Object.entries(draft.talentSkillChoices)
      .filter(([key]) => key.startsWith(`${name}:`))
      .flatMap(([, values]) => values)
      .filter(Boolean)
  }

  function characteristicChoicesFor(name: string): string[] {
    return Object.entries(draft.talentCharacteristicChoices)
      .filter(([key]) => key.startsWith(`${name}:`))
      .flatMap(([, values]) => values)
      .filter(Boolean)
  }

  async function handleCreate() {
    if (!sessionId || !user) return
    setSaving(true)
    setError('')
    try {
      await createCharacter(sessionId, user.uid, {
        characterName: draft.characterName,
        playerName: draft.playerName,
        speciesArchetype: draft.speciesArchetype,
        career: draft.career,
        characteristics: draft.characteristics,
        skills: draft.skills,
        freeSkillNames: draft.freeSkillNames,
        talents: draft.talents,
        talentSkillChoices: draft.talentSkillChoices,
        talentCharacteristicChoices: draft.talentCharacteristicChoices,
        weapon: draft.weapon,
        armor: draft.armor,
        identityNotes: draft.identityNotes,
        totalXP: draft.totalXP,
        strength: draft.strength,
        flaw: draft.flaw,
        desire: draft.desire,
        fear: draft.fear,
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
            {draft.playerName} · {draft.speciesArchetype} · {draft.career}
          </p>
          {career && (
            <p className="mt-2 text-sm text-fg-secondary">
              <span className="text-accent">{career.specialAbility.name}</span> —{' '}
              {career.specialAbility.description}
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
              <p className="text-lg font-semibold text-fg">
                {stats.meleeDefense}/{stats.rangedDefense}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">
            Skills {rankedSkills.length === 0 && <span className="text-fg-muted">(none trained)</span>}
          </h3>
          <div className="flex flex-wrap gap-2">
            {rankedSkills.map((s) => (
              <span
                key={s.name}
                className="rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
              >
                {s.name} {s.rank}
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
                // Only show the highest rank per talent name, not every intermediate entry
                const maxRank = Math.max(...draft.talents.filter((x) => x.name === t.name).map((x) => x.rank))
                return t.rank === maxRank
              })
              .map((t) => {
                const skillPicks = skillChoicesFor(t.name)
                const characteristicPicks = characteristicChoicesFor(t.name)
                return (
                  <div key={t.name} className="rounded border border-accent bg-page px-3 py-2">
                    <p className="text-sm text-fg">
                      {t.name}
                      {t.rank > 1 ? ` (Rank ${t.rank})` : ''}
                    </p>
                    {skillPicks.length > 0 && (
                      <p className="text-xs text-fg-muted">Skills: {skillPicks.join(', ')}</p>
                    )}
                    {characteristicPicks.length > 0 && (
                      <p className="text-xs text-fg-muted capitalize">
                        Characteristics: {characteristicPicks.join(', ')}
                      </p>
                    )}
                  </div>
                )
              })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Weapon</h3>
          {draft.weapon && weaponTemplate ? (
            <div>
              <p className="text-fg">
                {draft.weapon.customName} <span className="text-fg-muted">({weaponTemplate.name})</span>
              </p>
              <p className="text-sm text-fg-secondary">
                Dmg {weaponDamageDisplay()} · Crit {weaponTemplate.crit} · {weaponTemplate.range} · Enc{' '}
                {weaponTemplate.encumbrance}
              </p>
              {draft.weapon.qualities.length > 0 && (
                <p className="text-sm text-fg-secondary">
                  {draft.weapon.qualities
                    .map((q) => (q.rank !== undefined ? `${q.name} ${q.rank}` : q.name))
                    .join(', ')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-fg-muted">None selected</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Armor</h3>
          {draft.armor ? (
            <p className="text-fg">
              {draft.armor.customName}{' '}
              <span className="text-sm text-fg-muted">
                (Soak +{BBB_STARTING_ARMOR.soak}, Def {BBB_STARTING_ARMOR.meleeDefense}/
                {BBB_STARTING_ARMOR.rangedDefense})
              </span>
            </p>
          ) : (
            <p className="text-fg-muted">None selected</p>
          )}
        </div>

        {filledIdentityNotes.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-fg">Personal items</h3>
            <ul className="list-inside list-disc text-sm text-fg-secondary">
              {filledIdentityNotes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Personality</h3>
          <p className="text-sm text-fg-secondary">
            <span className="text-fg">Strength:</span> {draft.strength}
          </p>
          <p className="text-sm text-fg-secondary">
            <span className="text-fg">Flaw:</span> {draft.flaw}
          </p>
          <p className="text-sm text-fg-secondary">
            <span className="text-fg">Desire:</span> {draft.desire}
          </p>
          <p className="text-sm text-fg-secondary">
            <span className="text-fg">Fear:</span> {draft.fear}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-fg-secondary">
            XP: <span className="font-semibold text-accent">{available}</span> available /{' '}
            {spent} spent / {draft.totalXP} total
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