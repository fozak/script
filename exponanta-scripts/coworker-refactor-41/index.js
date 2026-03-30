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
// COMPILE _state string functions to live JS
// ============================================================

function _compileStateSchema(schema) {
  const state = schema._state;
  if (!state) return;
  for (const [dim, def] of Object.entries(state)) {
    for (const [key, fnStr] of Object.entries(def.rules || {})) {
      if (typeof fnStr === "string") {
        try { def.rules[key] = eval("(" + fnStr + ")"); }
        catch(e) { console.error(`[CW] compile rules[${dim}][${key}]`, e); }
      }
    }
    for (const [key, fnStr] of Object.entries(def.sideEffects || {})) {
      if (typeof fnStr === "string") {
        try { def.sideEffects[key] = eval("(" + fnStr + ")"); }
        catch(e) { console.error(`[CW] compile sideEffects[${dim}][${key}]`, e); }
      }
    }
  }
}

// ============================================================
// BOOTSTRAP
// ============================================================

async function bootstrap() {
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  // Load config (fieldInteractionConfig, operations, adapters etc)
  if (!globalThis.CW._config) {
    globalThis.CW._config = await fetch(`${base}/config.json`).then(r => r.json());
  }

  // Load schemas from db.json
  const docs = await fetch(`${base}/db.json`).then(r => r.json());

  globalThis.CW.Schema = {};
  for (const s of docs.filter(d => d.doctype === "Schema")) {
    globalThis.CW.Schema[s.schema_name] = s;
    _compileStateSchema(s);
  }

  // Init PocketBase adapter (sets up pb global + Adapter.pocketbase)
  await globalThis.Adapter.pocketbase.init();

  // Restore auth session from pb.authStore + localStorage cache
  if (typeof authRestore === "function") authRestore();

  console.log("✅ bootstrap complete");
  globalThis.CW._booted = true;
}

// Browser: bootstrap on load
// Node/Worker: bootstrap immediately (for tests/server)
if (typeof window !== "undefined") {
  window.addEventListener("load", () => bootstrap());
} else {
  await bootstrap();
}

export default {
  async fetch(request, env) {
    if (!globalThis.CW._booted) await bootstrap();
    return globalThis.CW.controller(request);
  }
};
