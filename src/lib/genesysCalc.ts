export interface Characteristics {
  brawn: number
  agility: number
  intellect: number
  cunning: number
  willpower: number
  presence: number
}

export interface CharacterSkill {
  name: string
  rank: number
}

export type TalentTier = 1 | 2 | 3 | 4 | 5

export interface CharacterTalent {
  name: string
  tier: TalentTier
  rank: number
}

export function characteristicCost(rank: number, base = 2): number {
  let cost = 0
  for (let r = base + 1; r <= rank; r++) {
    cost += 10 * r
  }
  return cost
}

export function skillCost(rank: number, isCareer: boolean, freeRank: 0 | 1 = 0): number {
  let cost = 0
  for (let r = freeRank + 1; r <= rank; r++) {
    cost += isCareer ? 5 * r : 5 * r + 5
  }
  return cost
}

export function talentCost(talents: CharacterTalent[]): number {
  return talents.reduce((sum, t) => sum + 5 * t.tier, 0)
}

export function canBuyTalent(talents: CharacterTalent[], tier: TalentTier): boolean {
  if (tier === 1) return true
  const countAtTier = (t: number) => talents.filter((x) => x.tier === t).length
  return countAtTier(tier - 1) >= countAtTier(tier) + 2
}

export function getTalentPrerequisiteName(name: string): string | null {
  if (name.endsWith(' (Supreme)')) {
    return name.replace(' (Supreme)', ' (Improved)')
  }
  if (name.endsWith(' (Improved)')) {
    return name.replace(' (Improved)', '')
  }
  return null
}

export function tierForRank(baseTier: TalentTier, rank: number): TalentTier {
  const t = baseTier + (rank - 1)
  return (t > 5 ? 5 : t) as TalentTier
}

export function reconcileTalents(talents: CharacterTalent[]): CharacterTalent[] {
  let result = [...talents]
  let changed = true

  while (changed) {
    changed = false

    const orphanByName = result.find((t) => {
      const prereq = getTalentPrerequisiteName(t.name)
      return prereq !== null && !result.some((x) => x.name === prereq)
    })
    if (orphanByName) {
      result = result.filter((x) => x !== orphanByName)
      changed = true
      continue
    }

    const strandedRank = result.find(
      (t) => t.rank > 1 && !result.some((x) => x.name === t.name && x.rank === t.rank - 1)
    )
    if (strandedRank) {
      result = result.filter((x) => x !== strandedRank)
      changed = true
      continue
    }

    for (const tier of [2, 3, 4, 5] as const) {
      const countBelow = result.filter((x) => x.tier === tier - 1).length
      const atTier = result.filter((x) => x.tier === tier)
      if (atTier.length > 0 && countBelow < atTier.length + 1) {
        const toRemove = atTier[atTier.length - 1]
        result = result.filter((x) => x !== toRemove)
        changed = true
        break
      }
    }
  }

  return result
}

export function derivedStats(
  characteristics: Characteristics,
  armorSoakBonus = 0,
  armorMeleeDefenseBonus = 0,
  armorRangedDefenseBonus = 0
) {
  return {
    soak: characteristics.brawn + armorSoakBonus,
    woundThreshold: 10 + characteristics.brawn,
    strainThreshold: 10 + characteristics.willpower,
    meleeDefense: armorMeleeDefenseBonus,
    rangedDefense: armorRangedDefenseBonus,
  }
}

export interface DicePool {
  ability: number
  proficiency: number
}

export function calculateDicePool(characteristicRank: number, skillRank: number): DicePool {
  const total = Math.max(characteristicRank, skillRank)
  const proficiency = Math.min(characteristicRank, skillRank)
  return { ability: total - proficiency, proficiency }
}

export function totalSpentXP(
  characteristics: Characteristics,
  skills: CharacterSkill[],
  careerSkillNames: string[],
  freeSkillNames: string[],
  talents: CharacterTalent[]
): number {
  const charCost = Object.values(characteristics).reduce(
    (sum, rank) => sum + characteristicCost(rank),
    0
  )

  const skillsCost = skills.reduce((sum, skill) => {
    const isCareer = careerSkillNames.includes(skill.name)
    const freeRank: 0 | 1 = freeSkillNames.includes(skill.name) ? 1 : 0
    return sum + skillCost(skill.rank, isCareer, freeRank)
  }, 0)

  return charCost + skillsCost + talentCost(talents)
}

// ---- Weapon qualities (standard Genesys, same across any game) ----

export interface WeaponQualityDef {
  name: string
  ranked: boolean
  description: string
}

export const GENESYS_WEAPON_QUALITIES: WeaponQualityDef[] = [
  { name: 'Accurate', ranked: true, description: 'Adds a boost die per rating to combat checks made with this weapon.' },
  { name: 'Auto-fire', ranked: false, description: 'Can spend advantage on a hit for each extra hit; using it raises the check difficulty by one setback.' },
  { name: 'Blast', ranked: true, description: "On a hit, everyone engaged with the target also takes a hit for the Blast rating plus the attack's success count." },
  { name: 'Breach', ranked: true, description: 'Ignores one point of armor (and 10 soak against vehicles) per rating.' },
  { name: 'Burn', ranked: true, description: 'On trigger, the target takes the base damage again at the start of each of their turns for a number of rounds equal to its rating.' },
  { name: 'Concussive', ranked: true, description: 'On a hit, staggers the target for a number of rounds equal to its rating — they cannot take actions while staggered.' },
  { name: 'Cumbersome', ranked: true, description: 'Requires Brawn at least equal to its rating; each point short adds one difficulty to checks made with it.' },
  { name: 'Defensive', ranked: true, description: "Adds its rating to the wielder's melee defense while carried." },
  { name: 'Deflection', ranked: true, description: "Adds its rating to the wielder's ranged defense while carried." },
  { name: 'Disorient', ranked: true, description: 'On a hit, disorients the target for a number of rounds equal to its rating, adding setback to their skill checks.' },
  { name: 'Ensnare', ranked: true, description: 'On a hit, immobilizes the target for a number of rounds equal to its rating; they can attempt a Hard Athletics check to break free.' },
  { name: 'Guided', ranked: true, description: 'On a miss, can spend advantage to attempt a follow-up strike at the end of the round.' },
  { name: 'Inaccurate', ranked: true, description: 'Adds setback per rating to combat checks made with this weapon.' },
  { name: 'Inferior', ranked: false, description: 'Generates an automatic threat on any check made using it.' },
  { name: 'Knockdown', ranked: false, description: 'Spend two advantage on a hit to knock the target prone.' },
  { name: 'Limited Ammo', ranked: true, description: 'Can be fired a number of times equal to its rating before needing a reload maneuver.' },
  { name: 'Linked', ranked: true, description: 'Can spend advantage on a hit for extra hits against the same target, up to its rating.' },
  { name: 'Pierce', ranked: true, description: 'Ignores soak equal to its rating.' },
  { name: 'Prepare', ranked: true, description: 'Requires that many preparation maneuvers before it can be used.' },
  { name: 'Reinforced', ranked: false, description: 'Immune to being damaged by the Sunder quality (or, on armor, blocks Pierce and Breach entirely).' },
  { name: 'Slow-Firing', ranked: true, description: 'That many rounds must pass after firing before it can be fired again.' },
  { name: 'Stun', ranked: true, description: 'On trigger, deals strain equal to its rating directly (ignores soak, since this is strain, not strain damage).' },
  { name: 'Stun Damage', ranked: false, description: 'All damage this weapon deals applies to strain instead of wounds (still reduced by soak).' },
  { name: 'Sunder', ranked: false, description: "Can spend advantage to damage one of the target's wielded items a step, even on a miss." },
  { name: 'Superior', ranked: false, description: 'Generates an automatic success on any check made using it.' },
  { name: 'Tractor', ranked: true, description: 'Immobilizes the target unless they beat a Piloting check with difficulty equal to its rating.' },
  { name: 'Unwieldy', ranked: true, description: 'Requires Agility at least equal to its rating; each point short adds one difficulty to checks made with it.' },
  { name: 'Vicious', ranked: true, description: 'On a Critical Injury from this weapon, add 10x its rating to the Critical roll.' },
]

// ---- Talents (standard Genesys base catalog, overridable per-game) ----

export interface TalentConfig {
  name: string
  tier: TalentTier
  description?: string
  ranked?: boolean
  requiresSkillChoice?: boolean
  skillChoiceCount?: number
  skillChoiceCountAtRank?: (rank: number) => number
  skillChoiceExclude?: string[]
  requiresCharacteristicChoice?: boolean
  characteristicChoiceCount?: number
}

export const GENESYS_TALENTS: TalentConfig[] = [
  // Tier 1
  { name: 'Bought Info', tier: 1, description: "Pay currency (50x the check's difficulty) to auto-succeed a Knowledge check with one success instead of rolling, GM permitting." },
  { name: 'Clever Retort', tier: 1, description: "Once per encounter, add two setback dice to another character's social skill check, even outside your turn." },
  { name: 'Desperate Recovery', tier: 1, description: "If your strain is over half your threshold at the end of an encounter, heal two extra strain during normal recovery." },
  { name: 'Durable', tier: 1, ranked: true, description: 'Reduces the result rolled on any Critical Injury by 10 per rank (minimum 1).' },
  { name: 'Grit', tier: 1, ranked: true, description: '+1 Strain Threshold per rank.' },
  { name: 'Jump Up', tier: 1, description: 'Once per round on your turn, stand up from prone or seated as a free incidental.' },
  {
    name: 'Knack For It', tier: 1, ranked: true,
    description: 'Pick a skill (not combat skills) — remove one setback die from checks with it. Each further rank lets you pick two more skills for the same benefit.',
    requiresSkillChoice: true,
    skillChoiceCountAtRank: (rank: number) => (rank === 1 ? 1 : 2),
  },
  { name: 'Know Somebody', tier: 1, ranked: true, description: "Once per session, reduce a legally-purchasable item's rarity by one per rank." },
  { name: 'Parry', tier: 1, ranked: true, description: 'When hit by a melee attack, spend 3 strain to reduce the damage by two plus your ranks. Requires wielding a melee weapon.' },
  { name: 'Proper Upbringing', tier: 1, ranked: true, description: 'In polite settings, spend strain (up to your ranks) to add that many advantage to a social check.' },
  { name: 'Quick Draw', tier: 1, description: "Once per round, draw or holster a weapon as a free incidental; also lowers a weapon's Prepare rating by one." },
  { name: 'Quick Strike', tier: 1, ranked: true, description: "Add a boost die per rank to combat checks against targets who haven't acted yet this encounter." },
  { name: 'Rapid Reaction', tier: 1, ranked: true, description: 'Spend strain (up to your ranks) to add that many success to a Vigilance or Cool Initiative check.' },
  { name: 'Second Wind', tier: 1, ranked: true, description: 'Once per encounter, heal strain equal to your ranks.' },
  { name: 'Swift', tier: 1, description: 'Move through difficult terrain at full speed with no extra maneuver cost.' },
  { name: 'Toughened', tier: 1, ranked: true, description: '+2 Wound Threshold per rank.' },

  // Tier 2
  {
    name: 'Coordinated Assault', tier: 2, ranked: true,
    description: 'Once per turn, allies engaged with you (up to your Leadership ranks) gain a boost die on combat checks until your next turn. Range extends per rank beyond the first.',
  },
  { name: 'Counteroffer', tier: 2, description: 'Once per session, opposed Negotiation vs. Discipline against a non-boss enemy in medium range; success staggers them, and a strong success can temporarily turn them friendly.' },
  { name: 'Heightened Awareness', tier: 2, description: 'Allies within short range get a boost die on Perception/Vigilance; engaged allies get two boost dice instead.' },
  {
    name: 'Inspiring Rhetoric', tier: 2,
    description: 'Make a Leadership check; each success heals one strain to an ally in short range, each advantage heals an extra strain to someone already helped.',
  },
  { name: 'Inventor', tier: 2, ranked: true, description: "Add a boost die per rank when building or modifying gear; can also attempt to recreate devices you've only heard described." },
  {
    name: 'Lucky Strike', tier: 2,
    description: 'Pick a characteristic when bought. After a successful combat hit, spend a Story Point to add bonus damage equal to your rating in that characteristic.',
    requiresCharacteristicChoice: true,
  },
  { name: 'Scathing Tirade', tier: 2, description: 'Make a Coercion check; each success deals one strain to an enemy in short range, each advantage deals an extra strain to someone already hit.' },
  { name: 'Side Step', tier: 2, ranked: true, description: 'Once per round, spend strain (up to your ranks) to upgrade the difficulty of ranged attacks against you that many times until your next turn.' },

  // Tier 3
  { name: 'Dodge', tier: 3, ranked: true, description: 'Like Side Step, but works against any attack (not just ranged) targeting you.' },
  {
    name: 'Field Commander', tier: 3,
    description: 'Make a Leadership check; success lets a number of allies equal to your Presence each spend 1 strain to take a free maneuver out of turn.',
  },
  { name: 'Forgot to Count?', tier: 3, description: "Spend two advantage from an enemy's ranged attack roll to make their weapon run out of ammo." },
  {
    name: 'Inspiring Rhetoric (Improved)', tier: 3,
    description: 'Requires Inspiring Rhetoric. Allies healed by your Inspiring Rhetoric also gain a boost die on checks for a number of rounds equal to your Leadership ranks.',
  },
  { name: 'Painkiller Specialization', tier: 3, ranked: true, description: 'Painkillers you administer heal one extra wound per rank (still capped at five uses per day).' },
  {
    name: 'Scathing Tirade (Improved)', tier: 3,
    description: 'Requires Scathing Tirade. Enemies hit by your Scathing Tirade also take a setback die on checks for a number of rounds equal to your Coercion ranks.',
  },
  {
    name: 'Heroic Will', tier: 3,
    description: 'Pick two characteristics when bought. Spend a Story Point to ignore Critical Injury penalties on checks using either characteristic for the rest of the encounter.',
    requiresCharacteristicChoice: true,
    characteristicChoiceCount: 2,
  },
  {
    name: 'Natural', tier: 3,
    description: 'Pick two skills when bought. Once per session, reroll a check made with either of those skills.',
    requiresSkillChoice: true,
    skillChoiceCount: 2,
  },

  // Tier 4
  { name: "Can't We Talk About This?", tier: 4, description: 'Opposed Charm/Deception vs. Discipline against a non-boss enemy in medium range; success stops them attacking you until their next turn (spendable successes extend it further).' },
  { name: 'Deadeye', tier: 4, description: 'After rolling a ranged Critical Injury, spend 2 strain to swap it for a different Critical Injury of the same severity.' },
  { name: 'Defensive', tier: 4, ranked: true, description: '+1 melee and ranged Defense per rank.' },
  { name: 'Enduring', tier: 4, ranked: true, description: '+1 Soak per rank.' },
  {
    name: 'Field Commander (Improved)', tier: 4,
    description: 'Requires Field Commander. Now affects allies equal to twice your Presence, and a strong success lets one ally take a full action instead of a maneuver.',
  },
  {
    name: 'How Convenient!', tier: 4,
    description: 'Once per session, a Hard Mechanics check makes a device involved in the current scene conveniently break down.',
  },
  {
    name: 'Inspiring Rhetoric (Supreme)', tier: 4,
    description: 'Requires Inspiring Rhetoric (Improved). Spend 1 strain to use Inspiring Rhetoric as a maneuver instead of an action.',
  },
  {
    name: 'Mad Inventor', tier: 4,
    description: 'Once per session, a Mechanics check (difficulty set by rarity) jury-rigs a working equivalent of an item from scrap.',
  },
  {
    name: 'Scathing Tirade (Supreme)', tier: 4,
    description: 'Requires Scathing Tirade (Improved). Spend 1 strain to use Scathing Tirade as a maneuver instead of an action.',
  },

  // Tier 5
  {
    name: 'Dedication', tier: 5, ranked: true,
    description: '+1 to a characteristic of your choice per rank (max 5); the same characteristic cannot be boosted twice.',
    requiresCharacteristicChoice: true,
  },
  { name: 'Indomitable', tier: 5, description: 'Once per encounter, spend a Story Point to avoid being incapacitated until the end of your next turn, even past your wound or strain threshold.' },
  {
    name: 'Master', tier: 5,
    description: "Pick a skill when bought. Once per round, spend 2 strain to lower that skill's next check difficulty by two (minimum Easy).",
    requiresSkillChoice: true,
  },
  { name: 'Ruinous Repartee', tier: 5, description: 'Opposed Charm/Coercion vs. Discipline on one target in medium range; success deals strain to them (twice your Presence, plus one per success) and heals you the same amount.' },
]

export function mergeConfigsByName<T extends { name: string }>(
  base: T[],
  overrides: (Partial<T> & { name: string })[]
): T[] {
  const merged = base.map((item) => {
    const override = overrides.find((o) => o.name === item.name)
    return override ? { ...item, ...override } : item
  })
  const additions = overrides.filter((o) => !base.some((item) => item.name === o.name)) as T[]
  return [...merged, ...additions]
}

// Kept as an alias so existing talent-specific code doesn't need to change.
export const applyTalentOverrides = mergeConfigsByName<TalentConfig>

// ---- Skills (standard Genesys base catalog, overridable/extendable per-game) ----

export interface SkillDef {
  name: string
  characteristic: keyof Characteristics
  description?: string
}

export const GENESYS_SKILLS: SkillDef[] = [
  { name: 'Alchemy', characteristic: 'intellect', description: 'Brewing potions and elixirs.' },
  { name: 'Astrocartography', characteristic: 'intellect', description: 'Reading star charts, plotting courses.' },
  { name: 'Athletics', characteristic: 'brawn', description: 'Climbing, swimming, running, jumping.' },
  { name: 'Computers', characteristic: 'intellect', description: 'Operating and hacking electronics.' },
  { name: 'Cool', characteristic: 'presence', description: 'Staying calm under pressure.' },
  { name: 'Coordination', characteristic: 'agility', description: 'Balance and flexibility.' },
  { name: 'Discipline', characteristic: 'willpower', description: 'Mental self-control, resisting fear.' },
  { name: 'Driving', characteristic: 'agility', description: 'Operating ground vehicles.' },
  { name: 'Mechanics', characteristic: 'intellect', description: 'Building and repairing equipment.' },
  { name: 'Medicine', characteristic: 'intellect', description: 'Treating wounds and illness.' },
  { name: 'Operating', characteristic: 'intellect', description: 'Piloting large vehicles or ships.' },
  { name: 'Perception', characteristic: 'cunning', description: 'Actively searching your surroundings.' },
  { name: 'Piloting', characteristic: 'agility', description: 'Flying small aircraft or spacecraft.' },
  { name: 'Resilience', characteristic: 'brawn', description: 'Enduring fatigue and hardship.' },
  { name: 'Riding', characteristic: 'agility', description: 'Riding and controlling mounts.' },
  { name: 'Skulduggery', characteristic: 'cunning', description: 'Lockpicking, pickpocketing, disabling traps.' },
  { name: 'Stealth', characteristic: 'agility', description: 'Moving or hiding unnoticed.' },
  { name: 'Streetwise', characteristic: 'cunning', description: 'Navigating criminal and urban circles.' },
  { name: 'Survival', characteristic: 'cunning', description: 'Enduring the wilderness.' },
  { name: 'Vigilance', characteristic: 'willpower', description: 'Passive awareness of threats.' },
  { name: 'Knowledge', characteristic: 'intellect', description: 'General academic know-how.' },
  { name: 'Brawl', characteristic: 'brawn', description: 'Unarmed combat.' },
  { name: 'Melee', characteristic: 'brawn', description: 'Fighting with hand weapons.' },
  { name: 'Melee (Light)', characteristic: 'brawn', description: 'One-handed melee weapons.' },
  { name: 'Melee (Heavy)', characteristic: 'brawn', description: 'Two-handed melee weapons.' },
  { name: 'Ranged', characteristic: 'agility', description: 'Fighting at range or with thrown weapons.' },
  { name: 'Ranged (Light)', characteristic: 'agility', description: 'One-handed ranged weapons.' },
  { name: 'Ranged (Heavy)', characteristic: 'agility', description: 'Two-handed ranged weapons.' },
  { name: 'Gunnery', characteristic: 'agility', description: 'Crew-served or vehicle-mounted weapons.' },
  // Social skills — characteristics as commonly used; full descriptions
  // pending the Social skills section of the book (not yet provided).
  { name: 'Charm', characteristic: 'presence', description: 'Winning people over.' },
  { name: 'Coercion', characteristic: 'willpower', description: 'Intimidating people into obeying.' },
  { name: 'Deception', characteristic: 'cunning', description: 'Lying or misleading someone.' },
  { name: 'Negotiation', characteristic: 'presence', description: 'Striking a deal.' },
  { name: 'Leadership', characteristic: 'presence', description: 'Inspiring loyalty, giving orders.' },
]