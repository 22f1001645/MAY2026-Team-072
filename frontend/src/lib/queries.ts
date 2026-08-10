import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

/* TanStack Query hooks — server cache, retries, and invalidation on mutation
 * (Milestone 2 §7: server state lives here, never duplicated in UI state). */

// ---- Queries ----
export const useEvents = (city?: string) =>
  useQuery({ queryKey: ['events', city], queryFn: () => api.events(city) })

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
  useQuery({ queryKey: ['proposals', status], queryFn: () => api.proposals(status) })

export const useAudit = (id?: string) =>
  useQuery({ queryKey: ['audit', id], queryFn: () => api.audit(id!), enabled: !!id })

export const useExpensesFor = (id?: string) =>
  useQuery({ queryKey: ['expenses', id], queryFn: () => api.expensesFor(id!), enabled: !!id })

export const useReimbursements = () =>
  useQuery({ queryKey: ['reimbursements'], queryFn: api.reimbursements })

export const useAnalytics = () =>
  useQuery({ queryKey: ['analytics'], queryFn: api.analytics })

export const useHeatmap = () =>
  useQuery({ queryKey: ['analytics-heatmap'], queryFn: api.analyticsHeatmap })

export const useTopOrganisers = () =>
  useQuery({ queryKey: ['analytics-organisers'], queryFn: api.analyticsOrganisers })

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

export const usePaginatedPors = (page: number, limit: number, active: string, orgType: string) =>
  useQuery({
    queryKey: ['pors-paginated', page, limit, active, orgType],
    queryFn: () => api.paginatedPors(page, limit, active, orgType),
  })

export const useUsers = (q?: string) =>
  useQuery({ queryKey: ['users', q], queryFn: () => api.users(q) })

export const useFilteredUsers = (q: string, filters?: { academic_level?: string; academic_status?: string; city?: string }) => {
  return useQuery({
    queryKey: ['users', q, filters],
    queryFn: () => api.users(q, filters),
    enabled: true,
  })
}

export const usePointsConfig = () => useQuery({
  queryKey: ['pointsConfig'],
  queryFn: () => api.getPointsConfig(),
})

export const useConstants = () => useQuery({
  queryKey: ['constants'],
  queryFn: api.constants,
  staleTime: Infinity, // config doesn't change often
})

export const useCollaborators = (activityId?: string) => useQuery({
  queryKey: ['collaborators', activityId],
  queryFn: () => api.getCollaborators(activityId!),
  enabled: !!activityId,
})

export const useOrgProgression = (orgId?: string, city?: string) => useQuery({
  queryKey: ['progression', orgId, city],
  queryFn: () => api.getOrgProgression(orgId!, city!),
  enabled: !!orgId && !!city,
})

// ---- Mutations ----
export const useRegister = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.joinEvent(id),
    onSuccess: (_d, id) => {
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
    mutationFn: ({ id, decision, note }: { id: string; decision: string; note: string }) =>
      api.decision(id, decision, note),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['proposals'] })
      qc.invalidateQueries({ queryKey: ['audit', id] })
    },
  })
}

export const useReassignHead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, new_head_user_id }: { id: string; new_head_user_id: string }) =>
      api.reassignHead(id, new_head_user_id),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['proposals'] })
      qc.invalidateQueries({ queryKey: ['audit', id] })
    }
  })
}

export const useCheckIn = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; ids: string[] }) => api.checkIn(v.id, v.ids),
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

export const useUpdateAcademicStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: { academic_level?: string; academic_status?: string } }) =>
      api.updateAcademicStatus(userId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

export const useUpdatePointsConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<{ attended: number; organised: number; volunteered: number }>) =>
      api.updatePointsConfig(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pointsConfig'] })
    }
  })
}
