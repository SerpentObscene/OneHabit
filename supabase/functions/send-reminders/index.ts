import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const NOTIFY_HOURS = [8, 12, 18]

const MESSAGES: Record<number, string[]> = {
  8:  ["Morning! Did you do it yet? 🔥", "Start your day with one habit. 🔥"],
  12: ["Halfway through the day — did you do it? 🔥", "Lunchtime check-in. One tap. 🔥"],
  18: ["Evening — don't break the streak! 🔥", "One last chance today. Tap to mark done. 🔥"],
}

function localHour(timezone: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en', { timeZone: timezone, hour: 'numeric', hour12: false }).format(new Date()),
    10
  )
}

webpush.setVapidDetails(
  'mailto:fredrik.fridlund@regionvarmland.se',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, timezone')

  if (error) return new Response(error.message, { status: 500 })

  // Only send to subscribers whose local time matches a notify hour
  const targets = (subs ?? []).filter(sub => {
    try {
      const hour = localHour(sub.timezone ?? 'UTC')
      return NOTIFY_HOURS.includes(hour)
    } catch {
      return false
    }
  })

  const results = await Promise.allSettled(
    targets.map(async (sub) => {
      const hour = localHour(sub.timezone ?? 'UTC')
      const msgs = MESSAGES[hour] ?? ["Did you do it today? 🔥"]
      const body = msgs[Math.floor(Math.random() * msgs.length)]

      const payload = JSON.stringify({
        title: 'OneHabit',
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: '/' },
      })

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      } catch (e: any) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
        throw e
      }
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return new Response(JSON.stringify({ sent, failed, targets: targets.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
