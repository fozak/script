# CW Framework — Claude Session Preamble

Paste at the start of every session. Reason from the structural model first.
Apply rules as derived instances of it. When a case is not listed, the model resolves it.

---

## SECTION 1 — STRUCTURAL MODEL

### What exists (static, declared before any execution)

```
Schema            — shape of data, field types, FSM definition, view routing
                    declared in CW.Schema[doctype], never mutated at runtime
SystemSchema      — cross-cutting rules applied to every doctype
                    systemFields callbacks fire inside _preflight on every write
run_doc           — fixed contract between all pipeline stages (shape below)
ACL               — who may execute which operation on which doctype
                    lives in PocketBase rules only, never in client schema or code
```

### run_doc shape (fixed — never extend ad-hoc)

```
name, operation, operation_original, source_doctype, source_field,
target_doctype, adapter, view, component, container,
query, target, input, search,
status, success, error, modified,
parent_run_id, child_run_ids, options, user,
context (DO NOT USE — legacy placeholder only)
```

### _state shape (inside target.data[0], persisted to PocketBase)

```
Signal keys:  { "dim.from_to": status }   e.g. { "0.0_1": "1" }
Dim integers: { "dim": currentVal }        e.g. { "0": 2 }
Both coexist in the same _state object.

status values:
  ""    pending  — in-memory trigger only, never written to PocketBase
  "1"   succeeded
  "-1"  failed

Signal detection: find entry where value === ""
Current state:    _getDimValue reads doc._state[dim] (integer) first,
                  falls back to parsing signal key if integer absent
```

---

## SECTION 2 — EXECUTION MODEL (pipeline phases)

```
PHASE 1  INTENT        owner: caller
         writes: run_doc.input only
         target.data[0] not yet authoritative

PHASE 2  FETCH         owner: controller (conditional)
         fires: only for update/delete when target.data[0].name absent
         reads from DB → populates target.data[0]

PHASE 3  LOG           owner: _logChanges
         fires: before merge, records intent delta

PHASE 4  MERGE         owner: _mergeInput
         reads:  run_doc.input
         writes: run_doc.target.data[0]  ← ownership transfers here
         clears: run_doc.input = {}      ← never read again after this phase
         _state: clears same-dim signal from target before merging new one

PHASE 5  DISPATCH      owner: controller
         reads:  target.data[0] only
         signal "" found → FSM path (_handleSignal)
         no signal       → data path (create/update) or read path (select)

PHASE 6  FSM           owner: _handleSignal → _execTransition
         reads:  target.data[0]  ← carries pending signal at this point
         writes: target.data[0]._state[signal] = "1" or "-1"
         writes: target.data[0]._state[dim]    = toVal (integer)
         writes: input._state[signal] = "1"    ← so _preflight picks it up
         rule:   sideEffects fire BEFORE signal marked complete
                 target.data[0] has pending "" at sideEffect execution time

PHASE 7  PREFLIGHT     owner: _preflight
         reads:  target.data[0]
         runs:   reqd validation, defaults, Code/JSON stringify
         runs:   systemFields callbacks (onWrite, onCreate)
         systemFields write to target.data[0] directly via run_doc

PHASE 8  EXECUTE       owner: adapter
         reads:  target.data[0] only — complete, no pre-fetch
         strips: virtual fields before DB write (_stripVirtual)
         writes: DB

PHASE 9  CONFIRM       owner: adapter response
         writes: target.data[0] ← DB confirmed state, ground truth
```

### Two axes — every violation is one of these

```
STRUCTURAL violation  — declaration logic placed in execution, or vice versa
                        e.g. component: hardcoded in child() instead of schema
                        e.g. ACL in client schema instead of PocketBase

PHASE violation       — wrong owner writing/reading at wrong phase
                        e.g. writing input after Phase 4
                        e.g. reading target.data[0] before Phase 4
```

---

## SECTION 3 — RULES

Each rule is a complete pattern. Apply exactly.
Invariant tag shows which model constraint the rule derives from.

---

### RULE 1 — systemFields handler

```
WHEN: writing a systemField callback (onWrite, onCreate)
DO:   read and write target.data[0] via run_doc
      callbacks fire in Phase 7 — target.data[0] is authoritative

const doc = run_doc.target?.data?.[0];
if (!doc) return;
doc.modified    = Date.now();           // onWrite
doc.modified_by = run_doc.user?.name;  // onWrite
doc.owner       = run_doc.user?.name;  // onCreate only

PHASE: 7 (after merge — target.data[0] is complete)
```

---

### RULE 2 — child operation (navigation, fetch, FSM signal)

```
WHEN: any operation inside a component or handler
DO:   run_doc.child({ operation, target_doctype, query, input, options })

// navigate to record
run_doc.child({
  operation:      'select',
  target_doctype: 'Task',
  query:          { where: { name: id } },
  options:        { render: true },
})

// fetch without render — await only when you need cr.target.data immediately
const cr = await run_doc.child({
  operation:      'select',
  target_doctype: 'Comment',
  query:          { where: { parent: doc.name } },
  options:        { render: false },
})

// FSM signal
run_doc.child({
  operation:      'update',
  target_doctype: 'Task',
  query:          { where: { name: doc.name } },
  input:          { _state: { '0.0_1': '' } },
  options:        { render: false, internal: true },
})

STRUCTURAL: schema resolves component/container via view_components — never hardcode them
PHASE: child() executes the full pipeline immediately
       store result via CW.runs[cr.name], not by holding cr reference
```

---

### RULE 3 — sideEffect child call

```
WHEN: calling child() inside a sideEffect
DO:   clone doc and clear _state before passing
      sideEffects fire in Phase 6 — target.data[0] carries pending ""
      passing by reference loops the signal back into the child pipeline

const doc = run_doc.target?.data?.[0];
await run_doc.child({
  operation:      'update',
  target_doctype: run_doc.target_doctype,
  query:          { where: { name: doc.name } },
  target:         { data: [Object.assign({}, doc, { _state: {} })] },
  input:          { someField: value },
  options:        { render: false, internal: true },
})

PHASE: 6 — pending signal present in target.data[0] at this moment
```

---

### RULE 4 — read current FSM state

```
WHEN: reading current state value for a dim (to show buttons, badges, labels)
DO:   CW._getDimValue(doc, dim, dimDef)
      reads doc._state[dim] (integer) first
      falls back to parsing signal key if integer absent

const stateDef   = CW._getStateDef(run_doc.target_doctype)
const dimDef     = stateDef['0']
const currentVal = CW._getDimValue(doc, '0', dimDef)
// currentVal is an integer e.g. 0, 1, 2

STRUCTURAL: never derive state by inspecting signal keys directly
            _getDimValue is the single resolution path
```

---

### RULE 5 — pass domain data into child

```
WHEN: passing channel, project, parent, or any domain value into a child run
DO:   use input: { fieldname: value, docsubtype: '...' }

run_doc.child({
  operation:      'create',
  target_doctype: 'Post',
  input:          { channel: channelName, docsubtype: 'post' },
  options:        { render: true },
})

STRUCTURAL: context: {} is a legacy placeholder — DO NOT USE
            secondary classification always uses docsubtype, never post_type/task_type
```

---

### RULE 6 — access parent record

```
WHEN: a child component needs data from its parent run
DO:   traverse the run tree

const parentRun = CW.runs[run_doc.parent_run_id]
const parentDoc = parentRun?.target?.data?.[0]

STRUCTURAL: never add _parent_record or any ad-hoc property to run_doc shape
```

---

### RULE 7 — React state scope

```
WHEN: deciding whether to use React.useState
DO:   useState only for state that dies on unmount and nothing else cares

// legitimate
const [isOpen,  setIsOpen]  = React.useState(false)  // dropdown
const [saving,  setSaving]  = React.useState(false)   // spinner
const [prevName, setPrevName] = React.useState(doc.name) // derived reset guard

// never
const [record,   setRecord]   = React.useState(null)  // use run_doc.target.data[0]
const [comments, setComments] = React.useState([])    // use CW._getChildRun
const [rev,      setRev]      = React.useState(0)     // signal re-mounts with fresh data

PHASE: after FSM signal completes, component re-mounts with fresh run_doc
       never use setRev to force re-render
```

---

### RULE 8 — expand child data

```
WHEN: component needs Table/Link/Relationship field data
DO:   read from CW._getChildRun — _expand populates on form load

// read (in component)
const childRun = CW._getChildRun(run_doc, 'comments')
const comments = childRun?.target?.data || []

// refresh after write
CW._expand(run_doc, 'comments')  // fire and forget — no await needed

PHASE: _expand fires in Phase 5 (select handler, view: 'form')
       components never fetch — they read from CW.runs
```

---

### RULE 9 — view selection

```
WHEN: selecting view for a child run that needs FSM state
DO:   view: 'form' when result needs _state for buttons, badges, transitions
      view: 'list' for display-only lists (in_list_view fields only)

run_doc.child({
  operation:      'select',
  target_doctype: 'Task',
  query:          { where: { name: id } },
  view:           'form',   // needed: will render FSM buttons
  options:        { render: true },
})

STRUCTURAL: view: 'form' triggers _expand automatically
            view: 'list' strips fields to in_list_view — no _expand
```

---

### RULE 10 — schema declaration owns UI routing

```
WHEN: writing a child() call that renders a component
DO:   omit component: and container: — schema resolves them

Schema declaration (owned by schema):
"view_components": {
  "list": { "component": "TaskList",  "container": "left_pane"  },
  "form": { "component": "TaskForm",  "container": "right_pane" }
}

Child call (owned by component):
run_doc.child({
  operation:      'select',
  target_doctype: 'Task',
  query:          { where: { name: id } },
  options:        { render: true },
  // component and container absent — schema resolves via _resolveAll
})

STRUCTURAL: hardcoding component:/container: is a structural violation
            execution overriding what schema declares
```

---

## SECTION 4 — WORKING DISCIPLINE

```
SCOPE
  Make only the change stated.
  If you spot other issues — name them, do not fix them.
  If a change requires touching more than the stated files — stop and ask.

TEST BEFORE FIX
  Before any fix produce an IIFE browser console test:
  ;(async () => {
    const assert = (label, got, expected) => {
      if (got !== expected) console.error('❌', label, '| got:', got, '| expected:', expected)
      else console.log('✅', label)
    }
    // reproduce the problem here
  })()
  Tests run against live PocketBase at pb.exponanta.com using real CW global.
  Do not propose code changes until the test confirms the problem.

PREDEFINED SIGNATURES (never change argument lists)
  CW._preflight(run_doc)
  CW.controller(run_doc)
  CW._handleSignal(run_doc)
  CW._execTransition(run_doc, dim, key)
  CW._render(run_doc)
  Adapter.select(run_doc)
  Adapter.create(run_doc)
  Adapter.update(run_doc)
  Adapter.delete(run_doc)
  systemFields: { onWrite: (run_doc) => { ... }, onCreate: (run_doc) => { ... } }
  run_doc.child({ operation, target_doctype, query, input, options })
```

---

## SECTION 5 — QUICK REFERENCE

| Situation | Pattern |
|---|---|
| operation inside component | `run_doc.child(...)` |
| child from sideEffect | clone doc, clear `_state: {}` |
| read current FSM state | `CW._getDimValue(doc, dim, dimDef)` |
| read child field data | `CW._getChildRun(run_doc, fieldname)?.target?.data` |
| refresh child after write | `CW._expand(run_doc, fieldname)` — fire and forget |
| pass domain data to child | `input: { field: val, docsubtype: '...' }` |
| access parent record | `CW.runs[run_doc.parent_run_id]?.target?.data?.[0]` |
| systemField write target | `run_doc.target?.data?.[0]` (Phase 7, after merge) |
| component/container routing | schema `view_components` — never hardcode |
| secondary classification | `docsubtype` — never `post_type`, `task_type` |
| ACL / security | PocketBase rules only — never client schema |
| URL operation | always `select` — `create`/`update` never in URL |
| React state | cosmetic/ephemeral only — document data lives in `run_doc` |
| boot call | `cwStateFromUrl()` in HTML — one `CW.run` only |
