// ============================================================
// CW-adapter-dispatch.js
// Extension-based transform dispatcher.
// Reads target.data[0].extension → calls Adapters[ext].update(run_doc)
// Additive: never replaces target, only delegates to extension adapter
// ============================================================

async function update(run_doc) {
  const ext = run_doc.target?.data?.[0]?.extension;
  if (!ext) return;

  const adapter = globalThis.Adapters[ext];
  if (!adapter?.update) return;

  await adapter.update(run_doc);
}

// ============================================================
// SELF-REGISTER
// ============================================================

globalThis.Adapters          = globalThis.Adapters || {};
globalThis.Adapters.dispatch = { update };

console.log('✅ CW-adapter-dispatch.js loaded');