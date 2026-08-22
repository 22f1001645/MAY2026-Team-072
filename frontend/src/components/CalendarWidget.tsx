import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Dialog, Badge, Button } from './ui'
import { cx, formatDate, formatTime, scaleLabel, coverForScale } from '../lib/format'

export function CalendarWidget({ regs }: { regs: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvents, setSelectedEvents] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const days = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const handleDayClick = (day: number) => {
    const eventsForDay = regs.filter(r => {
      if (!r.activity) return false
      const eventDate = new Date(r.activity.startsAt)
      return (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month &&
        eventDate.getDate() === day
      )
    })

    if (eventsForDay.length > 0) {
      setSelectedEvents(eventsForDay)
      setIsModalOpen(true)
    }
  }

  const hasEvent = (day: number) => {
    return regs.some(r => {
      if (!r.activity) return false
      const eventDate = new Date(r.activity.startsAt)
      return (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month &&
        eventDate.getDate() === day
      )
    })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <>
      <Card className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-bold text-offwhite">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-full text-graytext-mid hover:bg-white/5 hover:text-offwhite transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-full text-graytext-mid hover:bg-white/5 hover:text-offwhite transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-graytext-mid">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) {
              return <div key={i} className="aspect-square" />
            }

            const isToday = isCurrentMonth && day === today.getDate()
            const dayHasEvent = hasEvent(day)

            return (
              <button
                key={i}
                onClick={() => handleDayClick(day)}
                disabled={!dayHasEvent}
                className={cx(
                  'relative aspect-square flex items-center justify-center rounded-full text-[13px] font-medium transition-all',
                  isToday ? 'bg-teal/20 text-teal ring-1 ring-teal/50' : 'text-graytext-light',
                  dayHasEvent && !isToday ? 'hover:bg-white/5 hover:text-offwhite cursor-pointer' : '',
                  !dayHasEvent && !isToday ? 'opacity-50 cursor-default' : ''
                )}
              >
                {day}
                {dayHasEvent && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-teal" />
                )}
              </button>
            )
          })}
        </div>
      </Card>

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Event Details"
      >
        <div className="flex flex-col gap-6">
          {selectedEvents.map((r, i) => {
            const a = r.activity
            return (
              <div key={i} className={cx("flex flex-col gap-4", i > 0 && "border-t border-white/5 pt-6")}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-[20px] font-bold text-offwhite mb-2 leading-tight">{a.title}</h4>
                    <div className="flex gap-2">
                      <Badge tone="gold">{scaleLabel[a.scale]}</Badge>
                      <Badge tone="teal">{r.status === 'confirmed' ? 'Going' : 'Waitlisted'}</Badge>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 border border-white/10" style={{ background: coverForScale(a.scale) }} />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-graytext-light text-[14px]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-graytext-mid">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>{formatDate(a.startsAt)} • {formatTime(a.startsAt)}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-graytext-light text-[14px]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-graytext-mid">
                      <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>
                    </svg>
                    <span>{a.venue}, {a.city}</span>
                  </div>

                  {a.description && (
                    <div className="flex items-start gap-3 text-graytext-light text-[14px] mt-1">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-graytext-mid mt-0.5 flex-shrink-0">
                        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                      </svg>
                      <span className="line-clamp-3">{a.description}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Link to={`/events/${a.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full">View Details</Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </Dialog>
    </>
  )
}
