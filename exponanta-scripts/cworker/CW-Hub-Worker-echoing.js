export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const text = url.searchParams.get('text')

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

    if (req.method === 'GET' && id && text) {
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()
      const encoder = new TextEncoder()

      // same request context — no cross-request I/O
      ;(async () => {
        await new Promise(r => setTimeout(r, 5000))
        await writer.write(encoder.encode(`data: echo: ${text}\n\n`))
        await writer.close()
      })()

      return new Response(readable, {
        headers: {
          ...cors,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      })
    }

    return new Response('not found', { status: 404 })
  }
}