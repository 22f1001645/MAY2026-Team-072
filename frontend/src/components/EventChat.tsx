import { useState, useRef, useEffect } from 'react'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { useAuth } from '../lib/auth'
import { useAnnouncements, usePostAnnouncement } from '../lib/queries'
import { Button, Input, Badge, Mandala } from './ui'
import { formatDate, formatTime, cx } from '../lib/format'

export default function EventChat({
  eventId,
  isRegistered,
  canManage = false,
}: {
  eventId: string
  isRegistered: boolean
  canManage?: boolean
}) {
  const { currentUser } = useAuth()
  const { data: messages = [], isLoading } = useAnnouncements(eventId)
  const postMutation = usePostAnnouncement()

  const [text, setText] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const canPost = isRegistered || canManage

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !canPost) return
    postMutation.mutate({ id: eventId, body: text }, {
      onSuccess: () => {
        setText('')
        setShowPicker(false)
      }
    })
  }

  const handleEmojiClick = (emojiObject: any) => {
    setText(prev => prev + emojiObject.emoji)
    document.getElementById('chat-input')?.focus()
  }

  // Filter out push alerts, and reverse so oldest is top, newest is bottom
  const chatMessages = messages.filter((m: any) => !m.isAlert)
  const sortedMessages = [...chatMessages].reverse()

  return (
    <div className="flex h-full flex-col">
      {/* Message List */}
      <div className={cx(
        "flex-1 py-4 pr-2",
        sortedMessages.length > 0 ? "overflow-y-auto space-y-4" : "overflow-hidden"
      )}>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-caption text-graytext-mid">
            Loading discussion...
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
            <Mandala size={56} className="text-teal mb-4 animate-[spin_20s_linear_infinite]" />
            <h4 className="text-offwhite font-bold text-[15px] mb-2">It's quiet in here</h4>
            <p className="text-[13px] text-graytext-mid">Be the first to start the conversation.</p>
          </div>
        ) : (
          sortedMessages.map((m, i) => {
            const isMyMessage = currentUser?.name === m.senderName
            const isImportant = m.senderRole === 'Organiser' || m.senderRole === 'Admin'
            const initial = m.senderName ? m.senderName.charAt(0).toUpperCase() : '?'
            
            // Stagger only the most recent 10 messages for performance, starting from oldest in view
            const idxFromBottom = sortedMessages.length - 1 - i
            const animDelay = idxFromBottom < 10 ? `${(9 - idxFromBottom) * 0.05}s` : '0s'

            return (
              <div
                key={m.id}
                className={cx(
                  "flex gap-3 w-full animate-spring-up",
                  isMyMessage ? "flex-row-reverse" : "flex-row"
                )}
                style={{ animationDelay: animDelay }}
              >
                {/* Avatar */}
                <div className="shrink-0 flex flex-col items-center">
                  <div className={cx(
                    "grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold shadow-lg ring-1",
                    isMyMessage 
                      ? "bg-white/10 text-offwhite ring-white/20" 
                      : isImportant
                        ? "bg-teal/20 text-teal ring-teal/40 shadow-[0_0_10px_rgba(92,230,201,0.2)]"
                        : "bg-black/40 text-graytext-light ring-white/10"
                  )}>
                    {initial}
                  </div>
                </div>

                {/* Message Body */}
                <div className={cx(
                  "flex flex-col gap-1 w-full max-w-[80%]",
                  isMyMessage ? "items-end" : "items-start"
                )}>
                  <div className={cx(
                    "flex items-center gap-2",
                    isMyMessage && "flex-row-reverse"
                  )}>
                    <span className="text-[12px] font-semibold text-offwhite/80">{isMyMessage ? "You" : m.senderName}</span>
                    {isImportant && !isMyMessage && (
                      <Badge tone="gold">
                        {m.senderRole}
                      </Badge>
                    )}
                    <span className="text-[10px] text-graytext-mid">
                      {formatTime(m.createdAt)}
                    </span>
                  </div>

                  <div className={cx(
                    "px-4 py-2.5 text-[14px] leading-relaxed backdrop-blur-md shadow-lg",
                    isImportant
                      ? "bg-teal/10 border border-teal/20 text-offwhite rounded-2xl" + (isMyMessage ? " rounded-tr-sm" : " rounded-tl-sm")
                      : isMyMessage
                        ? "bg-white/10 border border-white/10 text-offwhite rounded-2xl rounded-tr-sm"
                        : "bg-black/40 border border-white/5 text-graytext-light rounded-2xl rounded-tl-sm"
                  )}>
                    {m.content}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="pt-4 pb-2 relative z-10">
        {canPost ? (
          <form onSubmit={handleSend} className="flex flex-col gap-2 relative">
            {showPicker && (
              <div className="absolute bottom-[60px] left-0 z-50 shadow-2xl">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.DARK}
                  width={320}
                  height={350}
                />
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 p-1.5 pl-2 shadow-[0_4px_24px_rgba(0,0,0,0.2)] focus-within:border-teal/50 focus-within:bg-black/60 focus-within:shadow-[0_0_20px_rgba(92,230,201,0.15)] transition-all">
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-graytext-mid hover:bg-white/10 hover:text-white transition-colors"
                title="Add Emoji"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
              </button>
              <input
                id="chat-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent text-[14px] text-offwhite placeholder:text-graytext-mid focus:outline-none px-2"
                disabled={postMutation.isPending}
                autoComplete="off"
              />
              <button 
                type="submit" 
                disabled={!text.trim() || postMutation.isPending}
                className="grid h-9 w-10 shrink-0 place-items-center rounded-full bg-teal text-onyx hover:bg-teal-400 disabled:opacity-50 disabled:hover:bg-teal transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-4 py-3 text-[13px] text-graytext-mid">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0110 0v4"></path>
            </svg>
            Register for this event to join the discussion.
          </div>
        )}
      </div>
    </div>
  )
}
