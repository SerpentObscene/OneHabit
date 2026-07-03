import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NOTIFY_HOURS = [8, 12, 18]

const MESSAGES: Record<number, string[]> = {
  8:  ['Morning! Did you do it yet? 🔥', 'Start your day with one habit. 🔥'],
  12: ['Halfway through the day — did you do it? 🔥', 'Lunchtime check-in. One tap. 🔥'],
  18: ["Evening — don't break the streak! 🔥", 'One last chance today. Tap to mark done. 🔥'],
}

function localHour(timezone: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en', { timeZone: timezone, hour: 'numeric', hour12: false }).format(new Date()),
    10,
  )
}

function b64uToBytes(s: string): Uint8Array {
  const cleaned = s.trim().replace(/\s/g, '')
  const std = cleaned.replace(/-/g, '+').replace(/_/g, '/') + '===='.slice(0, (4 - cleaned.length % 4) % 4)
  try {
    return Uint8Array.from(atob(std), c => c.charCodeAt(0))
  } catch {
    throw new Error(`b64 decode failed on: ${s.slice(0, 20)}... (len=${s.length})`)
  }
}

function toB64u(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
) {
  const privBytes = b64uToBytes(vapidPrivateKey)
  const pubBytes = b64uToBytes(vapidPublicKey) // 65 bytes: 0x04 + x[32] + y[32]

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC', crv: 'P-256',
      d: toB64u(privBytes),
      x: toB64u(pubBytes.slice(1, 33)),
      y: toB64u(pubBytes.slice(33, 65)),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  // Build VAPID JWT
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const expiry = Math.floor(Date.now() / 1000) + 12 * 3600

  const jwtHeader = toB64u(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const jwtClaims = toB64u(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: expiry, sub: 'mailto:fredrik.fridlund@regionvarmland.se' })))
  const sigInput = `${jwtHeader}.${jwtClaims}`

  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(sigInput))
  const jwt = `${sigInput}.${toB64u(new Uint8Array(sig))}`

  // Encrypt payload (RFC 8291 / aes128gcm)
  const receiverPublicKey = b64uToBytes(p256dh)
  const authSecret = b64uToBytes(auth)

  const senderKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const senderPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderKeys.publicKey))

  const receiverKey = await crypto.subtle.importKey(
    'raw', receiverPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  ).catch(e => { throw new Error(`receiver key: ${e.message}`) })

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderKeys.privateKey, 256)
      .catch(e => { throw new Error(`ECDH: ${e.message}`) })
  )

  const prkKey = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits'])
  const prkInfo = new Uint8Array([
    ...new TextEncoder().encode('WebPush: info\x00'),
    ...receiverPublicKey,
    ...senderPublicKeyRaw,
  ])
  const prk = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: prkInfo }, prkKey, 256)
      .catch(e => { throw new Error(`HKDF PRK: ${e.message}`) })
  )

  const encSalt = crypto.getRandomValues(new Uint8Array(16))
  const prkImported = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits'])

  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: encSalt, info: new TextEncoder().encode('Content-Encoding: aes128gcm\x00') },
    prkImported, 128,
  ).catch(e => { throw new Error(`HKDF CEK: ${e.message}`) })

  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: encSalt, info: new TextEncoder().encode('Content-Encoding: nonce\x00') },
    prkImported, 96,
  ).catch(e => { throw new Error(`HKDF nonce: ${e.message}`) })

  const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt'])
  const nonce = new Uint8Array(nonceBits)

  const plaintext = new TextEncoder().encode(payload)
  const paddedPlaintext = new Uint8Array([...plaintext, 2])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cek, paddedPlaintext)
    .catch(e => { throw new Error(`AES-GCM: ${e.message}`) }))

  // aes128gcm content-encoding header: salt(16) + rs(4) + keylen(1) + senderKey(65)
  const encHeader = new Uint8Array(16 + 4 + 1 + senderPublicKeyRaw.length)
  encHeader.set(encSalt, 0)
  new DataView(encHeader.buffer).setUint32(16, 4096, false)
  encHeader[20] = senderPublicKeyRaw.length
  encHeader.set(senderPublicKeyRaw, 21)

  const body = new Uint8Array([...encHeader, ...ciphertext])

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body,
  })

  if (!res.ok && res.status !== 201) {
    throw Object.assign(new Error(`Push failed: ${res.status}`), { statusCode: res.status })
  }
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!.trim().replace(/\s/g, '')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!.trim().replace(/\s/g, '')

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, timezone')

    if (error) return new Response(error.message, { status: 500 })

    const TEST_MODE = Deno.env.get('TEST_MODE') === 'true'

    const targets = (subs ?? []).filter(sub => {
      if (TEST_MODE) return true
      try { return NOTIFY_HOURS.includes(localHour(sub.timezone ?? 'UTC')) }
      catch { return false }
    })

    const results = await Promise.allSettled(
      targets.map(async (sub) => {
        const hour = TEST_MODE ? 8 : localHour(sub.timezone ?? 'UTC')
        const msgs = MESSAGES[hour] ?? ['Did you do it today? 🔥']
        const body = msgs[Math.floor(Math.random() * msgs.length)]

        const payload = JSON.stringify({
          title: 'OneHabit', body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: { url: '/' },
        })

        try {
          await sendWebPush(sub.endpoint, sub.p256dh, sub.auth, payload, vapidPublicKey, vapidPrivateKey)
        } catch (e: any) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
          throw e
        }
      }),
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map(r => r.reason?.message)

    return new Response(JSON.stringify({ sent, failed, targets: targets.length, errors }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
