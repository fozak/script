// ============================================================
// remote-boot.js — CW Framework loader from hub
// Place on hub: https://hub-cf.i771468.workers.dev/remote-boot.js
// Usage on any site: <script src="https://hub-cf.i771468.workers.dev/remote-boot.js"></script>
// ============================================================

(async () => {
  const HUB  = 'https://hub-cf.i771468.workers.dev/'
  const SITE = window.location.origin + '/'

  // 1. CW framework
  for (const src of ['CW-state.js', 'CW-config.js', 'CW-utils.js', 'CW-run.js', 'CW-adapter-d1.js', 'boot.js']) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = HUB + src
      s.onload = resolve
      s.onerror = reject
      document.head.appendChild(s)
    })
  }

  // 2. HTML components from site
  await Promise.all(
    [...document.querySelectorAll('[id]')]
      .filter(el => !el.innerHTML.trim())
      .map(async el => {
        try {
          const res = await fetch(SITE + el.id + '.html')
          if (!res.ok) return
          el.innerHTML = await res.text()
        } catch {}
      })
  )

  // 3. widgets from hub — empty divs after HTML components
  for (const el of [...document.querySelectorAll('[id]')].filter(el => !el.innerHTML.trim())) {
    await new Promise((resolve) => {
      const s = document.createElement('script')
      s.src = HUB + el.id + '.js'
      s.onload = resolve
      s.onerror = resolve
      document.head.appendChild(s)
    })
  }

  document.dispatchEvent(new Event('components:ready'))
})()