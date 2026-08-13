import type { Account, BrandKit, EkatvaEvent, OrgProfile, Organisation, Role } from './types'

/* ---------------------------------------------------------------------------
 * API client — Phase 2 (D-01, D-05, D-06, D-09).
 *
 * Access tokens live in memory only (never localStorage). The refresh token
 * lives in an httpOnly cookie managed by the server. On every 401 response a
 * single-flight refresh is attempted; if that also fails, the registered
 * session-expiry callback fires (D-06).
 * ------------------------------------------------------------------------- */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

// In-memory access token storage
let _accessToken: string | null = null

export class ApiError extends Error {
  code: string
  status: number
  details?: unknown
  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

// --------------------------------------------------------------------------- #
// Single-flight refresh state (D-06)
// --------------------------------------------------------------------------- #

let _refreshPromise: Promise<void> | null = null
let _onSessionExpired: (() => void) | null = null

/** Register a callback invoked when a refresh attempt fails (e.g. redirect to /login). */
export function setOnSessionExpired(cb: () => void) {
  _onSessionExpired = cb
}

/** Obtain a new access token using the httpOnly refresh cookie.
 *
 *  The expiry callback fires from here — the *shared* failure path — and never
 *  from the individual rejected callers. Ten requests queued behind one failed
 *  refresh are one expired session, so they produce one toast and one redirect
 *  (D-06, D-07). Firing per caller is what produced a stack of ten. */
async function _doRefresh() {
  if (!_refreshPromise) {
    _refreshPromise = (async () => {
      try {
        const res = await _rawRequest<{ access_token: string }>('/auth/refresh', { method: 'POST' })
        _accessToken = res.access_token
      } catch (err) {
        _accessToken = null
        _onSessionExpired?.()
        throw err
      } finally {
        _refreshPromise = null
      }
    })()
  }
  return _refreshPromise
}

// --------------------------------------------------------------------------- #
// Core Request Pipeline
// --------------------------------------------------------------------------- #

async function _rawRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
    (options.method ?? 'GET').toUpperCase()
  )
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(_accessToken ? { 'Authorization': `Bearer ${_accessToken}` } : {}),
    ...(options.headers as Record<string, string>),
  }

  // A multipart upload must carry the browser's own Content-Type, because only
  // the browser knows the boundary token it generated. Spreading an explicit
  // `undefined` into the literal above would not remove the key, so the delete
  // is the fix.
  if (options.body instanceof FormData) {
    delete headers['Content-Type']
  }

  // Double-submit CSRF for cookie-based auth (D-05)
  if (isMutation) {
    // Flask-JWT-Extended puts the CSRF token value in the access-token cookie's
    // sibling csrf_refresh_token cookie — readable by JS since it is NOT httpOnly.
    const csrfCookie = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('csrf_refresh_token='))
    if (csrfCookie) {
      headers['X-CSRF-TOKEN'] = csrfCookie.split('=')[1]?.trim() ?? ''
    }
  }

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include', // D-05: send cookies on every request
    })
  } catch {
    throw new ApiError(
      'Cannot reach the Ekatva OS API. Is the backend running on :5000?',
      'network_error',
      0,
    )
  }

  // Not every error body is JSON. Flask raises 413 from MAX_CONTENT_LENGTH
  // before the body is buffered and answers with HTML, and any proxy or
  // dev-server error page does the same. An unguarded parse throws a raw
  // SyntaxError — which is not an ApiError, so the 401 refresh branch below
  // never sees it and the caller renders a parser error instead of a message.
  // Falling back to `null` is enough: every `body?.` read below already
  // tolerates it, and the status line alone makes a readable message.
  const text = await res.text()
  let body: any = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }

  if (!res.ok) {
    const msg = body?.error || `Request failed (${res.status})`
    throw new ApiError(msg, body?.code || 'error', res.status, body?.details)
  }
  return body as T
}

/** Public fetch wrapper with single-flight 401 → refresh → retry (D-06). */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await _rawRequest<T>(path, options)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && path !== '/auth/refresh') {
      try {
        await _doRefresh()
        return await _rawRequest<T>(path, options) // retry once
      } catch {
        throw err // re-throw the original 401; _doRefresh already signalled expiry
      }
    }
    throw err
  }
}

/* -------------------------------- adapters ------------------------------- */
const COVER_BY_SCALE: Record<string, string[]> = {
  regional_fest: ['fest'],
  regional_meetup: ['trek', 'studio'],
  local_meetup: ['evening', 'coffee', 'studio'],
}
function coverFor(scale: string, seed: string): string {
  const opts = COVER_BY_SCALE[scale] ?? ['fest']
  const h = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0)
  return opts[h % opts.length]
}
const TAGS_BY_SCALE: Record<string, string[]> = {
  regional_fest: ['Fest'],
  regional_meetup: ['Regional'],
  local_meetup: ['Local'],
}

export interface ApiActivity {
  id: string
  title: string
  org: string
  city: string
  scale: string
  status: string
  proposal_status: string | null
  starts_at: string
  venue: string
  capacity: number
  registered: number
  attended: number
  organiser: string
  is_mega_meetup: boolean
  description?: string
  budget?: { id: string; label: string; planned: number; actual: number }[]
  collaborators?: { id: string; activity_id: string; org_id: string; org: string | null; is_primary: boolean; status: string; responded_at: string | null }[]
  team_members?: { id: string; activity_id: string; user_id: string; member: string | null; role: string; added_by: string | null }[]
}

export function adaptEvent(a: ApiActivity): EkatvaEvent {
  return {
    id: a.id,
    title: a.title,
    org: a.org,
    city: a.city,
    scale: a.scale as EkatvaEvent['scale'],
    status: a.status as EkatvaEvent['status'],
    proposalStatus: (a.proposal_status ?? 'submitted') as EkatvaEvent['proposalStatus'],
    startsAt: a.starts_at,
    venue: a.venue,
    description: a.description ?? '',
    capacity: a.capacity,
    registered: a.registered,
    attended: a.attended,
    cover: coverFor(a.scale, a.id),
    organiser: a.organiser,
    tags: TAGS_BY_SCALE[a.scale] ?? [],
    isMegaMeetup: a.is_mega_meetup ?? false,
    collaborators: (a.collaborators ?? []) as EkatvaEvent['collaborators'],
    teamMembers: a.team_members ?? [],
    budget: (a.budget ?? []).map((b) => ({
      id: b.id,
      label: b.label,
      planned: b.planned,
      actual: b.actual,
    })),
    expenses: [],
  }
}

/** Wire shape of GET /auth/me — User.to_dict() plus the two computed keys the
 *  controller adds. This module is the only place the snake_case is allowed. */
export interface ApiMe {
  id: string
  name: string
  email: string
  role: string
  city: string
  por?: string | null
  pors?: { por_type: string; org?: string | null }[]
  academic_level?: string | null
  academic_status?: string | null
  academic_status_stale?: boolean
  capabilities?: {
    is_organiser?: boolean
    manageable_org_ids?: string[]
    manageable_activity_ids?: string[]
  }
}

export function adaptMe(u: ApiMe): Account {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as Role,
    city: u.city,
    por: u.por ?? undefined,
    pors: (u.pors ?? []).map((p) => ({ porType: p.por_type, org: p.org ?? undefined })),
    academicLevel: u.academic_level ?? undefined,
    academicStatus: u.academic_status ?? undefined,
    academicStatusStale: u.academic_status_stale ?? false,
    capabilities: {
      isOrganiser: u.capabilities?.is_organiser ?? false,
      manageableOrgIds: u.capabilities?.manageable_org_ids ?? [],
      manageableActivityIds: u.capabilities?.manageable_activity_ids ?? [],
    },
  }
}

/* ---- Phase 4: organisation profile & brand kit (ORG-01…ORG-04) ---------- */

/** Wire shape of an organisation row — `GET /orgs` and the profile routes. */
export interface ApiOrganisation {
  id: string
  name: string
  type: string
  city: string
  bio?: string | null
  logo_url?: string | null
  website?: string | null
}

export interface ApiOrgProfile extends ApiOrganisation {
  social_links?: { platform: string; url: string }[]
  withheld_platforms?: string[]
}

export interface ApiBrandKit {
  voice_tone?: string | null
  palette?: string[]
  sample_phrases?: string[]
  source?: string
  has_kit?: boolean
  ai_available?: boolean
}

/** Resolve a served upload path to an absolute URL, **exactly once**.
 *
 *  `logo_url` arrives as `/api/v1/uploads/<uuid>.<ext>`, and the API lives on a
 *  different origin from the dev server, so a bare path in an `<img src>` would
 *  point at :5173 and 404. Resolving it here rather than in a component is the
 *  same "the adapter is the only place" rule this module already states for
 *  snake_case: a second call site is a second base URL to keep in step.
 *
 *  A failure returns `null`, not the raw path — `OrgLogo`'s fallback ladder
 *  produces a real mark from null, whereas a garbage `src` produces a broken
 *  image, which the ladder promises is never a state of that component. */
function absoluteUploadUrl(path?: string | null): string | null {
  if (!path) return null
  try {
    return new URL(path, new URL(BASE, window.location.href)).href
  } catch {
    return null
  }
}

/** Every optional lands on a non-`undefined` value, following `adaptMe`, so no
 *  page needs a `?.` chain for a field the server always sends. */
export function adaptOrganisation(o: ApiOrganisation): Organisation {
  return {
    id: o.id,
    name: o.name,
    type: o.type as Organisation['type'],
    city: o.city,
    bio: o.bio ?? null,
    logoUrl: absoluteUploadUrl(o.logo_url),
    website: o.website ?? null,
  }
}

export function adaptOrgProfile(p: ApiOrgProfile): OrgProfile {
  return {
    ...adaptOrganisation(p),
    socialLinks: (p.social_links ?? []).map((l) => ({ platform: l.platform, url: l.url })),
    withheldPlatforms: p.withheld_platforms ?? [],
  }
}

export function adaptBrandKit(k: ApiBrandKit): BrandKit {
  return {
    voiceTone: k.voice_tone ?? null,
    palette: k.palette ?? [],
    samplePhrases: k.sample_phrases ?? [],
    source: (k.source ?? 'manual') as BrandKit['source'],
    hasKit: k.has_kit ?? false,
    aiAvailable: k.ai_available ?? false,
  }
}

/* -------------------------------- endpoints ------------------------------ */
export const api = {
  // Auth (Phase 2 — cookie session)
  login: async (email: string, password: string) => {
    const res = await request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    _accessToken = res.access_token
    return res
  },
  register: async (data: { name: string; email: string; password: string; region_id: string; city?: string }) => {
    const res = await request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    _accessToken = res.access_token
    return res
  },
  me: (): Promise<Account> => request<ApiMe>('/auth/me').then(adaptMe),
  updateProfile: (data: { city?: string }) =>
    request('/auth/me/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  /** Rotate the refresh cookie and obtain a new access token. */
  refresh: async () => {
    const res = await _rawRequest<{ access_token: string }>('/auth/refresh', { method: 'POST' })
    _accessToken = res.access_token
    return res
  },
  /** Revoke this device's session and clear the cookie. */
  logout: async () => {
    const res = await request<{ message: string }>('/auth/logout', { method: 'POST' })
    _accessToken = null
    return res
  },
  /** User self-confirms their academic level + status (AUTH-04).
   *  Callers pass camelCase; this wrapper is the only module that knows the
   *  wire format, in the request direction as well as the response one. */
  confirmAcademicStatus: (academicLevel: string, academicStatus: string) =>
    request<any>('/auth/academic-status', {
      method: 'PATCH',
      body: JSON.stringify({ academic_level: academicLevel, academic_status: academicStatus }),
    }),
  /** Admin override of a user's academic status (D-22). */
  adminOverrideAcademicStatus: (
    userId: string,
    academicLevel: string,
    academicStatus: string,
    reason?: string,
  ) =>
    request<any>(`/admin/users/${userId}/academic-status`, {
      method: 'PATCH',
      body: JSON.stringify({
        academic_level: academicLevel,
        academic_status: academicStatus,
        reason,
      }),
    }),
    
  porAudit: () => request<any[]>('/auth/por-audit'),

  // Community (A)
  cities: () => request<{ id: string; name: string; region_id: string | null; region: string | null }[]>('/cities'),
  regions: () => request<{ id: string; name: string; type: string }[]>('/regions'),
  citiesForRegion: (regionId: string) =>
    request<{ id: string; name: string; region_id: string; region: string }[]>(`/regions/${regionId}/cities`),
  addCityToRegion: (regionId: string, name: string) =>
    request<{ id: string; name: string; region_id: string; region: string }>(
      `/regions/${regionId}/cities`,
      { method: 'POST', body: JSON.stringify({ name }) }
    ),
  houses: () => request<any[]>('/houses'),
  /** Adapted, not raw: `/admin/orgs` renders logos from these same rows, and a
   *  second shape for an organisation would mean a second place a logo path is
   *  resolved. */
  orgs: (): Promise<Organisation[]> =>
    request<ApiOrganisation[]>('/orgs').then((rows) => rows.map(adaptOrganisation)),
  pors: () => request<any[]>('/pors'),
  users: (q?: string) =>
    request<any[]>(`/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createOrg: (data: { name: string; type: string; city: string }) =>
    request('/orgs', { method: 'POST', body: JSON.stringify(data) }),
  assignPor: (orgId: string, data: { user_id: string; por_type: string; term?: string; region_id?: string }) =>
    request(`/orgs/${orgId}/pors`, { method: 'POST', body: JSON.stringify(data) }),
  deactivatePor: (porId: string) =>
    request(`/pors/${porId}/deactivate`, { method: 'PATCH' }),

  // Discovery (C)
  events: (city?: string) =>
    request<ApiActivity[]>(`/events${city && city !== 'All' ? `?city=${encodeURIComponent(city)}` : ''}`)
      .then((rows) => rows.map(adaptEvent)),
  event: (id: string) => request<ApiActivity>(`/events/${id}`).then(adaptEvent),
  updateEvent: (id: string, payload: any) =>
    request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  cancelEvent: (id: string) => request(`/events/${id}`, { method: 'DELETE' }),

  // Registration / attendance (D)
  joinEvent: (id: string, referredBy?: string) =>
    request(`/events/${id}/register`, {
      method: 'POST',
      body: JSON.stringify({ referred_by: referredBy }),
    }),
  leaveEvent: (id: string) => request(`/events/${id}/register`, { method: 'DELETE' }),
  myRegistrations: () => request<any[]>('/me/registrations'),
  roster: (id: string) => request<any[]>(`/events/${id}/registrations`),
  checkIn: (id: string, registration_ids: string[]) =>
    request<{ checked_in: number; total_attended: number }>(`/events/${id}/attendance`, {
      method: 'POST',
      body: JSON.stringify({ registration_ids }),
    }),
  scanQr: (id: string, registration_id: string) =>
    request<{ status: string; student_name: string; message?: string }>(`/events/${id}/scan`, {
      method: 'POST',
      body: JSON.stringify({ registration_id }),
    }),
  broadcast: (id: string, title: string, body: string) =>
    request(`/events/${id}/broadcast`, { method: 'POST', body: JSON.stringify({ title, body }) }),
  announcements: (id: string) => request<any[]>(`/events/${id}/announcements`),
  postAnnouncement: (id: string, body: string) =>
    request(`/events/${id}/broadcast`, { method: 'POST', body: JSON.stringify({ title: 'Update', body }) }),
  notifications: () => request<any[]>('/notifications'),
  markNotificationsRead: () => request('/notifications/read', { method: 'PATCH' }),

  // Proposals / approval (B)
  submitProposal: (payload: any) =>
    request<ApiActivity>('/activities', { method: 'POST', body: JSON.stringify(payload) }).then(adaptEvent),
  proposals: (status = 'pending') =>
    request<ApiActivity[]>(`/proposals?status=${status}`).then((r) => r.map(adaptEvent)),
  decision: (id: string, decision: string, note: string) =>
    request(`/proposals/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    }),
  audit: (id: string) =>
    request<{ action: string; actor: string; note?: string; at: string }[]>(`/activities/${id}/audit`),

  // Reimbursement (E)
  expensesFor: (id: string) => request<any[]>(`/events/${id}/expenses`),
  submitExpense: (payload: any) =>
    request('/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  reimbursements: () => request<any[]>('/reimbursements'),
  verifyExpense: (id: string) => request(`/expenses/${id}/verify`, { method: 'PATCH' }),

  // Recognition (G)
  leaderboard: (city?: string) =>
    request<any[]>(`/leaderboard${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  myPoints: () => request<{ total: number; entries: any[] }>('/me/points'),

  // Analytics (H)
  analytics: () => request<any>('/analytics'),
  organiserAnalytics: () => request<any>('/analytics/organisers'),

  // Dashboard (F)
  dashboard: () => request<any>('/dashboard'),
  
  // Settings (System)
  adminSettingsPoints: () => request<any>('/admin/settings/points'),
  adminUpdateSettingsPoints: (data: any) => request<any>('/admin/settings/points', { method: 'PUT', body: JSON.stringify(data) }),

  // Phase 3: Collaboration (PROPOSAL-06) & Team Roster (PROPOSAL-05)
  respondCollab: (activityId: string, collabId: string, status: 'accepted' | 'declined') =>
    request<any>(`/activities/${activityId}/collaborators/${collabId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  reassignMeetupHead: (activityId: string, newUserId: string) =>
    request<{ activity_id: string; new_meetup_head_user_id: string }>(
      `/activities/${activityId}/reassign-meetup-head`,
      { method: 'POST', body: JSON.stringify({ new_meetup_head_user_id: newUserId }) },
    ),

  // Phase 4: Organisation profile (ORG-01, ORG-02) & brand kit (ORG-03, ORG-04).
  // No capability value is ever added to any of these requests — not a header,
  // not a query parameter, not a body field. `manageableOrgIds` decides what
  // renders; `can_manage_org` on the server decides what is permitted (P-10).

  /** The profile: org fields, the social links the server vouches for, and the
   *  platform keys it withheld. Readable by anyone signed in. */
  orgProfile: (orgId: string): Promise<OrgProfile> =>
    request<ApiOrgProfile>(`/orgs/${orgId}/profile`).then(adaptOrgProfile),
  /** Bio and logo. Pass `logo_url: null` to clear the logo — there is no delete
   *  endpoint. Returns the same payload GET does, so the caller re-renders from
   *  the server's normalised values rather than its own form state. */
  updateOrgProfile: (orgId: string, payload: { bio?: string; logo_url?: string | null }) =>
    request<ApiOrgProfile>(`/orgs/${orgId}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }).then(adaptOrgProfile),
  /** Replace the whole social section in one write. An omitted platform is a
   *  removed link. Also returns the profile payload. */
  replaceSocialLinks: (orgId: string, payload: { social_links: { platform: string; url: string }[] }) =>
    request<ApiOrgProfile>(`/orgs/${orgId}/social-links`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }).then(adaptOrgProfile),
  /** Multipart upload. The request helper drops the JSON content type for a
   *  FormData body so the browser sets its own boundary. */
  uploadOrgLogo: (orgId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<ApiOrgProfile>(`/orgs/${orgId}/logo`, { method: 'POST', body: form }).then(
      adaptOrgProfile,
    )
  },
  /** `can_manage_org_required` — a non-manager gets a 403, so the caller gates
   *  this request rather than issuing it and swallowing the error. */
  brandKit: (orgId: string): Promise<BrandKit> =>
    request<ApiBrandKit>(`/orgs/${orgId}/brand-kit`).then(adaptBrandKit),
  /** Upsert — the only writer of a brand kit. */
  saveBrandKit: (
    orgId: string,
    payload: { voice_tone?: string | null; palette?: string[]; sample_phrases?: string[] },
  ) =>
    request<ApiBrandKit>(`/orgs/${orgId}/brand-kit`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }).then(adaptBrandKit),
  /** An AI-drafted starting kit. Writes nothing — the draft only reaches the
   *  server if the user presses Save. Takes an `AbortSignal` so the caller can
   *  impose its own timeout on what is an LLM round trip. */
  draftBrandKit: (orgId: string, signal?: AbortSignal): Promise<BrandKit> =>
    request<ApiBrandKit>(`/orgs/${orgId}/brand-kit/draft`, { method: 'POST', signal }).then(
      adaptBrandKit,
    ),
}
