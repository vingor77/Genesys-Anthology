// Seed data for the `skills` Firestore collection, matching
// Master_Schema.html's Skills DB schema. 34 base Genesys skills (5
// Social, 20 General, 1 Knowledge, 8 Combat) plus 5 custom additions
// (Fabrication, Fine Crafting, Compounding, Knowledge (Anomalous),
// Knowledge (Store)). Game-agnostic — which subset a given game actually
// uses lives in that game's own config (BBB_SKILLS etc.), not here.

export interface SkillDoc {
  id: string
  name: string
  characteristic: 'brawn' | 'agility' | 'intellect' | 'cunning' | 'willpower' | 'presence'
  category: 'Combat' | 'Social' | 'Knowledge' | 'General'
  description: string
  usageGuidance?: string
  gameOverrides?: { [gameId: string]: { description?: string; usageGuidance?: string } }
}

export const SKILLS: SkillDoc[] = [
  // ---- Social ----
  { id: 'charm', name: 'Charm', characteristic: 'presence', category: 'Social',
    description: 'Genuine likability and persuasion.',
    usageGuidance: "Use for favors, flirtation, winning a crowd over, or appealing to someone's better nature. Not for outright lying (Deception) or issuing orders (Leadership) — and skip the check if you're asking someone already friendly for something trivial." },

  { id: 'coercion', name: 'Coercion', characteristic: 'willpower', category: 'Social',
    description: 'Intimidation through threats or physical menace.',
    usageGuidance: 'Use for threats, interrogation, or intimidation — even an implied one. Not for bargaining (Negotiation) or authority-backed orders (Leadership); skip it against someone already thoroughly cowed.' },

  { id: 'deception', name: 'Deception', characteristic: 'cunning', category: 'Social',
    description: 'Lying or misleading someone.',
    usageGuidance: 'Use for lies, selective omission, misleading phrasing, or disguises. Not if the character genuinely believes what they\'re saying, or for a harmless white lie.' },

  { id: 'leadership', name: 'Leadership', characteristic: 'presence', category: 'Social',
    description: 'Inspiring and directing others through charisma and authority.',
    usageGuidance: 'Use to rally frightened allies, sway a crowd, or command troops in the field. Not for threats (Coercion), simple charm (Charm), or routine orders nobody has reason to refuse.' },

  { id: 'negotiation', name: 'Negotiation', characteristic: 'presence', category: 'Social',
    description: 'Striking a deal where both sides offer something.',
    usageGuidance: "Use for haggling, brokering an agreement, or selling for profit. Not if nothing's being offered in return, or if the price was already fixed beforehand." },

  // ---- General (base) ----
  { id: 'alchemy', name: 'Alchemy', characteristic: 'intellect', category: 'General',
    description: 'Brewing potions, elixirs, and similar concoctions.',
    usageGuidance: 'Use to identify, prepare, or research a potion/elixir/remedy. Not for enchanting a mundane object or literal transmutation.' },

  { id: 'astrocartography', name: 'Astrocartography', characteristic: 'intellect', category: 'General',
    description: 'Reading and plotting interstellar star charts and courses.',
    usageGuidance: 'Use to chart a course through unfamiliar or dangerous space, or make sense of a damaged star chart. Not for actually flying the ship (Operating/Piloting) or navigating a planet\'s surface.' },

  { id: 'athletics', name: 'Athletics', characteristic: 'brawn', category: 'General',
    description: 'Physical exertion — climbing, running, swimming, jumping.',
    usageGuidance: 'Use when a physical feat has real difficulty or a real fall/failure risk. Skip it for anything trivial, and prefer Coordination for feats that are more about agility than raw strength.' },

  { id: 'computers', name: 'Computers', characteristic: 'intellect', category: 'General',
    description: 'Operating, hacking, and manipulating electronic systems.',
    usageGuidance: 'Use for hacking, cracking encryption, bypassing digital security, or doing anything outside a system\'s intended use. Not for everyday device use with no real risk of failure.' },

  { id: 'cool', name: 'Cool', characteristic: 'presence', category: 'General',
    description: 'Staying visibly calm and composed under pressure.',
    usageGuidance: "Use to resist being charmed/flattered, hold your nerve in a tense moment, or act first when you're the one setting up an ambush. Not for inner self-control against fear (Discipline) or noticing a surprise before it happens (Vigilance)." },

  { id: 'coordination', name: 'Coordination', characteristic: 'agility', category: 'General',
    description: 'Balance, flexibility, and hand-eye coordination.',
    usageGuidance: 'Use for tight squeezes, narrow surfaces, rope work, or slipping out of restraints. Prefer Athletics when the challenge is really about raw strength.' },

  { id: 'discipline', name: 'Discipline', characteristic: 'willpower', category: 'General',
    description: 'Mental focus, self-mastery, and resisting fear.',
    usageGuidance: 'Use to resist terror, keep your sanity against the impossible, or recover strain through meditation. Not for keeping a straight face socially (Cool) or catching someone else\'s lie (Vigilance).' },

  { id: 'driving', name: 'Driving', characteristic: 'agility', category: 'General',
    description: 'Operating ground vehicles requiring quick reflexes.',
    usageGuidance: 'Use for tight maneuvers, chases, or reacting to a sudden hazard while driving. Not for flying (Piloting), routine driving with no danger, or modifying a vehicle (Mechanics).' },

  { id: 'mechanics', name: 'Mechanics', characteristic: 'intellect', category: 'General',
    description: 'Building, repairing, or modifying mechanical equipment.',
    usageGuidance: 'Use to repair, sabotage, identify needed parts for, or build/modify equipment. Not for trivial tasks or for programming (Computers).' },

  { id: 'medicine', name: 'Medicine', characteristic: 'intellect', category: 'General',
    description: 'Treating wounds, illness, and performing medical procedures.',
    usageGuidance: 'Use to heal wounds or a Critical Injury, treat poison/disease, or perform surgery. Not to recover your own strain (Discipline/Cool) or to research a disease rather than treat it (Knowledge).' },

  { id: 'operating', name: 'Operating', characteristic: 'intellect', category: 'General',
    description: 'Piloting or crewing large vehicles too big for reflexes alone.',
    usageGuidance: 'Use for big, crewed vehicles under difficult conditions. Not for upgrading the vehicle itself (Mechanics) or routine operation with no real risk.' },

  { id: 'perception', name: 'Perception', characteristic: 'cunning', category: 'General',
    description: 'Active, conscious observation of your surroundings.',
    usageGuidance: 'Use when actively searching, studying, or watching something. Prefer Vigilance for unconscious/passive awareness, or Survival for tracking through wilderness.' },

  { id: 'piloting', name: 'Piloting', characteristic: 'agility', category: 'General',
    description: 'Operating aircraft/spacecraft that need quick reflexes.',
    usageGuidance: 'Use for dogfights, tight aerial maneuvers, or emergency landings. Not for repairing the craft (Mechanics), a mounted weapon (Ranged/Gunnery), or routine flight with no danger.' },

  { id: 'resilience', name: 'Resilience', characteristic: 'brawn', category: 'General',
    description: 'Physical endurance against exhaustion, toxins, and harsh conditions.',
    usageGuidance: 'Use for extended physical hardship — sleeplessness, poison, harsh environments, or recovering from a Critical Injury without medical help. Not for ordinary activity well within normal limits.' },

  { id: 'riding', name: 'Riding', characteristic: 'agility', category: 'General',
    description: 'Handling a mount, typically in pursuit, races, or danger.',
    usageGuidance: 'Use for chases, races, jousts, or controlling a panicked mount. Not for ordinary travel, attacking from horseback, or taming a wild animal (Survival).' },

  { id: 'skulduggery', name: 'Skulduggery', characteristic: 'cunning', category: 'General',
    description: 'Covert and criminal activity — locks, pockets, traps, security.',
    usageGuidance: 'Use for picking locks/pockets, disabling or setting traps, or casing a security system. Not for sneaking unseen (Stealth) or for making a poison in the first place (Medicine, though using one is still Skulduggery).' },

  { id: 'stealth', name: 'Stealth', characteristic: 'agility', category: 'General',
    description: 'Moving or acting without being noticed.',
    usageGuidance: "Use to hide, tail someone, or infiltrate unseen. Not for pickpocketing (Skulduggery), and skip the check if there's realistically no way to be seen — or no way to avoid it." },

  { id: 'streetwise', name: 'Streetwise', characteristic: 'cunning', category: 'General',
    description: 'Navigating and fitting into rough urban environments.',
    usageGuidance: "Use to find black-market goods, read criminal slang, or blend into a city's underworld. Prefer Survival in the wilderness, and don't lean on it for genuine high-society interactions." },

  { id: 'survival', name: 'Survival', characteristic: 'cunning', category: 'General',
    description: 'Finding food/water and enduring the wilderness.',
    usageGuidance: 'Use to forage, track through wilderness, read the weather, or handle/tame an animal. Prefer Streetwise in a city, and skip it for an animal that already likes you.' },

  { id: 'vigilance', name: 'Vigilance', characteristic: 'willpower', category: 'General',
    description: 'Passive, unconscious awareness of your surroundings.',
    usageGuidance: "Use for surprise Initiative, catching a lie as it's told, or noticing something you weren't looking for. Prefer Cool for Initiative when not surprised, and Perception when actively searching for something specific." },

  // ---- General (custom crafting trio) ----
  { id: 'fabrication', name: 'Fabrication', characteristic: 'brawn', category: 'General',
    description: 'Heavy physical construction — forging, masonry, carpentry.',
    usageGuidance: 'Use for anything needing raw force and heavy tools: metal weapons/armor, stonework, wooden construction. Not for delicate handwork (Fine Crafting) or chemical/culinary work (Compounding).' },

  { id: 'fine-crafting', name: 'Fine Crafting', characteristic: 'agility', category: 'General',
    description: 'Delicate, precise handwork — leather, cloth, glass, jewelry, pottery, carving.',
    usageGuidance: 'Use for anything needing fine motor control over force: leatherworking, weaving, glasswork, jewelry, painting, pottery, calligraphy, small mechanical tinkering. Not for heavy construction (Fabrication) or chemical work (Compounding).' },

  { id: 'compounding', name: 'Compounding', characteristic: 'intellect', category: 'General',
    description: 'Chemistry and mixture-based work — alchemy, brewing, poisons, cooking.',
    usageGuidance: 'Use to prepare or identify chemical mixtures, brews, poisons, herbal remedies, or complex cooking. Not for physical construction (Fabrication) or fine handwork (Fine Crafting).' },

  // ---- Knowledge ----
  { id: 'knowledge', name: 'Knowledge', characteristic: 'intellect', category: 'Knowledge',
    description: 'General academic and factual recall.',
    usageGuidance: 'Use for facts, research, or academic/logical problem-solving beyond common knowledge. Not for trivial information, or when the answer is one easy lookup away.' },

  { id: 'knowledge-anomalous', name: 'Knowledge (Anomalous)', characteristic: 'intellect', category: 'Knowledge',
    description: 'Lore and understanding of anomalous behavior and phenomena.',
    usageGuidance: 'Use to recognize an anomaly, recall relevant lore, or make sense of something that defies explanation. Shared across both anomaly-horror games rather than being setting-specific.' },

  { id: 'knowledge-store', name: 'Knowledge (Store)', characteristic: 'intellect', category: 'Knowledge',
    description: 'Store operations — layout, inventory, policy, product knowledge.',
    usageGuidance: 'Use to recall where something is stocked, what a policy actually says, or general product/merchandise trivia. Not for anything about anomalous phenomena (Knowledge (Anomalous)).' },

  // ---- Combat ----
  { id: 'brawl', name: 'Brawl', characteristic: 'brawn', category: 'Combat',
    description: 'Unarmed fighting — punches, grapples, martial arts.',
    usageGuidance: 'Use for fists, grappling, or a weapon specifically built to augment an unarmed strike. Not for a projectile/thrown weapon (Ranged) or repairing a melee weapon (Mechanics).' },

  { id: 'melee', name: 'Melee', characteristic: 'brawn', category: 'Combat',
    description: 'Close-combat fighting with a hand weapon, unsplit.',
    usageGuidance: "The all-purpose close-combat skill for settings that don't split Melee into Light/Heavy. Not for ranged or thrown attacks." },

  { id: 'melee-light', name: 'Melee (Light)', characteristic: 'brawn', category: 'Combat',
    description: 'One-handed close-combat weapons.',
    usageGuidance: 'Use for anything comfortably wielded in one hand — swords, knives, one-handed axes. Not for a weapon that needs both hands (Melee (Heavy)).' },

  { id: 'melee-heavy', name: 'Melee (Heavy)', characteristic: 'brawn', category: 'Combat',
    description: 'Two-handed close-combat weapons.',
    usageGuidance: 'Use for large weapons that need both hands — greatswords, mauls, halberds. Not for anything easily swung one-handed (Melee (Light)).' },

  { id: 'ranged', name: 'Ranged', characteristic: 'agility', category: 'Combat',
    description: 'Fighting at a distance, unsplit.',
    usageGuidance: "The all-purpose ranged skill for settings that don't split Ranged into Light/Heavy/Gunnery. Also covers throwing something. Not for melee, or using a ranged weapon as an improvised club (that's Melee)." },

  { id: 'ranged-light', name: 'Ranged (Light)', characteristic: 'agility', category: 'Combat',
    description: 'One-handed ranged weapons and thrown weapons.',
    usageGuidance: 'Use for pistols, thrown knives, and grenades. Not for a rifle-class weapon (Ranged (Heavy)) or anything vehicle/crew-mounted (Gunnery).' },

  { id: 'ranged-heavy', name: 'Ranged (Heavy)', characteristic: 'agility', category: 'Combat',
    description: 'Two-handed ranged weapons too large for Light.',
    usageGuidance: 'Use for rifles, shotguns, and similar two-handed firearms. Not for a pistol-class weapon (Ranged (Light)) or anything crewed/vehicle-mounted (Gunnery).' },

  { id: 'gunnery', name: 'Gunnery', characteristic: 'agility', category: 'Combat',
    description: 'Crewed or vehicle-mounted heavy weapons.',
    usageGuidance: "Use for anything needing a tripod or crew, or firing a vehicle's weapon systems. Not for anything handheld (Ranged (Light)/(Heavy))." },
]