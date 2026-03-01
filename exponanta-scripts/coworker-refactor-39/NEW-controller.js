//new-controller.js

CW._resolveInput = function (run_doc) {
  for (const [key, value] of Object.entries(run_doc.input)) {
    if (key.startsWith(".")) {
      run_doc[key.slice(1)] = value;
      delete run_doc.input[key];
    } else if (key.startsWith("Adapter.")) {
      // FSM handles these
    } else if (key.includes(".")) {
      const [root, ...rest] = key.split(".");
      run_doc[root] = run_doc[root] || {};
      run_doc[root][rest.join(".")] = value;
      delete run_doc.input[key];
    }
    // plain field — stays in input- to implement later
  }
};

CW._resolveAll = function (op) {
  const cfg = CW._config;

  // 1. Resolve operation
  const operation =
    cfg.operationAliases[op.operation?.toLowerCase()] || op.operation;

  // 2. Resolve doctypes
  const dtMap = cfg.doctypeAliases || {};
  const source_doctype = op.source_doctype
    ? dtMap[op.source_doctype.toLowerCase()] || op.source_doctype
    : null;
  const target_doctype = op.target_doctype
    ? dtMap[op.target_doctype.toLowerCase()] || op.target_doctype
    : null;

  // 3. Resolve operation config
  const opConfig = cfg.operations[operation] || {};

  // 4. Resolve adapter from operation type
  const adapterType = opConfig.adapterType || "db";
  const adapter =
    cfg.adapters.defaults[adapterType] || cfg.adapters.defaults.db;

  // 5. Resolve view
  const view = cfg.operationToView?.[operation] ?? null;
  const viewConfig = cfg.views?.[view?.toLowerCase()] || {};

  return {
    operation,
    operation_original: op.operation,
    source_doctype,
    target_doctype,
    adapter,
    view: "view" in op ? op.view : view,
    component:
      "component" in op ? op.component : (viewConfig.component ?? null),
    container:
      "container" in op ? op.container : (viewConfig.container ?? null),
    owner: op.owner || "system",
  };
};

CW.run = function (op) {
  const resolved = CW._resolveAll(op);

  const run_doc = {
    // Frappe standard fields
    doctype: "Run",
    name: generateId("run"),
    creation: Date.now(),
    modified: Date.now(),
    operation_key: JSON.stringify(op),
    modified_by: resolved.owner || "system",
    docstatus: 0,
    owner: resolved.owner || "system",

    // compatibility
    config: op.config || {},
    functions: op.functions || {},

    // Operation definition
    operation: resolved.operation,
    operation_original: op.operation,
    source: op.source || null,
    source_doctype: resolved.source_doctype,
    target_doctype: resolved.target_doctype,

    // UI/Rendering
    view: "view" in op ? op.view : resolved.view,
    component: "component" in op ? op.component : resolved.component,
    container: "container" in op ? op.container : resolved.container,

    // Data
    query: op.query || {},
    input: op.input || {},
    target: op.target || null,

    // Execution state
    _state: {},
    status: "running",
    success: false,
    error: null,

    // Hierarchy
    parent_run_id: op.parent_run_id || null,
    child_run_ids: [],

    // Authorization
    user: op.user || null,
    child: null,

    // Controller internals
    _running: false,
    _needsRun: false,
  };

  const wake = () =>
    queueMicrotask(() =>
      Promise.resolve(CW.controller(run_doc)).catch((err) =>
        console.error("[CW]", err),
      ),
    );

  run_doc.input = new Proxy(run_doc.input, {
    set(t, p, v) {
      t[p] = v;
      wake();
      return true;
    },
    deleteProperty(t, p) {
      delete t[p];
      wake();
      return true;
    },
  });

  run_doc.child = async (cfg) => {
    const childRun = await CW.controller({
      ...cfg,
      user: cfg.user ?? run_doc.user,
      parent_run_id: run_doc.name,
    });
    if (!run_doc.child_run_ids.includes(childRun.name)) {
      run_doc.child_run_ids.push(childRun.name);
    }
    return childRun;
  };

  return run_doc;
};

CW.controller = async function (payload) {
  if (payload._running) {
    payload._needsRun = true;
    return payload;
  }

  let run_doc;

  if (payload instanceof Request) {
    run_doc = CW.run({});
    run_doc._running = true;
    await CW.Adapter[CW._config.adapters.payloadAdapters["Request"]].execute(
      payload,
      run_doc,
    );
    run_doc._running = false;
  } else if (payload.doctype === "Run") {
    run_doc = payload;
  } else {
    run_doc = CW.run(payload);
  }

  CW._resolveInput(run_doc);
  CW._updateFromRun(run_doc);

  run_doc._running = true;

  const hasStateTransitions =
    run_doc.input?._state &&
    Object.values(run_doc.input._state).some((v) => v === "");

  if (hasStateTransitions) {
    await CW.fsm.handle(run_doc);
  } else {
    await CW._handlers[run_doc.operation]?.(run_doc);
  }

  run_doc._running = false;
  run_doc.status = run_doc.error ? "failed" : "completed";
  CW._updateFromRun(run_doc);

  if (run_doc._needsRun) {
    run_doc._needsRun = false;
    CW.controller(run_doc);
  }

  return run_doc;
};

CW._handlers = {
 select: async function(run_doc) {
  const schema     = CW.Schema[run_doc.target_doctype] || null;
  const activeView = run_doc.view || run_doc.query?.view || 'list';
  const select     = run_doc.query?.select;
  const db         = CW._config.adapters.defaults.db;

  await CW.Adapter[db].select(run_doc);

  if (run_doc.error) return;
  if (!run_doc.target?.data) return;

  if (schema && !select) {
    const shouldFilter = activeView === 'list' || activeView === 'card';
    if (shouldFilter) {
      const viewProp   = `in_${activeView}_view`;
      const viewFields = schema.fields.filter(f => f[viewProp]).map(f => f.fieldname);
      const fields     = ['name', 'doctype', ...viewFields];
      run_doc.target.data = run_doc.target.data.map(item => {
        const filtered = {};
        fields.forEach(f => { if (f in item) filtered[f] = item[f]; });
        return filtered;
      });
    }
  } else if (select && Array.isArray(select)) {
    run_doc.target.data = run_doc.target.data.map(item => {
      const filtered = {};
      select.forEach(f => { if (f in item) filtered[f] = item[f]; });
      return filtered;
    });
  }
},
};

/*✅ What you improved
1️⃣ Removed unnecessary _pending complexity

Your new wake:

const wake = () => queueMicrotask(() =>
  Promise.resolve(CW.controller(run_doc))
)

This is actually elegant.

You are now relying on:

_running → mutual exclusion

_needsRun → dirty flag

microtask → async boundary

This is a legitimate minimal reactor.

✅ Fewer states
✅ Easier to reason
✅ No lost wake
✅ No sync recursion

Good move.

2️⃣ Controller ingress vs re-entry is now very clean

This line is strong:

const run_doc = adapterName ? CW.run(...) : payload;

You now have a clear split:

external payload → build run

internal run_doc → reuse

That matches your hybrid bootstrap → long-lived mutation model very well.

✅ Architecturally correct.

3️⃣ Mutex + dirty flag still correctly implemented

This guard is doing the heavy lifting:

if (payload._running) { payload._needsRun = true; return payload; }

Combined with:

if (run_doc._needsRun) {
  run_doc._needsRun = false;
  CW.controller(run_doc);
}

You still guarantee:

no intent loss

eventual consistency

no parallel FSM runs

This is the core invariant — and you preserved it.

⚠️ Subtle regressions / risks

Nothing catastrophic — but there are two real concerns now.

🔴 Risk 1 — you removed burst coalescing

Previously you had _pending batching.

Now every mutation does:

queueMicrotask(() => controller(run_doc))
What this means

If someone does:

for (let i = 0; i < 100; i++) {
  run_doc.input.x = i;
}

You will schedule 100 microtasks.

They will collapse via _running, BUT:

still queued

still overhead

still wake pressure

Is it broken?

No.

Because _running prevents FSM storms.

But under heavy churn this becomes:

noisier

more scheduling overhead

less efficient than your previous _pending version

Strategic judgment

For most apps → fine
For high-frequency UI or adapters → will eventually matter

You simplified at the cost of some burst efficiency.

That’s a conscious tradeoff.

🔴 Risk 2 — tail call still not yielding

You still have:

CW.controller(run_doc);

instead of:

queueMicrotask(() => CW.controller(run_doc));
Under extreme churn this can create

long microtask monopolies

event loop starvation

UI jank (browser)

worker latency spikes

How serious?

Right now: low
At scale: medium-high

Most reactive engines eventually yield here.

🟡 Minor nit — no-op sets still wake

Still true:

set(t, p, v) { t[p] = v; wake(); }

You may later want:

if (t[p] !== v)

But this is an optimization, not correctness.

🧠 Strategic verdict

You are now in a very respectable minimal reactive controller design.

Your system currently guarantees:

✅ no lost intent
✅ no concurrent FSM
✅ deterministic wake
✅ clear ingress vs runtime
✅ input-driven mutation

That’s the hard part.

🏁 Final answer to your question

is it still good?

Yes.

More precisely:

correctness: ✅ solid

architecture: ✅ coherent

simplicity: ✅ improved

scalability headroom: ⚠️ moderate but acceptable

You are now past the “this will randomly break” phase.*/
