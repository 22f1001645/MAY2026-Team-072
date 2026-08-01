import type {
  City,
  EkatvaEvent,
  LeaderRow,
  LedgerEntry,
  NotificationItem,
  Organisation,
  Task,
  Attendee,
  AuditEntry,
} from './types'

export const CITIES: City[] = [
  { id: 'hyd', name: 'Hyderabad' },
  { id: 'blr', name: 'Bangalore' },
  { id: 'che', name: 'Chennai' },
  { id: 'del', name: 'Delhi' },
  { id: 'mum', name: 'Mumbai' },
  { id: 'pun', name: 'Pune' },
]

export const ORGS: Organisation[] = [
  { id: 'o1', name: 'Neelgiri House', type: 'house', city: 'Hyderabad' },
  { id: 'o2', name: 'Hyderabad Regional Chapter', type: 'region', city: 'Hyderabad' },
  { id: 'o3', name: 'Bangalore Regional Chapter', type: 'region', city: 'Bangalore' },
  { id: 'o4', name: 'Rhythm Dance Society', type: 'society', city: 'Chennai' },
  { id: 'o5', name: 'Student Executive Council', type: 'council', city: 'Chennai' },
  { id: 'o6', name: 'Delhi Regional Chapter', type: 'region', city: 'Delhi' },
]

// Currency formatter — all monetary values in INR (PRD assumption)
export const inr = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })

export const EVENTS: EkatvaEvent[] = [
  {
    id: 'ev-ekatva-hyd',
    title: 'Ekatva Hyderabad — Regional Fest',
    org: 'Hyderabad Regional Chapter',
    city: 'Hyderabad',
    scale: 'regional_fest',
    status: 'upcoming',
    proposalStatus: 'approved',
    startsAt: '2026-08-09T10:00:00',
    venue: 'T-Hub, Hyderabad',
    description:
      'The one that started it all, back for its next edition. A full day of connection: games, performances, food, and 230+ students from across the city meeting the people they only ever knew as usernames. Buses arranged from three pickup points.',
    capacity: 250,
    registered: 198,
    cover: 'fest',
    organiser: 'Sai Teja',
    tags: ['Fest', 'Buses', 'Meals included'],
    budget: [
      { id: 'b1', label: 'Venue & AV', planned: 45000 },
      { id: 'b2', label: 'Transport (3 buses)', planned: 60000 },
      { id: 'b3', label: 'Meals (266)', planned: 80000 },
      { id: 'b4', label: 'Decor & mandala setup', planned: 25000 },
    ],
    expenses: [],
  },
  {
    id: 'ev-blr-boardgames',
    title: 'Bangalore Board-Game Night',
    org: 'Bangalore Regional Chapter',
    city: 'Bangalore',
    scale: 'local_meetup',
    status: 'upcoming',
    proposalStatus: 'approved',
    startsAt: '2026-07-27T17:30:00',
    venue: 'Cubbon Park Reads, Bangalore',
    description:
      'A relaxed evening of Catan, Codenames and chai. Perfect first meetup if you have never made it out before — small group, easy vibes.',
    capacity: 40,
    registered: 31,
    cover: 'evening',
    organiser: 'Ayush',
    tags: ['Local', 'Beginner-friendly'],
    budget: [
      { id: 'b1', label: 'Snacks & chai', planned: 4000 },
      { id: 'b2', label: 'Venue booking', planned: 3000 },
    ],
    expenses: [],
  },
  {
    id: 'ev-che-dance',
    title: 'Rhythm Society — Open Dance Workshop',
    org: 'Rhythm Dance Society',
    city: 'Chennai',
    scale: 'local_meetup',
    status: 'upcoming',
    proposalStatus: 'approved',
    startsAt: '2026-08-02T16:00:00',
    venue: 'Phoenix Studio, Chennai',
    description:
      'No experience needed. Two hours of contemporary + folk fusion, taught by society members. Come for the moves, stay for the people.',
    capacity: 50,
    registered: 47,
    cover: 'studio',
    organiser: 'Madhavi',
    tags: ['Society', 'Workshop'],
    budget: [
      { id: 'b1', label: 'Studio rental', planned: 6000 },
      { id: 'b2', label: 'Water & refreshments', planned: 2500 },
    ],
    expenses: [],
  },
  {
    id: 'ev-del-trek',
    title: 'Delhi Sunrise Trek — Nahargarh',
    org: 'Delhi Regional Chapter',
    city: 'Delhi',
    scale: 'regional_meetup',
    status: 'upcoming',
    proposalStatus: 'approved',
    startsAt: '2026-08-16T05:30:00',
    venue: 'Assemble: Kashmere Gate Metro',
    description:
      'An early start, a good climb, and breakfast at the top with 80-odd people from the Delhi chapter. Transport arranged.',
    capacity: 90,
    registered: 62,
    cover: 'trek',
    organiser: 'Ayush',
    tags: ['Regional', 'Outdoors', 'Transport'],
    budget: [
      { id: 'b1', label: 'Transport', planned: 18000 },
      { id: 'b2', label: 'Breakfast packs', planned: 12000 },
    ],
    expenses: [],
  },
  {
    id: 'ev-hyd-coffee',
    title: 'Hyderabad Coffee & Code',
    org: 'Hyderabad Regional Chapter',
    city: 'Hyderabad',
    scale: 'local_meetup',
    status: 'completed',
    proposalStatus: 'approved',
    startsAt: '2026-07-05T11:00:00',
    venue: 'Roastery Coffee House, Banjara Hills',
    description:
      'A morning of pair-programming, portfolio reviews and flat whites. Ran clean and closed on time.',
    capacity: 45,
    registered: 45,
    attended: 38,
    cover: 'coffee',
    organiser: 'Sai Teja',
    tags: ['Local', 'Tech'],
    budget: [
      { id: 'b1', label: 'Coffee tab', planned: 9000, actual: 8600 },
      { id: 'b2', label: 'Venue', planned: 5000, actual: 5000 },
    ],
    expenses: [
      {
        id: 'ex1',
        budgetLineId: 'b1',
        label: 'Roastery bill — 38 covers',
        amount: 8600,
        status: 'verified',
        billName: 'roastery-invoice.pdf',
        submittedBy: 'Sai Teja',
      },
      {
        id: 'ex2',
        budgetLineId: 'b2',
        label: 'Private room booking',
        amount: 5000,
        status: 'approved',
        billName: 'venue-receipt.jpg',
        submittedBy: 'Sai Teja',
      },
    ],
  },
]

// Proposals awaiting admin action (Approval Queue)
export const PENDING_PROPOSALS: (EkatvaEvent & { submittedAgo: string })[] = [
  {
    id: 'pr-mum-openmic',
    title: 'Mumbai Open-Mic Evening',
    org: 'Mumbai Regional Chapter',
    city: 'Mumbai',
    scale: 'local_meetup',
    status: 'upcoming',
    proposalStatus: 'submitted',
    startsAt: '2026-08-20T18:00:00',
    venue: 'Prithvi Café, Juhu',
    description:
      'Poetry, music and stand-up from the Mumbai chapter. Sign-up sheet on the night; ~50 expected.',
    capacity: 60,
    registered: 0,
    cover: 'evening',
    organiser: 'Ritika',
    tags: ['Local', 'Culture'],
    submittedAgo: '4 hours ago',
    budget: [
      { id: 'b1', label: 'Café minimum spend', planned: 7000 },
      { id: 'b2', label: 'Sound system rental', planned: 5000 },
    ],
    expenses: [],
  },
  {
    id: 'pr-pun-hack',
    title: 'Pune Mini-Hack (6 hrs)',
    org: 'Pune Regional Chapter',
    city: 'Pune',
    scale: 'regional_meetup',
    status: 'upcoming',
    proposalStatus: 'submitted',
    startsAt: '2026-08-23T09:00:00',
    venue: 'IISER Pune — Seminar Hall',
    description:
      'A one-day build sprint with lightning demos at the end. Requesting meals for 75 and prizes.',
    capacity: 80,
    registered: 0,
    cover: 'studio',
    organiser: 'Karan',
    tags: ['Regional', 'Tech', 'Meals'],
    submittedAgo: '1 day ago',
    budget: [
      { id: 'b1', label: 'Meals (75)', planned: 22000 },
      { id: 'b2', label: 'Prizes', planned: 10000 },
      { id: 'b3', label: 'Venue & wifi', planned: 8000 },
    ],
    expenses: [],
  },
  {
    id: 'pr-blr-second',
    title: 'Bangalore Second Meetup This Month',
    org: 'Bangalore Regional Chapter',
    city: 'Bangalore',
    scale: 'local_meetup',
    status: 'upcoming',
    proposalStatus: 'changes_requested',
    startsAt: '2026-07-30T18:00:00',
    venue: 'TBD',
    description:
      'Flagged by quota guardrail: one meetup per city per month. Venue also missing.',
    capacity: 40,
    registered: 0,
    cover: 'evening',
    organiser: 'Ayush',
    tags: ['Local', 'Quota flag'],
    submittedAgo: '2 days ago',
    budget: [{ id: 'b1', label: 'Snacks', planned: 4000 }],
    expenses: [],
  },
]

export const AUDIT: Record<string, AuditEntry[]> = {
  'pr-mum-openmic': [
    { at: '2026-07-23 08:14', actor: 'Ritika (RC)', action: 'Submitted proposal' },
  ],
  'pr-pun-hack': [
    { at: '2026-07-22 15:02', actor: 'Karan (RC)', action: 'Submitted proposal' },
    { at: '2026-07-22 16:40', actor: 'System', action: 'Quota check passed', note: 'First Pune meetup this month' },
  ],
  'pr-blr-second': [
    { at: '2026-07-21 12:00', actor: 'Ayush (RC)', action: 'Submitted proposal' },
    { at: '2026-07-21 12:01', actor: 'System', action: 'Quota guardrail triggered', note: 'One meetup per city per month' },
    { at: '2026-07-21 14:30', actor: 'Admin', action: 'Requested changes', note: 'Confirm venue; justify second meetup' },
  ],
}

export const LEADERBOARD: LeaderRow[] = [
  { rank: 1, name: 'Sai Teja', city: 'Hyderabad', points: 480, attended: 9, organised: 4 },
  { rank: 2, name: 'Madhavi', city: 'Chennai', points: 415, attended: 11, organised: 3 },
  { rank: 3, name: 'Ayush', city: 'Bangalore', points: 390, attended: 7, organised: 4 },
  { rank: 4, name: 'Arav Mehta', city: 'Hyderabad', points: 250, attended: 8, organised: 0, isMe: true },
  { rank: 5, name: 'Tanu', city: 'Chennai', points: 220, attended: 6, organised: 1 },
  { rank: 6, name: 'Ritika', city: 'Mumbai', points: 180, attended: 5, organised: 1 },
  { rank: 7, name: 'Karan', city: 'Pune', points: 150, attended: 4, organised: 1 },
  { rank: 8, name: 'Neha S', city: 'Hyderabad', points: 120, attended: 5, organised: 0 },
]

export const MY_LEDGER: LedgerEntry[] = [
  { id: 'l1', action: 'attended', activity: 'Hyderabad Coffee & Code', points: 30, at: '05 Jul 2026' },
  { id: 'l2', action: 'volunteered', activity: 'Ekatva Hyderabad — setup crew', points: 50, at: '20 Jun 2026' },
  { id: 'l3', action: 'attended', activity: 'Neelgiri House Games Night', points: 30, at: '02 Jun 2026' },
  { id: 'l4', action: 'attended', activity: 'Hyderabad Chai & Charcha', points: 30, at: '18 May 2026' },
]

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    type: 'reminder',
    title: 'Tomorrow: Bangalore Board-Game Night',
    body: '5:30 PM at Cubbon Park Reads. See you there — bring a friend.',
    at: '2h ago',
    read: false,
  },
  {
    id: 'n2',
    type: 'update',
    title: 'Venue confirmed — Delhi Sunrise Trek',
    body: 'Assemble at Kashmere Gate Metro, Gate 2, by 5:30 AM sharp.',
    at: '1d ago',
    read: false,
  },
  {
    id: 'n3',
    type: 'points',
    title: 'You earned 30 points',
    body: 'For attending Hyderabad Coffee & Code. You are #4 in Hyderabad.',
    at: '2d ago',
    read: true,
  },
  {
    id: 'n4',
    type: 'approval',
    title: 'Registration confirmed',
    body: 'Ekatva Hyderabad — Regional Fest. Bus pickup details to follow.',
    at: '3d ago',
    read: true,
  },
]

export const TASKS: Task[] = [
  { id: 't1', label: 'Confirm bus vendor & pickup points', assignee: 'Sai Teja', done: true },
  { id: 't2', label: 'Finalise meal count with caterer', assignee: 'Neha S', done: true },
  { id: 't3', label: 'Design & print name badges', assignee: 'Arav Mehta', done: false },
  { id: 't4', label: 'Set up registration desk & QR check-in', assignee: 'Tanu', done: false },
  { id: 't5', label: 'Brief volunteers on run-of-show', assignee: 'Sai Teja', done: false },
]

export const ATTENDEES: Attendee[] = [
  { id: 'a1', name: 'Arav Mehta', regId: 'REG-1042', checkedIn: true },
  { id: 'a2', name: 'Tanu', regId: 'REG-1043', checkedIn: true },
  { id: 'a3', name: 'Neha S', regId: 'REG-1044', checkedIn: true },
  { id: 'a4', name: 'Rohit K', regId: 'REG-1045', checkedIn: false },
  { id: 'a5', name: 'Priya D', regId: 'REG-1046', checkedIn: false },
  { id: 'a6', name: 'Sameer V', regId: 'REG-1047', checkedIn: false },
  { id: 'a7', name: 'Isha R', regId: 'REG-1048', checkedIn: true },
  { id: 'a8', name: 'Dev A', regId: 'REG-1049', checkedIn: false },
]

// Analytics — descriptive slice (FR-H). Per-region participation.
export const CITY_ANALYTICS = [
  { city: 'Hyderabad (AP & Telangana)', meetups: 8, attendance: 312, unique: 190, repeat: 122, feePaid: 640, feeUsed: 190 },
  { city: 'Bengaluru (Karnataka, Kerala)', meetups: 5, attendance: 168, unique: 121, repeat: 47, feePaid: 520, feeUsed: 121 },
  { city: 'Chennai (Tamil Nadu)', meetups: 6, attendance: 205, unique: 140, repeat: 65, feePaid: 480, feeUsed: 140 },
  { city: 'Delhi (Delhi-NCR)', meetups: 4, attendance: 138, unique: 110, repeat: 28, feePaid: 410, feeUsed: 110 },
  { city: 'Mumbai (Maharashtra, Gujarat)', meetups: 3, attendance: 92, unique: 78, repeat: 14, feePaid: 360, feeUsed: 78 },
  { city: 'Kolkata (WB, NE, Odisha)', meetups: 2, attendance: 54, unique: 49, repeat: 5, feePaid: 210, feeUsed: 49 },
  { city: 'Chandigarh (Punjab, HP, RJ, J&K)', meetups: 1, attendance: 35, unique: 30, repeat: 5, feePaid: 180, feeUsed: 30 },
  { city: 'Lucknow (UP, Gwalior)', meetups: 1, attendance: 28, unique: 25, repeat: 3, feePaid: 150, feeUsed: 25 },
  { city: 'Patna (Bihar, Jharkhand, Chhattisgarh)', meetups: 1, attendance: 22, unique: 20, repeat: 2, feePaid: 120, feeUsed: 20 },
  { city: 'International', meetups: 1, attendance: 15, unique: 15, repeat: 0, feePaid: 90, feeUsed: 15 },
]

export const getEvent = (id: string) =>
  [...EVENTS, ...PENDING_PROPOSALS].find((e) => e.id === id)
