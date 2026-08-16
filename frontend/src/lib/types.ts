// Domain types — realise the PRD v2.2 conceptual domain model (§14)
// and the Milestone 2 class model (§4). Kept close to the FR vocabulary.

export type Role = 'student' | 'organiser' | 'admin'

/* Session identity (D-10, D-11). The backend is the single source of truth for
 * capabilities; these are the camelCase shapes components render, adapted once
 * in lib/api.ts (`adaptMe`). Capabilities are render-only — nothing here grants
 * a client any authority, every mutating call is still authorised server-side. */

export interface Capabilities {
  isOrganiser: boolean
  manageableOrgIds: string[]
  manageableActivityIds: string[]
}

export interface PorSummary {
  porType: string
  org?: string
}

export interface Account {
  id: string
  name: string
  email: string
  role: Role
  city: string
  por?: string
  pors?: PorSummary[]
  academicLevel?: string
  academicStatus?: string
  academicStatusStale?: boolean
  capabilities: Capabilities
}

export type ActivityScale = 'local_meetup' | 'regional_meetup' | 'regional_fest'

export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'changes_requested'
  | 'approved'
  | 'rejected'

export type EventStatus = 'upcoming' | 'live' | 'completed' | 'archived' | 'cancelled'

export type ExpenseStatus = 'submitted' | 'verified' | 'approved' | 'paid'

export type PointAction = 'attended' | 'organised' | 'volunteered'

export interface City {
  id: string
  name: string
}

export interface Organisation {
  id: string
  name: string
  type: 'house' | 'society' | 'region' | 'council'
  city: string
  /** Phase 4 (ORG-01). `null` until a manager writes one — never `undefined`,
   *  because the adapter always supplies a value. */
  bio: string | null
  /** An **absolute** URL. The server serves `/api/v1/uploads/<uuid>.<ext>`;
   *  `adaptOrganisation` in lib/api.ts is the one place that path is resolved
   *  against the API base, so no component ever concatenates one. */
  logoUrl: string | null
  /** ORG-02: the organisation's own site. A distinct field, never a seventh
   *  social platform — the model's honesty here is what makes ROADMAP criterion
   *  2 literally true of every social-link row. */
  website: string | null
}

/* ── Phase 4: organisation profile & brand kit (ORG-01…ORG-04) ─────────────── */

export interface SocialLink {
  /** One of the six allowlisted platform keys. Never `website`. */
  platform: string
  /** Already filtered by the server's read gate — still passed through
   *  `safeExternalHref` before it reaches an `href` (ORG-02 layer 3). */
  url: string
}

/** `GET /orgs/{id}/profile`. Carries no editability hint on purpose: the Edit
 *  gate is `capabilities.manageableOrgIds`, and a second source for it would be
 *  a second, weaker authorization system. */
export interface OrgProfile extends Organisation {
  socialLinks: SocialLink[]
  /** Platform keys only — never the URL and never a reason. A row the read
   *  filter refused is listed here so the editor can say it was saved earlier,
   *  without putting the offending string back in the DOM. */
  withheldPlatforms: string[]
}

export interface BrandKit {
  voiceTone: string | null
  /** Six-digit lowercase hex, up to six entries. */
  palette: string[]
  samplePhrases: string[]
  /** Provenance, not approval state: `ai_draft` means a human reviewed a draft
   *  and kept it. */
  source: 'manual' | 'ai_draft'
  /** `false` when the organisation has never saved a kit. The read never
   *  creates a row, so this is the only way to tell absence from an empty kit. */
  hasKit: boolean
  /** A server feature flag, not a capability — it reports whether AI drafting
   *  is configured on this server. */
  aiAvailable: boolean
}

export interface BudgetLine {
  id: string
  label: string
  planned: number
  actual?: number
}

export interface Expense {
  id: string
  budgetLineId: string
  label: string
  amount: number
  status: ExpenseStatus
  billName: string
  submittedBy: string
  note?: string
}

export interface EkatvaEvent {
  id: string
  title: string
  org: string
  city: string
  scale: ActivityScale
  status: EventStatus
  proposalStatus: ProposalStatus
  startsAt: string // ISO
  venue: string
  description: string
  capacity: number
  registered: number
  attended?: number
  cover: string // gradient key
  organiser: string
  tags: string[]
  budget: BudgetLine[]
  expenses: Expense[]
  // Phase 3 (PROPOSAL-03, PROPOSAL-04)
  isMegaMeetup?: boolean
  collaborators?: Collaborator[]
  teamMembers?: TeamMember[]
}



export interface AuditEntry {
  at: string
  actor: string
  action: string
  note?: string
}

export interface Registration {
  eventId: string
  studentName: string
  registeredAt: string
  attended: boolean
}

export interface LeaderRow {
  rank: number
  name: string
  city: string
  points: number
  attended: number
  organised: number
  isMe?: boolean
}

export interface LedgerEntry {
  id: string
  action: PointAction
  activity: string
  points: number
  at: string
}

export interface NotificationItem {
  id: string
  type: 'reminder' | 'update' | 'approval' | 'points' | 'collaboration_invite'
  title: string
  body: string
  at: string
  read: boolean
  activity_id?: string | null
  activity_title?: string | null
}

export interface Task {
  id: string
  label: string
  assignee: string
  done: boolean
}

export interface Attendee {
  id: string
  name: string
  regId: string
  checkedIn: boolean
}

export interface AnnouncementMessage {
  id: string
  eventId: string
  senderName: string
  senderRole: string
  content: string
  createdAt: string
  isImportant?: boolean
}

// ── Phase 3: Collaboration & Team Roster ─────────────────────────────────────

export type CollabStatus = 'pending' | 'accepted' | 'declined'

export interface Collaborator {
  id: string
  activity_id: string
  org_id: string
  org: string | null
  is_primary: boolean
  status: CollabStatus
  responded_at: string | null
}

export interface TeamMember {
  id: string
  activity_id: string
  user_id: string
  member: string | null
  role: string
  added_by: string | null
}

/** One row of the event agenda (DESIGN-01). Snake→camelCase adaptation
 *  happens once in api.ts; components always see this camelCase shape. */
export interface ApiScheduleItem {
  id: string
  activityId: string
  position: number
  timeBlock: string | null
  title: string
  ownerId: string | null
  ownerLabel: string | null
  notes: string | null
}

/** One scale-appropriate schedule preset (DESIGN-01 / AC-07). */
export interface ApiSchedulePreset {
  name: string
  items: Array<{ timeBlock: string; title: string }>
}

/** One organiser-defined custom registration field (CAMPAIGN-05). The wire
 *  spelling `field_type` is adapted once in api.ts, as with every other type
 *  in this module. */
export interface ApiFormField {
  id: string
  activityId: string
  label: string
  fieldType: string
  options: string[]
  required: boolean
  position: number
}

/** The campaign package's state as the server reports it (CAMPAIGN-04/06).
 *  `registrationUrl` is the server's assembled link — the browser never builds
 *  it, because the URL shape is a published contract (D-12). */
export interface ApiCampaignState {
  id: string | null
  activityId: string
  status: string
  mailSubject: string | null
  mailBody: string | null
  posterName: string | null
  registrationSlug: string | null
  registrationUrl: string | null
  isMeetupHead: boolean
  formFieldTypes: string[]
  completeness: {
    schedule: boolean
    mail: boolean
    poster: boolean
    registration: boolean
  }
}
