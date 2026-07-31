// boot.js

async function bootstrap() {
  if (globalThis._CW_booted) return

  const docs = await fetch('/db.json').then(r => r.json())
  globalThis.CW.Schema = {}
  for (const s of docs.filter(d => d.doctype === 'Schema')) {
    globalThis.CW.Schema[s.schema_name] = s
  }
  globalThis.CW._compileSchemas()

  globalThis._CW_booted = true
  console.log('✅ CW bootstrap complete')
}

// ── Worker bootstrap ─────────────────────────────────────────
async function workerBootstrap() {
  if (globalThis._CW_booted) return

  const docs = await fetch(globalThis.CW._config.hub.url + 'db.json').then(r => r.json())
  globalThis.CW.Schema = {}
  for (const s of docs.filter(d => d.doctype === 'Schema')) {
    globalThis.CW.Schema[s.schema_name] = s
  }
  globalThis.CW._compileSchemas()

  globalThis._CW_booted = true
  console.log('✅ CW Worker bootstrap complete')
}

// ── entry point ──────────────────────────────────────────────
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // browser
  window.addEventListener('load', () => bootstrap())
} else {
  // Worker
  globalThis._bootstrap    = workerBootstrap
  globalThis.CW._bootstrap = workerBootstrap
}


