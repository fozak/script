// ============================================================
// IIEE — Complete ACL guarantee test  (recovered from chat c8aef00e, Aug 23)
// Paste in the browser console on a CW page. Needs top-level await.
// NOTE: written for the Aug 23 D1 data. The fixtures below no longer exist
// (checked Oct 27: 0 of 6 tasks, no U2) and it expects the session user to be U1.
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
