# System Configuration

Everything the world displays lives here — edit these files to update the
portfolio without touching a single component.

| File                  | What it controls                                                        |
| --------------------- | ----------------------------------------------------------------------- |
| `world.config.ts`     | The island: zone layout/names/sections, visitor quests + XP, HUD copy, loading tips, title screen, credits |
| `player.config.ts`    | Identity, level, rank, titles, stats, links, languages, profile, creed  |
| `quests.config.ts`    | Projects — each one is a fallen knight (Igris) in the Shadow Crypt     |
| `skills.config.ts`    | Skill sets, categories (job categories = Armory crystals), skills       |
| `inventory.config.ts` | Treasury items, rarity tiers, lore; `unlocks` = `"cv"` or a zone id     |
| `chronicle.config.ts` | Experience timeline and education (Guild Hall)                          |
| `system.config.ts`    | Version, vitals, error / 404 screen copy                                |
| `types.ts`            | Shared shapes — TypeScript will flag any invalid edit                   |

## Rules of the System

- Values are validated by the types in `types.ts` — if `pnpm build` passes,
  the UI cannot break from a config edit.
- Stat/mastery values are `0–100`. Quest ranks are `"S" | "A" | "B"`
  (shown on the crypt's ARISE tags; every quest rises as an Igris shadow).
  Rarity is `"legendary" | "epic" | "rare" | "common"`.
- The crypt has six graves; more than six quests will share resting places.
- Zone `position` is `[x, z]` in world units (island radius 31, -z is north).
  Moving a zone moves its landmark, marker, minimap pin and trigger — but the
  landmark's colliders live in `components/world/colliders.ts`.
- Icons are [lucide](https://lucide.dev/icons) components — import any icon
  at the top of the file and reference it.
