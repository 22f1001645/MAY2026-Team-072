import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cover, formatDate, formatTime } from '../lib/format'
import { Button } from '../components/ui'

interface PublicEventLandingProps {
  e: any
  refId?: string
}

export default function PublicEventLanding({ e, refId }: PublicEventLandingProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="relative min-h-screen w-full bg-onyx-raised text-offwhite flex flex-col items-center justify-center -mx-4 -my-8 sm:-mx-8 sm:-my-8">
      
      {/* Edge-to-Edge Hero Gradient Background */}
      <div className="absolute top-0 left-0 right-0 h-[65vh] w-full z-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-80"
          style={{ background: cover(e.cover) }}
        />
        {/* Grain texture overlay */}
        <div className="grain absolute inset-0 opacity-40 mix-blend-overlay" />
        {/* Fade to black at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-4xl px-4 pt-32 pb-24 text-center sm:px-8 flex flex-col items-center">
        
        {/* Referral Banner */}
        {refId && (
          <div className="mx-auto mb-16 max-w-md animate-fade-in-up rounded-full border border-gold/30 bg-gold/10 px-6 py-3 backdrop-blur-md shadow-[0_0_20px_rgba(255,215,0,0.15)]">
            <div className="text-[14px] font-semibold tracking-wide text-gold">
              ✨ A friend invited you to join them!
            </div>
          </div>
        )}
          
        <div className="mb-4 text-[12px] font-bold tracking-[0.2em] uppercase text-white/70">
          {e.scale} • {e.status === 'completed' || e.status === 'archived' ? 'Past Event' : 'Upcoming'}
        </div>
        
        <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl drop-shadow-lg leading-tight">
          {e.title}
        </h1>

        <div className="mx-auto mb-16 max-w-2xl text-lg text-white/90 sm:text-xl drop-shadow-md">
          {e.description}
        </div>

        {/* Date, Time, Venue glass container */}
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12 rounded-3xl bg-white/5 p-8 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center">
            <span className="mb-2 text-[11px] font-bold tracking-widest text-white/50 uppercase">Date & Time</span>
            <span className="text-xl font-medium text-white">{formatDate(e.startsAt)}</span>
            <span className="text-md text-white/80">{formatTime(e.startsAt)}</span>
          </div>
          <div className="hidden h-16 w-px bg-white/10 sm:block"></div>
          <div className="flex flex-col items-center">
            <span className="mb-2 text-[11px] font-bold tracking-widest text-white/50 uppercase">Venue</span>
            <span className="text-xl font-medium text-white text-center">{e.venue}</span>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 flex flex-col items-center gap-5 w-full">
          <Button 
            size="lg" 
            className="w-full max-w-sm rounded-full bg-teal px-8 py-6 text-lg font-bold text-onyx hover:bg-teal/90 shadow-[0_0_40px_rgba(92,230,201,0.25)] transition-all hover:scale-105"
            onClick={() => {
              navigate('/login', { state: { from: location.pathname } })
            }}
          >
            SIGN IN TO REGISTER
          </Button>
          <div className="text-[14px] text-graytext-mid">
            New to Ekatva? <Link to="/login" className="font-semibold text-teal hover:underline ml-1">Create an account</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
