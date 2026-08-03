// ============================================================
// v 44.5 boot.js — isomorphic bootstrap for browser and Worker
// Same file, two execution paths based on env.DB presence
// ============================================================

async function bootstrap() {
  if (globalThis.CW._booted) return

  // ── 1. load schemas from db.json ─────────────────────────
  const base = globalThis.env?.DB
    ? globalThis.CW._config.hub.url
    : window.location.origin

  const docs = await fetch(`${base}/db.json`).then(r => r.json())
  globalThis.CW.Schema = {}
  for (const s of docs.filter(d => d.doctype === 'Schema')) {
    globalThis.CW.Schema[s.schema_name] = s
  }

  // ── 2. compile schemas ───────────────────────────────────
  globalThis.CW._compileSchemas()

  // ── 3. adapter init — browser only ──────────────────────
  if (!globalThis.env?.DB) {
    await globalThis.Adapters.pocketbase.init()
    if (typeof authRestore === 'function') authRestore()

    const adapterRun = await CW.run({
      operation:      'select',
      target_doctype: 'Adapter',
      view:           'form',
      options:        { render: false }
    })
    if (adapterRun.success) {
      adapterRun.target.data = adapterRun.target.data.filter(a => a.docstatus === 1)
      await CW._compileDocument(adapterRun)
    }
  }

  // ── 4. done ──────────────────────────────────────────────
  globalThis.CW._booted = true
  if (typeof window !== 'undefined') {
    globalThis.dispatchEvent(new CustomEvent('CW:booted'))
  }

  console.log('✅ CW bootstrap complete')
}

// ── entry point ──────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => bootstrap())
} else {
  globalThis.CW._bootstrap = bootstrap
}


/*

async function bootstrap() {
  const base = window.location.origin;

  // ── 1. Load schemas from db.json ─────────────────────────
  const docs = await fetch(`${base}/assets/db.json`).then(r => r.json());
  globalThis.CW.Schema = {};
  for (const s of docs.filter(d => d.doctype === "Schema")) {
    globalThis.CW.Schema[s.schema_name] = s;
  }
  globalThis.CW._compileSchemas();

  // ── 2. Init PocketBase adapter ───────────────────────────
  await globalThis.Adapters.pocketbase.init();

  // ── 3. Restore auth session ──────────────────────────────
  if (typeof authRestore === "function") authRestore();

  // ── 4. Load compiled Adapter records from PB ─────────────
  const adapterRun = await CW.run({
    operation: 'select',
    target_doctype: 'Adapter',
    view: 'form',
    options: { render: false }
  });
  if (adapterRun.success) {
    adapterRun.target.data = adapterRun.target.data.filter(a => a.docstatus === 1);
    await CW._compileDocument(adapterRun);
  }

  //console.log("✅ bootstrap complete");
  globalThis.CW._booted = true;
  globalThis.dispatchEvent(new CustomEvent('CW:booted'));
}

window.addEventListener("load", () => bootstrap());*/