# Session statistics

## 2026-11-13: Roulette table implementation (session `957f7e4b`)

Orchestrator: Claude Opus 5.5. Builders and reviewer: Claude Sonnet 5.5 (`model: sonnet` in `.claude/agents/`).
Figures come from the session transcripts. Times are UTC.

### AI work log

| Time | Step | Prompt / event | Result |
|---|---|---|---|
| 07:03 | Plan | User: break `docs/task.md` into builder tasks; show the plan and texts, launch nothing | Plan with 11 tasks shown at 07:14 |
| 07:34 | Approval | User: "1. Yes 2. Use your recomendations", view to follow `roulette-table.png` | Git baseline `c4da09a`, branch `feat/roulette-table` |
| 07:38 | Batch A | T1 layout, T2 bet slip, T3 labels/chips, T4 projection (parallel) | All accepted on the first run; 96/96 tests |
| 07:41 | Batch B | T5 Pixi scaffold | Accepted |
| 07:43 | Batch C | T6 perspective table, T7 mutation check (parallel) | T6 accepted; T7 found 4 surviving mutants |
| 07:47 | Batch D | T8 hover/tooltip/clicks, T9 chip stacks, T10 controls (parallel) | All accepted |
| 07:51 | Batch E | T11 wiring | Accepted after a brief correction (test count 96 → 98) |
| 07:52 | Approval | User: "Add them yourself and re-run the mutation check" | 2 tests added; T7 re-run: 40/41 killed |
| 07:53 | Browser check | Playwright, real mouse events, 3 screenshots | Chip labels unreadable: orchestrator fixed 2 constants |
| 07:55 | Review | Reviewer over all tasks | 11 findings, no task missing |
| 08:00 | Context | Conversation compacted | Continued from summary |
| 08:03 | Fixes | T12 hitTest ties, T13 slip key/errors, T14 error persistence/CSS, T15 tooltip (parallel) | All accepted on the first run |
| 08:05 | Browser check | T14 behaviour, tooltip in 5 zones, retake `zone-highlight.png` | Passed |
| 08:07 | Docs | `progress.md`, `decisions.md`, `known-issues.md`, `CLAUDE.md` line 3, verify skill | Done |

### Issues

| # | Issue | Kind | Caused by | Detected by |
|---|---|---|---|---|
| 1 | Chip labels unreadable at the size T9 asked for (70 % of a cell) | Unclear brief | Orchestrator (T9 brief) | Orchestrator screenshot (browser check) |
| 2 | Tooltip covered highlighted cells; the orchestrator accepted the screenshot | Agent error + missed check | T8 builder, orchestrator | Reviewer |
| 3 | `act` cleared the error after an action that changed nothing | Agent error | T11 builder | Reviewer |
| 4 | `hitTest` depended on zone order at 5 points (equal-area ties) | Agent error, rule in `decisions.md` | T1 builder | Reviewer (reversed-list script) |
| 5 | Spot key did not sort numbers (`[18,17]` ≠ `[17,18]`) | Agent error, rule in `decisions.md` | T2 builder | Reviewer (code read) |
| 6 | Limit errors were fragments, not sentences with "credits" | Unclear brief: its own example was the fragment "Max 100 per bet position" | Orchestrator (T2 brief) | Reviewer |
| 7 | `.controls` rule declared twice (T5 placeholder kept after T10) | Handoff gap | T5/T10 | Reviewer |
| 8 | T11 "Done when" expected `96 passed`; stale after 2 tests were added | Brief changed in flight | Orchestrator | Orchestrator (SendMessage correction) |
| 9 | Reviewer reported missing docs, unrecorded user approval and no T7 evidence | Redundant findings | Orchestrator (reviewer called before the progress entry) | Reviewer |
| 10 | Mutation run wrote `.vite-temp`/`.vitest-cache` into the real `node_modules` (symlink) | Agent error | T7 builder | T7 builder (mtime check) |
| 11 | Screenshot saved outside the project | Tool error; the pitfall was already in `known-issues.md` | Orchestrator | Playwright ("outside allowed roots") |
| 12 | `getByRole('button', { name: 'Chip 1' })` matched 3 buttons | Tool error | Orchestrator | Playwright (strict mode violation) |
| 13 | Stale hover blamed on the app; caused by a synthetic `contextmenu` | Redundant steps | Orchestrator | Re-test with real mouse moves |
| 14 | Hover screenshot after a reload showed nothing, twice; not reproducible | Redundant steps (about 5 tool calls) | Playwright timing | Orchestrator screenshot |
| 15 | zsh: `echo === …` gave "== not found"; unquoted `--include=*.mjs` gave "no matches found" | Tool error | Orchestrator | Shell |
| 16 | Builder read a nonexistent path; `python3` has no Pillow | Tool error | T6 builder, orchestrator | Tool error |

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

### Costs

**Time**

| Phase | Wall time |
|---|---|
| Plan (07:03 → 07:14) | 10 min |
| Waiting for the user (07:14 → 07:34) | 20 min |
| T1–T11, mutation check, browser check (07:34 → 07:55) | 21 min |
| Review, fixes T12–T15, docs (07:55 → 08:08) | 12 min |
| **Total** | **64 min wall, 44 min of AI work** |

Subagent run time, summed: 30 min (they ran in parallel batches).

**Iterations**

- User messages: 3, plus `/reflect`.
- Subagents: 16 (15 builder tasks, 1 reviewer). SendMessage follow-ups: 2.
- Orchestrator: 114 model turns. Tool calls: 50 Bash, 36 Read, 6 Edit, 3 Write, 37 Playwright, 3 ToolSearch.
- Context compactions: 1.

**Tokens**

| | Output | Input, uncached | Cache read | Cache write |
|---|---:|---:|---:|---:|
| Orchestrator (Opus 5.5) | 186,768 | 250 | 18,381,677 | 376,701 |
| Subagents (Sonnet 5.5) | 191,629 | 264 | 4,074,125 | 518,256 |
| **Total** | **378,397** | **514** | **22,455,802** | **894,957** |

The orchestrator figures include the `/reflect` step up to the stats run.

Per subagent (minutes, tool calls, output tokens, all input tokens):

| Task | Min | Tools | Output | Input |
|---|---:|---:|---:|---:|
| T1 layout | 2.1 | 10 | 17,327 | 127,306 |
| T2 bet slip | 0.9 | 12 | 6,207 | 173,192 |
| T3 labels, chips | 0.6 | 8 | 5,008 | 62,725 |
| T4 projection | 0.5 | 6 | 3,249 | 38,293 |
| T5 Pixi scaffold | 1.4 | 17 | 8,177 | 230,745 |
| T6 perspective table | 3.4 | 25 | 25,644 | 631,108 |
| T7 mutation check | 11.0 | 29 | 49,640 | 1,590,770 |
| T8 hover, tooltip | 1.3 | 11 | 11,199 | 154,372 |
| T9 chip stacks | 1.3 | 12 | 9,820 | 173,297 |
| T10 controls | 0.8 | 10 | 5,789 | 58,910 |
| T11 wiring | 1.8 | 16 | 13,070 | 287,732 |
| Reviewer | 3.6 | 25 | 25,884 | 875,421 |
| T12 hitTest ties | 0.3 | 6 | 1,702 | 46,727 |
| T13 slip key, errors | 0.3 | 5 | 1,860 | 32,020 |
| T14 error, CSS | 0.3 | 9 | 1,923 | 48,567 |
| T15 tooltip | 0.7 | 7 | 5,130 | 61,460 |

### Preventive actions

Proposed in `/reflect`; none applied until the user approves each one.

| # | Target | Prevents issues |
|---|---|---|
| P1 | `CLAUDE.md`: a browser check in "Done when" for visible changes | 1, 2, 3 |
| P2 | `CLAUDE.md`: "Done when" also checks rules and exact texts that `acceptance/` does not test | 4, 5, 6 |
| P3 | `CLAUDE.md`: expect exit code 0 from `npm test`, not a test count | 8 |
| P4 | `CLAUDE.md`: write the progress entry before calling the reviewer | 9 |
| P5 | `docs/known-issues.md`: zsh quoting | 15 |

Already covered by `known-issues.md` entries written in this session: issues 10, 12, 13 and 14.
No change for 7, 11 and 16: one-off, or already documented.
