// ============================================================
// worker.js — CW Hub Worker
// ============================================================

import "./CW-state.js";
import "./CW-config.js";
import "./CW-utils.js";
import "./CW-run.js";
import "./CW-adapter-d1.js";
import "./boot.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(req, env, ctx) {
    globalThis.env = globalThis.env || env;

    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    // ── POST — CW operation ───────────────────────────────
    if (req.method === "POST") {
      const ip = req.headers.get("CF-Connecting-IP") || "unknown";
      if (!checkRateLimit(ip)) {
        return new Response("429 Too Many Requests", {
          status: 429,
          headers: CORS,
        });
      }
      try {
        const run_doc = await req.json();
        run_doc.user = await verifyJWT(
          req.headers.get("Authorization") || "",
          env.JWT_SECRET,
        );
        const op = { operation: run_doc.operation };
        CW._resolveAll(op);
        await globalThis.Adapters[op.adapter]?.[run_doc.operation]?.(run_doc);
        return Response.json(run_doc, { headers: CORS });
      } catch (err) {
        return Response.json(
          { error: err.message },
          { status: 500, headers: CORS },
        );
      }
    }

    // ── GET route dispatch ────────────────────────────────
    for (const route of CW._config.routes?.filter((r) => r.method === "GET") ||
      []) {
      if (!new URLPattern({ pathname: route.path }).exec(url)) continue;

      /*const run_doc = await CW.run({
        operation: route.operation,
        target_doctype: "Http",
        input: {
          provider: route.provider,
          code: url.searchParams.get("code"),
          state: url.searchParams.get("state"),
          //return_url: url.searchParams.get('state') ? atob(url.searchParams.get('state')) : '/',

          return_url: url.searchParams.get("state")
            ? new URL(atob(url.searchParams.get("state")), url.origin).href
            : url.origin + "/",
        },
        autosave: 0,
        options: { render: false },
      });*/

      const run_doc = await CW.run({
        operation: route.operation,
        target_doctype: "Http",
        input:
          route.operation === "oauthLogin"
            ? {
                provider: route.provider,
                return_url:
                  url.searchParams.get("return_url") || url.origin + "/",
              }
            : {
                provider: route.provider,
                code: url.searchParams.get("code"),
                state: url.searchParams.get("state"),
                return_url: url.searchParams.get("state")
                  ? new URL(atob(url.searchParams.get("state")), url.origin)
                      .href
                  : url.origin + "/",
              },
        autosave: 0,
        options: { render: false },
      });

      const doc = run_doc.target?.data?.[0];

      if (route.operation === "shell") {
        return env.ASSETS.fetch(new Request(new URL("/shell.html", url)));
      }

      if (route.operation === "oauthLogin") {
        if (!run_doc.success)
          return new Response(run_doc.error, { status: 404 });
        return Response.redirect(doc.redirect_url, 302);
      }

      if (route.operation === "oauthCallback") {
        if (!run_doc.success)
          return Response.redirect(
            `${doc?.return_url || "/"}#error=${encodeURIComponent(run_doc.error)}`,
            302,
          );
        return Response.redirect(`${doc.return_url}#token=${doc.token}`, 302);
      }
    }

    return env.ASSETS.fetch(req);
  },
};
