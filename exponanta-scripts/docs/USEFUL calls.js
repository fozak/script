ct grid
  const grid = CW.run({
    operation: 'select',
    target_doctype: 'Project',
    query: { take: 10 },
    view: 'list',
    component: 'MainGrid',
    container: 'main_container',
    options: { render: true },
  });

  


1468@gmail.com" 

/root/pb/pocketbase superuser create i771468@gmail.com password




const userId = "user0123456789y"; // your semantic id, exactly 15 chars

// 1. create auth user with your id
const pbUser = await pb.collection("users").create({
  id: userId,
  email: "denis3@exponanta.com",
  password: "password123",
  passwordConfirm: "password123"
});

// 2. create item record with same id, then self-reference
await pb.collection("item").create({
  id: userId,
  name: userId,
  doctype: "User",
  owner: "",
  _allowed: [],
  _allowed_read: [],
  data: { doctype: "User", name: userId, email: "denis1@exponanta.com" }
});

await pb.collection("item").update(userId, {
  _allowed_read: [userId]
});

console.log("done:", userId);




//----
await import('./CW-utils.js')

//

node --experimental-repl-await
Then manually run your bootstrap:
javascript

await import('./index.js')
Object.keys(globalThis.Adapter)
globalThis.CW._config

//

const blob = new Blob(
  [JSON.stringify(CW._configconfig, null, 2)],
  { type: "application/json" }
);

const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = "config.json";
a.click();
URL.revokeObjectURL(a.href);


//

all = await coworker.run({
  operation: "select",
  source_doctype: "All",
  view: "form",
});
//then export
const blob = new Blob(
  [JSON.stringify(all.target.data, null, 2)],
  { type: "application/json" }
);

const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = "export.json";
a.click();
URL.revokeObjectURL(a.href);

//====

source_doctype: "All"
//1

const userRun = await coworker.run({
  operation: "takeone",
  target_doctype: "User",
  query: { where: { first_name: "John Doe"} }
});

// 2. set state and generate token
userRun.target.data[0]._allowed_read = ["System Manager"];
userRun.target.data[0]._state = { "1.current": "1" };
userRun.target.data[0].verified = 1;

await CW.Adapter.auth.generateToken(userRun);
console.log("token:", userRun.user.token);

// 3. decode and check
const parts = userRun.user.token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log("payload:", payload);

// 4. verify token
userRun.request = { authorization: 'Bearer ' + userRun.user.token };
await CW.Adapter.auth.execute(userRun);
console.log("user:", userRun.user);
console.log("_state:", userRun.input._state);
await coworker.run({
  operation: "create",
  target_doctype: "User",
  input: {
    email: "test123@example.com",
    first_name: "John Doe",
  }
});


//====================================================

await coworker.run({
  operation: "create",
  target_doctype: "User",
  input: {
    email: "test123@example.com",
    first_name: "John Doe",
  }
});




await coworker.run({
  operation: "select",
  from: "Schema",
  view: "form",
  query: { where: { schema_name: "User" } }}); 


await coworker.run({
  operation: "select",
  from: "Role",
  view: "form"
});
pb-adapter-switch.js:28 🔄 Adapter switched: pocketbase → pocketbase
Client.ts:418 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1&filter=doctype%20%3D%20%22Schema%22%20%26%26%20(data._schema_doctype%20%3D%20%22Role%22)".
send @ Client.ts:418
getList @ CrudService.ts:80
getList @ RecordService.ts:225
query @ pb-adapter-pocketbase.js:25
pb._dbQuery @ pb-adapter-switch.js:46
coworker._dbQuery @ coworker-run.js:854
select @ coworker-run.js:373
execute @ coworker-controller.js:73
coworker._exec @ coworker-run.js:302
coworker.run @ coworker-run.js:235
coworker.getSchema @ coworker-run.js:897
select @ coworker-run.js:349
execute @ coworker-controller.js:99
coworker._exec @ coworker-run.js:302
coworker.run @ coworker-run.js:235
(anonymous) @ VM389:1
Client.ts:418 Fetch finished loading: GET "http://143.198.29.88:8090/api/collections/item/records?page=1&perPage=1000&skipTotal=1&filter=doctype%20%3D%20%22Role%22".
send @ Client.ts:418
getList @ CrudService.ts:80
getList @ RecordService.ts:225
request @ CrudService.ts:254
_getFullList @ CrudService.ts:268
getFullList @ CrudService.ts:50
getFullList @ RecordService.ts:214
query @ pb-adapter-pocketbase.js:38
pb._dbQuery @ pb-adapter-switch.js:46
coworker._dbQuery @ coworker-run.js:854
select @ coworker-run.js:373
await in select
execute @ coworker-controller.js:99
coworker._exec @ coworker-run.js:302
coworker.run @ coworker-run.js:235
(anonymous) @ VM389:1
pb-adapter-switch.js:28 🔄 Adapter switched: pocketbase → pocketbase
{doctype: 'Run', name: 'run7fy46vi04rb0', creation: 1771370412263, modified: 1771370412612, operation_key: '{"operation":"select","from":"Role","view":"form"}', …}
CW.compileAll()
VM486:1 ✓ PocketBase initialized: undefined
coworker-state.js:186 ✓ Compiled 1 run(s)
Promise {<fulfilled>: 1}
CW.Role['System Manager']
undefined
CW.Role
{Academics User: {…}, Accounts Manager: {…}, Accounts User: {…}, Administrator: {…}, Agriculture Manager: {…}, …}Academics User: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:03:24.384249', …}Accounts Manager: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:01:52.598036', …}Accounts User: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:01:52.604617', …}Administrator: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:01:35.623424', …}Agriculture Manager: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:03:47.248311', …}Agriculture User: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:03:47.235363', …}Analytics: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:04:00.836064', …}Auditor: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:02:48.520602', …}Blogger: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:01:46.338523', …}Customer: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:03:21.192902', …}Dashboard Manager: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:01:36.382405', …}Delivery Manager: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:03:21.986884', …}Delivery User: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:03:21.994895', …}Desk User: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:01:35.648580', …}Owner: {doctype: 'Role', name: 'Role-cxw1jgtq7c0hi4c', role_name: 'Owner'}Role-cxw1jgtq7c0hi4c: {doctype: 'Role', name: 'Role-cxw1jgtq7c0hi4c', role_name: 'Owner'}Workspace Manager: {_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:01:37.323549', …}[[Prototype]]: Object
CW.Role['Accounts Manager']
{_assign: null, _comments: null, _liked_by: null, _user_tags: null, creation: '2025-04-14 22:01:52.598036', …}



CW.Adapter['adapterq8i39mys']  // ✅ Works
CW.Adapter['http-gateway']      // ❌ Undefined

CW.Schema["schemastattgy3m"]

await CW.compileAll();

// Now use them
const gateway = CW.Adapter['http-gateway'];
coworker-state.js:205 ✓ Compiled 6 function(s)
coworker-state.js:240 ✓ Compiled 1 document(s)
1
gateway
undefined
CW.Adapter['http-gateway']  <-doesntworkYET
undefined
CW.Adapter
{adapterqlegh6hr: {…}, adapterb7l0z4ur: {…}, adapterq8i39mys: {…}}
adapterb7l0z4ur
: 
{_states: '', adapter_name: 'pocketbase', config: {…}, doctype: 'Adapter', functions: {…}, …}
adapterq8i39mys
: 
{_allowed_read: '', _states: '', adapter_name: 'http-gateway', config: {…}, doctype: 'Adapter', …}
adapterqlegh6hr
: 
{_allowed: '', _allowed_read: '', adapter_name: 'memory', config: {…}, doctype: 'Adapter', …}
[[Prototype]]
: 
Object


await coworker.run({
  operation: "create",
  doctype: "Adapter",
  input: {
    adapter_name: "http-gateway",
  }
});
http-gateway

{
    "url": "http://143.198.29.88:8090/",
    "autoCancellation": false,
    "defaultCollection": "item"
}
//Adapters

CW.Adapter.adapterb7l0z4ur

{_states: '', adapter_name: 'pocketbase', config: {…}, doctype: 'Adapter', functions: {…}, …}adapter_name: "pocketbase"config: autoCancellation: falsedefaultCollection: "item"url: "http://143.198.29.88:8090/"[[Prototype]]: Objectdoctype: "Adapter"functions: {init: "function(run_doc) { const adapter = run_doc.target…ase initialized:', config.url); return run_doc; }", select: 'async function(run_doc) { const adapter = run_doc.…Data }; run_doc.success = true; return run_doc; }', insert: 'async function(run_doc) { const adapter = run_doc.…cord }; run_doc.success = true; return run_doc; }', update: 'async function(run_doc) { const adapter = run_doc.…cord }; run_doc.success = true; return run_doc; }', delete: 'async function(run_doc) { const adapter = run_doc.…true }; run_doc.success = true; return run_doc; }'}id: "adapterb7l0z4ur"name: "adapterb7l0z4ur"permissions: ""scripts: [{…}]_allowed: undefined_allowed_read: undefined_states: ""[[Prototype]]: Object
await CW.compileAll();

coworker-state.js:206 ✓ Compiled 6 function(s)
coworker-state.js:233 ✓ Compiled 1 document(s)




await coworker.run({
  operation: "create",
  doctype: "Adapter",
  input: {
    adapter_name: "pocketbase",
  }
});

await coworker.run({
  operation: "create",
  doctype: "Adapter",
  input: {
    adapter_name: "sqlite-local",
  }
});


sqlite-local
await coworker.run({
  operation: "create",
  doctype: "Adapter",
  input: {
    adapter_name: "adapter_auth_001",
  }
});
adapter_auth_001


await coworker.run({
  operation: "create",
  from: "Task",
 
  input: {
   task_name: "Task from memory adapter",
  },
  options: { adapter: "memory" },

});



await coworker.run({
  operation: "create",
  doctype: "State Machine",
  input: {
    statemachine_name: "Document_FSM",
    states: { /* ... */ },
    rules: { /* ... */ },
    sequences: { /* ... */ }
  }
});

const states = (await coworker.run({
operation: "select",
from: "Task",
view: "form",
query: { where: { name: "TASK-2025-00003" } }
})).target.data[0]._states;


await coworker.run({

  operation: "select",

  from: "Task",

  view: "form",

  query: { where: { name: "TASK-2025-00003" } }});

await coworker.run({
  operation: "select",
  from: "Task",
  view: "form"
});


(() => {
  const schema = CoworkerState.getCurrentRun().target.schema;
  const buttonFields = schema?.fields.filter(f => f.fieldtype === "Button");
  console.log("Button fields in schema:", buttonFields);
})();

await coworker.run({

  operation: "select",

  from: "Task",

  view: "form",

  query: { where: { name: "Task-q2qqzt6evxghb00" } }});



// Get system fields (from DocType schema)
const systemResult = await coworker.run({
  operation: "select",
  from: "Schema",
  view: "form",
  query: { where: { _schema_doctype: "DocType" } }
});

// Get specific doctype schema (Sales Invoice)
const doctypeResult = await coworker.run({
  operation: "select",
  from: "Schema",
  view: "form",
  query: { where: { _schema_doctype: "Sales Invoice" } }
});

// Extract field names from system fields
const systemFieldNames = new Set(
  systemResult.target.data[0].field_order.map(f => f.fieldname)
);

// Sales Invoice schema object
const salesInvoiceSchema = doctypeResult.target.data[0];

// Find which Sales Invoice fields are system fields
const systemFieldsInDoctype = salesInvoiceSchema.fields.filter(
  f => systemFieldNames.has(f.fieldname)
);

console.log('System fields found in Sales Invoice:', systemFieldsInDoctype);
console.log('Field names:', systemFieldsInDoctype.map(f => f.fieldname));

// Get system fields (from DocType schema)
const systemResult = await coworker.run({
  operation: "select",
  from: "Schema",
  view: "form",
  query: { where: { _schema_doctype: "DocType" } }
});

// Get specific doctype fields (Sales Invoice)
const doctypeResult = await coworker.run({
  operation: "select",
  from: "Schema",
  view: "form",
  query: { where: { _schema_doctype: "Sales Invoice" } }
});

// Extract field names from system fields
const systemFieldNames = new Set(
  systemResult.target.data[0].field_order.map(f => f.fieldname)
);

// Find which Sales Invoice fields are system fields
const systemFieldsInDoctype = doctypeResult.target.data[0].filter(
  f => systemFieldNames.has(f.fieldname)
);

console.log('System fields found in Sales Invoice:', systemFieldsInDoctype);
console.log('Field names:', systemFieldsInDoctype.map(f => f.fieldname));





await coworker.run({
  operation: "select",
  from: "Schema",
  view: "form",
  query: { where: { _schema_doctype: "Sales Invoice" } }}); 

  await coworker.run({
  operation: "select",
  from: "Schema",
  view: "form",
  query: { where: { _schema_doctype: "DocType" } }}); 

await coworker.run({
  operation: "select",
  from: "DocType",
  view: "form",
  query: { where: { name: "Task" } }}); 


await coworker.run({
  operation: "select",
  from: "Adapter",
  view: "form",
  query: { where: { adapter_name: "memory" } }}); 


  await coworker.run({
  operation: "create",
  doctype: "Adapter",
  view: "form",
  input: { adapter_name: "memory" }}); 

  await coworker.run({
  operation: "update",
  from: "Adapter",
  query: { where: { adapter_name: "memory" } },
  input: {
    config: { operators: { "=": "String(a) === String(b)", "!=": "String(a) !== String(b)", ">": "Number(a) > Number(b)", ">=": "Number(a) >= Number(b)", "<": "Number(a) < Number(b)", "<=": "Number(a) <= Number(b)", "~": "new RegExp(b, 'i').test(String(a))" } },
    functions: {
      select: "async function(run_doc) { const query = run_doc.query || {}; const take = query.take; const skip = query.skip || 0; let items = [...window.MEMORY_DB]; if (query.where) { items = this._applyFilter(items, query.where); } if (query.sort) { items = this._applySort(items, query.sort); } const total = items.length; if (take !== undefined) { const start = skip; items = items.slice(start, start + take); const page = skip ? Math.floor(skip / take) + 1 : 1; const totalPages = Math.ceil(total / take); run_doc.output = { data: items, meta: { total, page, pageSize: take, totalPages, hasMore: page < totalPages } }; } else { run_doc.output = { data: items, meta: { total, page: 1, pageSize: total, totalPages: 1, hasMore: false } }; } run_doc.success = true; return run_doc; }",
      _applyFilter: "function(items, filter) { if (!filter) return items; const predicates = this._parseFilter(filter); return items.filter(item => this._evaluatePredicates(item, predicates)); }",
      _parseFilter: "function(filter) { const predicates = []; const parts = filter.split(/(\\s+AND\\s+|\\s+OR\\s+|\\s+&&\\s+|\\s+\\|\\|\\s+)/i); for (let i = 0; i < parts.length; i += 2) { const part = parts[i].trim(); const logicalOp = parts[i + 1]?.trim().toUpperCase(); const cleanPart = part.replace(/^\\(|\\)$/g, ''); const match = cleanPart.match(/^(.+?)\\s*(=|!=|>|>=|<|<=|~)\\s*(.+)$/); if (match) { let [, field, op, value] = match; field = field.replace(/^data\\./, ''); value = value.replace(/^[\"']|[\"']$/g, ''); predicates.push({ field, operator: op, value, logicalOp: logicalOp === 'AND' || logicalOp === '&&' ? 'AND' : logicalOp === 'OR' || logicalOp === '||' ? 'OR' : null }); } } return predicates; }",
      _evaluatePredicates: "function(item, predicates) { if (predicates.length === 0) return true; let result = this._evaluatePredicate(item, predicates[0]); for (let i = 1; i < predicates.length; i++) { const pred = predicates[i]; const match = this._evaluatePredicate(item, pred); const op = predicates[i - 1].logicalOp; result = op === 'AND' ? result && match : op === 'OR' ? result || match : result; } return result; }",
      _evaluatePredicate: "function(item, { field, operator, value }) { const itemValue = item[field]; const evalFn = new Function('a', 'b', `return ${this.config.operators[operator]}`); return evalFn ? evalFn(itemValue, value) : false; }",
      _applySort: "function(items, sort) { if (!sort) return items; const sortFields = sort.split(',').map(s => { const dir = s[0] === '-' ? 'desc' : 'asc'; const field = s.replace(/^[+-]/, '').replace(/^data\\./, ''); return { field, dir }; }); return items.sort((a, b) => { for (const { field, dir } of sortFields) { const aVal = a[field]; const bVal = b[field]; if (aVal < bVal) return dir === 'desc' ? 1 : -1; if (aVal > bVal) return dir === 'desc' ? -1 : 1; } return 0; }); }"
    }
  }
});


await coworker.run({
  operation: "update",
  from: "Adapter",
  query: { where: { adapter_name: "memory" } },
  input: {
    config: { operators: { "=": "String(a) === String(b)", "!=": "String(a) !== String(b)", ">": "Number(a) > Number(b)", ">=": "Number(a) >= Number(b)", "<": "Number(a) < Number(b)", "<=": "Number(a) <= Number(b)", "~": "new RegExp(b, 'i').test(String(a))" } },
    functions: {
      select: "async function(run_doc) { const query = run_doc.query || {}; const take = query.take; const skip = query.skip || 0; let items = [...window.MEMORY_DB]; if (query.where) { items = this._applyFilter(items, query.where); } if (query.sort) { items = this._applySort(items, query.sort); } const total = items.length; if (take !== undefined) { const start = skip; items = items.slice(start, start + take); const page = skip ? Math.floor(skip / take) + 1 : 1; const totalPages = Math.ceil(total / take); run_doc.output = { data: items, meta: { total, page, pageSize: take, totalPages, hasMore: page < totalPages } }; } else { run_doc.output = { data: items, meta: { total, page: 1, pageSize: total, totalPages: 1, hasMore: false } }; } run_doc.success = true; return run_doc; }",
      _applyFilter: "function(items, filter) { if (!filter) return items; const predicates = this._parseFilter(filter); return items.filter(item => this._evaluatePredicates(item, predicates)); }",
      _parseFilter: "function(filter) { const predicates = []; const parts = filter.split(/(\\s+AND\\s+|\\s+OR\\s+|\\s+&&\\s+|\\s+\\|\\|\\s+)/i); for (let i = 0; i < parts.length; i += 2) { const part = parts[i].trim(); const logicalOp = parts[i + 1]?.trim().toUpperCase(); const cleanPart = part.replace(/^\\(|\\)$/g, ''); const match = cleanPart.match(/^(.+?)\\s*(=|!=|>|>=|<|<=|~)\\s*(.+)$/); if (match) { let [, field, op, value] = match; field = field.replace(/^data\\./, ''); value = value.replace(/^[\"']|[\"']$/g, ''); predicates.push({ field, operator: op, value, logicalOp: logicalOp === 'AND' || logicalOp === '&&' ? 'AND' : logicalOp === 'OR' || logicalOp === '||' ? 'OR' : null }); } } return predicates; }",
      _evaluatePredicates: "function(item, predicates) { if (predicates.length === 0) return true; let result = this._evaluatePredicate(item, predicates[0]); for (let i = 1; i < predicates.length; i++) { const pred = predicates[i]; const match = this._evaluatePredicate(item, pred); const op = predicates[i - 1].logicalOp; result = op === 'AND' ? result && match : op === 'OR' ? result || match : result; } return result; }",
      _evaluatePredicate: "function(item, { field, operator, value }) { const itemValue = item[field]; const evalFn = new Function('a', 'b', `return ${this.config.operators[operator]}`); return evalFn ? evalFn(itemValue, value) : false; }",
      _applySort: "function(items, sort) { if (!sort) return items; const sortFields = sort.split(',').map(s => { const dir = s[0] === '-' ? 'desc' : 'asc'; const field = s.replace(/^[+-]/, '').replace(/^data\\./, ''); return { field, dir }; }); return items.sort((a, b) => { for (const { field, dir } of sortFields) { const aVal = a[field]; const bVal = b[field]; if (aVal < bVal) return dir === 'desc' ? 1 : -1; if (aVal > bVal) return dir === 'desc' ? -1 : 1; } return 0; }); }"
    }
  }
});