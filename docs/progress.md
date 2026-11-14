# Progress

## 2026-11-12: Acceptance tests (task item 6)

- Added Vitest 5.1 and the `npm test` script.
- Wrote `acceptance/geometry.test.ts`, `acceptance/betSlip.test.ts` and `acceptance/integration.test.ts` from the
  unit-test criteria in the task. The contract and decisions are in `docs/decisions.md`.
  - The orchestrator wrote them directly, at the user's request. The builder may not modify `acceptance/`.
- Reviewer pass:
  - Every criterion is covered. The expected data (red numbers, the 154-bet set, minor-unit sums) is correct.
  - **Satisfiable**: one concrete layout (40 px cells, 10 px split/corner strips) passes every geometry test. Scratch
    reference implementations, outside the project, pass all 96 tests.
  - **Mutation check**: every limit `>`/`>=` flip, Number arithmetic, trimming, first/largest/last-wins hitTest,
    exclusive edges, overlaps, fractional rects and zero in a corner/street all fail tests.
  - **Gaps it found, now fixed**:
    - Boundaries probed only in whole credits. Tests now also refuse one minor unit over.
    - Limit per position not pinned against "per number". Tests now cover overlapping positions.
    - One shared `try` hid two of the three mutation checks on `toBets()` copies.
    - No-op CLEAR/DOUBLE could be recorded in history.
  - Each of these is now killed by a test. That was rechecked against the reference implementation.
- Status: **red, as expected**. All 3 files fail only because `src/table/layout.ts` and `src/model/betSlip.ts`
  do not exist yet. `npm run lint` and `npm run build` pass.
- **Not checked by tests**:
  - That the geometry is generated from a config. A hardcoded list of 154 rects would pass.
  - That points in dead space inside the table return `null`.
- Next:
  1. Builder tasks to implement both modules. They are independent files, so they can run in parallel.
  2. Add `acceptance` to type checking.
  3. Repeat the mutation check against the real implementation.

## 2026-11-13: Roulette table implemented (task items 1–5, 7)

Branch `feat/roulette-table`, from the baseline commit `c4da09a`. Not committed yet.

- **Builder tasks**:
  - T1 layout, T2 bet slip, T3 labels and chips, T4 projection
  - T5 Pixi canvas and template removal, T6 perspective table, T8 hover and tooltip
  - T9 chip stacks, T10 controls, T11 wiring the app
  - Every "Done when" was re-run by the orchestrator before acceptance. Decisions are in `docs/decisions.md`.
- **Orchestrator edits**:
  - Chip size constants in `ChipLayer.ts`.
  - `acceptance` added to `tsconfig.app.json`.
  - Two acceptance tests, with the user's approval.
- **T7 mutation check** (in a scratch copy; the project tree was not touched):
  - 41 mutants of `betSlip.ts` and `layout.ts`; first run 37 killed.
  - The survivors were H01, H03 and H05 (undo after refusals) and R08. The two new tests kill H01, H03 and H05:
    40/41.
  - R08 (throwing on a malformed amount instead of refusing) survives. `decisions.md` allows either.
- **Browser check** (real mouse events), with the BET total after each step:
  - Placing 1 + 5 + 25 on 17 gives 31. Seven zone types give 186.
  - Per-position and total limits are refused with the error shown; DOUBLE is all or nothing.
  - Shift+click and right click remove. UNDO and CLEAR work, and UNDO after CLEAR restores. The error hides after 4 s.
  - The console shows no errors.
- **Reviewer pass**: no task missing. Fixed in T12–T15:
  - T12: `hitTest` was order-dependent at 5 corner points where equal-area zones meet.
  - T13: the slip key did not sort numbers (`[18,17]` ≠ `[17,18]`), and limit errors were not sentences.
  - T14: a no-op action cleared the error; `.controls` was declared twice.
  - T15: the tooltip covered highlighted cells.
  - Accepted as is: the mesh is destroyed twice on teardown (a no-op in Pixi), and Pixi warns once after a hot
    reload (see `known-issues.md`).
- **Screenshots**: `screenshots/empty-table.png`, `table-with-bets.png`, `zone-highlight.png`.
- **Status**: `npm run lint` clean, `npm run build` passes, `npm test` 98/98.
- **Open**:
  - The `hitTest` tie rule is not covered by an acceptance test; a mutant of it would survive.
  - `public/icons.svg` (template leftover) is unused.
  - The build warns that the bundle is over 500 kB (Pixi).
