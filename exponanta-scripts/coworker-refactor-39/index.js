import "./CW-state.js";
import "./CW-config.js";
import "./CW-utils.js";
import "./NEW-controller.js";

if (typeof process !== "undefined") {
  const { config } = await import("dotenv");
  config();
}

async function bootstrap(env) {
  const resolvedEnv = env || (typeof process !== "undefined" ? process.env : {});
  const base = resolvedEnv.BASE_URL || "http://localhost:3000";

  globalThis.CW._config = await fetch(`${base}/config.json`).then((r) => r.json());
  if (resolvedEnv.JWT_SECRET) globalThis.CW._config.auth.jwtSecret = resolvedEnv.JWT_SECRET;

  const docs = await fetch(`${base}/db.json`).then((r) => r.json());

  globalThis.Schema = {};
  for (const s of docs.filter((d) => d.doctype === "Schema")) {
    globalThis.Schema[s.schema_name] = s;
  }

  await globalThis.CW._compileDocument({
    target: {
      data: docs.filter((d) => d.doctype === "Adapter" || d.doctype === "Schema"),
    },
  });

  if (globalThis.CW.Adapter[globalThis.CW._config.adapters.defaults.db]?.init) {
    await globalThis.CW.Adapter[globalThis.CW._config.adapters.defaults.db].init({
      target: { data: [globalThis.CW.Adapter[globalThis.CW._config.adapters.defaults.db]] },
    });
  }

  console.log("✅ bootstrap complete");
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => bootstrap());
} else {
  bootstrap();
}

export default {
  async fetch(request, env) {
    if (!globalThis.CW._booted) {
      await bootstrap(env);
      globalThis.CW._booted = true;
    }
    return globalThis.CW.controller(request);
  },
};
