# Known issues and pitfalls

## Tooling

- **Playwright MCP writes into the project.** Snapshots, console logs and screenshots go to `.playwright-mcp/`
  (gitignored). Screenshot paths outside the project directory are refused ("outside allowed roots"), so save there
  and copy the file.
- **The Pixi canvas is invisible to `browser_snapshot`.** Check the table with screenshots or `browser_evaluate`.
  In dev, `window.__roulette.zoneCenter(type, numbers)` gives the client coordinates of a zone to click or hover.
- **Playwright role names match by substring.** `getByRole('button', { name: 'Chip 1' })` also matches "Chip 10" and
  "Chip 100". Pass `exact: true`.
- **Synthetic events can leave a stale hover.** A dispatched `contextmenu` event (not a real mouse action) left a
  highlight on the table. Drive the table with real mouse moves and clicks (`page.mouse`).
- **A hover right after a reload sometimes shows nothing in Playwright.** Seen twice in a row on 2026-11-13, then not
  reproducible. Before a hover screenshot, move the mouse off and back onto the zone and check the image.
- **On macOS, Ctrl+click is a right click.** It may fire `contextmenu` and a left click; use Shift+click or the right
  button to test removal.
- **A copy of the project with a symlinked `node_modules` writes caches into the real project.** Vite and Vitest put
  `.vite-temp` and `.vitest-cache` under `node_modules`. In such a copy (e.g. for a mutation check) run Vitest with
  `--configLoader runner --fsModuleCachePath ./.vitest-cache`. Setting `cacheDir` alone does not move `.vitest-cache`
  (checked on 2026-11-13: 5 entries still landed in the real `node_modules`).
- **npm warns about the `fsevents` install script** ("not yet covered by allowScripts"). It only matters for watch
  mode on macOS. `vitest run` works without it.

## Runtime

- **Pixi warns "a 'textureSource' was destroyed while still bound to a shader" after a hot reload.** On teardown
  `TableView` destroys its baked texture while the renderer still holds it in a bind group. It is harmless (dev only;
  a fresh page load does not show it). Calling `destroy` twice on a Pixi container is a no-op.
