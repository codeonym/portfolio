# portfolio — notes for Claude

- Live at https://portfolio.codeonym.work (Vercel deploys `main`). Stack and commands: `README.md`; the agent:
  `src/agent/README.md`.
- Issues live in GitHub Issues on this repo (milestones = versions) — see `docs/agents/issue-tracker.md`.
- `main` is protected: work on a branch named after the issue (`<n>-short-name`), open a PR with a
  conventional-commit title and `Fixes #<n>`; never push to `main`.
- Secrets are in `.env.local`: check key names only (`.env.example`), never print values.
