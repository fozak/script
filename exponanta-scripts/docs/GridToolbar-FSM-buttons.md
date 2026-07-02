# GridToolbar & FSM Button Logic

## GridToolbar Component

```javascript
const GridToolbar = function ({ run_doc, field }) { ... }
```

Placed immediately before `UniversalGrid` in `CW-ui.js`. Called from `UniversalGrid` as:

```javascript
ce(GridToolbar, { run_doc, field })
```

Same `{ run_doc, field }` prop shape as `UniversalGrid` — mode and doctype derived identically inside.

---

## Two Toolbar States

### Normal Toolbar (`selected.length === 0`)

```
[+ New]  [🔍 Search Task...]
```

- `+ New` — `MainGrid` mode only — fires `run_doc.child({ operation: 'create' })`
- Search input — controlled by `run_doc.search`, calls `CW.searchDebounced(run_doc)` on change
- `Table` mode — shows `+ Add` stub (inline add not yet implemented)
- `Relationship` mode — not yet implemented

### Bulk Bar (`selected.length > 0`)

```
[3 selected ×]   [Submit for Review]   [Reject]
```

Replaces normal toolbar entirely. Appears when `CW.getGridSelected(run_doc).length > 0`.

- `N selected ×` — clears selection via `CW.clearSelected(run_doc)`
- FSM buttons — computed from intersection of available transitions across all selected docs
- No hardcoded Delete — if Delete is a valid FSM transition (`0.0_2`) it appears naturally
- After any bulk action — `CW.clearSelected` + `CW.refetchGrid`
- `btn.confirm` — `window.confirm` before firing if defined in schema

---

## Bulk Button Computation

```javascript
const selectedDocs  = rows.filter(r => selected.includes(r.name));
const allSignalSets = selectedDocs.map(doc => {
  const btns = CW._getFormButtons(run_doc, doc);
  return [...btns.outside, ...btns.menu].filter(b => b.type === 'fsm');
});
const commonBtns = allSignalSets.length === 0 ? [] :
  allSignalSets[0].filter(b =>
    allSignalSets.every(set => set.some(s => s.signal === b.signal))
  );
```

**Key point:** bulk uses ALL available FSM buttons (`outside` + `menu`), not just `outside`. `primary` is irrelevant for bulk — any available transition common to all selected docs is a valid bulk action.

**Intersection logic:** only signals present in every selected doc's available transitions appear. Mixed-state selections naturally produce fewer or no common buttons.

**Example:**
```
doc A: dim 1 = 0 (Draft)    → available: 1.0_1
doc B: dim 1 = 1 (Pending)  → available: 1.1_2, 1.1_3
doc C: dim 1 = 0 (Draft)    → available: 1.0_1

A+B+C intersection → []          (no common signal)
A+C   intersection → [1.0_1]     → shows "Submit for Review"
```

Individual failures don't stop the loop — `CW.controller` catches per-record errors. Valid docs transition, invalid ones fail gracefully.

---

## `_getFormButtons(run_doc, doc)`

```javascript
function _getFormButtons(run_doc, row) {
  const doc = row || run_doc.target?.data?.[0] || {};
  ...
  return { outside, menu };
}
```

**`row` arg** — optional. When passed (grid context), uses that specific doc. When absent (form context), uses `run_doc.target.data[0]`. One function, two contexts.

Returns `{ outside: [...], menu: [...] }` — never an array. Both arrays contain button objects:

```javascript
{
  type:    'fsm' | 'save' | 'edit',
  signal:  '1.0_1',
  from:    0,
  to:      1,
  label:   'Submit for Review',
  confirm: 'Are you sure?'   // optional
}
```

---

## Two Independent Gates

### Gate 1 — Availability (`_getTransitions`)

Three sub-checks, all must pass:

**`transitions`** — is `from→to` defined in schema?
```json
"transitions": { "1": [2, 3] }
```
Doc at dim value `1` can only go to `2` or `3`. Any other target → filtered out.

**`requires`** — does the doctype have required schema flags?
```json
"requires": { "0_1": { "is_submittable": 1 } }
```
`Number(schema.is_submittable) === 1` must be true. Fails → transition filtered out regardless of doc state.

**`rules`** — custom function evaluated against the specific doc:
```javascript
"rules": {
  "1_2": "(run_doc) => { 
    const doc = run_doc.target?.data?.[0] || {}; 
    return CW._getDimValue(doc, '0', CW._getStateDef(run_doc.target_doctype)['0']) === 0; 
  }"
}
```
Called with `{ target: { data: [doc] }, input: {}, target_doctype }` — doc-specific context. Fails → transition filtered out.

If any sub-check fails → transition is not available. Not shown anywhere — not in `outside`, not in `menu`.

### Gate 2 — Placement (`primary`)

Applied only to transitions that passed Gate 1.

```json
"primary": { "0_1": true, "1_2": true, "1_3": true }
```

- Signal in `primary` → `outside` → visible on row hover in grid, visible in form header
- Signal not in `primary` → `menu` → inside `[⋯]` dropdown

`primary` has no effect on availability — it only controls where an already-available button appears.

---

## Task Schema Example

Dim `1` (`_task_status`) for `taskt1paoyiirln` (`_state: {0:1, 1:1}`):

| Signal | Available? | Reason | Primary? | Appears |
|---|---|---|---|---|
| `1.0_1` | No | already at value 1, not in `transitions["1"]` | yes | nowhere |
| `1.1_2` | No | rule blocks — dim 0 must be 0, but doc has dim 0 = 1 | yes | nowhere |
| `1.1_3` | Yes | passes all checks | yes | `outside` → hover button |
| `1.2_3` | No | doc at value 1, not from value 2 | no | nowhere |

Result: only "Reject" appears on hover for this record. Correct — task is Submitted (dim 0 = 1), Approve is intentionally blocked by rule.

---

## Nuances

**`primary: {}` empty** — all available transitions go to `menu`. No hover buttons. This is a schema authoring issue — always set `primary` for transitions you want visible without opening the form.

**Duplicate JSON keys** — `"primary": { "0_1": true }, "primary": { "1_2": true }` — second key silently overwrites first. Always merge: `"primary": { "0_1": true, "1_2": true }`.

**`rules` receive fake run_doc** — `_getTransitions` constructs `{ target: { data: [doc] }, input: {}, target_doctype }`. Rules must read doc from `run_doc.target.data[0]`, not from outer closure.

**Cross-dim availability** — `rules` can cross-check other dims. `1_2` rule checks dim `0` value — Approve blocked when docstatus is Submitted. This enables complex multi-dim business logic entirely in schema.

**Bulk vs single** — bulk bar uses `outside + menu` intersection. Single row hover uses only `outside`. Same `_getFormButtons`, different consumption.
