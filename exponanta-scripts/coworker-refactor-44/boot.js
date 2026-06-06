//boot only 
// boot.js

async function bootstrap() {
  const base = window.location.origin;

  // ── 1. Load schemas from db.json ─────────────────────────
  const docs = await fetch(`${base}/db.json`).then(r => r.json());
  globalThis.CW.Schema = {};
  for (const s of docs.filter(d => d.doctype === "Schema")) {
    globalThis.CW.Schema[s.schema_name] = s;
  }
  globalThis.CW._compileSchemas();

  // ── 2. Init PocketBase adapter ───────────────────────────
  await globalThis.Adapter.pocketbase.init();

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

  console.log("✅ bootstrap complete");
  globalThis.CW._booted = true;
  globalThis.dispatchEvent(new CustomEvent('CW:booted'));
}

window.addEventListener("load", () => bootstrap());