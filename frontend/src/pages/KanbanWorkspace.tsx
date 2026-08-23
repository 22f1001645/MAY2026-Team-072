/**
 * KanbanWorkspace — /events/:id/workspace
 *
 * Phase 5, Plan 05-09 (TEAM-01, TEAM-02). The team's task board, backed by the
 * routes plan 05-04 shipped, replacing the mock array in lib/mock.ts that was
 * never persisted.
 *
 * The 403 `campaign_not_live` is an EXPECTED state here, not a fault: TEAM-01's
 * whole point is that the board is inert until the Meetup Head publishes. It
 * gets its own explanatory branch with a route into the campaign builder, so an
 * organiser who opens the workspace early is told what to do rather than shown
 * a failure they cannot act on. Every other error is a real error.
 *
 * The board's three columns come from the campaign payload's `taskStatuses`.
 * There is no client-side status list, and no polling — the board is fetched on
 * page load and after a mutation invalidates it (AC-35).
 *
 * Route: /events/:id/workspace (OD-4 — matches /events/:id/campaign and the
 * rest of the organiser route block; UI-SPEC §4's `/activities/...` heading is
 * an erratum).
 */
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'

import { KanbanBoard } from '../components/KanbanBoard'
import { ErrorState, Loading } from '../components/states'
import { Badge, Button, Card, SectionTitle, useToast } from '../components/ui'
import { ApiError } from '../lib/api'
import {
  useCampaign,
  useCreateTask,
  useDeleteTask,
  useEvent,
  useTasks,
  useUpdateTask,
} from '../lib/queries'
import { CAMPAIGN_LIVE } from '../lib/types'

export default function KanbanWorkspace() {
  const { id } = useParams()
  const { addToast } = useToast()

  const { data: event, isLoading, isError, error } = useEvent(id)
  const campaignQuery = useCampaign(id)
  const tasksQuery = useTasks(id)

  const createTask = useCreateTask(id)
  const updateTask = useUpdateTask(id)
  const deleteTask = useDeleteTask(id)

  const taskError = tasksQuery.error
  const notLive = taskError instanceof ApiError && taskError.code === 'campaign_not_live'

  // One toast for a genuine failure. The pre-publication 403 gets an
  // explanation instead — toasting it would report an expected state as a fault.
  useEffect(() => {
    if (tasksQuery.isError && !notLive) addToast('Failed to load tasks', 'error')
  }, [tasksQuery.isError, notLive, addToast])

  if (isLoading) return <Loading label="Loading workspace…" />
  if (isError) return <ErrorState error={error} />
  if (!event) return <div>Event not found</div>

  const isLive = campaignQuery.data?.status === CAMPAIGN_LIVE
  const teamMembers = (event.teamMembers ?? []).map((m) => ({
    userId: m.userId,
    name: m.member ?? 'Unnamed',
    role: m.role,
  }))

  return (
    <div>
      <Link
        to={`/events/${event.id}/manage`}
        className="mb-4 inline-block text-[13px] text-graytext-light hover:text-teal"
      >
        ← Manage event
      </Link>
      <SectionTitle
        eyebrow="Team Workspace"
        title="Task Board"
        sub={`Manage tasks for ${event.title}`}
        right={isLive ? <Badge tone="success">Live</Badge> : undefined}
      />

      {notLive ? (
        <Card className="mx-auto max-w-lg p-10 text-center">
          <div className="text-h3 font-semibold text-offwhite">The workspace is not open yet</div>
          <p className="mt-2 text-body text-graytext-light">
            The team task board activates once the Meetup Head pushes this campaign live.
          </p>
          <Link to={`/events/${event.id}/campaign`} className="mt-6 inline-block">
            <Button variant="secondary">Open the campaign builder</Button>
          </Link>
        </Card>
      ) : tasksQuery.isError && !tasksQuery.data ? (
        /* Nothing ever arrived — there is no board to show, so the page fails.
           A failed REFETCH is different: the last good board is still on screen
           and the column header offers a retry instead of replacing it. */
        <ErrorState error={taskError} />
      ) : (
        <KanbanBoard
          tasks={tasksQuery.data ?? []}
          teamMembers={teamMembers}
          statuses={campaignQuery.data?.taskStatuses ?? []}
          isLoading={tasksQuery.isLoading || campaignQuery.isLoading}
          isError={tasksQuery.isError}
          onRetry={() => tasksQuery.refetch()}
          onCreate={(draft) => createTask.mutate(draft)}
          onUpdate={(taskId, patch) => updateTask.mutate({ taskId, patch })}
          onDelete={(taskId) => deleteTask.mutate(taskId)}
        />
      )}
    </div>
  )
}
