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
