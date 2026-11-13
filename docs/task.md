## Task - roulette table

### What to do

Create roulette table using reference screenshot of the game table - `roulette-table.png`. Use Pixi.js v8

1. **Table (0–36 and outside betting areas)**: Straight, Split, Street, Corner, Line, Column, Dozen, Red/Black, Even/Odd, 1–18/19–36. Sectors are not required (the lists of numbers for them were not provided). The geometry is generated based on data (table configuration) rather than a list of 150 hardcoded coordinates.
2. **Chips (1 / 5 / 10 / 25 / 100)**: Select a denomination; clicking on a betting area places a chip. Subsequent clicks add more chips, while Shift+click or a right-click removes one. A stack of chips is displayed within the betting area.
3. **Betting Model (Bet Slip)**: Implemented in pure TypeScript (no Pixi dependency). Includes methods: `addChip`, `removeChip`, `undo`, `clear`, `double`, `totalStakeMinor`, ​​and `toBets()`. A bet is defined as `{ type, numbers, amountMinor }`, with amounts represented as strings of integer "minor units."
4. **CLEAR / UNDO / DOUBLE and Prototype Limits**: Maximum bet per number is 100; total stake limit is 1000. Exceeding these limits triggers an error message rather than silently truncating the bet.
5. **Hover Effects**: Betting areas are highlighted when the cursor is over them, and a tooltip displaying the bet name appears above the table.
6. **Screenshots**: empty table, table with bets, zone highlighting (place the screenshots in a "screenshots" folder at the root of the project).

## Acceptance criteria

- It works.
- All tests in the `acceptance` folder are green.
- tests cover edge cases and fail when a boundary is broken.