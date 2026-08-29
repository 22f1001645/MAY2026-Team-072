import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../lib/auth'
import { useSession } from '../lib/session'
import { useMyPoints } from '../lib/queries'
import { EditCityModal } from './Layout'
import { cx } from '../lib/format'

export function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { data: points } = useMyPoints()
  const { name: userName, city: userCity, role } = useSession()
  const { refreshUser, currentUser, logout, isLoggingOut } = useAuth()
  
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [editCity, setEditCity] = useState(userCity)
  
  useEffect(() => {
    setEditCity(userCity)
  }, [userCity])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const initials = userName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 animate-fade-in">
      {/* Absolute Backdrop - no blur here so the modal stands out */}
      <div className="absolute inset-0 bg-scrim/80" onClick={onClose} />
      
      {/* Holographic Modal Container */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[40px] border border-white/5 bg-onyx/40 backdrop-blur-3xl shadow-[0_0_100px_rgba(14,47,54,0.8),0_0_40px_rgba(92,230,201,0.1)] animate-fade-up will-change-transform flex flex-col md:flex-row min-h-[500px]">
        
        {/* Holographic Ethereal Aura */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[140%] bg-teal/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[120%] bg-emerald/10 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 h-12 w-12 rounded-full flex items-center justify-center text-graytext-mid hover:text-white transition-colors z-20 group"
          title="Close"
        >
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-full transition-colors backdrop-blur-md" />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        {/* LEFT COLUMN: Identity */}
        <div className="relative z-10 flex-1 p-10 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5">
          <div>
            <div className="relative inline-flex items-center justify-center w-32 h-32 mb-10">
              {/* Outer glowing rings */}
              <div className="absolute inset-[-10px] rounded-full border border-teal/20 animate-[spin-slow_10s_linear_infinite]" />
              <div className="absolute inset-[-20px] rounded-full border border-teal/10 animate-[spin-slow_15s_linear_infinite_reverse]" />
              {/* Inner Avatar */}
              <div className="relative w-full h-full rounded-full bg-onyx/50 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-[inset_0_0_30px_rgba(92,230,201,0.1)]">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40 tracking-tighter">
                  {initials}
                </span>
                {/* Active Status Dot */}
                <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-teal shadow-[0_0_15px_rgba(92,230,201,1)]" />
              </div>
            </div>

            <div className="text-[12px] font-bold tracking-[0.3em] text-teal uppercase mb-3">
              {role}
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tighter leading-none mb-4">
              {userName}
            </h1>
            <div className="text-[15px] font-medium text-graytext-mid flex items-center gap-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {currentUser?.email || 'No email provided'}
            </div>
          </div>

          {/* Action Links */}
          <div className="mt-12 flex items-center gap-6">
            {role !== 'admin' && (
              <button 
                onClick={() => setPrefsOpen(true)}
                className="text-[13px] font-bold tracking-widest uppercase text-white hover:text-teal transition-colors flex items-center gap-2 group"
              >
                Edit Region
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            )}
            <button 
              onClick={async () => { await logout(); }}
              disabled={isLoggingOut}
              className="text-[13px] font-bold tracking-widest uppercase text-graytext-mid hover:text-red-400 transition-colors flex items-center gap-2 group disabled:opacity-50"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
              {isLoggingOut ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6"></polyline></svg>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Stats / HUD */}
        <div className="relative z-10 w-full md:w-[45%] p-10 md:p-16 flex flex-col justify-center bg-white/[0.02]">
          
          {role === 'admin' ? (
            <div className="flex flex-col h-full justify-center">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4 opacity-60">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-teal">System Status</span>
                </div>
                <div className="text-3xl font-light tracking-tight text-white flex items-center gap-4">
                  Global Access
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal"></span>
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4 opacity-60">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white">Clearance</span>
                </div>
                <div className="text-[60px] lg:text-[80px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] tracking-tighter">
                  Level 5
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Region Minimal Display */}
              <div className="mb-16">
                <div className="flex items-center gap-3 mb-4 opacity-60">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white">Current Region</span>
                </div>
                <div className="text-4xl font-light tracking-tight text-offwhite">
                  {userCity}
                </div>
              </div>

              {/* Points Massive Display */}
              <div>
                <div className="flex items-center gap-3 mb-4 opacity-60">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-white">Total Points</span>
                </div>
                <div className="text-[80px] lg:text-[100px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-teal to-teal/40 drop-shadow-[0_0_30px_rgba(92,230,201,0.2)] tracking-tighter">
                  {points?.total ?? 0}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Edit Profile Modal (Stacked over ProfileModal) */}
        {prefsOpen && (
          <EditCityModal
            currentCity={editCity}
            onClose={() => setPrefsOpen(false)}
            onSaved={async () => { await refreshUser(); setPrefsOpen(false); }}
          />
        )}
      </div>
    </div>,
    document.body
  )
}
