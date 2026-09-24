import "server-only";
import { createMiddleware, HumanMessage, ToolMessage, type BaseMessage } from "langchain";

/** keeps the system context plus the last N turns, never splitting a tool-call pair */
export function historyWindow(size: number) {
  return createMiddleware({
    name: "HistoryWindow",
    wrapModelCall: async (request, handler) => {
      const messages = request.messages;
      if (messages.length <= size) return handler(request);
      const head = messages.filter((m) => m.getType() === "system");
      let tail: BaseMessage[] = messages.filter((m) => m.getType() !== "system").slice(-size);
      const firstHuman = tail.findIndex((m) => HumanMessage.isInstance(m));
      if (firstHuman > 0) tail = tail.slice(firstHuman);
      // one long tool chain with no human turn in the window: at least never open on an orphaned tool result
      else if (firstHuman < 0) while (tail.length > 1 && ToolMessage.isInstance(tail[0])) tail = tail.slice(1);
      return handler({ ...request, messages: [...head, ...tail] });
    },
  });
}

type ContextEntry = { description?: string; value?: unknown };

/**
 * The browser's `useAgentContext` entries, appended to the system
 * prompt for this model call only — the App Context half of
 * copilotkitMiddleware, without its frontend tools (the voice agent
 * must see exactly one tool).
 */
export const appContextNote = createMiddleware({
  name: "AppContextNote",
  wrapModelCall: async (request, handler) => {
    const state = request.state as { copilotkit?: { context?: ContextEntry[] } };
    const entries = state.copilotkit?.context ?? [];
    if (!entries.length) return handler(request);
    const note = entries
      .map((e) => `${e.description ?? "context"}:\n${typeof e.value === "string" ? e.value : JSON.stringify(e.value)}`)
      .join("\n\n");
    return handler({ ...request, systemMessage: request.systemMessage.concat(`\n\nAPP CONTEXT (live)\n${note}`) });
  },
});
