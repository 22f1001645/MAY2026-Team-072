---
phase: 02-identity-session-dashboard-shell
plan: 02
subsystem: frontend-test-infrastructure
tags: [vitest, jsdom, d-12, rbac, structural-gate, test-runner]
status: complete

requires:
  - "frontend/src/lib/auth.tsx with ORGANISER_POR_TYPES already deleted (D-12 deletion half, pre-existing)"
provides:
  - "`npm test` in frontend/ — a jsdom-backed vitest runner, the prerequisite for D-18 and every 02-06 component test"
  - "frontend/src/__tests__/no-por-literals.test.ts — the D-12 structural gate"
  - "POR_LITERAL_ALLOWLIST — the frozen one-entry exemption pattern for frontend scans"
affects:
  - "02-06 (dashboard shell): its switcher interaction tests now have a runner and must not introduce POR literals"

tech-stack:
  added:
    - "vitest 3.2.7 (exact — 4.x peers on vite ^6, repo is on vite 5.4.21)"
    - "jsdom 26.1.0 (exact — 30.x engines exclude local node 24.4.1)"
    - "@testing-library/react ^16.3.2, @testing-library/dom ^10.4.1"
    - "@testing-library/jest-dom ^6.9.1, @testing-library/user-event ^14.6.4"
  patterns:
    - "Frozen, named, self-policing allowlist with a companion dead-entry test (mirrors Phase 1 LEGACY_COARSE_ROUTES)"
    - "Source scanning via import.meta.glob('?raw') instead of node:fs — no @types/node needed"

key-files:
  created:
    - frontend/vitest.config.ts
    - frontend/src/test/setup.ts
    - frontend/src/__tests__/no-por-literals.test.ts
  modified:
    - frontend/package.json
    - frontend/package-lock.json

decisions:
  - "POR_LITERAL_ALLOWLIST holds exactly one entry, src/pages/Orgs.tsx, guarded by a companion dead-entry test"
  - "The scan reads sources through vite's raw glob rather than node:fs, avoiding a seventh package (@types/node)"
  - "@testing-library/jest-dom held at ^6 as pinned, not the available 7.0.1"

metrics:
  duration: 20min
  completed: 2026-08-12
  tasks: 2
  files: 5

actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase 02 Plan 02: Frontend Test Runner and the D-12 POR-Literal Gate Summary

A pinned vitest 3.2.7 + jsdom 26.1.0 runner now backs `npm test` in `frontend/`, and D-12's structural gate rides on it: any POR-type string reintroduced into an authorization-deciding frontend module fails the suite, mutation-verified in both directions.

## What Was Built

**Task 1 — the runner** (commit `e332a9c`)

Six devDependencies, zero runtime dependencies. `vitest` and `jsdom` are pinned exact (no caret) because both naive picks are broken against this repo — vitest 4.x peers on `vite ^6 || ^7 || ^8` while the repo is on vite 5.4.21, and jsdom 30.x's `engines` excludes the local node 24.4.1.

`frontend/vitest.config.ts` is a separate file rather than a `test` block inside `vite.config.ts`, so the app build config is untouched. It reuses the React plugin (02-06's `.tsx` component tests would not compile without it), sets `environment: 'jsdom'`, `globals: true`, and an `include` glob of `src/**/*.test.ts(x)`. No coverage block — no threshold is required this phase and `@vitest/coverage-v8` was deliberately not installed.

`frontend/src/test/setup.ts` imports `@testing-library/jest-dom/vitest`, the vitest entry point. The bare package import registers matchers against jest's `expect` and silently does nothing under vitest.

`"test": "vitest run"` — never bare `vitest`, which would hang the phase gate in watch mode.

**Task 2 — the D-12 gate** (commit `fe51a47`)

`frontend/src/__tests__/no-por-literals.test.ts` walks every `.ts`/`.tsx` file under `frontend/src`, skipping its own `__tests__` directory and the allowlist, and fails naming file and line if any of the nine `ORGANISER_PORS` strings from `backend/app/constants.py` appears as a quoted string literal. Quoting is what makes the match precise: `Regional Coordinators` as JSX text and `Coordinator` inside a component name do not trip it, while `p.por_type === 'House Secretary'` does.

## The POR_LITERAL_ALLOWLIST Decision

D-12's target is the frontend *deciding* organiser status from a duplicated POR list. `frontend/src/pages/Orgs.tsx` is the admin POR-assignment surface — it renders and assigns POR type names as user-facing data (12 occurrences across the house grid, the region panel and the assignment form). That is a legitimate and unavoidable use of the strings, but exempting it by directory glob or by pattern would blind the gate to every future file in `src/pages`.

So the exemption mirrors Phase 1's `LEGACY_COARSE_ROUTES` precedent exactly: a module-level `Object.freeze([...])` holding the single entry `src/pages/Orgs.tsx`, with a comment stating it is the admin POR-management surface and that the list never grows. A second entry is a visible, reviewable diff rather than a config change. The companion test then fails if an allowlisted path is missing from disk or no longer contains a POR literal — without it, a renamed file would leave an entry sitting there ready to silently exempt whatever later claimed that path.

The test header records the long-term fix: `Orgs.tsx` sourcing POR type names from a server endpoint would empty the allowlist entirely. That is a Phase 3+ change, explicitly out of scope here.

## Mutation Verification

The gate was verified red in both directions, then restored:

| Mutation | Result |
|----------|--------|
| `const MUTATION_PROBE = 'Regional Coordinator'` appended to `src/lib/session.tsx` | Scan test FAILED, naming `src/lib/session.tsx:41  Regional Coordinator`. File restored byte-identical (verified by buffer comparison), `git status` clean. |
| `'src/pages/Gone.tsx'` added to `POR_LITERAL_ALLOWLIST` | Dead-entry test FAILED: "These POR_LITERAL_ALLOWLIST entries no longer match a file that uses a POR literal: src/pages/Gone.tsx". Reverted. |

## Verification

| Gate | Result |
|------|--------|
| `cd frontend && npm test` | 1 file, 2 tests, exit 0 |
| `cd frontend && npm run build` | exit 0, 400 modules transformed |
| `devDependencies.vitest === '3.2.7'`, `jsdom === '26.1.0'`, `scripts.test === 'vitest run'` | ok |
| No test package in `dependencies` | ok |
| `vitest.config.ts` and `src/test/setup.ts` exist | ok |

## Deviations from Plan

**1. [Rule 3 - Blocking] The scan reads sources via `import.meta.glob('?raw')`, not `node:fs`**
- **Found during:** Task 2 design, before writing the test
- **Issue:** The plan specifies `node:fs` and `node:path`. `frontend/` has no `@types/node` installed, and `tsconfig.json` has `include: ["src"]`, so the test file is inside the `tsc -b` program that `npm run build` runs. A `node:fs` import would have failed the build typecheck.
- **Fix:** Used vite's raw glob, which `src/vite-env.d.ts` (`/// <reference types="vite/client" />`) already types. Behaviour is identical — the glob keys are the on-disk file listing the dead-entry test needs — and it avoids installing a seventh package outside the six the legitimacy checkpoint approved.
- **Files modified:** `frontend/src/__tests__/no-por-literals.test.ts`
- **Commit:** `fe51a47`

**2. [Rule 1 - Bug] `npm i -D` wrote caret ranges and resolved jest-dom to 7.0.1**
- **Found during:** Task 1, immediately after the install
- **Issue:** Two problems in one install. `npm i -D vitest@3.2.7 jsdom@26.1.0` records `^3.2.7`/`^26.1.0`, which would let a future `npm install` drift onto the vitest 4.x / jsdom 30.x versions the plan prohibits. Separately, unpinned `@testing-library/jest-dom` resolved to `^7.0.1`, not the `^6` the plan and the legitimacy checkpoint approved.
- **Fix:** Re-ran as `npm i -D --save-exact vitest@3.2.7 jsdom@26.1.0`, then `npm i -D "@testing-library/jest-dom@^6"` (resolved 6.9.1).
- **Files modified:** `frontend/package.json`, `frontend/package-lock.json`
- **Commit:** `e332a9c`

**3. [Deferred] `tsconfig.json` `compilerOptions.types` left unchanged**
- The plan allows adding `"vitest/globals"` if the build fails on missing globals. It did not: the test file imports `describe`/`it`/`expect` explicitly from `vitest`, so no `types` entry is needed. Adding one would have replaced TypeScript's automatic `@types/*` inclusion with an explicit list — a wider blast radius than the problem justified. `globals: true` remains set in `vitest.config.ts` for 02-06. If a later test uses bare globals, that is when the `types` entry earns its place.

## Checkpoint

The plan's blocking-human package-legitimacy checkpoint (`jsdom`, `@testing-library/jest-dom`, `@testing-library/user-event`, all flagged `SUS (too-new)` in 02-RESEARCH.md) was resolved before this run: verified as long-established first-party org packages with no install hooks, approved by the user with the instruction to keep the pins as written rather than take newer majors. The `^6` jest-dom pin above is that instruction being honoured.

## Known Stubs

None.

## Threat Flags

None. The two mitigations this plan owed are both in place: T-02-SC (human-verified installs, no `postinstall` on any of the six) and T-02-10 / T-02-16 (the scan gate plus the frozen, self-policing allowlist).

## Notes for Next Plan

- `frontend/tsconfig.tsbuildinfo` is tracked and shows as modified after every build. It was already dirty before this plan started and was left alone; it is build output that probably belongs in `.gitignore`, but that is not this plan's scope.
- `npm audit` reports 7 pre-existing vulnerabilities (4 moderate, 3 high) in the frontend tree. Untouched — out of scope, no `npm audit fix` run.
- 02-06 must not reintroduce POR literals into `src/lib` or `src/components`; the gate now fails the suite if it does.

## Self-Check: PASSED

- `frontend/vitest.config.ts` — FOUND
- `frontend/src/test/setup.ts` — FOUND
- `frontend/src/__tests__/no-por-literals.test.ts` — FOUND
- commit `e332a9c` — FOUND
- commit `fe51a47` — FOUND
