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
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-caption text-graytext-mid">
            Loading discussion...
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-center text-caption text-graytext-mid">
            No messages yet. Be the first to post!
          </div>
        ) : (
          sortedMessages.map((m) => {
            const isMyMessage = currentUser?.name === m.senderName
            const isImportant = m.senderRole === 'Organiser' || m.senderRole === 'Admin'

            return (
              <div
                key={m.id}
                className={cx(
                  "flex flex-col gap-1 w-full animate-fade-up",
                  isMyMessage ? "items-end" : "items-start"
                )}
              >
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
                    {formatDate(m.createdAt)} {formatTime(m.createdAt)}
                  </span>
                </div>

                <div className={cx(
                  "px-4 py-2.5 text-[14px] text-graytext-light border max-w-[85%]",
                  isImportant
                    ? "bg-teal/10 border-teal/20 text-offwhite rounded-2xl" + (isMyMessage ? " rounded-tr-sm" : " rounded-tl-sm")
                    : isMyMessage
                      ? "bg-white/[0.05] border-white/10 rounded-2xl rounded-tr-sm"
                      : "bg-white/[0.02] border-white/5 rounded-2xl rounded-tl-sm"
                )}>
                  {m.content}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-white/5 pt-4">
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-graytext-mid hover:bg-white/10 hover:text-white transition-colors"
                title="Add Emoji"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
              </button>
              <Input
                id="chat-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                disabled={postMutation.isPending}
              />
              <Button type="submit" disabled={!text.trim() || postMutation.isPending}>
                Send
              </Button>
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
