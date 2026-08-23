---
schema_version: 1
open_count: 5
waived_count: 0
fixed_count: 1
total_count: 6
last_updated: 2026-08-23T17:50:20.847Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | deviation | backend/tests/test_rbac_predicates.py |  | Task 2 (tdd=true) had no separate RED test commit — the plan assigned both test files to Task 3; RED evidence is the pre-implementation ImportError plus two mutation controls, documented in 01-05-SUMMARY.md | open |  | 2026-08-06T05:09:10.207Z |  |
| 2 | 04 | unmet-truth | frontend/src/components/ui.tsx |  | The shared Dialog primitive does not trap focus or restore it to the trigger, which 04-UI-SPEC's Accessibility Contract requires; 04-07 added Esc and initial focus locally in OrgProfile.tsx | open |  | 2026-08-13T22:31:38.745Z |  |
| 3 | 04 | deviation | frontend/src/pages/Orgs.tsx |  | 04-07 Task 3's spacing-diff grep is unsatisfiable (href/rel share a line with a className); replaced by a before/after spacing-token multiset comparison, which is identical | open |  | 2026-08-13T22:31:39.380Z |  |
| 4 | 07 | deviation | backend/tests/test_progression_gating.py |  | 07-01 plan named POST /api/v1/proposals; the real submit route is POST /api/v1/activities — tests corrected, plan text still wrong | open |  | 2026-08-23T06:21:37.142Z |  |
| 5 | 08 | deviation | backend/app/services/channel_service.py |  | 08-02 submit_query gate widened to can_participate_in_activity (plan specified a literal RegistrationRepository.find) | open |  | 2026-08-23T16:57:43.978Z |  |
| 6 | 08 | stub | frontend/src/components/EventChannelSection.tsx | 158 | Q&A sub-section is not mounted — QuerySection.tsx (plan 08-05) does not exist yet; two-line wiring is marked TODO(08-05) in place | fixed |  | 2026-08-23T17:34:39.022Z | 2026-08-23T17:50:20.847Z |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "01",
    "file": "backend/tests/test_rbac_predicates.py",
    "line": null,
    "description": "Task 2 (tdd=true) had no separate RED test commit — the plan assigned both test files to Task 3; RED evidence is the pre-implementation ImportError plus two mutation controls, documented in 01-05-SUMMARY.md",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-06T05:09:10.207Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unmet-truth",
    "phase": "04",
    "file": "frontend/src/components/ui.tsx",
    "line": null,
    "description": "The shared Dialog primitive does not trap focus or restore it to the trigger, which 04-UI-SPEC's Accessibility Contract requires; 04-07 added Esc and initial focus locally in OrgProfile.tsx",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-13T22:31:38.745Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "04",
    "file": "frontend/src/pages/Orgs.tsx",
    "line": null,
    "description": "04-07 Task 3's spacing-diff grep is unsatisfiable (href/rel share a line with a className); replaced by a before/after spacing-token multiset comparison, which is identical",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-13T22:31:39.380Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "07",
    "file": "backend/tests/test_progression_gating.py",
    "line": null,
    "description": "07-01 plan named POST /api/v1/proposals; the real submit route is POST /api/v1/activities — tests corrected, plan text still wrong",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-23T06:21:37.142Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "deviation",
    "phase": "08",
    "file": "backend/app/services/channel_service.py",
    "line": null,
    "description": "08-02 submit_query gate widened to can_participate_in_activity (plan specified a literal RegistrationRepository.find)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-23T16:57:43.978Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "stub",
    "phase": "08",
    "file": "frontend/src/components/EventChannelSection.tsx",
    "line": 158,
    "description": "Q&A sub-section is not mounted — QuerySection.tsx (plan 08-05) does not exist yet; two-line wiring is marked TODO(08-05) in place",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-23T17:34:39.022Z",
    "resolved_at": "2026-08-23T17:50:20.847Z"
  }
]
````
