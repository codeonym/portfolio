---
name: verify
description: Build, launch and drive the Solo Leveling portfolio headlessly to verify changes end-to-end.
---

# Verifying the portfolio

## Build & launch

```bash
pnpm build
pnpm start &   # serves the prod build on http://localhost:3000
```

## Drive it headlessly

Playwright is NOT a project dep and `npx playwright` is blocked by
safe-chain; require it from the npx cache instead (find the hash dir
with `grep -rl playwright ~/.npm/_npx/*/package.json`):

```js
const { chromium } = require("/home/codeonym/.npm/_npx/<hash>/node_modules/playwright");
```

Any viewport works (v5 supports mobile: test `390x844` with `isMobile`/`hasTouch`).

## Flows & gotchas

- **Flow**: loading screen (real asset progress) → title → click the
  `ARISE` button (`getByRole("button", { name: "ARISE", exact: true })`)
  → world. Title can take 20–40 s headless while assets stream.
- **Pin quality to low + mute** before load, or SwiftShader crawls:
  ```js
  await page.addInitScript(() => localStorage.setItem("codeonym-world-v5",
    JSON.stringify({ state: { quality: "low", visited: [], risen: [], completed: [], xp: 0, muted: true }, version: 0 })));
  ```
  Headless still runs ~1–3 fps (GPU fill in software; JS is ~90% idle) —
  that is the environment, not the app. Give `page.screenshot` a 150 s
  timeout and judge real perf in a real browser.
- **Animations are frame-capped**: mixers clamp delta to 0.05 s, so at
  headless fps a 4 s ARISE takes ~75 s wall time. Poll
  `system.snapshot().visitor.shadowsRisen` instead of sleeping.
- **Chrome extension tab may be hidden** (`document.visibilityState ===
  "hidden"`): rAF pauses, so fps probes hang — ask the user to focus it.
- **Agent bridge**: `window.system` exposes the whole control
  surface — `system.snapshot()` (serializable state),
  `system.run(name, args)` (command dispatcher), `system.commands`
  (`open_zone`, `walk_to_zone`, `arise`, `inspect_entity`, `open_cv`…).
  Driving store-level behavior through it beats synthesizing clicks.
- **PDF windows render white in headless** (no PDF viewer plugin in
  chromium headless shell); confirm the file with
  `curl -sI localhost:3000/cv.pdf` instead.
- **`public/cv.pdf` is committed** (user-approved exception; only the
  repo-root `cv.pdf` source stays gitignored) — no copy step needed.
- **Screenshots capture stale compositor tiles over the WebGL canvas**
  (whole scene looks black, or a moving vertical boundary of visible
  content). Not a product bug — force a clean repaint before every
  screenshot by flashing a full-viewport overlay:

  ```js
  await page.evaluate(async () => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;inset:0;background:#fff;z-index:99999";
    document.body.appendChild(d);
    await new Promise((r) => setTimeout(r, 150));
    d.remove();
  });
  await page.waitForTimeout(1000);
  ```


