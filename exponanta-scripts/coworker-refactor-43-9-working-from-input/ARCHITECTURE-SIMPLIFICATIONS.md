# CW Architecture — Dramatic Simplifications

Compiled from architecture review session, April 2026.
Each item is a concrete change with before/after and what it eliminates.

---

## 1. child run for all in-UI navigation

**Current:** every navigation call uses top-level `CW.run()` with hardcoded
`component`, `container`, `context` manually threaded through.

**Simplified:** every navigation inside the UI tree uses `run_doc.child()`.
Only the boot call in `threads.html` uses top-level `CW.run()`.

```js
// before
CW.run({
  operation: 'select', target_doctype: 'Post',
  query: { where: { name: post.name } },
  view: 'read', component: 'PostDetail',
  container: 'threads_right', context: { channel: channelName },
  options: { render: true },
})

// after
run_doc.child({
  operation: 'select', target_doctype: 'Post',
  query: { where: { name: post.name } },
  options: { render: true },
})
```

**Eliminates:** manual `context` passing, hardcoded `component`, hardcoded
`container`, all `CW.run` calls inside components.

---

## 2. view → component → container resolved from schema

**Current:** `component` and `container` hardcoded in every navigation call.
`_resolveAll` only reads from `CW._config.views` global defaults.

**Simplified:** each doctype schema defines its own view mappings including
container. `_resolveAll` checks schema first, falls back to config defaults.

```js
// Post schema
view_components: {
  list: { component: 'ChannelFeed', container: 'threads_left'  },
  read: { component: 'PostDetail',  container: 'threads_right' },
  edit: { component: 'PostEditor',  container: 'threads_right' },
}

// Channel schema
view_components: {
  list: { component: 'ChannelList', container: 'threads_left' },
}
```

**Eliminates:** `component:` and `container:` from every navigation call.
`_resolveViewComponent` returns `{ component, container }` not just component.

---

## 3. operationToView drives view automatically

**Current:** `view: 'edit'` must be explicitly passed in create calls.

**Simplified:** `operationToView` maps operations to default views so callers
pass only what differs from the default.

```js
operationToView: {
  select: 'list',   // select many → list
  create: 'edit',   // create → edit  ← add this
  update: 'edit',   // update → edit
}
// select with query.where.name → 'form' (single record)
```

**Eliminates:** `view:` from most navigation calls. `operation` alone resolves
the full chain to component and container.

---

## 4. four named shortcuts on run_doc (pure derivatives)

**Current:** every call site spells out operation + target_doctype + query
+ options every time. 15-20 lines per navigation.

**Simplified:** four methods added to `run_doc` in the CW.run factory.
No new concepts — pure wrappers around `run_doc.child()`.

```js
run_doc.open(doctype, name)          // select one record → form/read view
run_doc.list(doctype, where)         // select many → list view
run_doc.new(doctype, input)          // create → edit view
run_doc.signal(doctype, name, key)   // FSM transition
```

```js
// before — 7 lines
run_doc.child({
  operation: 'select', target_doctype: 'Post',
  query: { where: { name: post.name } },
  view: 'read', component: 'PostDetail',
  container: 'threads_right',
  options: { render: true },
})

// after — 1 line
run_doc.open('Post', post.name)
```

**Eliminates:** 80% of boilerplate in every component's navigation handlers.

---

## 5. context carried on run_doc (one line fix)

**Current:** `context` passed in `CW.run(op)` but never copied onto `run_doc`
in the factory. Every component gets `run_doc.context = undefined`.

**Simplified:** one line in `CW.run` factory:

```js
context: op.context || {},
```

**Eliminates:** `context` workarounds, `input.parent` hacks, `channelName`
falling back to empty string causing Required validation failures.

Already implemented — one line, one fix.

---

## 6. input.parent as field default (not context)

**Current:** channel name passed as `context.channel` for domain data.
`context` should be UI navigation state, not business data.

**Simplified:** channel passed as a field default on `input`, consistent
with how all other field defaults work.

```js
run_doc.new('Post', { parent: channelName })
// PostEditor reads: run_doc.input?.parent || existing?.parent
```

**Eliminates:** `context.channel`, `run_doc.context?.channel` lookups,
the entire reason `context` was needed in threads.js.

---

## 7. row_renderer on doctype schema (from TanStack/AG Grid pattern)

**Current:** `ChannelList`, `ChannelFeed` are monolithic components that
know both how to lay out a list AND how to render each row. Navigation
logic mixed with rendering logic.

**Simplified:** schema declares `row_renderer` (parallel to `in_list_view`).
Generic list shell maps over records calling the row renderer.
Shell handles navigation. Row renderer handles visuals only.

```js
// Channel schema
row_renderer: 'ChannelRow'    // how one Channel looks in a list

// Post schema
row_renderer: 'PostRow'       // how one Post looks in ChannelFeed

// Comment schema
row_renderer: 'CommentBubble' // how one Comment looks in thread
```

```js
// Generic list shell — works for any doctype
const ListShell = ({ run_doc }) => {
  const schema  = CW.Schema[run_doc.target_doctype]
  const RowComp = globalThis[schema.row_renderer] || DefaultRow
  return run_doc.target.data.map(record =>
    ce(RowComp, { record, run_doc, onClick: () => run_doc.open(record.doctype, record.name) })
  )
}
```

**Eliminates:** `ChannelList` and `ChannelFeed` as separate navigation-aware
components. They become one `ListShell` + two row renderers (`ChannelRow`,
`PostRow`). Navigation is universal. Only visuals are specific.

---

## 8. BlockNote as a fieldtype (not a separate architecture)

**Current:** BlockNote lives outside CW's render pipeline. Separate React
tree, separate mount/unmount lifecycle, `_editors` Map, `getContent()`
polling, `bodyRef`, timing hacks.

**Simplified:** `body` field has `fieldtype: 'BlockNote'`. `FieldRenderer`
handles it like any other field. Edit view uses `BlockNoteEditor`.
Read view uses display resolver based on `post_type`.

```js
// Post schema field
{ fieldname: 'body', fieldtype: 'BlockNote', label: 'Body',
  interface: 'BlockNoteEditor',
  display: (doc) => ({
    text: 'TextRenderer', carousel: 'CarouselRenderer',
    video: 'VideoPlayer',
  })[doc.post_type] || 'TextRenderer'
}

// FieldRenderer — one new case
if (field.fieldtype === 'BlockNote') {
  if (readOnly) return ce(globalThis[field.display(doc)], { content: doc[field.fieldname] })
  return ce(BlockNoteField, { field, run_doc })  // writes to run_doc.input directly
}
```

**Eliminates:** `BlockNoteEditor` wrapper, `BlockNoteRenderer` wrapper,
`getEditor()` lazy loader, `_editorMod` cache, `bodyRef`, `getContent()`,
`_editors` Map, `useEffect` registration timing, 100ms poll,
`PostEditor` body state management.

`onChange` writes directly to `run_doc.input[fieldname]` — same as every
other field. `MainForm` saves it automatically.

---

## 9. PostEditor → MainForm (consequence of #8)

**Current:** `PostEditor` is a custom 150-line component duplicating
`MainForm` behavior (title, tags, body fields, save button, FSM buttons).

**Simplified:** once `body` is a `BlockNote` fieldtype, `PostEditor` is
just `MainForm` with Post schema. The only reason to keep a custom
`PostEditor` is the Tabler chat layout — but even that can be `MainForm`
with a custom card template.

**Eliminates:** `PostEditor` component entirely, or reduces it to a
layout wrapper with no business logic.

---

## 10. FSM views → view switch via _execTransition (already implemented)

**Current (before this session):** `editing` boolean in React state,
`setEditing(true/false)` scattered through components.

**Simplified:** FSM `_state.views` maps docstatus to view name.
`_execTransition` fires child run with resolved component automatically.

```js
// Post schema
_state: { '0': {
  views: { '0': 'edit', '1': 'read', '2': 'read' },
}}
```

**Eliminates:** `editing` state, `setEditing`, conditional `if (editing)`
render branching in components. View switch is a side effect of FSM
transition. React components are stateless about view mode.

Already implemented in `CW-run.js`.

---

## Summary table

| # | What changes | Lines eliminated (est.) | Complexity removed |
|---|---|---|---|
| 1 | child run everywhere | ~60 | manual context threading |
| 2 | schema view_components with container | ~40 | hardcoded component/container |
| 3 | operationToView auto-resolves view | ~20 | explicit view: in every call |
| 4 | open/list/new/signal shortcuts | ~80 | boilerplate per navigation |
| 5 | context on run_doc | 1 | validation failures |
| 6 | input.parent not context.channel | ~15 | context misuse |
| 7 | row_renderer in schema | ~100 | monolithic list components |
| 8 | BlockNote as fieldtype | ~120 | separate editor architecture |
| 9 | PostEditor → MainForm | ~120 | duplicate form logic |
| 10 | FSM views (done) | ~40 | editing state in React |
| | **Total** | **~596 lines** | |

---

## Implementation order

1. `channels-schemas.json` — add `view_components` with container, `row_renderer`
2. `CW-run.js` — `_resolveViewComponent` returns `{component, container}`,
   `_resolveAll` uses it, add `open/list/new/signal` on `run_doc`
3. `CW-ui.js` — add `BlockNote` case to `FieldRenderer`
4. `threads.js` — rewrite using `run_doc.child()` + shortcuts, remove
   `BlockNoteEditor`/`BlockNoteRenderer` wrappers, `PostEditor` → thin shell
5. `editor.jsx` — remove `_editors`, `getContent`, `useEffect` registration,
   add `onChange` param back (writes to ref, not state)
