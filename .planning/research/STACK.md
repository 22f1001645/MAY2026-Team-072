# Stack Research

**Domain:** Organiser-dashboard deepening on an existing Flask 3 + React 18 community platform (IIT Madras BS, course project)
**Researched:** 2026-08-02
**Confidence:** HIGH (versions verified live against PyPI JSON API / npm registry / official vendor docs on 2026-08-02)
**Scope:** Items 2 (refresh tokens), 6 (AI campaign creator), 7 (chat + polls), 8 (QR check-in). Items 1, 3, 4, 5, 9 audited for stack impact.

---

## Headline Verdict

**This milestone needs 3 new runtime dependencies, not a new architecture.**

| Feature | New packages required | Verdict |
|---------|----------------------|---------|
| 2. Refresh + access token | **0** (version bump only) | Capability already ships in the installed library |
| 6. AI campaign creator | **1 backend** (`google-genai`) | Text generation free; image generation is paid-only |
| 7. Chat + polls | **0** | Do NOT add WebSockets. Poll with existing TanStack Query |
| 8. QR check-in | **1 frontend** (scanner) + **1 frontend** (renderer) | Zero backend packages; signing uses Flask's bundled `itsdangerous` |
| 1, 3, 4, 5, 9 | **0** | Assumption confirmed. Three caveats flagged below |
| Cross-cutting | **1 backend** (`Flask-Migrate`) | Strongly recommended: this milestone adds ~8 tables to a no-migrations codebase |

Everything else in the ask resolves to CRUD, service logic, and UI.

---

## Recommended Stack

### Core Technologies (new additions)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `Flask-JWT-Extended` | **4.7.4** (from 4.6.0) | Refresh-token flow (item 2) | Already installed. `create_refresh_token()` and `@jwt_required(refresh=True)` have existed since v3 - **no new package is needed for item 2 at all**. The bump exists to correct the PyJWT floor (see Version Compatibility) and to gain the `verify_sub` control added in 4.7.1. |
| `PyJWT` | **2.13.0** (explicit pin) | Transitive JWT codec | Currently unpinned and resolved implicitly. PyJWT 2.10 introduced a hard `sub`-must-be-string assertion that broke many Flask-JWT-Extended apps. Pin it so a teammate's fresh `pip install` cannot silently drift. |
| `google-genai` | **2.16.0** | Mail-template + poster generation (item 6) | Google's current first-party Python SDK for the Gemini Developer API. Chosen over OpenAI/Anthropic because **Gemini's text models have a genuine no-credit-card free tier** (`gemini-3.1-flash-lite`, `gemini-3-flash`, `gemini-2.5-flash` are all listed "Free of charge" on the official pricing page), and a five-person student team on a course budget needs the free path to be the default path. Single SDK covers both text and image, so you do not run two vendor integrations. |
| `@yudiel/react-qr-scanner` | **2.6.0** | Camera-based QR scanning (item 8) | Actively maintained (published 2026-05-13, vs html5-qrcode's last release in 2023 and qr-scanner's in 2022). Declares `peerDependencies: react ^18.0.0` which matches the project's React 18.3.1 exactly. Ships TypeScript types, torch/zoom/camera-switch controls, and uses the native BarcodeDetector API where available with a `@zxing/library` fallback. |
| `qrcode.react` | **4.2.0** | Rendering the attendee's QR (item 8) | **Zero runtime dependencies** and a peer range of `^16.8 \|\| ^17 \|\| ^18 \|\| ^19`. Rendering client-side means the backend never generates or stores an image, which keeps item 8 at zero new Python packages. |
| `Flask-Migrate` | **4.1.0** | Schema migrations (cross-cutting) | Not requested, but this milestone adds roughly eight tables (teams, tasks, org profiles, social links, timeline entries, feedback, chat messages, polls, poll votes, refresh tokens) to a codebase whose documented process is "edit models, rerun the destructive `seed.py`". That process destroys demo state on every schema touch across five developers. Wraps Alembic 1.18.5 with Flask app-context integration. |

### Supporting Libraries (conditional)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Flask-Limiter` | 4.1.1 | Rate-limit the AI and refresh endpoints | **Add when item 6 ships.** An unauthenticated or loosely-guarded generation endpoint burns the Gemini free-tier RPD quota (or real money on images) in minutes. Also the standard mitigation for refresh-endpoint brute force. In-memory storage is fine for a single-worker deploy; it warns loudly if you scale workers. |
| `segno` | 1.6.6 | Server-side QR image rendering | **Only if** a QR must be embedded in an email, PDF, or downloadable poster. Prefer over `qrcode` 8.2 because segno is pure-Python with zero dependencies, whereas `qrcode` needs Pillow (12.3.0, a large binary wheel) for PNG output. If the QR only ever appears on screen, skip both and use `qrcode.react`. |
| `cloudinary` (Python SDK) | 1.45.0 | Poster upload storage | **Only if** you sign uploads server-side. The recommended path is browser-direct unsigned upload, which needs **no Python SDK at all** - the browser POSTs to Cloudinary and you persist the returned URL into the existing `Document.url` column. Free plan: 25 monthly credits, no credit card required. |
| `Flask-Mail` | 0.10.0 | Actually sending the generated mail | **Only if** "mail-template generation" means send, not draft. PROJECT.md says *generation*. Recommend v1 generates the draft into a copy-to-clipboard / download-.eml surface and sends nothing - it dodges SMTP credentials, deliverability, spam classification, and the ethics of a student project mass-mailing 40,000 people. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `alembic` 1.18.5 | Migration engine under Flask-Migrate | Do not install directly; Flask-Migrate 4.1.0 pulls it. Initial `flask db init` + `flask db migrate` must be done once against the *current* 18-table schema before any new model lands, or the first autogenerated migration will try to create tables that already exist. |
| Gemini API key (AI Studio) | Free-tier credential for item 6 | Free tier requires no credit card for text. **Image generation requires a billing-enabled project.** Store as `GEMINI_API_KEY` in `.env`; the SDK reads it automatically via `genai.Client()`. |
| Cloudinary unsigned upload preset | Browser-direct poster upload | Configure preset in the Cloudinary console with a folder lock and a max file size. Ships as `VITE_CLOUDINARY_CLOUD_NAME` + `VITE_CLOUDINARY_UPLOAD_PRESET`. |

---

## Installation

```bash
# ---- backend/requirements.txt ----
# Item 2: bump + pin (no new capability, corrects transitive resolution)
Flask-JWT-Extended==4.7.4
PyJWT==2.13.0

# Item 6: AI campaign creator
google-genai==2.16.0
Flask-Limiter==4.1.1

# Cross-cutting: migrations (strongly recommended, not requested)
Flask-Migrate==4.1.0

# Item 8: ONLY if QR must be rendered server-side (email/PDF). Otherwise omit.
# segno==1.6.6
```

```bash
# ---- frontend ----
# Item 8: QR check-in
npm install @yudiel/react-qr-scanner@2.6.0 qrcode.react@4.2.0

# Items 2, 7: nothing. TanStack Query 5.101.4 already installed covers
# both the token-refresh retry and the chat/poll polling loop.
```

**Net new runtime dependencies: 3 Python (`google-genai`, `Flask-Limiter`, `Flask-Migrate`), 2 npm.**

---

## Per-Item Detail

### Item 2 - Refresh token + short-lived access token

**Verdict: zero new packages. This is a configuration + one-model + one-endpoint change.**

The installed Flask-JWT-Extended 4.6.0 already exposes everything needed. Verified against the official 4.7.4 docs:

```python
# app/config.py
JWT_ACCESS_TOKEN_EXPIRES  = timedelta(minutes=15)   # was timedelta(hours=12)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
```

```python
# app/controllers/auth_controller.py
@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    return jsonify(access_token=create_access_token(
        identity=get_jwt_identity(), fresh=False))
```

**What actually needs building (all in-house):**

1. `auth_service._token()` currently returns a bare access token. It becomes a pair: `create_access_token(...)` + `create_refresh_token(...)`.
2. A **rotation + revocation store**. The official docs state plainly: *"When an access token is invalidated (e.g. logging a user out), any corresponding refresh token(s) must be revoked too."* Flask-JWT-Extended does **not** ship rotation. Implement a `RefreshToken` SQLAlchemy model keyed on the token `jti` with `user_id`, `revoked_at`, `expires_at`, and register a `@jwt.token_in_blocklist_loader`. This is a new model, not a new dependency. Do not reach for Redis - a `refresh_tokens` table on the existing Postgres/SQLite is correct at this scale and adds zero infrastructure.
3. Frontend: `frontend/src/lib/api.ts` currently reads a single `ekatva_token` from `localStorage` and has no 401 recovery path. It needs a single-flight refresh interceptor - on a 401, call `/auth/refresh` once, retry the original request, and if refresh itself 401s, clear both tokens and redirect to login. "Single-flight" matters: without a shared in-flight promise, a dashboard that fires eight parallel React Query requests will fire eight concurrent refreshes and, under rotation, seven of them lose the race and log the user out.

**Storage decision - keep `localStorage` for v1.** Flask-JWT-Extended supports httpOnly cookies (`JWT_TOKEN_LOCATION = ["cookies"]` with built-in CSRF double-submit), which is genuinely more secure against XSS. But the frontend is deployed on Vercel and the API is on a different origin, so cross-site cookies require `SameSite=None; Secure`, `supports_credentials=True` on Flask-CORS, an exact-origin CORS allowlist (wildcards are illegal with credentials), and CSRF token plumbing on every mutation. That is a meaningful chunk of a course milestone spent on infrastructure the rubric will not see. Keep `localStorage`, keep the access token short (15 min), and record the httpOnly-cookie migration as a documented hardening step. Confidence: HIGH on the mechanics, MEDIUM on the tradeoff call (it is a judgement, not a fact).

---

### Item 6 - AI campaign creator

**Verdict: 1 new package. But the three sub-features have wildly different cost profiles - do not treat them as one unit.**

| Sub-feature | Mechanism | Cost |
|-------------|-----------|------|
| Mail-template generation | `google-genai` text call | **Free** (free tier) |
| Registration-link generation | String concatenation + `qrcode.react` | **Free** (no AI involved) |
| Poster **upload** | Browser to Cloudinary, persist URL | **Free** (25 credits/mo) |
| Poster **generation** | `google-genai` image call | **Paid only. $0.039-$0.067 per image.** |

**The finding that changes the plan:** Google's official pricing page lists the Free Tier as **"Not available"** for `gemini-2.5-flash-image` and `gemini-3.1-flash-image`. Multiple SEO blog posts claim "500 free images/day"; the official page contradicts them. Trust the official page. Paid rates are $0.039/image (`gemini-2.5-flash-image`) and roughly $0.067/image at 1K resolution (`gemini-3.1-flash-image`).

The absolute cost is small - 200 posters is about $8 to $13 - but it requires someone on Team-072 to attach a credit card to a Google Cloud project for a graded course deliverable. **Recommendation: build poster *upload* as the default, always-available path (it fits the existing `Document.url` column with no schema change), and ship poster *generation* behind an env-var feature flag (`AI_IMAGE_ENABLED`) that degrades to a clean "generation unavailable, upload instead" state when unset.** The demo works on a free key; the paid capability is one env var away.

**Model selection (verified against ai.google.dev/gemini-api/docs/models, 2026-08-02):**

| Use | Model ID | Rationale |
|-----|----------|-----------|
| Mail templates, report/reflection summarisation | `gemini-3.1-flash-lite` | On the free tier. Officially described as "frontier-class performance rivaling larger models at a fraction of the cost". Mail-template drafting is not a reasoning-hard task. |
| Fallback if 3.x quota is exhausted | `gemini-2.5-flash` | Also free-tier. Stable, widely documented. |
| Poster generation (flagged, paid) | `gemini-2.5-flash-image` | Cheapest per-image option at $0.039. |

Note: `imagen` (Imagen 4) is **marked deprecated** on the official models page. Do not use it.

**SDK call shape:**

```python
from google import genai
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

response = client.models.generate_content(
    model="gemini-3.1-flash-lite",
    contents=prompt,
)
```

Use `client.models.generate_content()`. The google-genai 2.16.0 README documents this and it is the stable surface. Google's newer web docs demonstrate `client.interactions.create()`, which is real (the Interactions API appears throughout the 2.12-2.16 changelogs) but is a newer, less-documented surface. Confidence: HIGH on `models.generate_content()`, MEDIUM on `interactions.create()` being the eventual replacement. Also note the SDK's own README warning: **pin `google-genai<3.0.0`**, because v3 removes several APIs.

**Architectural placement:** the Gemini call belongs in a new `app/services/campaign_service.py`, behind the existing controller-service-repository seam, with the API key read from config. Do not call Gemini from a controller and do not put the key anywhere the Vite bundle can reach it.

**Add `Flask-Limiter` alongside this.** A `POST /campaigns/generate` endpoint with no limit is a free-tier quota bomb (and, with images enabled, a billing one). Limit per-user, not per-IP - the user is authenticated.

---

### Item 7 - Chat + polls scoped to an event's registration window

**Verdict: zero new packages. Explicitly do NOT add a realtime stack. Use HTTP polling via the already-installed TanStack Query.**

This is the recommendation with the highest confidence and the highest blast-radius if ignored.

**Why not Flask-SocketIO (5.6.1):** the official Flask-SocketIO deployment documentation states that **"Gunicorn cannot be used with multiple workers because its load balancer algorithm does not support sticky sessions."** Adopting it means: install `flask-socketio` + `eventlet` or `gevent`, monkey-patch the standard library at process start (which interacts badly with SQLAlchemy connection pooling and with `psycopg2`), pin the deploy to a single worker or stand up Redis as a message queue, secure a separate WebSocket handshake path (Flask-JWT-Extended's `@jwt_required` does not cover the Socket.IO handshake, so you write custom auth), and add `socket.io-client` 4.8.3 to the frontend. That is a second, parallel transport with its own auth model, its own error envelope, and its own deployment characteristics - directly contradicting the stated course constraint of "no new frameworks".

**Why not SSE either:** SSE looks lighter, but the same constraint bites. A synchronous WSGI worker holding an open SSE stream is a worker that serves nothing else, so SSE also requires gevent/eventlet workers, and cross-worker fan-out still requires Redis. You pay most of the WebSocket cost for one-directional traffic.

**Why polling is genuinely correct here, not a compromise:**

- **Scale.** Chat is scoped to one event's registration window. City meetups are tens of people, not thousands. At 30 participants polling every 4 seconds, that is ~7 requests/second against an endpoint that is a single indexed `WHERE activity_id = ? AND id > ?` query.
- **The library is already installed.** TanStack Query 5.101.4 provides `refetchInterval`, plus `refetchIntervalInBackground: false` so a backgrounded tab stops polling. Zero new code paths.
- **Auth and errors come free.** Polling rides the existing `Authorization: Bearer` header, the existing `{error, code}` envelope, and the existing item-2 refresh interceptor. A WebSocket gets none of these for free.
- **Deploy-target agnostic.** Works on any WSGI host, behind any proxy, on any serverless platform, with any number of workers. No sticky sessions, no Redis, no monkey-patching.
- **Polls barely need realtime at all.** Poll results tolerate 5-10 seconds of staleness completely.

**Implementation shape:** cursor-based, not offset-based. `GET /activities/{id}/messages?after={last_message_id}` returning only new rows. Backend enforces the registration-window bound (open at publish, closed at event end + grace) and that the requester holds a Registration or an organiser POR for that activity. Frontend uses `refetchInterval: 4000` while the chat pane is mounted and visible. Set `staleTime: 0` on that query only.

**Upgrade trigger (document it, do not build it):** if a single event ever exceeds ~200 concurrent chatters, or product scope expands past "one event's registration window" (which PROJECT.md explicitly forbids - general messaging is an out-of-scope exclusion), revisit. Neither is reachable in this milestone.

---

### Item 8 - QR-code check-in

**Verdict: 2 new frontend packages, 0 new backend packages.**

The design decision that eliminates all backend dependencies: **the attendee's device renders the QR from a signed token; the organiser's device scans it.** No QR image is ever generated or stored server-side.

**Backend (zero new packages):** issue a short-lived signed check-in token per registration. Two options, both already installed:
- `itsdangerous` 2.2.0 - **already a hard dependency of Flask 3.0.3**, verified in Flask's `requires_dist`. `URLSafeTimedSerializer` gives you a compact signed payload with a built-in max-age. This is the cleanest fit.
- Or a second Flask-JWT-Extended token with a custom claim and a tight expiry, if you prefer one signing mechanism across the app.

Either way the QR payload is `{registration_id, activity_id}` signed with a short TTL - never a raw registration UUID, which would be a trivially forgeable check-in. `POST /activities/{id}/check-in` then verifies the signature, confirms `reg.activity_id` matches, and calls straight into the **existing** `attendance_service.check_in()`, which is already idempotent (`if reg.attendance is not None: continue`) and already awards points and fires the notification. Item 8 is mostly a new front door on shipped logic.

**Frontend:**
- `qrcode.react@4.2.0` renders the attendee's QR. Zero dependencies, peer range covers React 18 and 19 so it survives a future React upgrade.
- `@yudiel/react-qr-scanner@2.6.0` drives the organiser's camera. Peer `react ^18.0.0` matches exactly.

**Add `segno` 1.6.6 only if** the QR must exist as a server-rendered image (emailed ticket, printable PDF). Pure Python, zero dependencies, no Pillow needed for SVG output. Prefer it over `qrcode` 8.2, which drags in Pillow 12.3.0 for PNG.

**Non-negotiable constraint:** `getUserMedia` requires a **secure context**. Camera scanning will not work over plain HTTP on any origin other than `localhost`. The organiser check-in screen must be served over HTTPS. Keep the existing tap-based roster check-in as the fallback path - camera permission gets denied, cameras fail on old devices, and venues have bad lighting.

---

## Items 1, 3, 4, 5, 9 - Assumption Audit

**Confirmed: none of these need a new dependency.** Three caveats worth carrying into the roadmap.

| Item | Stack impact | Caveat |
|------|-------------|--------|
| 1. Dashboard switcher | None. React Context + `localStorage` preference. | **Security caveat:** the switcher is a *view* toggle, never an authorization boundary. `withPor()` currently derives a single role client-side; it becomes "available surfaces + active surface". The existing `@organiser_required` / `@admin_required` decorators in `app/rbac.py` remain the only real gate and must not learn about the toggle. |
| 3. Activity-scoped team/task | None. New `ActivityTeamMember` + `ActivityTask` models. | **Process caveat:** two new tables against a no-migrations codebase whose only path is a destructive `seed.py` rerun. This is the item that makes Flask-Migrate 4.1.0 pay for itself. |
| 4. Entity profile + social links | None. Marshmallow's built-in `fields.Url` handles validation. | **Security caveat:** user-supplied URLs rendered as clickable links are a stored-XSS and open-redirect surface. Enforce an `http`/`https` scheme allowlist server-side (`fields.Url(schemes={"http","https"})` - it accepts `javascript:` otherwise in some configurations) and render with `rel="noopener noreferrer"`. Model as a normalised `social_links` table keyed on `organisation_id`, not a JSON blob, so it generalises past the Houses-only `HOUSE_META` precedent. |
| 5. Timeline + dual-sided feedback | None for the CRUD. | **Scope caveat:** if organiser reflections should be *auto-summarised into the report* (PRD Phase 2 names "auto-filled reports"), that is an item-6 dependency, not free. Sequence item 5 after item 6 if so. |
| 9. Progression gating | None. Computed count against existing `Activity` rows. | **Placement caveat:** must live in a service function consulted by the proposal endpoint server-side. If the unlock is only a client-side `if`, a crafted POST bypasses it. Cache nothing; the count is a cheap indexed query. |

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Polling via TanStack Query | Flask-SocketIO 5.6.1 + eventlet + Redis 8.1.0 | Only if a single event exceeds ~200 concurrent participants, or scope expands beyond one event's registration window. Neither is reachable this milestone; the latter is an explicit PROJECT.md exclusion. |
| Polling via TanStack Query | Server-Sent Events (`flask-sse`, or hand-rolled) | Only with gevent/eventlet workers already in the deploy. Pays most of the WebSocket cost for unidirectional traffic. |
| `google-genai` (Gemini) | `openai` 2.52.0 | If the team already holds OpenAI credits, or if `gpt-image-1` quality specifically beats Nano Banana for poster work. Loses the free text tier - every mail template becomes a billable call. |
| `google-genai` (Gemini) | `anthropic` 0.120.2 | Better instruction-following for long-form copy, but no image generation at all, so you would run two vendors. Not worth it for mail templates. |
| `@yudiel/react-qr-scanner` | `html5-qrcode` 2.3.8 | Very widely used and heavily blogged, but last published April 2023. Only choose it if you hit a concrete bug in yudiel and need the larger body of Stack Overflow answers. |
| `@yudiel/react-qr-scanner` | Raw `BarcodeDetector` API | If you want literally zero dependencies and can accept no Safari/Firefox desktop coverage. yudiel already uses BarcodeDetector natively where available, so you gain nothing but lose the fallback. |
| `localStorage` token storage | httpOnly cookies + CSRF | The correct production hardening. Defer past this milestone: cross-origin (Vercel to API host) cookies need `SameSite=None; Secure`, `supports_credentials`, an exact-origin CORS allowlist, and CSRF plumbing on every mutation. |
| Browser-direct Cloudinary upload | Flask handles multipart to local disk | Only for local dev. Ephemeral filesystems on Render/Railway/Vercel delete uploads on every redeploy. |
| Browser-direct Cloudinary upload | `boto3` 1.43.62 + S3 presigned URLs | If the team already has AWS. More setup (IAM, bucket policy, CORS config) for a course project; Cloudinary's free plan needs no credit card. |
| DB-table refresh-token blocklist | Redis 8.1.0 blocklist | Only if token-check latency becomes measurable. It will not at this scale, and it would add an infrastructure component solely for this. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `flask-socketio` + `eventlet`/`gevent` | Official docs confirm gunicorn multi-worker is impossible without sticky sessions; monkey-patching the stdlib breaks SQLAlchemy pooling and psycopg2 in subtle ways; the Socket.IO handshake is not covered by `@jwt_required`, so you hand-roll auth. Directly violates the "no new frameworks" course constraint. | Cursor-based polling with TanStack Query `refetchInterval` |
| `socket.io-client` | Only exists to serve the above | Existing `api.ts` fetch wrapper |
| `imagen` / Imagen 4 | **Marked deprecated** on Google's official models page | `gemini-2.5-flash-image` or `gemini-3.1-flash-image` |
| `gemini-3-pro-image` (Nano Banana Pro) | Premium tier. Wildly overpowered for a meetup poster and the most expensive per-image option. | `gemini-2.5-flash-image` at $0.039/image |
| `google-generativeai` (the old SDK) | Superseded by `google-genai`. Training data and older tutorials still reference it. | `google-genai` 2.16.0 |
| `google-genai>=3.0.0` | The SDK's own README warns v3 removes `Live.send`, `Live.start_stream`, `LiveConnectConfig.generation_config`, `GenerationConfigThinkingConfig`, and changes AFC behaviour. It explicitly says to pin `<3.0.0`. | Pin `google-genai==2.16.0` |
| `html5-qrcode` (2.3.8), `qr-scanner` (1.4.2), `jsqr` (1.4.0) | Last published April 2023, November 2022, and April 2021 respectively. All predate stable BarcodeDetector support. | `@yudiel/react-qr-scanner` 2.6.0 |
| `qrcode` 8.2 (Python) | Requires Pillow 12.3.0 for raster output - a heavy binary wheel added for one feature | `segno` 1.6.6 (pure Python, zero deps), and only if server-side rendering is actually needed |
| Unpinned `PyJWT` | PyJWT 2.10 added a hard `sub`-must-be-string assertion that broke Flask-JWT-Extended apps in the field | Pin `PyJWT==2.13.0` |
| Raw registration UUID as the QR payload | Trivially forgeable - anyone who sees or guesses a UUID checks themselves in and earns points | Signed, short-TTL token via `itsdangerous.URLSafeTimedSerializer` |
| Unrate-limited AI endpoint | Burns the Gemini free-tier RPD in minutes; burns real money once images are enabled | `Flask-Limiter` 4.1.1, keyed per authenticated user |
| Storing `GEMINI_API_KEY` anywhere Vite can read it | Any `VITE_`-prefixed env var is inlined into the public JS bundle. A leaked key is someone else's billed quota. | Backend-only env var, called through `campaign_service.py` |

---

## Stack Patterns by Variant

**If the team can enable Google Cloud billing:**
- Ship poster generation with `gemini-2.5-flash-image` behind `AI_IMAGE_ENABLED=true`
- Because ~$0.039/image makes a full demo cost under a dollar

**If the team cannot or will not enable billing:**
- Ship poster **upload only** (browser-direct to Cloudinary, URL into the existing `Document.url` column)
- Because image generation has no free tier at all, per Google's official pricing page. The upload path needs zero backend packages and zero schema change.

**If the check-in QR must appear in an email or printable PDF:**
- Add `segno` 1.6.6 to requirements
- Because `qrcode.react` only renders in a live DOM

**If the backend ends up deployed as a serverless function (Vercel Python, Cloud Run min-instances 0):**
- Polling is not merely preferred, it is mandatory - long-lived connections are impossible there
- Reinforces the item-7 recommendation rather than changing it

**If Flask-Migrate is rejected as scope creep:**
- Accept that every model change in items 3, 4, 5, 7, 9 forces a destructive `seed.py` rerun across five developers
- Mitigate by batching *all* new models into a single schema change landed once, early, before feature work starts

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `Flask-JWT-Extended` 4.7.4 | `PyJWT` >= 2.11.0 | 4.7.4's only change was bumping the PyJWT floor to match the actual runtime requirement (PR #577). The currently pinned 4.6.0 declares a much looser floor, so a fresh install today resolves PyJWT 2.13.0 against a library that predates the 2.10 `sub` change. |
| `Flask-JWT-Extended` 4.7.x | Python >= 3.9 | 4.7.0 dropped Python 3.7/3.8 and added 3.13. Confirm the team's interpreters before bumping. |
| PyJWT 2.10+ `sub` claim | `create_access_token(identity=...)` | **This codebase is already safe.** `auth_service._token()` passes `user.id`, and models use UUID *string* PKs (`db.String(32)`), so `sub` is already a string. Any future code passing an int or dict identity will raise `Subject must be a string`. Note it; do not fear it. |
| `google-genai` 2.16.0 | Python >= 3.10 | Stricter than the rest of the stack. **Verify every team member's Python version before adopting.** This is the single most likely install-time blocker in the whole list. |
| `google-genai` | pin `< 3.0.0` | Per the SDK's own README warning about removals in the next major |
| `@yudiel/react-qr-scanner` 2.6.0 | `react` ^18.0.0, `react-dom` ^18.0.0 | Exact match with the project's React 18.3.1. Bundles `@zxing/library` ^0.20.0. |
| `qrcode.react` 4.2.0 | `react` ^16.8 \|\| ^17 \|\| ^18 \|\| ^19 | Zero runtime dependencies. Survives a future React 19 upgrade untouched. |
| `Flask-Migrate` 4.1.0 | Flask 3.0.3, Flask-SQLAlchemy 3.1.1, alembic 1.18.5 | Standard pairing, no known conflicts |
| `Flask-Limiter` 4.1.1 | Flask 3.0.3 | In-memory storage works single-worker and emits a warning under multiple workers. Set `storage_uri` explicitly if the deploy scales. |
| `itsdangerous` 2.2.0 | Flask 3.0.3 | **Already installed** - a hard dependency of Flask (`itsdangerous>=2.1.2` in Flask 3.0.3's `requires_dist`). Free to use for QR signing. |
| Camera scanning | HTTPS or `localhost` only | `getUserMedia` requires a secure context. Non-negotiable browser rule, not a library limitation. |

---

## Confidence Assessment

| Claim | Confidence | Basis |
|-------|-----------|-------|
| All package version numbers listed | **HIGH** | Queried PyPI JSON API and npm registry directly on 2026-08-02 |
| Refresh tokens need no new package | **HIGH** | Official Flask-JWT-Extended stable docs; `create_refresh_token` / `@jwt_required(refresh=True)` documented since v3 |
| Flask-JWT-Extended 4.7.x adds no features over 4.6.0 | **HIGH** | Read GitHub release notes for 4.7.0-4.7.4 directly; all are Python-version and PyJWT-floor changes |
| Gemini image generation has **no** free tier | **HIGH** | Official ai.google.dev pricing page states "Not available" for `gemini-2.5-flash-image` and `gemini-3.1-flash-image`. Directly contradicts several SEO blogs claiming 500 free images/day - trust the vendor page. |
| Gemini text models are free-tier | **HIGH** | Same official pricing page: "Free of charge" for `gemini-3.1-flash-lite`, `gemini-3-flash`, `gemini-2.5-flash` |
| Per-image paid pricing | **MEDIUM** | Official pricing page, but the `gemini-3.1-flash-image` figure is quoted as "$0.067 per 1K image" which is ambiguous phrasing. `gemini-2.5-flash-image` at $0.039/image is unambiguous. |
| `client.models.generate_content()` is the right SDK call | **HIGH** | Verbatim in the google-genai 2.16.0 PyPI README |
| `client.interactions.create()` is the newer surface | **MEDIUM** | Appears in current ai.google.dev docs and throughout the 2.12-2.16 changelogs, but is not the README's documented path |
| Flask-SocketIO cannot run multi-worker gunicorn | **HIGH** | Official Flask-SocketIO deployment docs, verbatim |
| SSE also needs async workers + Redis for fan-out | **MEDIUM** | Consistent across Flask-SSE docs and multiple independent write-ups; no single authoritative vendor statement |
| `itsdangerous` ships with Flask | **HIGH** | Read Flask 3.0.3's `requires_dist` from the PyPI JSON API |
| Polling is sufficient at this scale | **MEDIUM** | Sound engineering reasoning from stated scale (city meetups, tens of attendees), not an external benchmark. Would need load testing to state as fact. |
| `@yudiel/react-qr-scanner` peer deps | **HIGH** | Read package metadata from the npm registry |
| Cloudinary free plan, no credit card | **MEDIUM** | Official cloudinary.com/pricing. Credit and storage quotas were not fully enumerated on the fetched page. |
| Items 1, 3, 4, 5, 9 need no new stack | **HIGH** | Read the actual models, services, controllers, and `requirements.txt` in this repository |

**Research limitation to note:** Context7 MCP, Exa, and Firecrawl were not available in this session. Verification was done via direct PyPI/npm registry JSON queries (authoritative for versions), direct GitHub API release-note reads (authoritative for changelogs), official vendor documentation via WebFetch, and direct source reading of this repository. Where only general web search supported a claim, it is marked MEDIUM or LOW above.

---

## Sources

**Registry queries (authoritative, 2026-08-02):**
- `https://pypi.org/pypi/{flask-jwt-extended,google-genai,segno,qrcode,flask-socketio,openai,anthropic,pillow,cloudinary,boto3,Flask-Mail,itsdangerous,PyJWT,Flask-Limiter,redis,Flask-Migrate,alembic}/json` - current versions, `requires_python`, `requires_dist`
- `https://registry.npmjs.org/{@yudiel/react-qr-scanner,qrcode.react,html5-qrcode,qr-scanner,@zxing/browser,@zxing/library,jsqr,socket.io-client}` - versions, publish dates, peer dependencies
- `https://api.github.com/repos/vimalloc/flask-jwt-extended/releases` - release notes 4.5.2 through 4.7.4
- `https://raw.githubusercontent.com/googleapis/python-genai/main/CHANGELOG.md` - Interactions API confirmation

**Official documentation (HIGH confidence):**
- [Flask-JWT-Extended: Refreshing Tokens](https://flask-jwt-extended.readthedocs.io/en/stable/refreshing_tokens.html) - refresh-token API, config vars, revocation requirement
- [Flask-SocketIO: Deployment](https://flask-socketio.readthedocs.io/en/stable/deployment.html) - gunicorn sticky-session limitation, message-queue requirement
- [Gemini API: Pricing](https://ai.google.dev/gemini-api/docs/pricing) - free-tier availability, per-image and per-token rates
- [Gemini API: Models](https://ai.google.dev/gemini-api/docs/models) - current model IDs, Imagen deprecation
- [Gemini API: Image Generation](https://ai.google.dev/gemini-api/docs/image-generation) - image model IDs, SDK surface
- [Gemini API: Text Generation](https://ai.google.dev/gemini-api/docs/text-generation) - SDK surface
- [google-genai PyPI README](https://pypi.org/project/google-genai/) - `models.generate_content()` pattern, `<3.0.0` pin warning
- [Cloudinary Pricing](https://cloudinary.com/pricing) - free plan, no credit card

**Repository source (HIGH confidence, read directly):**
- `backend/requirements.txt`, `backend/app/config.py`, `backend/app/services/auth_service.py`, `backend/app/controllers/auth_controller.py`, `backend/app/services/attendance_service.py`, `backend/app/models/__init__.py`, `frontend/src/lib/api.ts`, `frontend/package.json`

**Supporting web search (MEDIUM/LOW, used for context not for facts):**
- [Descope: Refresh Token Rotation Guide](https://www.descope.com/blog/post/refresh-token-rotation) - rotation rationale
- [Flask-JWT-Extended issue #557: "Subject must be a string"](https://github.com/vimalloc/flask-jwt-extended/issues/557) - PyJWT 2.10 breaking change
- [Flask-SSE Quickstart](https://flask-sse.readthedocs.io/en/latest/quickstart.html) and [Max Halford: SSE in Flask without deps](https://maxhalford.github.io/blog/flask-sse-no-deps/) - async-worker requirement for SSE
- [yudielcurbelo/react-qr-scanner](https://github.com/yudielcurbelo/react-qr-scanner) - feature set, BarcodeDetector basis

---
*Stack research for: organiser-dashboard deepening on an existing Flask + React community platform*
*Researched: 2026-08-02*
