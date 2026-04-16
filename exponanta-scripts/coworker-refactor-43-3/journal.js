//42-1

Current Architecture Summary
Files changed in this session

CW-run.js — refactored, tested, 3 bugs fixed
CW-ui.js — refactored
pb-adapter-pocketbase.js — one fix


CW-run.js — what changed
Proxy removed. run_doc.input is now a plain object. No auto-wake, no _running, no _needsRun, no queueMicrotask.
CW.run is async and bundles controller. Every CW.run() call returns a completed run_doc — no separate CW.controller() needed for fresh runs.
Controller routing by content, not operation name. After a select, if input has field data → routes to update. Original run_doc.operation string is irrelevant for the write decision.
Editable gate lives in _handlers.update after re-fetch:
freshDoc.docstatus === 0  →  proceed
freshDoc.docstatus !== 0  →  silent skip (unless options.internal)
Signals bypass editable gate via options.internal = true set at entry of _handleSignal, restored at exit. Signals own their own authorization (requires, rules, state check).
Amend validates current state — only allowed from docstatus=2. Copies all non-system fields from original record.
Update always re-fetches — no skip optimization. Adapter always gets a fresh PB record with correct id.

CW-ui.js — what changed
All controller calls explicit. No Proxy auto-wake anywhere. Every trigger is visible:

FSM button → run_doc.input._state = {key:''} → CW.controller(run_doc)
Field blur → commitField(val) → run_doc.input[field] = val → CW.controller(run_doc)
Navigation → CW.run({...}) — bundles controller

onRowClick — fire and forget, no second pass, no .operation intent marker.
onCardAction — no pre-populated target, just query.where.name.
onRelAction — same pattern as onCardAction.
RelationshipPanel.onAdd — all input passed at construction time, no fake setTimeout.
child() used correctly — Table rows, Link options, Relationship loads. Peer operations (onCardAction, onRelAction) use CW.run() directly.

pb-adapter-pocketbase.js — what changed
select fast path — replaced getOne(name) with getFullList({ filter: 'name = "X"' }). Works for both old records (id ≠ name) and new (id = name).
update skip-refetch block removed — always fetches by filter, PATCHes by rec.id. No stale target shortcuts.

Bugs found and fixed during testing
BugWhereFixField blur never savedController routingRoute by input content not operation nameInvalid FSM transitions allowed_handleSignalValidate fromVal === currentVal before executingAmend on non-cancelled records_handleSignal amendCheck docstatus === 2 before amendStale target bypasses editable_handlers.updateEditable check after re-fetch, not beforeFSM signals blocked on non-draft_handlers.updateoptions.internal bypass for signal pathAmend missing required fields_handleSignal amendCopy existingDoc fields into input before create404 on old records in selectpb adaptergetFullList instead of getOne

Test coverage

40 tests in test-cw-full.js — 116 assertions
10 tests in test-amend-new.js — 36 assertions
152 total assertions, 0 failures



//
removed LIST/VIEW
_allowed_read ?~ "roleispublixxxx" ||
(
  @request.auth.id != "" && (
    id = @request.auth.id ||
    owner = @request.auth.id ||
    _allowed ?~ @request.auth.id ||
    _allowed_read ?~ @request.auth.id ||
    (
      @collection.item_users.id ?= @request.auth.id &&
      _allowed ?~ @collection.item_users.role_id
    ) ||
    (
      @collection.item_users.id ?= @request.auth.id &&
      _allowed_read ?~ @collection.item_users.role_id
    )
  )
)

create 
doctype != "User" || (
  @request.auth.id != "" &&
  @request.body._allowed_read:length = 0 &&
  @request.body._allowed:length = 1 &&
  @request.body._allowed:each ~ "rolesystemmanag" &&
  @request.body.owner = "" &&
  (
    @request.body.id = @request.auth.id ||
    @collection.item_users.id ?= @request.auth.id &&
    @collection.item_users.role_id ?= "rolesystemmanag"
  )
)

delete
@request.auth.id != "" &&
(@request.body.doctype:isset = false || @request.body.doctype = doctype) &&
(
  owner = @request.auth.id ||
  _allowed ?~ @request.auth.id ||
  (
    @collection.item_users.id ?= @request.auth.id &&
    _allowed ?~ @collection.item_users.role_id
  )
)


//=======40-8=======

Relationships 

//=======40-5 =======

FSM 
//========= 40-4 commit 51e60cb884397e506c510bd2dd77e01fa6e7d3aa
Two fixes:

CW.run — _updateFromRun restored (needed for run registration)
CW-ui.js — coworker:state:change listener no longer triggers _render — only updates nav UI. All renders now happen exclusively from CW.controller after data is fetched.

This means FieldRenderer useState always initializes with populated target.data[0].Cw runJS Download


//========= 40-3 commit 39e67305478eddf7caf9b411b9de3848e67aa358
What's in code now
Files
index.js                 — bootstrap, loads all CW files, connects PocketBase
CW-state.js              — globalThis.CW, runs registry, _updateFromRun, _buildIndex, Proxy, FSM
CW-config.js             — _config: adapters, operationAliases, doctypeAliases, operations, views, behaviorMatrix
CW-utils.js              — generateId, parseLayout, helpers, CW.getBehavior, CW.evalTemplate
CW-run.js                — controller, handlers, preflight
pb-adapter-pocketbase.js — PocketBase DB connector
CW-ui.js                 — React 18 render system, navigation, FieldRenderer, MainForm, MainGrid
app.html                 — Tabler CSS + React UMD + script loads

CW-run.js
CW._resolveAll(op) — mutates op: resolves operation aliases, doctype aliases, adapter, view, component, container from config.
CW._resolveInput(run_doc) — promotes .field keys from input to run_doc top level, removes them from input. Called at start of every controller execution. Enables reactive streaming of run_doc properties via input mutations:
javascriptrun_doc.input['.operation'] = 'update'  // → run_doc.operation = 'update'
run_doc.input['.view']      = 'form'    // → run_doc.view = 'form'
CW.run(op) — builds run_doc factory. Wraps input in Proxy — every mutation wakes CW.controller via queueMicrotask, but only when _running = false. run_doc fields: operation, source/target_doctype, adapter, view, component, container, query, input, target, status, success, error, options, child_run_ids.
CW.controller(run_doc) — main execution loop:

Mutex via _running + _needsRun
Calls _resolveInput first
Routes to _handleSignal if _state has "" key
For read ops → always executes handler
For write ops → only executes if behavior.controller.autoSave = true AND input has data fields
Resolves create vs update from target.data[0].name or input.name
Clears input after successful save
Calls CW._render if options.render = true

CW._handleSignal(run_doc) — handles UI button signals:

Fetches existing doc first (guardian needs real docstatus)
Checks behaviorMatrix.guardian.blockOperations
Routes: save → create/update, submit → update+docstatus=1, cancel → update+docstatus=2, amend → create+amended_from
Sets _state[signal] = "1" or "-1"
Clears input after successful signal

CW._preflight(run_doc, operation) — schema-driven, runs while _running=true:

create: validate reqd → generateId → apply defaults → serialize JSON fields → stamp
update: validate reqd on merged doc → serialize JSON fields → stamp

CW._handlers — select, create, update, delete:

select: adapter.select + field filtering by view (list/card/form)
create: preflight → adapter.create
update: adapter.select → preflight → adapter.update
delete: set docstatus=2 → update


pb-adapter-pocketbase.js
Pure PocketBase connector. No business logic.

PB_TOP — top-level fields: name, doctype, docstatus, owner, _allowed, _allowed_read
_splitRecord(doc) — separates top fields from data blob
_mergeRecord(rec) — flattens PB record back to doc
_buildFilter(run_doc) — builds PocketBase filter string from query.where
_buildSort(run_doc) — builds PocketBase sort string
select(run_doc) — getList (paginated) or getFullList
create(run_doc) — pb.create with split record
update(run_doc) — fetch by filter → merge data → pb.update
delete(run_doc) — soft delete via update+docstatus=2 (same as handler)
Self-registers: globalThis.Adapter.pocketbase


CW-ui.js
Render system:

CW._reactRoots — React 18 root cache per container
CW._getOrCreateRoot(containerId) — creates/reuses root
CW._render(run_doc) — dispatches to CW._components[run_doc.component]

Navigation:

navigate(direction) — back/forward through main runs
navigateTo(runName) — jump to specific run
_updateNavUI() — updates breadcrumbs + back/forward buttons
Listens to coworker:state:change

FieldRenderer({ field, run_doc }):

useState initialized from run_doc.target.data[0][fieldname] — React owns display
onChange → setLocalVal (immediate) + debounced 300ms run_doc.input[field] = val
onBlur → immediate run_doc.input[field] = val
Handles: Data, Text, Long Text, Int, Float, Currency, Percent, Check, Select, Date, Datetime, Time, Code, Password, Link, Read Only, Section Break
readOnly from behavior.ui.fieldsEditable

MainForm({ run_doc }):

Schema from CW.Schema[doctype] — synchronous
Behavior from CW.getBehavior(schema, target.data[0])
Title from target.data[0][schema.title_field]
Renders fields filtered by evaluateDependsOn
Buttons from behavior.ui.showButtons → run_doc.input._state = { [action]: "" }
Badge from behavior.ui.badge or docstatus
Error display from run_doc.error

MainGrid({ run_doc }):

Tabler table from run_doc.target.data
onRowClick → select with view:'form' → CW.controller → stream input['.operation']='update'
onNew → CW.run({ operation:'create' }) → CW.controller


Key architectural decisions
Single source of truth — run_doc is the only shared mutable object. All mutations go through run_doc.input. Proxy wakes controller.
.field streaming — top-level run_doc properties changed reactively via input['.operation'], input['.view'] etc. _resolveInput promotes and removes them before any data operation.
Optimistic UI — React useState owns display. Controller owns persistence. No merging in React. No React state in controller.
Delta architecture — run_doc.target.data[0] = original from DB. run_doc.input = only what changed. Merged only in _preflight before write.
Soft delete — docstatus=2 via update. No hard deletes.
Behavior-driven — behaviorMatrix drives autoSave, fieldsEditable, showButtons, guardian.blockOperations. All from is_submittable + docstatus + _autosave key.
AutoSave — write ops only execute when behavior.controller.autoSave=true AND input has data fields. Form stays alive after save — status resets for next mutation.

//======== 40-2 7f2d26c121ec261cfc7af796752e667457bf2fda = 
just rendering

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