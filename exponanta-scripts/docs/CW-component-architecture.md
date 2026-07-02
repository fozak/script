# CW Component Architecture

## Two categories of components

**Universal components** — driven by `CW._render`, receive `run_doc`, know nothing about specific doctypes. Live in `CW-ui.js`.

**Prebuilt modules** — self-contained ES bundles loaded lazily via `import()`, mount into a div, manage their own React tree. Built with esbuild, committed as `.js` files.

---

## Universal Components

### Signature

```javascript
const ComponentName = function({ run_doc, data }) { ... }
globalThis.ComponentName = ComponentName
```

- `run_doc` — canonical data carrier, everything is in here
- `data` — shorthand for `run_doc.target.data`, passed by `CW._render`
- Must be on `globalThis` so `CW._render` can resolve by string name

### The three universal components

| Component | View | Triggered by |
|-----------|------|--------------|
| `MainGrid` | List — renders `target.data` as table | `operation: select` |
| `MainForm` | Form — renders `target.data[0]` as fields | `operation: update/create` |
| `MainChat` | Chat — renders `target.data` as bubbles | `operation: select, view: chat` |

### How CW._render resolves them

```
CW.run(op)
  → _resolveAll → op.component = 'MainGrid'
  → controller → adapter → target.data filled
  → CW._render(run_doc)
      → globalThis[run_doc.component]
      → ReactDOM.render(ce(MainGrid, { run_doc, data }), container_el)
```

---

## FieldRenderer — Field Type Dispatch

`MainForm` iterates schema fields and calls `FieldRenderer` for each one.

### Signature

```javascript
const FieldRenderer = function({ field, run_doc }) { ... }
```

- `field` — schema field definition `{ fieldname, fieldtype, label, options, ... }`
- `run_doc` — full run context, same as parent `MainForm`

### Internal state

```javascript
const doc_        = run_doc.target?.data?.[0] || {}
const readOnly    = (doc_.docstatus ?? 0) !== 0 || !['update','create'].includes(run_doc.operation)
const initial     = doc_[field.fieldname]
const safeInitial = initial === null || initial === undefined
  ? (field.fieldtype === 'Check' ? 0 : '')
  : (field.fieldtype === 'Check' ? Number(initial) : initial)

const [prevName, setPrevName] = React.useState(doc_.name)
const [localVal, setLocalVal] = React.useState(safeInitial)

// reset localVal when record changes
if (prevName !== doc_.name) {
  setPrevName(doc_.name)
  if (prevName !== null) setLocalVal(safeInitial)
}
```

### Commit pattern — standard fields

```javascript
const commitField = (val) => {
  if (val === run_doc.target?.data?.[0]?.[field.fieldname]) return
  run_doc.input[field.fieldname] = val
  CW.controller(run_doc).catch(err => console.error('[CW]', err))
}

const onChange = (val) => {
  setLocalVal(val)
  clearTimeout(timerRef.current)
  timerRef.current = setTimeout(() => commitField(val), debounce)
}

const onBlur = (val) => {
  clearTimeout(timerRef.current)
  commitField(val)
}
```

### Dispatch order

Fields that manage themselves must come **before** the `readOnly` short-circuit:

```javascript
// 1. self-managed field components — handle readOnly internally
if (field.fieldtype === 'BlockNote')
  return ce(BlockNoteField, { field, run_doc, readOnly, timerRef, debounce })

if (field.fieldtype === 'Filepicker')
  return ce(Filepicker, { field, run_doc, readOnly })

if (field.fieldtype === 'Component')
  return ce(globalThis[field.options], { field, run_doc, readOnly })

// 2. layout fields
if (field.fieldtype === 'Section Break') ...
if (field.fieldtype === 'Column Break') return null

// 3. standard fields — all respect readOnly via element props
if (field.fieldtype === 'Check') ...
if (field.fieldtype === 'Select') ...
// ... etc
```

---

## Self-Managed Field Components

For field types that are too complex for inline rendering — external libraries,
their own React tree, async behavior. Pattern: thin wrapper in `CW-ui.js` +
prebuilt ES module.

### Naming convention

| Layer | Name |
|-------|------|
| `fieldtype` in schema | `BlockNote`, `Filepicker` |
| Component in `CW-ui.js` | `BlockNoteField`, `Filepicker` |
| Prebuilt module file | `editor.js`, `filepicker.js` |
| Source file | `editor.jsx`, `filepicker.jsx` |
| Public API | `mount({ run_doc, fieldname, ... })`, `unmount(run_doc)` |

### Wrapper component signature

```javascript
const Filepicker = function({ field, run_doc, readOnly }) {
  React.useEffect(() => {
    let alive = true
    import('./filepicker.js').then(({ mount }) => {
      if (!alive) return
      mount({ run_doc, fieldname: field.fieldname, readOnly })
    })
    return () => {
      alive = false
      import('./filepicker.js').then(({ unmount }) => unmount(run_doc))
    }
  }, [run_doc.name])  // remount only on record change

  return ce('div', { id: run_doc.name })
}
```

Key points:
- `id: run_doc.name` — container div the prebuilt module mounts into
- `[run_doc.name]` dependency — remount only when record changes, not on every render
- `alive` flag — prevents mount after component unmounts (async guard)
- cleanup calls `unmount(run_doc)` — module cleans up its own React root

### Prebuilt module API convention

```javascript
// mount — creates ReactDOM root in container, renders component
export function mount({ run_doc, fieldname, readOnly }) {
  const container = document.getElementById(run_doc.name)
  // ...
  const root = ReactDOM.createRoot(container)
  _roots.set(run_doc.name, root)
  root.render(<Component run_doc={run_doc} fieldname={fieldname} readOnly={readOnly} />)
}

// unmount — tears down React root
export function unmount(run_doc) {
  if (_roots.has(run_doc.name)) {
    _roots.get(run_doc.name).unmount()
    _roots.delete(run_doc.name)
  }
}
```

- `_roots` Map keyed by `run_doc.name` — one instance per record
- `mount` replaces existing root if called again on same record
- Both `mount` and `unmount` take `run_doc` — consistent with CW conventions

### Internal component — data access

Prebuilt components read directly from `run_doc`, never from props cache:

```javascript
function CWFilePicker({ run_doc, fieldname, readOnly }) {
  const doc    = run_doc.target?.data?.[0] || {}
  const pbBase = globalThis.CW?._config?.pb_url || ''

  const [files, setFiles] = useState(Array.isArray(doc[fieldname]) ? doc[fieldname] : [])
  // ...
}
```

- Initial state from `doc[fieldname]` — set once at mount
- State updates managed internally via `useState` — no re-mount needed after upload/remove
- Writes back via `run_doc.child()` — stays inside the CW run tree

### Build

```
source:  filepicker-src/filepicker.jsx
output:  filepicker.js  (commit this)
build:   node filepicker-src/build.mjs
```

---

## Shell Components — Direct Boot Mounts

Components that are always present, not data-driven, not rendered by `CW._render`.

### Examples

- `NavBar` — top navigation
- `LeftPaneChat` — search/chat sidebar

### Pattern

```javascript
// boot.js — direct mount, no CW.run involved
ReactDOM.render(ce(NavBar, { profile }), document.getElementById('nav_container'))
ReactDOM.render(ce(LeftPaneChat, {}),    document.getElementById('left_pane'))
```

These components interact with the data layer only by calling `CW.searchGrid()`,
`CW.run()` etc. directly. They find their targets via `CW.runs` at call time.

---

## Summary — which pattern for which case

| Use case | Pattern |
|----------|---------|
| Data list or form driven by a run | Universal component (`MainGrid`, `MainForm`) |
| Simple field input | Inline in `FieldRenderer` dispatch |
| Complex field — own library, async, own state | Self-managed field component + prebuilt module |
| Always-present shell UI | Direct boot mount |
