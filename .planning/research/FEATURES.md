# Feature Research

**Domain:** Community / event-management platform (organiser-dashboard feature set), campus-org variant
**Researched:** 2026-08-02
**Confidence:** MEDIUM-HIGH (HIGH on QR check-in and org profiles from official docs; LOW-MEDIUM on progression-gating, where no direct analogue exists in event platforms)

## Reference Products Analysed

| Product | Why comparable |
|---------|----------------|
| **Luma** | Closest modern analogue to Ekatva's event lifecycle. Official help docs give exact check-in, guest-list, and host-role mechanics. |
| **Eventbrite** | Largest incumbent. Official help centre documents organiser profile + social links + Follow; publishes QR adoption stats. |
| **CampusGroups (Ready Education)** | Direct domain match: student-org management, approvals, event calendars, attendance, surveys, budgets. |
| **Slido / Whova** | The reference implementation for event-scoped polls and *moderated* Q&A. |
| **Skool / Circle / BuddyBoss** | Reference for tier/level progression and unlock mechanics (community gamification, not events). |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **QR check-in with per-registration code** | QR is the most-used event technology by organisers (41% per Eventbrite's 2024 organiser report, ahead of Wi-Fi). Every comparable product issues a QR at registration. A 2026 platform without it reads as dated. | **MEDIUM** | Luma's shipped model: QR issued automatically at registration, delivered via confirmation email + signed-in event page + wallet pass. Scanning uses a *dedicated authenticated scanner surface*, not a generic camera app. |
| **Manual roster fallback alongside QR** | Dead phone, no signal, guest can't find the email. Luma keeps name-search manual check-in permanently; so does Whova. | **LOW** (already built) | PROJECT.md says QR is "replacing the current tap-based roster check-in". **Recommend reframing to "QR primary, roster manual fallback"** - no comparable product removes the manual path. Removing it creates a hard failure at the door. |
| **Restricted check-in-staff permission** | Luma ships a role that can scan + view guest list but cannot edit the event or message guests. Handing a volunteer full organiser rights to run a door is a real permission leak. | **LOW-MEDIUM** | Maps cleanly onto Ekatva's P3 (permissions follow PORs). Needs a narrow scope, not a full POR. |
| **Dual-role access without being locked out** | No comparable product locks a user into one of host/attendee. Luma uses one account with contextual "Manage" surfaces; Eventbrite uses one identity across the consumer site and organiser portal. | **LOW-MEDIUM** | The current hard-lock is closer to a defect than a missing feature. Server-side RBAC is already POR-derived, so this is mostly nav/IA state plus a persisted preference. |
| **Organisation profile page with bio, logo, social links** | Eventbrite's organiser profile explicitly supports photo, bio, and links to website/social channels, and is the canonical share target. Luma's calendar page is the equivalent. | **LOW** | Ekatva's `HOUSE_META` is a Houses-only precedent; generalising to all four org types is the right call and is already a logged decision. |
| **Shareable public registration link + link preview card** | Every platform gives one link you paste anywhere. This is the primary growth surface. | **LOW** | **Do not bundle this under "AI campaign creator"** - it needs no AI. It is a public route + OG/meta tags + a short link. Separating it de-risks the AI work. |
| **Attendee post-event feedback prompt** | Luma, Eventbrite, Whova, CampusGroups all ship post-event surveys. Attendees expect to be asked. | **LOW** | Response-rate benchmarks: 10-20% typical for conferences, 12-15% for trade shows, 20-30% achievable with good design and timing. Send within a week; reminders at 3-5 day intervals lift response. **Design implication: 1-3 questions, in-app, immediately post-check-in.** |
| **Event-team roles / collaborators on an event** | Luma ships Hosts, Managers, and Check-in staff per event. Eventbrite has team members. Running an event alone is not the normal case. | **MEDIUM** | Role assignment is table stakes. Task-with-deadline (below) is the differentiator layered on top. |
| **Public follow / subscribe to an org's future events** | Eventbrite: "people can follow your organiser profile to be notified when you publish events". Luma: calendar subscribe. | **LOW-MEDIUM** | Ekatva already has broadcasts + per-user notifications, so the delivery rail exists. Cheap win attached to the org profile. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable, and aligned to Ekatva's stated principles.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Activity-scoped task assignment with owner + deadline + status** | I could not confirm task-with-deadline assignment as a shipped feature in Luma or Eventbrite; both stop at *role* assignment and punt task tracking to Notion/Trello/Asana. CampusGroups markets "workflows and forms" but I could not verify per-event task assignment. **Treat as MEDIUM-confidence negative claim.** If it holds, this is a genuine gap in the category, and it is exactly the "invisible operations" (P5) and "every contribution visible" (P6) promise. | **MEDIUM** | Persisting the currently-mocked array is the single highest-leverage item in this milestone: it converts a demo into a product. Reuses the existing notification rail for deadline nudges. |
| **Organiser reflection / debrief captured in-product** | Debriefing the organising team within 48 hours is a documented best practice ("surfaces operational problems no attendee survey will catch"), but it is almost universally run *outside* the event platform, in a separate survey tool. Capturing it against the event record is the direct implementation of P4 (knowledge must survive leadership). | **LOW-MEDIUM** | Feeds the existing report flow. This is the feature that makes Ekatva an institutional memory rather than a booking tool. Highest strategic value per unit of effort in this milestone. |
| **Event-scoped polls during the registration window** | Slido built a business on exactly this. Polls have a high engagement return and near-zero moderation burden, because the organiser authors the options and attendees only select. | **LOW-MEDIUM** | Strongly recommend shipping **polls before chat**. Same engagement narrative, a fraction of the risk. |
| **AI-assisted mail template generation** | Removes the blank-page problem for a Regional Coordinator drafting an invite. Directly serves P2 (friction removal). | **MEDIUM** | Must be **draft-first, human-edits-before-send**. Interpolate known DB fields (date, venue, fee, capacity) as literal values; let the model write only the prose around them. |
| **AI / template poster generation** | Luma Labs ships AI poster generation with structured layouts and multi-aspect-ratio regeneration; Eventbrite curates AI tools for organisers. Visible, demo-friendly. | **HIGH** | Highest cost and lowest certainty in the set. See anti-features: generated *images containing text* routinely render wrong dates and garbled titles. **Recommend v1 = deterministic template composition (event data rendered into designed layouts), with AI limited to background/decorative imagery or dropped entirely.** |
| **Progression-gating: org unlocks fest-scale proposals after meetup milestones** | No direct analogue found in any event platform. Nearest patterns are community level-gating (Skool/Circle admins unlock content at levels; "level-specific perks include the right to host community sessions") and marketplace trust tiers (Superhost-style). In a 40k-student civic layer this is a genuinely novel governance mechanic and a real safeguard against an untested org committing to a fest. | **MEDIUM** | This is an **eligibility rule engine, not gamification.** See dependency notes: it is downstream of both check-in and post-event reporting, so it must be sequenced last. |
| **Moderated event thread scoped to registrants + registration window** | Slido's actual model is *moderated Q&A*: "organisers review all incoming questions before their audience can see them". A time-boxed, registrant-only, moderated thread is meaningfully safer than a chat room and still delivers the pre-event coordination value. | **MEDIUM-HIGH** | Highest moderation burden of anything here. Only ship with the full control set listed in dependency notes. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Open free-form live chat room per event** | "Slack/WhatsApp but in the product." Feels like the obvious version of the requirement. | Highest-risk feature in the set. Unmoderated chat becomes a vector for spam, harassment, and abuse; universities carry explicit anti-harassment and reporting obligations, and a student-run 40k-person platform inherits that exposure. Also forces a WebSocket/real-time infrastructure decision onto a Flask stack that has no such requirement elsewhere. | Announcement-style organiser posts + attendee replies (comment thread), polled on an interval rather than pushed. Registrant-only, auto-closed at event end. Full moderation control set from day one. |
| **A third login role for "organiser"** | Looks like the natural way to model a dashboard switcher. | Breaks P3 (permissions follow PORs, never logins) and duplicates authorisation logic in two places. Also breaks the moment one person holds a POR in two orgs. Already correctly rejected in PROJECT.md. | Two login roles; the switcher is a *view-mode preference*, not an identity. Server-side authorisation continues to derive from POR only and must ignore the client's declared mode entirely. |
| **Tagging someone as an event collaborator implicitly grants them organiser permissions** | Feels convenient: "if I gave them a task, they should be able to help." | Creates a permission backdoor around the POR model. Any org member could be silently escalated to workspace access by any other organiser. | Collaborator assignment grants **zero** permissions by default. A separate, explicit, POR-holder-only action grants scoped workspace access (mirroring Luma's narrow check-in-staff role). |
| **Auto-sending AI-generated mail** | "The AI wrote it, just send it." | AI marketing copy defaults to generic, statistically-average language that erodes voice, and hallucinates facts (fabricated statistics, wrong attributions). An auto-sent broadcast to a city cohort is unrecallable and institutionally embarrassing. | Generate a draft into the existing broadcast composer. Human edit + explicit send is mandatory. Never auto-send. |
| **Letting the model generate factual event details (date, venue, fee)** | Simpler prompt: "write an invite for this event." | This is where hallucination actually bites - the poster says the wrong date and 200 people show up on Saturday. | Template-interpolate all facts from the DB as literal strings. The model only writes surrounding prose. For posters, render text deterministically over imagery rather than asking an image model to draw text. |
| **Public per-organiser star ratings / a "best organiser" ranking** | Natural extension of attendee feedback; feels motivating. | Creates ranking dynamics between volunteer student leaders, chills honest feedback, is trivially gameable by inviting friends, and turns a learning signal into a reputational one. Also outside PROJECT.md's own Vision-Horizon exclusion of leadership scores. | Aggregate scores visible to the owning org and admin only. Individual responses anonymised. Feed the report, not a leaderboard. |
| **Points-based levels as the progression gate** | The points ledger already exists, so reusing it as the unlock currency looks free. | Double-counts an existing mechanic and makes the gate gameable by attendance-farming rather than by demonstrated organising capability. Conflates individual recognition with organisational eligibility. | Gate on **verifiable org-level completions**: N activities that reached completed state (attendance recorded + report submitted). Tier attaches to the Organisation, never to a person. |
| **Tier decay / demotion** | Symmetry: "if you stop organising, you should drop a tier." | Punishes the exact turnover the platform is meant to survive (P8: design for turnover). A new committee inheriting an org would find its earned capability revoked. | Tiers are monotonic and org-owned. Admin can revoke manually in genuine misuse cases, with an audit entry. |
| **Hiding locked capabilities entirely** | Cleaner UI: don't show what they can't use. | Produces the worst support experience in the product: "why can't I propose a fest?" with no answer. Opaque gates read as arbitrary authority, which is corrosive in a student-governance context. | Always render the locked action with explicit progress: "Fest proposals unlock at 3 completed meetups. You have 2." Plus an admin override path. |
| **Rich page builder / custom HTML or CSS on org profiles** | "Let each society express its identity." | XSS surface, unbounded maintenance, and inconsistent quality across ~hundreds of orgs. | Fixed layout + a constrained, validated set of typed social links (Instagram, LinkedIn, YouTube, Discord, website). Validate scheme and host allowlist server-side to prevent phishing and open-redirect abuse. |
| **DMs / general group messaging** | "We already have everyone here, why use WhatsApp?" | Already an explicit PRD exclusion. Turns the platform into a messaging product with all the attendant moderation, retention, and safety obligations, and competes with entrenched tools it cannot displace. | Keep messaging strictly event-scoped and time-boxed. Broadcasts remain the one-to-many rail. |
| **Full Kanban / Gantt / subtasks / dependencies on event tasks** | Task assignment naturally invites project-management scope creep. | The user is a volunteer student coordinating five people on one meetup, not a PM. Every added axis reduces the chance the task list is filled in at all. | Flat list: title, assignee, due date, three-state status. Nothing else. |

---

## Feature Dependencies

```
[Dashboard switcher]                          <- FOUNDATION: the organiser IA everything else lands in
    ├──hosts──> [Team & task view]
    ├──hosts──> [Budget / report tracking]
    └──hosts──> [Campaign creator entry point]

[Registration (exists)]
    └──requires NEW unguessable per-registration token──> [QR check-in]
                                                              │
[QR check-in] ──writes──> [Attendance record (exists)]
                              ├──feeds──> [Points ledger + leaderboard (exists)]
                              ├──feeds──> [Fee-utilisation analytics (exists)]
                              └──gates──> [Attendee post-event feedback]

[Organiser reflection] ──feeds──> [Report flow (exists)]
                                       │
[Attendance recorded] + [Report submitted] ==> [Activity = COMPLETED]
                                                     │
                                                     └──counts toward──> [Progression gating]

[Proposal approval (exists)] ──unlocks──> [AI campaign creator]
[Published event (exists)]   ──produces──> [Registration link] ──> [Shareable card / OG image]

[Registration list (exists)] ──scopes audience of──> [Event thread + polls]
[Event thread] ──REQUIRES──> [Moderation control set]

[Org profile + social links] ──enhances──> [Registration link sharing]  (org page = the share destination)

[Progression gating] ──CONFLICTS with──> [Points ledger as gate currency]
[Dashboard switcher] ──CONFLICTS with──> [A third login role]
[Event thread]       ──CONFLICTS with──> [PRD exclusion: general messaging]  (contain via time-box + registrant scope)
```

### Dependency Notes

- **QR check-in requires a unique, unguessable registration token.** Answering the question directly: yes, and this is a **schema change**, not a UI change. The QR must encode an opaque high-entropy token scoped to one registration, not the registration ID and not the user ID. An incrementable integer means anyone can forge a check-in. Given the "no Alembic yet" constraint, this change means editing models and rerunning the destructive `seed.py` - flag before the phase that touches it.

- **QR check-in must write the same Attendance record as the existing tap flow.** Points, leaderboard, and fee-utilisation analytics are all computed over attendance. Treat QR as a **new input method into the existing attendance service**, not a parallel attendance model, or every downstream analytic forks.

- **Duplicate check-in must be detected and surfaced, not silently accepted.** Luma's official docs describe invalid tickets rendering as "Not Valid" in red but do not document duplicate handling. Treat this as an unmet design requirement: a second scan should show "already checked in at HH:MM" rather than succeeding again. Silent double-accept corrupts headcount and therefore fee utilisation.

- **Attendee feedback should be gated on attendance.** Only checked-in students get the prompt. This raises signal quality and makes the response-rate benchmark meaningful. It creates a hard ordering dependency: check-in must ship before, or with, attendee feedback.

- **Progression gating is downstream of both check-in and post-event reporting.** "Completed meetup" can only be computed once attendance is recorded and a report exists. Progression gating therefore cannot be built before items 4 and 8 land. **This is the strongest sequencing constraint in the milestone.** Sequence it last.

- **Organiser reflection as a report gate: nudge, do not hard-block reimbursement.** Blocking a report on a reflective form is a useful forcing function; blocking *reimbursement* on it converts a reflection prompt into a financial hostage and will produce one-word answers or resentment. Gate report *submission* at most; never gate money-adjacent status.

- **Event thread requires a moderation control set before it can ship at all.** Non-negotiable minimum, derived from the moderation research and from university anti-harassment/reporting obligations: (1) report/flag on every message, routed to the org Secretary and to admin; (2) hide/delete by organiser and admin; (3) mute or remove a participant from that thread; (4) rate limiting; (5) an audit-log entry for every moderation action, reusing the existing immutable audit-trail pattern; (6) auto-close and archive at event end, which is a moderation control as much as a UX choice. Slido's own answer here is pre-publication review by the organiser.

- **Event thread should not force a real-time infrastructure decision.** Tens of registrants coordinating before a meetup do not need WebSockets. Interval polling is adequate and keeps the Flask stack unchanged, which matters under the "no new frameworks" constraint.

- **Dashboard switcher must not be trusted server-side.** The selected mode is a client-side view preference. Authorisation continues to derive from POR, deny-by-default, ignoring any mode the client declares. If the server ever branches on the switcher value, P3 is broken.

- **Campaign creator must degrade gracefully.** An AI provider outage, rate limit, or cost ceiling must never block publishing, broadcasting, or registration-link generation. Structure it as an optional draft-assist layered over paths that already work without it.

- **Registration-link generation does not depend on AI.** Decoupling it from the campaign creator lets the highest-value, lowest-cost third of item 5 ship independently of the riskiest third.

- **Org profile social links need server-side URL validation.** Scheme restriction plus a host allowlist. Otherwise the profile becomes a phishing and open-redirect surface pointed at 40,000 students.

- **Collaborator tagging must be permission-neutral.** See anti-features. Assignment and authorisation are separate actions.

---

## MVP Definition

### Launch With (v1 of this milestone)

- [ ] **Dashboard switcher** - foundation; every other organiser surface needs somewhere to live, and today's hard-lock is closer to a defect than a gap
- [ ] **Persisted activity-scoped team + tasks** (assignee, due date, 3-state status) - converts the existing mock into the product; highest leverage single item
- [ ] **Org profile + validated social links, all four org types** - table stakes, low cost, generalises the `HOUSE_META` special case
- [ ] **QR check-in** with per-registration token, dedicated authenticated scanner, duplicate detection, and **retained manual roster fallback** - table stakes, and unblocks two downstream features
- [ ] **Attendee rating prompt (1-3 questions, gated on attendance)** - table stakes, low cost, and the input to progression-gating's completion definition
- [ ] **Organiser reflection form feeding the existing report flow** - the strategic differentiator, and cheap

### Add After Validation (v1.x)

- [ ] **Event polls** - trigger: v1 shipped and stable. Delivers the engagement story at a fraction of chat's risk
- [ ] **Registration-link generation + shareable card** - trigger: can ship any time; deliberately decoupled from AI
- [ ] **AI mail-template generation (draft-only)** - trigger: broadcast composer is stable and a cost ceiling + graceful-degradation path exists
- [ ] **Budget/report tracking surfaced in the redesigned dashboard** - trigger: team/task view exists to surface it against
- [ ] **Follow-an-org notifications** - trigger: org profiles live

### Future Consideration (v2+)

- [ ] **Moderated event thread** - defer: requires the full moderation control set, carries the highest institutional risk, and delivers less engagement value per unit of effort than polls
- [ ] **Poster generation** - defer: highest cost, highest hallucination risk, and a deterministic template renderer captures most of the value. Consider upload-only for v1
- [ ] **Progression-gating** - defer: hard-blocked on completed-event data that only exists once check-in and reporting have run for a term. Building the gate before the data exists means gating on nothing

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Dashboard switcher | HIGH | LOW-MEDIUM | **P1** |
| Persisted team + tasks | HIGH | MEDIUM | **P1** |
| QR check-in (token + scanner + manual fallback) | HIGH | MEDIUM | **P1** |
| Org profile + social links | MEDIUM-HIGH | LOW | **P1** |
| Attendee rating (attendance-gated) | MEDIUM | LOW | **P1** |
| Organiser reflection | HIGH (institutional) | LOW-MEDIUM | **P1** |
| Registration link + shareable card | MEDIUM-HIGH | LOW | **P2** |
| Event polls | MEDIUM | LOW-MEDIUM | **P2** |
| Budget/report in dashboard | MEDIUM | LOW-MEDIUM | **P2** |
| AI mail-template draft | MEDIUM | MEDIUM | **P2** |
| Follow-an-org | LOW-MEDIUM | LOW-MEDIUM | **P2** |
| Moderated event thread | MEDIUM | MEDIUM-HIGH | **P3** |
| Progression-gating | MEDIUM | MEDIUM (+ blocked on data) | **P3** |
| Poster generation | LOW-MEDIUM (demo value HIGH) | HIGH | **P3** |

**Priority key:** P1 must have for this milestone · P2 should have, add when possible · P3 defer

---

## Competitor Feature Analysis

| Feature | Luma | Eventbrite | CampusGroups | Slido/Whova | Our Approach |
|---------|------|------------|--------------|-------------|--------------|
| **Role switching** | One account, contextual "Manage" surfaces per event | One identity across consumer site + organiser portal | Student leaders see group admin surfaces contextually | n/a | **Explicit persisted mode toggle.** Ekatva's organiser IA is genuinely a different information architecture (proposals, budgets, reports), so an explicit mode beats contextual surfacing. Client-side only; server ignores it |
| **Event team** | Hosts / Managers / Check-in staff, with scoped permissions | Team members | Officer roles, workflows | Whova adds volunteers for check-in scanning | **Roles + tasks.** Match Luma's scoped roles, then add the assignee/deadline/status layer the category appears to lack |
| **Task + deadline** | Not found | Not found | Unconfirmed | n/a | **Ship it.** Flat list only, no Kanban/Gantt |
| **Org profile** | Calendar page, subscribable | Organiser profile: photo, bio, website + social links, Follow button | Group pages | n/a | Eventbrite's model, generalised across house/society/region/council, with server-side URL validation |
| **QR check-in** | QR at registration; email + event page + wallet pass; dedicated scanner; Standard vs Express mode; invalid shows red "Not Valid"; manual name search always available; restricted check-in-staff role; wallet pass works offline | Auto-generated unique QR on registration completion; 41% organiser adoption, most-used event tech | Live attendance data collected automatically | Whova: volunteers scan by QR or name | **Copy Luma's model closely.** Add explicit duplicate detection (Luma does not document it). Keep manual fallback rather than replacing it |
| **Post-event feedback** | Post-event feedback surveys | Survey tooling | Surveys | Whova: event surveys + feedback forms | **Dual-sided.** Short attendance-gated attendee rating (targeting the 20-30% band, not the 10-20% default) + organiser reflection that no competitor captures in-product |
| **Chat / polls** | Guest chat | Limited | Limited | Slido: 5 poll types, Q&A, quizzes; organiser pre-publication review; assistant moderators. Whova: live polls | **Polls first.** Thread deferred, and modelled on Slido's *moderated* Q&A, not on open chat |
| **AI generation** | Luma Labs AI poster generation, structured layouts, multi-aspect-ratio | Curated AI tools for organisers | Not found | n/a | **Mail drafts first (text), posters later.** Deterministic template composition preferred over generative image text |
| **Progression tiers** | None | None | None found | Skool/Circle: levels unlock content and hosting privileges | **Novel in this category.** Frame as an org-owned eligibility rule engine with visible progress and admin override, not gamification |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| QR check-in mechanics | **HIGH** | Luma official help centre (check-in + external check-in integration), Eventbrite official organiser docs and 2024 statistics report |
| Org profile + social links | **HIGH** | Eventbrite official help centre article on organiser profile setup |
| Post-event feedback norms + response rates | **MEDIUM** | Multiple industry sources agreeing (Explori benchmarks, RainFocus, ASAE, Swapcard); no single authoritative source |
| Polls / moderated Q&A patterns | **MEDIUM** | Slido official product and conference pages; Whova blog |
| Event-team roles | **MEDIUM-HIGH** | Luma official docs describe the scoped check-in-staff role explicitly |
| Absence of task+deadline in the category | **MEDIUM** | Negative claim. Searched Luma, Eventbrite, CampusGroups, Whova, Bizzabo, Sched; found role assignment everywhere, task/deadline nowhere. "Did not find" is not "does not exist" - worth one confirmation pass before treating the gap as strategy |
| AI campaign tooling | **MEDIUM** | Luma Labs use-case page is marketing collateral; Eventbrite blog is first-party but promotional. Hallucination/brand-drift risks corroborated across several independent 2026 sources |
| Dashboard switcher | **MEDIUM** | UX pattern literature (account/app switcher design) rather than product documentation. The pattern is well established; the specific host/attendee framing is inferred |
| Progression-gating | **LOW-MEDIUM** | No direct analogue found in any event platform. Drawn by analogy from community level-gating (Skool, Circle, BuddyBoss) and marketplace trust tiers. **The strongest LOW-confidence item; validate the mechanic with actual Regional Coordinators before building** |

## Gaps and Open Questions

- **Duplicate check-in handling** is undocumented in Luma's public help. Treated here as a design requirement rather than a copied pattern.
- **CampusGroups' per-event task capability** could not be confirmed from public marketing pages. If the team can access a demo instance, one look would firm up the task/deadline differentiator claim.
- **Luma event "guest chat" scope and controls** (registrant-only? time-boxed? moderation tools?) could not be confirmed from official docs; the chat recommendation therefore leans on Slido's documented moderation model instead.
- **Whether progression-gating is wanted by its users** is unvalidated. It is the one item here designed from first principles rather than from an observed pattern, and P7 (evidence over untested assumption) argues for a quick check with Regional Coordinators before implementation.

## Sources

- Luma Help Center, Check In Guests for In-Person Events - https://help.luma.com/p/check-in (HIGH)
- Luma Help Center, Integrating External Check-In Systems - https://help.luma.com/p/external-check-in-integration (HIGH)
- Luma Help Center, Promote Your Event - https://help.luma.com/p/promote-your-event (MEDIUM)
- Eventbrite Help Center, Create and edit your organizer profile - https://www.eventbrite.com/help/en-us/articles/161196/how-to-set-up-your-organizer-profile-page/ (HIGH)
- Eventbrite, How to Use QR Codes For Your Event Check-In & Registration - https://www.eventbrite.com/organizer/features/how-to-use-qr-codes-for-events/ (HIGH)
- Eventbrite, The 21 Best AI Tools for Events and Event Organizers - https://www.eventbrite.com/blog/ai-tools-for-event-organizers/ (MEDIUM)
- CampusGroups / Ready Education, Student Organization Management Software - https://www.readyeducation.com/campusgroups/student-organization-management-software-campus-groups/ (MEDIUM)
- CampusGroups, Events & Calendars - https://www.campusgroups.com/product/events-calendars/ (MEDIUM)
- Slido, Product features - https://www.slido.com/product and https://www.slido.com/conferences (MEDIUM)
- Whova, 5 Use Cases of Live Polling - https://whova.com/blog/5-use-cases-of-live-polling-understand-more-engage-better/ (MEDIUM)
- Explori, What is a good post-event survey response rate? - https://www.explori.com/blog/what-is-a-good-post-event-survey-response-rate (MEDIUM)
- RainFocus, Six Best Practices for Collecting and Using Event Attendee Feedback - https://www.rainfocus.com/blog/how-to-collect-attendee-feedback/ (MEDIUM)
- ASAE, 5 Best Practices for Creating and Sharing Post-Event Surveys - https://www.asaecenter.org/resources/articles/an_plus/2024/09-september/5-best-practices-for-creating-and-sharing-post-event-surveys (MEDIUM)
- Trophy, 10 Examples of Levels Used in Gamification - https://trophy.so/blog/levels-feature-gamification-examples (LOW-MEDIUM)
- Skool Help Center, How do points and levels work? - https://help.skool.com/article/31-how-do-points-and-levels-work (MEDIUM)
- GetStream, Chat Moderation 101 - https://getstream.io/blog/chat-moderation/ (MEDIUM)
- Hunton, Campus Event Safety: Risk and Crisis Management Practices for IHEs - https://www.hunton.com/insights/legal/campus-event-safety-risk-and-crisis-management-practices-for-institutions-of-higher-education (MEDIUM)
- LLM CMS Guide, AI Hallucination in Marketing Content - https://www.llmcms.org/guides/ai-hallucination-in-marketing-content-a-cms-problem (MEDIUM)
- UX Power Tools, Ways to Design Account Switchers & App Switchers - https://medium.com/ux-power-tools/ways-to-design-account-switchers-app-switchers-743e05372ede (LOW-MEDIUM)

---
*Feature research for: community / event-management platform, organiser-dashboard feature set*
*Researched: 2026-08-02*
