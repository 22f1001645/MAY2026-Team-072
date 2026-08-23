# Phase 8: Event Announcements, Polls & Queries - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 08-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-23
**Phase:** 08-event-announcements-polls-queries
**Areas discussed:** Channel layout & role separation, Poll design, Q&A (EventQuery) flow, Polling/refresh strategy

---

## Pre-discussion: Codebase Audit

Before gray areas were presented, a code-level audit was run to establish what already exists:

| Layer | Already implemented | Still missing |
|-------|---------------------|---------------|
| DB Schema | `announcements`, `event_polls`, `event_poll_votes`, `event_queries` tables + cursor indexes | Nothing — schema complete |
| Backend: Announcements | POST /events/<id>/broadcast + GET /events/<id>/announcements | Fix auth gate (organiser-only), cursor param |
| Backend: Polls | EventPoll + EventPollVote models only | Full CRUD API: create, list, vote, close, results |
| Backend: Queries | EventQuery model only | Submit, respond, list (org view), list mine (student view) |
| Frontend: Chat | EventChat.tsx (open two-way chat) | Intent clarified by user — keep as-is |
| Frontend: Polls | Nothing | Poll creation UI (organiser) + voting UI (registrant) |
| Frontend: Queries | Nothing | Query submission + Q&A thread views |
| Frontend: Live refresh | None on channel hooks | refetchInterval + jitter + background-tab pause |

---

## Area 1: Channel Layout & Role Separation

**Context provided by user:** "Right now for organiser to student communication is done through push alerts, and for two-way communication there is EventChat."

| Option | Description | Selected |
|--------|-------------|----------|
| Rebuild EventChat as organiser-only broadcast feed | Remove free posting; announcements are team-posted, read-only for registrants. Separate Q&A section below. No free chat at all. | |
| Keep EventChat but hard-gate posting | Show message feed; hide input for non-organisers. Existing attendee messages stay. | |
| Keep EventChat as open two-way chat; add Polls + Q&A on top | EventChat is retained as-is (open chat adds engagement value). CHAT-02 is treated as aspirational. Polls and Q&A are additive new channels. | ✓ |

**User's choice:** Keep EventChat as open two-way chat — CHAT-02 aspirational; open chat adds engagement value. Add Polls and Queries on top of this as extra channels.

**Notes:** User explicitly clarified the existing design intent: push alerts are the one-way organiser broadcast channel; EventChat is the two-way community discussion channel. These are two separate flows that already exist and both should be kept. Phase 8 adds Polls and structured Q&A (EventQuery) as additional sub-features on top.

---

## Area 2: Polls + Q&A Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Single page with 3 tabs: Announcements, Chat, Q&A | Restructures EventDetail into a tabbed layout | |
| EventChat stays; Polls + Queries appear as collapsible section below the chat | Additive — no restructure of existing EventDetail layout | ✓ |
| Separate /events/:id/channel route | Dedicated channel page with tabs for Chat, Announcements, Polls, Q&A | |

**User's choice:** EventChat stays where it is on EventDetail; Polls + Queries appear as a new collapsible section below the chat.

**Notes:** User preferred the least-disruptive option — don't move existing components, just add the new section below.

---

## Area 3: Poll Design — Who Can Create

| Option | Description | Selected |
|--------|-------------|----------|
| Only team members (canManage = true) can create polls | Consistent with CHAT-01 organiser-broadcast design | ✓ |
| Any registered attendee can suggest a poll; organiser approves before it goes live | Two-step moderation flow | |
| Both organisers and attendees can create polls | Open poll creation | |

**User's choice:** Only team members (canManage = true) can create polls.

**Notes:** Accepted recommended option without hesitation. Consistent with the push-alerts-as-organiser-broadcast pattern already in place.

---

## Area 4: Q&A (EventQuery) Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Registrant submits question; visible to entire team in ManageEvent; any team member responds once; registrant sees response under their question | Distributed team response, Swiggy-support-ticket model | ✓ |
| Registrant submits question; only Meetup Head can respond | Single-submitter pattern (matches REIMB/FEEDBACK) | |
| Registrant submits question; Q&A thread is public — all registrants see all questions and answers | Public FAQ model | |

**User's choice:** Registrant submits a question (text only). It is visible to the entire team in ManageEvent. Any team member can respond once. Registrant sees response under their question.

**Notes:** Accepted recommended option. Team-wide visibility and response keeps it practical for real events where not all team members monitor the same channel.

---

## Area 5: Live Refresh / Polling Strategy (CHAT-04)

| Option | Description | Selected |
|--------|-------------|----------|
| TanStack Query refetchInterval with 15s +/- 3s jitter; refetchIntervalInBackground: false | Recommended — cursor-index-friendly, backgrounded tabs stop polling | ✓ |
| Simple 15s setInterval in useEffect (no jitter, no background-tab handling) | Simple but thundering-herd risk on multiple open tabs | |
| Manual refresh only — user clicks a refresh button | No automatic polling | |

**User's choice:** TanStack Query refetchInterval with 15s ± 3s jitter. refetchIntervalInBackground: false so backgrounded tabs stop polling.

**Notes:** Accepted recommended option. The existing cursor indexes (ix_announcement_cursor, ix_event_query_cursor) are noted as future optimization targets — full-list refetch is sufficient for meetup-scale data volumes.

---

## Claude's Discretion

None — user made explicit choices for all five decision points.

---

## Deferred Ideas

- **Cursor-based polling (`?after=<ts>`)** — DB indexes exist but full-list refetch is sufficient for now. Future optimization.
- **Rate limiting on query submissions** — ROADMAP.md resolves this as out-of-scope (no live deployment target). Remain deferred.
- **Registration-window server-side gate (CHAT-03)** — Server rejects posting after registration window closes. Not discussed explicitly; deferred to plan phase or follow-up.
- **Audit-log writes for moderation actions** — AuditLog infrastructure exists; no channel audit writes yet. Deferred.
