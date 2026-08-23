import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from './api'
import type { ApiFormField, ApiTask } from './types'

/* TanStack Query hooks — server cache, retries, and invalidation on mutation
 * (Milestone 2 §7: server state lives here, never duplicated in UI state). */

// ---- Queries ----
/** `placeholderData` holds the previous capability snapshot across a background
 *  /auth/me refetch. Without it the snapshot is dropped for a frame and every
 *  Edit control gated on it blinks out and back (04-UI-SPEC.md S2). */
export const useCapabilities = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    select: (data) => data.capabilities,
  })

export const useEvents = (city?: string, scale?: string, dateRange?: string) =>
  useQuery({ queryKey: ['events', city, scale, dateRange], queryFn: () => api.events(city, scale, dateRange), placeholderData: keepPreviousData })

export const useEvent = (id?: string) =>
  useQuery({ queryKey: ['event', id], queryFn: () => api.event(id!), enabled: !!id })

/** `enabled` exists for the one page a visitor can open without a session
 *  (`/events/:slug`, OD-3). Firing this without one answers 401, which the
 *  request pipeline reads as an expired session and redirects to /login —
 *  so an unguarded call here would bounce the visitor off the public page. */
export const useMyRegistrations = (enabled = true) =>
  useQuery({ queryKey: ['my-registrations'], queryFn: api.myRegistrations, enabled, refetchInterval: 10000 })

export const useRoster = (id?: string) =>
  useQuery({ queryKey: ['roster', id], queryFn: () => api.roster(id!), enabled: !!id })

export const useLeaderboard = (city?: string) =>
  useQuery({ queryKey: ['leaderboard', city], queryFn: () => api.leaderboard(city) })

export const useMyPoints = () =>
  useQuery({ queryKey: ['my-points'], queryFn: api.myPoints })

/** Notifications for the current view. The view is applied HERE, on the result,
 *  never as a request parameter — it must not reach the wire (D-18). One query
 *  key for every view, so switching views re-filters cached rows instead of
 *  refetching. */
export const useNotifications = (role: string = 'student') =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications(),
    refetchInterval: 10000,
    select: (rows: any[]) => rows.filter((n) => (n.target_role ?? 'student') === role),
  })

export const useProposals = (status = 'pending') =>
  useQuery({ queryKey: ['proposals', status], queryFn: () => api.proposals(status), placeholderData: keepPreviousData })

export const useAudit = (id?: string) =>
  useQuery({ queryKey: ['audit', id], queryFn: () => api.audit(id!), enabled: !!id })

export const useExpensesFor = (id?: string) =>
  useQuery({ queryKey: ['expenses', id], queryFn: () => api.expensesFor(id!), enabled: !!id })

export const useReimbursements = () =>
  useQuery({ queryKey: ['reimbursements'], queryFn: api.reimbursements })

export const useAnalytics = () =>
  useQuery({ queryKey: ['analytics'], queryFn: api.analytics })

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard })

export const useCities = () =>
  useQuery({ queryKey: ['cities'], queryFn: api.cities })

export const useRegions = () =>
  useQuery({ queryKey: ['regions'], queryFn: api.regions })

export const useCitiesForRegion = (regionId: string | null) =>
  useQuery({
    queryKey: ['cities-for-region', regionId],
    queryFn: () => api.citiesForRegion(regionId!),
    enabled: !!regionId,
  })

export const useOrgs = () =>
  useQuery({ queryKey: ['orgs'], queryFn: api.orgs })

export const useHouses = () =>
  useQuery({ queryKey: ['houses'], queryFn: api.houses })

export const usePors = () =>
  useQuery({ queryKey: ['pors'], queryFn: api.pors })

export const useUsers = (q?: string, enabled?: boolean) =>
  useQuery({
    queryKey: ['users', q],
    queryFn: () => api.users(q),
    enabled: enabled !== undefined ? enabled : (q !== undefined ? q.trim().length > 0 : true),
  })

// ---- Phase 4: organisation profile & brand kit (ORG-01…ORG-04) ----

export const useOrgProfile = (orgId?: string) =>
  useQuery({
    queryKey: ['orgProfile', orgId],
    queryFn: () => api.orgProfile(orgId!),
    enabled: !!orgId,
  })

// ---- Phase 7: progression gating (PROG-01…PROG-03) ----

/** The one read of progression state, serving both Phase 7 surfaces: called
 *  with a city it drives the proposal form's fest-card lock, called without one
 *  it drives the profile's sponsorship banner.
 *
 *  `city ?? null` in the key keeps those two calls as distinct cache entries.
 *  Collapsed into one key they would overwrite each other and the banner would
 *  flicker between an org-wide answer and a city-specific one (D-04, D-05).
 *
 *  The key change is the *only* refetch trigger: no polling interval and no
 *  refetch on window focus. Eligibility changes when an admin approves, and the
 *  `useDecision` invalidation below is what reports that — polling for it would
 *  be the structural mistake the 05-09 no-polling gate exists to catch. */
export const useOrgProgression = (orgId?: string, city?: string) =>
  useQuery({
    queryKey: ['orgProgression', orgId, city ?? null],
    queryFn: () => api.orgProgression(orgId!, city),
    enabled: !!orgId,
    refetchOnWindowFocus: false,
  })

/** Gated on the manage flag as well as the id. `GET /orgs/<id>/brand-kit` is
 *  `can_manage_org_required`, so a non-manager would get a 403 — and the rule
 *  is that the request is **never issued**, not that the error is swallowed.
 *  Beyond the status code: a brand kit is an internal working document for an
 *  organisation's own communications, not part of its public identity, so an
 *  empty or errored card would advertise a surface the reader can never use
 *  (04-UI-SPEC.md S6). */
export const useBrandKit = (orgId?: string, canEdit?: boolean) =>
  useQuery({
    queryKey: ['brandKit', orgId],
    queryFn: () => api.brandKit(orgId!),
    enabled: !!orgId && !!canEdit,
  })

// ---- Mutations ----
export const useUpdateEvent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; payload: any }) => api.updateEvent(v.id, v.payload),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['event', id] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export const useCancelEvent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.cancelEvent(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['event', id] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export const useUpdateProfile = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { city?: string }) => api.updateProfile(data),
    onSuccess: () => {
      // no-op, rely on the component calling updateCurrentUser from AuthCtx
    },
  })
}

export const useRegister = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; referredBy?: string }) => api.joinEvent(v.id, v.referredBy),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['event', id] })
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['my-registrations'] })
      qc.invalidateQueries({ queryKey: ['announcements', id] })
    },
  })
}

export const useUnregister = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.leaveEvent(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['event', id] })
      qc.invalidateQueries({ queryKey: ['my-registrations'] })
      qc.invalidateQueries({ queryKey: ['announcements', id] })
    },
  })
}

export const useSubmitProposal = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => api.submitProposal(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proposals'] }),
  })
}

export const useDecision = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; decision: string; note: string }) =>
      api.decision(v.id, v.decision, v.note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] })
      qc.invalidateQueries({ queryKey: ['events'] })
      // An approval is what can complete an org's local+regional pair, and the
      // server writes the unlock row in the same transaction. Without this the
      // fest card stays locked and the sponsorship banner stays absent until a
      // manual reload — the two states PROG-01 and PROG-03 exist to show.
      qc.invalidateQueries({ queryKey: ['orgProgression'] })
    },
  })
}

export const useCheckIn = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; ids: string[] }) => api.checkIn(v.id, v.ids),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['roster', v.id] }),
  })
}

export const useRespondCollab = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { activityId: string; collabId: string; status: 'accepted' | 'declined' }) =>
      api.respondCollab(data.activityId, data.collabId, data.status),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['event', v.activityId] }),
  })
}

export const useReassignMeetupHead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { activityId: string; newUserId: string }) =>
      api.reassignMeetupHead(data.activityId, data.newUserId),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['event', v.activityId] }),
  })
}

export const useScanQr = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; registration_id?: string; qr_token?: string }) => 
      api.scanQr(v.id, (v.registration_id || v.qr_token)!),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['roster', v.id] }),
  })
}


export const useSubmitExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: any) => api.submitExpense(payload),
    onSuccess: (_d, payload: any) => {
      qc.invalidateQueries({ queryKey: ['expenses', payload.activity_id] })
      qc.invalidateQueries({ queryKey: ['reimbursements'] })
    },
  })
}

export const useVerifyExpense = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.verifyExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reimbursements'] })
    },
  })
}

export const useUpdateExpenseAmount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount }: { id: string, amount: number }) => api.updateExpenseAmount(id, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reimbursements'] })
    },
  })
}

export const useBroadcast = () =>
  useMutation({
    mutationFn: (v: { id: string; title: string; body: string }) =>
      api.broadcast(v.id, v.title, v.body),
  })

export const useAnnouncements = (id?: string) =>
  useQuery({ queryKey: ['announcements', id], queryFn: () => api.announcements(id!), enabled: !!id })

export const usePostAnnouncement = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; body: string }) => api.postAnnouncement(v.id, v.body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['announcements', v.id] })
  })
}

export const useMarkNotificationsRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.markNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] })
  })
}

export const useClearNotifications = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.clearNotifications(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] })
  })
}

export const useDeleteNotification = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] })
  })
}

export const useCreateOrg = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      data:
        | FormData
        | {
            name: string
            type?: string
            city?: string
            category?: string
            tagline?: string
            description?: string
            logo_url?: string
            banner_url?: string
          },
    ) => api.createOrg(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orgs'] })
      qc.invalidateQueries({ queryKey: ['societies'] })
      qc.invalidateQueries({ queryKey: ['houses'] })
    },
  })
}

export const useAssignPor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { orgId: string; user_id: string; por_type: string; term?: string; region_id?: string }) =>
      api.assignPor(v.orgId, { user_id: v.user_id, por_type: v.por_type, term: v.term, region_id: v.region_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pors'] }),
  })
}

export const useDeactivatePor = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (porId: string) => api.deactivatePor(porId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pors'] }),
  })
}

export const useConfirmAcademicStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { academicLevel: string; academicStatus: string }) =>
      api.confirmAcademicStatus(v.academicLevel, v.academicStatus),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] })
  })
}

/* Every profile write invalidates ['orgs'] as well as the profile itself:
 * /admin/orgs renders logos and names from those same rows and would otherwise
 * keep showing a stale one. */

export const useUpdateOrgProfile = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; payload: { bio?: string; logo_url?: string | null } }) =>
      api.updateOrgProfile(v.id, v.payload),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['orgProfile', id] })
      qc.invalidateQueries({ queryKey: ['orgs'] })
    },
  })
}

export const useReplaceSocialLinks = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      id: string
      payload: { links: { platform: string; url: string }[]; website?: string | null }
    }) => api.replaceSocialLinks(v.id, v.payload),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['orgProfile', id] })
      qc.invalidateQueries({ queryKey: ['orgs'] })
    },
  })
}

export const useUploadOrgLogo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; file: File }) => api.uploadOrgLogo(v.id, v.file),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['orgProfile', id] })
      qc.invalidateQueries({ queryKey: ['orgs'] })
    },
  })
}

export const useSaveBrandKit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      id: string
      payload: {
        voice_tone?: string | null
        palette?: string[]
        sample_phrases?: string[]
        source?: 'manual' | 'ai_draft'
      }
    }) => api.saveBrandKit(v.id, v.payload),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['brandKit', id] })
      qc.invalidateQueries({ queryKey: ['orgProfile', id] })
      qc.invalidateQueries({ queryKey: ['orgs'] })
    },
  })
}

/** Deliberately invalidates nothing. The draft persists no server state, so
 *  there is nothing to refresh — and refetching the saved kit here would
 *  overwrite the draft sitting in the form, which is the exact opposite of
 *  ORG-04's "nothing applies until they explicitly save it". */
export const useDraftBrandKit = () =>
  useMutation({
    mutationFn: (v: { id: string; signal?: AbortSignal }) => api.draftBrandKit(v.id, v.signal),
  })

export const useAdminOverrideAcademicStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { userId: string; academicLevel: string; academicStatus: string; reason?: string }) =>
      api.adminOverrideAcademicStatus(v.userId, v.academicLevel, v.academicStatus, v.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    }
  })
}

// Phase 5: Schedule hooks (DESIGN-01)
export const useScheduleItems = (activityId?: string) =>
  useQuery({
    queryKey: ['schedule', activityId],
    queryFn: () => api.scheduleItems(activityId!),
    enabled: !!activityId,
  })

/** Scale presets are static reference data — no refetch interval, and no
 *  loading state worth rendering; the accordion simply is not there until the
 *  catalogue arrives (DESIGN-01 / AC-07). */
export const useSchedulePresets = (scale?: string) =>
  useQuery({
    queryKey: ['schedule-presets', scale],
    queryFn: () => api.schedulePresets(scale!),
    enabled: !!scale,
  })

export const useCreateScheduleItem = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: { title: string; timeBlock?: string | null; position?: number | null; notes?: string | null }) =>
      api.createScheduleItem(activityId!, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', activityId] }),
  })
}

export const useUpdateScheduleItem = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { itemId: string; patch: { title?: string | null; timeBlock?: string | null; position?: number | null; notes?: string | null } }) =>
      api.updateScheduleItem(activityId!, v.itemId, v.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', activityId] }),
  })
}

export const useDeleteScheduleItem = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => api.deleteScheduleItem(activityId!, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', activityId] }),
  })
}

// Phase 5: Campaign package + custom registration fields (CAMPAIGN-04/05)
export const useCampaign = (activityId?: string) =>
  useQuery({
    queryKey: ['campaign', activityId],
    queryFn: () => api.campaign(activityId!),
    enabled: !!activityId,
  })

export const useGenerateSlug = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.generateSlug(activityId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', activityId] }),
  })
}

/** Publish the campaign (CAMPAIGN-06). Invalidates the task list as well as the
 *  campaign: the workspace is gated on the campaign being live, so its 403 has
 *  to be re-evaluated the moment publication succeeds. */
export const usePushLive = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.pushLive(activityId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', activityId] })
      qc.invalidateQueries({ queryKey: ['tasks', activityId] })
    },
  })
}

/** Attach a poster (CAMPAIGN-03). Invalidating the campaign is what redraws
 *  both the thumbnail and the pipeline stepper's Poster step, since the
 *  completeness flags are the server's and are only ever read from that payload. */
export const useUploadPoster = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => api.uploadPoster(activityId!, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', activityId] }),
  })
}

/** Draft the campaign mail (CAMPAIGN-01). Invalidating the campaign is what
 *  redraws both the editor and the stepper's Mail step — `completeness.mail` is
 *  the server's flag and is only ever read from that payload. The mutation's own
 *  `data.degraded` is what the amber banner reads: it describes the generation
 *  that just happened and is deliberately not persisted on the campaign row,
 *  since a reload should show the draft, not a stale complaint about it. */
export const useGenerateMail = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.generateMail(activityId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', activityId] }),
  })
}

/** Persist an edited mail subject or body. */
export const useSaveMail = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { mailSubject?: string; mailBody?: string }) =>
      api.saveMail(activityId!, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', activityId] }),
  })
}

export const useFormFields = (activityId?: string) =>
  useQuery({
    queryKey: ['form-fields', activityId],
    queryFn: () => api.formFields(activityId!),
    enabled: !!activityId,
  })

export const useCreateFormField = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (field: { label: string; fieldType: string; options?: string[]; required?: boolean; position?: number }) =>
      api.createFormField(activityId!, field),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-fields', activityId] }),
  })
}

export const useUpdateFormField = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { fieldId: string; patch: Partial<ApiFormField> }) =>
      api.updateFormField(activityId!, v.fieldId, v.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-fields', activityId] }),
  })
}

export const useDeleteFormField = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldId: string) => api.deleteFormField(activityId!, fieldId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['form-fields', activityId] }),
  })
}

// Phase 5: Kanban task board (TEAM-02).
//
// None of these hooks sets a refetch option. The board is fetched on page load
// and after a mutation invalidates it — nothing else (AC-35). The default
// QueryClient in main.tsx has no interval either, and
// `src/__tests__/no-kanban-polling.test.ts` fails the build if one appears.
export const useTasks = (activityId?: string) =>
  useQuery({
    queryKey: ['tasks', activityId],
    queryFn: () => api.tasks(activityId!),
    enabled: !!activityId,
  })

export const useCreateTask = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draft: { title: string; assigneeId?: string | null; deadline?: string | null; status?: string }) =>
      api.createTask(activityId!, draft),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', activityId] }),
  })
}

export const useUpdateTask = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { taskId: string; patch: Partial<ApiTask> }) =>
      api.updateTask(activityId!, v.taskId, v.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', activityId] }),
  })
}

export const useDeleteTask = (activityId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => api.deleteTask(activityId!, taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', activityId] }),
  })
}
export const useSubscribeToCityAlert = () => {
  return useMutation({
    mutationFn: (v: { email: string; city: string }) => api.subscribeCityAlert(v),
  })
}

export const usePendingProposalsCount = () => useQuery({ queryKey: ['proposals', 'pending'], queryFn: () => api.proposals('pending'), select: (data) => data.length })

export const useSearchUsers = (q: string) => {
  return useQuery({
    queryKey: ['users', 'search', q],
    queryFn: () => api.searchUsers(q),
    enabled: q.length > 2
  })
}

export const useInviteFriend = () => {
  return useMutation({
    mutationFn: (v: { eventId: string; userId: string }) => api.inviteFriend(v.eventId, v.userId)
  })
}

// ---------------------------------------------------------------------------
// Phase 6: Event Execution & Close-Out
// ---------------------------------------------------------------------------

/** TIMELINE-01: ordered chronological projection for an event. */
export const useTimeline = (id?: string) =>
  useQuery({
    queryKey: ['timeline', id],
    queryFn: () => api.timeline(id!),
    enabled: !!id,
  })

/** REIMB-01/02: draft expense rows + optional Meetup Head submit. */
export const useDraftExpensesMutation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      activityId,
      body,
    }: {
      activityId: string
      body: { expenses: object[]; submit?: boolean; social_post_url?: string }
    }) => api.draftExpenses(activityId, body),
    onSuccess: (_, { activityId }) =>
      qc.invalidateQueries({ queryKey: ['expenses', activityId] }),
  })
}

/** REIMB-01: attach a receipt or invoice, before the row is drafted or after. */
export const useUploadExpenseBill = () =>
  useMutation({
    mutationFn: ({ activityId, file }: { activityId: string; file: File }) =>
      api.uploadExpenseBill(activityId, file),
  })

/** FEEDBACK-01: auto-save challenges/learnings on blur; Meetup Head submit. */
export const usePatchReportMutation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      activityId,
      patch,
    }: {
      activityId: string
      patch: { challenges?: string | null; learnings?: string | null; status?: string }
    }) => api.patchReport(activityId, patch),
    onSuccess: (_, { activityId }) =>
      qc.invalidateQueries({ queryKey: ['report', activityId] }),
  })
}

/** FEEDBACK-02: attendee submits a 1-5 star rating after attending. */
export const useSubmitFeedbackMutation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      activityId,
      body,
    }: {
      activityId: string
      body: { rating: number; comment?: string }
    }) => api.submitFeedback(activityId, body),
    onSuccess: (_, { activityId }) =>
      qc.invalidateQueries({ queryKey: ['my-feedback', activityId] }),
  })
}

/** FEEDBACK-02: check own submission; returns {submitted: false} when none. */
export const useMyFeedback = (id?: string) =>
  useQuery({
    queryKey: ['my-feedback', id],
    queryFn: () => api.myFeedback(id!),
    enabled: !!id,
  })
