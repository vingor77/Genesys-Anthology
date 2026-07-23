import { useEffect, useState } from 'react'
import { BBB_UNIVERSAL_GEAR_ID, BBB_GEAR_IDS, BBB_FREE_GEAR_PICKS_ONE_USE, BBB_FREE_GEAR_PICKS_REUSABLE } from '../../lib/gameConfigs/bbb'
import type { StepProps } from '../../pages/CreateCharacter'
import type { ObjectDoc } from '../../lib/characters'
import CustomItemForm from '../sheet/CustomItemForm'

export default function StepGear({ draft, updateDraft, setCanProceed, objectDocs, qualityDocs, skillDocs }: StepProps) {
  const [viewingItemId, setViewingItemId] = useState<string | null>(null)
  const [viewingCustomIndex, setViewingCustomIndex] = useState<number | null>(null)
  const [showCustomItemForm, setShowCustomItemForm] = useState(false)

  const gearPool = objectDocs.filter((o) => BBB_GEAR_IDS.includes(o.id))
  // The split is entirely data-driven off each item's own `uses` field —
  // "one-use" means used once and gone (uses === 1), "reusable" covers
  // everything else: multi-charge consumables, unlimited-use tools, or no
  // uses field at all. Redesigning the catalog never requires touching
  // this logic, only which items end up with uses === 1.
  // One-use isn't "uses === 1" — it's anything that's gone for good once
  // exhausted: either the item itself says so (usesCannotRestore), or it
  // carries the Fragile quality (breaks after its last use, same effect
  // whether that's 1 use or 5). Everything else — restorable consumables,
  // unlimited-use tools, or no uses field at all — is reusable.
  function isOneUse(o: ObjectDoc): boolean {
    return o.usesCannotRestore === true || (o.qualities?.some((q) => q.name === 'Fragile') ?? false)
  }
  const oneUsePool = gearPool.filter(isOneUse)
  const reusablePool = gearPool.filter((o) => !isOneUse(o))

  const selectedOneUse = draft.gearObjectIds.filter((id) => oneUsePool.some((o) => o.id === id))
  const selectedReusable = draft.gearObjectIds.filter((id) => reusablePool.some((o) => o.id === id))

  useEffect(() => {
    setCanProceed(
      selectedOneUse.length === BBB_FREE_GEAR_PICKS_ONE_USE && selectedReusable.length === BBB_FREE_GEAR_PICKS_REUSABLE
    )
  }, [selectedOneUse.length, selectedReusable.length, setCanProceed])

  const universal = objectDocs.find((o) => o.id === BBB_UNIVERSAL_GEAR_ID)

  function toggle(id: string, pool: 'oneUse' | 'reusable') {
    setViewingItemId(id)
    const isSelected = draft.gearObjectIds.includes(id)
    const atPoolLimit =
      pool === 'oneUse'
        ? selectedOneUse.length >= BBB_FREE_GEAR_PICKS_ONE_USE
        : selectedReusable.length >= BBB_FREE_GEAR_PICKS_REUSABLE
    if (!isSelected && atPoolLimit) return
    updateDraft({
      gearObjectIds: isSelected
        ? draft.gearObjectIds.filter((g) => g !== id)
        : [...draft.gearObjectIds, id],
    })
  }

  // Staged locally exactly like before — nothing is written to Firestore
  // until the character is actually created in StepReview, so backing out
  // of character creation never leaves an orphaned item in the database.
  // The payload itself now comes from CustomItemForm rather than a bare
  // name/description pair, since Personal Items reuses the same form the
  // character sheet uses — just locked to Mundane with mechanics hidden.
  function addCustomItem(payload: Omit<ObjectDoc, 'id' | 'sessionId' | 'ownerId'>) {
    const newIndex = draft.customItems.length
    updateDraft({ customItems: [...draft.customItems, payload] })
    setViewingCustomIndex(newIndex)
    setShowCustomItemForm(false)
  }

  function removeCustomItem(index: number) {
    updateDraft({ customItems: draft.customItems.filter((_, i) => i !== index) })
    setViewingCustomIndex(null)
  }

  const viewingItem = viewingItemId ? gearPool.find((i) => i.id === viewingItemId) ?? null : null
  const viewingCustom = viewingCustomIndex !== null ? draft.customItems[viewingCustomIndex] ?? null : null

  function GearGrid({ pool, poolKind }: { pool: ObjectDoc[]; poolKind: 'oneUse' | 'reusable' }) {
    const selectedCount = poolKind === 'oneUse' ? selectedOneUse.length : selectedReusable.length
    const limit = poolKind === 'oneUse' ? BBB_FREE_GEAR_PICKS_ONE_USE : BBB_FREE_GEAR_PICKS_REUSABLE
    return (
      <div className="mb-4 max-w-[800px]">
        <p className="mb-2 text-sm text-fg-secondary">
          {poolKind === 'oneUse' ? 'One-use item' : 'Reusable items'} — choose {limit}{' '}
          <span className="font-medium text-accent">({selectedCount}/{limit} selected)</span>
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          {pool.map((item) => {
            const selected = draft.gearObjectIds.includes(item.id)
            const disabled = !selected && selectedCount >= limit
            return (
              <button
                key={item.id}
                onClick={() => toggle(item.id, poolKind)}
                disabled={disabled}
                className={`w-full h-12 rounded border px-3 py-2 text-sm disabled:opacity-40 ${
                  selected
                    ? 'border-accent bg-accent/10 text-fg'
                    : 'border-border bg-surface text-fg-secondary hover:bg-surface-hover'
                }`}
              >
                {item.name}
                {selected && <span className="ml-1 text-accent">✓</span>}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-fg">Gear</h2>

      {universal && (
        <div className="mb-4 max-w-[800px] rounded-lg border-2 border-accent bg-surface p-3">
          <p className="text-sm text-fg">
            <span className="font-semibold">{universal.name}</span>{' '}
            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent">
              everyone starts with this
            </span>
          </p>
          <p className="mt-1 text-xs text-fg-muted">{universal.description}</p>
        </div>
      )}

      <GearGrid pool={oneUsePool} poolKind="oneUse" />
      <GearGrid pool={reusablePool} poolKind="reusable" />

      {viewingItem && (
        <div className="mt-4 max-w-[800px] rounded-lg border border-accent bg-surface p-4">
          <p className="font-semibold text-fg">{viewingItem.name}</p>
          <p className="mt-1 text-sm text-fg-secondary">{viewingItem.description}</p>

          {viewingItem.effect && (
            <div className="mt-3 rounded border-l-4 border-accent bg-accent/10 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Effect</p>
              <p className="text-sm text-fg">{viewingItem.effect}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 max-w-[800px]">
        <h3 className="text-sm font-semibold text-fg">Personal items</h3>
        <p className="mt-1 mb-3 text-xs text-fg-muted">
          Purely cosmetic — a photo, a keepsake, whatever your character carries that doesn't need
          mechanics. Only visible to you.
        </p>

        {draft.customItems.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            {draft.customItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setViewingCustomIndex(index)
                  setShowCustomItemForm(false)
                }}
                className={`h-12 w-full rounded border px-3 py-2 text-sm ${
                  viewingCustomIndex === index
                    ? 'border-accent bg-accent/10 text-fg'
                    : 'border-border bg-surface text-fg-secondary hover:bg-surface-hover'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        {viewingCustom && viewingCustomIndex !== null && (
          <div className="mt-3 rounded-lg border border-accent bg-surface p-4">
            <p className="font-semibold text-fg">{viewingCustom.name}</p>
            {viewingCustom.description && (
              <p className="mt-1 text-sm text-fg-secondary">{viewingCustom.description}</p>
            )}
            <button
              onClick={() => removeCustomItem(viewingCustomIndex)}
              className="mt-3 rounded border border-border-strong px-3 py-1.5 text-xs text-fg hover:bg-surface-hover"
            >
              Remove
            </button>
          </div>
        )}

        {showCustomItemForm ? (
          <div className="mt-3 max-w-[500px]">
            <CustomItemForm
              activeSlots={[]}
              qualityDocs={qualityDocs}
              skillDocs={skillDocs}
              fixedType="Mundane"
              hideMechanics
              onCreate={addCustomItem}
              onCancel={() => setShowCustomItemForm(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => {
              setShowCustomItemForm(true)
              setViewingCustomIndex(null)
            }}
            className="mt-3 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover"
          >
            + Add personal item
          </button>
        )}
      </div>
    </div>
  )
}