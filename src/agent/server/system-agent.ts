import "server-only";
import { LangGraphAgent, type LangGraphAgentConfig } from "@ag-ui/langgraph";
import { getSystemGraph } from "./agent";
import { createInProcessClient } from "./in-process-client";
import { resolveModelId } from "./model";
import { SYSTEM_AGENT_ID } from "../constants";

export { SYSTEM_AGENT_ID };

type MergeArgs = Parameters<LangGraphAgent["langGraphDefaultMergeState"]>;

/**
 * The AG-UI face of the agent. `@ag-ui/langgraph` fills
 * `state.copilotkit.actions` with the browser's frontend tools; this
 * subclass also routes the browser's `useAgentContext` entries into
 * `state.copilotkit.context`, which copilotkitMiddleware turns into
 * the "App Context" system message.
 */
class SystemAgent extends LangGraphAgent {
  constructor(config: LangGraphAgentConfig) {
    super(config);
  }

  langGraphDefaultMergeState(state: MergeArgs[0], messages: MergeArgs[1], input: MergeArgs[2]) {
    const merged = super.langGraphDefaultMergeState(state, messages, input);
    const copilotkit = (merged.copilotkit ?? {}) as Record<string, unknown>;
    return {
      ...merged,
      copilotkit: {
        ...copilotkit,
        actions: merged.tools ?? [],
        context: input.context ?? [],
      },
    };
  }
}

export function createSystemAgent() {
  return new SystemAgent({
    agentId: SYSTEM_AGENT_ID,
    graphId: SYSTEM_AGENT_ID,
    // never dialed — the in-process client below replaces the HTTP client
    deploymentUrl: "in-process://system",
    client: createInProcessClient({
      graphId: SYSTEM_AGENT_ID,
      getGraph: async () => getSystemGraph(await resolveModelId()),
    }),
  });
}
