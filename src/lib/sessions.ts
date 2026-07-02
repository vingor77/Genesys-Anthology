import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore'
import { db } from './firebase'

export type GameType = 'bbb' | 'backrooms' | 'lethal-company'

export interface Session {
  id: string
  gameType: GameType
  name: string
  dmId: string
  dmName: string
  inviteCode: string
  createdAt: string
}

export interface SessionPlayer {
  uid: string
  displayName: string
  joinedAt: string
}

function generateInviteCode(length = 6): string {
  // Excludes ambiguous chars (0/O, 1/I) so codes are easy to read/type aloud
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function createSession(
  gameType: GameType,
  name: string,
  dmId: string,
  dmName: string
): Promise<string> {
  const inviteCode = generateInviteCode()
  const sessionRef = doc(collection(db, 'sessions'))

  await setDoc(sessionRef, {
    gameType,
    name,
    dmId,
    dmName,
    inviteCode,
    createdAt: new Date().toISOString(),
  })

  // DM is also a player on the roster, tagged via dmId match in the UI
  await joinSession(sessionRef.id, dmId, dmName)

  return sessionRef.id
}

export async function findSessionByCode(code: string): Promise<Session | null> {
  const q = query(collection(db, 'sessions'), where('inviteCode', '==', code.toUpperCase()))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  return { id: docSnap.id, ...docSnap.data() } as Session
}

export async function joinSession(sessionId: string, uid: string, displayName: string) {
  const playerRef = doc(db, 'sessions', sessionId, 'players', uid)
  await setDoc(playerRef, {
    uid,
    displayName,
    joinedAt: new Date().toISOString(),
  })
}

export async function leaveSession(sessionId: string, uid: string) {
  await deleteDoc(doc(db, 'sessions', sessionId, 'players', uid))
}

export function subscribeToSession(
  sessionId: string,
  callback: (session: Session | null) => void
) {
  return onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    callback({ id: snap.id, ...snap.data() } as Session)
  })
}

export function subscribeToPlayers(
  sessionId: string,
  callback: (players: SessionPlayer[]) => void
) {
  return onSnapshot(collection(db, 'sessions', sessionId, 'players'), (snap) => {
    callback(snap.docs.map((d) => d.data() as SessionPlayer))
  })
}