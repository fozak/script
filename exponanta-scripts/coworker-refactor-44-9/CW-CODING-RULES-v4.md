//Add this

fn(run_doc, path) universal signature
Every CW utility function and component uses (run_doc, path) signature.
First line: run_doc = CW._getChildRun(run_doc, path) || run_doc;
Second line: const doc = run_doc.target?.data?.[0] || {};
path absent = work with run_doc directly.
path present = resolve child run and reassign run_doc.
_expand is the data loading mechanism
CW._expand(run_doc, path) spawns child runs for Table/Relationship fields.
Called by CW._handlers.select on view: 'form'.
Fire and forget — no await, no return needed.
Components never fetch — they read from CW._getChildRun(run_doc, fieldname).
child() and _render are fire and forget
run_doc.child() executes the full pipeline immediately.
options: { render: true } triggers _render as a side effect — no return needed.
await run_doc.child() only when you need cr.target.data immediately after.
Never store cr — read from CW.runs via CW._getChildRun instead.
CW_FIELD_COMPONENTS config map
FieldRenderer is a pure dispatcher — no logic, no fetching.
const Component = CW_FIELD_COMPONENTS[field.fieldtype];
return ce(Component, { run_doc, field });
Every field component receives { run_doc, field } — unified signature.
refetchGrid replaced by child with render: true
Never call CW.refetchGrid — fire run_doc.child({ operation: 'select', ..., options: { render: true } }).
After write operations call CW._expand(run_doc, path) to refresh child data.
DON'Ts to add to the table:
WrongRightconst ctx = CW._resolveGrid(...)run_doc = CW._getChildRun(run_doc, path) || run_docloadRows / loadRels in componentsCW._expand on form load, read from CW.runsuseState for child data arraysCW._getChildRun(run_doc, fieldname)?.target?.datauseEffect for child data fetchdata already in CW.runs from _expandreturn run_doc.child(...)run_doc.child(...) — return value ignoredconst cr = await run_doc.child() without reading crfire and forgetCW.refetchGrid(run_doc)run_doc.child({ operation: 'select', ..., options: { render: true } })



// ADD THIS 

Rule: always fetch with view: "form" when the result needs FSM state (_state) for rendering buttons or badges.
view: "list" strips fields to in_list_view only — use it for lists where you only need display columns.
view: "form" returns all fields — use it whenever the component needs to compute transitions, render badges, or make decisions based on document state.



# CW Component & Framework Coding Rules v3

Rules for writing components, schemas, system fields, and framework extensions
in the CW framework. Follow these exactly.

---

## The model in one sentence

Every component is a pure render function of `run_doc`.
It renders once from what it receives. It spawns children. It never manages
state that crosses its own boundary.

---

## 1. Boot — one top-level CW.run only

The only legitimate naked `CW.run` call is the single boot call in the HTML file.
`cwStateFromUrl()` contains this call — it reads URL params and fires the one boot run.

```js
// app.html — entire boot
window.addEventListener('load', async () => {
  await waitForBoot()
  cwStateFromUrl()   // ← the one legitimate CW.run
})
```

If a boot run already exists in `CW.runs` (no `parent_run_id`), `cwStateFromUrl` fires
a child run instead. Schema resolves component, container, and view automatically
from `view_components`.

---

## 2. Navigation and data — always child()

Inside any component, every operation goes through `run_doc.child()`.

```js
// row click — navigate to record
run_doc.child({
  operation:      'select',
  target_doctype: 'Post',
  query:          { where: { name: record.name } },
  options:        { render: true },
})

// fetch data without rendering
run_doc.child({
  operation:      'select',
  target_doctype: 'Comment',
  query:          { where: { parent: doc.name } },
  options:        { render: false },
}).then(cr => { if (cr.success) setComments(cr.target?.data || []) })

// create record
run_doc.child({
  operation:      'create',
  target_doctype: 'Post',
  input:          { title: 'Draft', channel: channelName, docsubtype: 'post' },
  options:        { render: true },
})

// FSM signal
run_doc.child({
  operation:      'update',
  target_doctype: 'Post',
  query:          { where: { name: doc.name } },
  input:          { _state: { '0_1': '' } },
  options:        { render: false, internal: true },
})
```

---

## 3. React state — ephemeral UI only

`React.useState` is only for cosmetic/ephemeral state that does not cross component boundary.

**Allowed:**
- Sort column / sort direction in a grid
- Dropdown open/closed
- Local textarea value (display only, preserves focus)
- Loading spinner flag
- Link options list (fetched once for a field)

**Never allowed:**
- Document data (use `run_doc.target.data`)
- Navigation/selection state (use run tree)
- Record names or ids for cross-component coordination
- `rev` counters to force re-renders

---

## 4. Schema rules

### view_components — schema owns UI routing

```json
"view_components": {
  "list": { "component": "ChannelFeed", "container": "left_pane" },
  "form": { "component": "MainForm",    "container": "main_container" }
}
```

### explicit_edit_intent — schema declares edit pattern

```json
"explicit_edit_intent": 1
```

- `0` (default) — `MainForm` auto-switches `run_doc.operation` from `select` to `update`
  when an existing `docstatus=0` record is opened. Fields are immediately editable.
- `1` — fields are read-only by default. User must click Edit in the `•••` menu.
  Use for doctypes with rich composer fields (BlockNote).

### is_hierarchical — opt-in for top_parent propagation

```json
"is_hierarchical": 1
```

The `systemFields.onCreate` handler for `top_parent` only fires when the schema
declares `is_hierarchical: 1`. Doctypes without this flag never receive `top_parent`
on creation, even if the create is fired as a child run of a same-doctype form.

**Decision on `top_parent` for same-doctype hierarchies is PENDING — do not implement
until explicitly decided.**

### row_renderer — schema owns row display

```json
"row_renderer": "PostRow"
```

### primary — schema declares primary FSM button

```json
"primary": { "0_1": true }
```

### action_labels — in SystemSchema, inherited by all

```json
"action_labels": { "edit": "Edit", "save": "Save" }
```

### Security rules belong in PocketBase ACL only

Never add security logic to client schema `rules`. Client rules are UI guards only.

---

## 5. Field naming conventions

| Wrong | Right |
|---|---|
| `post_type`, `task_type` | `docsubtype` |
| `top_parent` in schema fields array | declare as `Link` with `options: "<SameDoctype>"`, `hidden:1`, `read_only:1` |
| `parent` as a named schema field | use explicit named Link field (`channel`, `project`) |
| new fieldtype not in Frappe | use closest existing fieldtype |

---

## 6. Data integrity rules

### Every Link must have a bidirectional Table

Every `Link` field on a child must have a corresponding `Table` field on the parent. No orphan Links.

```
Post.channel  (Link → Channel)  ↔  Channel.posts    (Table → Post)   ✅
Post.post     (Link → Post)     ↔  Post.comments    (Table → Post)   ✅
Task.project  (Link → Project)  ↔  Project.tasks    (Table → Task)   ✅
```

### Never use `parent` as a schema field name

`parent` is a reserved system field. Exception: `Relationship` doctype uses
`parent`/`parenttype`/`parentfield` by Frappe convention.

### Three relationship fieldtypes — no others

| Fieldtype | Direction | Use case |
|---|---|---|
| `Link` | child → parent | 1-1 named reference, stored in child |
| `Table` | parent → children | 1-many, same or different doctype, FK = `parent` |
| `Relationship Panel` | many → many | junction doctype, mixed doctypes |

Never use `Data` as an implicit untyped link. If it is a reference to another record, use `Link`.

---

## 7. URL params — cwStateFromUrl / cwStateToUrl

URL params map 1:1 to `CW.run` arguments via `CW._config.runParams`.
Adding new `run_doc` fields requires only adding an entry to `runParams` — no code changes.

| URL param | run_doc path |
|---|---|
| `doctype` | `target_doctype` |
| `operation` | `operation` (default: `select`) |
| `view` | `view` |
| `component` | `component` |
| `container` | `container` |
| `source_doctype` | `source_doctype` |
| `name` | `query.where.name` |
| `filter` | `query.filter` (raw PB string) |
| `sort` | `query.sort` |
| `fields` | `query.fields` |
| `expand` | `query.expand` |
| `perPage` | `query.perPage` (int) |
| `page` | `query.page` (int) |

`operation` is always `select` in URLs — never `create` or `update`.
`cwStateToUrl` only serializes boot runs (`parent_run_id = null`). Child runs never update the URL.

---

## 8. PocketBase adapter query params

`query.where` and `query.filter` are both supported and ANDed together.
`query.filter` passes a raw PocketBase filter string directly — bypasses `_buildWhereClause`.

| CW query key | PocketBase param | Notes |
|---|---|---|
| `query.where` | `filter` | compiled via `_buildWhereClause` |
| `query.filter` | `filter` | raw string, ANDed with where |
| `query.sort` | `sort` | string or object |
| `query.fields` | `fields` | column projection |
| `query.expand` | `expand` | relation expand |
| `query.perPage` | `perPage` | triggers `getList` |
| `query.page` | `page` | default: 1 |
| `query.batch` | `batch` | chunk size for `getFullList` |
| `query.skipTotal` | `skipTotal` | default: `true` |

No `query.perPage` → `getFullList`. `query.perPage` present → `getList` with pagination.
`query.take` is removed — use `query.perPage`.

---

## 9. FieldRenderer state reset rules

### Use derived state pattern to reset on record change

```js
const [prevName, setPrevName] = React.useState(doc_.name)
const [localVal, setLocalVal] = React.useState(safeInitial)
if (prevName !== doc_.name) {
  setPrevName(doc_.name)
  setLocalVal(safeInitial)
}
```

Same for Link `searchText`:

```js
if (prevName !== doc_.name && field.fieldtype === 'Link') setSearch(safeInitial || '')
```

### Never use `key` to reset field state

`key` forces full remount — destroys focus, resets all child components including BlockNote.
Use derived state instead.

### `useState` allowed for display/focus only

`localVal` exists only to preserve focus during typing. It is reset when the record changes.
It is never the source of truth — `run_doc.target.data` is.

---

## 10. BlockNote field rules

### `editor.js` functions always take `run_doc`

```js
// Wrong
mount({ containerId, recordId, onBeforeUpload, onChange })

// Right
mount({ run_doc, fieldname, onChange })
```

### Container id = `run_doc.name`

BlockNote mounts into a div with `id = run_doc.name`. No prefix, no fieldname suffix.
One BlockNote per form, one form per run.

### Upload uses `run_doc.child()` not `CW.run()`

```js
async function uploadViaCW(file, run_doc) {
  const r = await run_doc.child({
    operation:      'update',
    target_doctype: run_doc.target_doctype,
    query:          { where: { name: run_doc.target?.data?.[0]?.name } },
    input:          { 'files+': file },
    options:        { render: false },
  })
}
```

### `BlockNoteField` is an extracted component — no hooks violation

```js
if (field.fieldtype === 'BlockNote')
  return ce(BlockNoteField, { field, run_doc, readOnly, timerRef, debounce })
```

`BlockNoteField` always calls `useEffect` regardless of `readOnly` — no conditional hooks.

---

## 11. Component fieldtype (CWComponent)

`fieldtype: Component` declares a field rendered by an external JS module.

```json
{ "fieldname": "event_slot", "fieldtype": "Component",
  "component": "./slot-picker.js", "display": "SlotBadge" }
```

The module must export:
- `mount({ run_doc, fieldname, onChange })` — mounts into container `run_doc.name + '_' + fieldname`
- `unmount(run_doc)` — optional cleanup

`CWComponent` guards against missing modules — shows visible red error instead of silent empty div.
The `display` field names a `globalThis` renderer for read-only mode.

---

## 12. `CW._render` memory management

One container = one active run. On every `CW._render` call, delete all other runs
targeting the same container:

```js
Object.values(CW.runs).forEach(r => {
  if (r.name !== run_doc.name && r.container === run_doc.container) {
    delete CW.runs[r.name]
  }
})
```

Grid runs are never cleaned up. Only form runs in detail containers are replaced.

---

## 13. Views and containers

### Universal container set — present on every page

```html
<div id="nav_container"></div>
<div id="main_container"></div>
<div class="row g-0">
  <div class="col-md-3" id="left_pane"></div>
  <div class="col-md-9" id="right_pane"></div>
</div>
<div id="toast_container"></div>
```

Hide empty containers with CSS:

```css
#main_container:empty,
#left_pane:empty,
#right_pane:empty { display: none; }
```

### `CW._config.views` declares global defaults

```js
views: {
  list: { component: 'MainGrid', container: 'left_pane'  },
  form: { component: 'MainForm', container: 'right_pane' },
  read: { component: 'MainForm', container: 'right_pane' },
  edit: { component: 'MainForm', container: 'right_pane' },
}
```

### `_resolveViewComponent` resolution order

1. Schema `view_components[view]` — most specific
2. `CW._config.views[view]` — global default
3. `{ component: 'MainForm', container: fallback_container }` — framework fallback

---

## 14. DON'Ts summary

| Wrong | Right |
|---|---|
| `CW.run(...)` inside component | `run_doc.child(...)` |
| `useState` for document data | `run_doc.target.data` |
| `useState` for navigation | run tree expresses state |
| `useEffect` to re-fetch | data arrives at mount |
| `setRev(v+1)` after signal | signal re-mounts with fresh data |
| `CW.controller(r)` directly in component | `run_doc.child({ input: { _state: ... } })` |
| hardcode `component:` in child call | schema `view_components` |
| hardcode `container:` in child call | schema `view_components` |
| `context: { channel: name }` | `input: { channel: name, docsubtype: '...' }` |
| `run_doc._anything = ...` outside factory | `CW.runs[parent_run_id]` |
| `(input, run_doc)` in systemFields handler | `(run_doc)` only |
| `return value` from systemFields handler | mutate `run_doc.input` directly |
| security rules in client schema | PocketBase ACL only |
| `operation=update/create` in URL | URL always `select`; operation inferred at runtime |
| `query.take` | `query.perPage` |


# CW Controller Rules — Implementation Reference

Based on actual implementation in CW-run-proposed.js.

---

## Controller Pipeline (exact order)

Every `CW.controller(run_doc)` call executes these steps in order:

```
1. _resolveInput   — meta channel: input['.field'] → run_doc.field
2. _mergeInput     — all input → target.data[0] (including virtual + _state)
3. _clearInput     — input emptied: input = { _state: {} }
4. dispatch        — read from target.data[0], route to handler
```

---

## Rule 1: `target.data[0]` is the live working document

After `_mergeInput`, `target.data[0]` is always complete and current.
Everything downstream reads from `target.data[0]` only.
`input` is always empty after step 3.

---

## Rule 2: `input` is the intent delta

`input` carries user changes before they reach `target.data[0]`.
It is the ONLY place UI writes to:

```js
run_doc.input[field.fieldname] = val;  // commitField
run_doc.input._state['0.0_1'] = '';    // onFsmClick
run_doc.input['.operation'] = 'update'; // meta channel
```

`input` is cleared after `_mergeInput`. Never read by dispatchers.

---

## Rule 3: Three input channels

| Channel | Key format | Dispatches to |
|---------|-----------|---------------|
| Meta | starts with `.` | `run_doc.field` via `_resolveInput` |
| FSM | `_state: { signal: '' }` | `_handleSignal` |
| Data | everything else | `_handlers.create/update` |

All three are merged into `target.data[0]` before dispatch.

---

## Rule 4: Signal dispatch

Signal detected from `target.data[0]._state` after merge:

```js
const signal = Object.entries(doc._state || {}).find(([,v]) => v === '');
```

Pending signal = `''`. Completed = `'1'`. Failed = `'-1'`.

If signal found → `_handleSignal` → always persists (regardless of `_autosave`).

---

## Rule 5: `_autosave` controls data branch only

```js
const autosave = schema?._autosave ?? 1;
if (autosave !== 0) {
  // persist field changes immediately
}
```

| `_autosave` | data branch | signal branch |
|-------------|-------------|---------------|
| `1` (default) | persists immediately | persists |
| `0` | skips persist (accumulates) | persists |

**`_autosave: 0`** = accumulate field changes in `target.data[0]` until a signal fires.
Any signal — `0.0_1`, `1.0_1`, etc. — triggers persist via `_handleSignal`.
No special signal required. First signal after accumulation saves everything.

---

## Rule 6: Virtual fields lifecycle

Fields with `virtual: 1` in schema:
- Merged into `target.data[0]` by `_mergeInput` (temporarily present)
- Available to sideEffects (which read from `target.data[0]`)
- Stripped by `_stripVirtual` inside `_handlers.create/update` — AFTER `_preflight`, BEFORE adapter write
- Never reach DB

```
_mergeInput → virtual in target
_preflight  → validates virtual (reqd check passes)
_stripVirtual → virtual removed from target
Adapter.create/update → writes clean target
```

---

## Rule 7: `_preflight` takes only `run_doc`

```js
CW._preflight(run_doc)  // correct
CW._preflight(run_doc, 'create')  // wrong — violates coding rules
```

`_preflight` reads `run_doc.operation` internally. No extra args.

---

## Rule 8: All framework functions take only `run_doc`

systemFields handlers:
```js
// correct
onWrite: (run_doc) => { const doc = run_doc.target?.data?.[0]; if (doc) doc.field = val; }

// wrong
onWrite: (run_doc, input) => { input.field = val; }
```

All reads/writes go through `run_doc.target.data[0]`.

---

## Rule 9: Adapter is pure I/O

`create` and `update` read from `target.data[0]` only:

```js
// adapter create
const doc = run_doc.target?.data?.[0];
const { top, data } = _splitRecord(doc);
await pb.collection(collection).create({ id: doc.name, ...top, data });

// adapter update — no fetch, no merge
const doc = run_doc.target?.data?.[0];
const { top, data } = _splitRecord(doc);
await pb.collection(collection).update(doc.id, { ...top, data });
```

No `getFullList` before update. No `Object.assign({}, rec.data, data)` merge.
Caller guarantees `target.data[0]` is complete before calling adapter.

---

## Rule 10: Caller responsibility

`target.data[0]` must be populated before calling `update`.
No runtime guard. Coding discipline — same as Express middleware contract.

For `create` — `target` can be null. `_mergeInput` initializes it from `input`.

---

## Rule 11: `_state` merge ownership

`_mergeInput` owns `_state` merge:
- Clears same-dim signals from `target.data[0]._state`
- Merges `input._state` into `target.data[0]._state`
- Preserves other-dim signals

`_preflight` does NOT merge `_state`. One place, one owner.

---

## Rule 12: Signal marked in both `input._state` and `target.data[0]._state`

After `_execTransition` succeeds:

```js
doc._state[signal] = '1';           // target — live document state
run_doc.input._state[signal] = '1'; // input — picked up by _preflight for DB write
```

Both updated. `_preflight` uses `input._state` to build the write payload.

---

## Rule 13: `_stripVirtual` placement

Inside `_handlers.create` and `_handlers.update`:
```
_preflight (validates including virtual fields)
  ↓
_stripVirtual (removes virtual from target.data[0])
  ↓
Adapter.write (clean target, no virtual fields)
```

Never before `_preflight` — validation needs virtual fields.
Never in `_handleSignal` — handlers own the strip.

---

## Rule 14: `_mergeInput` _state handling

```js
// clear same-dim signals from target before merging new ones
for (const sig of Object.keys(inputState)) {
  const dim = sig.split('.')[0];
  if (isNaN(dim)) continue;
  const prefix = dim + '.';
  for (const k of Object.keys(targetState)) {
    if (k.startsWith(prefix)) delete targetState[k];
  }
}
Object.assign(targetState, inputState);
```

Result: `target.data[0]._state` has one signal per dim — always the latest.

---

## Rule 15: DB response updates `target.data[0]`

After every adapter write:
```js
run_doc.target = { data: [_mergeRecord(pbResult)], meta: { updated: 1 } };
```

`_mergeRecord` converts PocketBase response → CW document format.
`target.data[0]` always reflects confirmed DB state after persist.



CW SideEffect Rules — What NOT to do
❌ Never call CW.controller on a run that child() already executed
js// WRONG
var updateRun = await run_doc.child({...}); // pipeline already ran
updateRun.target = { data: [rec] };
await CW.controller(updateRun);             // runs pipeline AGAIN → loop
child() is not a factory — it executes the full pipeline immediately. Calling CW.controller after is a double execution.

❌ Never set target after child()
js// WRONG
var updateRun = await run_doc.child({...});
updateRun.target = { data: [rec] };  // too late — pipeline already ran without it
Everything the child needs must be passed into child() upfront.

❌ Never pass rec by reference into a child when _state has pending signals
js// WRONG
var rec = run_doc.target.data[0];  // has "_state": {"0.0_1": ""}
await run_doc.child({ target: { data: [rec] } });  // child sees pending signal → loop
sideEffects fire before _state is marked "1". rec is a live reference — it carries the pending signal into the child.
js// CORRECT
await run_doc.child({
  target: { data: [Object.assign({}, rec, { _state: {} })] },
  input:  { _allowed_read: [...] },
  options: { render: false, internal: true },
});

❌ Never rely on publicDoctypes config list for schema-level behavior
js// WRONG
if (!(CW._config.publicDoctypes || []).includes(run_doc.target_doctype)) return;
Use schema flag instead — co-located, no separate config to maintain:
js// CORRECT
if (!CW.Schema?.[run_doc.target_doctype]?.is_public) return;

The general rule

A sideEffect receives run_doc at the moment _execTransition fires — before _state is marked complete. Any reference to run_doc.target.data[0] carries a pending signal. Always clone and clean _state before passing to any child.


Rule — CW.RUN_FIELDS as source of truth for run_doc field names
CW.RUN_FIELDS is derived automatically from the CW.run factory on boot:
js// in CW-url.js — fires once on load
const src     = CW.run.toString()
const matches = src.match(/(\w+)\s*:\s*op\.\w+/g) || []
CW.RUN_FIELDS = [...new Set(matches.map(m => m.split(':')[0].trim()))]
Any module that needs the canonical list of run_doc intent fields reads from CW.RUN_FIELDS — never hardcodes field names. Adding a field to the CW.run factory literal propagates automatically to all consumers.
The factory is the single source of truth. CW.RUN_FIELDS is its derived index.