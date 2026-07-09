interface DieProps {
  size?: number
}

function BaseDie({ size = 18, fill, stroke }: DieProps & { fill: string; stroke: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <rect x="1" y="1" width="18" height="18" rx="4" fill={fill} stroke={stroke} strokeWidth="1" />
    </svg>
  )
}

export function AbilityDie({ size }: DieProps) {
  return <BaseDie size={size} fill="#3FA372" stroke="#2C7A54" />
}

export function ProficiencyDie({ size }: DieProps) {
  return <BaseDie size={size} fill="#D9B84F" stroke="#A88E36" />
}

export function BoostDie({ size }: DieProps) {
  return <BaseDie size={size} fill="#8FCADD" stroke="#5FA3B8" />
}

export function DifficultyDie({ size }: DieProps) {
  return <BaseDie size={size} fill="#7B5EA8" stroke="#5C4380" />
}

export function ChallengeDie({ size }: DieProps) {
  return <BaseDie size={size} fill="#C0453D" stroke="#8F2F29" />
}

export function SetbackDie({ size }: DieProps) {
  return <BaseDie size={size} fill="#2A2A2E" stroke="#111113" />
}

export interface DicePoolCounts {
  ability?: number
  proficiency?: number
  boost?: number
  difficulty?: number
  challenge?: number
  setback?: number
}

export function DicePool(counts: DicePoolCounts) {
  const {
    proficiency = 0,
    ability = 0,
    boost = 0,
    challenge = 0,
    difficulty = 0,
    setback = 0,
  } = counts

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {Array.from({ length: proficiency }).map((_, i) => (
        <ProficiencyDie key={`prof${i}`} />
      ))}
      {Array.from({ length: ability }).map((_, i) => (
        <AbilityDie key={`abil${i}`} />
      ))}
      {Array.from({ length: boost }).map((_, i) => (
        <BoostDie key={`boost${i}`} />
      ))}
      {Array.from({ length: challenge }).map((_, i) => (
        <ChallengeDie key={`chal${i}`} />
      ))}
      {Array.from({ length: difficulty }).map((_, i) => (
        <DifficultyDie key={`diff${i}`} />
      ))}
      {Array.from({ length: setback }).map((_, i) => (
        <SetbackDie key={`set${i}`} />
      ))}
    </div>
  )
}