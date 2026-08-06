---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-08-06T05:09:10.207Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | deviation | backend/tests/test_rbac_predicates.py |  | Task 2 (tdd=true) had no separate RED test commit — the plan assigned both test files to Task 3; RED evidence is the pre-implementation ImportError plus two mutation controls, documented in 01-05-SUMMARY.md | open |  | 2026-08-06T05:09:10.207Z |  |

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
  }
]
````
