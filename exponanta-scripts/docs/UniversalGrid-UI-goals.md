This is NOT final design


# UniversalGrid — UI Goals (Linear-Inspired)

## Design Principles

Inspired by Linear's issue list. The goal is a dense, keyboard-friendly, action-on-demand grid that never clutters the view with always-visible controls.

**Core rules:**
- Actions are revealed on demand — never always visible
- Modals only for destructive confirmations (delete, submit)
- Top toolbar always — never bottom (Frappe legacy pattern rejected)
- Schema owns what columns appear — component never filters
- Density over decoration — minimal padding, maximum information

---

## Toolbar (Top, Always Visible)

```
[+ New]  [🔍 Search Task...]                          [≡ ⊞]
```

**MainGrid:**
- `+ New` — creates new record, navigates to form
- Search input — `_parseSmartSearch` driven, debounced, supports `field:value` syntax
- View toggle — list / card (not yet implemented)

**Table mode:**
- `+ Add` — inline row add (not yet implemented)
- No search (scoped by parent, always small set)

**Relationship mode:**
- `[Type ▼]` — pick relationship type first
- `[🔍 Search {Doctype}...]` — search for record to link
- `[+ Add]` — disabled until both type and record selected

---

## Bulk Bar (Replaces Toolbar When Rows Selected)

```
[✕ 3 selected]   [Submit for Review]   [Approve]   [Delete]
```

- Replaces toolbar entirely when `selected.length > 0`
- `✕ N selected` — clears selection on click
- FSM buttons — intersection of available actions across all selected rows (common signals only)
- `Delete` — always present, hard delete via adapter
- After any bulk action — selection cleared, grid refetched

**Not yet implemented:** FSM signal buttons in bulk bar (only Delete currently wired)

---

## Row — Default State

```
○  Test Relationship Task   taskt1paoyiirln   0   Open   Medium   0   {"0":1...}
```

- Circle `○` on left — placeholder for checkbox
- All columns from `target.data[0]` keys
- Title column (`title_field`) is bold, clickable → opens form
- No action buttons visible
- Dense — minimal row height

---

## Row — On Hover

```
☑  Test Relationship Task   taskt1paoyiirln   0   Open   Medium   0   {"0":1...}   [Submit for Review]  [⋯]
```

- Circle → checkbox on hover
- FSM `outside` buttons appear on right — primary transitions only
- `[⋯]` menu appears — contains `menu` buttons (non-primary FSM + Edit + Delete)
- Clicking title still opens form
- Clicking checkbox toggles selection

**What makes this Linear-like:**
- Buttons are invisible until needed — no visual noise on dense lists
- One-click FSM action without opening the form
- Checkbox appears only when you hover — signals intent to select

---

## Row — Selected State

```
☑  Test Relationship Task   taskt1paoyiirln   0   Open   Medium   0   {"0":1...}
```
*(row highlighted, checkbox stays visible even without hover)*

- `table-active` class — Tabler highlight
- Checkbox always visible when selected
- Toolbar replaced by bulk bar

---

## Action Panel Goals Summary

| Location | When | What |
|---|---|---|
| Toolbar | Always | `+ New`, Search, View toggle |
| Bulk bar | Selection > 0 | Clear, common FSM buttons, Delete |
| Row hover — right | Hovered | `outside` FSM buttons + `[⋯]` |
| Row hover — left | Hovered or selected | Checkbox |
| `[⋯]` menu | Hovered | `menu` FSM buttons, Delete single row |

---

## FSM Button Placement Logic

Driven entirely by schema `primary` config on each dim:

```json
"_state": {
  "1": {
    "primary": { "0_1": true, "1_2": true }
  }
}
```

- `primary: true` → `outside` → visible on row hover
- no `primary` → `menu` → inside `[⋯]` dropdown
- Multiple primary buttons in one object — no duplicate keys

`_getFormButtons(run_doc, row)` returns `{ outside, menu }`. Grid uses `outside` for hover buttons. `FormActions` in `MainForm` uses both.

---

## What Is Not Yet Implemented

| Feature | Priority | Notes |
|---|---|---|
| `[⋯]` per-row dropdown | High | `menu` buttons + single Delete |
| Bulk FSM signal buttons | High | Common signals across selection |
| Sort by column click | Medium | Mutate `run_doc.query.sort`, `refetchGrid` |
| Pagination | Medium | `run_doc.query.page`, `refetchGrid` |
| Card view | Low | 1 card per row, FSM buttons at bottom right |
| View toggle (list/card) | Low | Separate toolbar, default list |
| `Table` mode inline add | Medium | `reqd` fields inline row, save → child create |
| `Relationship` mode | Medium | 2-step: pick type → pick record → add |
| Saved filters | Future | `SavedFilter` doctype with FSM, not virtual |
| Batch resolve link titles | Future | Replace init fetch per Link field |
