import './CW-state.js'
import './CW-config.js'
import './CW-utils.js'
import './CW-run.js'
import './CW-adapter-d1.js'

export default {
  async fetch(req, env, ctx) {
    globalThis.env = globalThis.env || env

    const url  = new URL(req.url)
    const path = url.pathname

    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

    if (req.method === 'POST') {
      const run_doc   = await req.json()
      run_doc.options = { ...run_doc.options, expand: false }
      await CW.controller(run_doc)
      return Response.json(run_doc)
    }

    // serve index.html for / 
    if (req.method === 'GET' && (path === '/' || path === '/index.html')) {
      const res = await env.ASSETS.fetch(new Request(new URL('/shell.html', url)))
      return res
    }

    // serve all other static assets
    return env.ASSETS.fetch(req)
  }
}
