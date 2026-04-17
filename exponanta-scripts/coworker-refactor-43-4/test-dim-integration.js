// ============================================================
// test-dim-integration.js
// 5 critical aspects for dim 0 + dim 1 working together
// Uses real SystemSchema + User schema from uploaded files
// ============================================================

const globalThis = global
globalThis.CW = {
  Schema:  {},
  _config: { publicDoctypes: [], adapters: { defaults: { db: 'mock' } },
    operations: { select: { type: 'read' }, create: { type: 'write' }, update: { type: 'write' } },
    operationAliases: {}, doctypeAliases: {}, operationToView: {},
    views: {}, systemFields: [] },
  runs: {}, current_run: null, _index: null,
}
globalThis.generateId = (dt) => dt.toLowerCase().slice(0,8) + Math.random().toString(36).slice(2,9)

// track pb calls
const pbCalls = []
globalThis.pb = {
  collection: (name) => ({
    update: async (id, data) => { pbCalls.push({ collection: name, id, data }) }
  })
}

// mock adapter
globalThis.Adapter = {
  mock: {
    select: async (run_doc) => {
      run_doc.target = { data: [Object.assign({}, currentDoc)] }
    },
    update: async (run_doc) => {
      Object.assign(currentDoc, run_doc.input)
      run_doc.target = { data: [Object.assign({}, currentDoc)] }
    },
    create: async (run_doc) => {
      run_doc.target = { data: [Object.assign({ name: 'newdoc000000001' }, run_doc.input)] }
    },
  }
}

CW.Schema.SystemSchema = require('/mnt/user-data/uploads/SystemSchema-proposed.json')
CW.Schema.User        = require('/mnt/user-data/uploads/User-schema-proposed.json')

require('/mnt/user-data/outputs/CW-state.js')
require('/mnt/user-data/outputs/CW-utils.js')
require('/mnt/user-data/outputs/CW-run.js')
CW._compileSchemas()

// ── harness ───────────────────────────────────────────────────
const results = []
let passed = 0, failed = 0
function assert(label, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  if (ok) { passed++; results.push(`✅ ${label}`) }
  else    { failed++; results.push(`❌ ${label}\n   got: ${JSON.stringify(got)}\n   exp: ${JSON.stringify(expected)}`) }
}
function assertTruthy(label, val) {
  if (val) { passed++; results.push(`✅ ${label}`) }
  else     { failed++; results.push(`❌ ${label} — got: ${JSON.stringify(val)}`) }
}
function assertNull(label, val) {
  if (val === null || val === undefined) { passed++; results.push(`✅ ${label}`) }
  else { failed++; results.push(`❌ ${label} — expected null, got: ${JSON.stringify(val)}`) }
}

// ── shared mock doc ───────────────────────────────────────────
let currentDoc = {}

;(async () => {

// ── TEST 1: Dim 0 signal 0.0_1 Submit ────────────────────────
console.log('\n── Test 1: Dim 0 signal 0.0_1 (Submit) ──')

// User is_submittable=0 so use a submittable schema — Task
CW.Schema.Task = {
  schema_name: 'Task', is_submittable: 1,
  fields: [{ fieldname: 'title', fieldtype: 'Data', label: 'Title', reqd: 0 }],
  title_field: 'title',
}
currentDoc = { name: 'tasktest000001x', doctype: 'Task', docstatus: 0, title: 'Test Task', _state: { '0': 0 } }
pbCalls.length = 0

const r1 = await CW.run({
  operation: 'update', target_doctype: 'Task',
  query: { where: { name: 'tasktest000001x' } },
  input: { _state: { '0.0_1': '' } },
  options: { render: false, internal: true },
})
assert('T1.1: dim 0 Submit — no error', r1.error, null)
assert('T1.2: _state dim 0 set to 1', currentDoc._state?.['0'], 1)
assert('T1.3: docstatus set to 1', currentDoc.docstatus, 1)
assert('T1.4: signal marked as 1', r1.input._state?.['0.0_1'], '1')
assert('T1.5: _state dim 1 NOT present (Task has no dim 1)', currentDoc._state?.['1'], undefined)
assert('T1.6: no pb.users calls from dim 0', pbCalls.length, 0)

// ── TEST 2: Dim 1 signal 1.0_1 Activate ──────────────────────
console.log('\n── Test 2: Dim 1 signal 1.0_1 (Activate) ──')

currentDoc = { name: 'userabcdefghijk', doctype: 'User', docstatus: 0,
  email: 'test@test.com', first_name: 'Test', full_name: 'Test User',
  _state: { '0': 0, '1': 0 } }
pbCalls.length = 0

const r2 = await CW.run({
  operation: 'update', target_doctype: 'User',
  query: { where: { name: 'userabcdefghijk' } },
  input: { _state: { '1.0_1': '' } },
  options: { render: false, internal: true },
})
assert('T2.1: dim 1 Activate — no error', r2.error, null)
assert('T2.2: _state dim 1 set to 1 (Active)', currentDoc._state?.['1'], 1)
assert('T2.3: _state dim 0 unchanged at 0', currentDoc._state?.['0'], 0)
assert('T2.4: docstatus NOT changed by dim 1', currentDoc.docstatus, 0)
assert('T2.5: signal marked as 1', r2.input._state?.['1.0_1'], '1')
assertTruthy('T2.6: pb.users.update called', pbCalls.length === 1)
assert('T2.7: pb.users.update sets verified:true', pbCalls[0]?.data, { verified: true })
assert('T2.8: pb.users.update uses correct record name', pbCalls[0]?.id, 'userabcdefghijk')

// ── TEST 3: Wrong state rejection ────────────────────────────
console.log('\n── Test 3: Wrong state rejection ──')

// try 1.0_1 Activate when already Active (dim 1 = 1)
currentDoc = { name: 'userabcdefghijk', doctype: 'User', docstatus: 0,
  _state: { '0': 0, '1': 1 } }  // already Active
pbCalls.length = 0

const r3 = await CW.run({
  operation: 'update', target_doctype: 'User',
  query: { where: { name: 'userabcdefghijk' } },
  input: { _state: { '1.0_1': '' } },
  options: { render: false, internal: true },
})
assertTruthy('T3.1: Activate from wrong state → error', r3.error !== null)
assertTruthy('T3.2: error mentions dim 1', typeof r3.error === 'string' && r3.error.includes('dim 1'))
assert('T3.3: signal marked as -1', r3.input._state?.['1.0_1'], '-1')
assert('T3.4: dim 1 NOT changed (still Active)', currentDoc._state?.['1'], 1)
assert('T3.5: no pb.users calls on rejection', pbCalls.length, 0)

// ── TEST 4: Dim isolation ─────────────────────────────────────
console.log('\n── Test 4: Dim isolation ──')

// dim 0 signal must not fire dim 1 sideEffect
// User is_submittable=0 so dim 0 Submit is blocked — test dim 0 Delete instead
// Delete (0_2) has no sideEffect — just verify dim 1 sideEffect not called
currentDoc = { name: 'userabcdefghijk', doctype: 'User', docstatus: 0,
  email: 'test@test.com', first_name: 'Test', full_name: 'Test User',
  _state: { '0': 0, '1': 0 } }
pbCalls.length = 0

// fire dim 0 Delete signal — User not submittable so Submit blocked, but Delete has no requires
const r4a = await CW.run({
  operation: 'update', target_doctype: 'User',
  query: { where: { name: 'userabcdefghijk' } },
  input: { _state: { '0.0_2': '' } },
  options: { render: false, internal: true },
})
assert('T4.1: dim 0 Delete fires — no error', r4a.error, null)
assert('T4.2: dim 0 set to 2', currentDoc._state?.['0'], 2)
assert('T4.3: dim 1 unchanged after dim 0 signal', currentDoc._state?.['1'], 0)
assert('T4.4: no pb.users calls from dim 0 Delete', pbCalls.length, 0)

// dim 1 signal must not affect dim 0 — already tested in T2 but verify explicitly
currentDoc = { name: 'userabcdefghijk', doctype: 'User', docstatus: 0,
  email: 'test@test.com', first_name: 'Test', full_name: 'Test User',
  _state: { '0': 0, '1': 0 } }
const r4b = await CW.run({
  operation: 'update', target_doctype: 'User',
  query: { where: { name: 'userabcdefghijk' } },
  input: { _state: { '1.0_1': '' } },
  options: { render: false, internal: true },
})
assert('T4.5: dim 1 Activate fires — no error', r4b.error, null)
assert('T4.6: dim 0 untouched after dim 1 signal', currentDoc._state?.['0'], 0)
assert('T4.7: docstatus untouched after dim 1 signal', currentDoc.docstatus, 0)

// ── TEST 5: Multi-dim _state preservation ────────────────────
console.log('\n── Test 5: Multi-dim _state preservation ──')

// start with both dims at 0
currentDoc = { name: 'userabcdefghijk', doctype: 'User', docstatus: 0,
  email: 'test@test.com', first_name: 'Test', full_name: 'Test User',
  _state: { '0': 0, '1': 0 } }
pbCalls.length = 0

// fire dim 1 Activate
await CW.run({
  operation: 'update', target_doctype: 'User',
  query: { where: { name: 'userabcdefghijk' } },
  input: { _state: { '1.0_1': '' } },
  options: { render: false, internal: true },
})
assert('T5.1: after dim 1 — dim 0 preserved at 0', currentDoc._state?.['0'], 0)
assert('T5.2: after dim 1 — dim 1 set to 1', currentDoc._state?.['1'], 1)

// now fire dim 1 Lock (1→2)
await CW.run({
  operation: 'update', target_doctype: 'User',
  query: { where: { name: 'userabcdefghijk' } },
  input: { _state: { '1.1_2': '' } },
  options: { render: false, internal: true },
})
assert('T5.3: after Lock — dim 0 still 0', currentDoc._state?.['0'], 0)
assert('T5.4: after Lock — dim 1 set to 2 (Locked)', currentDoc._state?.['1'], 2)
assert('T5.5: docstatus still 0 after two dim 1 transitions', currentDoc.docstatus, 0)

// verify _state has exactly dim 0 and dim 1 keys plus signal history
assertTruthy('T5.6: _state has dim 0 key', '0' in (currentDoc._state || {}))
assertTruthy('T5.7: _state has dim 1 key', '1' in (currentDoc._state || {}))

// fire dim 0 Delete — verify dim 1 still intact
await CW.run({
  operation: 'update', target_doctype: 'User',
  query: { where: { name: 'userabcdefghijk' } },
  input: { _state: { '0.0_2': '' } },
  options: { render: false, internal: true },
})
assert('T5.8: after dim 0 Delete — dim 1 still 2 (Locked)', currentDoc._state?.['1'], 2)
assert('T5.9: after dim 0 Delete — dim 0 set to 2', currentDoc._state?.['0'], 2)

// ── RESULTS ──────────────────────────────────────────────────
console.log('\n' + results.join('\n'))
console.log(`\n${passed} passed, ${failed} failed`)

})().catch(err => { console.error('IIEE error:', err); process.exit(1) })
