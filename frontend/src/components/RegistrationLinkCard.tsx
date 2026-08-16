/**
 * RegistrationLinkCard — the shareable registration link (CAMPAIGN-04, D-11).
 *
 * Design contract: UI-SPEC §2.6 / E6. An inline card, not a modal: the link is
 * something an organiser glances at and copies, and a dialog would put a
 * dismissal between them and a paste.
 *
 * The layout and the copy-then-toast gesture are lifted from the "Share invite
 * link" block in `pages/EventDetail.tsx`. One thing is deliberately different:
 * the clipboard is handed the `registrationUrl` PROP, never the rendered text
 * and never a link this module builds out of the browser's own address.
 *
 *   - The rendered URL is clipped by `truncate max-w-[400px]`, so reading it
 *     back would copy a visibly-correct link that resolves to nothing.
 *   - The URL shape is the server's to own (D-12): it becomes a published
 *     contract the moment the link is shared, and a browser-assembled copy
 *     would differ on every host the app is served from.
 *
 * The spec beside this file reads the source to keep both halves true, so the
 * forbidden expression is described here rather than spelled out.
 */
import { Button, Card, useToast } from './ui'

export interface RegistrationLinkCardProps {
  /** The server's assembled URL, or null before a slug has been minted. */
  registrationUrl: string | null
  onGenerate: () => Promise<unknown>
  generating: boolean
}

export function RegistrationLinkCard({
  registrationUrl,
  onGenerate,
  generating,
}: RegistrationLinkCardProps) {
  const { addToast } = useToast()

  const handleCopy = async () => {
    if (!registrationUrl) return
    await navigator.clipboard.writeText(registrationUrl)
    addToast('Link copied!', 'success')
  }

  const handleGenerate = async () => {
    try {
      await onGenerate()
    } catch {
      addToast('Failed to generate link. Try again.', 'error')
    }
  }

  return (
    <Card className="p-5 flex items-center gap-4">
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#5CE6C9"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>

      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-caption uppercase tracking-wider text-graytext-light">
          Registration Link
        </span>
        {registrationUrl ? (
          <span className="text-teal text-[13px] font-mono truncate max-w-[400px]">
            {registrationUrl}
          </span>
        ) : (
          <span className="text-graytext-mid text-[13px]">—</span>
        )}
      </div>

      {registrationUrl ? (
        <Button
          variant="secondary"
          size="sm"
          aria-label="Copy registration link"
          onClick={handleCopy}
        >
          Copy
        </Button>
      ) : (
        <Button variant="primary" size="sm" disabled={generating} onClick={handleGenerate}>
          {generating ? (
            <span className="flex items-center gap-2">
              <svg
                aria-hidden="true"
                className="animate-spin"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 3a9 9 0 1 0 9 9" />
              </svg>
              Generating…
            </span>
          ) : (
            'Generate Link'
          )}
        </Button>
      )}
    </Card>
  )
}
