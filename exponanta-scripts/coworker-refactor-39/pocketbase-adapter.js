// pocketbase-adapter.js

async function loadSDK() {
  if (globalThis.PocketBase) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/pocketbase@latest/dist/pocketbase.umd.js';
  await new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.head.appendChild(script); });
}

await loadSDK();

// rest of adapter...

// pocketbase-adapter.js

const config = {
  url: "http://143.198.29.88:8090/",
  autoCancellation: false,
  defaultCollection: "item",
};

async function init(run_doc) {
  globalThis.pb = globalThis.pb || new PocketBase(config.url);
  globalThis.pb.autoCancellation(config.autoCancellation);
  console.log('PocketBase initialized:', config.url);
}
async function select(run_doc) {
  const query      = run_doc.query || {};
  const collection = config.defaultCollection;

  const doctype =
    run_doc.target_doctype ??
    run_doc.source_doctype;

  if (!doctype) {
    run_doc.error = "400 Missing doctype";
    return;
  }

  const params = {
    filter: `data.doctype = "${doctype}"`,
  };

  if (query.filter) {
    params.filter = `${params.filter} && (${query.filter})`;
  }

  if (query.sort) {
    params.sort = query.sort;
  }

  const take = query.take;
  const skip = query.skip;

  let items, meta;

  if (take !== undefined) {
    const page   = skip ? Math.floor(skip / take) + 1 : 1;
    const result = await globalThis.pb.collection(collection).getList(page, take, params);

    items = result.items;
    meta  = {
      total:      result.totalItems,
      page:       result.page,
      pageSize:   result.perPage,
      totalPages: result.totalPages,
      hasMore:    result.page < result.totalPages,
    };
  } else {
    items = await globalThis.pb.collection(collection).getFullList(params);
    meta  = {
      total: items.length,
      page: 1,
      pageSize: items.length,
      totalPages: 1,
      hasMore: false
    };
  }

  run_doc.target = {
    data: items.map(item => item.data || item).filter(Boolean),
    meta,
  };

  run_doc.success = true;
}

/* previuos version
async function select(run_doc) {
  const query      = run_doc.query || {};
  const collection = config.defaultCollection;
  const params     = {};

  if (query.filter) params.filter = query.filter;
  if (query.sort)   params.sort   = query.sort;

  const take = query.take;
  const skip = query.skip;

  let items, meta;

  if (take !== undefined) {
    const page   = skip ? Math.floor(skip / take) + 1 : 1;
    const result = await globalThis.pb.collection(collection).getList(page, take, params);
    items = result.items;
    meta  = {
      total:      result.totalItems,
      page:       result.page,
      pageSize:   result.perPage,
      totalPages: result.totalPages,
      hasMore:    result.page < result.totalPages,
    };
  } else {
    items = await globalThis.pb.collection(collection).getFullList(params);
    meta  = { total: items.length, page: 1, pageSize: items.length, totalPages: 1, hasMore: false };
  }

  run_doc.target = {
    data: items.map(item => item.data || item).filter(Boolean),
    meta,
  };
  run_doc.success = true;
}
*/
async function create(run_doc) {
  const input      = run_doc.input || {};
  const collection = config.defaultCollection;
  const id         = input.name || generateId(run_doc.target_doctype);
  const record     = Object.assign({}, input, { name: id, doctype: input.doctype || run_doc.target_doctype });
  const created    = await globalThis.pb.collection(collection).create({ id, name: id, doctype: record.doctype, data: record });
  run_doc.target   = { data: [created.data], meta: { id: created.id, name: created.name } };
  run_doc.success  = true;
}

async function update(run_doc) {
  const input      = run_doc.input || {};
  const collection = config.defaultCollection;
  const where      = run_doc.query?.where;

  if (!where) { run_doc.error = '400 UPDATE requires query.where'; return; }

  const filter   = Object.entries(where).map(([k, v]) => `data.${k} = "${v}"`).join(' && ');
  const existing = await globalThis.pb.collection(collection).getFullList({ filter });

  if (existing.length === 0) {
    run_doc.target  = { data: [], meta: { updated: 0 } };
    run_doc.success = true;
    return;
  }

  const updated = await Promise.all(existing.map(async rec => {
    const merged = Object.assign({}, rec.data, input, { name: rec.data.name, doctype: rec.data.doctype });
    await globalThis.pb.collection(collection).update(rec.id, { data: merged });
    return merged;
  }));

  run_doc.target  = { data: updated, meta: { updated: updated.length } };
  run_doc.success = true;
}

async function del(run_doc) {
  const collection = config.defaultCollection;
  const where      = run_doc.query?.where;

  if (!where || Object.keys(where).length === 0) { run_doc.error = '400 DELETE requires query.where'; return; }

  const filter   = Object.entries(where).map(([k, v]) => `data.${k} = "${v}"`).join(' && ');
  const existing = await globalThis.pb.collection(collection).getFullList({ filter });

  if (existing.length === 0) {
    run_doc.target  = { data: [], meta: { deleted: 0 } };
    run_doc.success = true;
    return;
  }

  await Promise.all(existing.map(rec => globalThis.pb.collection(collection).delete(rec.id)));
  run_doc.target  = { data: [], meta: { deleted: existing.length } };
  run_doc.success = true;
}

export default { config, init, select, create, update, delete: del };

Object.assign(globalThis, { pbInit: init, pbSelect: select, pbCreate: create, pbUpdate: update, pbDelete: del });


// Self-register to global Adapter registry
globalThis.Adapter = globalThis.Adapter || {};
globalThis.Adapter['pocketbase'] = { config, init, select, create, update, delete: del };