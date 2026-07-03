import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Characteristics, CharacterSkill, CharacterTalent } from './genesysCalc'

export interface InventoryWeaponQuality {
  name: string
  rank?: number // present only for ranked qualities (e.g. Vicious 2)
}

export interface InventoryWeapon {
  templateId: string
  customName: string
  qualities: InventoryWeaponQuality[]
}

export interface InventoryArmor {
  customName: string
}

export interface Character {
  id: string
  sessionId: string
  uid: string
  characterName: string
  playerName: string
  speciesArchetype: string
  career: string
  characteristics: Characteristics
  skills: CharacterSkill[]
  freeSkillNames: string[] // which 4 career skills got a free rank at creation
  talents: CharacterTalent[]
  talentSkillChoices: Record<string, string[]>
  talentCharacteristicChoices: Record<string, string[]>
  weapon: InventoryWeapon | null
  armor: InventoryArmor | null
  identityNotes: string[] // 3 optional, purely cosmetic slots
  totalXP: number
  strength: string
  flaw: string
  desire: string
  fear: string
  createdAt: string
  updatedAt: string
}

export async function createCharacter(
  sessionId: string,
  uid: string,
  data: Omit<Character, 'id' | 'sessionId' | 'uid' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = doc(collection(db, 'characters'))
  await setDoc(ref, {
    ...data,
    sessionId,
    uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return ref.id
}

export async function updateCharacter(
  characterId: string,
  updates: Partial<Character>
): Promise<void> {
  await updateDoc(doc(db, 'characters', characterId), {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteCharacter(characterId: string): Promise<void> {
  await deleteDoc(doc(db, 'characters', characterId))
}

export function subscribeToCharacter(
  characterId: string,
  callback: (character: Character | null) => void
) {
  return onSnapshot(
    doc(db, 'characters', characterId),
    (snap) => {
      if (!snap.exists()) {
        callback(null)
        return
      }
      callback({ id: snap.id, ...snap.data() } as Character)
    },
    (error) => {
      console.error('subscribeToCharacter error:', error)
      callback(null)
    }
  )
}

// Every character belonging to one session — powers a DM's "party" view.
export function subscribeToSessionCharacters(
  sessionId: string,
  callback: (characters: Character[]) => void
) {
  const q = query(collection(db, 'characters'), where('sessionId', '==', sessionId))
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Character)))
    },
    (error) => {
      console.error('subscribeToSessionCharacters error:', error)
      callback([])
    }
  )
}