import "server-only";
import { tool } from "langchain";
import { z } from "zod";
import { ARCHIVE_SECTIONS, archive } from "./dossier";

/**
 * ── BACKEND TOOLS ─────────────────────────────────────────────
 * Run on the server inside the agent graph. Frontend tools (the
 * world commands) are registered by the browser through CopilotKit
 * and routed by the CopilotKit middleware — they never execute here.
 */

export const consultArchive = tool(
  async ({ section }) => archive(section),
  {
    name: "consult_archive",
    description:
      "Read the Player's full archived record for one section — full project details, every skill with its lore and mastery, the complete experience timeline, inventory lore. Use it before answering detailed questions the digest does not cover.",
    schema: z.object({
      section: z.enum(ARCHIVE_SECTIONS).describe("Which archive to open."),
    }),
  },
);

export const backendTools = [consultArchive];
