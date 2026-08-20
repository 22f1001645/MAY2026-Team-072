import { useState, useEffect } from 'react'
import { useSession } from '../lib/session'

export default function WelcomeBanner() {
  const { name } = useSession()
  const [time, setTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  
  const hour = time.getHours()
  let greeting = 'Good evening'
  if (hour < 12) greeting = 'Good morning'
  else if (hour < 17) greeting = 'Good afternoon'

  const firstName = name ? name.split(' ')[0].toUpperCase() : 'USER'
  const initial = firstName.charAt(0)

  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 bg-onyx/40 p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl animate-fade-up group">
      {/* Ambient Aurora Glow (Optimized for GPU) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-60 mix-blend-screen transition-opacity duration-700 group-hover:opacity-80">
        <div 
          className="absolute -top-[50%] -left-[20%] w-[140%] h-[140%] rounded-full animate-aurora will-change-transform" 
          style={{ background: 'radial-gradient(circle, rgba(92,230,201,0.15) 0%, transparent 50%)' }} 
        />
        <div 
          className="absolute top-[10%] -right-[30%] w-[120%] h-[120%] rounded-full animate-aurora will-change-transform" 
          style={{ background: 'radial-gradient(circle, rgba(255,207,150,0.08) 0%, transparent 50%)', animationDelay: '-5s' }} 
        />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        {/* Left: Avatar & Greeting */}
        <div className="flex items-center gap-6">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal to-teal/30 p-[2px] shadow-[0_0_20px_rgba(92,230,201,0.3)]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-onyx text-3xl font-bold text-teal">
              {initial}
            </div>
          </div>
          
          <div>
            <div className="text-[12px] font-bold tracking-[0.2em] text-teal/80 uppercase mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
              Welcome Back
            </div>
            <h1 className="text-[40px] md:text-[56px] font-black text-white tracking-tight uppercase leading-[1] mb-1">
              {firstName}
            </h1>
            <p className="text-[15px] font-medium text-graytext-light">
              {greeting}
            </p>
          </div>
        </div>

        {/* Right: Date/Time Stats */}
        <div className="hidden md:flex flex-col gap-2 border-l border-white/10 pl-8 shrink-0">
          <div className="text-[12px] font-semibold tracking-widest text-graytext-mid uppercase">
            System Time
          </div>
          <div className="text-[28px] font-mono font-light text-offwhite tracking-tight">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          <div className="text-[14px] text-teal/70 font-medium">
            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  )
}
