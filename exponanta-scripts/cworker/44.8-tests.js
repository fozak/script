// ============================================================
// IIEE — Complete ACL guarantee test
// Based on exact human-translated rules
// ============================================================

const _savedUser  = globalThis.currentUser
const _savedLS    = localStorage.getItem('currentUser')

// known task names
const PUBLIC        = 'task0947h68z5vn'  // _allowed_read has roleispublicxxx
const OWNER_ONLY    = 'task05se9v22toe'  // owner = user01fldlgkbtq, no roles
const ROLE_READ     = 'task0dx37031gxi'  // _allowed_read has roleprojecmanag
const NO_ACCESS     = 'task0hir9nxta39'  // _allowed_read has rolenoaccesxxx
const DIRECT_WRITE  = 'task07m3vedu6wm'  // _allowed has user01fldlgkbtq directly
const DIRECT_READ   = 'task0jc7rfbq24n'  // _allowed_read has user0fc9siuhcy9 directly

const U1 = 'user01fldlgkbtq'  // _allowed_read: ['roleprojecmanag']
const U2 = 'user0fc9siuhcy9'  // _allowed_read: []

let passed = 0
let failed = 0

const check = (desc, actual, expected) => {
  const ok = actual === expected
  console.log(`${ok ? '✅' : '❌'} ${desc}: got ${actual}, expected ${expected}`)
  ok ? passed++ : failed++
}

// ── helper — select task names as specific user ───────────────
const selectAs = async (user, doctype, where) => {
  globalThis.currentUser = user
  const r = await CW.run({
    operation:      'select',
    target_doctype: doctype || 'Task',
    query:          where ? { where } : {},
    options:        { render: false }
  })
  return r.target?.data?.map(t => t.name) || []
}

// ── login helpers ─────────────────────────────────────────────
const loginLinkedIn = async () => {
  // restore user01fldlgkbtq from saved
  globalThis.currentUser = _savedUser
  return _savedUser
}

const loginTest = async () => {
  globalThis.currentUser = null
  const r = await CW.run({
    operation:      'login',
    target_doctype: 'User',
    input:          { email: 'test@test.com', password: 'Test1234!' },
    options:        { render: false }
  })
  globalThis.currentUser = r.user
  return r.user
}

// ============================================================
// SECTION 1 — UNAUTHENTICATED
// Rule: only public records visible
// ============================================================
console.log('\n══ SECTION 1: Unauthenticated ══')
globalThis.currentUser = null

const unauth = await selectAs(null)
check('public task visible',    unauth.includes(PUBLIC),       true)
check('owner-only task hidden', unauth.includes(OWNER_ONLY),   false)
check('role-read task hidden',  unauth.includes(ROLE_READ),    false)
check('no-access task hidden',  unauth.includes(NO_ACCESS),    false)
check('direct-write hidden',    unauth.includes(DIRECT_WRITE), false)
check('direct-read hidden',     unauth.includes(DIRECT_READ),  false)
check('only 1 task returned',   unauth.length,                 1)

// ============================================================
// SECTION 2 — user01fldlgkbtq
// _allowed: ['rolesystemmanag']
// _allowed_read: ['roleprojecmanag']
// ============================================================
console.log('\n══ SECTION 2: user01fldlgkbtq ══')
const u1 = await loginLinkedIn()

const u1tasks = await selectAs(u1)
check('Rule 1 — public visible',         u1tasks.includes(PUBLIC),       true)
check('Rule 3 — owner visible',          u1tasks.includes(OWNER_ONLY),   true)
check('Rule 4 — direct _allowed visible',u1tasks.includes(DIRECT_WRITE), true)
check('Rule 7 — role read visible',      u1tasks.includes(ROLE_READ),    true)
check('no-access hidden',                u1tasks.includes(NO_ACCESS),    false)
check('direct read (other user) hidden', u1tasks.includes(DIRECT_READ),  false)

// Rule 2 — own User record visible
const u1users = await selectAs(u1, 'User', { name: U1 })
check('Rule 2 — own User record visible', u1users.includes(U1), true)

// other User hidden
const u1otherusers = await selectAs(u1, 'User', { name: U2 })
check('other User hidden from u1', u1otherusers.includes(U2), false)

// ============================================================
// SECTION 3 — user0fc9siuhcy9
// _allowed: ['rolesystemmanag']
// _allowed_read: [] — no roles
// ============================================================
console.log('\n══ SECTION 3: user0fc9siuhcy9 ══')
const u2 = await loginTest()

const u2tasks = await selectAs(u2)
check('Rule 1 — public visible',          u2tasks.includes(PUBLIC),       true)
check('Rule 5 — direct _allowed_read',    u2tasks.includes(DIRECT_READ),  true)
check('no role-read (no roles)',          u2tasks.includes(ROLE_READ),    false)
check('no owner-only (wrong owner)',      u2tasks.includes(OWNER_ONLY),   false)
check('no direct _allowed (other user)', u2tasks.includes(DIRECT_WRITE), false)
check('no-access hidden',                u2tasks.includes(NO_ACCESS),    false)

// Rule 2 — own User record visible
const u2users = await selectAs(u2, 'User', { name: U2 })
check('Rule 2 — own User record visible', u2users.includes(U2), true)

// other User hidden
const u2otherusers = await selectAs(u2, 'User', { name: U1 })
check('other User hidden from u2', u2otherusers.includes(U1), false)

// ============================================================
// SECTION 4 — Write ACL
// Rule: must be authenticated, owner OR direct _allowed OR role in _allowed
// ============================================================
console.log('\n══ SECTION 4: Write ACL ══')

// u1 can update own task
await loginLinkedIn()
const upd1 = await CW.run({
  operation:      'update',
  target_doctype: 'Task',
  query:          { where: { name: OWNER_ONLY } },
  input:          { priority: 'High' },
  options:        { render: false }
})
check('u1 can update own task', upd1.success, true)

// u1 can update task where directly in _allowed
const upd2 = await CW.run({
  operation:      'update',
  target_doctype: 'Task',
  query:          { where: { name: DIRECT_WRITE } },
  input:          { priority: 'High' },
  options:        { render: false }
})
check('u1 can update direct _allowed task', upd2.success, true)

// u1 cannot update task with no write access
const upd3 = await CW.run({
  operation:      'update',
  target_doctype: 'Task',
  query:          { where: { name: ROLE_READ } },
  input:          { priority: 'High' },
  options:        { render: false }
})
check('u1 cannot update role-read-only task', upd3.success, false)

// u2 cannot update u1 owned task
await loginTest()
const upd4 = await CW.run({
  operation:      'update',
  target_doctype: 'Task',
  query:          { where: { name: OWNER_ONLY } },
  input:          { priority: 'Low' },
  options:        { render: false }
})
check('u2 cannot update u1 owned task', upd4.success, false)

// unauthenticated cannot update
globalThis.currentUser = null
const upd5 = await CW.run({
  operation:      'update',
  target_doctype: 'Task',
  query:          { where: { name: PUBLIC } },
  input:          { priority: 'Low' },
  options:        { render: false }
})
check('unauthenticated cannot update', upd5.success, false)

// ── RESTORE ───────────────────────────────────────────────────
globalThis.currentUser = _savedUser
localStorage.setItem('currentUser', _savedLS)

// ── FINAL SUMMARY ─────────────────────────────────────────────
console.log(`\n══ FINAL: ${passed} passed, ${failed} failed ══`)
console.log(failed === 0 ? '✅ ALL PASS' : '❌ SOME FAILED')
VM246:64 
══ SECTION 1: Unauthenticated ══
VM246:25 ✅ public task visible: got true, expected true
VM246:25 ✅ owner-only task hidden: got false, expected false
VM246:25 ✅ role-read task hidden: got false, expected false
VM246:25 ✅ no-access task hidden: got false, expected false
VM246:25 ✅ direct-write hidden: got false, expected false
VM246:25 ✅ direct-read hidden: got false, expected false
VM246:25 ✅ only 1 task returned: got 1, expected 1
VM246:81 
══ SECTION 2: user01fldlgkbtq ══
VM246:25 ✅ Rule 1 — public visible: got true, expected true
VM246:25 ✅ Rule 3 — owner visible: got true, expected true
VM246:25 ✅ Rule 4 — direct _allowed visible: got true, expected true
VM246:25 ✅ Rule 7 — role read visible: got true, expected true
VM246:25 ✅ no-access hidden: got false, expected false
VM246:25 ✅ direct read (other user) hidden: got false, expected false
VM246:25 ✅ Rule 2 — own User record visible: got true, expected true
VM246:25 ✅ other User hidden from u1: got false, expected false
VM246:105 
══ SECTION 3: user0fc9siuhcy9 ══
VM246:25 ✅ Rule 1 — public visible: got true, expected true
VM246:25 ✅ Rule 5 — direct _allowed_read: got true, expected true
VM246:25 ✅ no role-read (no roles): got false, expected false
VM246:25 ✅ no owner-only (wrong owner): got false, expected false
VM246:25 ✅ no direct _allowed (other user): got false, expected false
VM246:25 ✅ no-access hidden: got false, expected false
VM246:25 ✅ Rule 2 — own User record visible: got true, expected true
VM246:25 ✅ other User hidden from u2: got false, expected false
VM246:128 
══ SECTION 4: Write ACL ══
VM246:25 ✅ u1 can update own task: got true, expected true
VM246:25 ✅ u1 can update direct _allowed task: got true, expected true
VM246:25 ✅ u1 cannot update role-read-only task: got false, expected false
VM246:25 ✅ u2 cannot update u1 owned task: got false, expected false
VM246:25 ✅ unauthenticated cannot update: got false, expected false
VM246:188 
══ FINAL: 28 passed, 0 failed ══
VM246:189 ✅ ALL PASS







//logout first

localStorage.removeItem('currentUser')
globalThis.currentUser = null
window.location.href = `${CW._config.hub.url}auth/linkedin/login?return_url=${encodeURIComponent(window.location.href)}`






// ============================================================
// PHASE 3 — IIEE Tests for _buildQuery + new select
// ============================================================

// ── ISOLATE ──────────────────────────────────────────────────
console.log('user:', globalThis.currentUser?.name)
console.log('user._allowed:', globalThis.currentUser?._allowed)
console.log('user._allowed_read:', globalThis.currentUser?._allowed_read)

// ── TEST 1 — basic select, check run_doc.d1 structure ────────
const r1 = await CW.run({
  operation:      'select',
  target_doctype: 'Task',
  options:        { render: false }
})
console.log('\n── Test 1: basic select ──')
console.log('success:', r1.success)
console.log('d1.conditions keys:', r1.d1?.conditions?.map(c => c.key))
console.log('d1.sort:', r1.d1?.sort)
console.log('d1.limit:', r1.d1?.limit)
console.log('d1.sql first 80:', r1.d1?.sql?.slice(0, 80))
console.log('count:', r1.target?.data?.length)

// ── TEST 2 — select with where clause ────────────────────────
const r2 = await CW.run({
  operation:      'select',
  target_doctype: 'Task',
  query:          { where: { name: 'task0234i9k7805' } },
  options:        { render: false }
})
console.log('\n── Test 2: select with where ──')
console.log('success:', r2.success)
console.log('d1.conditions keys:', r2.d1?.conditions?.map(c => c.key))
console.log('userWhere sql:', r2.d1?.conditions?.find(c => c.key === 'userWhere')?.sql)
console.log('subject:', r2.target?.data?.[0]?.subject)

// ── TEST 3 — write ACL (update pre-fetch) ────────────────────
const r3 = await CW.run({
  operation:      'update',
  target_doctype: 'Task',
  query:          { where: { name: 'task07m3vedu6wm' } },
  input:          { priority: 'High' },
  options:        { render: false }
})
console.log('\n── Test 3: update non-owned task (should fail) ──')
console.log('success:', r3.success)
console.log('error:', r3.error)
console.log('aclFilter params count:', r3.d1?.conditions?.find(c => c.key === 'aclFilter')?.params?.length)  // should be 3

// ── TEST 4 — update own task (should succeed) ─────────────────
const r4 = await CW.run({
  operation:      'update',
  target_doctype: 'Task',
  query:          { where: { name: 'task0234i9k7805' } },
  input:          { priority: 'High' },
  options:        { render: false }
})
console.log('\n── Test 4: update own task (should succeed) ──')
console.log('success:', r4.success)
console.log('error:', r4.error)

// ── TEST 5 — ACL correctness ──────────────────────────────────
const r5 = await CW.run({
  operation:      'select',
  target_doctype: 'Task',
  options:        { render: false }
})
const names = r5.target?.data?.map(t => t.name)
console.log('\n── Test 5: ACL correctness ──')
console.log('public task appears:', names?.includes('task0947h68z5vn'))
console.log('no-access task hidden:', !names?.includes('task0hir9nxta39'))
console.log('role-read task appears:', names?.includes('task0dx37031gxi'))
console.log('owner task appears:', names?.includes('task05se9v22toe'))

// ── TEST 6 — pagination ───────────────────────────────────────
const r6 = await CW.run({
  operation:      'select',
  target_doctype: 'Task',
  query:          { perPage: 2, page: 1 },
  options:        { render: false }
})
console.log('\n── Test 6: pagination ──')
console.log('success:', r6.success)
console.log('count:', r6.target?.data?.length)  // should be 2
console.log('d1.limit:', r6.d1?.limit)

// ── TEST 7 — sort ─────────────────────────────────────────────
const r7 = await CW.run({
  operation:      'select',
  target_doctype: 'Task',
  query:          { sort: { created: 'asc' } },
  options:        { render: false }
})
console.log('\n── Test 7: sort ──')
console.log('success:', r7.success)
console.log('d1.sort:', r7.d1?.sort)

// ── TEST 8 — login (auth — must not break) ────────────────────
const r8 = await CW.run({
  operation:      'login',
  target_doctype: 'User',
  input:          { email: 'test@test.com', password: 'Test1234!' },
  options:        { render: false }
})
console.log('\n── Test 8: login (auth) ──')
console.log('success:', r8.success)
console.log('has token:', !!r8.user?.token)
console.log('r8.d1 undefined (auth bypasses builder):', r8.d1 === undefined)

// ── EXAMINE — final summary ───────────────────────────────────
console.log('\n══ SUMMARY ══')
console.log('1. basic select:', r1.success && r1.d1?.conditions?.length === 2)
console.log('2. select with where:', r2.success && r2.d1?.conditions?.length === 3)
console.log('3. update non-owned fails:', !r3.success)
console.log('4. update own succeeds:', r4.success)
console.log('5. ACL correct:', names?.includes('task0947h68z5vn') && !names?.includes('task0hir9nxta39'))
console.log('6. pagination:', r6.target?.data?.length === 2)
console.log('7. sort:', r7.d1?.sort?.includes('ASC'))
console.log('8. login works:', r8.success && !!r8.user?.token)

console.log('\nALL PASS:', 
  r1.success && r1.d1?.conditions?.length === 2 &&
  r2.success && r2.d1?.conditions?.length === 3 &&
  !r3.success &&
  r4.success &&
  names?.includes('task0947h68z5vn') && !names?.includes('task0hir9nxta39') &&
  r6.target?.data?.length === 2 &&
  r7.d1?.sort?.includes('ASC') &&
  r8.success && !!r8.user?.token
)