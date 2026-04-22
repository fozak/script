# CW UI Patterns

## Core Mental Model

Every visible UI element is a `run_doc` rendered into a named container.
Every user action is a `CW.run()` or `run_doc.child()` call.
No component owns its own data — all data flows through `run_doc`.

---

## Containers

Fixed set per page. Unused containers hidden via `:empty` CSS.

```
nav_container     — navbar (app-ui.js, always present)
main_container    — full-width single panel
threads_left      — col-md-3 left panel
threads_right     — col-md-9 right panel
toast_container   — notifications
```

---

## Components

| Component | Purpose | Triggered by |
|---|---|---|
| `MainGrid` | List of records | boot, row click back |
| `MainForm` | Single record edit/view | row click, New, FSM transition |
| `MainChat` | Conversation UI | AI toolbar button |
| `NavBar` | Auth + breadcrumbs + back/fwd | app-ui.js always |

---

## Resolution Order

For every `CW.run` — `component` and `container` resolved automatically:

```
1. op.component / op.container     — explicit (boot calls only)
2. schema.view_components[view]    — per-doctype override
3. CW._config.views[view]          — global default
4. { component: 'MainForm', container: fallback_container }  — framework fallback
```

Boot calls are the only place that sets `component`/`container` explicitly.
Everything else is schema-driven.

---

## Key Patterns

### 1. Single Panel

```javascript
CW.run({
  operation: 'select',
  target_doctype: 'Task',
  component: 'MainGrid',
  container: 'main_container',
  options: { render: true },
})
```

Row click → `run_doc.child({ view: 'form' })` → resolves to `MainForm` in `main_container`.
List replaced by form. Back button returns to list.

---

### 2. Two Panel

Schema:
```json
"view_components": {
  "list": { "component": "MainGrid", "container": "threads_left" },
  "form": { "component": "MainForm", "container": "threads_right" }
}
```

Boot:
```javascript
CW.run({
  operation: 'select',
  target_doctype: 'Channel',
  options: { render: true },
})
```

Grid renders left. Row click → form renders right. Grid never replaced.

---

### 3. Boot with First Record Open

```javascript
const grid = await CW.run({
  operation: 'select',
  target_doctype: 'Channel',
  options: { render: true },
})

if (grid.target?.data?.[0]) {
  await grid.child({
    operation: 'select',
    target_doctype: 'Channel',
    query: { where: { name: grid.target.data[0].name } },
    view: 'form',
    options: { render: true, boot: true },  // boot:true = render but skip nav stack
  })
}
```

---

### 4. Nested Chaining (Channel → Post)

```javascript
const channels = await CW.run({
  operation: 'select',
  target_doctype: 'Channel',
  options: { render: true },
})

const channel = await channels.child({
  operation: 'select',
  target_doctype: 'Channel',
  query: { where: { name: channels.target.data[0].name } },
  view: 'form',
  options: { render: true, boot: true },
})

const posts = await channel.child({
  operation: 'select',
  target_doctype: 'Post',
  query: { where: { parent: channel.target.data[0].name } },
  options: { render: true, boot: true },
})
```

Each level inherits `user` and `parent_run_id` from parent.
`parent_run_id` chain is the component tree.

---

### 5. FSM Transition from Form

```javascript
// Submit button in FormActions
run_doc.input._state = { '0.0_1': '' }
CW.controller(run_doc)
```

Signal fires `_handleSignal` → validates → `_execTransition` → sideEffects → adapter write.
`FormActions` reads available transitions from `_getFormButtons(run_doc)` — fully schema-driven.

---

### 6. Create Flow

```javascript
// New button in grid toolbar
await run_doc.child({
  operation: 'create',
  target_doctype: run_doc.target_doctype,
  view: 'form',
  options: { render: true },
})
```

Form opens empty. Field blur → `commitField` → `CW.controller` → auto-detects `create` vs `update` from presence of `name`.

---

### 7. In-Memory Form (no PB write)

Schema:
```json
{ "schema_name": "SignupForm", "in_memory": true }
```

SideEffect on transition consumes `run_doc.input` and `run_doc.target.data[0]`.
`no_copy: 1` fields (e.g. password) stay in `input` only — never merged into `target`, never persisted.

---

### 8. Navigation Stack

Only `render === true` + `component.startsWith('Main')` + `!boot` runs enter nav stack.
All internal child runs (Link lookups, select calls, field validation) are invisible to nav.

```
back button  → navigate('back')   → re-renders previous nav stack entry
forward      → navigate('forward')
breadcrumb   → navigateTo(runName) → truncates stack to that point
```

---

### 9. Field Hints

Static (schema):
```json
{ "fieldname": "description", "hint": "Be specific about the outcome" }
```

Dynamic (AI or sideEffect):
```javascript
run_doc.target.data[0].notes = { description: 'Consider mentioning timeline' }
CW._render(run_doc)
```

`FieldRenderer` renders `FieldHint` component after every field. Zero wiring per field.

---

### 10. AI Chat in Right Pane

```javascript
await run_doc.child({
  operation: 'create',
  target_doctype: 'AIChat',
  source_doctype: run_doc.target_doctype,  // context
  view: 'chat',
  options: { render: true },
})
```

`run_doc.input.messages` accumulates conversation.
AI response can execute `run_doc.child()` calls — agentic operations over current doctype.

---

## Not Yet Implemented (Priority Order)

### 1. Search / Filter UI in MainGrid
**Why first:** Grid is unusable at scale without it. Every other pattern depends on finding records.
**What's needed:** Filter bar component above grid, wired to `run_doc.query.where`. Schema `searchable_fields` declares which fields appear as filter options. Re-runs `CW.controller(run_doc)` on filter change.

### 2. New Button in MainGrid Toolbar
**Why second:** Create flow exists in CW but no UI entry point from grid. Users can't create records.
**What's needed:** Toolbar component above grid with New button. Calls `run_doc.child({ operation: 'create', view: 'form' })`. Schema `allow_create: 1` gates visibility.

### 3. FieldHint / notes wiring in FieldRenderer
**Why third:** Infrastructure is designed, one line to wire. Unlocks AI suggestions, validation hints, contextual help per field.
**What's needed:** `FieldHint` component + `doc.notes[fieldname]` read in `FieldRenderer`. One component, one line.

### 4. sibling_container config
**Why fourth:** Without it, two-panel layout requires explicit `view_components` in every doctype schema. With it, `threads_left` → `threads_right` routing is automatic for all doctypes.
**What's needed:** `CW._config.sibling_container` map + one line in `_resolveViewComponent` fallback.

### 5. Kanban / Board view (MainKanban component)
**Why fifth:** Linear/Frappe pattern — group records by status field, drag to transition. Schema declares `kanban_column_field`. Natural fit for Task, Channel membership stages, event RSVPs.
**What's needed:** `MainKanban` component + `view: 'kanban'` in `view_components` + drag handler calling FSM signal.
