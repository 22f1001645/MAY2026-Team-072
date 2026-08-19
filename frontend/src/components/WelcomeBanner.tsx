import { useSession } from '../lib/session'

export default function WelcomeBanner() {
  const { name } = useSession()
  
  const hour = new Date().getHours()
  let greeting = 'Good evening'
  if (hour < 12) greeting = 'Good morning'
  else if (hour < 17) greeting = 'Good afternoon'

  const firstName = name ? name.split(' ')[0].toUpperCase() : ''

  return (
    <div className="mb-8 border-b border-white/5 pb-6 animate-fade-up">
      <div className="text-[11px] font-bold tracking-widest text-teal uppercase mb-1">
        Welcome Back
      </div>
      <h1 className="text-[48px] md:text-[64px] font-black text-offwhite tracking-tight uppercase leading-[1.1] mb-1">
        {firstName}
      </h1>
      <p className="text-[15px] text-graytext-mid">
        {greeting}
      </p>
    </div>
  )
}
