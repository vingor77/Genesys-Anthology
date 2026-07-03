import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BBB_SPECIES, BBB_SKILLS, BBB_STARTING_XP } from '../lib/gameConfigs/bbb'
import type { Characteristics, CharacterSkill, CharacterTalent } from '../lib/genesysCalc'
import type { InventoryWeapon, InventoryArmor } from '../lib/characters'
import StepBasics from '../components/characterCreator/StepBasics'
import StepCareer from '../components/characterCreator/StepCareer'
import StepFreeSkills from '../components/characterCreator/StepFreeSkills'
import StepCharacteristics from '../components/characterCreator/StepCharacteristics'
import StepSkills from '../components/characterCreator/StepSkills'
import StepTalents from '../components/characterCreator/StepTalents'
import StepInventory from '../components/characterCreator/StepInventory'
import StepPersonality from '../components/characterCreator/StepPersonality'
import StepReview from '../components/characterCreator/StepReview'

export interface CharacterDraft {
  characterName: string
  playerName: string
  speciesArchetype: string
  career: string
  characteristics: Characteristics
  skills: CharacterSkill[]
  freeSkillNames: string[]
  talents: CharacterTalent[]
  talentSkillChoices: Record<string, string[]> // key = `${talentName}:${rank}`
  talentCharacteristicChoices: Record<string, string[]>
  weapon: InventoryWeapon | null
  armor: InventoryArmor | null
  identityNotes: string[]
  totalXP: number
  strength: string
  flaw: string
  desire: string
  fear: string
}

// Steps no longer render their own Back/Next — they only report whether
// it's currently valid to move forward. The shell owns the actual button
// bar so its screen position never depends on how tall a given step's
// content is.
export interface StepProps {
  draft: CharacterDraft
  updateDraft: (updates: Partial<CharacterDraft>) => void
  setCanProceed: (can: boolean) => void
}

const STEP_LABELS = [
  'Basics', 'Career', 'Free Skills', 'Characteristics', 'Skills',
  'Talents', 'Inventory', 'Personality', 'Review',
]

export default function CreateCharacter() {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [canProceed, setCanProceed] = useState(false)

  const [draft, setDraft] = useState<CharacterDraft>({
    characterName: '',
    playerName: user?.displayName ?? user?.email ?? '',
    speciesArchetype: BBB_SPECIES,
    career: '',
    characteristics: {
      brawn: 2, agility: 2, intellect: 2, cunning: 2, willpower: 2, presence: 2,
    },
    skills: BBB_SKILLS.map((name) => ({ name, rank: 0 })),
    freeSkillNames: [],
    talents: [],
    talentSkillChoices: {},
    talentCharacteristicChoices: {},
    weapon: null,
    armor: null,
    identityNotes: ['', '', ''],
    totalXP: BBB_STARTING_XP,
    strength: '',
    flaw: '',
    desire: '',
    fear: '',
  })

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

  const stepProps: StepProps = { draft, updateDraft, setCanProceed }

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
      {step === 7 && <StepPersonality {...stepProps} />}
      {step === 8 && <StepReview {...stepProps} />}

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