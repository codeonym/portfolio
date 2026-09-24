# THE SYSTEM — the portfolio's agent

The giant Shadow Wraith behind the throne is a LangChain agent. Visitors talk to
it (walk up and press **T**, or use the **SYSTEM** button), and it answers from
the Player's record and drives the world: it opens windows, inspects entities,
raises shadows, pushes notifications and casts effects.

```
browser                                   server (one Next.js route)
───────                                   ─────────────────────────
CopilotKit v2 provider ── /api/copilotkit ─► CopilotRuntime (v2, single endpoint)
  useFrontendTool × world commands            └─ LangGraphAgent (@ag-ui/langgraph)
  useAgentContext (live world state)              └─ in-process client
  SystemDialogue (headless useAgent)                  └─ createAgent (langchain)
                                                         state: CopilotKitStateSchema
                                                         middleware: copilotkit →
                                                           history window → call
                                                           limit → retry
                                                         tools: consult_archive
                                                         model: OpenRouter
```

| File | Role |
| --- | --- |
| `system-commands.ts` | world commands (zod) — frontend tools + `window.system.run` |
| `server/agent.ts` | the `createAgent` graph, system prompt, middleware |
| `server/dossier.ts` | grounding rendered from `src/config/*` (digest + archive) |
| `server/tools.ts` | backend tools (`consult_archive`) |
| `server/model.ts` | OpenRouter model + per-request model id |
| `server/checkpointer.ts` | MemorySaver capped to the 300 most recent threads |
| `server/in-process-client.ts` | LangGraph SDK client served by the local graph |
| `server/system-agent.ts` | AG-UI agent; routes app context into CopilotKit state |
| `../components/agent/` | provider, frontend tools, dialogue UI |

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPEN_ROUTER_API_KEY` | yes | OpenRouter key; without it the route answers 503 |
| `MODEL_ID` | no | OpenRouter model id, default `openai/gpt-oss-120b` |
| `EDGE_CONFIG` | no | Vercel Edge Config connection string. When set, the `MODEL_ID` **item** in Edge Config overrides the env var. |
| `SITE_URL` | no | sent to OpenRouter as `HTTP-Referer` |

The model id is read on every request, never at build time. On Vercel:

- **no redeploy at all:** connect an Edge Config store to the project (this
  sets `EDGE_CONFIG`) and add an item `MODEL_ID`. Edits to it apply within
  about 30 s.
- **env var only:** Vercel applies a changed env var only to new deployments,
  so after editing `MODEL_ID` use *Redeploy*. It doesn't need a code change
  or a rebuild.

## Guards

It's a public endpoint that spends tokens, so the route:

- allows only `info` / `agent/run|connect|stop`;
- rate-limits runs per IP (best effort, per instance);
- caps body size;
- caps each visitor message at 8 model calls;
- keeps at most 300 conversations in memory per instance.

Set a credit limit on the OpenRouter key as the real backstop.
