// boot.js

async function bootstrap() {
  const base = window.location.origin;

  // ── 1. Load schemas from db.json ──────────────────────────
  const docs = await fetch(`${base}/db.json`).then(r => r.json());
  globalThis.CW.Schema = {};
  for (const s of docs.filter(d => d.doctype === "Schema")) {
    globalThis.CW.Schema[s.schema_name] = s;
  }
  globalThis.CW._compileSchemas();

  // ── 2. Init active adapter ─────────────────────────────────
  const adapter = CW._config.adapters.defaults.db
  await globalThis.Adapters[adapter]?.init?.()

  // ── 3. Restore auth session ────────────────────────────────
  const stored = JSON.parse(localStorage.getItem('currentUser') || 'null')
  if (stored?.token) {
    try {
      const payload = JSON.parse(atob(stored.token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
      if (payload.exp > Date.now() / 1000) {
        globalThis.currentUser = stored
        _dispatchAuthChange(stored)
      } else {
        localStorage.removeItem('currentUser')
      }
    } catch { localStorage.removeItem('currentUser') }
  }

  // ── 4. Load compiled Adapter records ──────────────────────
  const adapterRun = await CW.run({
    operation:      'select',
    target_doctype: 'Adapter',
    view:           'form',
    options:        { render: false }
  });
  if (adapterRun.success) {
    adapterRun.target.data = adapterRun.target.data.filter(a => a.docstatus === 1);
    await CW._compileDocument(adapterRun);
  }

  globalThis.CW._booted = true;
  globalThis.dispatchEvent(new CustomEvent('CW:booted'));
}

window.addEventListener("load", () => bootstrap());