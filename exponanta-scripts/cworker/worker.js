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

    const url  = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    // ── OAuth login redirect ──────────────────────────────
    if (req.method === 'GET' && path.match(/^\/auth\/(\w+)\/login$/)) {
      const provider = path.split('/')[2]
      const cfg      = CW._config.oauth?.[provider]
      if (!cfg) return new Response('Unknown provider', { status: 404 })
      const params = new URLSearchParams({
        client_id:     env[`${provider.toUpperCase()}_CLIENT_ID`],
        redirect_uri:  `${CW._config.hub.url}auth/${provider}/callback`,
        response_type: 'code',
        scope:         cfg.scope,
        state:         btoa(url.searchParams.get('return_url') || '/'),
      })
      return Response.redirect(`${cfg.authUrl}?${params}`, 302)
    }

    // ── OAuth callback — debug version ────────────────────
    if (req.method === 'GET' && path.match(/^\/auth\/(\w+)\/callback$/)) {
      const provider = path.split('/')[2]
      const code     = url.searchParams.get('code')
      const cfg      = CW._config.oauth?.[provider]

      if (!cfg) return new Response('Unknown provider', { status: 404 })
      if (!code) return Response.json({ error: 'no code' }, { headers: CORS })

      // exchange code
      const tokenRes = await fetch(cfg.tokenUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          code,
          client_id:     env[`${provider.toUpperCase()}_CLIENT_ID`],
          client_secret: env[`${provider.toUpperCase()}_CLIENT_SECRET`],
          redirect_uri:  `${CW._config.hub.url}auth/${provider}/callback`,
          grant_type:    'authorization_code',
        })
      })
      const tokens = await tokenRes.json()

      // get user info
      const userRes    = await fetch(cfg.userInfoUrl, {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      })
      const googleUser = await userRes.json()

      // return raw for debugging
      return Response.json({ tokens, googleUser }, { headers: CORS })
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
