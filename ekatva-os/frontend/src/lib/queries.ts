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

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard })

export const useCities = () =>
  useQuery({ queryKey: ['cities'], queryFn: api.cities })

export const useOrgs = () =>
  useQuery({ queryKey: ['orgs'], queryFn: api.orgs })

export const usePors = () =>
  useQuery({ queryKey: ['pors'], queryFn: api.pors })

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
