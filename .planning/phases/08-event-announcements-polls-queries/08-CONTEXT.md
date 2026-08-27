# Phase 8: Event Announcements, Polls & Queries - Context

**Gathered:** 2026-08-23
**Status:** Ready for planning

<domain>
## Phase Boundary

One official, moderated event channel with three distinct sub-features layered onto an event's registration window:
1. **Push Alerts** - one-way organiser to registrant broadcast (already working; backend POST /broadcast + frontend push alerts panel)
2. **Polls** - organiser-created, registrant-voted; once each per poll (EventPoll + EventPollVote models, no API yet)
3. **Q&A (EventQuery)** - registrant submits a named question to the team; any team member responds once; registrant sees answer under their question (EventQuery model, no API yet)

The existing **EventChat** (open two-way free chat between organisers and registrants) is **retained as-is** - it is not removed or restricted. The CHAT-02 "no open chat" requirement is treated as aspirational; the open chat adds engagement value and the team has decided not to remove it. Polls and Q&A are additive capabilities on top of this existing design.

</domain>

<decisions>
## Implementation Decisions

### Channel Layout & Role Separation
- **D-01:** EventChat (free two-way chat) stays where it is on the EventDetail page. No restructuring of the existing chat component. — Reversibility: reversible
- **D-02:** Polls and Q&A appear as a new collapsible section **below** the EventChat component on EventDetail. Not a separate route, not new tabs above the chat. — Reversibility: reversible
- **D-03:** Push Alerts (announcements with title) remain a separate concept from chat messages (announcements without title) - the existing dual-mode Announcement model is kept.

### Poll Design
- **D-04:** Only team members (canManage = true) can create polls. Registrants cannot create polls - this is consistent with CHAT-01 organiser-broadcast design. — Reversibility: reversible
- **D-05:** Each registrant can vote exactly once per poll - enforced by the existing uq_poll_vote DB unique constraint on (poll_id, user_id) - no service-layer duplication needed. — Reversibility: one-way — uq_poll_vote is a DB constraint; relaxing it requires a migration.
- **D-06:** Poll lifecycle: open -> closed. Organiser can close a poll manually. No auto-close by closes_at is required at this stage (the column exists but closing is organiser-triggered).
- **D-07:** Poll results (vote counts per option) are visible to all registrants once they vote (or immediately for organisers).

### Q&A (EventQuery) Flow
- **D-08:** Any registered attendee (gated by can_participate_in_activity) can submit a text-only query. — Reversibility: reversible
- **D-09:** All team members (gated by can_manage_activity) can see all queries in ManageEvent and respond. Any one team member can respond - not Meetup-Head-exclusive. — Reversibility: reversible
- **D-10:** Only one team response per query (response_body / responded_by / responded_at - already on the EventQuery model). No back-and-forth thread.
- **D-11:** The registrant sees their query + team response only (not other registrants queries). Organiser sees all queries.
- **D-12:** Query status transitions: open -> answered when team posts a response. QUERY_OPEN / QUERY_ANSWERED constants already exist in constants.py.

### Live Refresh / Polling Strategy (CHAT-04)
- **D-13:** TanStack Query refetchInterval set to 15000 + Math.random() * 6000 - 3000 (15s +/- 3s jitter) for announcements, polls, and Q&A queries. — Reversibility: reversible
- **D-14:** refetchIntervalInBackground: false on all channel queries - backgrounded tabs stop polling. — Reversibility: reversible
- **D-15:** No cursor-based ?after=<ts> parameter needed for this phase - full-list refetch is acceptable given the data volumes (meetup scale). The cursor indexes (ix_announcement_cursor, ix_event_query_cursor) already exist in the DB for a future optimization.

### Pre-Execution Review Additions (added before any 08-0X plan ran)

- **D-16:** `create_poll`/`close_poll` (08-01) and `respond_query` (08-02) each write an `AuditRepository.record()` entry — closes the CHAT-03 "audit-log entry ships in the same phase" gap; this was never one of the 5 areas put to the user during discuss-phase, only found on plan-vs-requirement review. `cast_vote`/`submit_query` stay unlogged (routine attendee activity, not a moderation action, matches the existing convention e.g. task CRUD). — Reversibility: reversible
- **D-17:** `create_poll` is gated by `_assert_channel_open` (EVENT_LIVE only), matching CHAT-01's "scoped to the registration window." `close_poll` and `respond_query` stay ungated so the team can wrap up a poll or answer a lingering question after the event ends. — Reversibility: reversible
- **D-18:** Plan 08-04 (`EventChannelSection`, imports `QuerySection` from 08-05) moved from Wave 3 to Wave 4, after 08-05. The two plans shared a real code dependency (an import) with no overlapping `files_modified` entries, so the orchestrator's intra-wave overlap check would not have caught them running in parallel. 08-06 moved from Wave 4 to Wave 5 accordingly. — Reversibility: reversible

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- .planning/REQUIREMENTS.md CHAT-01 through CHAT-04 - Full channel requirements (note: D-01 documents intentional deviation from CHAT-02 open-chat restriction)
- .planning/ROADMAP.md Phase 8 - Success criteria and dependency chain (depends on Phase 1 + Phase 5)

### Existing Code - Backend
- backend/app/models/__init__.py - Announcement (L395), EventPoll (L1053), EventPollVote (L1084), EventQuery (L1113) models - all tables exist, no new schema needed
- backend/app/constants.py - POLL_OPEN, POLL_CLOSED, POLL_STATES (L332), QUERY_OPEN, QUERY_ANSWERED, QUERY_STATES (L338)
- backend/app/controllers/registration_controller.py - POST /events/<id>/broadcast (L56) + GET /events/<id>/announcements (L85) - already working
- backend/app/services/registration_service.py - broadcast() (L131) and announcements() (L177) - already working
- backend/app/rbac.py - can_manage_activity_required, can_participate_in_activity - use these for poll/query auth gates

### Existing Code - Frontend
- frontend/src/components/EventChat.tsx - existing free two-way chat component; do not modify this file (D-01)
- frontend/src/lib/queries.ts - useAnnouncements (L276), usePostAnnouncement (L279) - existing hooks; add poll and query hooks alongside
- frontend/src/lib/api.ts - announcements (L623), postAnnouncement (L624) - existing API calls; extend the same api object
- frontend/src/lib/types.ts - AnnouncementMessage (L221) - add EventPoll, EventPollVote, EventQuery interfaces here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- EventChat.tsx - Kept as-is. Polls/Q&A section is a sibling component below it on EventDetail.
- useAnnouncements / usePostAnnouncement - Pattern to copy exactly for usePolls, useCreatePoll, useCastVote, useMyQueries, useSubmitQuery, useOrgQueries, useRespondQuery.
- BroadcastSchema in schemas/__init__.py - Reference for creating PollSchema, QuerySchema, QueryResponseSchema using the same Marshmallow pattern.
- can_manage_activity_required decorator - Use for poll create/close and query respond endpoints.
- auth_required decorator - Use for poll vote and query submit endpoints.
- can_participate_in_activity predicate - Gate poll vote and query submit after auth_required; check RegistrationRepository.find(activity_id, user.id) inside service.

### Established Patterns
- Blueprint pattern: New endpoints go into registration_controller.py or a new channel_controller.py blueprint.
- Service layer: Logic goes in a new channel_service.py or extend registration_service.py - controllers stay thin.
- Marshmallow schemas: All request bodies validated via schemas in backend/app/schemas/__init__.py.
- to_dict() on models: EventPoll.to_dict() and EventQuery.to_dict() already exist - extend with vote counts for polls.

### Integration Points
- EventDetail.tsx - Add the new Polls + Q&A collapsible section component below EventChat.
- ManageEvent.tsx - Add a Q&A management panel (list all queries, respond form) in the organiser view. Poll creation UI also lives here.
- refetchInterval - Add to usePolls, useMyQueries, useOrgQueries hooks (15s +/- 3s jitter, refetchIntervalInBackground: false). The existing useAnnouncements hook should also get this treatment.

</code_context>

<specifics>
## Specific Ideas

- The Polls + Q&A section on EventDetail should be collapsible - so EventChat users who do not need it are not cluttered.
- Polls show live vote counts / percentages after the registrant casts their vote.
- Organiser Q&A view in ManageEvent should show query count badge (unanswered queries count) so the team knows when they have pending responses.

</specifics>

<deferred>
## Deferred Ideas

- Cursor-based polling (?after=<ts>) - The DB indexes are in place (ix_announcement_cursor, ix_event_query_cursor). Implementing cursor params is deferred to a future optimization phase; full-list refetch is sufficient for meetup-scale data.
- Rate limiting on query submissions (CHAT-03) - ROADMAP.md notes this was resolved as out-of-scope since there is no live deployment target. Rate limiting remains deferred.

Registration-window gating and audit-log writes are NO LONGER deferred — see D-16/D-17 below (added during pre-execution review).

</deferred>

---

*Phase: 8-Event Announcements, Polls and Queries*
*Context gathered: 2026-08-23*
