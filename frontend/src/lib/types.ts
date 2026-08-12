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

export type EventStatus = 'upcoming' | 'live' | 'completed' | 'archived'

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
  type: 'reminder' | 'update' | 'approval' | 'points'
  title: string
  body: string
  at: string
  read: boolean
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
