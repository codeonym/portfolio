# Issue tracker (for agents and contributors)

Work is tracked in **GitHub Issues** on this repo and on its own
[portfolio board](https://github.com/orgs/codeonym-org/projects/1) (one board per repo).

- **Milestones** map to versions (`v8 — Voice & brand`, `v9 — Next`, …). Finished milestones are closed and
  list the PRs that shipped them.
- **Issue type**: `Feature`, `Improvement`, `Bug` or `Task` (set on the issue, not as a label).
- **Labels**: one `area: …` (`world`, `agent`, `hud`, `content`, `ci-release`, `docs`), optionally
  `priority: medium|low`.
- **Status** lives on the board: Backlog → Todo → In Progress → In Review → Done. Merging a PR that says
  `Fixes #<n>` closes the issue, and the board moves it to *Done*.

## Working an issue

1. Branch from `main` named after the issue, e.g. `32-ci-checks` (or *Create a branch* on the issue page).
2. PR title = conventional commit (`feat(world): …`, `fix(agent): …`, `docs: …`); PR body contains `Fixes #32`.
3. Before pushing: `pnpm lint`, `npx tsc --noEmit`, `pnpm test`, `pnpm build`.
4. Merge once the Vercel preview works; `main` deploys to production.
