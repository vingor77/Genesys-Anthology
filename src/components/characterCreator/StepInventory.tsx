import { useEffect, useState } from 'react'
import { BBB_WEAPON_IDS, BBB_ARMOR_IDS } from '../../lib/gameConfigs/bbb'
import type { ObjectDoc } from '../../lib/characters'
import type { StepProps } from '../../pages/CreateCharacter'

export default function StepInventory({ draft, updateDraft, setCanProceed, objectDocs, qualityDocs }: StepProps) {
  const [viewingWeaponId, setViewingWeaponId] = useState<string | null>(null)
  const [viewingArmorId, setViewingArmorId] = useState<string | null>(null)

  useEffect(() => {
    setCanProceed(!!draft.weaponObjectId && !!draft.armorObjectId)
  }, [draft.weaponObjectId, draft.armorObjectId, setCanProceed])

  const weapons = objectDocs.filter((o) => BBB_WEAPON_IDS.includes(o.id))
  const armors = objectDocs.filter((o) => BBB_ARMOR_IDS.includes(o.id))

  function qualityRules(name: string): string {
    return qualityDocs.find((q) => q.name === name)?.rules ?? ''
  }

  function weaponDamageLine(w: ObjectDoc): string {
    if (w.damageType === 'Brawn-based') return `Brawn + ${w.damage}`
    const hasMomentum = w.qualities?.some((q) => q.name === 'Momentum')
    return hasMomentum ? `${w.damage} (a bit more if thrown by someone strong)` : `${w.damage}`
  }

  function selectWeapon(w: ObjectDoc) {
    setViewingWeaponId(w.id)
    updateDraft({ weaponObjectId: w.id })
  }
  function selectArmor(a: ObjectDoc) {
    setViewingArmorId(a.id)
    updateDraft({ armorObjectId: a.id })
  }

  function renderWeaponDetail(w: ObjectDoc) {
    return (
      <div className="mt-3 flex min-h-[280px] flex-col rounded-lg border border-accent bg-surface p-4">
        <p className="font-semibold text-fg">{w.name}</p>
        <p className="mt-1 text-sm text-fg-secondary">{w.description}</p>

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
          <dt className="text-fg-muted">Damage:</dt>
          <dd className="text-fg">{weaponDamageLine(w)}</dd>
          <dt className="text-fg-muted">Critical:</dt>
          <dd className="text-fg">{w.crit}</dd>
          <dt className="text-fg-muted">Range:</dt>
          <dd className="text-fg">{w.range}</dd>
          <dt className="text-fg-muted">Encumbrance:</dt>
          <dd className="text-fg">{w.encumbrance}</dd>
        </dl>

        {w.qualities && w.qualities.length > 0 && (
          <div className="mt-3 rounded border-l-4 border-accent bg-accent/10 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Traits</p>
            <div className="mt-1 space-y-1.5">
              {w.qualities.map((q) => (
                <p key={q.name} className="text-sm text-fg">
                  <span className="font-medium">{q.name}</span> — {qualityRules(q.name)}
                </p>
              ))}
            </div>
          </div>
        )}

        {w.slots && w.slots.length > 1 && (
          <p className="mt-3 text-xs font-medium text-warning">
            {w.slotMode === 'all'
              ? `Two-handed — occupies both ${w.slots.join(' and ')}.`
              : `Can be wielded in either ${w.slots.join(' or ')}.`}
          </p>
        )}

        {w.situational && (
          <p className="mt-3 text-sm text-fg">
            <span className="text-fg-muted">If {w.situational.condition.toLowerCase()}:</span>{' '}
            {w.situational.effect}
          </p>
        )}
      </div>
    )
  }

  function renderArmorDetail(a: ObjectDoc) {
    return (
      <div className="mt-3 flex min-h-[280px] flex-col rounded-lg border border-accent bg-surface p-4">
        <p className="font-semibold text-fg">{a.name}</p>
        <p className="mt-1 text-sm text-fg-secondary">{a.description}</p>

        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
          <dt className="text-fg-muted">Soak:</dt>
          <dd className="text-fg">+{a.soak}</dd>
          <dt className="text-fg-muted">Melee Defense:</dt>
          <dd className="text-fg">{a.meleeDefense}</dd>
          <dt className="text-fg-muted">Ranged Defense:</dt>
          <dd className="text-fg">{a.rangedDefense}</dd>
          <dt className="text-fg-muted">Encumbrance:</dt>
          <dd className="text-fg">{a.encumbrance}</dd>
        </dl>
      </div>
    )
  }

  const viewingWeapon = viewingWeaponId ? weapons.find((w) => w.id === viewingWeaponId) ?? null : null
  const viewingArmor = viewingArmorId ? armors.find((a) => a.id === viewingArmorId) ?? null : null

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-fg">Inventory</h2>
      <p className="mb-4 text-sm text-fg-secondary">Choose 1 of each.</p>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="xl:flex-1">
          <h3 className="mb-2 text-sm font-semibold text-fg-secondary">
            Weapon {draft.weaponObjectId && <span className="text-accent">✓ selected</span>}
          </h3>
          <div className="grid min-h-[104px] grid-cols-2 content-start gap-2 sm:grid-cols-7">
            {weapons.map((w) => {
              const chosen = draft.weaponObjectId === w.id
              return (
                <button
                  key={w.id}
                  onClick={() => selectWeapon(w)}
                  className={`flex h-12 w-full items-center justify-center rounded border px-2 text-center text-sm leading-tight ${
                    chosen
                      ? 'border-accent bg-accent/10 text-fg'
                      : 'border-border bg-surface text-fg-secondary hover:bg-surface-hover'
                  }`}
                >
                  {w.name}
                </button>
              )
            })}
          </div>
          {viewingWeapon && renderWeaponDetail(viewingWeapon)}
        </div>

        <div className="xl:flex-1">
          <h3 className="mb-2 text-sm font-semibold text-fg-secondary">
            Armor {draft.armorObjectId && <span className="text-accent">✓ selected</span>}
          </h3>
          <div className="grid min-h-[104px] grid-cols-2 content-start gap-2 sm:grid-cols-7">
            {armors.map((a) => {
              const chosen = draft.armorObjectId === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => selectArmor(a)}
                  className={`flex h-12 w-full items-center justify-center rounded border px-2 text-center text-sm leading-tight ${
                    chosen
                      ? 'border-accent bg-accent/10 text-fg'
                      : 'border-border bg-surface text-fg-secondary hover:bg-surface-hover'
                  }`}
                >
                  {a.name}
                </button>
              )
            })}
          </div>
          {viewingArmor && renderArmorDetail(viewingArmor)}
        </div>
      </div>
    </div>
  )
}