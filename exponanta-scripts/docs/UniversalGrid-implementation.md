v2 

// ============================================================
// GridToolbar
// ============================================================

const GridToolbar = function ({ run_doc, field }) {
  const mode     = !field ? 'MainGrid' : field.fieldtype === 'Table' ? 'Table' : 'Relationship';
  const doctype  = mode === 'MainGrid' ? (run_doc.target_doctype || run_doc.source_doctype) : field.options;
  const schema   = CW.Schema?.[doctype] || {};
  const rows     = run_doc.target?.data || [];
  const selected = CW.getGridSelected(run_doc);

  const [searchVal, setSearchVal] = React.useState(run_doc.search || '');

  if (selected.length > 0) {
    const selectedDocs  = rows.filter(r => selected.includes(r.name));
    const allSignalSets = selectedDocs.map(doc => {
      const btns = CW._getFormButtons(run_doc, doc);
      return [...btns.outside, ...btns.menu].filter(b => b.type === 'fsm');
    });
    const commonBtns = allSignalSets.length === 0 ? [] :
      allSignalSets[0].filter(b =>
        allSignalSets.every(set => set.some(s => s.signal === b.signal))
      );

    return ce('div', { className: 'd-flex align-items-center gap-2 px-3 py-2 border-bottom' },
      ce('button', {
        className: 'btn btn-sm btn-ghost-secondary',
        onClick:   () => CW.clearSelected(run_doc)
      }, selected.length + ' selected  ×'),
      commonBtns.map(btn =>
        ce('button', {
          key:       btn.signal,
          className: 'btn btn-sm btn-secondary',
          onClick:   async () => {
            if (btn.confirm && !window.confirm(btn.confirm)) return;
            for (const name of selected) {
              await run_doc.child({
                operation:      'update',
                target_doctype: doctype,
                query:          { where: { name } },
                input:          { _state: { [btn.signal]: '' } },
                options:        { render: false, internal: true },
              });
            }
            CW.clearSelected(run_doc);
            CW.refetchGrid(run_doc);
          }
        }, btn.label)
      )
    );
  }

  return ce('div', { className: 'd-flex align-items-center gap-2 px-3 py-2 border-bottom' },
    mode === 'MainGrid' && ce('button', {
      className: 'btn btn-sm btn-primary',
      onClick:   () => run_doc.child({ operation: 'create', target_doctype: doctype, options: { render: true } })
    }, '+ New'),
    mode === 'MainGrid' && ce('input', {
      type:        'text',
      className:   'form-control form-control-sm ms-2',
      placeholder: 'Search ' + (schema.label || doctype) + '...',
      value:       searchVal,
      onChange:    e => { setSearchVal(e.target.value); run_doc.search = e.target.value; CW.searchDebounced(run_doc); }
    })
  );
};


//===========================Grid===============================

const UniversalGrid = function ({ run_doc, field }) {

   if (!run_doc) return null;
  const mode = !field
    ? "MainGrid"
    : field.fieldtype === "Table"
      ? "Table"
      : "Relationship";
  const doctype =
    mode === "MainGrid"
      ? run_doc.target_doctype || run_doc.source_doctype
      : field.options;
  const schema = CW.Schema?.[doctype] || {};
  const titleField = schema.title_field || "name";
  const rows = run_doc.target?.data || [];
  const columns = Object.keys(rows[0] || {});
  const selected = CW.getGridSelected(run_doc);
  const allChecked = selected.length === rows.length && rows.length > 0;

  const [hoveredRow, setHoveredRow] = React.useState(null);

  const cv = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const renderRow = (row) => {
    const isHovered = hoveredRow === row.name;
    const isSelected = selected.includes(row.name);
    const btns =
      isHovered && CW._getFormButtons
        ? CW._getFormButtons(run_doc, row)?.outside || []
        : [];

    return ce(
      "tr",
      {
        key: row.name,
        className: isSelected ? "table-active" : "",
        onMouseEnter: () => setHoveredRow(row.name),
        onMouseLeave: () => setHoveredRow(null),
      },
      ce(
        "td",
        {
          key: "__chk",
          style: { width: 36 },
          onClick: (e) => {
            e.stopPropagation();
            CW.toggleSelected(run_doc, row.name);
          },
        },
        isHovered || isSelected
          ? ce("input", {
              type: "checkbox",
              className: "form-check-input",
              checked: isSelected,
              readOnly: true,
            })
          : ce("span", { className: "cw-grid-circle" }),
      ),
      columns.map((k) =>
        ce(
          "td",
          {
            key: k,
            className: k === titleField ? "fw-medium" : "text-secondary",
            style: k === titleField ? { cursor: "pointer" } : {},
            onClick:
              k === titleField
                ? () =>
                    run_doc.child({
                      operation: "update",
                      target_doctype: doctype,
                      query: { where: { name: row.name } },
                      view: "form",
                      options: { render: true },
                    })
                : undefined,
          },
          cv(row[k]),
        ),
      ),
      ce(
        "td",
        { key: "__act", className: "text-end pe-3", style: { width: 160 } },
        btns.map((btn) =>
          ce(
            "button",
            {
              key: btn.signal,
              className: "btn btn-sm btn-ghost-secondary ms-1",
              onClick: async (e) => {
                e.stopPropagation();
                await run_doc.child({
                  operation: "update",
                  target_doctype: doctype,
                  query: { where: { name: row.name } },
                  input: { _state: { [btn.signal]: "" } },
                  options: { render: false, internal: true },
                });
                CW.refetchGrid(run_doc);
              },
            },
            btn.label,
          ),
        ),
      ),
    );
  };

  return ce(
    "div",
    { className: "cw-universal-grid" },
    ce(GridToolbar, { run_doc, field }),
    ce(
      "div",
      { className: "table-responsive" },
      ce(
        "table",
        { className: "table table-hover table-sm mb-0" },
        ce(
          "thead",
          null,
          ce(
            "tr",
            null,
            ce(
              "th",
              {
                key: "__chk",
                style: { width: 36 },
                onClick: () => CW.toggleAllSelected(run_doc),
              },
              allChecked
                ? ce("input", {
                    type: "checkbox",
                    className: "form-check-input",
                    checked: true,
                    readOnly: true,
                  })
                : null,
            ),
            columns.map((k) =>
              ce(
                "th",
                { key: k },
                schema.fields?.find((f) => f.fieldname === k)?.label || k,
              ),
            ),
            ce("th", { key: "__act", style: { width: 160 } }),
          ),
        ),
        ce("tbody", null, rows.map(renderRow)),
      ),
    ),
    rows.length === 0 &&
      ce("div", { className: "text-center text-secondary py-5" }, "No records"),
  );
};

globalThis.UniversalGrid = UniversalGrid;
console.log("✅ UniversalGrid loaded");





# UniversalGrid — Implementation Document

## What Was Built

`UniversalGrid` is a single React component that replaces `MainGrid`, `RelationshipPanel`, and the static Table field renderer in `FieldRenderer`. It handles three modes from one implementation.

---

## Mode Resolution

```javascript
const mode = !field ? 'MainGrid'
  : field.fieldtype === 'Table' ? 'Table'
  : 'Relationship';
```

Mode is derived from the `field` prop — absent means `MainGrid`, present means `Table` or `Relationship`. Naming is 1:1 with fieldtype names and component names in `CW._config`.

---

## What Is Used

### From `run_doc`
- `run_doc.target.data` — single source of truth for rows and columns
- `run_doc.query.where.name.in` — selection state (query builder)
- `run_doc.target_doctype` — doctype for schema lookup and child runs
- `run_doc.child()` — all operations (open, create, delete, FSM signal)
- `run_doc.component`, `run_doc.container` — for `refetchGrid`

### From `CW`
- `CW.Schema[doctype]` — labels for column headers, `title_field`
- `CW._getStateDef(doctype)` — not used directly in grid (used by `_getFormButtons`)
- `CW._getFormButtons(run_doc, row)` — FSM hover buttons per row
- `CW.getGridSelected(run_doc)` — current selection array
- `CW.toggleSelected(run_doc, name)` — checkbox click
- `CW.toggleAllSelected(run_doc)` — header checkbox
- `CW.clearSelected(run_doc)` — after bulk action
- `CW.refetchGrid(run_doc)` — fires new child select after mutation
- `CW.searchGridDebounced(term)` — search input handler

---

## Column Derivation

Columns come from `Object.keys(rows[0] || {})` — actual keys present in `target.data[0]`. No schema filtering. No `in_list_view` logic in the component. Schema controls what's in `target.data` via field projection in `CW._handlers.select`. Component renders what it receives.

Schema is used only for column header labels:
```javascript
schema.fields?.find(f => f.fieldname === k)?.label || k
```

---

## Cell Defense

All values pass through `cv()` before reaching React:

```javascript
const cv = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};
```

Prevents React crash on object values (`_state`, arrays, nested JSON).

---

## Selection as Query Builder

Row selection builds `run_doc.query.where.name.in` directly — not separate UI state. This is the pending query for bulk actions. `CW._render(run_doc)` re-renders checkboxes from query state. No React state for selection.

```javascript
// after toggleSelected
run_doc.query.where = { name: { in: ['task001', 'task002'] } }
```

When bulk action fires — loop child runs per selected name, then `clearSelected` + `refetchGrid`.

---

## Hover Actions — How They Appear (Task Schema Example)

Task schema defines `_state` dim `1` (`_task_status`) with:

```json
"primary": { "0_1": true, "1_2": true }
```

`_getFormButtons(run_doc, row)` reads the specific row's `_state`, computes available transitions via `_getTransitions`, splits into `outside` (primary) and `menu` (non-primary).

On hover — `btns = CW._getFormButtons(run_doc, row)?.outside || []` — only `outside` buttons render inline on the row. `menu` buttons go into `[⋯]` dropdown (not yet implemented).

For Task with `_state: {"0":0, "1":0}` (Draft) — "Submit for Review" appears on hover because `1.0_1` is marked primary.

Buttons are hover-revealed only — not always visible. Reduces visual noise on dense grids.

---

## Key Convention

Fixed structural columns use `__` prefix keys:
- `__chk` — checkbox column
- `__act` — actions column

Data columns use `f.fieldname` as key. No collision possible — fieldnames never start with `__`. `tr` key is `row.name`.

---

## Grid Helpers (CW-utils.js)

| Function | Purpose |
|---|---|
| `getGridSelected(run_doc)` | Returns `query.where.name.in` or `[]` |
| `toggleSelected(run_doc, name)` | Add/remove name from selection |
| `toggleAllSelected(run_doc)` | Select all or clear all |
| `clearSelected(run_doc)` | Empty selection, re-render |
| `refetchGrid(run_doc)` | Fire new child select from current query state |

All take `run_doc` as single arg per coding rules. Assigned to `CW.*` for global access.

---

## Challenges and How They Were Overcome

### 1. `_getFormButtons` designed for single document
`FormActions` calls `CW._getFormButtons(run_doc)` — reads `run_doc.target.data[0]`. Grid has many rows. Fix: added optional `row` arg — `const doc = row || run_doc.target?.data?.[0] || {}`. One line change. `FormActions` unaffected (no second arg passed).

### 2. React crash on object values
`_state` is a JSON object. React throws `Objects are not valid as a React child`. Fix: `cv()` helper stringifies all objects before render. Applied to every cell.

### 3. `primary: {}` — no hover buttons
All FSM transitions went to `menu`, none to `outside`. Fix: add `primary` keys to schema dim definition. Multiple primary buttons use one object: `"primary": { "0_1": true, "1_2": true }` — duplicate JSON keys silently drop, must be merged.

### 4. Overcomplicated initial implementation
First version used schema `in_list_view` for column derivation, separate `rowsNEW` variable, status badge column, title column, special filtering — 230+ lines. Replaced with `Object.keys(rows[0])` directly from `target.data`. 100 lines. Cleaner, correct, follows the rule: render what's in `target`.

### 5. Selection state location
Initially proposed `_next` on `run_doc`, then `is_selected` virtual field, then dot-field pipeline. Final answer: direct mutation of `run_doc.query.where.name.in` — selection IS a query filter. `CW._render` re-renders from updated query. No new concepts, no new state.

### 6. Column layout overflow
`_state` JSON made columns too wide. Fix: CSS `table-layout: fixed` + `word-wrap: break-word` — columns share width equally, content wraps. No truncation, no horizontal scroll.

---

## What Is Not Yet Implemented

- `Table` mode add flow (inline row)
- `Relationship` mode (2-step add)
- `[⋯]` per-row menu with `menu` buttons
- Bulk FSM signal buttons in bulk bar (only Delete currently)
- Sort by column click
- Pagination
