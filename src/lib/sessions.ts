import {
  collection,
  doc,
  setDoc,
  getDoc,
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

export interface Membership {
  sessionId: string
  uid: string
  displayName: string
  role: 'dm' | 'player'
  joinedAt: string
  gameType: GameType
  sessionName: string
  dmName: string
  inviteCode: string
}

function generateInviteCode(length = 6): string {
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

export async function joinSession(
  sessionId: string,
  uid: string,
  displayName: string
): Promise<void> {
  const sessionSnap = await getDoc(doc(db, 'sessions', sessionId))
  if (!sessionSnap.exists()) {
    throw new Error('Session not found')
  }
  const session = sessionSnap.data() as Omit<Session, 'id'>

  const membershipRef = doc(db, 'memberships', `${sessionId}_${uid}`)
  await setDoc(
    membershipRef,
    {
      sessionId,
      uid,
      displayName,
      role: session.dmId === uid ? 'dm' : 'player',
      joinedAt: new Date().toISOString(),
      gameType: session.gameType,
      sessionName: session.name,
      dmName: session.dmName,
      inviteCode: session.inviteCode,
    },
    { merge: true }
  )
}

export async function leaveSession(sessionId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, 'memberships', `${sessionId}_${uid}`))
}

export async function endSession(sessionId: string): Promise<void> {
  const membershipsSnap = await getDocs(
    query(collection(db, 'memberships'), where('sessionId', '==', sessionId))
  )
  await Promise.all(membershipsSnap.docs.map((m) => deleteDoc(m.ref)))
  await deleteDoc(doc(db, 'sessions', sessionId))
}

export function subscribeToSession(
  sessionId: string,
  callback: (session: Session | null) => void
) {
  return onSnapshot(
    doc(db, 'sessions', sessionId),
    (snap) => {
      if (!snap.exists()) {
        callback(null)
        return
      }
      callback({ id: snap.id, ...snap.data() } as Session)
    },
    (error) => {
      console.error('subscribeToSession error:', error)
      callback(null)
    }
  )
}

export function subscribeToRoster(
  sessionId: string,
  callback: (members: Membership[]) => void
) {
  const q = query(collection(db, 'memberships'), where('sessionId', '==', sessionId))
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as Membership))
    },
    (error) => {
      console.error('subscribeToRoster error:', error)
      callback([])
    }
  )
}

export function subscribeToMyMemberships(
  uid: string,
  callback: (memberships: Membership[]) => void
) {
  const q = query(collection(db, 'memberships'), where('uid', '==', uid))
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => d.data() as Membership))
    },
    (error) => {
      console.error('subscribeToMyMemberships error:', error)
      callback([])
    }
  )
}