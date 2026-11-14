## Завдання A

### Plan

Tasks

T1 · Table layout (batch A)

- Goal: Implement src/table/layout.ts, with buildTableLayout() and hitTest() per the contract in docs/decisions.md, generating every zone in loops from one
  exported config.
  - Export TABLE_CONFIG (cell size, gap, 3 rows × 12 columns, outside-bet rows) and RED_NUMBERS. No literal list of rects; zone type is BetType from
    src/model/bet.ts.
  - Orientation as in roulette-table.png: 0 on the left, row 3…36 on top, 1…34 at the bottom, "2 to 1" on the right. Below: dozens, then 1-18 / EVEN / RED / BLACK
    / ODD / 19-36.
  - Gap strips separate the cells. A strip between two cells is a split and a strip crossing is a corner. The strip row under 1…34 holds streets (under a cell) and
    lines (under a vertical strip).
- Read: docs/decisions.md, acceptance/geometry.test.ts, acceptance/integration.test.ts, src/model/bet.ts, roulette-table.png
- Do not touch: acceptance/, src/model/, src/ui/, package.json, tsconfig\*.json
- Done when: npx vitest run acceptance/geometry.test.ts; npx eslint src/table; npx tsc -p tsconfig.app.json --noEmit | grep src/table → Tests 32 passed (32), then
  no output from eslint or grep

T2 · Bet slip (batch A)

- Goal: Implement class BetSlip in src/model/betSlip.ts per the contract and rules in docs/decisions.md, in pure TypeScript with no Pixi or DOM imports.
  - Spots are BetSpot from src/model/bet.ts, keyed by type + numbers. Amounts stay strings, and all arithmetic uses BigInt.
  - Keep a chip list per spot. undo() restores a snapshot saved before each action that changed the slip.
  - double() appends a copy of each spot's chips, so a later removeChip takes off one chip, not the whole doubling.
  - error is a short English sentence naming the limit in credits (1 credit = 100 minor units), e.g. "Max 100 per bet position".
- Read: docs/decisions.md, acceptance/betSlip.test.ts, acceptance/integration.test.ts, src/model/bet.ts
- Do not touch: acceptance/, src/model/bet.ts, src/table/, src/ui/, package.json, tsconfig\*.json
- Done when: npx vitest run acceptance/betSlip.test.ts; npx eslint src/model; npx tsc -p tsconfig.app.json --noEmit | grep src/model → Tests 62 passed (62), then
  no output from eslint or grep

T3 · UI helpers: labels and chips (batch A)

- Goal: Create pure helpers src/ui/labels.ts (betName, feltLabel) and src/ui/chips.ts (CHIPS, stackChips, formatCredits), with no Pixi or DOM imports.
  - betName(spot): "Straight 17", "Split 0/1", "Street 1/2/3", "Corner 32/33/35/36", "Line 1-6", "1st Column" (1…34), "2nd Dozen", "Red", "Black", "Even", "Odd",
    "1-18", "19-36".
  - feltLabel(spot): the number for a straight; "2 to 1"; "1st 12" / "2nd 12" / "3rd 12"; "1-18", "EVEN", "ODD", "19-36". Return '' for inside bets, red and black.
  - CHIPS: 1 / 5 / 10 / 25 / 100 as { valueMinor, label, color } (chip 1 = '100'), coloured white, purple, green, red and blue as in roulette-table.png.
  - stackChips(amountMinor): greedy split into chip values, largest first. formatCredits: '10000'→100, '12345'→123.45, '50'→0.50. BigInt only.
- Read: src/model/bet.ts, docs/decisions.md, roulette-table.png
- Do not touch: acceptance/, src/model/, src/table/, package.json, tsconfig\*.json
- Done when: npx eslint src/ui; npx tsc -p tsconfig.app.json --noEmit | grep src/ui; node --input-type=module -e "import { betName as n, feltLabel as f } from
  './src/ui/labels.ts'; import { stackChips, formatCredits as c } from './src/ui/chips.ts'; const s = (type, numbers) => ({ type, numbers }); const col =
  [...Array(12)].map((_, i) => 3 \* i + 1); const doz = [...Array(12)].map((_, i) => i + 13); console.log([n(s('corner', [32, 33, 35, 36])), n(s('split', [0, 1])),
  n(s('line', [1, 2, 3, 4, 5, 6])), n(s('column', col)), f(s('column', col)), n(s('dozen', doz)), f(s('dozen', doz)), stackChips('9900').join(), c('10000'),
  c('12345'), c('50')].join(' | '))" → only Corner 32/33/35/36 | Split 0/1 | Line 1-6 | 1st Column | 2 to 1 | 2nd Dozen | 2nd 12 |
  2500,2500,2500,1000,1000,100,100,100,100 | 100 | 123.45 | 0.50

T4 · Pixi scaffold (batch B)

- Goal: Install pixi.js v8 and replace the Vite template with a full-window page whose canvas area is a React component src/view/TableCanvas.tsx that owns a Pixi
  Application.
  - await app.init({ resizeTo: host, antialias: true, autoDensity: true, resolution: devicePixelRatio, background }) with a dark navy background, then append
    app.canvas to the host div.
  - StrictMode runs effects twice in dev. A cleanup that runs before init resolves must still destroy that app, so exactly one canvas ends up on the page.
  - App.tsx: the canvas area fills the window above an empty <footer> for the controls. Delete src/assets/ and the template styles.
- Read: src/App.tsx, src/main.tsx, src/index.css, src/App.css, .agents/skills/pixijs/references/application.md
- Do not touch: acceptance/, src/model/, src/table/, src/ui/
- Done when: npm ls pixi.js; npm run lint && npm run build → pixi.js@8.…, lint prints nothing, build ends with ✓ built in …

T5 · Draw the table (batch C)

- Goal: Create src/view/TableView.ts, a Pixi Container constructed from the zones of buildTableLayout(), and show it in TableCanvas, scaled to fit.
  - A flat, top-down version of roulette-table.png: green felt, cream lines, and numerals in red or black per RED_NUMBERS (0 in green). Draw the feltLabel text,
    plus red and black diamonds in the RED and BLACK zones.
  - Neighbouring cells share one line, drawn in the middle of the gap from TABLE_CONFIG. Outline the outside zones; inside-bet zones are not drawn.
  - Scale and centre the table in the canvas with a margin, at start and on every resize, keeping the aspect ratio.
- Read: src/table/layout.ts, src/ui/labels.ts, src/view/TableCanvas.tsx, roulette-table.png, .agents/skills/pixijs/references/scene-graphics.md,
  .agents/skills/pixijs/references/scene-text/text.md
- Do not touch: acceptance/, src/model/, src/table/, src/ui/, src/App.tsx
- Done when: npm run lint && npm run build → lint prints nothing, build ends with ✓ built in …

T6 · Mutation check on the real code (batch C)

- Goal: Show that the acceptance tests catch broken boundaries in the real betSlip.ts and layout.ts, by running mutants in a copy of the project and never in the
  project itself.
  - Copy the project without node_modules (symlink it instead) to
    M=/private/tmp/claude-501/-Users-art-Documents-roulette-proto/957f7e4b-acb2-4ad1-8a45-cf97f0a45105/scratchpad/mutants. In $M, apply one mutant at a time, run
    npx vitest run, then revert.
  - Mutants:
    - each limit check (per bet, total, in double) flipped >↔>=, and each one removed
    - BigInt→Number
    - trim to fit instead of refusing
    - a looser amount regex
    - refused or no-op actions saved to history
    - removeChip takes the first chip
    - toBets() returns no copies
    - hitTest takes the first or last match instead of the smallest
    - exclusive rect edges
  - Write $M/report.md: one row per mutant, with the changed line, the number of failing tests, and killed or survived.
- Read: src/model/betSlip.ts, src/table/layout.ts, acceptance/
- Do not touch: anything inside /Users/art/Documents/roulette-proto
- Done when: grep -c survived $M/report.md; shasum src/model/betSlip.ts src/table/layout.ts → 0, and hashes equal to <recorded at gate A>

T7 · Hover highlight, tooltip, clicks (batch D)

- Goal: In TableView, highlight the zone under the pointer and show its betName in a tooltip above it. Find the zone with hitTest from layout.ts, not with per-zone
  Pixi hit areas.
  - Use one interactive hit area over the whole table. Convert the pointer with getLocalPosition, then call hitTest(zones, x, y).
  - Highlight: translucent white over the zone and over each number cell it covers. Nothing over dead space or after the pointer leaves.
  - Layers, bottom to top: felt, highlight, a public empty chips container, tooltip (dark rounded box, kept on screen). Overlays use eventMode = 'none'.
  - Add public callback properties, no-ops by default: onPlace(zone) for a left click, onRemove(zone) for Shift+click or a right click.
- Read: src/view/TableView.ts, src/table/layout.ts, src/ui/labels.ts, .agents/skills/pixijs/references/events.md
- Do not touch: acceptance/, src/model/, src/table/, src/ui/, src/App.tsx, src/view/TableCanvas.tsx
- Done when: npx eslint src/view/TableView.ts; npx tsc -p tsconfig.app.json --noEmit | grep -E 'TableView|TableCanvas' → no output

T8 · Chip stacks (batch D)

- Goal: Create src/view/ChipLayer.ts, a non-interactive Pixi Container whose setBets(bets) draws a chip stack at the centre of each zone that holds a bet.
  - It takes the zones in its constructor and matches each bet to its zone by type + numbers.
  - A stack is stackChips(amountMinor) from bottom to top. Each chip is a circle in its CHIPS colour with a white edge, a few px higher than the one below. The top
    chip shows formatCredits of the bet total.
  - A chip is about 70% of a number cell across, and stacks on splits and corners may overlap neighbouring cells. Destroy the old children on every redraw.
- Read: src/ui/chips.ts, src/table/layout.ts, src/model/betSlip.ts, .agents/skills/pixijs/references/scene-graphics.md
- Do not touch: acceptance/, src/model/, src/table/, src/ui/, src/App.tsx, src/view/TableView.ts, src/view/TableCanvas.tsx
- Done when: npx eslint src/view/ChipLayer.ts; npx tsc -p tsconfig.app.json --noEmit | grep ChipLayer → no output

T9 · Control bar (batch D)

- Goal: Create src/ui/Controls.tsx and src/ui/Controls.css: a props-only React bar styled after the bottom bar of roulette-table.png. It holds the chip selector,
  CLEAR / UNDO / DOUBLE, the total stake and an error line.
  - Props: selectedChip, onSelectChip(valueMinor), onClear, onUndo, onDouble, totalMinor, error: string | null. No state of its own.
  - Chips are round buttons built from CHIPS (label, colour). The selected one is raised and has aria-pressed="true". CLEAR and DOUBLE are disabled while the total
    is '0'.
  - The total shows as BET <formatCredits(totalMinor)>, and the error goes in an element with role="alert".
- Read: src/ui/chips.ts, roulette-table.png
- Do not touch: acceptance/, src/model/, src/table/, src/view/, src/App.tsx, src/ui/chips.ts, src/ui/labels.ts
- Done when: npx eslint src/ui/Controls.tsx; npx tsc -p tsconfig.app.json --noEmit | grep Controls → no output

T10 · Wire the game (batch E)

- Goal: Wire the game in src/App.tsx and src/view/TableCanvas.tsx. One BetSlip, the selected chip (default 1) and the last error drive TableView, ChipLayer (inside
  tableView.chips) and Controls.
  - Place calls addChip(zone, selectedChip), and remove calls removeChip(zone). CLEAR / UNDO / DOUBLE call the slip. After every action, call
    ChipLayer.setBets(slip.toBets()).
  - A refused action shows its error until the next successful action or for 4 s. Block the browser context menu on the canvas.
  - Create the slip once. The Pixi app is not rebuilt when state changes; Pixi callbacks read the current React state through refs.
  - Dev only (import.meta.env.DEV): window.\_\_roulette.zoneCenter(type, numbers) returns a zone's centre in client coordinates, so I can click exact zones during
    browser checks.
- Read: src/App.tsx, src/view/TableCanvas.tsx, src/view/TableView.ts, src/view/ChipLayer.ts, src/ui/Controls.tsx, src/model/betSlip.ts
- Do not touch: acceptance/, src/model/, src/table/, src/ui/chips.ts, src/ui/labels.ts
- Done when: npm run lint && npm run build && npm test → lint prints nothing, ✓ built in …, Tests 96 passed (96)

### AI work log

| Time  | Step          | Prompt / event                                                                           | Result                                                 |
| ----- | ------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 07:03 | Plan          | User: break `docs/task.md` into builder tasks; show the plan and texts, launch nothing   | Plan with 11 tasks shown at 07:14                      |
| 07:34 | Approval      | User: "1. Yes 2. Use your recomendations", view to follow `roulette-table.png`           | Git baseline `c4da09a`, branch `feat/roulette-table`   |
| 07:38 | Batch A       | T1 layout, T2 bet slip, T3 labels/chips, T4 projection (parallel)                        | All accepted on the first run; 96/96 tests             |
| 07:41 | Batch B       | T5 Pixi scaffold                                                                         | Accepted                                               |
| 07:43 | Batch C       | T6 perspective table, T7 mutation check (parallel)                                       | T6 accepted; T7 found 4 surviving mutants              |
| 07:47 | Batch D       | T8 hover/tooltip/clicks, T9 chip stacks, T10 controls (parallel)                         | All accepted                                           |
| 07:51 | Batch E       | T11 wiring                                                                               | Accepted after a brief correction (test count 96 → 98) |
| 07:52 | Approval      | User: "Add them yourself and re-run the mutation check"                                  | 2 tests added; T7 re-run: 40/41 killed                 |
| 07:53 | Browser check | Playwright, real mouse events, 3 screenshots                                             | Chip labels unreadable: orchestrator fixed 2 constants |
| 07:55 | Review        | Reviewer over all tasks                                                                  | 11 findings, no task missing                           |
| 08:00 | Context       | Conversation compacted                                                                   | Continued from summary                                 |
| 08:03 | Fixes         | T12 hitTest ties, T13 slip key/errors, T14 error persistence/CSS, T15 tooltip (parallel) | All accepted on the first run                          |
| 08:05 | Browser check | T14 behaviour, tooltip in 5 zones, retake `zone-highlight.png`                           | Passed                                                 |
| 08:07 | Docs          | `progress.md`, `decisions.md`, `known-issues.md`, `CLAUDE.md` line 3, verify skill       | Done                                                   |

### Issues

| #   | Issue                                                                                     | Kind                                                                       | Caused by                                                | Detected by                             |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| 1   | Chip labels unreadable at the size T9 asked for (70 % of a cell)                          | Unclear brief                                                              | Orchestrator (T9 brief)                                  | Orchestrator screenshot (browser check) |
| 2   | Tooltip covered highlighted cells; the orchestrator accepted the screenshot               | Agent error + missed check                                                 | T8 builder, orchestrator                                 | Reviewer                                |
| 3   | `act` cleared the error after an action that changed nothing                              | Agent error                                                                | T11 builder                                              | Reviewer                                |
| 4   | `hitTest` depended on zone order at 5 points (equal-area ties)                            | Agent error, rule in `decisions.md`                                        | T1 builder                                               | Reviewer (reversed-list script)         |
| 5   | Spot key did not sort numbers (`[18,17]` ≠ `[17,18]`)                                     | Agent error, rule in `decisions.md`                                        | T2 builder                                               | Reviewer (code read)                    |
| 6   | Limit errors were fragments, not sentences with "credits"                                 | Unclear brief: its own example was the fragment "Max 100 per bet position" | Orchestrator (T2 brief)                                  | Reviewer                                |
| 7   | `.controls` rule declared twice (T5 placeholder kept after T10)                           | Handoff gap                                                                | T5/T10                                                   | Reviewer                                |
| 8   | T11 "Done when" expected `96 passed`; stale after 2 tests were added                      | Brief changed in flight                                                    | Orchestrator                                             | Orchestrator (SendMessage correction)   |
| 9   | Reviewer reported missing docs, unrecorded user approval and no T7 evidence               | Redundant findings                                                         | Orchestrator (reviewer called before the progress entry) | Reviewer                                |
| 10  | Mutation run wrote `.vite-temp`/`.vitest-cache` into the real `node_modules` (symlink)    | Agent error                                                                | T7 builder                                               | T7 builder (mtime check)                |
| 11  | Screenshot saved outside the project                                                      | Tool error; the pitfall was already in `known-issues.md`                   | Orchestrator                                             | Playwright ("outside allowed roots")    |
| 12  | `getByRole('button', { name: 'Chip 1' })` matched 3 buttons                               | Tool error                                                                 | Orchestrator                                             | Playwright (strict mode violation)      |
| 13  | Stale hover blamed on the app; caused by a synthetic `contextmenu`                        | Redundant steps                                                            | Orchestrator                                             | Re-test with real mouse moves           |
| 14  | Hover screenshot after a reload showed nothing, twice; not reproducible                   | Redundant steps (about 5 tool calls)                                       | Playwright timing                                        | Orchestrator screenshot                 |
| 15  | zsh: `echo === …` gave "== not found"; unquoted `--include=*.mjs` gave "no matches found" | Tool error                                                                 | Orchestrator                                             | Shell                                   |
| 16  | Builder read a nonexistent path; `python3` has no Pillow                                  | Tool error                                                                 | T6 builder, orchestrator                                 | Tool error                              |

Test gaps found (not AI errors): mutants H01, H03 and H05 (undo after refused actions) survived T7 until the user
approved two new tests. R08 survives by design (`decisions.md` allows throwing). The `hitTest` tie rule (issue 4)
is still not covered by an acceptance test.

Returned tasks (Done when failed): **0**. Re-runs: T7 once (new tests), T11 once (brief correction).

### Test logs

Raw output, run at the end of the session (11:04 local time).

```
$ npx tsc -b --pretty false
exit=0
```

```
$ npm run lint

> roulette-proto@0.0.0 lint
> eslint .

exit=0
```

```
$ npm test

> roulette-proto@0.0.0 test
> vitest run


 RUN  v5.1.0 /Users/art/Documents/roulette-proto


 Test Files  3 passed (3)
      Tests  98 passed (98)
   Start at  11:04:01
   Duration  143ms (tests 45%, import 29%, transform 15%, worker 10%)

exit=0
```

```
$ npm run build

> roulette-proto@0.0.0 build
> tsc -b && vite build

vite v8.3.8 building client environment for production...
transforming...
✓ 771 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                     0.90 kB │ gzip:   0.42 kB
dist/assets/index-Cr3nL4Lm.css                      2.42 kB │ gzip:   1.01 kB
dist/assets/webworkerAll-Y_wEVAjg.js                0.05 kB │ gzip:   0.06 kB
dist/assets/getTextureBatchBindGroup-DjqUgO2j.js    0.34 kB │ gzip:   0.27 kB
dist/assets/canvasUtils-C6hhg75B.js                 6.19 kB │ gzip:   2.09 kB
dist/assets/getTexelRangeRects-BX1UCNyX.js         11.40 kB │ gzip:   3.00 kB
dist/assets/init-DXRztWb4.js                       15.37 kB │ gzip:   4.75 kB
dist/assets/browserAll-fCiL9M0B.js                 43.54 kB │ gzip:  11.32 kB
dist/assets/RenderTargetSystem-kLtbu4Ul.js         79.12 kB │ gzip:  22.43 kB
dist/assets/CanvasPool-CjOWH4P4.js                116.91 kB │ gzip:  35.65 kB
dist/assets/index-DgVlLStH.js                     540.30 kB │ gzip: 164.81 kB

✓ built in 272ms
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
exit=0
```

## Costs

**Time**

| Phase                                                 | Wall time                          |
| ----------------------------------------------------- | ---------------------------------- |
| Plan (07:03 → 07:14)                                  | 10 min                             |
| Waiting for the user (07:14 → 07:34)                  | 20 min                             |
| T1–T11, mutation check, browser check (07:34 → 07:55) | 21 min                             |
| Review, fixes T12–T15, docs (07:55 → 08:08)           | 12 min                             |
| **Total**                                             | **64 min wall, 44 min of AI work** |

Subagent run time, summed: 30 min (they ran in parallel batches).

**Iterations**

- User messages: 3, plus `/reflect`.
- Subagents: 16 (15 builder tasks, 1 reviewer). SendMessage follow-ups: 2.
- Orchestrator: 114 model turns. Tool calls: 50 Bash, 36 Read, 6 Edit, 3 Write, 37 Playwright, 3 ToolSearch.
- Context compactions: 1.

**Tokens**

|                         |      Output | Input, uncached |     Cache read | Cache write |
| ----------------------- | ----------: | --------------: | -------------: | ----------: |
| Orchestrator (Opus 5.5) |     186,768 |             250 |     18,381,677 |     376,701 |
| Subagents (Sonnet 5.5)  |     191,629 |             264 |      4,074,125 |     518,256 |
| **Total**               | **378,397** |         **514** | **22,455,802** | **894,957** |

The orchestrator figures include the `/reflect` step up to the stats run.

Per subagent (minutes, tool calls, output tokens, all input tokens):

| Task                 |  Min | Tools | Output |     Input |
| -------------------- | ---: | ----: | -----: | --------: |
| T1 layout            |  2.1 |    10 | 17,327 |   127,306 |
| T2 bet slip          |  0.9 |    12 |  6,207 |   173,192 |
| T3 labels, chips     |  0.6 |     8 |  5,008 |    62,725 |
| T4 projection        |  0.5 |     6 |  3,249 |    38,293 |
| T5 Pixi scaffold     |  1.4 |    17 |  8,177 |   230,745 |
| T6 perspective table |  3.4 |    25 | 25,644 |   631,108 |
| T7 mutation check    | 11.0 |    29 | 49,640 | 1,590,770 |
| T8 hover, tooltip    |  1.3 |    11 | 11,199 |   154,372 |
| T9 chip stacks       |  1.3 |    12 |  9,820 |   173,297 |
| T10 controls         |  0.8 |    10 |  5,789 |    58,910 |
| T11 wiring           |  1.8 |    16 | 13,070 |   287,732 |
| Reviewer             |  3.6 |    25 | 25,884 |   875,421 |
| T12 hitTest ties     |  0.3 |     6 |  1,702 |    46,727 |
| T13 slip key, errors |  0.3 |     5 |  1,860 |    32,020 |
| T14 error, CSS       |  0.3 |     9 |  1,923 |    48,567 |
| T15 tooltip          |  0.7 |     7 |  5,130 |    61,460 |

## Завдання B

1. Тести зелені — отже, все вірно?
   Ні. Зелені тести означають, що перевірки проходять лише ті, які були написані. Правельнисть логикі не може бути гарантована у всіх вариантах. У данному віпадку ліше одна первирка - ставка "10" після подвоєння стає 20. Рапріклад немає перевиркі граничніх значень.

2. Що зламається в експлуатації: назвіть конкретні сценарії.

- Втрата точності - `parseFloat("0.10") * 2`
- Некоректні значення - `parseFloat("text") // NaN`

3. Яка перевірка це виявить: тест, інваріант чи зміна типу.
   Потрібні конкретні перевірки:

- Некоректні значення - додати перевірку, що сума є валідним невід'ємним цілим числом.
- Втрата точності - використовувати цілі числа або BigInt.

Інваріант - кожна ставка повинна мати невід'ємну цілу суму в мінімальних грошових одиницях, яка не перевищує максімальній числовий діапазон.

```
function isValidAmount(amount: string): boolean {
  const value = Number(amount);

  return (
    Number.isSafeInteger(value) &&
    value >= 0
  );
}
```

4. Чи є другий і третій дефект, окрім очевидного?

- метод double() - мутує об'єкт ставок - якщо об'єкт bet використовується в иншому мисци, його сума теж зміниться.
- метод totalStakeMinor() - втрата точності - метод повертає number, а суми у beat зберігаються як рядки

## Завдання C

1. Назвіть три рішення, які ухвалили не ви, а ШІ. Чому ви їх прийняли? Що було альтернативою?

- Як реалізовано нахилений вигляд столу
- Вирішення конфлікту (tie-break) у `hitTest`, коли дві зони мають однаковий розмір
- Як реалізовано дію DOUBLE

2. Що зламається, якщо змінити ліміт ставки, порядок зон або формат `amountMinor`?

- змінити ліміт ставки - вищі ліміти означають вищі стопки фішок. Номінал найбільшої фішки — 100, тому на кожні 100 кредитів додається одна фішка.
- Порядок зон - жодних збоїв.
- `mountMinor` - якщо встановити значення 1000 одиниць на кредит, сума 1050 відобразиться як «1.5» замість «1.05».
- Суми, що не становлять цілу кількість кредитів: чек приймає будь-яку додатну цілу кількість дрібних одиниць, і тести це дозволяють. Цього неможливо досягти
  через інтерфейс користувача — лише шляхом виклику функції формування чека безпосередньо з коду.
- Ставка 1,50 призводить до появи одного фішки номіналом 1 кредит із написом «1.50».
- Ставка 0,50 не призводить до появи жодної фішки, проте система все одно враховує її в загальній сумі.

3. Вкажіть рядок, який ви б переписали першим, і поясніть чому.
- Архитектуру
4. Що в цій здачі ви не перевірили і чому.
- Продуктивність (FPS).
- Код представлення (view) та інтерфейсу користувача (UI) не має автоматизованих тестів.
- Продакшн-збірка в браузері. Команда `npm run build` виконується успішно, але всі перевірки впроводіться локально
