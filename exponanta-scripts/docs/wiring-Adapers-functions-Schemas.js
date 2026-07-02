// i do work with 

async function pipeline(run_doc) {

  // ── 1. PULL ──────────────────────────────────────────────
  const sel = await run_doc.child({
    operation:      'select',
    target_doctype: 'Task',
    query:          { where: { status: 'Pending' } },
    options:        { render: false },
  });
  if (sel.error) { run_doc.error = sel.error; return; }

  // ── 2. LOAD TRANSFORM SCRIPT ─────────────────────────────
  const scriptRun = await run_doc.child({
    operation:      'select',
    target_doctype: 'Script',
    query:          { where: { name: 'extend-deadline', docstatus: 1 } },
    options:        { render: false },
  });
  if (scriptRun.error) { run_doc.error = scriptRun.error; return; }

  const script = scriptRun.target?.data?.[0];
  if (!script?.code) { run_doc.error = 'Script not found'; return; }

  // compile once
  const transformFn = new Function(`return (${script.code})`);

  // ── 3. PROCESS + PUSH ────────────────────────────────────
  for (const record of sel.target?.data || []) {
    // inject source record so transform can read it
    run_doc.source = record;
    const result_json = await transformFn()(run_doc);

    const upd = await run_doc.child({
      operation:      'update',
      target_doctype: 'Task',
      query:          { where: { name: record.name } },
      input:          result_json,
      options:        { render: false },
    });
    if (upd.error) { run_doc.error = upd.error; return; }
  }

  run_doc.target.data[0].result = `Updated ${sel.target?.data?.length} tasks`;
}

//




//could be script for entire pipeline 
(async () => {

  // 1. load script
  const scriptRun = await CW.run({
    operation:      'select',
    target_doctype: 'Script',
    query:          { where: { title: 'extend-deadline' } },
    options:        { render: false, expand: false },
  });
  if (scriptRun.error) return scriptRun;

  const script = scriptRun.target?.data?.[0];
  if (!script?.code) throw new Error('no code found');

  // 2. compile
  const fn = new Function('run_doc', `return (${script.code})(run_doc)`);

  // 3. execute — scriptRun already has .child()
  await fn(scriptRun);

  return scriptRun;

})()


//where 
await CW.run({
  operation:      'create',
  target_doctype: 'Script',
  input: {
    title:          'extend-deadline',
    target_doctype: 'Task',
    code:           `async function extendDeadline(run_doc) {
  const sel = await run_doc.child({
    operation:      'select',
    target_doctype: 'Task',
    query:          { where: { status: 'Pending' } },
    options:        { render: false, expand: false },
  });
  if (sel.error) { run_doc.error = sel.error; return; }
  for (const task of sel.target?.data || []) {
    const d = task.exp_end_date ? new Date(task.exp_end_date) : new Date();
    d.setDate(d.getDate() + 30);
    const upd = await run_doc.child({
      operation:      'update',
      target_doctype: 'Task',
      query:          { where: { name: task.name } },
      input:          { exp_end_date: d.toISOString().slice(0, 10) },
      options:        { render: false, expand: false },
    });
    if (upd.error) { run_doc.error = upd.error; return; }
  }
  run_doc.target.data[0].result = 'Updated ' + (sel.target?.data?.length) + ' tasks';
}`,
  },
  options: { render: false },
})





//notebook cell (primitive)

(()=>{
  const { useState, useCallback } = React;

  function IIEECell() {
    const [code, setCode]     = useState(`await CW.run({
  operation:      'select',
  target_doctype: 'Task',
  query:          { where: { status: 'Pending' } },
  options:        { render: false },
})`);
    const [result, setResult] = useState(null);
    const [error,  setError]  = useState(null);
    const [running, setRunning] = useState(false);

    const execute = useCallback(async () => {
      setRunning(true);
      setResult(null);
      setError(null);
      try {
        const fn  = new Function('CW', 'generateId', `return (async()=>{ return ${code} })()`);
        const out = await fn(CW, generateId);
        setResult(out);
      } catch(e) {
        setError(e.message);
      } finally {
        setRunning(false);
      }
    }, [code]);

    const rows = result ? [
      { key: 'operation', value: result.operation },
      { key: 'doctype',   value: result.target_doctype },
      { key: 'status',    value: result.status },
      { key: 'records',   value: result.target?.data?.length ?? '-' },
      { key: 'error',     value: result.error ?? '-' },
    ] : [];

    return React.createElement('div', { className: 'card mb-3' },
      React.createElement('div', { className: 'card-header' },
        React.createElement('span', { className: 'card-title' }, 'IIEE Cell')
      ),
      React.createElement('div', { className: 'card-body' },

        // ── input ──
        React.createElement('textarea', {
          className:   'form-control font-monospace mb-2',
          rows:        8,
          value:       code,
          onChange:    e => setCode(e.target.value),
          spellCheck:  false,
        }),

        // ── run button ──
        React.createElement('button', {
          className: `btn btn-primary mb-3 ${running ? 'disabled' : ''}`,
          onClick:   execute,
        }, running ? 'Running…' : '▶ Run'),

        // ── summary table ──
        result && React.createElement('table', { className: 'table table-sm table-bordered mb-2' },
          React.createElement('tbody', null,
            rows.map(r => React.createElement('tr', { key: r.key },
              React.createElement('td', { className: 'text-muted w-25' }, r.key),
              React.createElement('td', null,
                React.createElement('code', null, String(r.value))
              )
            ))
          )
        ),

        // ── data rows ──
        result?.target?.data?.length > 0 &&
          React.createElement('div', null,
            React.createElement('div', { className: 'text-muted small mb-1' }, '── data ──'),
            React.createElement('pre', {
              className: 'bg-light p-2 rounded small',
              style:     { maxHeight: 300, overflow: 'auto' },
            }, JSON.stringify(result.target.data, null, 2))
          ),

        // ── child runs ──
        result?.child_run_ids?.length > 0 &&
          React.createElement('div', { className: 'mt-2' },
            React.createElement('div', { className: 'text-muted small mb-1' }, '── run tree ──'),
            React.createElement('table', { className: 'table table-sm table-bordered' },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  ['operation','doctype','status','records','error'].map(h =>
                    React.createElement('th', { key: h }, h)
                  )
                )
              ),
              React.createElement('tbody', null,
                result.child_run_ids.map(id => {
                  const r = CW.runs[id];
                  return React.createElement('tr', { key: id },
                    React.createElement('td', null, r.operation),
                    React.createElement('td', null, r.target_doctype),
                    React.createElement('td', null, r.status),
                    React.createElement('td', null, r.target?.data?.length ?? '-'),
                    React.createElement('td', null, r.error ? JSON.stringify(r.error) : '-'),
                  );
                })
              )
            )
          ),

        // ── error ──
        error && React.createElement('div', { className: 'alert alert-danger mt-2' }, error),
      )
    );
  }

  ReactDOM.createRoot(document.getElementById('main_container'))
    .render(React.createElement(IIEECell));
})();



//generalized 

Yes. The generalized pattern:
1. PULL    → get data (from run_doc OR external fetch)
2. PROCESS → transform data → result_json
3. PUSH    → save result (fanout OR sequential child runs)
Generalized fn:
jsasync function pipeline(run_doc) {

  // ── 1. PULL ──────────────────────────────────────────────
  let records = [];

  // 1A — internal: from CW
  const sel = await run_doc.child({
    operation:      'select',
    target_doctype: run_doc.target.data[0].source_doctype,
    query:          run_doc.target.data[0].query,
    options:        { render: false },
  });
  if (sel.error) { run_doc.error = sel.error; return; }
  records = sel.target?.data || [];

  // 1B — external: raw fetch (alternative to 1A)
  // const res = await fetch(run_doc.target.data[0].source_url);
  // records = await res.json();

  // ── 2. PROCESS ───────────────────────────────────────────
  const processed = records.map(record => {
    // transform — any logic here
    return {
      name:        record.name,
      result_json: { /* derived fields */ },
    };
  });

  // ── 3. PUSH ──────────────────────────────────────────────

  // 3A — fanout: all at once
  await Promise.all(processed.map(p =>
    run_doc.child({
      operation:      'update',
      target_doctype: run_doc.target.data[0].target_doctype,
      query:          { where: { name: p.name } },
      input:          p.result_json,
      options:        { render: false },
    })
  ));

  // 3B — sequential: one by one, fail fast
  // for (const p of processed) {
  //   const upd = await run_doc.child({
  //     operation:      'update',
  //     target_doctype: run_doc.target.data[0].target_doctype,
  //     query:          { where: { name: p.name } },
  //     input:          p.result_json,
  //     options:        { render: false },
  //   });
  //   if (upd.error) { run_doc.error = upd.error; return; }
  // }

  // ── RESULT ───────────────────────────────────────────────
  run_doc.target.data[0].result = JSON.stringify({
    pulled:    records.length,
    processed: processed.length,
    pushed:    processed.length,
  });
}

The pattern parameters live on run_doc.target.data[0]:
js{
  source_doctype:  'Task',           // 1A pull source
  source_url:      'https://...',    // 1B pull source
  query:           { where: {...} }, // 1A filter
  target_doctype:  'Task',           // 3 push target
  transform:       'extend-deadline' // 2 which transform to apply
}
So the Script code becomes a pure pipeline declaration — pull source, transform name, push target. The transform itself lives in Adapters.fns. Three orthogonal concerns, each independently swappable.






//== discussion - never implemented 

hat is the most elegant and abstract approach when i can have "generated -> assigned->persisted" siscle

The cycle is:

prompt → generate → persist → assign → execute → promote
The most elegant abstraction is: Script is a sideEffect that manages sideEffects.

One doctype, one FSM:

js
Script {
  target_doctype: 'Task'
  trigger:        '1.0_1'
  prompt:         'extend deadline +30 days'
  code:           'async function(run_doc) { ... }'
  docstatus:      0 → 1 → 2    // draft → active → archived
}
dim 0:
  0 = draft
  1 = active     ← sideEffect: wire into Schema + execute
  2 = archived   ← sideEffect: unwire from Schema

sideEffects:
  '0_1': wire fn into CW.Schema[target_doctype]._state[dim].sideEffects[trigger]
  '1_2': unwire fn from Schema
The generate step is also a Script sideEffect:

Script.dim1.sideEffects['0_1'] = async function(run_doc) {
  const doc = run_doc.target.data[0];

  // 1. if no code yet — generate it
  if (!doc.code) {
    const plan = await run_doc.child({
      operation:      'create',
      target_doctype: 'AgentPlan',
      input:          { prompt: doc.prompt, target_doctype: doc.target_doctype },
      options:        { render: false },
    });
    if (plan.error) { run_doc.error = plan.error; return; }
    doc.code = plan.target.data[0].code;
  }

  // 2. persist code — already happening via normal create/update
  
  // 3. assign — wire into Schema
  const fn = new Function('run_doc', `return (${doc.code})(run_doc)`);
  const [dim, key] = doc.trigger.split('.');
  CW.Schema[doc.target_doctype]._state[dim].sideEffects[key] = fn;
}
The full cycle in CW runs:

CW.run(create, Script, { prompt, target_doctype:'Task', trigger:'1.0_1' })
  │
  └── signal 0_1 fires
        ├── child: create AgentPlan  ← LLM generates code
        ├── code saved to Script record in PocketBase  ← persisted
        └── fn wired into Schema['Task']._state  ← assigned

next Task signal '1.0_1' fires
  └── executes the wired fn  ← execute

CW.run(signal, Script, { '0_2': '' })  ← archive/promote
  └── fn unwired from Schema  ← lifecycle complete
What makes this elegant:

Script manages its own lifecycle via its own FSM
generate → persist → assign → execute → archive
all within CW.run, all in CW.runs, all auditable
AgentPlan is just another child run
Schema wiring is just a sideEffect
No special cases. No external orchestration. The system manages its own behavior using itself.

how much i need to change my code for this

Almost nothing. Trace what exists vs what's needed:

Already works — zero changes:

CW.run(create, Script, ...)     ← normal create, PocketBase stores it
signal dispatch                 ← _handleSignal already fires sideEffects
string path resolution          ← 'Adapters.x.fns.y' already resolves
child runs                      ← run_doc.child() already works
docstatus FSM                   ← dim 0 already supported
New code needed:

1. Script schema in db.json      ← ~20 lines, no code change
2. Script._state sideEffects     ← 2 fns: wire + unwire
3. AgentPlan schema + llm adapter ← ~30 lines
4. _loadScripts at boot          ← ~15 lines
One real code change — _execTransition instance fn lookup:

js
// current — Schema only
if (typeof fn === 'function') await fn(run_doc);

// add — instance first, Schema fallback
const resolvedFn = run_doc._agentFns?.[`${dim}.${key}`] ?? fn;
if (typeof resolvedFn === 'function') await resolvedFn(run_doc);
That's it. Everything else is configuration and schema — not code. Your architecture already supports this pattern. You're adding data, not logic.


//===do i have it now? incuding wiring 

debug: true,
  adapters: {
    // Default adapter per category
    defaults: {
      db: "pocketbase",
      auth: "auth",
      storage: null, // Future
      email: null, // Future
    },
    payloadAdapters: {
      Request: "auth",
      Object: null, //was "run-builder"
      Run: null,
    },

    // doctype → adapter name mapping
    // if target_doctype matches, use this adapter instead of db
    doctypeAdapters: {
      File: {
        select: "fs",
        update: ["fs", "dispatch", "pocketbase"],
        create: ["fs", "pocketbase"],
        delete: "fs",
      },
      GitCommit: "git",
      GitBranch: "git",
      GitDiff: "git",
    },

    // Adapter registry (defines what's available)
    registry: {
      // ──────────────────────────────────────────────────────
      // DATABASE ADAPTERS
      // ──────────────────────────────────────────────────────
      pocketbase: {
        type: "db",
        name: "PocketBase",
        description: "PocketBase cloud database",
        handler: "_dbAdapters.pocketbase",
        capabilities: ["select", "create", "update", "delete"], // ✅ "select" not "query"
        config: {
          url: "http://127.0.0.1:8090", //not used, set in CW._config.pb_url
          collection: "item",
        },
      },
      fs: {
        type: "fs",
        name: "FileSystem",
        logChanges: 1,
      },

      memory: {
        type: "db",
        name: "Memory",
        description: "In-memory storage (volatile)",
        handler: "_dbAdapters.memory",
        capabilities: ["select", "create", "update", "delete"],
        config: {
          maxRecords: 10000,
        },
      },

      storage: {
        type: "db",
        name: "Local Storage",
        description: "Browser localStorage persistence",
        handler: "_dbAdapters.storage",
        capabilities: ["select", "create", "update", "delete"],
        config: {
          prefix: "coworker_",
          maxSize: 5 * 1024 * 1024, // 5MB
        },
      },

      // ──────────────────────────────────────────────────────
      // AUTH ADAPTERS
      // ──────────────────────────────────────────────────────
      auth: {
        type: "auth",
        name: "auth",
        description: "",
        handler: "_authAdapters.jwt", // not used
        capabilities: [
          // HTTP gateway
          "parse_request",
          "rate_limit",
          // Auth
          "signup",
          "signin",
          "signout",
          "refresh",
          "verifyJWT",
          "change_password",
        ],
Show less
You have the routing and registry wiring, but not fns. What you have:

registry: {
  pocketbase: { type, capabilities, ... }
  fs:         { type, logChanges }
  memory:     { type, capabilities }
  auth:       { type, capabilities }
}
No fns key anywhere. No AgentPlan in doctypeAdapters. No LLM adapter registered.

What's missing to complete the picture:

js
// 1. LLM adapter in registry
registry: {
  llm: {
    type:         'llm',
    name:         'LLM',
    capabilities: ['create'],   // prompt in → code out
  },
}

// 2. AgentPlan routing
doctypeAdapters: {
  AgentPlan: 'llm',
}

// 3. fns on existing adapters — not in config, in the adapter module itself
Adapters.task = {
  select: fn, create: fn, update: fn, delete: fn,
  fns: {
    'extend-deadline': async function(run_doc) { ... },
  }
}
The string-path resolution in _execTransition already supports fns:

js
// your existing code resolves this string:
'Adapters.task.fns.extend-deadline'
// via:
const path = fn.split('.');
let resolved = globalThis;
for (const p of path) resolved = resolved?.[p];
So fns wiring into Schema sideEffects works today with zero changes. You just need to populate Adapters.task.fns and reference it by string in Schema. The registry piece is bookkeeping — the execution path is already there.

give example You just need to populate Adapters.task.fns and reference it by string in Schema.

1. Populate Adapters.task.fns:

js
globalThis.Adapters.task = {
  // standard CRUD — already exists
  select: async (run_doc) => { /* ... */ },
  create: async (run_doc) => { /* ... */ },
  update: async (run_doc) => { /* ... */ },
  delete: async (run_doc) => { /* ... */ },

  // named behaviors
  fns: {
    'extend-deadline': async function(run_doc) {
      const sel = await run_doc.child({
        operation:      'select',
        target_doctype: 'Task',
        query:          { where: { status: 'Pending' } },
        options:        { render: false },
      });
      if (sel.error) { run_doc.error = sel.error; return; }
      for (const task of sel.target?.data || []) {
        const d = task.exp_end_date ? new Date(task.exp_end_date) : new Date();
        d.setDate(d.getDate() + 30);
        await run_doc.child({
          operation:      'update',
          target_doctype: 'Task',
          query:          { where: { name: task.name } },
          input:          { exp_end_date: d.toISOString().slice(0, 10) },
          options:        { render: false },
        });
      }
      run_doc.target.data[0].result = `Updated ${sel.target?.data?.length} tasks`;
    }
  }
};
2. Reference by string in Schema:

js
CW.Schema['Agent']._state['1'].sideEffects['0_1'] = 'Adapters.task.fns.extend-deadline';
3. Your existing _execTransition resolves it — zero changes:

js
} else if (typeof fn === 'string') {
  const path   = fn.split('.');
  let resolved = globalThis;
  for (const p of path) resolved = resolved?.[p];
  if (typeof resolved === 'function') await resolved(run_doc);
}
4. Test:

js
(async () => {
  const agent = await CW.run({
    operation:      'create',
    target_doctype: 'Agent',
    input: {
      name:   generateId('Agent'),
      prompt: 'extend deadlines',
      _state: { '1.0_1': '' },
    },
    options: { render: false },
  });

  console.log('status:', agent.status);
  console.log('result:', agent.target?.data?.[0]?.result);
  agent.child_run_ids.forEach(id => {
    const r = CW.runs[id];
    console.log(' ', r.operation, r.target_doctype, r.status);
  });
})();
The string 'Adapters.task.fns.extend-deadline' is now storable in PocketBase as a Schema field value, meaning the sideEffect reference survives page reloads — unlike a raw function reference which dies with the session.