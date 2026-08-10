import type { EkatvaEvent } from './types'

/* ---------------------------------------------------------------------------
 * API client — a thin fetch wrapper that adds the base URL + JWT, and parses
 * the backend's { error, code } envelope. Mirrors Milestone 2 §7 (src/lib).
 * ------------------------------------------------------------------------- */

const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api/v1'
const TOKEN_KEY = 'ekatva_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(
      'Cannot reach the Ekatva OS API. Is the backend running on :5000?',
      'network_error',
      0,
    )
  }

  const text = await res.text()
  const body = text ? JSON.parse(text) : null

  if (!res.ok) {
    const msg = body?.error || `Request failed (${res.status})`
    throw new ApiError(msg, body?.code || 'error', res.status, body?.details)
  }
  return body as T
}

/* -------------------------------- adapters ------------------------------- */
// The backend returns snake_case; the pages render the camelCase shapes in
// types.ts. Adapt once, here, so page code stays unchanged.

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
  description?: string
  budget?: { id: string; label: string; planned: number; actual: number }[]
  tags?: string[]
  team_roster?: any[]
  collaborating_orgs?: string[]
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
    tags: a.tags ?? [],
    budget: (a.budget ?? []).map((b) => ({
      id: b.id,
      label: b.label,
      planned: b.planned,
      actual: b.actual,
    })),
    expenses: [],
    teamRoster: a.team_roster ?? [],
    collaboratingOrgs: a.collaborating_orgs ?? [],
  }
}

/* -------------------------------- endpoints ------------------------------ */
export const api = {
  // Auth (module A)
  login: (email: string, password: string) =>
    request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (data: { name: string; email: string; password: string; region_id: string; city?: string }) =>
    request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  me: () => request<any>('/auth/me'),

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
  orgs: () => request<any[]>('/orgs'),
  pors: () => request<{items: any[]}>('/pors?limit=200').then(r => r.items),
  paginatedPors: (page = 1, limit = 10, active = '', orgType = '') =>
    request<{ items: any[]; total: number; page: number; limit: number; pages: number }>(
      `/pors?page=${page}&limit=${limit}${active ? `&active=${active}` : ''}${orgType ? `&org_type=${encodeURIComponent(orgType)}` : ''}`
    ),
  users: (q = '', filters?: { academic_level?: string; academic_status?: string; city?: string }) => {
    const params = new URLSearchParams({ q })
    if (filters?.academic_level) params.set('academic_level', filters.academic_level)
    if (filters?.academic_status) params.set('academic_status', filters.academic_status)
    if (filters?.city) params.set('city', filters.city)
    return request<any[]>(`/users?${params.toString()}`)
  },
  updateAcademicStatus: (userId: string, payload: { academic_level?: string; academic_status?: string }) =>
    request(`/auth/users/${userId}/academic-status`, { method: 'PATCH', body: JSON.stringify(payload) }),
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

  // Registration / attendance (D)
  joinEvent: (id: string) => request(`/events/${id}/register`, { method: 'POST' }),
  leaveEvent: (id: string) => request(`/events/${id}/register`, { method: 'DELETE' }),
  myRegistrations: () => request<any[]>('/me/registrations'),
  roster: (id: string) => request<any[]>(`/events/${id}/registrations`),
  checkIn: (id: string, registration_ids: string[]) =>
    request<{ checked_in: number; total_attended: number }>(`/events/${id}/attendance`, {
      method: 'POST',
      body: JSON.stringify({ registration_ids }),
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
  reassignHead: (id: string, new_head_user_id: string) =>
    request(`/activities/${id}/reassign-head`, {
      method: 'PATCH',
      body: JSON.stringify({ new_head_user_id })
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
  analyticsHeatmap: () => request<any[]>('/analytics/heatmap'),
  analyticsOrganisers: () => request<any[]>('/analytics/organisers'),

  // Dashboard (F)
  dashboard: () => request<any>('/dashboard'),

  // Config (Phase 2)
  getPointsConfig: () => request<{ attended: number; organised: number; volunteered: number }>('/config/points'),
  updatePointsConfig: (payload: Partial<{ attended: number; organised: number; volunteered: number }>) =>
    request('/config/points', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Collaborators (Phase 4)
  getCollaborators: (activityId: string) => request<any[]>(`/activities/${activityId}/collaborators`),
  respondToCollaboration: (activityId: string, orgId: string, action: 'accept' | 'decline') =>
    request(`/activities/${activityId}/collaborators/${orgId}/respond`, {
      method: 'POST', body: JSON.stringify({ action })
    }),

  // Progression (Phase 5)
  getOrgProgression: (orgId: string, city: string) =>
    request<{ org_id: string; city: string; local_meetup_count: number; regional_meetup_count: number; fest_eligible: boolean; fest_unlocked: boolean; missing: string[] }>(
      `/orgs/${orgId}/progression?city=${encodeURIComponent(city)}`
    ),

  constants: () => request<{ POR_TYPES: string[], REGIONS: string[], HOUSE_META: any }>('/config/constants'),
}
