path = 'c:/Users/ashre/SE-PROJECT/MAY2026-Team-072/frontend/src/pages/ManageEvent.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

conflict1 = """<<<<<<< HEAD
import { TASKS } from '../lib/mock'
import { useEvent, useRoster, useBroadcast, useAnnouncements, useUpdateEvent, useCancelEvent } from '../lib/queries'
import { Badge, Button, Card, Progress, SectionTitle, Input } from '../components/ui'
=======
import { useCancelEvent, useEvent, useRoster, useUpdateEvent } from '../lib/queries'
import { Badge, Button, Card, Input, Progress, SectionTitle } from '../components/ui'
>>>>>>> c011865f4a65ec5b52f3009c7820edebe7f7c6bd"""

replacement1 = """import { useEvent, useRoster, useBroadcast, useAnnouncements, useUpdateEvent, useCancelEvent } from '../lib/queries'
import { Badge, Button, Card, Progress, SectionTitle, Input } from '../components/ui'"""

conflict2 = """<<<<<<< HEAD
  const { data: announcements = [] } = useAnnouncements(id)
  const alerts = announcements.filter((a: any) => a.isAlert)
  const [tasks, setTasks] = useState(TASKS) // v1 tasks are thin — local, not persisted
  const [tab, setTab] = useState<'roster' | 'referrers' | 'tasks' | 'alerts'>('roster')
  const [alertOpen, setAlertOpen] = useState(false)
=======
  const [tab, setTab] = useState<'roster' | 'referrers' | 'tasks'>('roster')
>>>>>>> c011865f4a65ec5b52f3009c7820edebe7f7c6bd"""

replacement2 = """  const { data: announcements = [] } = useAnnouncements(id)
  const alerts = announcements.filter((a: any) => a.isAlert)
  const [tab, setTab] = useState<'roster' | 'referrers' | 'tasks' | 'alerts'>('roster')
  const [alertOpen, setAlertOpen] = useState(false)"""

conflict3 = """<<<<<<< HEAD
  const referrersMap = roster.reduce((acc: any, r: any) => {
    if (r.referrer) {
      acc[r.referrer] = (acc[r.referrer] || 0) + 1
    }
=======
  const referrersMap = roster.reduce((acc: Record<string, number>, r: any) => {
    if (r.referrer) acc[r.referrer] = (acc[r.referrer] || 0) + 1
>>>>>>> c011865f4a65ec5b52f3009c7820edebe7f7c6bd"""

replacement3 = """  const referrersMap = roster.reduce((acc: Record<string, number>, r: any) => {
    if (r.referrer) {
      acc[r.referrer] = (acc[r.referrer] || 0) + 1
    }"""

conflict4 = """<<<<<<< HEAD
      ) : tab === 'tasks' ? (
        <Card className="p-5">
          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <button
                  onClick={() => toggle(t.id)}
                  className={cx(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors',
                    t.done ? 'border-teal bg-teal/20 text-teal' : 'border-white/20 hover:border-teal',
                  )}
                >
                  {t.done && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <div className={cx('text-[14px]', t.done ? 'text-graytext-mid line-through' : 'text-offwhite')}>
                    {t.label}
                  </div>
                </div>
                <Badge tone="teal">{t.assignee}</Badge>
              </div>
            ))}
          </div>
          <p className="mt-4 text-caption text-graytext-mid">
            Task assignment is a thin v1 slice — deepened in Phase 2 (PRD §10).
=======
      ) : (
        <Card className="p-10 text-center">
          <div className="text-h3 font-semibold text-offwhite">Team tasks moved</div>
          <p className="mx-auto mt-2 max-w-md text-body text-graytext-light">
            Tasks now live on the team workspace, where they are saved on the server and visible
            to every crew member on any device.
>>>>>>> c011865f4a65ec5b52f3009c7820edebe7f7c6bd"""

replacement4 = """) : tab === 'tasks' ? (
        <Card className="p-10 text-center">
          <div className="text-h3 font-semibold text-offwhite">Team tasks moved</div>
          <p className="mx-auto mt-2 max-w-md text-body text-graytext-light">
            Tasks now live on the team workspace, where they are saved on the server and visible
            to every crew member on any device."""

content = content.replace(conflict1, replacement1)
content = content.replace(conflict2, replacement2)
content = content.replace(conflict3, replacement3)
content = content.replace(conflict4, replacement4)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
