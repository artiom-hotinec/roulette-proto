---
name: verify
description: Run lint, type-check and production build for this project and report any failures. Use before finishing a task or when asked to verify changes.
---

Run these in order from the project root, stopping at the first failure to fix it, then re-run from the start:

1. `npm run lint`
2. `npm run build` (runs `tsc -b && vite build`)

Report each step as pass/fail with the relevant error output. Common failures: unused locals/parameters (`noUnusedLocals`), type-only imports missing `import type` (`verbatimModuleSyntax`), and enums/namespaces (`erasableSyntaxOnly`).

There is no test runner configured, so do not look for one.
