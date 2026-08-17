
## From 04-07 (organisation profile page)

- **`POST /api/v1/auth/refresh` returns 500 on a replayed refresh token.**
  `sqlite3.IntegrityError: UNIQUE constraint failed: refresh_token_blocklist.jti`
  — rotation tries to blocklist a jti that is already blocklisted. Observed while
  smoke-testing 04-07: a hard reload of any authed page bounces to `/login`
  instead of restoring the session. Pre-existing Phase 2 behaviour in
  `backend/app/controllers` auth refresh; nothing in Phase 4 touches it, so it is
  out of scope here. Worth a Phase 2 follow-up because it makes every hard reload
  look like a session expiry.
- **The shared `Dialog` primitive does not trap focus or return focus to its
  trigger on close.** 04-UI-SPEC's Accessibility Contract asks for both. 04-07
  added `Esc`-to-close and initial focus on `Cancel` locally in `OrgProfile.tsx`;
  the trap itself belongs in `components/ui.tsx` and would change all eight
  existing call sites, which is a wider change than this plan's scope.
