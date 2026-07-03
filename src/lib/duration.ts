export function parseDurationMinutes(detail: string | null): number | null {
  if (!detail) return null
  const match = detail.match(/(\d+)\s*min/i)
  return match ? parseInt(match[1], 10) : null
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
