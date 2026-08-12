import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from './api'

/* TanStack Query hooks — server cache, retries, and invalidation on mutation
 * (Milestone 2 §7: server state lives here, never duplicated in UI state). */

// ---- Queries ----
export const useCapabilities = () =>
  useQuery({ queryKey: ['me'], queryFn: () => api.me(), staleTime: 5 * 60 * 1000, select: (data) => data.capabilities })

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
