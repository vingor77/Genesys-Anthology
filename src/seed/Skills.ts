// Seed data for the `skills` Firestore collection, matching Master_Schema.html's
// Skill DB schema (id, name, characteristic, description). Game config files
// (bbb.ts, backrooms.ts) define which of these are valid per game and which
// are career skills — this collection just holds the skill data itself.

export interface SkillDoc {
  id: string
  name: string
  characteristic: 'brawn' | 'agility' | 'intellect' | 'cunning' | 'willpower' | 'presence'
  description: string
}

export const SKILLS: SkillDoc[] = [
  { id: 'alchemy', name: 'Alchemy', characteristic: 'intellect', description: 'Brewing potions and elixirs.' },
  { id: 'astrocartography', name: 'Astrocartography', characteristic: 'intellect', description: 'Reading star charts, plotting courses.' },
  { id: 'athletics', name: 'Athletics', characteristic: 'brawn', description: 'Climbing, swimming, running, jumping.' },
  { id: 'computers', name: 'Computers', characteristic: 'intellect', description: 'Operating and hacking electronics.' },
  { id: 'cool', name: 'Cool', characteristic: 'presence', description: 'Staying calm under pressure.' },
  { id: 'coordination', name: 'Coordination', characteristic: 'agility', description: 'Balance and flexibility.' },
  { id: 'discipline', name: 'Discipline', characteristic: 'willpower', description: 'Mental self-control, resisting fear.' },
  { id: 'driving', name: 'Driving', characteristic: 'agility', description: 'Operating ground vehicles.' },
  { id: 'mechanics', name: 'Mechanics', characteristic: 'intellect', description: 'Building and repairing equipment.' },
  { id: 'medicine', name: 'Medicine', characteristic: 'intellect', description: 'Treating wounds and illness.' },
  { id: 'operating', name: 'Operating', characteristic: 'intellect', description: 'Piloting large vehicles or ships.' },
  { id: 'perception', name: 'Perception', characteristic: 'cunning', description: 'Actively searching your surroundings.' },
  { id: 'piloting', name: 'Piloting', characteristic: 'agility', description: 'Flying small aircraft or spacecraft.' },
  { id: 'resilience', name: 'Resilience', characteristic: 'brawn', description: 'Enduring fatigue and hardship.' },
  { id: 'riding', name: 'Riding', characteristic: 'agility', description: 'Riding and controlling mounts.' },
  { id: 'skulduggery', name: 'Skulduggery', characteristic: 'cunning', description: 'Lockpicking, pickpocketing, disabling traps.' },
  { id: 'stealth', name: 'Stealth', characteristic: 'agility', description: 'Moving or hiding unnoticed.' },
  { id: 'streetwise', name: 'Streetwise', characteristic: 'cunning', description: 'Navigating criminal and urban circles.' },
  { id: 'survival', name: 'Survival', characteristic: 'cunning', description: 'Enduring the wilderness.' },
  { id: 'vigilance', name: 'Vigilance', characteristic: 'willpower', description: 'Passive awareness of threats.' },
  { id: 'knowledge', name: 'Knowledge', characteristic: 'intellect', description: 'General academic know-how.' },
  { id: 'brawl', name: 'Brawl', characteristic: 'brawn', description: 'Unarmed combat.' },
  { id: 'melee', name: 'Melee', characteristic: 'brawn', description: 'Fighting with hand weapons.' },
  { id: 'melee-light', name: 'Melee (Light)', characteristic: 'brawn', description: 'One-handed melee weapons.' },
  { id: 'melee-heavy', name: 'Melee (Heavy)', characteristic: 'brawn', description: 'Two-handed melee weapons.' },
  { id: 'ranged', name: 'Ranged', characteristic: 'agility', description: 'Fighting at range or with thrown weapons.' },
  { id: 'ranged-light', name: 'Ranged (Light)', characteristic: 'agility', description: 'One-handed ranged weapons.' },
  { id: 'ranged-heavy', name: 'Ranged (Heavy)', characteristic: 'agility', description: 'Two-handed ranged weapons.' },
  { id: 'gunnery', name: 'Gunnery', characteristic: 'agility', description: 'Crew-served or vehicle-mounted weapons.' },
  // Social skills — descriptions paraphrased earlier in this project from
  // the book's actual Social Skills section, same as everything above.
  { id: 'charm', name: 'Charm', characteristic: 'presence', description: 'Winning people over.' },
  { id: 'coercion', name: 'Coercion', characteristic: 'willpower', description: 'Intimidating people into obeying.' },
  { id: 'deception', name: 'Deception', characteristic: 'cunning', description: 'Lying or misleading someone.' },
  { id: 'negotiation', name: 'Negotiation', characteristic: 'presence', description: 'Striking a deal.' },
  { id: 'leadership', name: 'Leadership', characteristic: 'presence', description: 'Inspiring loyalty, giving orders.' },
  // Custom splits of the base Knowledge skill — not book-standard, but
  // follow the same rule every other skill here does: the definition
  // lives in the shared collection regardless of which game actually
  // selects it, and each game's config picks its own subset (BB&B
  // currently being the only game that selects these two). "Knowledge"
  // itself already covers the general case — no separate
  // "Knowledge (General)" entry needed.
  { id: 'knowledge-cosmic', name: 'Knowledge (Cosmic)', characteristic: 'intellect', description: 'Lore of the Beyond.' },
  { id: 'knowledge-store', name: 'Knowledge (Store)', characteristic: 'intellect', description: 'Store layout and procedures.' },
]