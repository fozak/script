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
  "list": { "component": "ChannelFeed", "container": "threads_left" },
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
  <div class="col-md-3" id="threads_left"></div>
  <div class="col-md-9" id="threads_right"></div>
</div>
<div id="toast_container"></div>
```

Hide empty containers with CSS:

```css
#main_container:empty,
#threads_left:empty,
#threads_right:empty { display: none; }
```

### `CW._config.views` declares global defaults

```js
views: {
  list: { component: 'MainGrid', container: 'threads_left'  },
  form: { component: 'MainForm', container: 'threads_right' },
  read: { component: 'MainForm', container: 'threads_right' },
  edit: { component: 'MainForm', container: 'threads_right' },
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
