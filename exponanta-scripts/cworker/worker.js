// ============================================================
// worker.js — CW Hub Worker
// Serves shell.html + routes run_doc to CW.controller
// ============================================================

import './CW-state.js'
import './CW-config.js'
import './CW-utils.js'
import './CW-run.js'
import './CW-adapter-d1.js'
import './boot.js'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export default {
  async fetch(req, env, ctx) {
    globalThis.env = globalThis.env || env

    //await CW._bootstrap()  // ← free after first request due to _booted flag

    const url  = new URL(req.url)
    const path = url.pathname

    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

    if (req.method === 'POST') {
      try {
        const run_doc   = await req.json()
        const token     = req.headers.get('Authorization') || ''
        try { run_doc.user = await verifyJWT(token, env.JWT_SECRET) } catch { run_doc.user = {} }
        run_doc.options = { ...run_doc.options, expand: false }
        await CW.controller(run_doc)
        return Response.json(run_doc, { headers: CORS })
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500, headers: CORS })
      }
    }

    if (req.method === 'GET' && (path === '/' || path === '/index.html')) {
      return env.ASSETS.fetch(new Request(new URL('/shell.html', url)))
    }

    return env.ASSETS.fetch(req)
  }
}