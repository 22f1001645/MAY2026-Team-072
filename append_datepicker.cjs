const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/ui.tsx', 'utf8');

code += \

export function FormDatePicker({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (val: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Parse current value or use today
  const initialDate = value ? new Date(value) : new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const monthName = currentMonth.toLocaleString('default', { month: 'long' })

  // Format YYYY-MM-DD
  const formatAsDateString = (y: number, m: number, d: number) => {
    return \\\\-\-\\\\
  }

  const displayValue = value ? new Date(value).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'

  return (
    <div className={cx('relative', className)} ref={ref}>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        className={cx(
          'flex w-full items-center justify-between rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-left text-[14px] transition-colors focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40',
          !value ? 'text-graytext-mid' : 'text-offwhite'
        )}
      >
        <span className='truncate'>{displayValue}</span>
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={cx('shrink-0 text-graytext-mid transition-transform', open && 'rotate-180')}>
          <rect x='3' y='4' width='18' height='18' rx='2' ry='2' />
          <line x1='16' y1='2' x2='16' y2='6' />
          <line x1='8' y1='2' x2='8' y2='6' />
          <line x1='3' y1='10' x2='21' y2='10' />
        </svg>
      </button>

      {open && (
        <div className='absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/10 bg-onyx/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-fade-up'>
          <div className='mb-4 flex items-center justify-between'>
            <button type='button' onClick={prevMonth} className='grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 text-graytext-light hover:text-white transition-colors'>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path strokeLinecap='round' strokeLinejoin='round' d='M15 19l-7-7 7-7' /></svg>
            </button>
            <div className='font-semibold text-offwhite'>{monthName} {year}</div>
            <button type='button' onClick={nextMonth} className='grid h-8 w-8 place-items-center rounded-full hover:bg-white/10 text-graytext-light hover:text-white transition-colors'>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' /></svg>
            </button>
          </div>
          
          <div className='grid grid-cols-7 gap-1 text-center text-[12px] font-medium text-graytext-mid mb-2'>
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>
          
          <div className='grid grid-cols-7 gap-1'>
            {days.map((d, i) => {
              if (d === null) return <div key={i} />
              const dateStr = formatAsDateString(year, month, d)
              const isSelected = value === dateStr
              const isToday = formatAsDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) === dateStr
              
              return (
                <button
                  key={i}
                  type='button'
                  onClick={() => {
                    onChange(dateStr)
                    setOpen(false)
                  }}
                  className={cx(
                    'grid aspect-square place-items-center rounded-full text-[13px] font-medium transition-colors',
                    isSelected ? 'bg-teal text-black' : 
                    isToday ? 'border border-teal/50 text-teal' :
                    'text-offwhite hover:bg-white/10'
                  )}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
\;

fs.writeFileSync('frontend/src/components/ui.tsx', code);
