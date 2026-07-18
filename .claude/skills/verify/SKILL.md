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

Use a ≥1280px viewport (device-gate blocks small screens).

## Flows & gotchas

- **Boot gate**: click the `[ skip sequence ]` text, then wait for
  `getByRole("dialog", { name: "STATUS" })` — the STATUS window
  auto-opens once the OS mounts.
- **Windows never stop moving**: the idle `float-y` animation makes
  Playwright's actionability check time out with "element is not
  stable". Click anything inside a window with `{ force: true }`.
- **Agent bridge**: `window.system` exposes the whole control
  surface — `system.snapshot()` (serializable state),
  `system.run(name, args)` (command dispatcher), `system.commands`.
  Driving store-level behavior through it beats synthesizing clicks.
- **PDF windows render white in headless** (no PDF viewer plugin in
  chromium headless shell); confirm the file with
  `curl -sI localhost:3000/cv.pdf` instead.
- **`public/cv.pdf` is committed** (user-approved exception; only the
  repo-root `cv.pdf` source stays gitignored) — no copy step needed.
- Wheel-scroll in headless is ~80% flaky and fullscreen kills native
  window scroll — run repeated trials before blaming a change.
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

  (Viewport-resize also works but fails while fullscreen — the boot
  skip enters fullscreen, so use the overlay flash.)
