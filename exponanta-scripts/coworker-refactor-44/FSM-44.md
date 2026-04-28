CW FSM — Architecture Summary
Core concept
FSM state is not a field — it's a signal carrier. _state is a key-value map where:

"" = signal pending (user intent, not yet executed)
"1" = signal succeeded
"-1" = signal failed

Controller detects "" → dispatches to _handleSignal → validates → executes → marks "1" or "-1".

Signal format: dim.from_to
"0.0_1"  — dim 0, transition from state 0 to state 1
"1.0_1"  — dim 1, transition from state 0 to state 1
Each dim is an independent state machine on the same document. They coexist in _state without collision because keys are namespaced by dim prefix.

Dims
dim[0] — owned by SystemSchema. Canonical document lifecycle:

0 = Draft, 1 = Submitted, 2 = Cancelled
Drives docstatus field
Universal transitions: Submit, Delete, Cancel, Amend
Guards: is_submittable, no dirty input on submit

dim[1]+ — owned by doctype. Domain-specific state:

Independent values, labels, transitions
Coexists with dim[0] — both active on same record
Example: UserPublicProfile dim[1] = Draft/SignedUp with Sign Up transition

Doctype defines dim[1]+ → system owns dim[0] → no collision, no override.

Gate sequence in _handleSignal
Every signal passes through gates in order:
1. dim match        — signal prefix matches a known dim
2. key guard        — sideEffect or label exists for this key
3. transition valid — fromVal === currentVal, toVal in transitions[currentVal]
4. requires         — schema flags must match (e.g. is_submittable: 1)
5. rules            — arbitrary function must return true
6. sideEffects      — async functions fire (signUp, visibility update, etc.)
7. _state marked    — signal set to "1"
8. save             — _handlers.update/create called
Fail at any gate → _failSignal → _state[signal] = "-1" → stops. No partial execution.

_getStateDef composition
SystemSchema._state[dim] + Schema[doctype]._state[dim]

Top-level keys (transitions, labels, requires, rules): dtDim wins — doctype fully overrides system for that key
sideEffects: key-level merge — dtDim wins per key, system keys preserved
Doctype only needs to specify what's different — system defaults apply for everything else

Design is discipline-based — doctype that redefines dim[0] owns it fully. Safer to add dim[1] than override dim[0].

_getDimValue — current state resolution
Priority chain:
1. _state keys with prefix "dim." → parse from/to, v="1" → current=to, v="-1" → current=from
2. state[dim] direct key
3. doc[dimDef.fieldname]  (e.g. doc.docstatus for dim 0)
4. dimDef.values[0]       (default = 0)
This means _state is the primary source of truth for FSM position — not docstatus. docstatus is a derived field synced by _execTransition for dim[0] only.

sideEffects — rules

Fire before _state is marked "1"
rec = run_doc.target.data[0] is a live reference — _state still has "" at this point
Must never pass rec directly to a child — always clone with clean _state
Must never call CW.controller after child() — double execution
Everything the child needs must be passed into child() upfront
options.internal: true bypasses editable check (docstatus !== 0 guard)


_autosave semantics

_autosave: 0 = don't save on field change (form UX concern)
Signal path bypasses _autosave entirely — explicit user action always saves
Internal child updates from sideEffects use options.internal: true to bypass editable check
_autosave only blocks the no-signal data-change branch


Power of the model
One pipeline for everything. CW.run → controller → same gates whether field change, FSM transition, or system write. No special cases in calling code.
Signals are data. _state is persisted to DB — FSM position survives page reload, is queryable, auditable.
Dims are orthogonal. Document lifecycle (dim[0]) and domain state (dim[1]+) are independent machines on the same record. Neither knows about the other. UI shows whichever is relevant.
Schema drives everything. transitions, requires, rules, labels, sideEffects, primary, confirm — all declared in schema JSON. No imperative FSM code in components.
Child runs are traceable. Every run_doc.child() links via parent_run_id → full execution tree in CW.runs → debuggable, auditable, no hidden side effects.