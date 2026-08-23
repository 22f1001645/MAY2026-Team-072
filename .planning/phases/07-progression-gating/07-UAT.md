---
status: testing
phase: 07-progression-gating
source: [07-VERIFICATION.md]
started: 2026-08-23T18:50:00Z
updated: 2026-08-23T18:50:00Z
---

## Current Test

number: 1
name: Lock caption — indeterminate (no city chosen)
expected: |
  On /proposals/new with no org/city chosen, the Regional Fest scale card is dimmed/locked
  and reads "Pick a city to check eligibility.", with no checkmark/not-yet lines.
awaiting: user response

## Tests

### 1. Lock caption — indeterminate
expected: No org/city chosen on /proposals/new → Regional Fest card dimmed, locked, reads "Pick a city to check eligibility.", no ✓/not-yet lines.
result: [pending]

### 2. Lock caption — loading
expected: Changing city, moment before response lands → "Checking eligibility…", no spinner, card stays locked.
result: [pending]

### 3. Lock caption — fetch error, fails closed
expected: Backend stopped, city changed → "Couldn't check eligibility. The server enforces this on submit.", card stays locked (never unlocks).
result: [pending]

### 4. Lock caption — partial and unlocked
expected: One-of-two-halves city → teal ✓ line, gray "not yet" line, "Locked · 1 of 2 completed"; fest-eligible city → card unlocks and is clickable.
result: [pending]

### 5. Keyboard reachability
expected: Tab to locked card — must receive focus (aria-disabled, not disabled), caption readable via screen reader path.
result: [pending]

### 6. Auto-revert
expected: Select fest in eligible city, switch to locked city → falls back to Regional Meetup exactly once, gold notice, no flicker/loop.
result: [pending]

### 7. Sponsorship banner renders
expected: Visit /orgs/{orgId} for the fest-eligible org as an editor → gold banner, heading, body, one chip per unlocked city, nothing clickable.
result: [pending]

### 8. Banner absence
expected: Org with no unlock rows → no banner, no placeholder.
result: [pending]

### 9. Backstops
expected: ~40-char org name wraps inside the banner strip; banner rides the page's existing loader (no second spinner).
result: [pending]

### 10. Long text
expected: City name "Thiruvananthapuram" wraps in the lock caption rather than truncating.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
