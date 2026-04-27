# CW Views & Containers

## Core Concept

Every page has a fixed set of named containers. Components render into containers.
Schema `view_components` declares which component goes into which container for each view.
Boot call determines which container the root component starts in.
Row click inherits context from the parent run's container via `_resolveViewComponent` fallback.

---

## Containers

All pages share the same universal set of containers:

```
nav_container     — navigation bar
main_container    — full-width single column (generic pages)
threads_left      — col-md-3 left panel (two-panel pages)
threads_right     — col-md-9 right panel (two-panel pages)
toast_container   — notifications
```

Unused containers are hidden via `:empty` CSS — no layout impact.

---

## Views

| View key | Triggered by | Default component |
|---|---|---|
| `list` | boot `select` | `MainGrid` |
| `form` | row click, `onNew` | `MainForm` |
| `read` | FSM transition to docstatus=1 | `MainForm` |
| `edit` | FSM transition to docstatus=0 | `MainForm` |
| `chat` | custom | `MainChat` |

`CW._config.views` defines global defaults. Schema `view_components` overrides per doctype.

---

## Resolution Order

`_resolveViewComponent(doctype, view, fallback_container)`:

1. Schema `view_components[view]` — most specific
2. `CW._config.views[view]` — global default
3. `{ component: 'MainForm', container: fallback_container || 'main_container' }` — framework fallback

`fallback_container` is `run_doc.container` — the container of the parent run (the grid).
This means form always opens in the same container as the grid that spawned it, unless schema overrides.

---

## Sibling Container (pending)

For two-panel layout where grid is in `threads_left` and form should open in `threads_right`,
add to `CW._config`:

```javascript
sibling_container: {
  'threads_left':   'threads_right',
  'main_container': 'main_container',
}
```

`_resolveViewComponent` fallback uses `sibling_container[fallback_container]` instead of `fallback_container` directly.
Grid in `threads_left` → form opens in `threads_right` automatically. No schema change per page.

---

## Schema view_components Pattern

```json
"view_components": {
  "list": { "component": "MainGrid",   "container": "threads_left"  },
  "form": { "component": "MainForm",   "container": "main_container" },
  "read": { "component": "PostDetail", "container": "threads_right" },
  "edit": { "component": "PostEditor", "container": "threads_right" }
}
```

- `list` — how this doctype appears in a grid
- `form` — generic open from row click (any page context)
- `read` — after publish/submit FSM transition
- `edit` — after restore/draft FSM transition

`form` should always point to `main_container` as the safe generic fallback.
`read`/`edit` are channel/app specific — can point to `threads_right`.

---

## Boot Call Pattern

Boot call explicitly sets `component` and `container` — overrides schema completely:

```javascript
// generic single-panel page
CW.run({
  operation:      'select',
  target_doctype: 'Post',
  component:      'MainGrid',
  container:      'main_container',
  options:        { render: true },
})

// two-panel page — grid in left, form resolves to right via sibling_container
CW.run({
  operation:      'select',
  target_doctype: 'Channel',
  component:      'MainGrid',
  container:      'threads_left',
  options:        { render: true },
})
```

---

## empty.html — Universal Page Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CW</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/css/tabler.min.css">
  <style>
    #main_container:empty,
    #threads_left:empty,
    #threads_right:empty  { display: none; }

    .threads-left  { height: 100vh; overflow-y: auto; border-right: 1px solid var(--tblr-border-color); }
    .threads-right { height: 100vh; overflow-y: auto; }
  </style>
</head>
<body class="antialiased">

<div id="nav_container"></div>

<div class="container-xl py-3">
  <div id="main_container"></div>
  <div class="row g-0">
    <div class="col-md-3 threads-left"  id="threads_left"></div>
    <div class="col-md-9 threads-right" id="threads_right"></div>
  </div>
</div>

<div id="toast_container"></div>

<script src="https://cdn.jsdelivr.net/npm/pocketbase@latest/dist/pocketbase.umd.js"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/js/tabler.min.js"></script>

<script type="module" src="index.js"></script>
<script type="module" src="CW-ui.js"></script>
<script type="module" src="app-ui.js"></script>

<script type="module">
  async function waitForBoot() {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (globalThis.CW?._booted) { clearInterval(check); resolve() }
      }, 100)
    })
  }

  window.addEventListener('load', async () => {
    await waitForBoot()

    // ── boot call here ──────────────────────────────────────
    // single panel:
    // CW.run({ operation: 'select', target_doctype: 'Task',
    //          component: 'MainGrid', container: 'main_container',
    //          options: { render: true } })

    // two panel:
    // CW.run({ operation: 'select', target_doctype: 'Channel',
    //          component: 'MainGrid', container: 'threads_left',
    //          options: { render: true } })
  })
</script>

</body>
</html>
```
