import type { SkillCategory } from "./types";

/**
 * ── SKILL TREE ────────────────────────────────────────────────
 * Mastery levels are 0–100 and map to grades in the SKILLS window:
 * ≥90 S · ≥85 A · ≥78 B · else C. Category icons map by name in
 * skills-app.tsx — new categories fall back to a hexagon tile.
 */
export const skillCategories: SkillCategory[] = [
  {
    name: "AI Architectures & Principles",
    skills: [
      { name: "AI Agents", level: 95 },
      { name: "Multi-Agent Systems", level: 92 },
      { name: "Context Engineering", level: 94 },
      { name: "Prompt Engineering", level: 93 },
      { name: "RAG Systems", level: 90 },
      { name: "AI-driven Workflows", level: 91 },
    ],
  },
  {
    name: "AI Agent Stack",
    skills: [
      { name: "LangChain / LangGraph", level: 93 },
      { name: "LangSmith (observability)", level: 88 },
      { name: "MCP Protocol", level: 90 },
      { name: "CopilotKit / AG-UI Protocol", level: 89 },
    ],
  },
  {
    name: "Programming Languages",
    skills: [
      { name: "Python", level: 92 },
      { name: "TypeScript", level: 90 },
      { name: "JavaScript", level: 88 },
      { name: "Java", level: 80 },
    ],
  },
  {
    name: "Web Development",
    skills: [
      { name: "Next.js / React", level: 90 },
      { name: "FastAPI", level: 87 },
      { name: "Tailwind CSS / shadcn/ui / Radix", level: 88 },
      { name: "Zustand / Redux Toolkit", level: 84 },
      { name: "Zod / Drizzle ORM", level: 83 },
      { name: "Auth.js / KindeAuth", level: 82 },
      { name: "Cypress / next-intl", level: 80 },
    ],
  },
  {
    name: "Databases",
    skills: [
      { name: "PostgreSQL", level: 86 },
      { name: "Neo4j", level: 84 },
      { name: "Redis", level: 80 },
      { name: "MongoDB", level: 78 },
      { name: "MySQL", level: 78 },
    ],
  },
  {
    name: "DevOps & Observability",
    skills: [
      { name: "Docker / docker-compose", level: 85 },
      { name: "GitHub Actions / CI-CD", level: 84 },
      { name: "Prometheus / Grafana / Jaeger / OTel", level: 78 },
      { name: "Git / GitHub / GitLab / Jira", level: 88 },
      { name: "Linux / Unix", level: 86 },
    ],
  },
];
