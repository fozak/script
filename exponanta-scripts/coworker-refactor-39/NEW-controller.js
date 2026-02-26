CW._buildRun = function(op) {

const resolved = CW._resolveAll(op);
  const run_doc = {
    doctype: 'Run',
    name: generateId('run'),
    creation: Date.now(),
    operation: op.operation || null,
    target_doctype: op.target_doctype || null,
    query: op.query || {},
    input: op.input || {},
    target: null,
    user: op.user || null,
    status: 'running',
    success: false,
    error: null,
    _running: false,
    _needsRun: false,
  };

  const wake = () => queueMicrotask(() =>
    Promise.resolve(CW.controller(run_doc))
      .catch(err => console.error('[CW]', err))
  );

  run_doc.input = new Proxy(run_doc.input, {
    set(t, p, v)         { t[p] = v;    wake(); return true; },
    deleteProperty(t, p) { delete t[p]; wake(); return true; }
  });

  return run_doc;
};

CW.controller = async function(payload) {
  if (payload._running) { payload._needsRun = true; return payload; }

  const type = payload instanceof Request ? 'Request' : payload.doctype || 'Object';
  const adapterName = CW._config.adapters.payloadAdapters[type];

  const run_doc = adapterName
    ? CW._buildRun({ operation: payload.operation, target_doctype: payload.target_doctype, query: payload.query, input: { ...payload.input }, user: payload.user })
    : payload;

  if (adapterName) CW._updateFromRun(run_doc);

  run_doc._running = true;
  if (adapterName) await CW.Adapter[adapterName].execute(payload, run_doc);
  if (!run_doc.error) await CW.fsm.handle(run_doc);
  run_doc._running = false;

  run_doc.status = run_doc.error ? 'failed' : 'completed';
  CW._updateFromRun(run_doc);

  if (run_doc._needsRun) { run_doc._needsRun = false; CW.controller(run_doc); }

  return run_doc;
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

const run_doc = adapterName ? CW._buildRun(...) : payload;

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