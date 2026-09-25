# codeonym — the Gate World portfolio

**Live:** [portfolio.codeonym.work](https://portfolio.codeonym.work)

A Solo Leveling–themed portfolio you enter instead of scroll: a dark 3D dungeon where each part of the CV is a
place, and **THE SYSTEM**, an AI agent, drives the world. Ask it anything in the chat (**T**) or hold **V** to talk;
it walks you to the right record, opens it, and raises the shadow of each project (ARISE).

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui
- **3D:** three.js via React Three Fiber + drei + postprocessing; Draco-compressed glTF models in `public/models`
- **Agent:** LangChain `createAgent` served in-process through CopilotKit v2 (`/api/copilotkit`), models via
  OpenRouter, optional LangSmith tracing — see [`src/agent/README.md`](src/agent/README.md)
- Deployed on Vercel from `main`

## Run it

```bash
pnpm install
cp .env.example .env.local   # fill in the keys (OpenRouter is required for the agent)
pnpm dev                     # http://localhost:3000
```

| Command | Does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build && pnpm start` | Production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Node test runner (`src/**/*.test.ts`) |

Content (player profile, skills, quests, inventory) lives in `src/config/*.config.ts`.

## Controls

| Key | Action |
|---|---|
| WASD / arrows, or click the floor | Move |
| Drag / wheel | Orbit / zoom the camera |
| 1–6 | Teleport to a zone |
| E | Interact |
| T | Chat with THE SYSTEM |
| hold V | Talk to THE SYSTEM |
| M | Map |
| F | Fullscreen |

## Contributing

`main` is protected: every change goes through a PR. Issues, milestones and labels are on
[GitHub Issues](https://github.com/codeonym-org/portfolio/issues) — see
[`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) for the workflow.
