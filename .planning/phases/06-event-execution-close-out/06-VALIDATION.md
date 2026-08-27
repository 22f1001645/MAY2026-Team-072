---
phase: 06
slug: event-execution-close-out
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-19
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.x (backend) + vitest 3.x (frontend) |
| **Config file** | `backend/pytest.ini` / `frontend/vite.config.ts` |
| **Quick run command** | `cd backend; python -m pytest tests/test_event_timeline.py tests/test_expense_reimbursement.py tests/test_scan_qr.py tests/test_event_feedback.py -q` |
| **Full suite command** | `cd backend; python -m pytest -q; cd ../frontend; npm test -- --run` |
| **Estimated runtime** | ~15 seconds (quick), ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend; python -m pytest tests/test_event_feedback.py -q`
- **After every plan wave:** Run quick run command + `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | TIMELINE-01 | — | Chronological audit trail across proposal, regs, attendance, expenses | integration | `python -m pytest tests/test_event_timeline.py` | ✅ | ✅ green |
| 06-02-01 | 02 | 1 | REIMB-01 | T-01-06 | Only Meetup Head may submit reimbursement request | integration | `python -m pytest tests/test_expense_reimbursement.py` | ✅ | ✅ green |
| 06-02-02 | 02 | 1 | REIMB-02 | — | Social post URL mandatory on submission | unit/integration | `python -m pytest tests/test_expense_reimbursement.py` | ✅ | ✅ green |
| 06-03-01 | 03 | 1 | FEEDBACK-01 | RBAC-03 | Draft report auto-save; submit gated on Meetup Head | integration | `python -m pytest tests/test_event_feedback.py` | ✅ | ✅ green |
| 06-04-01 | 04 | 1 | FEEDBACK-02 | — | Checked-in attendee gate, 1-5 rating range, duplicate 409 | integration | `python -m pytest tests/test_event_feedback.py` | ✅ | ✅ green |
| 06-05-01 | 05 | 2 | API-HOOKS | — | TanStack hooks wrap all Phase 6 close-out endpoints | type/unit | `cd frontend; npx tsc --noEmit` | ✅ | ✅ green |
| 06-06-01 | 06 | 2 | QR-01 | — | Live QR scan with html5-qrcode and roster check-in fallback | integration | `python -m pytest tests/test_scan_qr.py` | ✅ | ✅ green |
| 06-07-01 | 07 | 2 | QR-02 | — | Confirmed ticket QR code rendered in MyRegistrations | unit | `cd frontend; npx tsc --noEmit` | ✅ | ✅ green |
| 06-08-01 | 08 | 3 | UI-PANELS | — | ManageEvent panels for Reflection, Reimbursement, and Timeline | unit | `cd frontend; npx vitest run src/components/__tests__/CloseOutPanels.test.tsx` | ✅ | ✅ green |
| 06-09-01 | 09 | 3 | FEEDBACK-UI | — | EventDetail FeedbackForm with 1-5 star rating and idempotency | unit | `cd frontend; npx vitest run src/components/__tests__/CloseOutPanels.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/tests/test_event_feedback.py` — feedback & report tests for FEEDBACK-01/02
- [x] `frontend/src/components/__tests__/CloseOutPanels.test.tsx` — frontend panel validation tests
- [x] `backend/tests/conftest.py` — shared RBAC and auth fixtures

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Physical Camera QR Scan | QR-01 | Requires hardware webcam/camera device | Open `/events/:id/checkin` on mobile/webcam and scan QR ticket |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-19
