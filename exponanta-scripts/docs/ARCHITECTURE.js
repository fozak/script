//not implemented
//

//1. CW.controller(payload) — main entry point for all operations, called by UI and Adapters. Payload can be raw input or existing run_doc (for child runs).
//[Payload] object of ether httpRequest OR {} if 2 types has doctype.Run or not have it
// 1) if httpRequest -> payload parced with default Adapter for http (defined in config), 
// 2) if doctype.Run -> payload is existing run_doc, just shallow observed for input mutations
// 3) if !doctype.Run -> payload is raw input, will be transformed into run_doc with doctype.Run and observed for input mutations 






















We need CW._resolveInputKey — the function that processes each input key type:
javascriptCW._resolveInputKey = function(key, value, run_doc) {
  if (key.startsWith('.')) {
    // dot-prefix → direct run_doc field
    run_doc[key.slice(1)] = value;
  } else if (key.startsWith('Adapter.')) {
    // adapter intent — FSM handles these
  } else if (key.includes('.')) {
    // deep path → run_doc nested field
    const [root, ...rest] = key.split('.');
    run_doc[root] = run_doc[root] || {};
    run_doc[root][rest.join('.')] = value;
  } else {
    // schema field → goes to input as-is
  }
};
And controller must call this on every proxy wake before FSM runs. Agree?why not just run_doc is arg. we assume we have all keys including adapter key inside. Assume that Adapter.name.target_doctype for schema extraction2:52 PMYes — _resolveInputKey just iterates all run_doc.input keys and resolves them into run_doc:
javascript CW._resolveInput = function(run_doc) {
  for (const [key, value] of Object.entries(run_doc.input)) {
    if (key.startsWith('.')) {
      run_doc[key.slice(1)] = value;
    } else if (key.startsWith('Adapter.')) {
      // FSM handles these
    } else if (key.includes('.')) {
      const [root, ...rest] = key.split('.');
      run_doc[root] = run_doc[root] || {};
      run_doc[root][rest.join('.')] = value;
    }
    // plain field — stays in input for schema processing
  }
};

///=====================================================

 const run_doc = {
          // Frappe standard fields
          doctype: "Run",
          name: generateId("run"),
          creation: start,   
          modified: start,
          operation_key: JSON.stringify(op), //KEEP added operation_key KEEP IT
          modified_by: resolved.owner || "system",
          docstatus: 0,
          owner: resolved.owner || "system",

          //compatibility with univeral doctype like Adapter
          config: op.config || {}, // KEEP iT
          functions: op.functions || {}, // KEEP it

          // Operation definition
          operation: resolved.operation,
          operation_original: op.operation,
          source: op.source || null, // ADDED for the future
          source_doctype: resolved.source_doctype,
          target: op.target || null, // ADDED 
          target_doctype: resolved.target_doctype,

          // UI/Rendering (explicit takes priority over resolved)
          view: "view" in op ? op.view : resolved.view,
          component: "component" in op ? op.component : resolved.component,
          container: "container" in op ? op.container : resolved.container,

          // DATA - Delta architecture
          query: op.query || {},    
          input: op.input || {},
          target: null,

          // Execution state
          _state: {}, //ADDED for the future
          status: "running",
          success: false,
          error: null,
          duration: 0,  //TO DELETE

          // Hierarchy
          parent_run_id: mergedOptions.parentRunId || null, //KEEP
          child_run_ids: [], //KEEP

          // Flow context   //DELETE
          flow_id: op.flow_id || null, //DELETE
          flow_template: op.flow_template || null, //DELETE
          step_id: op.step_id || null, //DELETE
          step_title: op.step_title || null, //DELETE

          // Authorization
          agent: op.agent || null, //DELETE - now user

          // Options
          options: mergedOptions, //DELETE we use input long .keys for this

          // Runtime helpers
          child: null, //keep




CW.controller = async function(payload, input = {}) {
  if (payload instanceof Request) {
    const guard = await CW.Adapter[CW._config.adapters.defaults.http].execute(payload); 
    if (guard.error) return guard;  //should defend first
  }
  
  const run_doc = CW.run({ operation: 'create', target_doctype: 'Run', input: payload });
  await CW.fsm.handle(run_doc);
  return run_doc;
};



// version 0

CW.controller = async function(payload) {
  if (payload instanceof Request) { 
    //<-- 1. here run_doc should BE created  as Adapter works with run_doc
    await CW.Adapter[CW._config.adapters.defaults.http].execute(payload);
  } else if (payload.doctype !== 'Run') {
    //<-2. this op = {operation: 'update', target_doctype: 'Task', input: {...}} ?
  } else {
    // 3 payload is existing run_doc?, input mutated via proxy
    
  }
  await CW.fsm.handle(payload);
  return payload;
};




//  

1. Bootstrap — who does raw fetch of Adapter documents before controller exists? What URL, what format, what if DB is down?
2. Failure handling — '-1' stops pipeline. But which failures are blocking vs non-blocking? Defined on Adapter schema or hardcoded?
3. Proxy double-fire — FSM writes run_doc._rawInput[key] = '1' directly, but Proxy wraps run_doc.input. Are they the same object? If yes, every FSM result stamp fires Proxy again.
4. Child runs — run_doc.child() calls CW.controller. Does child inherit parent user, query, adapter context or starts fresh?
5. CW.run backward compatibility — existing code calls CW.run(...). Does it become alias for CW.controller or is there a migration path?
6. controllerLegacy — still referenced in _exec. Does it disappear entirely or stay as fallback during migration?
7. init operation — who defines input._state for init? Is it hardcoded in bootstrap or comes from a config document?
8. Adapter function naming — Adapter.pocketbase.select — is select always the same as operation? Or can adapter expose different function names?
9. Error response shape — run_doc.error = e.message — what is the full error shape for HTTP response, UI rendering, child run handling?
10. Run doctype schema — never formally defined. What are all valid fields on run_doc?questions


// ============================================================
// FULL MOCK TEST
// ============================================================
(async () => {

globalThis.CW = globalThis.CW || {};

// mock Schema
CW.Schema = {
  Adapter: {
    pocketbase: { target_doctype: 'query' },
    auth: { target_doctype: 'user' }
  },
  Task: {
    fields: [
      { fieldname: 'status', fieldtype: 'Data' },
      { fieldname: 'title', fieldtype: 'Data' }
    ]
  }
};

// mock Adapter
CW.Adapter = {
  pocketbase: {
    select: async function(run_doc) {
      return { data: [{ doctype: 'Task', name: 'task-1', status: 'Open' }] };
    }
  },
  auth: {
    verify: async function(run_doc) {
      return { email: 'john@example.com', name: 'john-123', roles: ['admin'] };
    }
  }
};

// generateId mock
function generateId(prefix) {
  return prefix + '-' + Math.random().toString(36).slice(2, 8);
}

// _resolveInputKey
CW._resolveInputKey = function(key, value, run_doc) {
  if (key.startsWith('.')) {
    run_doc[key.slice(1)] = value;
    return;
  }
  const parts = key.split('.');
  if (parts.length >= 3) {
    run_doc._rawInput[key] = value;
    return;
  }
  if (parts.length === 2) {
    const [l1, l2] = parts;
    run_doc[l1] = run_doc[l1] || {};
    run_doc[l1][l2] = value;
    return;
  }
  const schema = CW.Schema?.[run_doc.target_doctype];
  if (schema?.fields?.some(f => f.fieldname === key)) {
    run_doc._rawInput[key] = value;
    return;
  }
  run_doc._custom = run_doc._custom || {};
  run_doc._custom[key] = value;
};

// FSM
CW.fsm = {
  handle: async function(run_doc) {
    for (const [key, value] of Object.entries(run_doc._rawInput)) {
      if (!key.startsWith('Adapter.') || value !== '') continue;

      const parts = key.split('.');
      const name = parts[1];
      const fn = parts[2];

      const adapter = CW.Adapter?.[name];
      if (!adapter?.[fn]) {
        run_doc._rawInput[key] = '-1';
        continue;
      }

      const adapterSchema = CW.Schema?.Adapter?.[name];
      const targetField = adapterSchema?.target_doctype;

      try {
        const result = await adapter[fn](run_doc);
        run_doc._rawInput[key] = '1';
        if (targetField && result) {
          run_doc[targetField] = run_doc[targetField] || {};
          run_doc[targetField][`Adapter.${name}`] = result;
        }
      } catch(e) {
        run_doc._rawInput[key] = '-1';
        run_doc.error = e.message;
        return;
      }
    }
  }
};

// controller
CW.controller = async function(op) {
  const rawInput = {};

  const run_doc = {
    doctype: 'Run',
    name: generateId('run'),
    operation: op.operation,
    target_doctype: op.target_doctype || null,
    source_doctype: op.source_doctype || null,
    query: op.query || {},
    target: null,
    user: null,
    _custom: null,
    child_run_ids: [],
    status: 'running',
    error: null,
    _rawInput: rawInput,
  };

  // parse op.input keys
  for (const [key, value] of Object.entries(op.input || {})) {
    CW._resolveInputKey(key, value, run_doc);
  }

  // proxy — fires only on external single mutations
  run_doc.input = new Proxy(rawInput, {
    set(target, prop, value) {
      target[prop] = value;
      if (!run_doc._pending) {
        run_doc._pending = true;
        queueMicrotask(() => {
          run_doc._pending = false;
          CW.fsm.handle(run_doc);
        });
      }
      return true;
    }
  });

  // execute FSM
  await CW.fsm.handle(run_doc);

  run_doc.status = 'completed';
  return run_doc;
};

// ============================================================
// TEST
// ============================================================
const run = await CW.controller({
  operation: 'select',
  target_doctype: 'Task',
  input: {
    '.view': 'form',
    'status': 'Open',
    'user.email': 'john@example.com',
    'Adapter.auth.verify': '',
    'Adapter.pocketbase.select': ''
  }
});

console.log('view:', run.view);
console.log('status in rawInput:', run._rawInput.status);
console.log('user.email (2-part):', run.user?.email);
console.log('auth result:', run.user?.['Adapter.auth']);
console.log('pocketbase result:', run.query?.['Adapter.pocketbase']);
console.log('signals:', Object.fromEntries(
  Object.entries(run._rawInput).filter(([k]) => k.startsWith('Adapter.'))
));
console.log('custom:', run._custom);

})();






//==============================================================
Input — universal flat channel:

javascript
input = {
  // 1-part: target_doctype schema field
  'status': 'Open',
  
  // dot-prefix: run_doc direct field
  '.view': 'form',
  '.operation': 'select',
  
  // 2-part: run_doc path mutation
  'user.email': 'john@example.com',
  'query.where': { name: 'Task123' },
  
  // 3+ part: adapter intent/signal
  'Adapter.http-gateway.parse': '',   // → '' pending, '1' success, '-1' fail
  'Adapter.auth.verify': '',
  'Adapter.pocketbase.select': '',
}
FSM executes intents sequentially, each adapter:

Reads from input
Executes
Stamps result back: '' → '1' or '-1'
Writes output to run_doc[target_doctype_lower]['Adapter.name']
run_doc — progressively enriched:

javascript
run_doc = {
  // core fields
  operation: 'select',
  target_doctype: 'Task',
  view: 'form',
  
  // input — signals + field mutations
  input: {
    'Adapter.http-gateway.parse': '1',
    'Adapter.auth.verify': '1',
    'Adapter.pocketbase.select': '1',
    'status': 'Open'
  },
  
  // user — built by http-gateway + auth adapters
  user: {
    email: 'john@example.com',
    name: 'john-123',
    roles: ['admin'],
    'Adapter.http-gateway': { ip: '1.2.3.4', method: 'POST' },
    'Adapter.auth': { token: 'xxx', verified_at: 1234567890 }
  },
  
  // query — built by db adapter
  query: {
    where: { name: 'Task123' },        // Prisma — immutable user intent
    'Adapter.pocketbase': { filter: "doctype='Task' && data.name='Task123'" }
  },
  
  // target — materialized by db adapter
  target: {
    data: [{ doctype: 'Task', name: 'Task123', status: 'Open' }],
    'Adapter.pocketbase': { total: 1, page: 1 }
  }
}
Adapter schema — defines where results land:

javascript
{ name: 'http-gateway', doctype: 'Adapter', target_doctype: 'User' }
{ name: 'auth',         doctype: 'Adapter', target_doctype: 'User' }
{ name: 'pocketbase',   doctype: 'Adapter', target_doctype: 'Query' }
{ name: 'sqlite',       doctype: 'Adapter', target_doctype: 'Query' }
Controller — minimal:

javascript
CW.controller = async function(op) {
  const run_doc = { ...op, doctype: 'Run', name: generateId('run') };
  await CW.fsm.handle(run_doc);
  return run_doc;
};
FSM — reads input, routes to adapters, attaches results:

javascript
// for each intent in input with value ''
// 1. parse key → adapter name + fn
// 2. execute CW.Adapter[name][fn](run_doc)
// 3. stamp result '1' or '-1'
// 4. attach output to run_doc[target_doctype_lower]['Adapter.name']
Single pipeline. No special cases. Everything flows through input. run_doc is fully auditable at any point.







CW.run(op)
    ↓
bare run_doc created
input = new Proxy({}, { set → queueMicrotask(controller) })
    ↓
initial input stamped:
run_doc.input._state = { "Adapter.pocketbase.select": "" }
run_doc.input.status = "Open"  // from op.input
    ↓ (queueMicrotask fires once after all sync mutations)
CW.controller(run_doc)
    ↓
pre-flight: parse input keys
  1-part schema field    → stays in input (document delta)
  1-part run_doc field   → run_doc[key] = value
  2-part                 → run_doc[l1][l2] = value
  3+ part / _state       → input._state[key]? 
    ↓
FSM.handle(run_doc)
  reads input._state keys
  resolves adapter + fn from key
  calls CW.Adapter[name][fn](run_doc)
    ↓
adapter executes:
  materializes run_doc.target (select)
  enriches run_doc.user (auth)
  enriches run_doc.query (db)
    ↓
handler: view-filter run_doc.target.data
    ↓
post-flight:
  run_doc.status = "completed"
  CW._render(run_doc)
  CW._updateFromRun(run_doc)
    ↓
return run_doc



run_doc
/*Coworker Architecture Summary
run_doc — universal execution context, single object passed everywhere:
javascriptrun_doc = {
  target,        // document being operated on
  input,         // single mutation inlet (proxied)
  query,         // read parameters (support, not mutated)
  user,          // session from JWT (support, not mutated)
  _oplog,        // audit trail
  _running       // re-entry guard
}
run_doc.target — the document:
javascripttarget.data[0]          // current document state
target.data[0]._state   // FSM state history
target.schema           // document schema
input{} — single source of all mutations:
javascriptinput = {
  email: "x@x.com",     // data fields → target.data[0]
  _state: {             // state transitions → target.data[0]._state
    "1.0_1.Adapter.auth.signup": ""
  }
}
Two parts of input:

data keys — field mutations, merged into target.data[0], persisted to DB
_state keys — transition intents, merged into target.data[0]._state, drive FSM

_state role — universal observable for everything:
javascript// format: "{dim}.{from}_{to}.{Adapter.name.fn}": "status"
// status: "" intent, "1" success, "-1" error, "0" not started

"0.0_1.HTTP.receive": "1"       // system pipeline
"0.1_2.JWT.verify": "1"         // security gate
"0.2_3.DB.persist": "1"         // persistence confirmed
"1.0_1.Adapter.auth.signup": "1" // business transition
"1.current": "1"                 // current state pointer
Key high level points:

Single inlet — proxy on input fires controller on every mutation, client and server share same controller code
Controller is minimal — splits input, merges to target, stamps _state results, unified error catch, oplog. Never knows about business logic
FSM routes by _state keys — parses dim.from_to.Adapter.name.fn, validates transition, calls adapter function, controller stamps result
Adapters are isolated — never call each other, only read/write run_doc, controller sequences them
_state is the log — full pipeline visibility, resumable, observable on client and server, no separate instrumentation needed
DB boundary — serialize JSON fields on write, deserialize on read. Everything in memory is objects, DB stores strings
Security in dimension 0 — "0.jwt_verified": "1" set by gateway only, gates all business transitions, never writable by client
*/

//VERSIONS
/* 37 - new controller over CW.controller, just shallw observing the input 
/* 38 - version to observe input and input._state 


//SERVER-CLIENT

// The goal is to have 99% processing made on client side
// server side extract user from JWT, set verified = 1 -> go to persist()-> to db
// 


//CONTROLLER

/* ISSUES
TODO  ISSUE - SHALLOW observing input - fixed by flattenning 
TODO  ISSUE - validation calls back to react 
TODO  DONOT forget _autosave = 0 on schema 

Current Situation

Your form writes:

run.input[fieldname] = value; // shallow Proxy observes this


You eventually want:

run.input._state.1.2 = someValue; // currently NOT observed


Your current shallow Proxy setup:

run_doc.input = new Proxy(run_doc.input, {
  set(target, prop, value) {
    target[prop] = value;
    CW.controller(run_doc);
    return true;
  }
});


Only fires when prop is a top-level key, so _state.1.2 writes are ignored.

Option 1 — Immutable updates in React

Instead of mutating deep nested fields, always replace the top-level _state object:

const newState = {
  ...run.input._state,
  1: {
    ...run.input._state[1],
    2: newValue
  }
};
run.input._state = newState; // shallow Proxy fires


✅ Pros:

Works with your current shallow Proxy

Minimal changes, keeps existing controller logic intact

Fits React-style immutable updates

❌ Cons:

Verbose for deeply nested structures

Can be awkward if _state gets very deep or very interactive

Option 2 — Deep reactive Proxy

Recursively wrap _state so any nested mutation triggers CW.controller automatically:

function makeReactive(obj, callback) {
  return new Proxy(obj, {
    get(target, prop) {
      const value = target[prop];
      if (value && typeof value === "object") {
        return makeReactive(value, callback);
      }
      return value;
    },
    set(target, prop, value) {
      target[prop] = value;
      callback();
      return true;
    }
  });
}

// apply only to `_state` if you want selective deep reactivity
run_doc.input._state = makeReactive(run_doc.input._state, () =>
  CW.controller(run_doc)
);


✅ Pros:

Works automatically for arbitrary depth

No changes needed in React form logic

❌ Cons:

Slight performance cost if _state tree is large

Every nested object access creates a Proxy recursively

Recommended Hybrid Approach for your case

Since you have a shallow top-level Proxy for most fields, and _state is the only complex interactive object:

Keep shallow Proxy on run_doc.input for all normal fields.

Wrap _state separately with deep reactive Proxy:

run_doc.input._state = makeReactive(run_doc.input._state || {}, () =>
  CW.controller(run_doc)
);


You get automatic controller triggers for deep _state mutations

Other fields stay cheap and shallow

No need to rewrite the whole controller — it continues working as-is

Summary
Path	Pros	Cons
Immutable top-level _state replacement	Simple, performant, fits React	Verbose for deep updates
Deep Proxy on _state only	Automatic for nested fields, minimal React changes	Some performance overhead
Deep Proxy on full input	Fully reactive	Expensive if many fields

💡 For your future interactive _state widget, hybrid deep Proxy on _state is the cleanest solution.

I can draft a ready-to-drop implementation of coworker.run + shallow input Proxy + deep _state reactive Proxy that works with your current React patterns and CW.controller.

Do you want me to do that?

// RBAC 

async checkPermission(run_doc)  
//before start
run_doc.operation is resolved
run_doc.query is resolved
run_doc.user is resolved from jwt

so we can push to db pipeline the query 
(initial query from run() + additional filter  const userRoles = user._allowed_read || []; // User's capabilities
    
    // Check against record's ACL
    if (operation === "write" || operation === "update" || operation === "delete") {
      const allowed = record._allowed || [];
      return userRoles.some(role => allowed.includes(role));
    }
    
    if (operation === "read") {
      const allowed = record._allowed || [];
      const allowedRead = record._allowed_read || [];
      return userRoles.some(role => 
        allowed.includes(role) || allowedRead.includes(role)
      );
    })


//run_doc context

const run_doc = {
          // Frappe standard fields
          doctype: "Run",  //own context
          name: generateId("run"), //own context
          creation: start, //own context
          modified: start, //own context
          operation_key: JSON.stringify(op),    //added operation_key
          modified_by: resolved.owner || "system", //own context
          docstatus: 0, //own context 
          owner: resolved.owner || "system",  // after run_doc.user resolved

          //compatibility with univeral doctype like Adapter
          config: op.config || {}, // ADDED config
          functions: op.functions || {}, // ADDED functions

          // Operation definition
          operation: resolved.operation,
          operation_original: op.operation,
          source: op.source || null, // ADDED use this for mutations of original + input
          source_doctype: resolved.source_doctype,
          target: op.target || null, // ADDED use this instead target
          target_doctype: resolved.target_doctype,

          // UI/Rendering (explicit takes priority over resolved)
          view: "view" in op ? op.view : resolved.view,
          component: "component" in op ? op.component : resolved.component,
          container: "container" in op ? op.container : resolved.container,

          // DATA - Delta architecture
          query: op.query || {},
          input: op.input || {},
          target: null,

          // Execution state
          _state: {}, //ADDED state, changed to _state
          status: "running",
          success: false,
          error: null,
          duration: 0,

          // Hierarchy
          parent_run_id: mergedOptions.parentRunId || null,
          child_run_ids: [],

          // Flow context
          flow_id: op.flow_id || null,
          flow_template: op.flow_template || null,
          step_id: op.step_id || null,
          step_title: op.step_title || null,

          // Authorization
          user: {
            name:     // this is userId used as id
            email:
            _allowed_read: [],  // User's capabilities  
            _state:

          }    //changed from agent:

          // Options
          options: mergedOptions,

          // Runtime helpers
          child: null,
        };
* refactor to use docname as semantic name and name as technical name

// staate/CW

CW.Adapter.adapterq8i39mys



user:

main:
password TEXT,        -- hashed password for user authentication
tokenKey TEXT,        -- per-user secret used internally to sign JWTs and invalidate sessions; never exposed to clients
verified INTEGER,     -- 0 or 1; indicates whether the user's email is verified
emailVisibility INTEGER -- 0 or 1; controls whether the user's email is publicly visible (privacy flag)


{
  "user_auth_methods": {
    "identity_password": true,   // Maps to "Identity/Password" (Enabled)
    "oauth2": false,             // Maps to "OAuth2" (Disabled)
    "otp": false,                // Maps to "One-time password (OTP)" (Disabled)
    "mfa": false                 // Maps to "Multi-factor authentication (MFA)" (Disabled)
  }
}


add to auth adapter config flattened 
{
  "auth": {
    "tokens": {
      "auth_duration_seconds": null,          // Maps to "Auth duration (in seconds)"
      "email_verification_duration_seconds": null, // Maps to "Email verification duration (in seconds)"
      "password_reset_duration_seconds": null, // Maps to "Password reset duration (in seconds)"
      "email_change_duration_seconds": null,  // Maps to "Email change duration (in seconds)"
      "protected_file_access_duration_seconds": null // Maps to "Protected file access duration (in seconds)"
    },
    "invalidate_all_previous_tokens": false   // Global toggle if links are clicked
  }
}
{
  "auth": {
    "email_templates": {
      "default_verification_email": null,        // Maps to "Default Verification email template"
      "default_password_reset_email": null,      // Maps to "Default Password reset email template"
      "default_confirm_email_change_email": null,// Maps to "Default Confirm email change email template"
      "default_otp_email": null,                 // Maps to "Default OTP email template"
      "default_login_alert_email": null          // Maps to "Default Login alert email template"
    }
  }
}




//considered types of "active schemas/adapters"

// The most flexible - Adapter with config, functions, scripts (and compilation of in in CW)
// Schema is yet missing - if Adapter needs it, if case type (like non-pipeline functions)
// this is just like precompiled library

Perfect! PocketBase SDK is loaded correctly:
✅ SDK loaded:
javascriptglobalThis.PocketBase  // → class Client{...}  ✅
✅ Adapter compiled with runtime functions:
javascriptCW.getDocument('Adapter', 'adapterb7l0z4ur')
// → {config: {...}, init: ƒ, select: ƒ, insert: ƒ, update: ƒ, delete: ƒ}  ✅
✅ Config present:
javascriptconfig: {
  url: 'http://143.198.29.88:8090/', 
  autoCancellation: false, 
  defaultCollection: 'item'
}  ✅
Everything is working! Your compilation system:

Loaded the PocketBase SDK script → globalThis.PocketBase
Compiled the adapter functions → init, select, insert, update, delete
Stored config → accessible via this.config in functions

Ready to use:
javascriptawait CW.Adapter.pocketbase.select(run_doc);
// or
await CW.Adapter['adapterb7l0z4ur'].select(run_doc);




//Case  1 - adapter for set of repetitive functions like CRUD - ideal - compile 1 time, then use CW.Adapter["pocketbase"]
//Case 2 - pipelines. 
await CW.compileAll();

VM6325:1 ✓ PocketBase initialized: undefined
coworker-state.js:178 ✓ Compiled 2 run(s)
2
CW.Adapter['adapterq8i39mys']
{config: {…}, execute: ƒ, rateLimit: ƒ, bodySize: ƒ, method: ƒ, …}
CW.Adapter['adapterq8i39mys']
{config: {…}, execute: ƒ, rateLimit: ƒ, bodySize: ƒ, method: ƒ, …}bodySize: ƒ (c, r)config: {rateLimit: {…}, bodySize: {…}, method: {…}, contentType: {…}}contentType: ƒ (c, r)execute: async ƒ (req, env, rateLimits)method: ƒ (c, r)rateLimit: ƒ (c, r, rl)[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
CW.Adapter['adapterq8i39mys'].execute()
Promise {<rejected>: TypeError: Cannot read properties of undefined (reading 'headers')
    at Object.eval [as execute] …}
VM6335:1 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'headers')
eval @ VM6335:1
(anonymous) @ VM6392:1Understand this error
CW.Schema["schemastattgy3m"]
{_schema_doctype: 'State Machine', actions: Array(0), allow_rename: 1, autoname: 'field:statemachine_name', creation: '2013-01-08 15:50:01', …}


//init flow 
javascript// 1. Init - Load documents from DB
await coworker.run({ operation: 'select', from: 'Adapter' });
await coworker.run({ operation: 'select', from: 'Schema' });
// Now CW.runs has the raw data

// 2. Compile - Turn function strings into callable functions
await CW.compileAll();
// Now adapters have runtime functions

// 3. Access
CW.Adapter['http-gateway'].execute(req, env, rateLimits)  // ✅ Compiled runtime
CW.Adapter.memory.select(run_doc)                         // ✅ Compiled runtime
CW.Schema.User.fields                                     // ✅ Static document
CW.Schema['schemastattgy3m'].field_order                 // ✅ Static document







/* version 35
* (x) 35-1 DONE CHANGE COWORKERSTATE name is too long. CHNAGE to CW global
* (x) 35-2 DONE window -> globalThis for  compatibility

*/
// 

//SCHEMA

CREATE TABLE item (
  id TEXT PRIMARY KEY,              -- reserved, DO not use in code
  name TEXT,                        -- used as id in code, unique
  doctype TEXT,
  docstatus INTEGER,                  -- docstatus 
  data TEXT DEFAULT '{}',            -- JSON data field
  owner TEXT DEFAULT '[]',           -- JSON array of user IDs
  _allowed TEXT DEFAULT '[]',        -- JSON array of role/user IDs (write)
  _allowed_read TEXT DEFAULT '[]',   -- JSON array of role/user IDs (read)
  created TEXT DEFAULT CURRENT_TIMESTAMP,
  updated TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doctype ON item(doctype);
CREATE INDEX idx_user_id ON item((json_extract(data, '$.user_id'))) WHERE doctype = 'User';






SECURITY //draft
POST Request Protection (Proper Order)
│
├─ 1. Rate Limit by IP (FIRST - cheapest check)
│   └─ Reject if exceeded → 429 Too Many Requests
│
├─ 2. Body Size Limit (cheap validation) 
│   └─ Reject if too large → 413 Payload Too Large size_limit_1 (bigger)
│
├─ 3. Basic Request Validation (no parsing yet)
│   ├─ Content-Type check
│   ├─ Method validation
│   └─ Reject malformed → 400 Bad Request
│
├─ 4. NOW check Authorization Header Present?
│   │
│   ├─ Yes → Authenticated Flow
│   │   ├─ Validate token (now safe - already rate limited)
│   │   ├─ Rate limit per user ID (secondary limit)
│   │   ├─ Schema validation
│   │   └─ Process request
│   │
│   └─ No → Public Flow
│       ├─ Already rate limited by IP
│       ├─ Optional: CAPTCHA/proof-of-work for expensive ops
│       ├─ Schema validation
│       └─ Process request (limited functionality)




LEVEL 1 — System (platform sovereignty)
LEVEL 2 — Adapter (infrastructure capability)
LEVEL 3 — Operation viability (semantic existence)
LEVEL 4 — Cross-document authority (early proceccing/ like RBAC / ABAC/ cross document flows)
LEVEL 5 — Document state authority (workflow / lifecycle)
LEVEL 6 — Field semantics (types, values, relations)


LEVELS = {
    "level_1": {
      "name": "System FSM",
      "scope": "overall system status",
      "states": ["booting", "ready", "degraded", "recovering", "fault"],
      "note": "orchestrates lower levels"
    },
    "level_2": {
      "name": "Subsystem/Adapter FSM",
      "scope": "adapter/service status",
      "states": {
        "adapter": "pocketbase",
        "states"["booting", "ready", "degraded", "recovering", "fault"]
    },
  },
    "level_3": {
      "name": "operation feasibility",
      "scope": "multi-document operations",
      "responsibilities": [
        "batch_submit",
        "batch_validate",
        "enforcing per-document RBAC"
      ],
      "note": "aggregates results"
    },
    "level_4": {
      "name": "Cross-Document/Workflow FSM for 1 operation ",
      "scope": "multi-document operations",
      "responsibilities": [
        
        "enforcing per-document RBAC"
      ],
      "note": "aggregates results"
    },
    "level_5": {
      "name": "Core document level for this operation ",
      "scope": "single-document operations",
      "responsibilities": [
        
        "core per document workflow"
      ],
      "note": "aggregates results"
    },
    "level_6": {
      "name": "Single-Document field level FSM",
      "tiers": {
        "tier_1": {
          "name": "System Field Rules",
          "handles": ["defaults", "required", "auto-set"]
        },
        "tier_2": {
          "name": "Field Type Handlers",
          "handles": ["serialization", "validation"]
        },
        "tier_3": {
          "name": "Custom Field Rules",
          "handles": ["computed fields", "cross-field logic"]
        }
      }
    }
}


run(op)  // that starts after LEVEL 1 and 2 loaded 
// key 
run()
 ├─ normalize input
 ├─ resolve operation
 ├─ resolve schema   ❌ fail if missing
 ├─ resolve view     ❌ fail if not resolved
 ├─ compute field set
 ├─ bind authorization
 ├─ freeze execution plan
 ├─ call _exec()
 └─ finalize result

 


System_FMS =

{
  "doctype": "State Machine",
  "name": "System_FSM_level_1",
  "statemachine_name": "System_FSM",
  
  "core_dimensions": ["system_status", "db_connection", "auth_status"],
  
  "core_states": {
    "system_status": {
      "values": [0, 1, 2, 3, -1],
      "options": ["booting", "ready", "degraded", "recovering", "fault"]
    },
    "db_connection": {
      "values": [0, 1, 2, 3, -1],
      "options": ["booting", "ready", "degraded", "recovering", "fault"]
    },
    "auth_status": {
      "values": [0, 1, 2, 3, -1],
      "options": ["booting", "ready", "degraded", "recovering", "fault"]
    }
  },
  
  "default_dimensions": ["initialize", "health_check", "shutdown"],
  
  "default_states": {
    "initialize": {
      "values": [0, 1, 2, -1],
      "options": ["idle", "pending", "success", "error"]
    },
    "health_check": {
      "values": [0, 1, 2, -1],
      "options": ["idle", "pending", "success", "error"]
    },
    "shutdown": {
      "values": [0, 1, 2, -1],
      "options": ["idle", "pending", "success", "error"]
    }
  },
  
  "service_dimensions": ["cache", "queue", "background_jobs"],
  
  "service_states": {
    "cache": {
      "values": [0, 1, 2, 3, -1],
      "options": ["booting", "ready", "degraded", "recovering", "fault"]
    },
    "queue": {
      "values": [0, 1, 2, 3, -1],
      "options": ["booting", "ready", "degraded", "recovering", "fault"]
    },
    "background_jobs": {
      "values": [0, 1, 2, 3, -1],
      "options": ["booting", "ready", "degraded", "recovering", "fault"]
    }
  },
  
  "transitions": {
    "system_level": {
      "0": [1, 2, -1],
      "1": [2, 3, -1],
      "2": [1, 3, -1],
      "3": [1, 2, -1],
      "-1": [3]
    },
    "operation_level": {
      "0": [1],
      "1": [2, -1],
      "2": [0],
      "-1": [0, 1]
    }
  },
  
  "rules": {
    "initialize": {
      "0_to_1": {
        "requires": {
          "system_status": 0,
          "health_check": 0,
          "shutdown": 0
        }
      }
    },
    "health_check": {
      "0_to_1": {
        "requires": {
          "system_status": [1, 2],
          "initialize": 0,
          "shutdown": 0
        }
      }
    },
    "shutdown": {
      "0_to_1": {
        "requires": {
          "system_status": [1, 2, 3, -1],
          "initialize": 0,
          "health_check": 0
        }
      }
    }
  },
  
  "sequences": {
    "initialize": {
      "steps": [
        {
          "dimension": 0,
          "transition": 1
        },
        {
          "execute": "loadConfig",
          "onFailure": {
            "dimension": 0,
            "transition": -1,
            "then": [
              { "core_dimension": 0, "value": -1 },
              { "stop": true }
            ]
          }
        },
        {
          "execute": "connectDatabase",
          "onSuccess": {
            "core_dimension": 1,
            "value": 1
          },
          "onFailure": {
            "dimension": 0,
            "transition": -1,
            "then": [
              { "core_dimension": 0, "value": -1 },
              { "core_dimension": 1, "value": -1 },
              { "stop": true }
            ]
          }
        },
        {
          "execute": "initializeServices",
          "onSuccess": {
            "dimension": 0,
            "transition": 2,
            "then": [
              { "core_dimension": 0, "value": 1 }
            ]
          },
          "onPartialFailure": {
            "dimension": 0,
            "transition": 2,
            "then": [
              { "core_dimension": 0, "value": 2 }
            ]
          },
          "onFailure": {
            "dimension": 0,
            "transition": -1,
            "then": [
              { "core_dimension": 0, "value": -1 },
              { "stop": true }
            ]
          }
        },
        {
          "dimension": 0,
          "transition": 0
        }
      ]
    },
    
    "health_check": {
      "steps": [
        {
          "dimension": 1,
          "transition": 1
        },
        {
          "execute": "checkDatabaseConnection",
          "onSuccess": {
            "core_dimension": 1,
            "value": 1
          },
          "onDegraded": {
            "core_dimension": 1,
            "value": 2
          },
          "onFailure": {
            "core_dimension": 1,
            "value": -1
          }
        },
        {
          "execute": "checkSystemResources",
          "onSuccess": {
            "dimension": 1,
            "transition": 2,
            "then": [
              { "core_dimension": 0, "value": 1 }
            ]
          },
          "onPartialFailure": {
            "dimension": 1,
            "transition": 2,
            "then": [
              { "core_dimension": 0, "value": 2 }
            ]
          },
          "onFailure": {
            "dimension": 1,
            "transition": -1,
            "then": [
              { "core_dimension": 0, "value": -1 }
            ]
          }
        },
        {
          "dimension": 1,
          "transition": 0
        }
      ]
    },
    
    "shutdown": {
      "steps": [
        {
          "dimension": 2,
          "transition": 1
        },
        {
          "execute": "drainConnections",
          "onFailure": {
            "dimension": 2,
            "transition": -1
          }
        },
        {
          "execute": "stopServices",
          "onFailure": {
            "dimension": 2,
            "transition": -1
          }
        },
        {
          "execute": "closeDatabase",
          "onSuccess": {
            "core_dimension": 1,
            "value": 0
          },
          "onFailure": {
            "dimension": 2,
            "transition": -1,
            "then": [
              { "core_dimension": 1, "value": -1 }
            ]
          }
        },
        {
          "dimension": 2,
          "transition": 2,
          "then": [
            { "core_dimension": 0, "value": 0 }
          ]
        },
        {
          "dimension": 2,
          "transition": 0
        }
      ]
    }
  }
}

/*
*
*/

## **Key flow:**
```
User: run(select, Task, name=Task123, adapter=pocketbase)
  ↓
Controller: get pocketbase adapter document
  ↓
Controller: check adapter._states.status (is it ready?)  <- this not correct to pull readiness every time
  ↓
Controller: build run_doc context
  ↓
Controller: call adapter.functions.select(run_doc)
  ↓
Function: mutates run_doc (sets status.code, populates target.data)
  ↓
Controller: read run_doc.status.code
  ↓
  ├─ code=2 (success) → return data
  ├─ code=-10 (recoverable) → trigger fallback, retry
  └─ code=-11 (unrecoverable) → propagate fault, throw error