import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from './api'

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

export const useEvents = (city?: string) =>
  useQuery({ queryKey: ['events', city], queryFn: () => api.events(city), placeholderData: keepPreviousData })

export const useEvent = (id?: string) =>
  useQuery({ queryKey: ['event', id], queryFn: () => api.event(id!), enabled: !!id })

export const useMyRegistrations = () =>
  useQuery({ queryKey: ['my-registrations'], queryFn: api.myRegistrations })

export const useRoster = (id?: string) =>
  useQuery({ queryKey: ['roster', id], queryFn: () => api.roster(id!), enabled: !!id })

export const useLeaderboard = (city?: string) =>
  useQuery({ queryKey: ['leaderboard', city], queryFn: () => api.leaderboard(city) })

export const useMyPoints = () =>
  useQuery({ queryKey: ['my-points'], queryFn: api.myPoints })

export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: api.notifications })

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

export const useUsers = (q?: string) =>
  useQuery({ queryKey: ['users', q], queryFn: () => api.users(q) })

// ---- Phase 4: organisation profile & brand kit (ORG-01…ORG-04) ----

export const useOrgProfile = (orgId?: string) =>
  useQuery({
    queryKey: ['orgProfile', orgId],
    queryFn: () => api.orgProfile(orgId!),
    enabled: !!orgId,
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
export const useRegister = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; referredBy?: string }) => api.joinEvent(v.id, v.referredBy),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['event', id] })
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['my-registrations'] })
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
    mutationFn: (v: { id: string; registration_id: string }) => api.scanQr(v.id, v.registration_id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['roster', v.id] }),
  })
}

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

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: (data: { city?: string }) => api.updateProfile(data),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reimbursements'] }),
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

export const useCreateOrg = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; type: string; city: string }) => api.createOrg(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orgs'] }),
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
