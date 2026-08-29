/**
 * PosterUpload — the campaign poster drop zone (CAMPAIGN-03, UI-SPEC E8).
 *
 * The `accept` attribute on the hidden input is a convenience filter and nothing
 * more. The real format decision is the server's, taken from the file's own
 * leading bytes, because a filename and a content type are both free for a
 * caller to set — an SVG named `poster.png` gets past every check a browser can
 * make and is stored XSS if it reaches disk. So this component never inspects
 * the file: it hands it over and reports what the server said.
 *
 * Which is the other half of E8. The server has three distinguishable answers
 * and each one gets its own toast, because the outcome E8 rules out is a
 * rejected upload that looks identical to nothing having happened.
 */
import { useRef, useState } from 'react'

import { ApiError, uploadUrl } from '../lib/api'
import { Button, Card, useToast } from './ui'

export interface PosterUploadProps {
  /** The server-chosen filename, or null before anything is uploaded. */
  posterName: string | null
  onUpload: (file: File) => Promise<unknown>
  uploading: boolean
  /** Set once the campaign is live; the server's 409 is the actual control. */
  disabled?: boolean
}

export function PosterUpload({
  posterName,
  onUpload,
  uploading,
  disabled = false,
}: PosterUploadProps) {
  const { addToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const locked = uploading || disabled

  const handleFile = async (file: File | undefined) => {
    if (!file || locked) return
    try {
      await onUpload(file)
    } catch (err) {
      // Branch on the server's own answer rather than on anything read from the
      // file here: the sniff that produced the 415 happened on bytes this
      // component never looked at.
      if (err instanceof ApiError && err.status === 413) {
        addToast('File too large (max 5 MB)', 'error')
      } else if (err instanceof ApiError && err.code === 'unsupported_media_type') {
        addToast('Only PNG, JPG, or WebP accepted', 'error')
      } else {
        addToast('Upload failed. Try again.', 'error')
      }
    } finally {
      // Without this, picking the same file twice in a row fires no change
      // event the second time and the retry after a failure silently does
      // nothing — which is the one outcome this component may not produce.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const openPicker = () => {
    if (locked) return
    inputRef.current?.click()
  }

  return (
    <div
      className="relative"
      onDragOver={e => {
        e.preventDefault()
        if (!locked) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        void handleFile(e.dataTransfer?.files?.[0])
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={locked}
        onChange={e => void handleFile(e.target.files?.[0] ?? undefined)}
      />

      {posterName ? (
        <Card className="p-5 flex items-center gap-4">
          <img
            src={uploadUrl(posterName)}
            alt="Campaign poster"
            width={128}
            height={128}
            className="h-32 w-32 shrink-0 rounded-xl object-cover"
          />
          <div className="flex min-w-0 flex-col gap-2">
            <span className="truncate max-w-[200px] text-[13px] text-graytext-light">
              {posterName}
            </span>
            <Button variant="ghost" size="sm" disabled={locked} onClick={openPicker}>
              Change poster
            </Button>
          </div>
        </Card>
      ) : (
        <Card
          onClick={openPicker}
          className={`p-8 text-center border border-dashed transition-colors ${
            dragging ? 'border-teal/60 bg-teal/5' : 'border-white/20'
          } ${locked ? '' : 'cursor-pointer hover:border-teal/50'}`}
        >
          <svg
            aria-hidden="true"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5CE6C9"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
          <p className="text-[13px] text-offwhite">Drop poster image here, or click to browse</p>
          <p className="text-caption text-graytext-light mt-1">PNG, JPG, or WebP — max 5 MB</p>
        </Card>
      )}

      {uploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-onyx/40 backdrop-blur-sm">
          <svg
            aria-hidden="true"
            className="animate-spin"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5CE6C9"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
          <span className="text-caption text-offwhite">Uploading…</span>
        </div>
      )}
    </div>
  )
}
