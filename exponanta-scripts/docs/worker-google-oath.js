
// worker on domain

// ── JWT ───────────────────────────────────────────────────────
async function verifyJWT(token, secret) {
  try {
    const [h, p, s] = token.split('.')
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const sig   = Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0))
    const data  = new TextEncoder().encode(`${h}.${p}`)
    const valid = await crypto.subtle.verify('HMAC', key, sig, data)
    if (!valid) return null
    const payload = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')))
    if (payload.exp < Date.now() / 1000) return null
    return payload
  } catch { return null }
}

function getCookie(header, name) {
  if (!header) return null
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? match[1] : null
}

// ── Worker ────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // token arriving from hub — set cookie, redirect to clean URL
    const token = url.searchParams.get('token')
    if (token) {
      url.searchParams.delete('token')
      return new Response(null, {
        status: 302,
        headers: {
          'Location': url.toString(),
          'Set-Cookie': `cw_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
        }
      })
    }

    // protected paths
    if (url.pathname.startsWith('/cw/')) {
      const cookie = getCookie(request.headers.get('Cookie'), 'cw_token')
      if (!cookie) {
        return Response.redirect(
          `https://hub.i771468.workers.dev/auth/google?return_url=${encodeURIComponent(request.url)}`,
          302
        )
      }
      const user = await verifyJWT(cookie, env.JWT_SECRET)
      if (!user) {
        return Response.redirect(
          `https://hub.i771468.workers.dev/auth/google?return_url=${encodeURIComponent(request.url)}`,
          302
        )
      }
      if (url.pathname.startsWith('/cw/admin') && user.role !== 'admin') {
        return new Response('Forbidden', { status: 403 })
      }
    }

    // R2 fallback
    let key = url.pathname.slice(1)
    if (key === '' || key === '/') key = 'index.html'

    const object = await env.ASSETS.get(key)
    if (!object) return new Response('Not found', { status: 404 })

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)

    return new Response(object.body, { headers })
  }
}

//worker on hub

// ── JWT ───────────────────────────────────────────────────────
const b64url = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function signJWT(payload, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body   = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 * 7 }))
  const key    = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  return `${header}.${body}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`
}

// ── Worker ────────────────────────────────────────────────────
export default {
  async fetch(req, env, ctx) {
    const url  = new URL(req.url)
    const path = url.pathname

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

    // ── Google OAuth: redirect ────────────────────────────────
    if (path === '/auth/google') {
      const return_url = url.searchParams.get('return_url') || '/'
      const params = new URLSearchParams({
        client_id:     env.GOOGLE_CLIENT_ID,
        redirect_uri:  'https://hub.i771468.workers.dev/auth/google/callback',
        response_type: 'code',
        scope:         'email profile',
        state:         btoa(return_url),
      })
      return Response.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302
      )
    }

    // ── Google OAuth: callback ────────────────────────────────
    if (path === '/auth/google/callback') {
      const code       = url.searchParams.get('code')
      const return_url = atob(url.searchParams.get('state') || btoa('/'))

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id:     env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri:  'https://hub.i771468.workers.dev/auth/google/callback',
          grant_type:    'authorization_code',
        })
      })
      const { access_token } = await tokenRes.json()

      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      const { sub, email } = await userRes.json()

      let user = await env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(sub).first()

      if (!user) {
        await env.DB.prepare(
          'INSERT INTO users (id, email, role) VALUES (?, ?, ?)'
        ).bind(sub, email, 'editor').run()
        user = { id: sub, email, role: 'editor' }
      }

      const token = await signJWT(
        { sub: user.id, email: user.email, role: user.role },
        env.JWT_SECRET
      )

      return Response.redirect(`${return_url}?token=${token}`, 302)
    }

    // ── SSE (existing) ────────────────────────────────────────
    const id   = url.searchParams.get('id')
    const text = url.searchParams.get('text')

    if (req.method === 'GET' && id && text) {
      const { readable, writable } = new TransformStream()
      const writer  = writable.getWriter()
      const encoder = new TextEncoder()

      ;(async () => {
        await new Promise(r => setTimeout(r, 5000))
        await writer.write(encoder.encode(`data: echo: ${text}\n\n`))
        await writer.close()
      })()

      return new Response(readable, {
        headers: {
          ...cors,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      })
    }

    return new Response('not found', { status: 404 })
  }
}






- https://console.cloud.google.com/auth/clients/325888692252-898ld1tl4l8e1d1hv2v42ds7kjdunp7f.apps.googleusercontent.com?project=yastartup-1721582280306


TODO 

You're right — visitor is a public community member, no sensitive access, no reason to expire. Set it to 1 year:

js
const exp = {
  admin:   60 * 60 * 8,          // 8 hours
  editor:  60 * 60 * 24,         // 24 hours
  visitor: 60 * 60 * 24 * 365,   // 1 year
}[user.role] ?? 60 * 60 * 24

Or truly endless — just don't set exp for visitor role and skip expiry check in the Worker for that role. But a 1 year JWT is simpler and keeps the verification logic uniform.

Also one bug in your current Worker — exp is being passed inside the payload to signJWT but signJWT also sets its own exp from the hardcoded 86400 * 7. Fix signJWT to accept expiry as a parameter:

js
async function signJWT(payload, secret, exp) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body   = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + exp }))
  const key    = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  return `${header}.${body}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`
}

Then call:

js
const token = await signJWT(
  { sub: user.id, email: user.email, role: user.role, name: user.name, avatar: user.avatar, domain: user.domain },
  env.JWT_SECRET,
  exp  // ← passed separately, not in payload
)

Want the full corrected Worker?