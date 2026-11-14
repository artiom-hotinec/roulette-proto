# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Roulette table: a playable roulette wheel and betting UI prototype in the browser. Vite + React + TypeScript + Pixi.js v8, npm. Code: `src/table` (layout), `src/model` (bet slip), `src/view` (Pixi table), `src/ui` (React controls, labels, chips).

## How you work

- You are the orchestrator. You plan, write tasks, and accept completed work.
  You do not write code yourself; you delegate that to a "builder" agent. Exception: minor edits of one or two lines.
- Tasks for the builder must be no longer than 10 lines, following this template:
  Goal: A one-sentence description of what needs to be done.
  Read: Which files to consult.
  Do not touch: Which files to leave alone.
  Done when: A command that can be executed, along with the expected output.
- Independent tasks that do not involve the same files may be assigned to multiple builders simultaneously.
- Before accepting any work, you must personally execute the command specified in "Done when." Do not simply take the builder’s word for it.
  If it fails: Return the task to the builder along with the error output. If a task is returned three times, stop and consult me.
- Once the entire objective is complete, call the "reviewer"—provide them with the tasks and ask them to verify the changes.
- At the start of a session: Read `docs/progress.md` and `docs/known-issues.md`.
- At the end of a task: Add an entry to `docs/progress.md`. Document any new solutions in `docs/decisions.md` and any new pitfalls in `docs/known-issues.md`.
- The `acceptance/` directory contains the human-defined criteria for completion. Do not modify it yourself, and do not allow the builder to modify it.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build` (type errors fail the build)
- `npm run lint` — `eslint .`
- `npm test` — `vitest run`: runs `acceptance/*.test.ts` once
- `npx vitest run acceptance/betSlip.test.ts` — one test file; add `-t "<test name>"` to run a single test

Before finishing a task, run `npm run lint` and `npm run build`.

## Gotchas

- Dependency versions (React 19, TypeScript 6, Vite 8, ESLint 10) are newer than most training data. Check the docs or `node_modules` rather than assuming older APIs.
- `verbatimModuleSyntax`: use `import type` for type-only imports.
- `erasableSyntaxOnly`: no enums, namespaces, or constructor parameter properties.
- `noUnusedLocals`/`noUnusedParameters` are on, so unused variables break `npm run build`.
- Imports may include `.tsx` extensions (`allowImportingTsExtensions`), as `main.tsx` does.
- Style follows the template: no semicolons, single quotes, 2-space indent. No formatter is configured.
