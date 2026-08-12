---
status: testing
phase: 01-migration-authorization-foundation
source: [01-VERIFICATION.md]
started: 2026-08-06T05:33:29Z
updated: 2026-08-06T05:33:29Z
---

## Current Test

number: 1
name: seed.py single-operator invocation
expected: |
  seed.py's destructive reset is never run concurrently against the same SQLite file — confirm there is no path in dev/deploy tooling (scripts, CI, docs) that could trigger two simultaneous invocations against one database.
awaiting: user response

## Tests

### 1. seed.py single-operator invocation
expected: seed.py's destructive reset is never run concurrently against the same SQLite file — confirm there is no path in dev/deploy tooling (scripts, CI, docs) that could trigger two simultaneous invocations against one database.
result: [pending]

### 2. rbac.py flask.g concurrency safety
expected: The deployment's WSGI worker model keeps flask.g request-local, matching the pre-existing organiser_required decorator's identical pattern — confirm the production WSGI worker model (e.g. gunicorn sync/threaded/gevent workers) doesn't share flask.g across concurrent requests.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
