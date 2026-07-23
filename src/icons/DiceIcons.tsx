import type { DieType, DieSymbol, RolledDie, RollResult } from '../lib/genesysDice'

interface DieProps {
  size?: number
}

// Real die shape per type — d6 is a square (a cube's face), d8 an
// octahedron (drawn as a diamond, the standard TTRPG-icon convention),
// d12 a dodecahedron (drawn as a pentagon, one actual face of the solid).
// One lookup shared by every consumer below, so the pool-builder icons
// and the rolled-result display can never end up drawing mismatched
// shapes for the same die type.
const DIE_SIDES: Record<DieType, 6 | 8 | 12> = {
  boost: 6,
  setback: 6,
  ability: 8,
  difficulty: 8,
  proficiency: 12,
  challenge: 12,
}

// Diamond points: N/E/S/W, touching all four viewBox edge midpoints.
const DIAMOND_POINTS = '10,0.8 19.2,10 10,19.2 0.8,10'

// Regular pentagon, point-up, centered at (10,10), radius 9.2 — computed
// once rather than re-derived per render.
const PENTAGON_POINTS = '10,0.8 18.75,7.16 15.41,17.44 4.59,17.44 1.25,7.16'

function DieOutline({ sides, fill, stroke }: { sides: 6 | 8 | 12; fill: string; stroke: string }) {
  if (sides === 6) {
    return <rect x="1" y="1" width="18" height="18" rx="4" fill={fill} stroke={stroke} strokeWidth="1" />
  }
  if (sides === 8) {
    return <polygon points={DIAMOND_POINTS} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
  }
  return <polygon points={PENTAGON_POINTS} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
}

function BaseDie({ size = 18, type, fill, stroke }: DieProps & { type: DieType; fill: string; stroke: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <DieOutline sides={DIE_SIDES[type]} fill={fill} stroke={stroke} />
    </svg>
  )
}

export function AbilityDie({ size }: DieProps) {
  return <BaseDie size={size} type="ability" fill="#3FA372" stroke="#2C7A54" />
}

export function ProficiencyDie({ size }: DieProps) {
  return <BaseDie size={size} type="proficiency" fill="#D9B84F" stroke="#A88E36" />
}

export function BoostDie({ size }: DieProps) {
  return <BaseDie size={size} type="boost" fill="#8FCADD" stroke="#5FA3B8" />
}

export function DifficultyDie({ size }: DieProps) {
  return <BaseDie size={size} type="difficulty" fill="#7B5EA8" stroke="#5C4380" />
}

export function ChallengeDie({ size }: DieProps) {
  return <BaseDie size={size} type="challenge" fill="#C0453D" stroke="#8F2F29" />
}

export function SetbackDie({ size }: DieProps) {
  return <BaseDie size={size} type="setback" fill="#2A2A2E" stroke="#111113" />
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

// ============================================================
// Below is new — face symbols for displaying actual roll results,
// distinct from the plain colored blocks above (which only ever
// represent an unrolled pool, not a landed face). Custom geometric
// shapes, not a reproduction of the official rulebook's glyph set.
// ============================================================

const DIE_FILL: Record<DieType, string> = {
  ability: '#3FA372',
  proficiency: '#D9B84F',
  boost: '#8FCADD',
  difficulty: '#7B5EA8',
  challenge: '#C0453D',
  setback: '#2A2A2E',
}

const DIE_STROKE: Record<DieType, string> = {
  ability: '#2C7A54',
  proficiency: '#A88E36',
  boost: '#5FA3B8',
  difficulty: '#5C4380',
  challenge: '#8F2F29',
  setback: '#111113',
}

// Every symbol renders white-with-dark-outline so it stays legible
// against any of the six die colors above, including Boost's lighter blue.
function SymbolGlyph({ symbol, x, y, scale = 1 }: { symbol: DieSymbol; x: number; y: number; scale?: number }) {
  const s = scale
  switch (symbol) {
    case 'success':
      return <circle cx={x} cy={y} r={2.6 * s} fill="#fff" stroke="#00000055" strokeWidth="0.4" />
    case 'advantage':
      return <polygon points={`${x},${y - 3 * s} ${x - 2.8 * s},${y + 2.2 * s} ${x + 2.8 * s},${y + 2.2 * s}`} fill="#fff" stroke="#00000055" strokeWidth="0.4" />
    case 'threat':
      return <polygon points={`${x},${y + 3 * s} ${x - 2.8 * s},${y - 2.2 * s} ${x + 2.8 * s},${y - 2.2 * s}`} fill="#fff" stroke="#00000055" strokeWidth="0.4" />
    case 'failure':
      return (
        <g stroke="#fff" strokeWidth={1.3 * s} strokeLinecap="round">
          <line x1={x - 2.4 * s} y1={y - 2.4 * s} x2={x + 2.4 * s} y2={y + 2.4 * s} />
          <line x1={x - 2.4 * s} y1={y + 2.4 * s} x2={x + 2.4 * s} y2={y - 2.4 * s} />
        </g>
      )
    case 'triumph': {
      const points = Array.from({ length: 5 }).map((_, i) => {
        const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2
        const innerAngle = outerAngle + Math.PI / 5
        const ox = x + 3.4 * s * Math.cos(outerAngle)
        const oy = y + 3.4 * s * Math.sin(outerAngle)
        const ix = x + 1.4 * s * Math.cos(innerAngle)
        const iy = y + 1.4 * s * Math.sin(innerAngle)
        return `${ox},${oy} ${ix},${iy}`
      }).join(' ')
      return <polygon points={points} fill="#FFE9A8" stroke="#00000055" strokeWidth="0.4" />
    }
    case 'despair':
      return (
        <polygon
          points={`${x},${y - 3.2 * s} ${x + 3.2 * s},${y} ${x},${y + 3.2 * s} ${x - 3.2 * s},${y}`}
          fill="#0D0D0F"
          stroke="#fff"
          strokeWidth="0.5"
        />
      )
    default:
      return null
  }
}

// Displays one already-rolled die, background color plus its landed
// face's symbol(s) — 0 (blank), 1 (centered), or 2 (side by side). The
// background shape matches the die's real physical shape (square/
// diamond/pentagon), same DIE_SIDES lookup the pool-builder icons use.
export function RolledDieDisplay({ die, size = 32 }: { die: RolledDie; size?: number }) {
  const fill = DIE_FILL[die.type]
  const stroke = DIE_STROKE[die.type]
  const symbols = die.symbols
  const positions: [number, number][] =
    symbols.length === 2 ? [[7, 10], [13, 10]] : [[10, 10]]

  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <DieOutline sides={DIE_SIDES[die.type]} fill={fill} stroke={stroke} />
      {symbols.map((symbol, i) => (
        <SymbolGlyph key={i} symbol={symbol} x={positions[i][0]} y={positions[i][1]} scale={symbols.length === 2 ? 0.75 : 1} />
      ))}
    </svg>
  )
}

// Small legend swatch for the results summary line (Success/Failure/etc.
// counts) — a symbol on its own, no die background, sized to sit inline
// with text. Not tied to one physical die (a symbol like Success can
// land on a d6, d8, or d12), so this stays a neutral rounded chip rather
// than picking one of the three shapes.
export function SymbolIcon({ symbol, size = 14 }: { symbol: DieSymbol; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <rect x="1" y="1" width="18" height="18" rx="4" fill="#3A3D4A" />
      <SymbolGlyph symbol={symbol} x={10} y={10} scale={1.15} />
    </svg>
  )
}

// A full row of already-rolled dice — extracted so the roller and the
// future shared chat log render an identical result the same way,
// rather than one of them drifting from a copy-pasted version.
export function RolledDiceRow({ dice, size = 28 }: { dice: RolledDie[]; size?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {dice.map((die, i) => (
        <RolledDieDisplay key={i} die={die} size={size} />
      ))}
    </div>
  )
}

// Same reasoning as RolledDiceRow — the net success/failure/advantage/
// threat/triumph/despair summary line, shared between the roller's own
// display and each chat log entry.
export function RollResultSummary({ result }: { result: RollResult }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {result.netSuccess === 0 && result.netFailure === 0 && (
        <span className="text-sm text-fg-muted">No net success or failure</span>
      )}
      {result.netSuccess > 0 && (
        <span className="flex items-center gap-1.5 text-sm text-fg">
          <SymbolIcon symbol="success" /> {result.netSuccess} Success{result.netSuccess !== 1 ? 'es' : ''}
        </span>
      )}
      {result.netFailure > 0 && (
        <span className="flex items-center gap-1.5 text-sm text-fg">
          <SymbolIcon symbol="failure" /> {result.netFailure} Failure{result.netFailure !== 1 ? 's' : ''}
        </span>
      )}
      {result.netAdvantage > 0 && (
        <span className="flex items-center gap-1.5 text-sm text-fg">
          <SymbolIcon symbol="advantage" /> {result.netAdvantage} Advantage
        </span>
      )}
      {result.netThreat > 0 && (
        <span className="flex items-center gap-1.5 text-sm text-fg">
          <SymbolIcon symbol="threat" /> {result.netThreat} Threat
        </span>
      )}
      {result.triumph > 0 && (
        <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <SymbolIcon symbol="triumph" /> {result.triumph} Triumph
        </span>
      )}
      {result.despair > 0 && (
        <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <SymbolIcon symbol="despair" /> {result.despair} Despair
        </span>
      )}
    </div>
  )
}