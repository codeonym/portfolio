import type { Player } from "./types";

/**
 * ── PLAYER RECORD ─────────────────────────────────────────────
 * Identity shown in STATUS, the avatar stage, the top bar and SUMMON.
 * Stat values are 0–100; stat icons/colors map by `code` in stat-bar.tsx.
 */
export const player: Player = {
  name: "BOUAROUR AYOUB",
  handle: "codeonym",
  title: "Agentic Systems Developer",
  job: "AI Software Engineer",
  location: "Oujda, Morocco",
  guild: "OpenSNZ-Technology",
  // months of XP since the journey began (2019)
  level: 82,
  rank: "A",
  rankNote: "S-RANK ASSESSMENT PENDING",
  titles: [
    {
      id: "agent-summoner",
      name: "Agent Summoner",
      description:
        "Raises AI agents as digital entities that level up, acquire skills and grow — never as static software.",
    },
    {
      id: "citadel-architect",
      name: "Architect of the Citadel",
      description:
        "Designed the modular multi-agent architecture that cleared the S-rank pharmaceutical catalog raid.",
    },
    {
      id: "gate-opener",
      name: "Gate Opener",
      description:
        "Grounds agents in enterprise systems through MCP — opening gates between AI and legacy realms.",
    },
    {
      id: "voice-of-three-tongues",
      name: "Voice of Three Tongues",
      description:
        "Speaks Arabic, English and French — no party goes unheard.",
    },
  ],
  profile: [
    "AI Software Engineer specializing in the design and development of agentic AI systems — from LLM-driven workflows to autonomous AI agents and multi-agent architectures (MAS).",
    "Skilled in connecting AI agents to legacy and enterprise systems, grounding them with rich contextual data via MCP, and deploying them into real-world applications with AG-UI and CopilotKit for seamless human-AI interaction.",
    "Driven by the belief that software is evolving toward a new paradigm where LLMs act as operating systems and natural language becomes the primary programming interface.",
  ],
  creed:
    "I don't build AI agents as traditional software. I build them as digital entities that continuously evolve, acquire new capabilities, and grow more competent over time — like leveling up a game character, unlocking new skills, and watching it grow.",
  stats: [
    { code: "INT", label: "Agentic AI & Multi-Agent Systems", value: 94 },
    { code: "MP", label: "Prompt & Context Engineering", value: 92 },
    { code: "STR", label: "Backend Engineering", value: 86 },
    { code: "AGI", label: "Frontend Engineering", value: 84 },
    { code: "VIT", label: "DevOps & Infrastructure", value: 78 },
    { code: "PER", label: "Observability (LangSmith / OTel)", value: 80 },
  ],
  links: {
    github: "https://github.com/codeonym",
    linkedin: "https://www.linkedin.com/in/codeonym/",
    email: "bouarourayoub0@gmail.com",
  },
  languages: [
    { name: "Arabic", grade: "Native" },
    { name: "English", grade: "Proficient" },
    { name: "French", grade: "Technical" },
  ],
};
