# Known issues and pitfalls

- **Playwright MCP writes into the project.** Snapshots, console logs and screenshots go to
  `.playwright-mcp/`, which is not in `.gitignore`. Screenshot paths outside the project directory are refused
  ("outside allowed roots").
- **The Pixi canvas is invisible to `browser_snapshot`.** Check the table with screenshots or `browser_evaluate`.
- **`tsc -b` does not type-check `acceptance/`.** `tsconfig.app.json` includes only `src`, and Vitest strips types
  without checking them. Once `src/table/layout.ts` and `src/model/betSlip.ts` exist, add `acceptance` to a
  tsconfig that the build covers.
- **npm warns about the `fsevents` install script** ("not yet covered by allowScripts"). It only matters for watch
  mode on macOS. `vitest run` works without it.
