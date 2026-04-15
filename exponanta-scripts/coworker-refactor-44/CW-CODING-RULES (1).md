# CW Component & Framework Coding Rules v2

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

```js
// app.html — entire boot
CW.run({
  operation:      'select',
  target_doctype: 'Channel',
  options:        { render: true },
})
```

Schema resolves component, container, and view automatically from `view_components`.

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

### row_renderer — schema owns row display

```json
"row_renderer": "PostRow"
```

### explicit_edit_intent — schema declares edit pattern

```json
"explicit_edit_intent": 1
```

Doctypes with rich composer fields (BlockNote) set this to 1.
Inline forms (Task, Role) leave it unset (defaults to 0).

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
| `top_parent` in schema fields array | declare as `Link` with `options: "<SameDoctype>"` |
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

Never declare a `Link` without declaring the matching `Table` on the other side.

### Never use `parent` as a schema field name

`parent` is a reserved system field — the immediate parent FK used by `Table` fieldtype fetching. Never declare a field named `parent` in any schema fields array.

Use explicit named Link fields instead:

```
Wrong:  { "fieldname": "parent",  "fieldtype": "Data", "label": "Channel" }
Right:  { "fieldname": "channel", "fieldtype": "Link", "options": "Channel" }
```

Exception: `Relationship` doctype uses `parent`/`parenttype`/`parentfield` by Frappe convention.

### `top_parent` — declare as Link in each schema

`top_parent` is a system field set automatically by `systemFields.onCreate`. It always points to the same doctype as the record itself (enforced by the `p.doctype !== run_doc.target_doctype` check).

Declare it in each schema that uses hierarchical nesting as a `Link` with `options` set to that doctype:

```json
{
  "fieldname": "top_parent",
  "fieldtype": "Link",
  "options": "Post",
  "hidden": 1,
  "read_only": 1
}
```

Never declare `top_parent` as `Data`. Never omit it from schemas that have self-referential hierarchy.

### Root context field — always a Link to the root doctype

Every child doctype in a hierarchy must have a Link field pointing to the root doctype. This enables single-query fetching of all content under a root without traversal.

```
Post.channel  → always Channel.name regardless of docsubtype depth
Task.project  → always Project.name regardless of task nesting depth
```

Query pattern:
```js
// all content in a channel (posts, comments, likes at any depth)
where doctype='Post' AND channel='channel.name'

// subtree under a post (comments, likes, reactions)
where doctype='Post' AND top_parent='post.name'
```

### Three relationship fieldtypes — no others

| Fieldtype | Direction | Use case |
|---|---|---|
| `Link` | child → parent | 1-1 named reference, stored in child |
| `Table` | parent → children | 1-many, same or different doctype, FK = `parent` |
| `Relationship Panel` | many → many | junction doctype, mixed doctypes |

Never use `Data` as an implicit untyped link. If it's a reference to another record, use `Link`.

---

## 6. DON'Ts summary

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

---

## 7. Quick reference

| Action | How |
|---|---|
| Boot | `CW.run({ operation, target_doctype, options:{ render:true } })` |
| Navigate | `run_doc.child({ operation, target_doctype, query, options:{ render:true } })` |
| Fetch data | `run_doc.child({ operation:'select', ..., options:{ render:false } })` |
| Create | `run_doc.child({ operation:'create', input:{...}, options:{ render:false } })` |
| FSM signal | `run_doc.child({ operation:'update', input:{ _state:{ key:'' } }, options:{ render:false, internal:true } })` |
| Read data | `run_doc.target?.data` |
| Read one record | `run_doc.target?.data?.[0]` |
| Access parent record | `CW.runs[run_doc.parent_run_id]?.target?.data?.[0]` |
| Local UI state only | `React.useState(...)` |
| Document state | Never in React — always in `run_doc` |
| Secondary classification | `docsubtype` field in schema |
