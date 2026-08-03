// ============================================================
// worker.js — CW Hub Worker
// Serves shell.html + routes run_doc to CW.controller
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

    const url  = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    // ── OAuth callback ────────────────────────────────────
    if (req.method === "GET" && path.match(/^\/auth\/(\w+)\/callback$/)) {
      const provider   = path.split('/')[2]
      const code       = url.searchParams.get('code')
      const return_url = atob(url.searchParams.get('state') || btoa('/'))

      const run_doc = await CW.run({
        operation:      'loginWithOAuth',
        target_doctype: 'User',
        input:          { provider, code },
        options:        { render: false }
      })

      if (!run_doc.success)
        return Response.redirect(`${return_url}?error=${encodeURIComponent(run_doc.error)}`, 302)

      return Response.redirect(`${return_url}#token=${run_doc.user.token}`, 302)
    }

    // ── CW POST ───────────────────────────────────────────
    if (req.method === "POST") {
      try {
        const run_doc = await req.json();
        const token   = req.headers.get("Authorization") || "";
        try {
          run_doc.user = await verifyJWT(token, env.JWT_SECRET);
        } catch {
          run_doc.user = {};
        }
        const adapter = CW._getAdapters(run_doc)[0];
        await globalThis.Adapters[adapter][run_doc.operation]?.(run_doc);
        return Response.json(run_doc, { headers: CORS });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: CORS });
      }
    }

    // ── Shell ─────────────────────────────────────────────
    if (req.method === "GET" && (path === "/" || path === "/index.html")) {
      return env.ASSETS.fetch(new Request(new URL("/shell.html", url)));
    }

    return env.ASSETS.fetch(req);
  },
};
