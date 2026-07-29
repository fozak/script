// ============================================================
// index.js — CW bootstrap
// Load order: CW-state → CW-config → CW-utils → CW-run → pb-adapter → auth
// ============================================================

import "./CW-state.js";
import "./CW-config.js";
import "./CW-utils.js";
import "./CW-run.js";
import "./pb-adapter-pocketbase.js";
import "./auth.js";

// ============================================================
// BOOTSTRAP
// ============================================================

// ============================================================
// BOOTSTRAP
// ============================================================

async function bootstrap() {
  const base = typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";

  // Load schemas from db.json — populate CW.Schema
  const docs = await fetch(`${base}/db.json`).then(r => r.json());
  globalThis.CW.Schema = {};
  for (const s of docs.filter(d => d.doctype === "Schema")) {
    globalThis.CW.Schema[s.schema_name] = s;
  }

  // Compile sideEffects and rules strings → live functions
  globalThis.CW._compileSchemas();

  // Init PocketBase adapter
  await globalThis.Adapters.pocketbase.init();

  // Restore auth session
  if (typeof authRestore === "function") authRestore();

  // Load and compile submitted Adapter records from PocketBase
  const adapterRun = await CW.run({
  operation: 'select',
  target_doctype: 'Adapter',
  view: 'form',
  options: { render: false }
});
  if (adapterRun.success) {
    adapterRun.target.data = adapterRun.target.data.filter(a => a.docstatus === 1)
    await CW._compileDocument(adapterRun)
  }

  console.log("✅ bootstrap complete");
  globalThis.CW._booted = true;
  globalThis.dispatchEvent(new CustomEvent('CW:booted'));
}


if (typeof window !== "undefined") {
  window.addEventListener("load", () => bootstrap());
} else {
  await bootstrap();
}
