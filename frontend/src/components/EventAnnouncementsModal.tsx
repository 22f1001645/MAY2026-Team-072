import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { useAnnouncements, usePostAnnouncement } from '../lib/queries'
import { Button, Input, Badge, Mandala } from './ui'
import { formatDate, formatTime, cx } from '../lib/format'

export default function EventAnnouncementsModal({
  eventId,
  onClose,
}: {
  eventId: string
  onClose: () => void
}) {
  const { currentUser } = useAuth()
  const { data: messages = [], isLoading } = useAnnouncements(eventId)
  const postMutation = usePostAnnouncement()
  
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const canPost = currentUser?.role === 'admin' || currentUser?.role === 'organiser'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !canPost) return
    postMutation.mutate({ id: eventId, body: text }, {
      onSuccess: () => setText('')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-onyx shadow-2xl animate-[slideInRight_0.3s_ease-out]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-gold">
              <Mandala size={16} /> Broadcasts
            </div>
            <h2 className="mt-1 text-h3 font-bold text-offwhite">Event Announcements</h2>
          </div>
          <button 
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-graytext-mid hover:bg-white/10 hover:text-offwhite transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-caption text-graytext-mid">
              Loading announcements...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-caption text-graytext-mid">
              No announcements yet.
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="group flex flex-col gap-1.5 animate-fade-up">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-offwhite">{m.senderName}</span>
                  <Badge tone={m.senderRole === 'Organiser' || m.senderRole === 'Admin' ? 'gold' : 'neutral'}>
                    {m.senderRole}
                  </Badge>
                  <span className="ml-auto text-[11px] text-graytext-mid">
                    {formatDate(m.createdAt)} · {formatTime(m.createdAt)}
                  </span>
                </div>
                <div className={cx(
                  "rounded-2xl rounded-tl-sm px-4 py-3 text-[14px] text-graytext-light border",
                  m.isImportant ? "bg-teal/10 border-teal/20 text-offwhite" : "bg-white/[0.03] border-white/5"
                )}>
                  {m.content}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-white/5 bg-black/20 p-5">
          {canPost ? (
            <form onSubmit={handleSend} className="flex items-center gap-3">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type an update..."
                className="flex-1"
                disabled={postMutation.isPending}
              />
              <Button type="submit" disabled={!text.trim() || postMutation.isPending}>
                Send
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-4 py-3 text-[13px] text-graytext-mid">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0110 0v4"></path>
              </svg>
              Only event organizers can post updates here.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
