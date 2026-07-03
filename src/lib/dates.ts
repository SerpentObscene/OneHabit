export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function lastNDays(n: number): Date[] {
  const days: Date[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d)
  }
  return days
}

export function startOfWeek(): Date {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

export function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0

  const sorted = [...new Set(dates)].sort().reverse()
  const todayStr = today()

  let streak = 0
  let cursor = todayStr

  for (const date of sorted) {
    if (date === cursor) {
      streak++
      const d = new Date(cursor)
      d.setDate(d.getDate() - 1)
      cursor = d.toISOString().split('T')[0]
    } else if (date < cursor) {
      break
    }
  }

  return streak
}
