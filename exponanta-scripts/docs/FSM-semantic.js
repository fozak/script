Semantic FSM — Documentation
Core Concept

FSM state lives in doc._state — a single JSON object per record containing current dim values and signal history. All values are semantic strings, no magic numbers.

_state Shape in D1
javascript
_state: {
  // current dim values — semantic strings
  "status":    "In Progress",
  "docstatus": "Draft",
  "email_status": "Unverified",

  // signal history — append only
  "status.Open.In Progress":    "1",   // completed
  "status.In Progress.Done":    "1",   // completed
  "docstatus.Draft.Submitted":  "",    // pending
  "email_status.Unverified.Verified": "-1"  // failed
}

Signal values: "" = pending, "1" = completed, "-1" = failed.

Dim Definition in Schema
javascript
CW.Schema.Task._state = {
  status: {
    name:    'status',
    default: 'Open',
    values:  ['Open', 'In Progress', 'Done', 'Cancelled'],
    transitions: {
      'Open':        ['In Progress', 'Cancelled'],
      'In Progress': ['Done', 'Cancelled'],
      'Done':        [],
      'Cancelled':   ['Open']
    },
    labels: {
      'Open.In Progress':      'Start',
      'In Progress.Done':      'Complete',
      'Open.Cancelled':        'Cancel',
      'Cancelled.Open':        'Reopen'
    },
    sideEffects: {},
    rules: {},
    primary: {
      'Open.In Progress': true,   // → outside button
      'In Progress.Done': true,   // → outside button
    }
  }
}
docstatus — System Dim

Injected into every doctype via systemFields._state during _compileSchemas. Semantic values map to numeric top-level column for SQL:

javascript
// _state dim (semantic)
"docstatus": "Draft"      // → doc.docstatus = 0
"docstatus": "Submitted"  // → doc.docstatus = 1
"docstatus": "Cancelled"  // → doc.docstatus = 2

Top-level doc.docstatus kept in sync by _execTransition via dimDef.values.indexOf(toVal). Enables fast SQL: WHERE docstatus = 0.

Signal Notation
dim.FromValue.ToValue

status.Open.In Progress       // Task status transition
status.Invited.Active         // User auth status transition
email_status.Unverified.Verified  // User email status
docstatus.Draft.Submitted     // Universal submit

Signals sent from client:

javascript
CW.run({
  operation: 'update',
  target_doctype: 'Task',
  query: { where: { name: 'task123' } },
  input: { _state: { 'status.Open.In Progress': '' } }  // '' = pending
})
Permissions & Transitions

Each role declares which transitions it can fire:

javascript
permissions: [
  {
    role: 'rolesystemmanag',
    read: 1, write: 1, create: 1, delete: 1,
    transitions: {
      'status.Open.In Progress': 'Start',
      'status.In Progress.Done': 'Complete',
    }
  }
]

Labels in permissions.transitions override dimDef.labels — allows role-specific button labels.

FSM Pipeline
client sends input._state: { 'status.Open.In Progress': '' }
  ↓
CW.controller → _mergeInput → doc._state signal detected (value = '')
  ↓
_handleSignal(run_doc)
  ↓
  parse signal → dim='status', key='Open.In Progress'
  _getDimValue → currentVal = 'Open'
  validate: fromVal('Open') === currentVal('Open') ✓
  validTos = transitions['Open'] = ['In Progress', 'Cancelled']
  'In Progress' in validTos ✓
  check requires, rules ✓
  ↓
_execTransition(run_doc, 'status', 'Open.In Progress')
  fire sideEffects
  doc._state['status'] = 'In Progress'
  if dim === 'docstatus' → sync doc.docstatus = indexOf(toVal)
  view switch if dimDef.views[toVal] defined
  ↓
doc._state['status.Open.In Progress'] = '1'   // mark success
input._state['status.Open.In Progress'] = '1'  // for DB write
  ↓
CW._handlers.update(run_doc) → D1 write
_changes Audit Trail

Two separate channels logged per operation:

ch — field value changes: { field, from, to }
sig — FSM signals fired: ['status.Open.In Progress']
javascript
// example _changes entry after transition
{
  at:  1785776229878,
  by:  'user0abc123',
  op:  'update',
  sig: ['status.Open.In Progress']
}
FSM Helpers — all in CW-utils.js
Function	Purpose
_getStateDef(doctype)	Returns compiled schema._state — all dims including system
_getDimValue(doc, dim, dimDef)	Returns current semantic value for a dim
_getTransitions(schema, doc, dim, run_doc)	Returns available transition buttons filtered by rules/requires
_getFormButtons(run_doc, row)	Returns { outside, menu } button groups for UI
_execTransition(run_doc, dim, key)	Fires sideEffects, updates _state, syncs docstatus
_handleSignal(run_doc)	Dispatches signal, validates, calls _execTransition, writes to D1
Compile — _compileSchemas

docstatus dim injected universally from systemFields:

systemFields._state → merged into every schema._state as 'docstatus' dim
doctypeFields._state → enriches specific doctype (User gets status + email_status)
sideEffects/rules strings → compiled to live functions LAST

The invariant: after compile, every CW.Schema[doctype]._state contains all dims — system + doctype-specific. No runtime merging needed. _getStateDef is a single lookup.