{
    "_states": "",
    "adapter_name": "pocketbase",
    "config": {
        "url": "http://143.198.29.88:8090/",
        "autoCancellation": false,
        "defaultCollection": "item"
    },
    "doctype": "Adapter",
    "functions": {
        "init": "function(run_doc) { const adapter = run_doc.target.data[0]; const config = adapter.config; globalThis.pb = globalThis.pb || new PocketBase(config.url); globalThis.pb.autoCancellation(config.autoCancellation); console.log('✓ PocketBase initialized:', config.url); return run_doc; }",
        "select": "async function(run_doc) { const adapter = run_doc.target.data[0]; const query = run_doc.query || {}; const collection = adapter.config.defaultCollection; const params = {}; if (query.filter) params.filter = query.filter; if (query.sort) params.sort = query.sort; const take = query.take; const skip = query.skip; let result; let items; let metaData; if (take !== undefined) { const page = skip ? Math.floor(skip / take) + 1 : 1; result = await globalThis.pb.collection(collection).getList(page, take, params); items = result.items; metaData = { total: result.totalItems, page: result.page, pageSize: result.perPage, totalPages: result.totalPages, hasMore: result.page < result.totalPages }; } else { items = await globalThis.pb.collection(collection).getFullList(params); metaData = { total: items.length, page: 1, pageSize: items.length, totalPages: 1, hasMore: false }; } run_doc.output = { data: items.map(item => item.data).filter(data => data != null), meta: metaData }; run_doc.success = true; return run_doc; }",
        "insert": "async function(run_doc) { const adapter = run_doc.target.data[0]; const data = run_doc.input?.data || run_doc.input; const collection = adapter.config.defaultCollection; const recordId = typeof generateId === 'function' ? generateId(data.doctype?.toLowerCase() || 'record') : new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}; const doctype = data.doctype; if (!doctype) throw new Error('CREATE requires doctype'); const completeData = { id: recordId, name: recordId, doctype: doctype, ...data }; const created = await globalThis.pb.collection(collection).create({ id: recordId, name: recordId, doctype: doctype, data: completeData }); run_doc.output = { data: created.data, meta: { id: created.id, name: created.name, created: created.created, doctype: created.doctype } }; run_doc.success = true; return run_doc; }",
        "update": "async function(run_doc) { const adapter = run_doc.target.data[0]; const data = run_doc.input?.data || run_doc.input; const identifier = run_doc.input?.id || run_doc.input?.name; const collection = adapter.config.defaultCollection; if (!identifier) throw new Error('UPDATE requires id or name'); let recordId; let recordName; let existingRecord; const isPocketBaseId = /^[a-z0-9]{15}$/.test(identifier); if (isPocketBaseId) { recordId = identifier; recordName = identifier; existingRecord = await globalThis.pb.collection(collection).getOne(recordId); } else { const records = await globalThis.pb.collection(collection).getFullList({ filter: data.name = \"${identifier}\" }); if (records.length === 0) throw new Error(Record not found: ${identifier}); existingRecord = records[0]; recordId = existingRecord.id; recordName = existingRecord.name || existingRecord.id; } const doctype = data.doctype || existingRecord.doctype; if (!doctype) throw new Error('UPDATE requires doctype'); const completeData = { id: recordId, name: recordName, doctype: doctype, ...data }; const updated = await globalThis.pb.collection(collection).update(recordId, { name: recordName, doctype: doctype, data: completeData }); run_doc.output = { data: updated.data, meta: { id: updated.id, name: updated.name, updated: updated.updated, doctype: updated.doctype } }; run_doc.success = true; return run_doc; }",
        "delete": "async function(run_doc) { const adapter = run_doc.target.data[0]; const identifier = run_doc.input?.id || run_doc.input?.name; const collection = adapter.config.defaultCollection; if (!identifier) throw new Error('DELETE requires id or name'); let recordId; const isPocketBaseId = /^[a-z0-9]{15}$/.test(identifier); if (isPocketBaseId) { recordId = identifier; } else { const records = await globalThis.pb.collection(collection).getFullList({ filter: data.name = \"${identifier}\" }); if (records.length === 0) throw new Error(Record not found: ${identifier}); recordId = records[0].id; } await globalThis.pb.collection(collection).delete(recordId); run_doc.output = { success: true, meta: { id: recordId, deleted: true } }; run_doc.success = true; return run_doc; }"
    },
    "id": "adapterb7l0z4ur",
    "name": "adapterb7l0z4ur",
    "permissions": "",
    "scripts": [
        {
            "type": "sdk",
            "src": "https://cdn.jsdelivr.net/npm/pocketbase@latest/dist/pocketbase.umd.js",
            "source": "",
            "version": "0.21.3",
            "namespace": "PocketBase"
        }
    ]
}