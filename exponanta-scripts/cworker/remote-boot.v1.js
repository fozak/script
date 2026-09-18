// ============================================================
// remote-boot.js — CW Framework loader from hub
// Place on hub: https://hub-cf.i771468.workers.dev/remote-boot.js
// Usage on any site: <script src="https://hub-cf.i771468.workers.dev/remote-boot.js"></script>
// ============================================================

(async () => {
  const HUB = 'https://hub-cf.i771468.workers.dev/'

  const scripts = [
    'CW-state.js',
    'CW-config.js',
    'CW-utils.js',
    'CW-run.js',
    'CW-adapter-d1.js',
    'boot.js',
  ]

  for (const src of scripts) {
    await new Promise((resolve, reject) => {
      const s    = document.createElement('script')
      s.src      = HUB + src
      s.onload   = resolve
      s.onerror  = reject
      document.head.appendChild(s)
    })
  }
})()