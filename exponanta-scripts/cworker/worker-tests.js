// worker-tests.js — runs the framework inside real workerd via Miniflare (local D1)
// node worker-tests.js
const { Miniflare } = require('miniflare'), esbuild = require('esbuild'), fs = require('node:fs'), assert = require('node:assert/strict')
;(async () => {
  const bundle = esbuild.buildSync({ entryPoints:['harness-worker.js'], bundle:true, format:'esm', write:false, platform:'neutral', target:'es2022' }).outputFiles[0].text
  const mf = new Miniflare({ modules:true, script:bundle, compatibilityDate:'2025-01-01', d1Databases:['DB'] })
  const db = await mf.getD1Database('DB')
  for (const s of fs.readFileSync('../ddl.sql','utf8').split(';').map(x=>x.trim()).filter(Boolean)) await db.prepare(s).run()
  const res = await (await mf.dispatchFetch('http://x/__probe')).json()
  console.log(JSON.stringify(res,null,1))
  assert.equal(res.runtime,'workerd'); assert.equal(res.hasWindow,false)
  assert.equal(res.slugRu,'iskusstvo-peregovorov'); assert.equal(res.slugKz,'k-azak-stan-demi')
  assert.equal(res.create.success,true); assert.equal(res.create.slug,'guest-visit')
  const row = await db.prepare('select doctype from item where id=?').bind(res.create.id).first()
  assert.equal(row.doctype,'HtmlForm')
  console.log('WORKER TESTS PASS'); await mf.dispose()
})().catch(e=>{console.error('FAIL',e);process.exit(1)})
