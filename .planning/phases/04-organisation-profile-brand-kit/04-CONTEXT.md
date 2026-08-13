# Phase 4: Organisation Profile & Brand Kit - Context

**Gathered:** 2026-08-13
**Status:** Ready for planning
**Source:** Collected during `/gsd-plan-phase 4` in response to the open questions raised by `04-RESEARCH.md`. No `/gsd-discuss-phase` was run for this phase.

<domain>
## Phase Boundary

This phase gives every organisation type a first-class, editable public identity and the brand kit that Phase 5's campaign generator will read.

Delivered:
- An editable org profile (bio, logo, social links) working uniformly across all four org types — house, society, region, council — with org-scoped authorization (`ORG-01`)
- A server-side social-link validator with a scheme allowlist and a per-platform host allowlist, plus a read-side filter so a hostile row can never render (`ORG-02`)
- A brand kit (voice/tone, colour palette, sample phrases) with a stable read contract for the campaign creator (`ORG-03`)
- An AI-drafted starting brand kit that persists nothing until the user explicitly saves (`ORG-04`)

Not delivered here: campaign generation itself (Phase 5), any change to the POR taxonomy (AUTH-03's concern), rate limiting on generation endpoints (Phase 5, where CAMPAIGN-01 is the real exposure).

**No migration is due.** `bio`, `logo_url`, `organisation_social_links` and `brand_kits` all landed in Phase 1's batch revision `213804635519`. Adding a migration here would break ROADMAP Phase 1 criterion 3 and trip the drift gate.

</domain>

<decisions>
## Implementation Decisions

### Logo (ORG-01)

- **D-01:** **Build the local-filesystem upload primitive** rather than accepting an external logo URL. There is currently no upload code anywhere in the repo. This is roughly one plan of new, security-sensitive code: `MAX_CONTENT_LENGTH` size cap that rejects pre-buffer, magic-byte content sniffing (the client's `Content-Type` and filename are both discarded), a png/jpeg/webp allowlist with **SVG excluded**, UUID-generated filenames, `send_from_directory` from `instance/`, and `X-Content-Type-Options: nosniff` on the serve route. The serve route is deliberately **unauthenticated** — a cross-origin `<img>` sends neither the in-memory bearer token nor cookies; opaque UUID filenames are the access control. — **Why:** `PROJECT.md:116` already locks local-filesystem uploads, and Phase 5's CAMPAIGN-03 needs the identical primitive, so the cost is shared rather than duplicated. — **Reversibility:** costly — the serve route's URL shape becomes a contract with every stored `logo_url`.

### Social links (ORG-02)

- **D-02:** The platform allowlist is the **six proposed platforms plus a generic `website` entry**: instagram, linkedin, x, youtube, facebook, github, website. — **Why:** organisations legitimately have their own sites, and omitting the field reads as a bug rather than a decision.

- **D-03:** The generic `website` entry is a **deliberate, documented narrowing of ORG-02's host-allowlist guarantee, scoped to that one field**, and it must be modelled so ROADMAP success criterion 2 stays literally true and testable. Requirements:
  - `website` must **not** be a `platform` value on a social-link row. Model it as a **distinct field** so the sentence "a social link with a non-allowlisted host is rejected" remains true without qualification for every social-link row, and so the criterion-2 test needs no carve-out.
  - The `website` field keeps **every** control except the host allowlist: unconditional `http(s)`-only scheme check via `urlsplit().scheme`; host read from `.hostname`, never `.netloc` (defeats the `https://x.com@evil.com` userinfo vector); non-ASCII hostnames rejected (homograph); IP-literal, `localhost`, and private/loopback/link-local ranges rejected (SSRF); the **re-serialised** URL stored, never the raw input (`_UNSAFE_URL_BYTES_TO_REMOVE` strips `\t\r\n`, so validating the raw string and storing the raw string persists something different from what was validated).
  - The read-side filter and `safeExternalHref()` apply to it identically.
  — **Reversibility:** reversible — removing the field later is a schema drop and one UI control.

### AI-drafted brand kit (ORG-04)

- **D-04:** **`google-genai` with `gemini-2.5-flash`**, lazy-imported so the app boots and the full test suite passes with the package absent. `GEMINI_API_KEY` is server-side config only and must **never** appear as a `VITE_*` variable (Vite inlines those into the client bundle). Unconfigured or failing provider degrades to `503 ai_unavailable` / `503 ai_failed` — never a 500, and the vendor's exception text never reaches the client. `GET /orgs/<org_id>/brand-kit` reports `ai_available`; `/auth/me` does **not** carry it (that payload is AUTH-02's authorization capability contract, not a server feature-flag channel). The draft path writes **nothing** — no `BrandKit` row, no `AuditLog` row — until the user explicitly saves through the normal `PUT`. — **Reversibility:** reversible — the lazy-import seam means swapping providers touches one module.

### Adopted research recommendations

- **D-05 [informational]:** A council organisation's manager is seeded as `Coordinator`, whose AUTH-03 definition is explicitly "House/Society/Region/**Council** scope" (`REQUIREMENTS.md:26`). No new POR constant. Adding a council-specific POR type is an AUTH-03 taxonomy change, not an ORG requirement — log as a deferred item.
- **D-06 [informational]:** **No rate limiter in Phase 4.** The caller set is authenticated POR holders acting on their own org. Revisit in Phase 5, where CAMPAIGN-01 is the real free-tier exposure.
- **D-07 [informational]:** **No AI-SPEC for Phase 4** — the output is subjective, human-reviewed before it applies, and never leaves the org. Phase 5's CAMPAIGN-01 is the phase that warrants one.
- **D-08 [informational]:** `HOUSE_META` (`frontend/src/pages/Orgs.tsx:19`, 12 hardcoded Houses, 3 call sites) becomes the **fallback** for orgs with no uploaded logo — real data wins. Deleting it would strand the seeded visual identity of every unedited House. Precedence detail belongs in `04-UI-SPEC.md`.
</decisions>

<constraints>
## Constraints

- **No new Alembic migration.** Every column this phase needs already exists.
- URL parameter on org-scoped routes **must** be named `org_id` — `can_manage_org_required = org_scoped(can_manage_org)` (`rbac.py:369`) resolves on that name. Any other name yields 404-for-everyone while `test_rbac_enforcement.py` stays green.
- Both new blueprints must be added to `ALL_BLUEPRINTS` (see `04-RESEARCH.md` Pitfall 1 — the file carries a comment about the last endpoint this cost).
- The frontend gates the Edit control on `manageableOrgIds` from `/auth/me`, never on a POR string (`no-por-literals.test.ts` enforces this).
- ASVS L1 security gate is active; `security_block_on: high`.
</constraints>
