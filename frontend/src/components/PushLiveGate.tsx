/**
 * PushLiveGate — the campaign's publish step (UI-SPEC §2.7 / E7, D-06 / D-07).
 *
 * The gate is visible to every crew member and operable by one: D-07 chose a
 * blocked button over a hidden one so the rule reads as a rule rather than as
 * a missing feature. That choice only pays off if the block is `aria-disabled`
 * — a `disabled` button drops out of the tab order and takes its native
 * tooltip with it, leaving a keyboard user exactly as uninformed as a hidden
 * button would have (UI-SPEC §7, threat T-05-42).
 *
 * `isMeetupHead` arrives from the server (campaign_service.campaign_state) and
 * is rendering data only. It is deliberately NOT derived from the manage
 * capability, which answers "may this person manage the activity" — true for
 * every crew member — and would enable the button for exactly the people the
 * server is about to refuse (T-05-16). The enforcement is
 * `meetup_head_required` on the route, which refuses regardless of what this
 * component renders.
 *
 * Publishing is irreversible, so the mutation fires only from the confirmation
 * dialog, never from the first click (T-05-40).
 */
import { useState } from 'react'

import { Badge, Button, Card, Dialog, useToast } from './ui'
import { ApiError } from '../lib/api'
import { formatDate } from '../lib/format'
import { CAMPAIGN_LIVE } from '../lib/types'

export interface PushLiveGateProps {
  status: string
  isMeetupHead: boolean
  pushedLiveAt: string | null
  onPushLive: () => Promise<unknown>
  publishing: boolean
}

export function PushLiveGate({
  status,
  isMeetupHead,
  pushedLiveAt,
  onPushLive,
  publishing,
}: PushLiveGateProps) {
  const [confirming, setConfirming] = useState(false)
  const { addToast } = useToast()

  if (status === CAMPAIGN_LIVE) {
    return (
      <div className="flex items-center gap-3">
        <Badge tone="success">Campaign Live ✓</Badge>
        {pushedLiveAt && (
          <span className="text-body text-graytext-light">
            Pushed live on {formatDate(pushedLiveAt)}
          </span>
        )}
      </div>
    )
  }

  const handleConfirm = async () => {
    try {
      await onPushLive()
      setConfirming(false)
    } catch (err) {
      // The dialog closes on failure so the gate button is reachable again —
      // a modal left open over a dead Confirm is a control the organiser can
      // neither use nor escape from meaningfully (E7 `error`).
      setConfirming(false)
      const is403 = err instanceof ApiError && err.status === 403
      addToast(
        is403
          ? 'Only the Meetup Head can publish'
          : (err as Error)?.message ?? 'Could not publish. Try again.',
        'error',
      )
    }
  }

  return (
    <Card className="border border-teal/20 bg-teal-deep/10 p-6">
      <h2 className="text-h3 text-gold">Ready to go live?</h2>
      <p className="mt-1 text-body text-graytext-light">
        Publishing makes the event visible to students and opens registration.
        The team workspace activates at the same moment.
      </p>

      <div className="mt-4">
        {isMeetupHead ? (
          <Button
            id="campaign-push-live"
            variant="primary"
            size="lg"
            onClick={() => setConfirming(true)}
          >
            Push Live
          </Button>
        ) : (
          <div title="Only the Meetup Head can publish" className="inline-block">
            <Button
              id="campaign-push-live"
              variant="primary"
              size="lg"
              aria-disabled="true"
              className="opacity-40"
              onClick={() => {}}
            >
              Push Live
            </Button>
            <p className="mt-2 text-caption text-graytext-mid">
              This action requires the assigned Meetup Head.
            </p>
          </div>
        )}
      </div>

      <Dialog open={confirming} onClose={() => setConfirming(false)} title="Publish Campaign?">
        <p className="text-body text-graytext-light">
          This will make the event visible to students. The Kanban workspace will activate.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={publishing}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={publishing}>
            {publishing ? 'Publishing…' : 'Confirm'}
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}
