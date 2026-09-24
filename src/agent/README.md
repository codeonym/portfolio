# THE SYSTEM — the portfolio's agent

The giant Shadow Wraith behind the throne is two LangChain agents:

- **the text System** (`system`): visitors type to it (walk up and press **T**,
  or use the **SYSTEM** button). It answers from the Player's record and drives
  the world: it opens windows, inspects entities, raises shadows, pushes
  notifications and casts effects.
- **the voice System** (`system-voice`): visitors **hold V** (or the mic chip)
  and talk. It answers out loud, and its only tool hands work to the text
  System in the background.

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

## Voice pipeline

```
hold V ─► MediaRecorder ─► runtime `transcribe` (OpenRouter STT, STT_MODEL_ID)
       ─► voice agent run ──────────── AG-UI stream ────────────┐
            delegate_task(task)                                  │
              ├─ dispatches CUSTOM "voice_task" {id, task} ──────┤──► browser task queue
              └─ returns an ACK at once — the voice keeps talking│      (one task at a time)
            text deltas ─► sentence chunker ─► /api/voice/speech │         │
                              (OpenRouter TTS, TTS_MODEL_ID) ─► speaker    ▼
                                                               text agent run
                                                               (world tools, "[VOICE TASK #n]")
                                                                           │
  voice agent run ◄── "[TASK REPORT] #n · DONE · result…" ◄────────────────┘
     └─► spoken outcome
```

- The voice agent's single tool never waits. Tasks queue in the browser
  because the text agent's world tools are frontend tools, so they run where
  the world is.
- A finished task comes back as a `[TASK REPORT]` message once the voice is
  free (not while the visitor is holding the key). Reports that pile up are
  sent as one message.
- Barge-in: pressing V while the System speaks stops the audio, cancels the
  pending TTS requests and aborts the voice run. Queued tasks keep running.
- The voice agent runs on its AG-UI agent directly (`agent.runAgent`), and the
  text agent through `copilotkit.runAgent`. They never share CopilotKit's run
  loop.
- The reply is spoken sentence by sentence while it streams. The first chunk
  may break at a comma, so the first audio arrives sooner.

| File | Role |
| --- | --- |
| `voice/protocol.ts` | wire shapes between the agents (task event, task/report messages) |
| `voice/task-queue.ts` | sequential background task queue |
| `voice/speech-chunker.ts` | streamed text → speakable sentences |
| `server/voice-agent.ts` | the voice `createAgent` + `delegate_task` |
| `server/audio.ts` | OpenRouter STT (`TranscriptionService`) + TTS |
| `../app/api/voice/speech` | TTS route (mp3 stream) |
| `../components/agent/voice/` | recorder, speaker, orchestrator, overlay, HUD chip |

Pure modules have unit tests: `pnpm test`.

## Files

| File | Role |
| --- | --- |
| `system-commands.ts` | world commands (zod) — frontend tools + `window.system.run` |
| `server/agent.ts` | the `createAgent` graph, system prompt, middleware |
| `server/dossier.ts` | grounding rendered from `src/config/*` (digest + archive) |
| `server/tools.ts` | backend tools (`consult_archive`) |
| `server/model.ts` | OpenRouter model + per-request model id |
| `server/checkpointer.ts` | MemorySaver capped to the 300 most recent threads |
| `server/in-process-client.ts` | LangGraph SDK client served by the local graph |
| `server/system-agent.ts` | AG-UI agents (text + voice); route app context into CopilotKit state |
| `server/middleware.ts` | history window + app-context note (shared by both agents) |
| `server/rate-limit.ts` | per-IP sliding windows for the public routes |
| `../components/agent/` | provider, frontend tools, dialogue UI |

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPEN_ROUTER_API_KEY` | yes | OpenRouter key; without it the route answers 503 |
| `MODEL_ID` | no | OpenRouter model id for both agents, default `openai/gpt-oss-120b` (the voice agent uses low reasoning effort) |
| `STT_MODEL_ID` | no | OpenRouter speech-to-text model, default `openai/gpt-4o-mini-transcribe` (steady ~0.8 s, multilingual incl. Arabic, ~$0.0001 per utterance) |
| `TTS_MODEL_ID` | no | OpenRouter text-to-speech model, default `mistralai/voxtral-mini-tts-2603` (~1 s to first byte, mp3) |
| `TTS_VOICE` | no | voice id for the TTS model, default `gb_oliver_confident` (Voxtral voices: `en_paul_*`, `gb_oliver_*`, `gb_jane_*`, `fr_marie_*`) |
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

- allows only `info` / `agent/run|connect|stop` / `transcribe`;
- rate-limits runs and transcriptions per IP (best effort, per instance), and
  TTS characters on `/api/voice/speech`;
- caps body size (and recordings at 4 MB / 30 s);
- caps each visitor message at 8 model calls (4 for the voice agent);
- keeps at most 300 conversations in memory per instance.

Set a credit limit on the OpenRouter key as the real backstop.
