//v4 NOT impleneted

(()=>{
  const { url } = CW._config.hub

  // ── grab token from URL hash if returning from OAuth ──
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const incoming = hash.get('token')
  if (incoming) {
    localStorage.setItem('nesen_token', incoming)
    window.history.replaceState({}, '', window.location.pathname)
  }

  // ── decode token ──
  const token = localStorage.getItem('nesen_token')
  let userPayload = null
  if (token) {
    try {
      userPayload = JSON.parse(atob(token.split('.')[1]))
    } catch(e) {
      localStorage.removeItem('nesen_token')
    }
  }

  // ── gravatar ──
  async function gravatar(email) {
    const clean = email.trim().toLowerCase()
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clean))
    const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
    return `https://gravatar.com/avatar/${hex}?d=identicon&s=32`
  }

  // --- inject styles ---
  document.head.insertAdjacentHTML('beforeend', `<style>
    #cw-widget { position:fixed; bottom:24px; right:24px; z-index:9999; font-family:sans-serif; }
    #cw-bubble { width:52px; height:52px; border-radius:50%; background:#123C7A; color:#fff; border:none; cursor:pointer; font-size:24px; }
    #cw-panel  { display:none; flex-direction:column; width:320px; height:420px; background:#fff; border:1px solid #ddd; border-radius:12px; overflow:hidden; margin-bottom:12px; }
    #cw-panel.open { display:flex; }
    #cw-user   { display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid #eee; background:#f9f9f9; }
    #cw-user img { width:32px; height:32px; border-radius:50%; }
    #cw-user-info div:first-child { font-size:13px; font-weight:600; }
    #cw-user-info div:last-child  { font-size:11px; color:#888; }
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
        <div id="cw-user" style="display:none;">
          <img id="cw-avatar" src="" />
          <div id="cw-user-info">
            <div id="cw-email"></div>
            <div id="cw-role"></div>
          </div>
        </div>
        <div id="cw-messages"></div>
        <div id="cw-input-row">
          <input id="cw-input" type="text" placeholder="Type a message..." />
          <button id="cw-send">Send</button>
        </div>
      </div>
      <button id="cw-bubble">💬</button>
    </div>
  `)

  const panel    = document.getElementById('cw-panel')
  const messages = document.getElementById('cw-messages')
  const input    = document.getElementById('cw-input')
  const send     = document.getElementById('cw-send')
  const bubble   = document.getElementById('cw-bubble')

  // ── render user header ──
  async function renderUser() {
    if (!userPayload) return
    const avatarUrl = await gravatar(userPayload.email)
    document.getElementById('cw-avatar').src = avatarUrl
    document.getElementById('cw-email').textContent = userPayload.email
    document.getElementById('cw-role').textContent = userPayload.role
    document.getElementById('cw-user').style.display = 'flex'
  }
  renderUser()

  const addMsg = (text, role) => {
    const div = document.createElement('div')
    div.className = `cw-msg ${role}`
    div.textContent = text
    messages.appendChild(div)
    messages.scrollTop = messages.scrollHeight
    return div
  }

  const sendMsg = async () => {
    const text = input.value.trim()
    if (!text) return

    // ── redirect to login if no token ──
    const token = localStorage.getItem('nesen_token')
    if (!token) {
      window.location.href = `https://hub.i771468.workers.dev/auth/google?return_url=${encodeURIComponent(window.location.href)}`
      return
    }

    input.value = ''
    addMsg(text, 'user')
    const thinking = addMsg('...', 'bot')

    const res = await fetch(`${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    })

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) return
      buf += decoder.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop()
      for (const part of parts) {
        if (part.startsWith('data:'))
          thinking.textContent = part.slice(5).trim()
      }
      pump()
    })
    pump()
  }

  bubble.onclick  = () => panel.classList.toggle('open')
  send.onclick    = sendMsg
  input.onkeydown = e => { if (e.key === 'Enter') sendMsg() }

})()