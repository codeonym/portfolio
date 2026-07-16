# System Configuration

Everything the System displays lives here — edit these files to update the
portfolio without touching a single component.

| File                  | What it controls                                          |
| --------------------- | --------------------------------------------------------- |
| `player.config.ts`    | Identity, level, stats, links, languages, profile, creed  |
| `quests.config.ts`    | Projects (name, rank, objectives, rewards, links)         |
| `skills.config.ts`    | Skill categories and mastery levels                       |
| `inventory.config.ts` | Tech stack items, rarity tiers, lore, categories          |
| `chronicle.config.ts` | Experience timeline and education titles                  |
| `system.config.ts`    | All UI copy: boot sequence, notifications, ticker, logs, vitals, XP |
| `apps.config.ts`      | Window registry: titles, icons, default positions/widths  |
| `types.ts`            | Shared shapes — TypeScript will flag any invalid edit     |

## Rules of the System

- Values are validated by the types in `types.ts` — if `pnpm build` passes,
  the UI cannot break from a config edit.
- Stat/mastery values are `0–100`. Quest ranks are `"S" | "A" | "B"`.
  Rarity is `"legendary" | "epic" | "rare" | "common"`.
- Icons are [lucide](https://lucide.dev/icons) components — import any icon
  at the top of the file and reference it.
- Keep strings short where the UI is dense (ticker, log lines, item names);
  long-form text belongs in `lore`, `summary`, and `profile` fields.
