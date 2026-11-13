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
