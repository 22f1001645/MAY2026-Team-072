import { useSearchParams } from 'react-router-dom'
import { useEvent, useMyRegistrations } from '../lib/queries'
import { useSession } from '../lib/session'
import { cx } from '../lib/format'
import EventChat from './EventChat'

export function GlobalEventChatModal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const eventId = searchParams.get('chat')
  
  const { data: event } = useEvent(eventId || undefined)
  const { data: myRegs = [] } = useMyRegistrations()
  const { role, capabilities } = useSession()

  if (!eventId) return null

  const registered = myRegs.some((r: any) => r.activity_id === eventId)
  const canManage = role !== 'student' || capabilities?.manageableActivityIds?.includes(eventId)

  const closeChat = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('chat')
    setSearchParams(newParams)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={closeChat}
      />
      
      {/* Slide-over */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[400px] transform bg-onyx shadow-2xl transition-transform duration-300 ease-out border-l border-white/10 flex flex-col translate-x-0 overflow-hidden"
      >
        <div className="grain absolute inset-0 opacity-[0.05] pointer-events-none z-0" />
        
        {/* Ambient Aurora Glow (Optimized for GPU) */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0 opacity-60">
          <div 
            className="absolute -top-[20%] -left-[10%] w-[120%] h-[80%] rounded-full animate-aurora will-change-transform" 
            style={{ background: 'radial-gradient(circle, rgba(92,230,201,0.15) 0%, transparent 60%)' }} 
          />
          <div 
            className="absolute top-[20%] -right-[20%] w-[120%] h-[80%] rounded-full animate-aurora will-change-transform" 
            style={{ background: 'radial-gradient(circle, rgba(255,207,150,0.08) 0%, transparent 60%)', animationDelay: '-7s' }} 
          />
        </div>
        
        <div className="flex items-center justify-between border-b border-white/10 p-4 shrink-0 relative z-10 bg-onyx/50 backdrop-blur-sm">
          <h3 className="text-h3 font-semibold text-offwhite">
            {event ? event.title : 'Event Chat'}
          </h3>
          <button
            onClick={closeChat}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-graytext-light hover:bg-white/10 hover:text-offwhite transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 min-h-0 overflow-hidden relative z-10 p-4 pt-0">
          <EventChat 
            eventId={eventId} 
            isRegistered={registered} 
            canManage={canManage} 
          />
        </div>
      </div>
    </>
  )
}
