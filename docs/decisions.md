# Decisions

## 2026-11-12: Test runner and acceptance tests

**Vitest 5.1** (`npm test` runs `vitest run`). It has no config file. It reuses `vite.config.ts` and
finds `acceptance/*.test.ts` by its default pattern.

Acceptance tests in `acceptance/` (the user asked for them to be written there):

| File | Covers |
|---|---|
| `geometry.test.ts` | `src/table/layout.ts`: bet set, geometry, placement, hit testing |
| `betSlip.test.ts` | `src/model/betSlip.ts`: add/remove/undo/clear/double, limits, amount format |
| `integration.test.ts` | layout zones passed straight to the slip |

### Contract the tests expect

`src/model/betSlip.ts` exports `class BetSlip`:

- `new BetSlip(limits?)`, with `limits = { maxBetMinor, maxTotalMinor }` (strings). The defaults are `'10000'` and `'100000'`.
- `addChip(spot, amountMinor)` and `double()` return `{ ok: true }` or `{ ok: false, error }`.
- `removeChip(spot)`, `undo()`, `clear()`, `totalStakeMinor(): string`, `toBets(): { type, numbers, amountMinor }[]`.
- A spot is `{ type, numbers }`. A table zone (with `rect` and other fields) is accepted as a spot.

`src/table/layout.ts` exports:

- `buildTableLayout()`, which returns `{ zones }`. A zone is `{ type, numbers, rect: { x, y, width, height } }`.
- `hitTest(zones, x, y)`, which returns the zone or `null`. It is generic: `<T extends { rect }>(zones: readonly T[], x, y) => T | null`.

Bet types: `straight split street corner line column dozen red black even odd low high`.

The tests derive their types from these exports (`ReturnType`, `Parameters`), so type names are free.

### Product decisions (made by the user)

- 1 credit = 100 minor units. Chip 1 is `'100'`. The limits are 100 credits (`'10000'`) and 1000 credits (`'100000'`).
- The 100 limit applies to **every bet position** (straight, split, column, red...), not only straight-up.
- CLEAR is undoable: UNDO right after CLEAR brings the bets back.

### Rules chosen while writing the tests

- **Amounts**: a chip amount must be a canonical positive integer string (`/^[1-9][0-9]*$/`).
  - A malformed amount may be refused with `{ ok: false }` or throw. The tests accept either.
  - Arithmetic must be exact. The tests use values above 2^53, so `Number`/`parseFloat` fail.
- **Refusals**: a refused chip or double changes nothing. It is never trimmed to fit. DOUBLE is all or nothing.
- **Limits**: limits are checked in minor units, so even one minor unit over is refused.
  - The 100 limit is per bet position, not per number. Straight 17, split 17/18, a corner, a dozen and odd may each hold 100.
- **Spots are identified by value** (`type` + `numbers`), not by object identity.
- **Undo history**: actions that changed nothing are not recorded. That covers:
  - refused actions
  - a removal that removed nothing
  - CLEAR or DOUBLE on an empty slip

  (What DOUBLE on an empty slip returns is not pinned.)
- **removeChip**: takes off the last chip placed on that spot (LIFO).
- **toBets()**: returns copies. Editing them does not affect the slip. The slip copies the spot's numbers.
- **Zone numbers** are unique and ascending.
- **Geometry**:
  - Rects use whole pixels and are at least 3 px on each side.
  - Zones never overlap.
  - Rect edges belong to the zone.
  - On a shared border, the smallest zone wins, whatever the order of `zones`.
- **Placement**:
  - A split shares a border with both its numbers.
  - A corner touches all four of its numbers.
  - A split, street, corner or line touches at least one of its own numbers, and no straight-up cell outside them.
- **Table**: European single zero. The splits 0/1, 0/2 and 0/3 exist. Trios and the basket (bets that include zero) are not part of the table.

## 2026-11-13: Implementation

### Structure

- `src/model/bet.ts`: the shared `BetType` and `BetSpot` types.
- `src/table/layout.ts`: geometry. `src/model/betSlip.ts`: bets and limits. Both are pure TypeScript.
- `src/view/`: the Pixi table (`TableCanvas.tsx`, `TableView.ts`, `ChipLayer.ts`, `projection.ts`, `design.ts`).
- `src/ui/`: React controls (`Controls.tsx`), bet and felt labels (`labels.ts`), chip values and colours (`chips.ts`).
- **Split**: Pixi draws the table, chips, hover highlight and tooltip. React DOM draws the chip tray, the total, the
  error and the CLEAR / UNDO / DOUBLE buttons.

### Table layout

- Generated in loops from `TABLE_CONFIG`: 56 px number cells and 12 px strips between them. The origin is the
  top-left of the zero cell.
- Split and corner zones live in the strips. The strip row under 1, 4 … 34 holds the streets (under a cell) and the
  lines (under a vertical strip). Two outside rows of 44 px: the dozens, then 1-18 / EVEN / RED / BLACK / ODD / 19-36.
- Gaps between outside bets, and between 34–36 and "2 to 1", are dead space (`hitTest` returns `null`).
- **`hitTest` tie rule**: smallest area wins; among equal areas the smaller `rect.x`, then the smaller `rect.y`. Ties
  happen only where a zero split meets a horizontal split or the street 1/2/3.

### Perspective view

- The flat layout is drawn once in table coordinates (`TABLE_ART`) and baked to a texture at resolution 2. A
  `PerspectiveMesh` maps it onto `TABLE_QUAD`, in a 1280×600 design space (`design.ts`). The design space is scaled
  uniformly to fit the window and centred.
- One homography (`projection.ts`) serves everything. It projects chips, the highlight and the tooltip. It also
  unprojects the pointer to table coordinates for `hitTest`, so hit testing stays on the flat, axis-aligned rects
  the tests check.
- Overlays (`eventMode = 'none'`) never hit test; the table's hit area is the `TABLE_QUAD` polygon.
- Input: left click places the selected chip; Shift+click or right click removes the last chip on the spot. The
  browser menu is suppressed on the table.

### Bet slip

- Each spot keeps its list of chips (`bigint`, minor units). The key is `type` plus the numbers sorted ascending, and
  the slip stores the sorted numbers.
- `double()` appends a copy of each spot's chips, so a removal after DOUBLE takes one chip off. On an empty slip it
  returns `{ ok: true }` and records nothing.
- Error texts: `Each bet position is limited to N credits.` and `Total bet is limited to N credits.` (N formatted from
  the limit). A malformed amount gets `Chip amount must be a positive whole number of minor units`.
- In the UI an error stays until an action that changes the slip, or 4 s. An action that changes nothing (UNDO with
  no history, removing from an empty spot) keeps it.

### Chips, labels, tooltip

- A bet's amount is shown as a greedy stack of chip values (100, 25, 10, 5, 1); the top chip shows the total.
- Chip width is 1.1 × the projected cell width, height 0.6 × width. T9 asked for about 70 % of the cell; at that size
  the labels were unreadable, so the orchestrator enlarged them.
- Tooltip names: `Straight 17`, `Split 17/18`, `Corner 26/27/29/30`, `3rd Column`, `2nd Dozen`, `Red`, `19-36`.
  Felt labels: `2 to 1`, `2nd 12`, `EVEN`, `1-18`.
- The tooltip is centred on the zone horizontally and sits above every highlighted quad under its width, so it never
  covers the highlight. For bets spread over the table (Red, Even …) it sits above the table.

### Tooling

- `tsconfig.app.json` includes `acceptance`, so `npm run build` type-checks the tests.
- Dev only: `window.__roulette.zoneCenter(type, numbers)` returns a zone's centre in client coordinates, for browser
  checks.
- The user approved two extra tests in `acceptance/betSlip.test.ts` (undo skips chips refused by the total limit or a
  malformed amount; undo skips a DOUBLE refused by the total limit). There are 98 tests in all.
