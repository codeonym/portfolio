import { Gem, Heart } from "lucide-react";
import type { SystemConfig } from "./types";

/**
 * ── SYSTEM SETTINGS ───────────────────────────────────────────
 * Every piece of UI copy and ambience tuning in one place: boot
 * sequence, notifications, ticker, log stream, vitals, XP.
 * Edit freely — the types in ./types.ts keep the UI safe.
 */
export const systemConfig: SystemConfig = {
  version: "4.0",
  xpProgress: 64,

  vitals: [
    {
      code: "HP",
      label: "CONTEXT WINDOW",
      reading: "128K / 128K",
      percent: 100,
      tone: "ember",
      icon: Heart,
    },
    {
      code: "SP",
      label: "OUTPUT CAPACITY",
      reading: "32K / 32K",
      percent: 100,
      tone: "system",
      icon: Gem,
    },
  ],

  boot: {
    lines: [
      "> SCANNING VESSEL .................. OK",
      "> ESTABLISHING MANA LINK ........... OK",
      "> LOADING PLAYER RECORD ............ LV.82",
      "> SYNCING AGENT NETWORK ............ 6/6 AGENTS ONLINE",
      "> CALIBRATING CONTEXT WINDOW ....... 128K TOKENS",
      "> IGNITING RENDER CORE ............. WEBGL ONLINE",
    ],
    notification: {
      heading: "NOTIFICATION",
      body: "You have acquired the qualifications to enter the domain of the Player.",
      question: "Will you accept?",
      name: "[ CODEONYM ]",
      accept: "ACCEPT",
      decline: "DECLINE",
      declineRejected: "⚠ REFUSAL IS NOT RECOGNIZED BY THE SYSTEM",
    },
    skipLabel: "[ skip sequence ]",
  },

  ticker: [
    "ALL AGENTS OPERATIONAL",
    "MANA FLOW STABLE",
    "6 AGENTS ON PATROL",
    "NO ANOMALIES DETECTED",
    "GATE SCAN: 5 QUESTS ON RECORD",
    "CONTEXT INTEGRITY 100%",
  ],

  eventIntervalMs: 26000,
  ambientEvents: [
    {
      heading: "QUEST UPDATE",
      body: "Daily quest [ SHIP SOMETHING GREAT ] is in progress.",
      tone: "system",
    },
    {
      heading: "SKILL PROFICIENCY",
      body: "Passive skill [ CONTEXT ENGINEERING ] increased by +1.",
      tone: "arcane",
    },
    {
      heading: "DUNGEON SCAN",
      body: "New S-rank gate detected: multi-agent orchestration.",
      tone: "gold",
    },
    {
      heading: "PARTY REQUEST",
      body: "A visitor wishes to form a party. Open [ SUMMON ] to respond.",
      tone: "system",
    },
    {
      heading: "MANA SURGE",
      body: "Prompt cache warmed. Inference latency -34%.",
      tone: "arcane",
    },
    {
      heading: "GUILD TRANSMISSION",
      body: "OpenSNZ-Technology: agent fleet reporting nominal.",
      tone: "system",
    },
    {
      heading: "TITLE VERIFIED",
      body: "Title [ AGENTIC SYSTEMS DEVELOPER ] resonates with the vessel.",
      tone: "gold",
    },
  ],

  logLines: [
    "spawn agent.worker#04 .......... ok",
    "ctx.window 128K ............ nominal",
    "mcp: 3 servers connected",
    "rag.index refreshed (Δ128 docs)",
    "langgraph: checkpoint saved",
    "traces exported → otel collector",
    "guardrail: output check passed",
    "queue: 0 pending quests",
    "heartbeat <ping> 12ms",
    "memory.graph +2 nodes linked",
    "copilotkit: ag-ui channel open",
    "mana.regen +5/s (idle bonus)",
    "render.core 60fps ........ hologram",
  ],

  avatarCaption: "[ MANA CORE PROJECTED · AVATAR SYNC IN PROGRESS ]",
  dockFooter: "SYSTEM v4.0 · forged by codeonym · AI integration awakening soon",

  unsupported: {
    error: "⚠ SYSTEM ERROR",
    heading: "UNSUPPORTED VESSEL",
    title: "DISPLAY TOO SMALL TO MANIFEST THE SYSTEM",
    body: "This interface is a full desktop operating system and requires a laptop or desktop terminal (≥ 1024px wide). Return through a larger gate, Player.",
    footer: "[ CONNECTION HELD · AWAITING SUITABLE HARDWARE ]",
  },

  runtimeError: {
    error: "⚠ CRITICAL FAULT",
    heading: "SYSTEM CRASH",
    title: "AN UNEXPECTED FAULT INTERRUPTED THE SYSTEM",
    body: "The connection destabilized mid-render. This has been logged — attempt a reconnect, Player.",
    footer: "[ VESSEL INTACT · SYSTEM RECOVERABLE ]",
    retry: "RE-ESTABLISH LINK",
  },

  notFound: {
    error: "⚠ SIGNAL LOST",
    heading: "SECTOR NOT FOUND",
    title: "THIS GATE LEADS NOWHERE",
    body: "The coordinates you followed don't resolve to a sector within the System. It may have been sealed or never existed.",
    footer: "[ NAVIGATION FAILED · NO ACTIVE GATE ]",
    cta: "RETURN TO STAGE",
  },
};
