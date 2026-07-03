import { today } from '@/lib/dates'

export default function WeekStrip({ done }: { done: Set<string> }) {
  const todayISO = today()

  // Find Monday of the current week
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon … 6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const iso = [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
    const label = d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1).toUpperCase()
    return { iso, label, num: d.getDate() }
  })

  return (
    <div className="flex justify-between gap-1">
      {days.map(({ iso, label, num }) => {
        const isDone = done.has(iso)
        const isToday = iso === todayISO
        const isFuture = iso > todayISO
        return (
          <div key={iso} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                isDone
                  ? 'bg-ember text-white'
                  : isToday
                  ? 'bg-card border-2 border-ember text-foreground'
                  : isFuture
                  ? 'bg-card border border-border text-muted-foreground/40'
                  : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {isDone ? '✓' : num}
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
