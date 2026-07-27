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