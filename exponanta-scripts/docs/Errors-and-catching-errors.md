Rules for New CW Tests
Structure
IIEE format only — every test is a self-contained async IIFE that runs immediately in the browser console against live PocketBase. No test framework, no mocks for network calls, no synthetic data stores.
javascript;(async () => {
  // T1: description
  const r = await CW.run({ ... });
  console.assert(!r.error, 'T1 error: ' + JSON.stringify(r.error));
  console.assert(r.target?.data?.[0]?.field === expected, 'T1 field mismatch');
  console.log(!r.error ? '✅ T1' : '❌ T1');
})();
The Source of Truth Rule
Never assert on run_doc.target.data as proof the DB was written. After any create/update/signal, do a fresh CW.run select to confirm what PocketBase actually stored. run_doc is a carrier — it can look correct while the write failed or was skipped.
javascript// WRONG
assert(r.target.data[0].docstatus === 1);

// RIGHT
const verify = await CW.run({ operation: 'select', target_doctype: 'Task',
  query: { where: { name: r.target.data[0].name } }, options: { render: false } });
assert(verify.target.data[0].docstatus === 1);
Assert the Path, Not Just the Outcome
Every test must assert:

!r.error — run completed
which branch was taken — r._signal, r.operation, or specific intermediate field
PB confirmed — fresh select result matches expected

Never only assert success. A no-op that touches nothing can return error: null.
Real Records, Known State
Use real named records that you created and know the starting state of. Never assume a record exists from a prior session. Each test that needs a record should either create it in T0 or explicitly select it first and assert its initial state before proceeding.
javascript// T0: create test record, capture name
const create = await CW.run({ operation: 'create', target_doctype: 'Task', input: { subject: 'Test' }, options: { render: false } });
const name = create.target.data[0].name;
// T1: now test with known record
Signal Tests Must Assert Three Things
For every FSM signal test:

The signal key is gone from _state (or converted to "1") — confirm in PB
The correct docstatus or dim value was written — confirm in PB
Any sideEffect outcome is confirmed independently — if sideEffect writes a related record, select that record and verify

Cleanup
If a test creates records, the last test in the IIEE should delete them. Leave PB clean. Tests that leave garbage cause the next session's tests to hit stale state problems.
Naming
Label each test T1, T2... with a one-line description. On failure log the full run_doc error, not just the assert message. Makes copy-paste debugging instant.
javascriptconsole.log('T2 result:', JSON.stringify({ error: r.error, _state: r.target?.data?.[0]?._state }, null, 2));
One Concern Per Test
Do not chain multiple signal transitions in one test block. Each T tests exactly one state change. Chaining hides which step broke.You said: these are technical.these are technical. what are top 3 most popular reasons of errors1:54 PMClaude responded: From the history across all sessions, the top 3 are:From the history across all sessions, the top 3 are:

1. Testing the wrong thing
The test passed, but it was asserting on run_doc (in-memory carrier) instead of what PocketBase actually stored. The bug was real and live — the test just wasn't looking at it. This was the single most repeated failure pattern across sessions.

2. Unknown starting state
The test ran against a record left over from a previous session in an unknown state — wrong _state, wrong docstatus, stale fields from an old schema iteration. The signal was valid but the record wasn't in the expected starting position, so the transition was rejected or took a wrong path. Looked like a framework bug for several minutes each time.

3. Asserting success when a no-op occurred
r.error === null after a signal that silently fell to the unmatched block and did nothing. The run "succeeded" — no exception thrown — but nothing was written. This masked broken signal routing, wrong dim format, and missing transition definitions. The fix (assert the actual path taken, not just absence of error) was established but not always applied consistently in new tests.

All three share a root cause: the test confirmed the absence of errors rather than the presence of the correct outcome. Fast error identification requires asserting what should have changed, not just that nothing blew up.You said: 1) How to equip CW-run better to avoid errors esp 1.1) How to equip CW-run better to avoid errors esp 1. 2) why test never looks into pipeline which is CW.runs1:57 PMClaude responded: Two sharp questions.Two sharp questions. Let me search for what's already in the pipeline visibility space before answering.Relevant chatsRelevant chatsTwo distinct answers:

1. How to equip CW-run to avoid "testing wrong thing" errors
The root problem: run_doc carries no record of what actually happened inside the pipeline. The test sees error: null and assumes success. It has no visibility into which branch ran, which DB call was made, or whether the adapter write was even attempted.
The fix: write execution trace into run_doc itself.
Every dispatch branch should stamp what it did:
javascriptrun_doc._trace = {
  branch:    'signal',          // 'signal' | 'data' | 'read'
  signal:    '0.0_1',
  handler:   '_handleSignal',
  adapter_op: 'update',         // what adapter was actually called
  pb_written: true,             // did adapter call complete
  sideEffects_run: ['0_1.Adapter.auth.activate'],
}
Then a test can assert on r._trace.pb_written === true and r._trace.branch === 'signal' — not just !r.error. The trace makes the pipeline self-describing. Every test gets ground truth from the run itself, not inference from the output.
Secondary: run_doc._warnings array. Non-fatal issues (signal fell to unmatched block, sideEffect skipped) currently disappear silently. They should be logged there so a test can assert r._warnings.length === 0.

2. Why tests never look inside the pipeline
Because CW.run is opaque by design — it returns a run_doc with success/error/target, and that was the intended contract. The pipeline internals (_dispatch, _handleSignal, _execTransition) are private methods with no output surface. There's no established place to look.
The deeper reason: the IIEE test pattern was built to test outcomes (what's in PB after the run), not process (what the pipeline did). That was the right tradeoff early — fast to write, easy to understand. But it means the only way to debug a wrong result is to re-run with extra console.log inside CW-run.js itself, which is destructive and gets cleaned up.
The consequence: every time a signal silently no-ops, the developer has to manually trace through _dispatch → _handleSignal → _getStateDef → _getTransitions to find where it fell through. The knowledge is in the code, not in the output.
The structural fix is exactly the _trace above — make the pipeline narrate itself into run_doc so tests and developers can read what happened without opening CW-run.js.You said: how you would implement ithow you would implement it1:59 PMClaude responded: Let me read the current CW-run.Let me read the current CW-run.js before proposing anything.Check uploaded filesCheck uploaded filesNo file uploaded. I'll propose based on what I know of the current architecture.

Implementation: run_doc._trace
Step 1 — Add _trace to run_doc at creation
In CW.run, initialize it alongside the other fields:
javascriptCW.run = function(params) {
  const run_doc = {
    name:           CW._generateId('Run'),
    operation:      params.operation,
    target_doctype: params.target_doctype,
    input:          Object.assign({ _state: {} }, params.input || {}),
    query:          params.query || {},
    options:        params.options || {},
    target:         params.target || null,
    error:          null,
    success:        false,
    status:         'pending',
    _trace: {
      branch:           null,   // 'signal' | 'data' | 'read'
      signal:           null,   // e.g. '0.0_1'
      transition_found: false,  // did _getTransitions find a match
      rule_passed:      null,   // true/false/null (null = no rule defined)
      adapter_op:       null,   // 'create' | 'update' | 'select'
      pb_written:       false,  // did adapter call complete without error
      sideEffects_run:  [],     // keys of sideEffects that executed
      warnings:         [],     // non-fatal issues
    },
  };
  return run_doc;
};

Step 2 — Stamp the branch in _dispatch
javascriptCW._dispatch = async function(run_doc) {
  const signal   = Object.entries(run_doc.input._state || {}).find(([,v]) => v === '');
  const dataKeys = Object.keys(run_doc.input).filter(k => k !== '_state');
  const opConfig = CW._config.operations?.[run_doc.operation] || {};

  if (signal) {
    run_doc._trace.branch = 'signal';
    run_doc._trace.signal = signal[0];
    return CW._pipelineSignal(run_doc, signal[0]);
  }
  if (dataKeys.length) {
    run_doc._trace.branch = 'data';
    return CW._pipelineData(run_doc);
  }
  if (opConfig.type === 'read') {
    run_doc._trace.branch = 'read';
    return CW._handlers[run_doc.operation]?.(run_doc);
  }

  // fell through everything — this is the silent no-op bug
  run_doc._trace.warnings.push('_dispatch: no branch matched — no-op');
};

Step 3 — Stamp transition result in _handleSignal
Two key moments: did _getTransitions find a match, and did the rule pass.
javascript// inside _handleSignal, after _getTransitions:
const transitions = CW._getTransitions(schema, doc, dim);
const matched = transitions.find(t => t.key === signalKey);

if (!matched) {
  run_doc._trace.transition_found = false;
  run_doc._trace.warnings.push(`signal ${signal}: no transition found in dim ${dim} from state ${currentVal}`);
  run_doc.input._state[signal] = '-1';
  return;
}

run_doc._trace.transition_found = true;

// after rule check:
if (typeof rule === 'function') {
  const passed = rule(run_doc);
  run_doc._trace.rule_passed = passed;
  if (!passed) {
    run_doc._trace.warnings.push(`signal ${signal}: rule blocked transition`);
    run_doc.input._state[signal] = '-1';
    return;
  }
} else {
  run_doc._trace.rule_passed = null; // no rule defined
}

Step 4 — Stamp adapter call in handlers
In _handlers.update and _handlers.create, wrap the adapter call:
javascriptCW._handlers.update = async function(run_doc) {
  // ... preflight, etc ...
  run_doc._trace.adapter_op = 'update';
  try {
    await globalThis.Adapter[db].update(run_doc);
    run_doc._trace.pb_written = true;
  } catch(err) {
    run_doc._trace.pb_written = false;
    run_doc._trace.warnings.push('adapter.update threw: ' + err.message);
    run_doc.error = { message: err.message };
  }
};

Step 5 — Stamp sideEffects as they execute
In _execTransition, before each sideEffect call:
javascriptfor (const [key, fn] of Object.entries(dimDef.sideEffects || {})) {
  if (key === signalKey && typeof fn === 'function') {
    run_doc._trace.sideEffects_run.push(key);
    await fn(run_doc);
  }
}

What tests look like after this
javascript// T1: Submit task
const r = await CW.run({
  operation: 'update', target_doctype: 'Task',
  query: { where: { name: 'taskxxx' } },
  input: { _state: { '0.0_1': '' } },
  options: { render: false },
});

console.assert(r._trace.branch === 'signal',       'T1: wrong branch');
console.assert(r._trace.signal === '0.0_1',        'T1: wrong signal');
console.assert(r._trace.transition_found === true, 'T1: transition not found');
console.assert(r._trace.rule_passed !== false,     'T1: rule blocked');
console.assert(r._trace.pb_written === true,       'T1: PB not written');
console.assert(r._trace.warnings.length === 0,     'T1: warnings: ' + r._trace.warnings);

// verify PB — source of truth
const v = await CW.run({ operation: 'select', target_doctype: 'Task',
  query: { where: { name: 'taskxxx' } }, options: { render: false } });
console.assert(v.target.data[0].docstatus === 1, 'T1: docstatus not written to PB');

What you gain
The _trace catches the three error classes from before:

Testing wrong thing → pb_written: false catches writes that never happened
Silent no-op → warnings catches unmatched signals and dispatch fall-through
Wrong branch → branch + transition_found tells you exactly where routing stopped

It adds ~15 lines to CW-run.js and zero overhead when tests aren't running. The trace is always there — you don't need to add console.log to the framework to debug.You said: why no universal solutoin in js, when each flagged funciotion call selfprocolling whthout wriring await globalThis.why no universal solutoin in js, when each flagged funciotion call selfprocolling whthout wriring await globalThis.Adapter[db].update(run_doc); run_doc._trace.pb_written = true;2:02 PMClaude responded: You're pointing at a proxy/wrapper pattern.You're pointing at a proxy/wrapper pattern. One place, covers everything.
javascriptCW._traced = function(fn, label) {
  return async function(...args) {
    const run_doc = args.find(a => a?._trace);
    try {
      const result = await fn(...args);
      if (run_doc) run_doc._trace[label] = true;
      return result;
    } catch(err) {
      if (run_doc) {
        run_doc._trace[label] = false;
        run_doc._trace.warnings.push(`${label} threw: ${err.message}`);
      }
      throw err;
    }
  };
};
Then at registration time, wrap once:
javascript// when adapter registers itself
globalThis.Adapter.pocketbase = {
  update: CW._traced(pbUpdate, 'pb_written'),
  create: CW._traced(pbCreate, 'pb_created'),
  select: CW._traced(pbSelect, 'pb_read'),
};
Or even more universal — wrap the entire adapter on init:
javascriptCW._traceAdapter = function(adapter) {
  const wrapped = {};
  for (const [key, fn] of Object.entries(adapter)) {
    if (typeof fn === 'function') {
      wrapped[key] = CW._traced(fn, `adapter.${key}`);
    }
  }
  return wrapped;
};

// in adapter init:
globalThis.Adapter[db] = CW._traceAdapter(rawAdapter);
Now every adapter method self-reports into _trace.adapter without a single line in any handler. Same pattern extends to sideEffects:
javascript// in _execTransition, wrap before calling:
const tracedFn = CW._traced(fn, `sideEffect.${key}`);
await tracedFn(run_doc);
The principle: decoration at the boundary, not at the call site. You define tracing once where things are registered, not where they are called. Every future adapter, every sideEffect, gets it automatically.You said: which approach is productivewhich approach is productive2:03 PMClaude responded: _traceAdapter at registration time._traceAdapter at registration time.
Why:
You touch one line — when the adapter registers. Every method on every adapter is covered forever. New methods added to the adapter get tracing automatically. SideEffects need one wrap in _execTransition — one line, covers all sideEffects across all schemas.
The CW._traced(fn, label) approach at call sites is just manual work with extra steps. You're still writing one line per call — same problem as before, just different syntax.
The productive implementation is three moments:

CW._traceAdapter(rawAdapter) — in adapter init(), wraps all adapter methods once
CW._traced(fn, key) — in _execTransition, wraps each sideEffect before calling
_dispatch stamps branch and signal — two lines, no wrapping needed since it's already the routing hub

Everything else — pb_written, pb_created, adapter.select, sideEffect.0_1 — falls out automatically with zero per-call code.
The ratio: 3 integration points cover 100% of the pipeline surface.You said: but this is for adapterbut this is for adapter2:05 PMClaude responded: Right.Right. The adapter is only one boundary. The same pattern needs to cover:

_handleSignal
_execTransition
_preflight
_getTransitions
sideEffects
rules

The universal solution is a pipeline step registry.
Instead of wrapping individually, every internal CW function that matters registers itself as a named step:
javascriptCW._fn = function(name, fn) {
  CW[name] = async function(...args) {
    const run_doc = args.find(a => a?._trace);
    if (run_doc) run_doc._trace.steps.push({ name, status: 'start' });
    try {
      const result = await fn(...args);
      if (run_doc) run_doc._trace.steps.at(-1).status = 'ok';
      return result;
    } catch(err) {
      if (run_doc) run_doc._trace.steps.at(-1).status = 'error: ' + err.message;
      throw err;
    }
  };
};
Then define every pipeline function through it:
javascriptCW._fn('_handleSignal',   function(run_doc) { ... });
CW._fn('_execTransition', function(run_doc) { ... });
CW._fn('_preflight',      function(run_doc) { ... });
Now run_doc._trace.steps is a chronological log of every function that touched the run, with pass/fail, automatically. No per-call instrumentation anywhere.
This is the universal solution — not adapter-specific, not per-boundary. Every CW internal function self-reports by virtue of how it's defined, not how it's called.You said: i am a bit cofused why catch(err) is not enough.i am a bit cofused why catch(err) is not enough. we trance errors, so this shoudl be 1. enough 2. gives exact error2:07 PMClaude responded: You're right.You're right. If the goal is finding errors fast, catch(err) is sufficient and already exact.
The trace steps / pb_written flags are a different concern — they answer "which branch ran" when there is no error. The silent no-op case: everything succeeds, nothing throws, but nothing was written either.
So the real question is which problem you're actually solving:
If errors are thrown — catch(err) in controller already captures it, run_doc.error has the message, you know exactly where it came from if the error message is good. Nothing extra needed.
If no error but wrong outcome — that's the silent no-op. Signal falls to unmatched block, adapter call is skipped, error stays null. catch never fires. This is where trace adds value.
So the honest answer:

The only case _trace adds value over catch(err) is when the code path that should have run simply didn't run — and that's not an exception, it's a routing miss.

The productive question is: how often does that actually happen in CW vs a real thrown error? From the session history — the silent no-op (wrong signal format, unmatched transition, wrong dim) was actually the most common failure. Which is why trace felt necessary.
But if you enforce one rule instead — every unmatched signal must set run_doc.error — then catch is enough and trace is unnecessary complexity.You said: what u are saying, that our 80% cases are like silent falls, not error.what u are saying, that our 80% cases are like silent falls, not error. and we need to work on them'2:07 PMClaude responded: Yes exactly.Yes exactly.
The framework is too permissive. It treats "nothing matched" as a valid outcome instead of an error. So run_doc.error stays null, test sees success, bug is invisible.
The fix is not tracing — it's making silent falls loud. Every place the pipeline can fall through without doing work should set run_doc.error.
The four silent falls in CW right now:
1. _dispatch — no branch matched
javascript// currently: just returns undefined
// fix:
run_doc.error = { message: `_dispatch: no branch matched for operation '${run_doc.operation}'` };
2. _handleSignal — transition not found
javascript// currently: sets _state[signal] = '-1', returns silently
// fix:
run_doc.error = { message: `signal '${signal}': no transition from state ${currentVal} in dim ${dim}` };
3. _handleSignal — rule blocked
javascript// currently: sets _state[signal] = '-1', returns silently  
// fix:
run_doc.error = { message: `signal '${signal}': rule blocked transition` };
4. _execTransition — sideEffect key not found
javascript// currently: silently skips
// fix:
run_doc.error = { message: `sideEffect '${key}' not found for signal '${signal}'` };

Once these four throw into run_doc.error, your existing catch in controller catches everything. No trace needed. No wrapper pattern needed. Tests just assert !r.error and get the exact reason when something goes wrong.
The real fix was never instrumentation — it was stricter error discipline in the pipeline itself.You said: do you say that i basically ok with exact on error massages, and trace is not critical for nowdo you say that i basically ok with exact on error massages, and trace is not critical for now2:10 PMClaude responded: Yes.Yes.
If those four silent falls are converted to explicit run_doc.error messages — you get exact diagnosis on every failure, for free, with what you already have.
catch(err) + strict error messages in pipeline = 90% of what trace would give you, with zero new infrastructure.
Trace becomes relevant later when:

You have chained child runs and need to see which leg of the chain failed
You want a permanent audit log of what ran (SOC2 direction you discussed)
Performance profiling — which step is slow

None of those are your current problem.
Current problem is simpler: four places that should say "this went wrong" are saying nothing. Fix those first. Everything else follows naturally from run_doc.error already being the established contract in CW.You said: i ask u to scan all April chat that had browser console error and summirize the types of errors I had, which funcitonality brought themi ask u to scan all April chat that had browser console error and summirize the types of errors I had, which funcitonality brought them2:11 PMClaude responded: Good.Searched memorySearched memoryGood. Now I have real data. Here's the April summary:

April Browser Console Errors — Summary by Type
Type 1: TypeError: Cannot read properties of undefined
Most frequent. Appeared in multiple sessions.

Cannot read properties of null (reading 'email') — run.user was null, _resolveInputKey didn't initialize nested object before setting child key
Cannot read properties of undefined (reading 'select') — CW.Adapter.pocketbase didn't exist because _buildIndex keyed by doc.name not adapter_name
Cannot set properties of undefined (setting 'create') — module load order issue, object not initialized when field-system tried to extend it

Functionality: adapter resolution, input key resolver, module initialization

Type 2: Signal routing errors (silent then surfaced)
"Transition 0_1 not allowed from current state 0 (dim 0)" — the signal format was wrong (0_1 instead of 0.0_1), so _handleSignal rejected it. Only became visible after run_doc.error was checked.
"UserPublicProfile signUp going in circles" — wrong CW.run call (direct authRegister bypassing FSM), then wrong signal format, then correct call finally found from history.
Functionality: FSM signal dispatch, UserPublicProfile signup flow

Type 3: SideEffect async timing
PATCH fires, await CW.controller() returns error: null, but PocketBase writes arrive after the test reads. Not a thrown error — visible only by reading PB directly after a deliberate wait.
Functionality: WebPage publish/unpublish sideEffect, _allowed_read patching

Type 4: Wrong test call (not a framework error)
authRegister called directly instead of CW.run with signal — bypassed FSM entirely. Looked like a UserPublicProfile creation bug but was a test authoring mistake.
Functionality: auth registration test pattern

Distribution
TypeFrequencyHow discoveredTypeError undefined/nullHighImmediate console throwSignal routing rejectionMediumrun_doc.error checkSideEffect async timingMediumManual PB verify after runWrong test callLowTracing back through history
The TypeError errors were the only ones that surfaced immediately without extra work. Everything else required either checking run_doc.error explicitly or doing a follow-up PB select — confirming the original problem: errors not identified fast because the test didn't look deep enough into the run.You said: Type1, is mostly the data transormation and transfer  inside 1 run and between runs, correctType1, is mostly the data transormation and transfer  inside 1 run and between runs, correct2:13 PMClaude responded: Yes exactly.Yes exactly.
Within one run — a nested object assumed to exist before it's initialized (run.user.email where run.user is null), or a module extending an object that hasn't been registered yet. The data shape is assumed, not verified before access.
Between runs — _buildIndex keyed by doc.name instead of adapter_name, so CW.Adapter.pocketbase was undefined when the next run tried to use it. The first run created the adapter record, the second run couldn't find it because the index key was wrong.
The common root: one piece of code assumes a contract about data shape or key structure that another piece didn't fulfill. No one enforced the contract at the boundary.
This is actually a specific sub-problem — not general "data transformation" but missing contract enforcement at hand-off points:

run_doc shape (who guarantees run.user is initialized?)
adapter index key (who guarantees the key is adapter_name not doc.name?)
module load order (who guarantees the target object exists before extension?)

In all three cases the answer was "nobody" — the contract existed in the developer's head but not in the code. The fix in each case was one line of defensive initialization or a single source of truth for the key convention.
The broader pattern: CW has strong conventions but no enforcement layer. Conventions live in CW-CODING-RULES.md and in memory. When a hand-off point violates a convention, the error surfaces as a TypeError at runtime rather than being caught at definition time.You said: as we have pipelines next step is alwasy rely on previous.as we have pipelines next step is alwasy rely on previous. what is typical defence here2:15 PMClaude responded: The standard defense is guard at the top of each step, not at the point of use.The standard defense is guard at the top of each step, not at the point of use.
Every pipeline function starts by asserting what it needs from the previous step before doing any work:
javascriptCW._handleSignal = async function(run_doc) {
  // guard — assert previous step delivered what this step needs
  if (!run_doc.target?.data?.[0]) {
    run_doc.error = { message: '_handleSignal: no target record — select step failed or was skipped' };
    return;
  }
  if (!run_doc._signal) {
    run_doc.error = { message: '_handleSignal: no signal set — _dispatch failed to stamp it' };
    return;
  }
  // now safe to proceed
};
The pattern has a name — precondition check — and the rule is simple: each step owns the assertion that its inputs are valid, not the step that produced them.
Why at the top of the receiver, not the bottom of the sender:
The sender doesn't know who reads its output or what they need. The receiver knows exactly what it requires. So the receiver is always the right place.
Applied to the three Type 1 failures from April:
run.user.email — _resolveInputKey should have started with:
javascriptif (parts.length === 2) {
  const [l1, l2] = parts;
  run_doc[l1] = run_doc[l1] || {};  // ← this was the missing guard
  run_doc[l1][l2] = value;
}
CW.Adapter.pocketbase undefined — the adapter lookup step should guard:
javascriptconst adapter = globalThis.Adapter?.[db];
if (!adapter) {
  run_doc.error = { message: `adapter '${db}' not registered` };
  return;
}
Module extension — the field-system registration should guard:
javascriptif (!CW.fields) {
  run_doc.error = { message: 'CW.fields not initialized — load order violation' };
  return;
}
The discipline is: before you touch x.y, ask whether x exists. Before you call adapter.select, ask whether adapter exists. One line each. The TypeError never reaches the console — it becomes a run_doc.error with a message that tells you exactly which step failed and why.
This combines directly with the earlier conclusion about silent falls — same mechanism, same fix: make every assumption explicit as a guard that sets run_doc.error on failure.You said: i always have rundoc as arg.i always have run_doc as arg. so its quite automatic to scan all function below which part of run_doc is used and be very specific in the start2:17 PMClaude responded: Exactly.Exactly. And it's mechanical — not judgment, just reading.
You scan the function body, collect every run_doc.X access, then write the guards at the top in the same order they're first touched:
javascriptCW._handleSignal = async function(run_doc) {
  // used: run_doc._signal, run_doc.target.data[0], run_doc.target_doctype
  if (!run_doc._signal)            { run_doc.error = { message: '_handleSignal: missing _signal' }; return; }
  if (!run_doc.target?.data?.[0])  { run_doc.error = { message: '_handleSignal: missing target record' }; return; }
  if (!run_doc.target_doctype)     { run_doc.error = { message: '_handleSignal: missing target_doctype' }; return; }

  // safe from here
};
The scan is the spec. The function itself tells you its own preconditions.
This also gives you something else for free — every function becomes self-documenting. The guard block at the top is a precise declaration of what the previous pipeline step must have delivered. You can read any CW function and immediately know its contract without reading the whole body.
Which means the _trace discussion from earlier collapses further — if every step guards its inputs and sets run_doc.error on failure, you always know exactly which step failed and what was missing. No trace infrastructure needed. The error message is the trace.You said: can i have catchError(_handleSignal) as auto scan of funciton argcan i have catchError(_handleSignal) as auto scan of funciton arg2:18 PMClaude responded: You're asking if you can introspect the function body automatically to generate guards.You're asking if you can introspect the function body automatically to generate guards. Technically yes — fn.toString() gives you the source — but it's the wrong direction. Parsing JS source at runtime to extract property accesses is fragile, slow, and breaks on any non-trivial expression.
The productive version of the same idea is the opposite direction — you declare what you need, the wrapper enforces it:
javascriptCW._requires = function(fn, contract) {
  return async function(run_doc) {
    for (const [path, label] of Object.entries(contract)) {
      const val = path.split('.').reduce((o, k) => o?.[k], run_doc);
      if (val === undefined || val === null) {
        run_doc.error = { message: `${fn.name}: missing ${label}` };
        return;
      }
    }
    return fn(run_doc);
  };
};
Then define each pipeline function with its contract once:
javascriptCW._handleSignal = CW._requires(
  async function _handleSignal(run_doc) {
    // body — no guards needed here
  },
  {
    '_signal':          '_signal (set by _dispatch)',
    'target.data.0':    'target record (set by select)',
    'target_doctype':   'target_doctype',
  }
);
What you gain:

Contract is declared once, adjacent to the function
No repeated guard boilerplate inside every function
Error message is automatic and consistent
Adding a new required field is one line in the contract object
Every function's preconditions are visible at a glance

The key insight: you're not scanning the function — you're making the developer declare the contract explicitly as data, and the wrapper enforces it. Declaration is cheap and readable. Runtime source parsing is not.You said: its explicit but on every funciton rewrite we rewrite contractits explicit but on every funciton rewrite we rewrite contract2:19 PMClaude responded: Right.Right. The contract becomes stale the moment someone adds a new run_doc.X access to the function body without updating the contract object. You've just moved the problem — instead of missing guards you now have missing contract entries, which is the same bug with extra steps.
The honest answer is there's no fully automatic solution here. Every approach has a maintenance cost:
Explicit contract object — stale on rewrite, as you said.
Guards at top of function — also stale on rewrite, same problem.
TypeScript — catches it at compile time, but you're in vanilla UMD JS, not an option without a build step.
The realistic defense for CW specifically:
The pipeline steps are stable. _dispatch, _handleSignal, _execTransition, _preflight — these don't rewrite often. The contract for each is settled. Write the guards once, they stay valid.
The places that actually change are the schema sideEffects and the adapter methods — and those already have a natural guard: run_doc.error check before any work, adapter existence check before any call.
So the practical rule is just:

When you add a new run_doc.X access to a pipeline function — add the guard for it at the top in the same commit.

Not automatic, but the scope is small. Pipeline functions are short, the scan takes 30 seconds, and the discipline is the same one you already apply to the single-arg rule and the no-naked-CW.run rule — a coding standard, not an enforcement mechanism.