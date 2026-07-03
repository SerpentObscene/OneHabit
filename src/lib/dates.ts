export function today(): string {
  return new Date().toISOString().split('T')[0]
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
