// ============================================================
// worker.js — CW Hub Worker
// Serves shell.html + routes run_doc to CW.controller
// ============================================================

import './CW-state.js'
import './CW-config.js'
import './CW-utils.js'
import './CW-run.js'
import './CW-adapter-d1.js'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
// ── worker on cloudflare
// 
//JWT ───────────────────────────────────────────────────────
const b64url = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function signJWT(payload, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 * 7 }))
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`))
  return `${header}.${body}.${b64url(String.fromCharCode(...new Uint8Array(sig)))}`
}

// ── Worker ────────────────────────────────────────────────────
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    const path = url.pathname

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

    // ── Google OAuth: redirect ────────────────────────────────
    if (path === '/auth/google') {
      const return_url = url.searchParams.get('return_url') || '/'
      const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: 'https://hub.i771468.workers.dev/auth/google/callback',
        response_type: 'code',
        scope: 'email profile',
        state: btoa(return_url),
      })
      return Response.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302
      )
    }

    // ── Google OAuth: callback ────────────────────────────────
    if (path === '/auth/google/callback') {
      const code = url.searchParams.get('code')
      const return_url = atob(url.searchParams.get('state') || btoa('/'))

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: 'https://hub.i771468.workers.dev/auth/google/callback',
          grant_type: 'authorization_code',
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

      return new Response(`OK: ${return_url} token=${token.slice(0,20)}`, { status: 200 })
    }    // ── SSE ───────────────────────────────────────────────────
    if (req.method === 'POST') {

      const { text } = await req.json()
const { fn, args } = JSON.parse(text)


      const registry = {
        echo:    ({ text })      => `echo: ${text}`,
        users:   (_, env)        => env.DB.prepare('SELECT * FROM users').all().then(r => JSON.stringify(r.results)),
        fetch:   ({ url })       => fetch(url).then(r => r.json()).then(d => JSON.stringify(d)),
      }

      const { readable, writable } = new TransformStream()
      const writer  = writable.getWriter()
      const encoder = new TextEncoder()

      ctx.waitUntil((async () => {
        try {
          const handler = registry[fn]
          if (!handler) throw new Error(`Unknown function: ${fn}`)
          const result = await handler(args || {}, env)
          await writer.write(encoder.encode(`data: ${result}\n\n`))
        } catch (err) {
          await writer.write(encoder.encode(`data: Error: ${err.message}\n\n`))
        } finally {
          await writer.close()
        }
      })())

      return new Response(readable, {
        headers: { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
      })
    }

     return new Response('not found', { status: 404 })
  }
}