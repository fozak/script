import "./CW-state.js";
import "./CW-config.js";
import "./CW-utils.js";
import "./CW-run.js";
import "./pb-adapter-pocketbase.js";

async function bootstrap() {
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  if (!globalThis.CW._config) {
    globalThis.CW._config = await fetch(`${base}/config.json`).then(r => r.json());
  }

  const docs = await fetch(`${base}/db.json`).then(r => r.json());

  globalThis.CW.Schema = {};
  for (const s of docs.filter(d => d.doctype === "Schema")) {
    globalThis.CW.Schema[s.schema_name] = s;
  }

  await globalThis.Adapter.pocketbase.init();

  console.log("✅ bootstrap complete");
  globalThis.CW._booted = true;
}

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
