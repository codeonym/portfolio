"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { SYSTEM_AGENT_ID } from "@/agent/constants";
import { world } from "@/config/world.config";
import { useLinkStatus } from "./link-status";
import { SystemDialogue } from "./system-dialogue";
import { SystemTools } from "./system-tools";
import { VoiceLink } from "./voice/voice-link";
import { VoiceOverlay } from "./voice/voice-overlay";

/**
 * The link between the world and THE SYSTEM: a CopilotKit v2 provider
 * on the single-endpoint runtime (`/api/copilotkit`), the frontend
 * tools, the dialogue window (text agent) and the hold-to-talk voice
 * link (voice agent, which delegates to the text agent). Loaded lazily once the visitor has
 * entered the world, so the chat stack never delays the temple.
 */
export default function SystemLink() {
  const setError = useLinkStatus((s) => s.setError);
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      useSingleEndpoint
      agentId={SYSTEM_AGENT_ID}
      showDevConsole={false}
      enableInspector={false}
      onError={(event) => {
        console.error("[system] link error", event);
        setError(world.agent.offline);
      }}
    >
      <SystemTools />
      <SystemDialogue />
      <VoiceLink />
      <VoiceOverlay />
    </CopilotKit>
  );
}
