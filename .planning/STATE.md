---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
current_phase: 04
current_phase_name: event-execution-close-out
status: complete
stopped_at: Phase 7 UI-SPEC approved
last_updated: "2026-08-23T04:41:46.499Z"
last_activity: 2026-08-22
last_activity_desc: "Phase 6 complete: all 9 plans executed and merged, UAT passed 9/10, 3 UAT-found defects fixed"
progress:
  total_phases: 8
  completed_phases: 6
  total_plans: 50
  completed_plans: 45
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-03)

**Core value:** A Regional Coordinator can propose, get approved, publish, fill, run, and reimburse a city meetup — and a student can discover, register for, and stay updated on it — entirely inside Ekatva OS.
**Current focus:** Phase 07 — Progression Gating (not started; Phase 06 complete)

## Current Position

Phase: 04 (organisation-profile-brand-kit) — COMPLETE, manual UAT deferred (see 04-UAT.md)
Phase: 05 (post-acceptance-pipeline-design-campaign-live-workspace) — COMPLETE, manual UAT outstanding
Phase: 06 (event-execution-close-out) — COMPLETE (see 06-UAT.md)
Plan: 9/9 (all Phase 06 plans executed and merged to main)
Status: Phase 6 is done. QR-01–04, TIMELINE-01/02, FEEDBACK-01/02 and REIMB-01/02 all shipped and passed manual UAT (9/10 tests passed; test 7, live QR scan, needs a camera and is manual-only). Three defects the UAT pass found were fixed: the bill upload endpoint didn't exist (added POST /api/v1/activities/<id>/expenses/bill), the frontend granted Meetup Head to the organiser/admin when the server grants it to neither, and the Submit Reflection click was being swallowed by its own auto-save blur handler.
Last activity: 2026-08-22 — Phase 6 complete: all 9 plans executed and merged, UAT passed 9/10, 3 UAT-found defects fixed

Progress: [████████░░] 75% (6/8 phases complete; Phase 07 next)

## Performance Metrics

**Velocity:**

- Total plans completed: 7
- Average duration: —
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 | 7 | - | - |
| 03 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 25min | 4 tasks | 11 files |
| Phase 01 P02 | 35min | 3 tasks | 4 files |
| Phase 01 P03 | 22min | 3 tasks | 4 files |
| Phase 01 P04 | 30min | 3 tasks | 7 files |
| Phase 01 P05 | 40min | 3 tasks | 5 files |
| Phase 02 P01 | 35min | 3 tasks | 4 files |
| Phase 02 P02 | 20min | 2 tasks | 5 files |
| Phase 02 P03 | 45min | 3 tasks | 4 files |
| Phase 02 P06 | 25min | 3 tasks | 11 files |
| Phase 02 P04 | 30min | 3 tasks | 6 files |
| Phase 02 P07 | 47min | 4 tasks | 7 files |
| Phase 02 P05 | 52min | 3 tasks | 6 files |
| Phase 03 P01 | — | — | — |
| Phase 03 P02 | — | — | — |
| Phase 03 P03 | — | — | — |
| Phase 03 P04 | — | — | — |
| Phase 04 P02 | 35min | 3 tasks | 10 files |
| Phase 04 P06 | 25min | 3 tasks | 7 files |
| Phase 04 P03 | 55min | 2 tasks | 8 files |
| Phase 04 P04 | 40min | 2 tasks | 5 files |
| Phase 04 P07 | 45m | 3 tasks | 7 files |
| Phase 04 P05 | 50min | 3 tasks | 5 files |
| Phase 04 P08 | 40min | 2 tasks | 8 files |
| Phase 04 P09 | 35min | 3 tasks | 6 files |
| Phase 05 P06 | 35min | 2 tasks | 6 files |
| Phase 05 P03 | 25min | 3 tasks | 3 files |
| Phase 05 P07 | 55min | 3 tasks | 15 files |
| Phase 05 P04 | 30min | 2 tasks | 5 files |
| Phase 05 P08 | 40min | 2 tasks | 8 files |
| Phase 05 P05 | 40min | 2 tasks | 4 files |
| Phase 05 P09 | 45min | 3 tasks | 13 files |
| Phase 05 P10 | 50min | 2 tasks | 12 files |
| Phase 05 P11 | 45min | 3 tasks | 9 files |
| Phase 06 P01 | 40min | 3 tasks | 6 files |
| Phase 06 P02 | 60min | 3 tasks | 8 files |
| Phase 06 P03 | — | — | — |
| Phase 06 P04 | — | — | — |
| Phase 06 P05 | — | — | — |
| Phase 06 P06 | — | — | — |
| Phase 06 P07 | — | — | — |
| Phase 06 P08 | — | — | — |
| Phase 06 P09 | — | — | — |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: Adopt Flask-Migrate (Alembic) with a metadata naming convention as the literal first commit — retrofitting the convention after tables exist is irrecoverable on SQLite batch migrations.
- [Phase 1]: Declare all ~8 new tables and ~12 new columns in one batch, then reseed once — per-feature schema changes cost 8 destructive wipes across 5 developers.
- [Phase 2]: Refresh token lands before the dashboard switcher (same files; refresh changes the token contract every later fetch rides on).
- [Phase 3/5/6]: One consistent "any team member drafts, only the Meetup Head submits" rule across campaign push-live, reimbursement, and post-event report.
- [Phase 5]: AI campaign ships mail-template generation + poster upload only; poster generation stays behind `AI_IMAGE_ENABLED`, off by default.
- [Phase 1]: USER DECISION (01-01 checkpoint, option-a): adopt Flask-Migrate with the metadata naming convention as the first commit — named constraints from revision 1, not Alembic defaults. Landed in commit 12f07ad; baseline revision 312ea9fc2c96.
- [Phase 1]: USER DECISION (01-01 checkpoint): Flask-Migrate legitimacy verified on PyPI (Miguel Grinberg); pinned Flask-Migrate==4.0.7.
- [Phase 1]: Resolved the 01-01 drift gate vs 01-02 no-migration conflict with PENDING_BATCH_TABLES — a named, self-retiring allowlist in test_migrations.py that keeps the gate live for every table outside the deliberate SCHEMA-02 batch window. Plan 01-04 must empty it with the batch revision.
- [Phase 1]: The two authorization singletons (one primary collaborating org, one Meetup Head per Activity) are partial unique indexes, not service checks — uq_activity_primary_org and uq_team_meetup_head, both verified by negative control.
- [Phase 1]: The SCHEMA-02 batch window was extended by (table, column) pair (PENDING_BATCH_COLUMNS), not by table name — allowlisting users wholesale to cover three academic columns would have blinded the drift gate to every future column on the most security-relevant table.
- [Phase 1]: Columns landing on populated tables must be nullable or carry a server_default, and the two backfills (reports.status='submitted', attendance.method='manual') record what actually happened — enforced by a permanent test, negative-control verified.
- [Phase ?]: Settled the deferred 65-character FK name by naming it explicitly before autogenerate — the last moment it was free, since the table was still unmigrated.
- [Phase ?]: The milestone schema landed as ONE revision (213804635519) and was verified against the LIVE database by inspector, because pytest builds its own schema and would pass either way.
- [Phase ?]: seed.py's destructive path is gated on the resolved database URI alone — no override variable, no flag, and a test naming an invented bypass variable so nobody adds one later.
- [Phase ?]: reset_destructive drops alembic_version explicitly and rebuilds via the migration chain, never create_all, so the version marker and schema stay in agreement.
- [Phase ?]: Path containment in the dev guard is checked in both POSIX and Windows form — Path.is_absolute() reports False for '/var/lib/x.db' on Windows, which had silently disabled the check.
- [Phase ?]: [Phase 1] is_meetup_head ships with no admin short-circuit and no manage fallback, protected by a docstring, a source assertion that ROLE_ADMIN never appears in it, and a mutation-verified test — reassigning the Meetup Head is a different power from acting as one.
- [Phase ?]: [Phase 1] RBAC-02 is enforced by a test that walks app.url_map every run, with a six-entry frozen LEGACY_COARSE_ROUTES allowlist that never grows and a companion dead-entry test so the allowlist cannot rot into a blanket exemption.
- [Phase ?]: [Phase 1] can_manage_activity reads BOTH activities.org_id and the activity_collaborators rows, because 01-02 made the collaborator table the source of truth while keeping org_id as a cache of the primary.
- [Phase ?]: [Phase 1] The six pre-existing coarse routes were deliberately not retrofitted — a behaviour change with no Phase 1 requirement behind it; RBAC-02 governs endpoints added from this point onward.
- [Phase 2]: Decoupled Auth tokens from database reads by extracting `TermRepository` and `BlocklistRepository`.
- [Phase 2]: Added `is_current` to `Term` model and generated migration `17240eb59839` to track the current term.
- [Phase 2]: Introduced dynamic RBAC predicates (`manageable_orgs`, `manageable_activities`) avoiding token bloat.
- [Phase 6]: The event timeline reads BOTH the audit log and the underlying tables, de-duplicated by a per-entity cutoff (the earliest audit row's timestamp) rather than an on/off switch — an event with check-ins on both sides of the TIMELINE-02 backfill gets each half from exactly one source.
- [Phase 6]: The "Expense submitted" audit row was keyed on `expense.id` before the flush, so `entity_id` was always null and the row belonged to nothing. It is now keyed on `activity_id`, which is both the fix and what makes it findable by its two readers.
- [Phase 6]: `advance()`/`bulk_advance()` audit rows stay keyed on the expense id — those are admin-side pipeline moves, not events in the organiser's timeline.
- [Phase 2]: Handled role-based capability switching entirely in the frontend using `SessionProvider` and a UI `ViewSwitcher` without server-side token modification.
- [Phase ?]: [Phase 2] locations=["cookies"] on both cookie endpoints is the authoritative server-side fix for the stale-Authorization-header lockout — the frontend needs no change for correctness (T-02-17, mutation-verified).
- [Phase ?]: [Phase 2] The blocklist loader stays a pure predicate; revocation side effects live in auth_service.refresh behind skip_revocation_check=True, which is what makes reuse detection reachable for 02-03.
- [Phase ?]: [Phase 2] The never-500 guard asserts a status set {200,401,422} rather than exact per-state codes, so 02-03's CSRF and reuse work cannot make it brittle.
- [Phase ?]: [Phase 2] D-12's frontend gate exempts exactly one file (src/pages/Orgs.tsx, the admin POR-assignment surface) via a frozen POR_LITERAL_ALLOWLIST with a companion dead-entry test — mirroring Phase 1's LEGACY_COARSE_ROUTES rather than exempting src/pages by pattern, which would have blinded the gate.
- [Phase ?]: [Phase 2] The POR scan reads sources through vite's import.meta.glob('?raw') instead of node:fs, because frontend/ has no @types/node and the test file is inside the tsc -b program — this keeps the runner at exactly the six approved packages.
- [Phase ?]: [Phase 2] The D-02a grace-window replay mints a NEW refresh token in the same family rather than returning the already-issued successor — same no-logout outcome without the server retaining issued tokens; recorded in auth_service.refresh's docstring.
- [Phase ?]: [Phase 2] revoke_family makes the tombstone jti unique by uuid suffix rather than catching IntegrityError, so a second reuse detection or logout on one family cannot 500 (T-02-19) and the extra rows are a truthful audit trail.
- [Phase ?]: [Phase 2] The blocklist-loader efficiency test uses logout as its positive control, not refresh — refresh runs under 02-01's skip_revocation_check and never reaches the loader (probe-verified: 0 calls).
- [Phase ?]: Session expiry travels as router state { from, expired }, never a query parameter
- [Phase ?]: The expiry callback fires from _doRefresh's shared catch, so queued 401s produce one toast
- [Phase ?]: Account and Capabilities live in types.ts as camelCase, adapted once by adaptMe in api.ts
- [Phase ?]: AUTH-03 POR constants were already correct from Phase 1 — plan 02-04 added proof only, constants.py unchanged
- [Phase ?]: The recognised-POR union lives in auth_service, not the repository: which positions confer authority is a business rule
- [Phase ?]: View state is derived from location.pathname, never React state — the URL is the single source of truth (D-15/D-16)
- [Phase ?]: localStorage['ekatva_view'] is read only by homeFor() to pick a landing route, never to decide what renders
- [Phase ?]: Admin stays a login role, not a view — only the Student/Organiser distinction comes from the URL
- [Phase ?]: AuditLog detail rides as JSON in the existing note column — the shared audit table is not widened for one caller
- [Phase ?]: Academic enum validation lives only in the Marshmallow schemas, sourced from constants; the duplicated service tuples were deleted
- [Phase ?]: 04-02: organisations.website is a distinct nullable column (Alembic f997686e136b), resolving the D-03 vs no-migration conflict as option-a
- [Phase ?]: 04-02: rejection codes split by what the user must fix — social_url_scheme for the link's kind, social_url_host for where it points
- [Phase ?]: 04-02: validate.URL deliberately omitted from SocialLinkSchema.url so url_safety's stronger check produces a placeable 400 rather than a 422
- [Phase ?]: 04-06: api.orgs() now adapts to camelCase Organisation rather than returning raw snake_case, because /admin/orgs renders logos from those same rows and a type without adaptation would be wrong at runtime
- [Phase ?]: 04-06: OrgProfile carries no canEdit — the edit gate stays capabilities.manageableOrgIds, since a second source would be a second, weaker authorization signal
- [Phase ?]: 04-03: UPLOAD_URL_PREFIX/UPLOAD_URL_PATTERN live in constants.py, not in upload_controller.py: the schema is one of three readers and a schema importing a controller inverts the backend's layering
- [Phase ?]: 04-03: The stored-file unlink is guarded by an exact UPLOAD_URL_PATTERN match, not a prefix check, so a client-writable logo_url can never become arbitrary file deletion
- [Phase ?]: 04-03: The 2 MiB size cap is asserted with a multipart body built to exactly MAX_CONTENT_LENGTH, because the cap applies to the request body rather than to the file inside it
- [Phase ?]: 04-04: get_brand_kit() and brand_kit_for() are separate functions because they must disagree about absence: the editor payload returns None so a form never shows a user words they did not write, the Phase 5 seam falls back to a default so the generator needs no absence branch
- [Phase ?]: 04-04: The brand kit palette accepts six-digit hex only, as a stored-XSS control rather than formatting: Phase 5 interpolates those values into a CSS context in generated mail
- [Phase ?]: 04-04: The brand-kit GET is guarded by can_manage_org_required unlike GET /profile, because a brand kit is an internal working document rather than part of an organisation's public identity (P-09)
- [Phase ?]: HOUSE_META stays defined in pages/Orgs.tsx and is exported; OrgLogo is the only component that reads it
- [Phase ?]: The organisation-profile nav entry is derived from manageableOrgIds for any role, because /orgs/:orgId is not an ORGANISER_ROUTE and an organiser-only entry would vanish while on the page
- [Phase ?]: Links and Brand kit are commented mounting points rather than empty rendered cards, so 04-07 ships no visible stub
- [Phase ?]: 04-05: response_schema is passed to google-genai as a plain JSON-Schema dict (verified accepted by 2.18.0), so the planned response_mime_type-only fallback is not in the code and pydantic stays out of a marshmallow project
- [Phase ?]: 04-05: the GEMINI_API_KEY check runs BEFORE the lazy SDK import, so a machine with neither reports the configuration problem the user can act on rather than the packaging one
- [Phase ?]: 04-05: the AI draft is faked in tests by injecting a stub google.genai into sys.modules rather than mock.patch on the real package, because the package is genuinely absent on most machines here and patching would fail before it could patch
- [Phase ?]: resolveRejection is exported as a pure function so where a server rejection lands is unit-tested without a DOM
- [Phase ?]: A 422 keyed by payload row index is mapped through the order actually sent, never the display order
- [Phase ?]: The read view has no prop through which a withheld link could arrive, so the absence rule is structural rather than conditional
- [Phase ?]: The social-links wire keys are links and website; social_links was a 422 that would have failed every save
- [Phase 5]: 05-06: a schedule PATCH writes only the keys the caller supplied, so a reorder posts position alone and a blur-save in flight cannot clobber it (T-05-30)
- [Phase 5]: 05-06: isFirst/isLast/disabled REMOVE row controls rather than disable them — a permanently disabled arrow on row one is a control that never applies
- [Phase 5]: 05-06: the Saving caption unmounts after its fade rather than sitting at opacity-0, so a saved row carries no invisible label for a screen reader
- [Phase 5]: 05-06: ScheduleRow's disabled prop is sourced from manageableActivityIds, not campaign.status — 05-02 landed backend-only, and the server's 409 campaign_live is the real control (T-05-31)
- [Phase 5]: 05-03: USER DECISION (Task 1 checkpoint, option-a) — Phase 5 ships the two-state campaign machine draft → live. CAMPAIGN_PENDING_APPROVAL stays declared-but-unused (the EXPENSE_DRAFT precedent) and is never written to a row; no submit-for-approval endpoint exists. One-way: status values persist, so reversing is a data migration
- [Phase 5]: 05-03: push_live is idempotent by EARLY RETURN before any assignment, not by reassigning equal values — reassignment would look identical in a status assertion while silently moving approved_at forward on every replay (T-05-18)
- [Phase 5]: 05-03: campaign_state gained a server-computed is_meetup_head key, because manageableActivityIds is true for every crew member and cannot express Meetup Head identity; the flag is advisory rendering data and meetup_head_required is the enforcement (T-05-16)
- [Phase 5]: 05-03: the AC-25 negative control asserts the persisted CampaignPackage row after the 403, not only the status code — a refusal that still wrote approved_by would pass a status-only assertion; the admin case is asserted alongside crew to prove there is no admin short-circuit
- [Phase 5]: 05-07: campaign_state gained registration_url from the same _registration_url helper generate_slug uses — the read returned only the slug, which would have forced the browser to assemble the URL and broken D-12 on the first page load
- [Phase 5]: 05-07: campaign_state gained form_field_types from constants.FORM_FIELD_TYPES so the type picker has a server source; a second client-side copy of the allowed set is the drift the no-por-literals gate exists to prevent
- [Phase 5]: 05-07: duplicate_label renders inline under the offending input and does NOT revert the typed value; every other rejection reverts and toasts — a toast cannot say which row collided, and reverting deletes the text the organiser must edit
- [Phase 5]: 05-07: session-only queries (useMyRegistrations, EventChat) are gated on a session — their 401 enters the shared refresh path, is read as expiry, and would have redirected the anonymous visitor off the public page the instant it rendered
- [Phase 5]: 05-07: the anonymous event description reads activity.description, the same column authenticated to_dict(detail=True) uses — routing through Proposal 500'd on every real event since 76ca505, invisible because the test fixture seeds activities without a proposal row
- [Phase 5]: 05-07: a refused clipboard write is reported to the organiser rather than swallowed — an unhandled rejection left them believing they held a link they did not have
- [Phase 5]: 05-04: assert_campaign_live guards the task READ as well as the three writes — a workspace readable before publication is the disclosure T-05-21 names, and a write-only gate would still have passed a status-code assertion
- [Phase 5]: 05-04: TaskPatchSchema subclasses TaskSchema and overrides only `title`, so the create and patch paths cannot drift about which statuses are legal
- [Phase 5]: 05-04: the equal-position tiebreak test inserts B before A at the same position, the order a position-only sort gets wrong — it proves the model backref's three-element order_by tuple rather than any code 05-04 wrote
- [Phase 5]: 05-04: the invalid-status test asserts the persisted row after the 422, not only the status code; a response-only assertion passes even when the bad value was written and echoed back
- [Phase 5]: 05-04: task CRUD writes no AuditLog rows — the audit table records state-changing governance actions, and a card moving between columns is ordinary crew working state that would bury the approval trail
- [Phase ?]: 05-08: the coherent-prefix rule lives in PipelineStepper, not in the caller — the server reports each step's completeness independently, so an organiser who writes the mail before adding a schedule item produces a genuinely incoherent set that a literal render would show as a complete step after a pending one
- [Phase ?]: 05-08: api.pushLive returns the raw response instead of running it through adaptCampaign — the route answers with the campaign row alone, so adapting it would manufacture a campaign state whose completeness is all-false and whose isMeetupHead is false, wrong in exactly the two fields the page renders from
- [Phase ?]: 05-08: the blocked push-live button uses aria-disabled rather than the disabled attribute, so it stays in the tab order and its tooltip stays reachable — a disabled button leaves a keyboard user exactly as uninformed as the hidden button D-07 rejected (T-05-42)
- [Phase 5]: 05-05: TEAM-04's membership check lives in attendance_service, not on the route — organiser_required authorises the caller and cannot see the target user_id, and the route is one of the six frozen LEGACY_COARSE_ROUTES Phase 1 declined to retrofit, so the check has nowhere else to live
- [Phase 5]: 05-05: the crew lookup sits before the first db.session.add, which makes "a refused award writes no ledger row" true by construction; the test asserts the ContributionPoint count, not only the 403
- [Phase 5]: 05-05: AC-36's url_map walk is differential (crew user vs a plain no-POR student, identical statuses everywhere) rather than a flat 403, because GET /orgs/<org_id>/profile is deliberately any-authenticated-reader since 04-04 — the differential is TEAM-03's actual claim and needs no exemption list
- [Phase 5]: 05-05: the PROB-P4 test reassigns the activity to the Meetup Head first, because _seed_activity makes the crew user the organiser and organiser_id is an independent grant in can_manage_activity — without that the deletion would have proven nothing
- [Phase 5]: 05-09: the board's three columns travel on the campaign payload as task_statuses, with the label beside the value — TaskSchema validates against the same tuple, so a browser-side column list could offer an option the server answers 422 to, and "To Do" cannot be derived from "todo" by any rule the client could apply
- [Phase 5]: 05-09: per-column chrome is keyed on the INDEX into the server's declared status order, not on the status value — keying it on the value would have reintroduced the three status strings in the one file the design exists to keep them out of
- [Phase 5]: 05-09: the 403 campaign_not_live gets its own page branch and is never toasted; TEAM-01's whole point is that the board is inert before publication, so reporting it as a failure would tell the organiser something untrue about their own workflow
- [Phase 5]: 05-09: the page fails only when the task query errored AND no data ever arrived — a failed refetch keeps the last good board and surfaces the column-header retry, which is what makes KanbanBoard's isError/onRetry props reachable rather than dead
- [Phase 5]: 05-09: the column landmark is a named <section> wrapping the Card, because Card accepts only children/className/hover/onClick and cannot carry an accessible name — same class of upstream correction as Badge not taking onClick
- [Phase 5]: 05-09: ManageEvent's "Tasks complete" tile was deleted rather than repointed at the real board, which is inert until publication and would have read 0 of 0 on every unpublished event
- [Phase 5]: 05-09: the no-polling gate scans a NAMED three-file list rather than all of src/, and carries a companion test proving each scanned path still exists — a repo-wide scan fails on unrelated code and teaches people to weaken it, and a renamed file would turn the gate into a no-op that passes for free
- [Phase 5]: 05-10: MAX_CONTENT_LENGTH is now POSTER_MAX_BYTES (5 MiB) and the logo's 2 MiB moved into store_logo as an explicit LOGO_MAX_BYTES check — the key is app-wide, so raising it for the poster without moving the logo's bound would have silently widened the logo endpoint (T-05-52)
- [Phase 5]: 05-10: the logo's per-endpoint check measures the file by seeking to the end of the already-spooled stream, never by reading it — a len(file.read()) would buffer the very body the cap exists to keep out of memory; Phase 4's boundary test moved with the control and now builds a body whose FILE part is exactly the limit
- [Phase 5]: 05-10: save_poster imports sniff_image_ext, IMAGE_MAGIC_BYTES and upload_dir from Phase 4's upload_controller and Phase 5 adds no serve route — AC-14 is asserted by reading a Phase 5 poster back through Phase 4's GET /uploads/<filename>, so the test proves the reuse rather than a second copy of send_from_directory and its nosniff header
- [Phase 5]: 05-10: PosterUpload takes a File and lets api.uploadPoster build the FormData, so the component has no opinion about the wire format; the FormData claim is asserted against fetch, where it actually exists
- [Phase 5]: 05-10: the file input's value is cleared in a finally block — without it, re-picking the same file after a failure fires no change event and the retry silently does nothing, which is E8's forbidden outcome reappearing on the recovery path
- [Phase 5]: 05-11: the fact block is concatenated onto the model's output AFTER the call returns, never passed through it — the delimiters and the system instruction are defence in depth, the assembly order is the control, and the injection test lets the attack fully succeed and asserts the real fee survives anyway
- [Phase 5]: 05-11: the facts are appended unconditionally on the degraded path too, which makes an empty mail body structurally impossible rather than something checked for (PROB-P2)
- [Phase 5]: 05-11: generate_mail catches Exception broadly and degrades rather than propagating — unset key, uninstalled SDK, network error, rate limit and an empty completion all answer 200 with a usable draft and `degraded: true`, so the campaign pipeline has no dependency on AI availability
- [Phase 5]: 05-11: `degraded` lives on the mutation result, not on the campaign row — it describes the generation that just happened, and persisting it would make a reload show a stale complaint about a draft the organiser may have since rewritten
- [Phase 5]: 05-11: MailTemplateEditor adopts mailSubject and mailBody from props per field rather than as a pair, so a response populating only one of them cannot blank the other (E5 partial)
- [Phase 5]: 05-11: an AI test asserts the artefact against a model that returned nonsense — a realistic stand-in could contain a plausible number and make the assertion pass for the wrong reason
- [Phase ?]: REIMB-02 submit gate is rbac.is_meetup_head with NO admin fallback — an admin's PROPOSAL-05 power is to reassign the Meetup Head, not to act as one (06-02)
- [Phase ?]: Conditional authority splits across layers: the broad predicate (can_manage_activity) guards the route, the body-dependent one (is_meetup_head, gated on the submit flag) lives in the service — a route guard cannot read the body (06-02)
- [Phase ?]: Endpoints that both save and transition in one call check every gate BEFORE touching a row, so a refused call leaves the working document untouched (06-02)
- [Phase ?]: social_post_url is searched across the six ORG-02 platforms rather than taking a platform parameter; malformed keeps social_url_scheme, well-formed-but-not-social keeps social_url_host (D-09, 06-02)

### Pending Todos

- **No `03-VERIFICATION.md`** — Phase 1 and Phase 2 both have one; Phase 3 does not. Worth writing once manual UAT closes out, for parity with the other phases.
- **No `06-VERIFICATION.md`** — Phase 6 is complete and UAT'd (`06-UAT.md`), but has no verification doc like Phases 1/2/4/5. Worth writing for parity before Phase 07 starts.
- **A replaced poster's old file is left on disk** (05-10). `store_logo` unlinks the previous file after the commit; `save_poster` does not, because `CampaignPackage` has no equivalent of the `UPLOAD_URL_PATTERN` guard that makes the logo's unlink safe against a client-writable value. Effect is one unreferenced file per replacement — a cleanup problem, not a correctness one.
- **No regenerate affordance on `RegistrationLinkCard`** (surfaced by the 05-07 checkpoint, step 7). Once a slug exists the card renders only Copy — 05-07's acceptance criteria only covered the null-URL state, so the checkpoint script assumed a capability the task was never asked to build. The backend rotation is correct and verified at the API layer (second mint invalidates the first, old slug 404s). A future plan should add the button plus the "this breaks every link already shared" confirmation it needs.

### Blockers/Concerns

- ~~**Deployment target unconfirmed**~~ RESOLVED 2026-08-06: no live deploy — `.vercel/project.json` is unused leftover, dropped from scope. Course deliverable graded via code + local run. Phase 8 polling design no longer needs to account for a hosted rate-limiter/blocklist store; Phase 2 session design targets local/dev only.
- ~~**No blob storage anywhere**~~ RESOLVED 2026-08-06: poster/receipt uploads (Phase 5 CAMPAIGN-03) land on local filesystem (`backend/instance/uploads`), served via Flask — no cloud provider, no new dependency.
- ~~**QR library conflict**~~ RESOLVED 2026-08-06: research/ARCHITECTURE.md was stale, not a real conflict — research/STACK.md's live-verified picks (`@yudiel/react-qr-scanner` 2.6.0 scan + `qrcode.react` 4.2.0 render) adopted; ARCHITECTURE.md's QR sections updated to match.
- **Progression gating is unvalidated** — the milestone's only feature with no market analogue. Not fixable by investigation; needs real Regional Coordinators. Keeping mitigation as-is: build now, validate in parallel with Phases 1-6. No action pending.
- ~~**Doc drift**~~ RESOLVED 2026-08-06: git archaeology showed `constants.ACTIVITY_FEE_INR` has been 200 since introduction (never 100 in code history) — ₹200 confirmed correct, docs/UI (README, PROJECT.md, Analytics.tsx, CheckIn.tsx, Landing.tsx) updated to match.
- ~~**Requirement count drift**~~ RESOLVED (already fixed at source): REQUIREMENTS.md already states 52 with a correction note; the "51" only survives elsewhere as historical explanation, not a live error.
- RESOLVED 2026-08-12 — 02-05 executed (commits 531d19a, f684471, d10b3e6). The blocker also misattributed the cause: 02-05 never owned the terms seed. Remaining, and not a code defect: `seed_reference_data()` has not been run against the dev database, so `terms` is empty and the academic banner does not render locally. It is idempotent and non-destructive to run.

## Session Continuity

Last session: 2026-08-23T00:45:56.772Z
Stopped at: Phase 7 UI-SPEC approved
Resume file: .planning/phases/07-progression-gating/07-UI-SPEC.md

Next: manual UAT for Phase 05 (05-VALIDATION.md's manual-only list, including the degraded-banner pass with no API key configured) and Phase 04 (`04-UAT.md`) are still outstanding. Phase 06 has no `06-VERIFICATION.md` yet (Phases 1/2/4/5 all have one) — worth writing for parity before Phase 07 starts. Phase 07 (Progression Gating) is the next phase to plan.
