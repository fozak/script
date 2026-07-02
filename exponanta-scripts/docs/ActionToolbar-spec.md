NOT ALL BELOW IMPLEMENTED

Updated spec for what's implemented:
ActionToolbar for Grid — implemented:

[+ New] — creates new record in form view
[🔍 Search or filter…] — smart search input with field:value syntax, debounced, Enter/Escape support, × clear button
[≡ List] / [⊞ Card] — view mode toggle

Replaced the original spec items:

[Filters ▾] + chips row → replaced by smart search input
[Sort ▾] → column header click sort (existing, unchanged)
[Display ▾] → not implemented
Layout icons (≡ List ▾, ⊞ Board) → simplified to list/card toggle only





# ActionToolbar — Specification

## Overview

`ActionToolbar` is a universal context-aware toolbar that renders above
`right_pane` content. It adapts to whatever is currently rendered — grid or
form — without knowing doctype-specific details.

It is a standalone React component in `CW-ui.js`, mounted permanently above
`right_pane`. It reads `CW.current_run` to determine context.

---

## Layout

### Grid context

```
Row 1: [+ New]  [Filters ▾]  [Sort ▾]  [Display ▾]  ···  [≡ List ▾]  [⊞ Board]
Row 2: [status:Open ×]  [priority:High ×]  [Clear all]   ← only when filters active
```

### Form context

```
Row 1: [← List]  {doctype} › {title}
```

---

## What ActionToolbar owns vs what it does NOT own

### ActionToolbar OWNS:
- `[+ New]` — fires `gridRun.child({ operation: 'create', ... })`
- `[← List]` — fires `navigate('back')` or re-renders last MainGrid run
- Breadcrumb — `{doctype} › {title}` derived from current run
- `[Filters ▾]` — opens filter popover, manages active filter chips
- `[Sort ▾]` — opens sort popover
- `[Display ▾]` — opens display options popover (show/hide columns)
- View switcher icons — `≡ List` / `⊞ Board` / `📅 Calendar`
- Active filter chips row (Row 2) — shown only when filters applied
- `[Clear all]` — clears all active filters

### ActionToolbar does NOT own:
- `FormActions` buttons — `[Save]` `[Submit]` `[•••]` stay inside `MainForm`
  card-header, driven by FSM schema `primary` flags. Not moved, not duplicated.
- FSM transition pills (Row 2 for form) — **not implemented**. Reserved for
  future phase when inline property editing is added.
- `SearchBar` — lives in navbar, not in ActionToolbar.

---

## FSM Buttons — Unchanged

FSM action buttons (`[Save]`, `[Submit]`, `[Sign Up]` etc.) and the `•••`
dropdown are defined in schema `_state[dim].primary` and rendered by
`FormActions` inside `MainForm` card-header. `ActionToolbar` never touches them.

The `primary` flag in schema is the single source of truth for which button
is `btn-primary`. This is not changed.

```json
"primary": { "0_1": true, "1_2": true }
```

---

## NOT Implemented (reserved for future)

**FSM state as inline pills (Row 2 for form):**
```
[Status: Draft ▾]  [Priority: High ▾]  [Assignee ▾]
```
These would allow inline property editing without opening the full form field.
Not implemented in this phase. `FormActions` buttons are sufficient for now.

**Bulk selection action bar:**
```
[Select all]  [Delete (3)]  [Bulk Edit]
```
Slides up from bottom when rows are selected. Not implemented in this phase.

**Saved views:**
```
[+ Save view]  [My views ▾]
```
Not implemented in this phase.

---

## Component mounting

`ActionToolbar` mounts in `app.html` above `right_pane`:

```html
<div id="action_toolbar_container"></div>
<div id="right_pane"></div>
```

It is rendered once on boot and re-renders reactively on `coworker:state:change`
event — same event that updates breadcrumbs and nav buttons.

```javascript
// in app-ui.js
CW._render({
  component:  'ActionToolbar',
  container:  'action_toolbar_container',
  options:    { render: true }
})
```

---

## Context detection

`ActionToolbar` reads `CW.current_run` to determine what's in `right_pane`:

```javascript
const run     = CW.runs[CW.current_run]
const isGrid  = run?.component === 'MainGrid'
const isForm  = run?.component === 'MainForm'
const isOther = !isGrid && !isForm   // custom components — render nothing
```

When `isOther` — toolbar renders empty/hidden. Custom components own their own
chrome.

---

## Grid toolbar — element detail

| Element | Position | Behavior |
|---------|----------|----------|
| `[+ New]` | Left | `gridRun.child({ operation: 'create', view: 'form', container: 'right_pane' })` |
| `[Filters ▾]` | Left | Opens popover with schema `in_list_view` fields as filter options |
| `[Sort ▾]` | Left | Opens popover with schema `in_list_view` fields as sort options |
| `[Display ▾]` | Left | Opens popover to toggle column visibility |
| Active chips | Left, Row 2 | Each chip = one active filter. `×` removes it. |
| `[Clear all]` | Left, Row 2 | Clears all filters, re-fires unfiltered select |
| View switcher | Right | `≡ List` / `⊞ Board` — fires child run with new view |

---

## Form toolbar — element detail

| Element | Position | Behavior |
|---------|----------|----------|
| `[← List]` | Left | `navigate('back')` — returns to last MainGrid in run history |
| Breadcrumb | Left, after `←` | `{doctype} › {title}` — title from `schema.title_field` |

`FormActions` (`[Save]` `[Submit]` `[•••]`) remain in `MainForm` card-header.
They are NOT moved to `ActionToolbar`.

---

## Filter chips behavior

When user applies a filter via `[Filters ▾]`:
1. Filter added to local React state as `{ field, value, label }`
2. Chip rendered in Row 2
3. Child run fired: `gridRun.child({ query: { filter: builtFilter } })`
4. Row 2 visible only when at least one chip active
5. `×` on chip removes filter, re-fires child run with remaining filters
6. `[Clear all]` removes all chips, re-fires with no filter

Filter string built from chips: `data.status = "Open" && data.priority = "High"`

---

## Tabler classes — reference

```
toolbar row:        d-flex align-items-center gap-2 px-3 py-2 border-bottom
chips row:          d-flex flex-wrap align-items-center gap-1 px-3 pb-2
chip:               badge bg-blue-lt text-blue d-flex align-items-center gap-1
chip × button:      btn-close btn-close-sm ms-1
primary button:     btn btn-primary btn-sm
ghost button:       btn btn-ghost-secondary btn-sm
dropdown toggle:    btn btn-ghost-secondary btn-sm dropdown-toggle
view icon active:   btn btn-secondary btn-sm
view icon inactive: btn btn-ghost-secondary btn-sm
breadcrumb text:    text-muted small
```

---

## Implementation order

1. `ActionToolbar` shell — mounts, reads `current_run`, renders grid vs form context
2. Grid: `[+ New]` and `[← List]` / breadcrumb for form
3. Grid: `[Filters ▾]` with chip row
4. Grid: `[Sort ▾]`
5. Grid: View switcher
6. Grid: `[Display ▾]`
