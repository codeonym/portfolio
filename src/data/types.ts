export type QuestRank = "S" | "A" | "B";
export type QuestStatus = "cleared" | "ongoing";

export interface Stat {
  /** Solo Leveling stat code (STR, INT, ...) */
  code: string;
  /** What the stat actually measures */
  label: string;
  /** 0–100 */
  value: number;
}

export interface PlayerLinks {
  github: string;
  linkedin: string;
  email: string;
}

export interface Player {
  name: string;
  handle: string;
  title: string;
  job: string;
  location: string;
  level: number;
  profile: string[];
  creed: string;
  stats: Stat[];
  links: PlayerLinks;
  languages: { name: string; grade: string }[];
}

export interface Quest {
  id: string;
  name: string;
  rank: QuestRank;
  type: "main" | "side";
  status: QuestStatus;
  period?: string;
  summary: string;
  details: string[];
  /** tech stack, framed as quest rewards */
  rewards: string[];
  link?: string;
}

export interface Skill {
  name: string;
  /** 0–100 mastery */
  level: number;
}

export interface SkillCategory {
  name: string;
  skills: Skill[];
}

export interface ChronicleEntry {
  id: string;
  role: string;
  organization: string;
  period: string;
  summary: string;
  highlights: string[];
}

export interface Achievement {
  id: string;
  title: string;
  issuer: string;
  period: string;
}
