// ============================================================
// remote-boot.js — CW Framework loader from hub (local-first)
// Place on hub: https://hub-cf.i771468.workers.dev/remote-boot.js
// Usage on any site: <script src="https://hub-cf.i771468.workers.dev/remote-boot.js"></script>
// ============================================================

(async () => {
  const HUB  = 'https://hub-cf.i771468.workers.dev/'
  const SITE = window.location.origin + '/'

  // ── 0. Fire HTML component fetches IMMEDIATELY ─────────────
  //        Runs in parallel with the framework download so
  //        /navbar.html is requested within milliseconds of
  //        remote-boot.js executing.
  const slots = [...document.querySelectorAll('[id]')]
    .filter(el => !el.innerHTML.trim())

  const htmlReady = Promise.all(slots.map(el =>
    fetch(SITE + el.id + '.html', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.text() : ''))
      .then(html => {
        if (html && el && !el.innerHTML.trim()) {
          el.innerHTML = html
          document.dispatchEvent(new CustomEvent('component:ready', {
            detail: { id: el.id }
          }))
        }
      })
      .catch(() => {})
  ))

  // ── 1. Load CW framework IN PARALLEL ───────────────────────
  const frameworkReady = (async () => {
    for (const src of [
      'CW-state.js',
      'CW-config.js',
      'CW-utils.js',
      'CW-run.js',
      'CW-adapter-d1.js',
      'boot.js'
    ]) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = HUB + src
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })
    }
  })()

  // ── 2. Wait until the HTML components have been injected ───
  await htmlReady

  // ── 3. Widgets — site first, hub fallback ──────────────────
  for (const el of [...document.querySelectorAll('[id]')]
        .filter(el => !el.innerHTML.trim())) {
    await new Promise(resolve => {
      const s = document.createElement('script')
      s.src = SITE + el.id + '.js'
      s.onload = resolve
      s.onerror = () => {
        const fallback = document.createElement('script')
        fallback.src = HUB + el.id + '.js'
        fallback.onload = resolve
        fallback.onerror = resolve
        document.head.appendChild(fallback)
      }
      document.head.appendChild(s)
    })
  }

  // ── 4. Ensure framework finished before signalling "done" ──
  await frameworkReady
  document.dispatchEvent(new Event('components:ready'))
})()