// ============================================================
// v1 CW-adapter-d1.js
// Pure DB connector. No business logic.
// All functions: function(run_doc) — mutate only, no return.
// Reads from run_doc.target.data[0] — never from run_doc.input
// ============================================================

// CW-adapter-d1.js
(() => {

const _post = async (run_doc) => {
  const res = await fetch(CW._config.hub.url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': run_doc.user?.token || ''
    },
    body: JSON.stringify(run_doc)
  })
  Object.assign(run_doc, await res.json())
}

async function select(run_doc) {
  if (globalThis.env?.DB) {
    const doctype = run_doc.target_doctype ?? run_doc.source_doctype
    const rows    = await globalThis.env.DB.prepare(
      `SELECT * FROM item WHERE doctype=?`
    ).bind(doctype).all()
    run_doc.target  = { data: rows.results.map(r => ({ ...JSON.parse(r.data || '{}'), id: r.id })) }
    run_doc.success = true
  } else {
    await _post(run_doc)
  }
}

globalThis.Adapters     = globalThis.Adapters || {}
globalThis.Adapters.d1  = { select }

})()