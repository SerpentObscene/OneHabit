import { today } from '@/lib/dates'

export default function WeekStrip({ done }: { done: Set<string> }) {
  const todayISO = today()
  const days: { iso: string; label: string; num: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1).toUpperCase()
    days.push({ iso, label, num: d.getDate() })
  }

  return (
    <div className="flex justify-between gap-1">
      {days.map(({ iso, label, num }) => {
        const isDone = done.has(iso)
        const isToday = iso === todayISO
        return (
          <div key={iso} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                isDone
                  ? 'bg-ember text-white'
                  : isToday
                  ? 'bg-card border-2 border-ember text-foreground'
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
