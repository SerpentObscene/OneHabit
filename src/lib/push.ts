import { supabase } from '@/integrations/supabase/client'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false
  if (Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return !!sub
}

export async function enablePushNotifications(userId: string): Promise<void> {
  if (!pushSupported()) throw new Error('Push not supported on this device')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission denied')

  const reg = await navigator.serviceWorker.ready
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  })

  const { endpoint, keys } = subscription.toJSON() as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, timezone },
    { onConflict: 'user_id,endpoint' }
  )
  if (error) throw new Error(error.message)
}

export async function disablePushNotifications(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', sub.endpoint)
      .eq('user_id', user?.id ?? '')
    await sub.unsubscribe()
  }
}
