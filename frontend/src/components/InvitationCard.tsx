import { Link } from 'react-router-dom'
import { Badge, Button } from './ui'

/**
 * PROPOSAL-06 (S5/S6): the discoverable surface for a pending collaboration
 * invite. The backend deliberately does not embed accept/decline data in the
 * notification payload — it routes to the event detail page, where the real
 * respond buttons live (see proposal_service._notify_collab_invite). This
 * card is that route's entry point, shown in the notifications dropdown and
 * on the organiser dashboard so an invited org's Secretary can find it.
 */
export default function InvitationCard({
  activityId,
  activityTitle,
  onNavigate,
}: {
  activityId: string
  activityTitle: string
  onNavigate?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <Badge tone="gold">Collaboration invite</Badge>
        </div>
        <div className="truncate text-[14px] font-semibold text-offwhite">{activityTitle}</div>
        <div className="text-caption text-graytext-mid">Accept or decline from the event page.</div>
      </div>
      <Link to={`/events/${activityId}`} onClick={onNavigate} className="shrink-0">
        <Button size="sm">View</Button>
      </Link>
    </div>
  )
}
