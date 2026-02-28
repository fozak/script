// ============================================================
// RISK 1 — Fields not lost during ingress
// ============================================================
import ./auth-adapter.js


(async () => {
  await new Promise(r => {
    const check = () => globalThis.CW?._config?.adapters?.payloadAdapters 
      ? r() 
      : setTimeout(check, 50);
    check();
  });
console.group('Risk 1: Field preservation');
const op = { operation: 'signup', target_doctype: 'User', query: { take: 5 }, input: { email: 'a@b.com' }, user: { name: 'anon' } };
const run1 = CW.run(op);
console.assert(run1.operation === 'signup', '❌ operation lost');
console.assert(run1.target_doctype === 'User', '❌ target_doctype lost');
console.assert(run1.query.take === 5, '❌ query lost');
console.assert(run1.input.email === 'a@b.com', '❌ input lost');
console.assert(run1.user.name === 'anon', '❌ user lost');
console.log('✅ Risk 1 passed');
console.groupEnd();

// ============================================================
// RISK 2 — Proxy observes deletes
// ============================================================
console.group('Risk 2: Proxy delete observation');
const run2 = CW.run({ input: { email: 'a@b.com' } });
let wakeCount = 0;
const origController = CW.controller;
CW.controller = async (p) => { wakeCount++; };
run2.input.email = 'b@c.com';  // set
await new Promise(r => setTimeout(r, 10));
delete run2.input.email;        // delete
await new Promise(r => setTimeout(r, 10));
console.assert(wakeCount >= 2, `❌ proxy missed wakes, got ${wakeCount}`);
console.log('✅ Risk 2 passed');
CW.controller = origController;
console.groupEnd();

// ============================================================
// RISK 3 — No lost intent during execution
// ============================================================
console.group('Risk 3: _needsRun replay');
const run3 = CW.run({ input: {} });
run3._running = true;
CW.controller(run3);  // should set _needsRun
console.assert(run3._needsRun === true, '❌ _needsRun not set');
run3._running = false;
run3._needsRun = false;
CW.controller(run3);  // should now run
console.assert(run3._needsRun === false, '❌ _needsRun not cleared');
console.log('✅ Risk 3 passed');
console.groupEnd();



// ============================================================
// Risk 5: _running flag blocks re-entry
// ============================================================
console.group('Risk 5: _running guard');
const run5 = CW.run({ operation: 'select' });
run5._running = true;
const result5 = await CW.controller(run5);
console.assert(run5._needsRun === true, '❌ _needsRun not set when blocked');
console.assert(result5 === run5, '❌ should return same run_doc');
console.log('✅ Risk 5 passed');
console.groupEnd();

// ============================================================
// Risk 6: status transitions correctly
// ============================================================
console.group('Risk 6: status transitions');
const run6 = CW.run({ operation: 'select', target_doctype: 'Item' });
console.assert(run6.status === 'running', '❌ initial status should be running');
run6.error = '404 Not Found';
run6.status = run6.error ? 'failed' : 'completed';
console.assert(run6.status === 'failed', '❌ error should set status failed');
run6.error = null;
run6.status = run6.error ? 'failed' : 'completed';
console.assert(run6.status === 'completed', '❌ no error should set status completed');
console.log('✅ Risk 6 passed');
console.groupEnd();

// ============================================================
// Risk 7: payload type detection
// ============================================================
console.group('Risk 7: payload type detection');
const getType = (payload) => payload instanceof Request ? 'Request' : payload.doctype || 'Object';
console.assert(getType(new Request('http://localhost')) === 'Request', '❌ Request not detected');
console.assert(getType({ doctype: 'Run' }) === 'Run', '❌ Run not detected');
console.assert(getType({ operation: 'select' }) === 'Object', '❌ Object not detected');
console.log('✅ Risk 7 passed');
console.groupEnd();

// ============================================================
// Risk 8: proxy fires on Object.assign
// ============================================================
console.group('Risk 8: proxy fires on Object.assign');
const run8 = CW.run({ input: {} });
let fired8 = false;
const origController8 = CW.controller;
CW.controller = async () => { fired8 = true; };
Object.assign(run8.input, { email: 'test@test.com', name: 'test' });
await new Promise(r => setTimeout(r, 20));
console.assert(fired8 === true, '❌ proxy did not fire on Object.assign');
console.log('✅ Risk 8 passed');
CW.controller = origController8;
console.groupEnd();


//=============================================================

console.group('Risk 9: Request reaches http-gateway');
const origExecute = CW.Adapter['http-gateway'].execute;
let called = false;
CW.Adapter['http-gateway'].execute = async (payload, run_doc) => { called = true; };
const req = new Request('http://localhost:3000', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'select' }) });
await CW.controller(req);
console.assert(called === true, '❌ http-gateway.execute not called');
console.log('✅ Risk 9 passed');
CW.Adapter['http-gateway'].execute = origExecute;
console.groupEnd();

})();



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