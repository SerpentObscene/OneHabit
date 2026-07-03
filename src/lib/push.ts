export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false
  return Notification.permission === 'granted' && localStorage.getItem('pushEnabled') === 'true'
}

export async function enablePushNotifications(_userId: string): Promise<void> {
  if (!pushSupported()) throw new Error('Push not supported on this device')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission denied')
  localStorage.setItem('pushEnabled', 'true')
}

export async function disablePushNotifications(): Promise<void> {
  localStorage.setItem('pushEnabled', 'false')
}
