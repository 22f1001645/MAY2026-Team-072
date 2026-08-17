import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { useSession } from '../lib/session'
import { useMyPoints } from '../lib/queries'
import { EditCityModal } from '../components/Layout'

export default function Profile() {
  const { data: points } = useMyPoints()
  const { name: userName, city: userCity, role } = useSession()
  const { refreshUser, currentUser, logout } = useAuth()
  
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [editCity, setEditCity] = useState(userCity)
  
  useEffect(() => {
    setEditCity(userCity)
  }, [userCity])

  const initials = userName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST'

  return (
    <div className="pb-12 max-w-2xl mx-auto mt-8 px-4">
      
      {/* Bento ID Card */}
      <div className="relative overflow-hidden rounded-[32px] bg-onyx shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 pb-8 animate-fade-in">
        
        {/* Top Header Background */}
        <div className="h-44 w-full bg-gradient-to-br from-teal/40 via-teal/20 to-emerald/10 relative">
          <div className="absolute inset-0 mix-blend-overlay opacity-30 grain" />
          
          {/* Sign Out Button (Top Right) */}
          <button 
            onClick={() => logout()}
            className="absolute top-6 right-6 h-10 w-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 transition-colors z-10 border border-white/10"
            title="Sign Out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>

        {/* Avatar overlapping header and body */}
        <div className="relative -mt-16 px-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-10 text-center sm:text-left">
          <div className="relative shrink-0">
            {/* The Avatar */}
            <div className="h-32 w-32 rounded-[28px] bg-gradient-to-br from-teal to-emerald p-1 shadow-2xl border-[6px] border-onyx">
              <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-onyx text-5xl font-bold text-offwhite shadow-inner">
                {initials}
              </div>
            </div>
            {/* Green Online Dot */}
            <div className="absolute -bottom-1.5 -right-1.5 h-8 w-8 rounded-full border-[4px] border-onyx bg-[#3FD4B6] z-10 shadow-sm"></div>
          </div>
          
          <div className="pb-2">
            <h1 className="text-3xl font-black text-offwhite leading-tight uppercase tracking-tight">{userName}</h1>
            <div className="text-[14px] text-graytext-light mt-1 font-medium capitalize">
              {role}
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="px-8 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          
          {/* Email Card - Full Width */}
          <div className="sm:col-span-2 relative overflow-hidden rounded-[20px] bg-white/[0.03] border border-white/5 p-6 transition-transform hover:-translate-y-1 group hover:bg-white/[0.05]">
            {/* Watermark Icon */}
            <svg className="absolute -right-6 -bottom-8 opacity-[0.03] text-white w-48 h-48 group-hover:scale-110 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div className="text-[11px] uppercase tracking-widest font-bold text-graytext-mid">Email</div>
              </div>
              <div className="text-[16px] font-semibold text-offwhite pl-[44px]">
                {currentUser?.email || 'No email provided'}
              </div>
            </div>
          </div>

          {/* Region Card - Half Width */}
          <div className="relative overflow-hidden rounded-[20px] bg-white/[0.03] border border-white/5 p-6 transition-transform hover:-translate-y-1 group hover:bg-white/[0.05]">
             <svg className="absolute -right-6 -bottom-6 opacity-[0.03] text-white w-32 h-32 group-hover:scale-110 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
             <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                </div>
                <div className="text-[11px] uppercase tracking-widest font-bold text-graytext-mid">Region</div>
              </div>
              <div className="text-[16px] font-semibold text-offwhite pl-[44px]">
                {userCity}
              </div>
             </div>
          </div>

          {/* Points Card - Half Width */}
          <div className="relative overflow-hidden rounded-[20px] bg-white/[0.03] border border-white/5 p-6 transition-transform hover:-translate-y-1 group hover:bg-white/[0.05]">
             <svg className="absolute -right-6 -bottom-6 opacity-[0.03] text-white w-32 h-32 group-hover:scale-110 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
             <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-full bg-teal-500/10 text-teal flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </div>
                <div className="text-[11px] uppercase tracking-widest font-bold text-graytext-mid">Points</div>
              </div>
              <div className="text-[16px] font-semibold text-offwhite pl-[44px]">
                {points?.total ?? 0}
              </div>
             </div>
          </div>
        </div>

        {/* Action Pills */}
        <div className="px-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => setPrefsOpen(true)}
            className="w-full bg-white/5 hover:bg-white/10 text-offwhite font-semibold py-3.5 rounded-full transition-colors text-[14px] border border-white/5 flex items-center justify-center gap-2 group"
          >
            Edit region 
            <span className="text-graytext-mid group-hover:text-offwhite transition-colors">→</span>
          </button>
          
          <button 
            onClick={() => logout()}
            className="w-full bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-offwhite font-semibold py-3.5 rounded-full transition-colors text-[14px] border border-white/5 flex items-center justify-center gap-2 group"
          >
            Sign out
            <span className="text-graytext-mid group-hover:text-red-400 transition-colors">→</span>
          </button>
        </div>

      </div>

      {/* Edit Profile Modal */}
      {prefsOpen && (
        <EditCityModal
          currentCity={editCity}
          onClose={() => setPrefsOpen(false)}
          onSaved={async () => { await refreshUser(); setPrefsOpen(false); }}
        />
      )}
    </div>
  )
}
