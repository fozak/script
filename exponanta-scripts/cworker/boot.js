async function bootstrap() {
  const base = window.location.origin

  // ── 1. load schemas ──────────────────────────────────────
  const docs = await fetch(`${base}/db.json`).then(r => r.json())
  globalThis.CW.Schema = {}
  for (const s of docs.filter(d => d.doctype === 'Schema')) {
    globalThis.CW.Schema[s.schema_name] = s
  }

  // ── 2. compile schemas ───────────────────────────────────
  globalThis.CW._compileSchemas()

  // ── 3. adapter init ──────────────────────────────────────
  const dbAdapter = CW._config.adapters?.defaults?.db
  const adapter   = globalThis.Adapters?.[dbAdapter]

  if (adapter?.init) await adapter.init()
  if (typeof authRestore === 'function') authRestore()

  if (adapter) {
    const adapterRun = await CW.run({
      operation:      'select',
      target_doctype: 'Adapter',
      view:           'form',
      options:        { render: false },
    })
    if (adapterRun.success) {
      adapterRun.target.data = adapterRun.target.data.filter(a => a.docstatus === 1)
      await CW._compileDocument(adapterRun)
    }
  }

  // ── 4. done ──────────────────────────────────────────────
  globalThis.CW._booted = true
  globalThis.dispatchEvent(new CustomEvent('CW:booted'))
  console.log('✅ CW bootstrap complete')
}

window.addEventListener('load', () => bootstrap())


