'use client'

export default function FooterLegalBar() {
  return (
    <div className="w-full border-t border-white/5 py-6 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 px-6 md:px-12 text-[10px] text-white/30 uppercase tracking-widest">
      <span>© 2025 Ekatva. A student initiative of IIT Madras BS.</span>
      <div className="flex items-center gap-6">
        <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy</a>
        <a href="/terms" className="hover:text-white/50 transition-colors">Terms</a>
        <span>Built with ❤️ by IITM BS</span>
      </div>
    </div>
  )
}
