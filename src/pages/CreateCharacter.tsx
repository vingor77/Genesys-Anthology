import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { subscribeToSession, type Session } from '../lib/sessions'
import { BBB_SPECIES, BBB_SKILLS, BBB_STARTING_XP } from '../lib/gameConfigs/bbb'
import type { Characteristics } from '../lib/genesysCalc'
import {
  fetchSkills,
  fetchTalents,
  fetchQualities,
  fetchObjects,
  type SkillDoc,
  type TalentDoc,
  type QualityDoc,
  type ObjectDoc,
  type SkillEntry,
  type TalentEntry,
} from '../lib/characters'

// Items are concrete/pre-named/pre-qualified Objects now, not templates —
// the wizard just stores which one was picked, nothing to customize.

import StepBasics from '../components/characterCreator/StepBasics'
import StepCareer from '../components/characterCreator/StepCareer'
import StepFreeSkills from '../components/characterCreator/StepFreeSkills'
import StepCharacteristics from '../components/characterCreator/StepCharacteristics'
import StepSkills from '../components/characterCreator/StepSkills'
import StepTalents from '../components/characterCreator/StepTalents'
import StepInventory from '../components/characterCreator/StepInventory'
import StepGear from '../components/characterCreator/StepGear'
import StepPersonality from '../components/characterCreator/StepPersonality'
import StepReview from '../components/characterCreator/StepReview'

export interface CharacterDraft {
  characterName: string
  playerName: string
  species: { name: string; specialAbility?: { name: string; description: string } }
  career: { name: string; specialAbility?: { name: string; description: string }; chosenSkills: string[] }
  characteristics: Characteristics
  skills: SkillEntry[]
  // Choices used to live in two separate top-level Records keyed by
  // "talentName:rank" — now each TalentEntry carries its own
  // skillChoices/characteristicChoices directly, so there's nothing
  // separate to keep in sync here anymore.
  talents: TalentEntry[]
  weaponObjectId: string | null
  armorObjectId: string | null
  gearObjectIds: string[]
  customItems: Omit<ObjectDoc, 'id' | 'sessionId' | 'ownerId'>[] // staged locally — not written to Firestore until StepReview actually creates the character
  identityNotes: string[]
  totalXP: number
  strength: string
  flaw: string
  desire: string
  fear: string
  // Optional — Personality (above) stays mandatory to proceed, but
  // physical appearance is the kind of thing that's often easier to
  // settle once you've actually seen the character played a bit, so
  // nothing here blocks moving forward.
  description: { gender?: string; age?: string; height?: string; build?: string; hair?: string; eyes?: string; notable?: string }
}

// Steps no longer render their own Back/Next — they only report whether
// it's currently valid to move forward. The shell owns the actual button
// bar so its screen position never depends on how tall a given step's
// content is.
export interface StepProps {
  draft: CharacterDraft
  updateDraft: (updates: Partial<CharacterDraft>) => void
  setCanProceed: (can: boolean) => void
  maxSkillRank?: number // chargen defaults to BBB_MAX_STARTING_SKILL_RANK (2); live play passes 5
  // Fetched once at the wizard's top level (module-level cached in
  // characters.ts, so this is cheap even though several steps need it) —
  // no step re-fetches its own copy.
  skillDocs: SkillDoc[]
  talentDocs: TalentDoc[]
  qualityDocs: QualityDoc[]
  objectDocs: ObjectDoc[]
  sessionId: string
}

const STEP_LABELS = [
  'Basics', 'Career', 'Free Skills', 'Characteristics', 'Skills',
  'Talents', 'Inventory', 'Gear', 'Identity', 'Review',
]

// The single source of truth for "what a blank draft looks like" — used
// both for the wizard's initial state and for StepCareer's reset when
// actually changing careers. Having one function means the reset can
// never quietly miss a field that gets added here later.
export function buildInitialDraft(playerName: string): CharacterDraft {
  return {
    characterName: '',
    playerName,
    species: { name: BBB_SPECIES },
    career: { name: '', chosenSkills: [] },
    characteristics: {
      brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2,
    },
    skills: BBB_SKILLS.map((name) => ({ name, rank: 0 })),
    talents: [],
    weaponObjectId: null,
    armorObjectId: null,
    gearObjectIds: [],
    customItems: [],
    identityNotes: ['', '', ''],
    totalXP: BBB_STARTING_XP,
    strength: '',
    flaw: '',
    desire: '',
    fear: '',
    description: {},
  }
}

export default function CreateCharacter() {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [canProceed, setCanProceed] = useState(false)

  // The wizard no longer asks the player which game they're creating a
  // character for — a character is always created from within a specific
  // session, and the session already has a gameType the moment it exists.
  // undefined = still loading, null = doesn't exist or no access (this
  // simpler subscribeToSession doesn't distinguish the two), Session =
  // loaded successfully. Same shape as subscribeToCharacter elsewhere in
  // the app — no separate status wrapper.
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!sessionId) return
    const unsub = subscribeToSession(sessionId, (result) => {
      setSession(result)
    })
    return unsub
  }, [sessionId])

  // Skills/talents/qualities now live in Firestore, not embedded arrays —
  // fetched once here and passed down, rather than each step re-fetching.
  const [skillDocs, setSkillDocs] = useState<SkillDoc[] | null>(null)
  const [talentDocs, setTalentDocs] = useState<TalentDoc[] | null>(null)
  const [qualityDocs, setQualityDocs] = useState<QualityDoc[] | null>(null)
  const [objectDocs, setObjectDocs] = useState<ObjectDoc[] | null>(null)

  useEffect(() => {
    fetchSkills().then(setSkillDocs)
    fetchTalents().then(setTalentDocs)
    fetchQualities().then(setQualityDocs)
    fetchObjects().then(setObjectDocs)
  }, [])

  const [draft, setDraft] = useState<CharacterDraft>(() =>
    buildInitialDraft(user?.displayName ?? user?.email ?? '')
  )

  function updateDraft(updates: Partial<CharacterDraft>) {
    setDraft((prev) => ({ ...prev, ...updates }))
  }

  function goNext() {
    setCanProceed(false) // reset immediately so the button can't flash "enabled" for the next step before its own check runs
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1))
  }
  function goBack() {
    setCanProceed(false)
    setStep((s) => Math.max(s - 1, 0))
  }

  if (session === undefined) {
    return <p className="text-fg-secondary">Loading session…</p>
  }
  if (session === null) {
    return <p className="text-fg-secondary">This session doesn't exist, or you don't have access to it.</p>
  }
  if (session.gameType !== 'bbb') {
    return (
      <p className="text-fg-secondary">
        Character creation for {session.gameType} isn't built yet — only BB&B is supported right now.
      </p>
    )
  }
  if (!skillDocs || !talentDocs || !qualityDocs || !objectDocs) {
    return <p className="text-fg-secondary">Loading game data…</p>
  }

  const stepProps: StepProps = {
    draft,
    updateDraft,
    setCanProceed,
    skillDocs,
    talentDocs,
    qualityDocs,
    objectDocs,
    sessionId: sessionId!,
  }

  return (
    <div className="pb-24">
      <p className="mb-1 text-sm text-fg-muted">
        Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
      </p>
      <div className="mb-6 h-1 w-full max-w-md rounded bg-surface">
        <div
          className="h-1 rounded bg-accent transition-all"
          style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
        />
      </div>

      {step === 0 && <StepBasics {...stepProps} />}
      {step === 1 && <StepCareer {...stepProps} />}
      {step === 2 && <StepFreeSkills {...stepProps} />}
      {step === 3 && <StepCharacteristics {...stepProps} />}
      {step === 4 && <StepSkills {...stepProps} />}
      {step === 5 && <StepTalents {...stepProps} />}
      {step === 6 && <StepInventory {...stepProps} />}
      {step === 7 && <StepGear {...stepProps} />}
      {step === 8 && <StepPersonality {...stepProps} />}
      {step === 9 && <StepReview {...stepProps} />}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-page px-6 py-4">
        <div className="flex items-center gap-4">
          {step > 0 && (
            <button
              onClick={goBack}
              className="rounded border border-border-strong px-4 py-2 text-sm text-fg hover:bg-surface-hover"
            >
              Back
            </button>
          )}
          {step === 0 && (
            <Link to={`/sessions/${sessionId}`} className="text-sm text-fg-secondary hover:text-fg">
              Cancel
            </Link>
          )}
          {step < STEP_LABELS.length - 1 && (
            <button
              onClick={goNext}
              disabled={!canProceed}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-fg disabled:hover:bg-disabled"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}