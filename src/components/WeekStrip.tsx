import { today } from '@/lib/dates'

export default function WeekStrip({ done }: { done: Set<string> }) {
  const todayISO = today()
  const days: { iso: string; label: string }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)
    days.push({ iso, label })
  }

  return (
    <div className="flex justify-between gap-1">
      {days.map(({ iso, label }) => (
        <div key={iso} className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              done.has(iso)
                ? 'bg-ember text-white'
                : 'bg-card border border-border text-muted-foreground'
            } ${iso === todayISO ? 'ring-2 ring-ember/40' : ''}`}
          >
            {done.has(iso) ? '✓' : null}
          </div>
        </div>
      ))}
    </div>
  )
}
