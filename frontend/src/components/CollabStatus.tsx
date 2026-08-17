import { Badge } from './ui'
import type { CollabStatus as CollabStatusValue } from '../lib/types'

const TONE: Record<CollabStatusValue, 'success' | 'danger' | 'warn'> = {
  accepted: 'success',
  declined: 'danger',
  pending: 'warn',
}

const LABEL: Record<CollabStatusValue, string> = {
  accepted: 'Accepted',
  declined: 'Declined',
  pending: 'Pending',
}

/**
 * PROPOSAL-06: a collaborator's accept/decline state must never be encoded in
 * text color alone (invisible to a colour-blind organiser) — always a Badge
 * (background + border + label), never a bare coloured string.
 */
export default function CollabStatus({ status }: { status: CollabStatusValue }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>
}
