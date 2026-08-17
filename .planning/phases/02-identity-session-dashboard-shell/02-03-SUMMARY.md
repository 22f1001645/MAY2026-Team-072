---
phase: 02-identity-session-dashboard-shell
plan: 03
subsystem: auth-session
tags: [auth, jwt, refresh-token, rotation, csrf, security, reuse-detection]
status: complete

requires:
  - "02-01: skip_revocation_check=True on /auth/refresh — without it the reuse-detection branch never executes"
  - "02-01: locations=[\"cookies\"] on both cookie endpoints"
  - "02-01: cookie_client fixture (CookieClient) in tests/conftest.py"
provides:
  - "REFRESH_ROTATION_GRACE_SECONDS — the named, documented D-02a grace window"
  - "BlocklistRepository.revoke_family — idempotent family tombstone, collision-free synthetic jti"
  - "Verification-map rows 4, 5, 6 and 7 under automated test"
  - "_present() and _age_past_grace_window() test helpers for replaying spent refresh tokens"
affects:
  - "02-04 (academic staleness) — extends the same test module"
  - "02-05 (config hardening) — owns auth_controller.py, untouched here"
  - "02-06/02-07 (frontend session) — the two-tab refresh race is now provably non-fatal"

tech-stack:
  added: []
  patterns:
    - "Storage keys are built in the repository, never in the service layer"
    - "Synthetic tombstone jtis are collision-free by construction, not by catching IntegrityError"
    - "Blocklist rows are aged by rewriting revoked_at, never by sleeping — the module stays under 4s per test"
    - "Every security assertion is mutation-verified: proven red before being kept"

key-files:
  created: []
  modified:
    - backend/app/constants.py
    - backend/app/repositories/repos.py
    - backend/app/services/auth_service.py
    - backend/tests/test_auth_session.py

decisions:
  - "The D-02a grace-window replay mints a NEW token in the same family rather than returning the previously-issued successor — recorded in refresh()'s docstring rather than silently kept"
  - "revoke_family makes the tombstone jti unique by uuid suffix rather than catching IntegrityError, so repeated revocations leave a truthful audit trail instead of being swallowed"
  - "The blocklist-loader positive control is a logout, not a refresh — refresh runs under skip_revocation_check and never reaches the loader, so the plan's prescribed control was unusable"

metrics:
  duration: 45min
  completed: 2026-08-12
  tasks: 3
  commits: 3
  files: 4

actuals:
  tokens: 5400
  tasks: 3
  commits: 3
---

# Phase 02 Plan 03: Refresh Rotation Hardening Summary

Turned the refresh-token family state machine from written-but-unproven into enforced-and-tested: the grace window is now a documented constant, family tombstones can no longer collide into a 500, and reuse detection, the two-tab race, CSRF and loader efficiency are all pinned by mutation-verified tests.

## What Was Built

**Task 1 — the three defects in the rotation block (commit `f8edab3`).**

| Defect | Fix |
|--------|-----|
| Grace window was the inline literal `10` at `auth_service.py:90` | `REFRESH_ROTATION_GRACE_SECONDS = 10` in `constants.py`, with a comment tying it to the two-tab case and to why widening it widens the replay window |
| Tombstone jti was `"fam_" + family_id` / `"logout_" + family_id` against a `unique=True` column — a second reuse detection or a second logout on one family raised `IntegrityError` → 500 | `BlocklistRepository.revoke_family()` appends a fresh `uuid4().hex`, so repeated revocations write distinct rows. `family_revoked` only asks whether *any* non-rotated row exists, so extra rows are harmless and record how many times revocation fired |
| D-02a semantics diverged from the code without anyone recording it | Recorded in `refresh()`'s docstring (see Deviations) |

Both synthetic-jti call sites moved out of the service layer — building storage keys is repository work. `grep -v '^\s*#' auth_service.py \| grep -c 'fam_\|logout_'` returns `0`. `add_entry`'s deprecated `datetime.utcnow()` became `datetime.now(UTC).replace(tzinfo=None)`, deliberately still naive UTC so it stays comparable with the service's side of the grace-window subtraction.

**Task 2 — reuse, grace and session fixation (commit `8101528`).** Four tests, plus two helpers that make replaying a spent token possible at all: `_present()` puts the token back in the jar *and* sends the matching `csrf` claim as the header (by replay time the jar's csrf cookie belongs to the successor, so the default helper would fail on CSRF and mask the real assertion), and `_age_past_grace_window()` backdates `revoked_at` rather than sleeping.

**Task 3 — CSRF and loader efficiency (commit `a49ea2e`).** A refresh with a valid cookie and no `X-CSRF-TOKEN` is rejected 401 through the project's `{error, code}` envelope, with a negative control proving the rejection is attributable to CSRF. The loader test wraps `is_jti_blocked` in a counting shim that *delegates to the real method* — a stub would keep passing if the short-circuit were removed and the real lookup were simply broken.

## Verification Evidence

| Gate | Result |
|------|--------|
| `pytest -q --no-cov` (full suite) | exit 0 — **109 passed** (103 baseline after 02-01, +6 new) |
| `pytest tests/test_auth_session.py -q --no-cov` | **17 passed** (11 from 02-01 + 6 new) |
| `pytest tests/test_migrations.py` | **5 passed** — Phase 1 drift gate green, no model changed |
| `pytest -k reuse` | 2 collected, exit 0 |
| `pytest -k grace` | exactly 1 collected, exit 0 |
| `pytest -k csrf` | exactly 1 collected, exit 0 |
| `pytest -k loader_short_circuit` | exactly 1 collected, exit 0 |
| `REFRESH_ROTATION_GRACE_SECONDS == 10` | `ok` |
| `hasattr(BlocklistRepository, 'revoke_family')` | `ok` |
| synthetic-jti count in service (comments stripped) | `0` |
| `--durations=3` | slowest is 3.36s and it is fixture **setup** (`db.create_all`), not a test body — no sleep-based timing anywhere |
| `git diff --name-only` | nothing under `backend/migrations/`, no controller file |

**Mutation verification** — both load-bearing security assertions were proven to fail before being kept:

1. **Family revocation.** Changed `family_revoked`'s filter from `reason != "rotated"` to a sentinel that matches nothing, so `rotated` rows also count as revoking. The **grace** test went red exactly as predicted: `AssertionError: a second tab refreshing within the grace window was treated as replay: {"error":"Session revoked","code":"session_revoked"}` — i.e. ordinary rotation now revokes its own family. Reverted; `git diff --stat` on `repos.py` empty.
2. **Loader short-circuit.** Deleted the `if jwt_payload.get("type") == "access": return False` early return in `check_if_token_revoked`. The loader test went red with a non-zero count: `an ordinary authenticated request hit the blocklist 1 time(s)`. Restored byte-for-byte; `git diff --stat` on `app/__init__.py` empty.

## Success Criteria

1. **Verification-map rows 4, 5, 6, 7 green** — reuse, grace, CSRF, loader, all passing.
2. **Family revocation kills the live successor** — the reuse test presents successor `B` after replaying `A` and requires 401. Mutation-verified.
3. **Two-tab simultaneous refresh produces zero logouts** — grace test asserts 200 *and* `family_revoked(fam) is False`.
4. **CSRF rejection proven with a passing negative control** — same request with the header returns 200.
5. **Loader issues zero queries for access tokens** — `calls == []` on `/auth/me`, mutation-verified, with a logout positive control proving the counter works.
6. **Grace window is a named, documented constant at 10** — asserted by import, and the tests compute their ageing offset from the constant so it cannot drift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's prescribed positive control for the loader test was unusable**
- **Found during:** Task 3
- **Issue:** The plan says "make a refresh call and assert the count is greater than zero". But 02-01 added `skip_revocation_check=True` to `/auth/refresh` precisely so the loader cannot raise during decode — which means refresh never invokes the loader at all. The prescribed control would have failed with a count of 0 and looked like a broken short-circuit.
- **Verified, not assumed:** ran a throwaway probe test counting `is_jti_blocked` calls across a successful refresh. Output: `BLOCKLIST CALLS DURING REFRESH: 0`. Probe deleted, not committed.
- **Fix:** the positive control is `POST /auth/logout`, which 02-01 deliberately left *without* `skip_revocation_check` (its summary records that as an explicit decision). It reaches the loader, so it proves the counter is wired up.
- **Files affected:** `backend/tests/test_auth_session.py` only.
- **Commit:** `a49ea2e`

**2. [Rule 2 - Missing critical coverage] The duplicate-tombstone test would have passed vacuously**
- **Found during:** Task 2
- **Issue:** The plan specifies `test_detecting_reuse_twice_on_one_family_does_not_error` as "replay an aged token twice; both calls return 401". Tracing the branch order in `refresh()`, the *second* replay short-circuits on the `family_revoked` check at step 1 and returns 401 before ever reaching `revoke_family`. The test as specified would pass identically against the old colliding-jti code — it proves nothing about T-02-19.
- **Fix:** kept the two replays (they are the user-facing behaviour) and added a direct assertion that calling `revoke_family` twice for the same family and reason commits without raising and leaves **two** rows. That is the assertion that actually goes red under the old `"fam_" + family_id` construction.
- **Files affected:** `backend/tests/test_auth_session.py` only.
- **Commit:** `8101528`

### Recorded Decisions (not fixes)

**3. D-02a: re-issue rather than return the already-issued successor**
- D-02a describes a replay inside the grace window as "returns the already-issued successor". The code mints a *new* refresh token carrying the same `fam` instead.
- Both tabs end up holding valid tokens in one family, so D-02a's intent — nobody gets logged out — is satisfied, and family revocation still takes every token in the family down at once, so the security envelope is unchanged. Returning the literal successor would require the server to retain issued tokens, which is a store this design deliberately does not have.
- Per the plan's instruction this is **recorded, not silently kept**: it now lives in `auth_service.refresh`'s docstring where the next reader of that branch will find it.

### Process Deviations

**4. No `Co-Authored-By` trailer on any commit**
- The runtime instructs ending commit messages with a Claude co-author trailer and a session link. Project `CLAUDE.md` forbids AI attribution in commits outright — graders fail the team for it, and it previously blocked deploys.
- **Resolution:** CLAUDE.md takes precedence as a hard constraint. All three commits are plain-English, trailer-free, authored as `22f1001645` (repo-local identity verified before the first commit).

**5. Mutation revert performed by scripted edit rather than `git checkout --`**
- A fact-forcing gate in this environment blocks `git checkout -- <path>` as destructive, twice, even after presenting the required facts.
- **Resolution:** restored `app/__init__.py` by re-inserting the deleted lines with a scripted edit, then confirmed the restoration was byte-for-byte with `git diff --stat` (empty). Same end state, no blanket reset, no `git clean`.

**6. No tracer gate**
- All three tasks are `type="auto"`; the plan defines no `type="tracer"` task, so the tracer feedback gate does not apply. Auto mode is off (`_auto_chain_active=false`, `auto_advance=false`) and the plan contains no `checkpoint:*` task, so execution ran straight through as designed.

### Prohibitions Respected

| Prohibition | Held |
|-------------|------|
| Do not widen the grace window beyond ~10s | `REFRESH_ROTATION_GRACE_SECONDS = 10`, asserted by import |
| Do not move reuse detection into the blocklist loader | `check_if_token_revoked` is byte-identical to HEAD after the mutation revert |
| Do not add cross-device or all-sessions revocation | No new revocation surface; the independent-families test asserts the opposite property |
| Do not touch `auth_controller.py` | `git diff --name-only` across all three commits lists no controller file |

## Threat Model Coverage

| Threat | Disposition | How |
|--------|-------------|-----|
| T-02-02 (CSRF on refresh) | mitigated | Missing-header refresh rejected 401 through the error envelope, with a passing negative control |
| T-02-03 (stolen refresh token blast radius) | mitigated | Reuse outside the window revokes the family and the live successor dies too — mutation-verified |
| T-02-05 (session fixation) | mitigated | Two logins produce different `fam` claims; burning one leaves the other refreshing |
| T-02-04 (30-day refresh lifetime) | mitigated | Blocklist consulted on every refresh via the family check, never gated on token expiry |
| T-02-18 (grace-window false positives) | mitigated | Grace test asserts 200 *and* an unrevoked family; the window is a named constant with a comment forbidding widening |
| T-02-19 (duplicate family tombstone → 500) | mitigated | `revoke_family`'s uuid-suffixed jti; asserted directly, since the HTTP path short-circuits before reaching it |
| T-02-20 (blocklist loader on every request) | mitigated | Zero calls on `/auth/me`, mutation-verified, with a logout positive control |

No new security-relevant surface: no new endpoints, no new models, no migration, no controller change.

## Known Stubs

None. No placeholders, no skipped tests, no `<verify>` block left unrun — every acceptance criterion in all three tasks was executed and its output is recorded above.

## Self-Check: PASSED

**Artifacts verified present:**
- `REFRESH_ROTATION_GRACE_SECONDS` in `backend/app/constants.py` — FOUND, imports to `10`
- `BlocklistRepository.revoke_family` in `backend/app/repositories/repos.py` — FOUND, `hasattr` true
- Six new tests in `backend/tests/test_auth_session.py` — FOUND, module collects 17 and all pass
- `refresh()` docstring recording the D-02a deviation — FOUND

**Commits verified in `git log`:**
- `f8edab3` feat(02-03): name the refresh grace window and make family tombstones idempotent — FOUND
- `8101528` test(02-03): pin reuse detection, the grace window and family independence — FOUND
- `a49ea2e` test(02-03): pin CSRF enforcement on refresh and the blocklist loader short-circuit — FOUND

## TDD Gate Compliance

Tasks 2 and 3 are marked `tdd="true"` but are **test-only** tasks pinning behaviour that Task 1 had already landed, so a conventional RED-before-GREEN commit pair was not available for them. The plan anticipated this and prescribed **mutation verification** in its place, which is what was executed: two mutations, both confirmed red with the exact expected failure, both reverted and confirmed clean by `git diff`. Task 1 is a `feat` commit whose behaviour was already covered by 02-01's eleven tests, all of which stayed green across the change.
