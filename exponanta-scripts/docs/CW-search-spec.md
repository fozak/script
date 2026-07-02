# CW Search — Specification

## Overview

`searchGrid` is a universal search/navigation utility in `CW-utils.js`. It parses
a search term for intent, routes to the correct doctype and grid, and fires the
appropriate `CW.run` call. `SearchBar` is the React UI component in `CW-ui.js`
that calls `searchGridDebounced`.

---

## Intent Parsing Rules

| Input | Behavior |
|-------|----------|
| `""` | Restore current grid, no filter |
| `"test"` | Filter current grid by `title_field` |
| `"task"` | Switch to Task list, no filter |
| `"task test"` | Switch to Task list, filter by "test" |

**Doctype detection** — first word matched case-insensitively against
`Object.keys(CW.Schema)`. If matched → doctype intent. If not → filter term
against current grid's doctype.

**Same doctype as current grid** → `gridRun.child(op)` — rerenders in place.

**Different doctype** → `CW.run(op)` — new grid, replaces current container.

---

## Implementation — `CW-utils.js`

```javascript
function searchGrid(term) {
  const gridRun = CW.runs[CW.current_run]?.component === 'MainGrid'
    ? CW.runs[CW.current_run]
    : Object.values(CW.runs).findLast(r => r.component === 'MainGrid' && r.status === 'completed')

  const parts      = (term || '').trim().split(/\s+/)
  const firstWord  = parts[0].toLowerCase()
  const matchedDt  = Object.keys(CW.Schema || {}).find(dt => dt.toLowerCase() === firstWord)
  const doctype    = matchedDt || gridRun?.target_doctype
  if (!doctype) return

  const filterTerm = matchedDt ? parts.slice(1).join(' ').trim() : (term || '').trim()
  const schema     = CW.Schema?.[doctype]
  const field      = schema?.title_field || 'name'
  const filter     = filterTerm ? `data.${field} ~ "${filterTerm}"` : ''
  const container  = gridRun?.container || 'main_container'

  const op = {
    operation:      'select',
    target_doctype: doctype,
    query:          { filter },
    component:      'MainGrid',
    container,
    options:        { render: true }
  }

  if (gridRun && gridRun.target_doctype === doctype) return gridRun.child(op)
  return CW.run(op)
}

const _profile     = CW._config?.fieldInteractionConfig?.activeProfile ?? 'default'
const _searchDelay = CW._config?.fieldInteractionConfig?.profiles?.[_profile]?.onChange?.debounce
  ?? CW._config?.fieldInteractionConfig?.triggers?.onChange?.debounce
  ?? 300

const searchGridDebounced = debounce(searchGrid, _searchDelay)
```

Assigned at bottom of `CW-utils.js`:

```javascript
CW.searchGrid          = searchGrid
CW.searchGridDebounced = searchGridDebounced

Object.assign(globalThis, { ..., searchGrid, searchGridDebounced })
```

---

## `SearchBar` — `CW-ui.js`

Stateless React component. Calls `CW.searchGridDebounced` on every keystroke.
Debounce delay from `CW._config.fieldInteractionConfig` — same config as
`FieldRenderer`. No knowledge of runs, doctypes, or containers.

```javascript
const SearchBar = function() {
  const [term, setTerm] = React.useState('')

  return ce('input', {
    className:   'form-control form-control-sm',
    placeholder: 'Search...',
    value:       term,
    onChange:    e => {
      setTerm(e.target.value)
      CW.searchGridDebounced(e.target.value)
    }
  })
}

globalThis.SearchBar = SearchBar
```

---

## Navbar Integration — `app-ui.js`

`SearchBar` mounts in the navbar `ms-auto` section, hidden on mobile:

```javascript
ce('div', { className: 'd-none d-md-block', style: { width: '200px' } },
  ce(SearchBar, {})
)
```

---

## Grid Run Resolution

`searchGrid` resolves the current grid run via:

1. `CW.current_run` — if it points to a `MainGrid` component, use it
2. Fallback — `findLast` across `CW.runs` for most recent completed `MainGrid`

`CW.current_run` is set by `_updateFromRun` in `CW-state.js` whenever a
`Main*` component renders. It reliably points to the last navigation run.

---

## PocketBase Filter Format

All search filters use `data.` prefix — fields are stored in the JSON `data`
column in PocketBase:

```
data.subject ~ "test"        ← Task title_field = subject
data.project_name ~ "toyota" ← Project title_field = project_name
data.channel_name ~ "expo"   ← Channel title_field = channel_name
```

Empty filter `""` returns all records — restores unfiltered grid.

---

## Debounce

Delay read from `CW._config.fieldInteractionConfig`:

```javascript
// active profile → onChange debounce
profiles[activeProfile].onChange.debounce  // primary
triggers.onChange.debounce                 // fallback
300                                        // default
```

Same config as `FieldRenderer` field input debounce. Consistent across all
user input in CW.

---

## Tested Cases

- `""` → child run, no filter, same doctype
- `"test"` → child run, `data.subject ~ "test"`
- `"task"` → child run (same doctype), no filter
- `"task test"` → child run, `data.subject ~ "test"`
- `"project"` → new root `CW.run`, `Project` doctype, no filter
- `"project toyota"` → new root `CW.run`, `data.project_name ~ "toyota"`
- `"TASK"` case insensitive → child run, `Task` doctype
- `"unknown xyz"` → child run, filter current doctype
- No grid on screen → returns `undefined`, no run fired
- Component and container always `MainGrid` + current grid's container

---

## Limitations

- Searches only `title_field` — no multi-field search
- No search across multiple doctypes simultaneously
- No result preview dropdown — fires run immediately on debounce
- `container` defaults to `main_container` when no grid found — may render
  in wrong container on pages without `main_container`
