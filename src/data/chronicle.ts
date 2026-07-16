import type { Achievement, ChronicleEntry } from "./types";

export const chronicle: ChronicleEntry[] = [
  {
    id: "opensnz-engineer",
    role: "Software Engineer & AI Developer",
    organization: "OpenSNZ-Technology",
    period: "2025/09 – Present",
    summary:
      "Design, implementation, and maintenance of agentic AI systems — from rapid prototyping to production-ready solutions, including complex agent-driven architectures.",
    highlights: [
      "Agentic AI & context engineering",
      "LangChain/LangGraph + LangSmith",
      "MCP integrations",
      "RAG systems",
      "AG-UI / CopilotKit",
    ],
  },
  {
    id: "opensnz-pfe",
    role: "AI Agent Developer — PFE Internship",
    organization: "OpenSNZ-Technology · Oujda, Morocco",
    period: "2025/02 – 2025/08",
    summary:
      "Developed a Multi-Agent System for intelligent pharmaceutical catalog analysis, automating data extraction and coordinating specialized AI agents for querying, cost aggregation, reporting, and decision support.",
    highlights: [
      "Multi-Agent Systems",
      "LLM-driven workflows",
      "Knowledge Graph + RAG",
      "MCP & CopilotKit (AG-UI)",
      "Modular agent-based architecture",
    ],
  },
];

export const achievements: Achievement[] = [
  {
    id: "master-cs",
    title: "Specialized Master in Computer Science Engineering",
    issuer: "Faculty of Sciences (FSO), Oujda",
    period: "2023 – 2025",
  },
  {
    id: "bachelor-math-cs",
    title: "Bachelor's Degree in Mathematics and Computer Sciences",
    issuer: "Faculty of Sciences (FSO), Oujda",
    period: "2019 – 2023",
  },
  {
    id: "bac",
    title: "Scientific Baccalaureate (Physical Sciences)",
    issuer: "Essaadiyine Qualifying High School, El Aioun Sidi Mellouk",
    period: "2019",
  },
];
