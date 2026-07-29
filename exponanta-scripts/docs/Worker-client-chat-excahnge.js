












//--v1 - echo only

// ── worker on cloudflare
// 
//JWT ───────────────────────────────────────────────────────
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

// -- client

// ============================================================
// CW-hub-client.js
// ============================================================

(()=>{
  const { url } = CW._config.hub

  // --- inject styles ---
  document.head.insertAdjacentHTML('beforeend', `<style>
    #cw-widget { position:fixed; bottom:24px; right:24px; z-index:9999; font-family:sans-serif; }
    #cw-bubble { width:52px; height:52px; border-radius:50%; background:#123C7A; color:#fff; border:none; cursor:pointer; font-size:24px; }
    #cw-panel  { display:none; flex-direction:column; width:320px; height:420px; background:#fff; border:1px solid #ddd; border-radius:12px; overflow:hidden; margin-bottom:12px; }
    #cw-panel.open { display:flex; }
    #cw-messages { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; }
    .cw-msg { padding:8px 12px; border-radius:8px; max-width:80%; font-size:14px; line-height:1.4; }
    .cw-msg.user { background:#123C7A; color:#fff; align-self:flex-end; }
    .cw-msg.bot  { background:#f1f1f1; color:#111; align-self:flex-start; }
    #cw-input-row { display:flex; border-top:1px solid #eee; }
    #cw-input { flex:1; border:none; padding:10px; font-size:14px; outline:none; }
    #cw-send  { border:none; background:#123C7A; color:#fff; padding:10px 16px; cursor:pointer; font-size:14px; }
  </style>`)

  // --- inject DOM ---
  document.body.insertAdjacentHTML('beforeend', `
    <div id="cw-widget">
      <div id="cw-panel">
        <div id="cw-messages"></div>
        <div id="cw-input-row">
          <input id="cw-input" type="text" placeholder="Type a message..." />
          <button id="cw-send">Send</button>
        </div>
      </div>
      <button id="cw-bubble">💬</button>
    </div>
  `)

  // --- refs ---
  const panel    = document.getElementById('cw-panel')
  const messages = document.getElementById('cw-messages')
  const input    = document.getElementById('cw-input')
  const send     = document.getElementById('cw-send')
  const bubble   = document.getElementById('cw-bubble')

  // --- helpers ---
  const addMsg = (text, role) => {
    const div = document.createElement('div')
    div.className = `cw-msg ${role}`
    div.textContent = text
    messages.appendChild(div)
    messages.scrollTop = messages.scrollHeight
    return div
  }

  // --- send message ---
 const sendMsg = () => {
  const text = input.value.trim()
  if (!text) return
  input.value = ''

  addMsg(text, 'user')
  const thinking = addMsg('...', 'bot')

  const id = crypto.randomUUID()
  const es = new EventSource(`${url}?id=${id}&text=${encodeURIComponent(text)}`)
  
  es.onmessage = e => {
    thinking.textContent = e.data
    es.close()
  }
  
  es.onerror = () => {
    thinking.textContent = 'Error — try again'
    es.close()
  }
}
  // --- events ---
  bubble.onclick = () => panel.classList.toggle('open')
  send.onclick   = sendMsg
  input.onkeydown = e => { if (e.key === 'Enter') sendMsg() }

})()