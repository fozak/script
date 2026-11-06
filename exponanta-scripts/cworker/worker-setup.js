// Test entry: imports the framework exactly like worker.js does, exposes a probe endpoint.
import "./CW-state.js";
import "./CW-slugify.js";
import "./CW-config.js";
import "./CW-utils.js";
import "./CW-run.js";
import "./CW-adapter-d1.js";
import "./boot.js";
export default {
  async fetch(req, env) {
    globalThis.env = env;
    const u = new URL(req.url);
    if (u.pathname === '/__probe') {
      globalThis.currentUser = { name:'user04i8sjhj7zc', domain:'hub-cf.i771468.workers.dev', _allowed:['rolesystemmanag'], _allowed_read:['rolesystemmanag'] };
      const out = { runtime: typeof WebSocketPair !== 'undefined' ? 'workerd' : 'other',
        hasWindow: typeof window !== 'undefined', slugRu: CW.slugify('искусство переговоров'),
        slugKz: CW.slugify('Қазақстан әдемі'), hasRun: typeof CW.run };
      const r = await CW.run({ operation:'create', target_doctype:'HtmlForm',
        input:{ form_type:'Guest Visit', title:'Guest Visit', domain:'hub-cf.i771468.workers.dev' }, options:{render:false} });
      out.create = { success:r.success, error:r.error, slug:r.target?.data?.[0]?.slug, id:r.target?.data?.[0]?.id };
      return Response.json(out);
    }
    return new Response('ok');
  }
}
