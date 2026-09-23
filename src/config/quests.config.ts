import type { Quest } from "./types";

/**
 * ── QUEST LOG ─────────────────────────────────────────────────
 * main quests = the Player's engagements (the OpenSNZ questline);
 * side quests = academic and personal projects.
 * rank: "S" | "A" | "B" (drives glow color), status: "cleared" | "ongoing".
 * `rewards` are the tech-stack badges revealed once the quest has risen.
 */
export const quests: Quest[] = [
  {
    id: "opensnz-contract",
    name: "Guild Contract — OpenSNZ-Technology",
    rank: "S",
    type: "main",
    status: "ongoing",
    period: "2025/09 – Present",
    summary:
      "The active main questline: Software Engineer at OpenSNZ-Technology — designing, building and maintaining production agentic AI systems end-to-end, from rapid prototyping to deployment.",
    details: [
      "Ship multi-agent architectures, LLM-driven workflows and agent-to-enterprise integrations to production.",
      "Architect agent systems around DDD, CQRS and Event-Driven Architecture, with RabbitMQ + Celery as the async backbone — containerized with Docker Compose behind Traefik and Authentik.",
      "Ground agents in document-heavy enterprise data (LandingAI, Amazon Textract), then deliver them through CopilotKit / AG-UI for human-in-the-loop interaction.",
      "Orchestrate with LangChain/LangGraph; trace, evaluate and observe agents in production with LangSmith.",
      "Mentor and supervise interns on architecture decisions, LangGraph/MCP patterns and evaluation practices.",
    ],
    rewards: [
      "Multi-Agent Systems",
      "LangChain/LangGraph",
      "LangSmith",
      "MCP",
      "CopilotKit (AG-UI)",
      "DDD · CQRS · EDA",
      "RabbitMQ · Celery",
      "Docker · Traefik · Authentik",
      "LandingAI · Textract",
    ],
  },
  {
    id: "pharma-mas",
    name: "Multi-Agent Pharmaceutical Catalog System",
    rank: "S",
    type: "main",
    status: "cleared",
    period: "2025/02 – 2025/08",
    summary:
      "A Multi-Agent System for intelligent pharmaceutical catalog analysis — automating data extraction from raw files and coordinating specialized AI agents for querying, cost aggregation, reporting, and decision support.",
    details: [
      "Designed a modular, scalable, and maintainable agent-based architecture.",
      "Coordinated specialized agents for extraction, querying, cost aggregation, reporting, and decision support.",
      "Grounded agents with a knowledge graph and RAG over raw catalog data.",
    ],
    rewards: [
      "LangChain/LangGraph",
      "LangSmith",
      "Multi-Agent Systems",
      "Knowledge Graph",
      "RAG",
      "MCP",
      "CopilotKit (AG-UI)",
      "Next.js",
      "Python",
    ],
  },
  {
    id: "brikool",
    name: "Brikool",
    rank: "A",
    type: "side",
    status: "cleared",
    summary:
      "A platform helping local freelancers list and showcase their services, giving customers easy access and fast discovery of service providers.",
    details: [
      "Full-stack marketplace with authentication, internationalization, and E2E testing.",
      "Spring Boot backend with a Next.js frontend, shipped with Docker and CI/CD.",
    ],
    rewards: [
      "Next.js",
      "Auth.js",
      "TypeScript",
      "Spring Boot",
      "PostgreSQL",
      "Tailwind CSS",
      "shadcn/ui",
      "next-intl",
      "Cypress",
      "Docker",
      "CI/CD",
    ],
    link: "https://github.com/codeonym",
  },
  {
    id: "arapt",
    name: "ARAPT",
    rank: "A",
    type: "side",
    status: "cleared",
    summary:
      "Arabic Part-of-Speech tagging system using deep neural networks (BiLSTM).",
    details: [
      "Trained BiLSTM models for Arabic NLP with Keras.",
      "Served through FastAPI with a Next.js interface.",
    ],
    rewards: [
      "ML/DL",
      "NLP",
      "BiLSTM",
      "Keras",
      "Python",
      "FastAPI",
      "Next.js",
      "shadcn/ui",
      "next-intl",
    ],
    link: "https://github.com/codeonym",
  },
  {
    id: "mandoc-ocr",
    name: "Mandoc-OCR",
    rank: "B",
    type: "side",
    status: "cleared",
    summary:
      "Optical Character Recognition system for Arabic handwriting, built on CNNs.",
    details: [
      "CNN-based image processing pipeline for Arabic handwriting recognition.",
      "Automated builds and deployment with GitHub Actions and Docker.",
    ],
    rewards: [
      "ML/DL",
      "Image Processing",
      "CNN",
      "Keras",
      "Python",
      "Next.js",
      "GitHub Actions",
      "Docker",
    ],
    link: "https://github.com/codeonym",
  },
  {
    id: "uni-lab",
    name: "UNI-Lab",
    rank: "B",
    type: "side",
    status: "cleared",
    summary:
      "A centralized platform for managing faculty laboratories and equipment, including material inventory and resource allocation.",
    details: [
      "Inventory and resource allocation flows for faculty labs.",
      "Spring Boot services behind a Next.js frontend with NextAuth.",
    ],
    rewards: [
      "Next.js",
      "NextAuth",
      "Spring Boot",
      "Tailwind CSS",
      "MySQL",
      "Docker",
      "DaisyUI",
    ],
    link: "https://github.com/codeonym",
  },
];
