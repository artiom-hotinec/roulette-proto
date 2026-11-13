---
name: reflect
description: Session review. Identifies what went wrong or took unnecessary time, and proposes minimal adjustments to CLAUDE.md or agent configurations. To be used at the user's request at the end of a session.
---

## AI Interaction Log

- Review the current session and list any issues that occurred, such as tasks being sent back, redundant steps, unclear briefs, or agent errors.
- AI Work Log – Prompts, Iterations, Model Errors
- List of AI errors, along with the checks that detected them

## Test Logs

- Raw output of `typecheck`, tests, and build

## Costs

- number of iterations, tokens, and hours spent.

## Preventive Actions

- Include the results from the previous steps in `docs/statistics.md`.
- For each issue, propose a single, minimal adjustment to CLAUDE.md, an agent file in `.claude/agents/`, or `docs/known-issues.md` that would prevent the problem from recurring. Show the change by displaying the original version alongside the proposed new version.

## Controlled Changes

- Propose only changes that address actual events; do not suggest adjustments "just in case."
- Do not implement any changes until the user has explicitly approved a specific item.
