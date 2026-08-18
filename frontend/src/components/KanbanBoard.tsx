import { useState } from 'react'
import { Badge, Button, Card, Input, Select } from './ui'
import { cx, daysUntil } from '../lib/format'
import type { ApiTask, ApiTaskStatus } from '../lib/types'

/* KanbanBoard — TEAM-02 / UI-SPEC §2.4 (E4).
 *
 * Three columns, driven entirely by the `statuses` prop the page reads off the
 * campaign payload. Nothing here writes a status string down: TaskSchema
 * validates an incoming status against the server's tuple, so a column set
 * assembled in the browser could offer an option the server answers 422 to.
 * The per-column styling is keyed on POSITION in that server-declared list
 * rather than on the value, for the same reason.
 *
 * No drag-and-drop (D-09): the project has no dnd library and Phase 5 adds no
 * dependency. A card's status changes from a Select on the card itself, which
 * sends the status alone — a whole-card patch would let a stale render
 * overwrite a concurrent title edit (T-05-47).
 *
 * There is no polling and no socket here; `no-kanban-polling.test.ts` is what
 * keeps it that way (AC-35).
 */

export interface KanbanTeamMember {
  userId: string
  name: string
  role: string
}

export interface KanbanTaskDraft {
  title: string
  assigneeId: string | null
  deadline: string | null
}

/** Column chrome, applied by index into the server's declared status order.
 *  Position, not value — the styling must not become a second copy of the
 *  status strings. A fourth status would render with the last entry's chrome
 *  rather than crash, which is the failure mode worth having. */
const COLUMN_TONES = [
  { body: '', header: 'text-offwhite' },
  { body: 'bg-teal-deep/20', header: 'text-teal' },
  { body: 'bg-white/[0.02]', header: 'text-graytext-light' },
]

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

/** Overdue is red, due today is amber, everything else is muted. `daysUntil`
 *  is the existing helper and already answers 'Past' / 'Today'. */
function deadlineTone(label: string) {
  if (label === 'Past') return 'text-red-300'
  if (label === 'Today') return 'text-amber-300'
  return 'text-graytext-mid'
}

function TaskCard({
  task,
  statuses,
  assignee,
  onUpdate,
  onDelete,
}: {
  task: ApiTask
  statuses: ApiTaskStatus[]
  assignee?: KanbanTeamMember
  onUpdate: (taskId: string, patch: { status: string }) => void
  onDelete: (taskId: string) => void
}) {
  const deadlineLabel = task.deadline ? daysUntil(task.deadline) : null

  return (
    <Card hover className="p-4 hover:border-teal/30">
      <div className="flex items-start gap-2">
        {/* The full title rides in a `title` attribute because the visible text
            clamps to two lines — a clamped title with no tooltip is a card
            nobody can read (E4 long-text). */}
        <div
          title={task.title}
          className="line-clamp-2 flex-1 text-body font-medium text-offwhite"
        >
          {task.title}
        </div>
        <button
          type="button"
          aria-label="Delete task"
          onClick={() => onDelete(task.id)}
          className="shrink-0 rounded-full p-1 text-graytext-mid transition-colors hover:bg-white/5 hover:text-red-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {assignee && (
        <div className="mt-3 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-deep text-[10px] font-bold text-teal">
            {initials(assignee.name)}
          </span>
          {/* Name and role render exactly as the server sent them. */}
          <span className="text-caption text-graytext-light">
            {assignee.name} · {assignee.role}
          </span>
        </div>
      )}

      {deadlineLabel && (
        <div className={cx('mt-2 text-caption', deadlineTone(deadlineLabel))}>{deadlineLabel}</div>
      )}

      <Select
        className="mt-3"
        ariaLabel="Task status"
        value={task.status}
        options={statuses}
        onChange={(e) => onUpdate(task.id, { status: e.target.value })}
      />
    </Card>
  )
}

function AddTaskRow({
  teamMembers,
  onCreate,
}: {
  teamMembers: KanbanTeamMember[]
  onCreate: (draft: KanbanTaskDraft) => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [deadline, setDeadline] = useState('')

  const close = () => {
    setOpen(false)
    setTitle('')
    setAssigneeId('')
    setDeadline('')
  }

  if (!open)
    return (
      <Button variant="ghost" size="sm" className="mt-1 self-start" onClick={() => setOpen(true)}>
        + Add task
      </Button>
    )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onCreate({
      title: title.trim(),
      assigneeId: assigneeId || null,
      deadline: deadline || null,
    })
    close()
  }

  return (
    <form onSubmit={submit} className="mt-1 animate-fade-up space-y-2">
      <Input
        autoFocus
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Select
        ariaLabel="Assignee"
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        options={[
          { value: '', label: 'Unassigned' },
          ...teamMembers.map((m) => ({ value: m.userId, label: `${m.name} · ${m.role}` })),
        ]}
      />
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="Deadline"
          className="w-36"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            Add
          </Button>
        </div>
      </div>
    </form>
  )
}

export function KanbanBoard({
  tasks,
  teamMembers,
  statuses,
  isLoading,
  isError,
  onRetry,
  onCreate,
  onUpdate,
  onDelete,
}: {
  tasks: ApiTask[]
  teamMembers: KanbanTeamMember[]
  statuses: ApiTaskStatus[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onCreate: (draft: KanbanTaskDraft) => void
  onUpdate: (taskId: string, patch: { status: string }) => void
  onDelete: (taskId: string) => void
}) {
  const memberById = new Map(teamMembers.map((m) => [m.userId, m]))

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-3">
      {statuses.map((status, index) => {
        const tone = COLUMN_TONES[Math.min(index, COLUMN_TONES.length - 1)]
        const columnTasks = isLoading ? [] : tasks.filter((t) => t.status === status.value)

        return (
          /* The named <section> is the landmark (UI-SPEC §7) — `Card` accepts
             only children, className, hover and onClick, so the accessible name
             cannot live on it. */
          <section key={status.value} aria-label={status.label} className="flex">
            <Card
              className={cx(
                'flex min-h-[400px] w-full flex-col gap-3 overflow-y-auto p-4',
                tone.body,
              )}
            >
            <div className="mb-3 flex items-center gap-2">
              <h3 className={cx('text-h3 font-semibold', tone.header)}>{status.label}</h3>
              <Badge tone="neutral">
                {columnTasks.length === 1 ? '1 task' : `${columnTasks.length} tasks`}
              </Badge>
              {isError && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="ml-auto text-caption text-teal hover:underline"
                >
                  Retry
                </button>
              )}
            </div>

            {isLoading ? (
              <>
                <div className="h-20 animate-pulse rounded-xl bg-white/5" />
                <div className="h-20 animate-pulse rounded-xl bg-white/5" />
              </>
            ) : columnTasks.length === 0 ? (
              /* Compact caption, not the full EmptyState card — three empty
                 EmptyStates side by side read as three failures (E4 empty). */
              <div className="p-6 text-center text-caption text-graytext-light">
                No tasks here yet
              </div>
            ) : (
              columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  statuses={statuses}
                  assignee={task.assigneeId ? memberById.get(task.assigneeId) : undefined}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))
            )}

            {/* D-10: new cards are only created in the first column, which is
                where the server's default status puts them anyway. */}
            {index === 0 && !isLoading && (
              <AddTaskRow teamMembers={teamMembers} onCreate={onCreate} />
            )}
            </Card>
          </section>
        )
      })}
    </div>
  )
}
