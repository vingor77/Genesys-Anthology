import { useEffect, useState } from 'react'
import {
  BBB_WEAPON_TEMPLATES,
  BBB_STARTING_ARMOR,
  BBB_MAX_STARTING_WEAPON_DAMAGE,
} from '../../lib/gameConfigs/bbb'
import { GENESYS_WEAPON_QUALITIES } from '../../lib/genesysCalc'
import type { InventoryWeaponQuality } from '../../lib/characters'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepInventory({ draft, updateDraft, setCanProceed }: StepProps) {
  const [qualityToAdd, setQualityToAdd] = useState('')

  const weaponValid = !!draft.weapon?.templateId && !!draft.weapon?.customName.trim()
  const armorValid = !!draft.armor?.customName.trim()

  useEffect(() => {
    setCanProceed(weaponValid && armorValid)
  }, [weaponValid, armorValid, setCanProceed])

  const selectedTemplate = BBB_WEAPON_TEMPLATES.find((t) => t.id === draft.weapon?.templateId)

  function selectTemplate(templateId: string) {
    updateDraft({
      weapon: {
        templateId,
        customName: draft.weapon?.customName ?? '',
        qualities: draft.weapon?.qualities ?? [],
      },
    })
  }

  function setWeaponName(customName: string) {
    if (!draft.weapon) return
    updateDraft({ weapon: { ...draft.weapon, customName } })
  }

  function addQuality() {
    if (!draft.weapon || !qualityToAdd) return
    if (draft.weapon.qualities.some((q) => q.name === qualityToAdd)) return
    const def = GENESYS_WEAPON_QUALITIES.find((q) => q.name === qualityToAdd)
    const newQuality: InventoryWeaponQuality = def?.ranked
      ? { name: qualityToAdd, rank: 1 }
      : { name: qualityToAdd }
    updateDraft({ weapon: { ...draft.weapon, qualities: [...draft.weapon.qualities, newQuality] } })
    setQualityToAdd('')
  }

  function removeQuality(name: string) {
    if (!draft.weapon) return
    updateDraft({ weapon: { ...draft.weapon, qualities: draft.weapon.qualities.filter((q) => q.name !== name) } })
  }

  function setQualityRank(name: string, rank: number) {
    if (!draft.weapon) return
    updateDraft({
      weapon: {
        ...draft.weapon,
        qualities: draft.weapon.qualities.map((q) => (q.name === name ? { ...q, rank } : q)),
      },
    })
  }

  function setArmorName(customName: string) {
    updateDraft({ armor: { customName } })
  }

  function setIdentityNote(index: number, value: string) {
    const updated = [...draft.identityNotes]
    updated[index] = value
    updateDraft({ identityNotes: updated })
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-fg">Inventory</h2>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Weapon */}
        <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-4 lg:flex-1">
          <h3 className="mb-3 text-sm font-semibold text-fg">Weapon</h3>

        <label className="mb-1 block text-sm text-fg-secondary">Template</label>
        <select
          value={draft.weapon?.templateId ?? ''}
          onChange={(e) => selectTemplate(e.target.value)}
          className="mb-3 w-full rounded border border-border-strong bg-page px-3 py-2 text-fg"
        >
          <option value="" disabled>
            Choose a weapon template
          </option>
          {BBB_WEAPON_TEMPLATES.filter((t) => t.damage <= BBB_MAX_STARTING_WEAPON_DAMAGE).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.skill}, {t.category === 'melee' ? `Brawn+${t.damage}` : t.damage} dmg,
              Crit {t.crit}, {t.range}
            </option>
          ))}
        </select>

        {selectedTemplate && (
          <>
            <label className="mb-1 block text-sm text-fg-secondary">Item name</label>
            <input
              value={draft.weapon?.customName ?? ''}
              onChange={(e) => setWeaponName(e.target.value)}
              placeholder="What is it, specifically?"
              className="mb-3 w-full rounded border border-border-strong bg-page px-3 py-2 text-fg placeholder-fg-muted"
            />

            {selectedTemplate.hasMomentum && (
              <p className="mb-3 text-xs text-fg-muted">
                Momentum: add ⌊Brawn ÷ 2⌋ bonus damage when thrown.
              </p>
            )}

            <label className="mb-1 block text-sm text-fg-secondary">Qualities</label>
            <div className="mb-2 space-y-1">
              {draft.weapon?.qualities.map((q) => {
                const def = GENESYS_WEAPON_QUALITIES.find((qd) => qd.name === q.name)
                return (
                  <div key={q.name} className="rounded border border-border-strong bg-page px-2 py-1.5">
                    <div className="flex items-center gap-2 text-sm text-fg">
                      <span className="font-medium">{q.name}</span>
                      {q.rank !== undefined && (
                        <input
                          type="number"
                          min={1}
                          value={q.rank}
                          onChange={(e) => setQualityRank(q.name, Number(e.target.value) || 1)}
                          className="w-12 rounded border border-border bg-surface px-1 text-center text-fg"
                        />
                      )}
                      <button onClick={() => removeQuality(q.name)} className="ml-auto text-warning hover:underline">
                        Remove
                      </button>
                    </div>
                    {def && <p className="mt-0.5 text-xs text-fg-muted">{def.description}</p>}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <select
                value={qualityToAdd}
                onChange={(e) => setQualityToAdd(e.target.value)}
                className="rounded border border-border-strong bg-page px-2 py-1 text-sm text-fg"
              >
                <option value="">Add a quality…</option>
                {GENESYS_WEAPON_QUALITIES.filter(
                  (q) => !draft.weapon?.qualities.some((existing) => existing.name === q.name)
                ).map((q) => (
                  <option key={q.name} value={q.name}>
                    {q.name}
                  </option>
                ))}
              </select>
              <button
                onClick={addQuality}
                disabled={!qualityToAdd}
                className="rounded border border-border-strong px-3 py-1 text-sm text-fg hover:bg-surface-hover disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </>
        )}
      </div>

        {/* Armor */}
        <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-4 lg:flex-1">
          <h3 className="mb-1 text-sm font-semibold text-fg">Armor</h3>
        <p className="mb-3 text-xs text-fg-muted">
          Every new employee starts with the same minimal protection — Soak +{BBB_STARTING_ARMOR.soak},
          Defense {BBB_STARTING_ARMOR.meleeDefense}/{BBB_STARTING_ARMOR.rangedDefense}, Enc {BBB_STARTING_ARMOR.encumbrance}.
        </p>
        <label className="mb-1 block text-sm text-fg-secondary">Item name</label>
        <input
          value={draft.armor?.customName ?? ''}
          onChange={(e) => setArmorName(e.target.value)}
          placeholder="e.g. Work apron, thick jacket"
          className="w-full rounded border border-border-strong bg-page px-3 py-2 text-fg placeholder-fg-muted"
        />
      </div>

        {/* Identity */}
        <div className="w-full max-w-lg rounded-lg border border-border bg-surface p-4 lg:flex-1">
          <h3 className="mb-1 text-sm font-semibold text-fg">Personal items</h3>
          <p className="mb-3 text-xs text-fg-muted">
            Not mechanically relevant — just things that matter to who this character is. Optional.
          </p>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                value={draft.identityNotes[i] ?? ''}
                onChange={(e) => setIdentityNote(i, e.target.value)}
                placeholder={`Personal item ${i + 1} (optional)`}
                className="w-full rounded border border-border-strong bg-page px-3 py-2 text-fg placeholder-fg-muted"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}