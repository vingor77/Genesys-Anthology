// Pure logic for the rudimentary initiative tracker. Deliberately does
// exactly one thing — tracks slots created from initiative rolls, sorted
// and orderable. It does not know about rounds, per-turn effects, or
// anything else on the sheet; everything else is meant to read from this
// tracker's state, not the other way around.

export interface InitiativeSlot {
  id: string
  label: string
  side: 'ally' | 'adversary'
  successes: number
  advantages: number
}

// Standard Genesys initiative ordering: highest net successes first, ties
// broken by net advantage.
export function sortSlots(slots: InitiativeSlot[]): InitiativeSlot[] {
  return [...slots].sort((a, b) => {
    if (b.successes !== a.successes) return b.successes - a.successes
    return b.advantages - a.advantages
  })
}

export function addSlot(
  slots: InitiativeSlot[],
  label: string,
  side: 'ally' | 'adversary',
  successes: number,
  advantages: number
): InitiativeSlot[] {
  const newSlot: InitiativeSlot = { id: crypto.randomUUID(), label, side, successes, advantages }
  return sortSlots([...slots, newSlot])
}

// Removing a slot by its own id (not by label/roll) — this is exactly
// why each slot carries the roll that put it there, per the original
// design: an adversary dying removes precisely that adversary's slot,
// not just "an adversary slot."
export function removeSlot(slots: InitiativeSlot[], id: string): InitiativeSlot[] {
  return slots.filter((s) => s.id !== id)
}