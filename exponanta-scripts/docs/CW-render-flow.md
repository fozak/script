# CW Render Flow

## The two rendering paths

### Path A — CW._render (data-driven, doctype-aware)
Triggered by any run with `options.render = true`.

```
CW.run(op)
  → _resolveAll(op)
      → op.operation → operationToView → view name
      → _resolveViewComponent(doctype, view, container)
          1. Schema[doctype].view_components[view]  ← doctype-specific override
          2. _config.views[view]                    ← global default
          3. fallback { component: MainForm, container: main_container }
      → op.component, op.container resolved
  → controller(run_doc)
  → adapter fetches data → run_doc.target.data
  → CW._render(run_doc)
      → ReactDOM.render(ce(globalThis[component], { run_doc, data }), container_el)
```

**What drives what:**
- `operation` → `operationToView` → `view`
- `view` + `doctype` → `_resolveViewComponent` → `component` + `container`
- `component` must exist on `globalThis`
- `container` must exist as a DOM id

---

### Path B — direct ReactDOM.render (static, no doctype)
For shell components that are always present and not data-driven.

```
boot.js
  → read _config.views[view_name] → { component, container }
  → ReactDOM.render(ce(globalThis[component], {}), document.getElementById(container))
```

**What drives what:**
- `_config.views` entry → `component` + `container`
- No doctype, no run, no data
- Component manages its own state internally

---

## Which components use which path

| Component     | Path | Doctype-aware | Driven by         |
|---------------|------|---------------|-------------------|
| MainGrid      | A    | Yes           | run + schema      |
| MainForm      | A    | Yes           | run + schema      |
| MainChat      | A    | Yes           | run + schema      |
| NavBar        | B    | No            | direct boot mount |
| LeftPaneChat  | B    | No            | _config.views     |

---

## The disconnect you asked about

Path A components receive `run_doc` and `data` as props — they know the doctype,
the schema, the records. Everything is driven by the run.

Path B components receive nothing (or minimal props) — they have no doctype context.
They interact with the data layer only by calling `CW.searchGrid()`, `CW.run()` etc.
directly. They find their targets via `CW.runs` at call time, not via props.

**LeftPaneChat is Path B** — it has no doctype, no run_doc, no data.
It calls `CW.searchGrid(term)` which internally finds the last MainGrid run
and fires a child. The connection to the grid is through `CW.runs`, not props.

---

## Config entries by path

### Path A — _config.views (global defaults for _resolveViewComponent)
```json
"views": {
  "list": { "component": "MainGrid", "container": "main_container" },
  "form": { "component": "MainForm", "container": "main_container" },
  "chat": { "component": "MainChat", "container": "right_pane" }
}
```

### Path B — _config.views (static shell mounts, read directly by boot)
```json
"views": {
  "left_pane": { "component": "LeftPaneChat", "container": "left_pane" }
}
```

Same config section, different consumer.
Path A consumer: `_resolveViewComponent()`
Path B consumer: boot loop

---

## Boot loop (Path B mounts)

```javascript
const STATIC_VIEWS = ['left_pane', 'navbar']

for (const key of STATIC_VIEWS) {
  const { component, container } = CW._config.views[key] || {}
  if (!component || !container) continue
  const el = document.getElementById(container)
  if (!el) continue
  ReactDOM.render(ce(globalThis[component], {}), el)
}
```
