//======== 40-2 c


//======== 40-1 commit 9f1b2c3d4e5f67890abcdef1234567890abcdef
CW-run.js — Architecture Summary
What it is
The controller layer between UI and adapter. Owns all business logic. Adapter owns only DB communication.
Files it depends on
CW-state.js     → globalThis.CW, _updateFromRun, getBehavior
CW-config.js    → _config, operationAliases, doctypeAliases, behaviorMatrix
CW-utils.js     → generateId
Adapter.*       → select, create, update (injected via globalThis.Adapter)

Core contract
All functions: function(run_doc) only
No return values — mutate run_doc
input  → what user/UI provides
target → what comes back from DB
query  → how to find records

Components
CW._resolveAll(op)
Mutates op before run_doc is built:

Operation aliases: read → select, insert → create
Doctype aliases: item → Item, customer → Customer
Resolves adapter, view, component, container from config

CW.run(op)
Builds run_doc — a plain object holding all state for one operation:
doctype, name, creation      → Frappe-style identity
operation, source/target_doctype, adapter → routing
query, input, target         → data
status, success, error       → execution state
parent_run_id, child_run_ids → hierarchy
_running, _needsRun, _signal → controller internals
Wraps input in a Proxy — every mutation wakes CW.controller via queueMicrotask, but only when _running = false and status !== completed/failed.
Also attaches run_doc.child(op) — spawns child run, tracks relationship bidirectionally.
CW.controller(run_doc)
Main entry point. Mutex via _running + dirty flag _needsRun:
if _running   → set _needsRun, return
if completed  → return (no re-fire)
set _running = true
  → check _state for signal → _handleSignal
  → or route to _handlers[operation]
set _running = false
if _needsRun  → call self again
CW._handleSignal(run_doc)
Handles UI button signals from run_doc.input._state:
signal = key in _state where value === ""

1. fetch existing doc from DB (guardian needs real docstatus)
2. CW.getBehavior(schema, existingDoc) → check guardian.blockOperations
3. if blocked → _state[signal] = "-1", set error, return
4. route signal to operation:
   save   → create (no name) OR update (has name)
   submit → update + docstatus = 1
   cancel → update + docstatus = 2
   amend  → create + amended_from = original name
5. _state[signal] = "1" (success) or "-1" (failure)
CW._preflight(run_doc, operation)
Schema-driven document preparation — runs while _running = true so Proxy mutations don't re-trigger controller:
create:
  1. validate reqd fields FIRST (before generateId)
  2. generateId from schema.autoname
  3. apply field defaults
  4. serialize Code/JSON fields
  5. stamp doctype + modified

update:
  1. validate reqd on merged (existing + input)
  2. serialize Code/JSON fields
  3. stamp modified
CW._handlers
Four operations, all function(run_doc):
select  → Adapter.select → field filtering by view
          list/card: only in_list_view fields
          form:      all fields (no filtering)

create  → _preflight(create) → Adapter.create

update  → Adapter.select (fetch existing)
        → _preflight(update)
        → Adapter.update

delete  → input.docstatus = 2
        → _handlers.update (soft delete)

Key design decisions
Proxy guard — if (!run_doc._running) prevents preflight mutations from re-triggering controller. Status guard prevents re-fire after completion.
_rawInput rejected — preflight uses run_doc.input directly (the Proxy). Safe because _running = true during execution.
_signal on run_doc — signal extracted from _state by controller, stored on run_doc._signal, read by _handleSignal. Keeps function(run_doc) contract.
Guardian uses DB state — _handleSignal fetches existing doc before guardian check. Prevents checking input delta instead of real docstatus.
Soft delete — delete sets docstatus = 2 and calls update. No hard deletes.
is_submittable drives behavior — CW.getBehavior(schema, doc) reads behaviorMatrix key [is_submittable]-[docstatus]-[_autosave] to determine autoSave and guardian.blockOperations.

Tested coverage
22 tests passing across: select, create, update, delete, operation aliases, doctype aliases, pagination, reqd validation, _state signals (save/submit/cancel/amend), guardian blocking, JSON serialization, child runs, list/form view filtering, no re-fire after completion.