// ============================================================
// IIEE — ACL test against REAL current D1 data (Oct 27)
// Run logged in as denis@nesen.org (user04i8sjhj7zc, domain
// hub-cf.i771468.workers.dev) — confirm with:
//   console.log(globalThis.currentUser)
// before running this.
//
// Fixtures used (confirmed live via D1 export, not fabricated):
//   OWNED_SAME_DOMAIN = 'task01ifu9yp948'
//     domain: hub-cf.i771468.workers.dev (SAME as current session)
//     owner:  user04i8sjhj7zc (= current session)
//     _allowed: [roleprojecuserx]  _allowed_read: [roleprojecmanag]
//
//   OTHER_DOMAIN = 'task0jy0mgjgbnv'
//     domain: nesen.org (DIFFERENT from current session)
//     owner:  user01fldlgkbtq (≠ current session)
//     _allowed: [roleprojecuserx, roleispublixxxx]
//     _allowed_read: [roleprojecmanag, roleispublixxxx]
//
// No user currently holds any _allowed_read role (all three
// known users have _allowed_read: []), so role-based-read and
// cross-user-same-domain cases are NOT covered here — deferred
// per your call to skip creating a throwaway second user.
//
// CAUTION: the update test below actually writes to
// task01ifu9yp948 (sets priority). The delete test is commented
// out by default since it would permanently remove your only
// same-domain fixture task — uncomment only if you're OK losing it.
// ============================================================

const OWNED_SAME_DOMAIN = 'task01ifu9yp948';
const OTHER_DOMAIN = 'task0jy0mgjgbnv';

let passed = 0;
let failed = 0;
const check = (desc, actual, expected) => {
  const ok = actual === expected;
  console.log(`${ok ? '✅' : '❌'} ${desc}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? passed++ : failed++;
};

console.log('Running as:', globalThis.currentUser?.name, globalThis.currentUser?.domain);
if (!globalThis.currentUser?.name) {
  console.log('⚠️  Not logged in — log in as denis@nesen.org first.');
}

// ============================================================
// SECTION A — SELECT (domain + ownership)
// ============================================================
console.log('\n══ SECTION A: Select ══');

const selOwn = await CW.run({
  operation: 'select',
  target_doctype: 'Task',
  query: { where: { name: OWNED_SAME_DOMAIN } },
  options: { render: false },
});
check('select own same-domain task visible', !!selOwn.target?.data?.length, true);

const selOther = await CW.run({
  operation: 'select',
  target_doctype: 'Task',
  query: { where: { name: OTHER_DOMAIN } },
  options: { render: false },
});
check('select other-domain task hidden (domain gate)', !!selOther.target?.data?.length, false);

// ============================================================
// SECTION B — UPDATE (domain + ownership)
// This WRITES to OWNED_SAME_DOMAIN — sets priority to 'High'.
// ============================================================
console.log('\n══ SECTION B: Update ══');

const updOwn = await CW.run({
  operation: 'update',
  target_doctype: 'Task',
  query: { where: { name: OWNED_SAME_DOMAIN } },
  target: { data: [{ name: OWNED_SAME_DOMAIN, priority: 'High' }] },
  options: { render: false },
});
check('update own same-domain task succeeds', updOwn.success, true);

const updOther = await CW.run({
  operation: 'update',
  target_doctype: 'Task',
  query: { where: { name: OTHER_DOMAIN } },
  target: { data: [{ name: OTHER_DOMAIN, priority: 'High' }] },
  options: { render: false },
});
check('update other-domain task fails (domain gate, not owner)', updOther.success, false);

// ============================================================
// SECTION C — UNAUTHENTICATED baseline
// ============================================================
console.log('\n══ SECTION C: Unauthenticated ══');
const _savedUser = globalThis.currentUser;
const _savedLS = localStorage.getItem('currentUser');

globalThis.currentUser = null;

const anonSelOwn = await CW.run({
  operation: 'select',
  target_doctype: 'Task',
  query: { where: { name: OWNED_SAME_DOMAIN } },
  options: { render: false },
});
check('anon cannot select OWNED_SAME_DOMAIN (not public)', !!anonSelOwn.target?.data?.length, false);

const anonUpd = await CW.run({
  operation: 'update',
  target_doctype: 'Task',
  query: { where: { name: OWNED_SAME_DOMAIN } },
  target: { data: [{ name: OWNED_SAME_DOMAIN, priority: 'Low' }] },
  options: { render: false },
});
check('anon cannot update OWNED_SAME_DOMAIN', anonUpd.success, false);

const anonDel = await CW.run({
  operation: 'delete',
  target_doctype: 'Task',
  query: { where: { name: OWNED_SAME_DOMAIN } },
  target: { data: [{ name: OWNED_SAME_DOMAIN }] },
  options: { render: false },
});
check('anon cannot delete OWNED_SAME_DOMAIN', anonDel.success, false);

// ── RESTORE ───────────────────────────────────────────────────
globalThis.currentUser = _savedUser;
if (_savedLS) localStorage.setItem('currentUser', _savedLS);

// ============================================================
// SECTION D — DELETE (DESTRUCTIVE — commented out by default)
// Uncomment to test; this permanently deletes your only
// same-domain fixture task if it succeeds.
// ============================================================
/*
console.log('\n══ SECTION D: Delete (destructive) ══');
const delOther = await CW.run({
  operation: 'delete',
  target_doctype: 'Task',
  query: { where: { name: OTHER_DOMAIN } },
  target: { data: [{ name: OTHER_DOMAIN }] },
  options: { render: false },
});
check('delete other-domain task fails (domain gate)', delOther.success, false);
*/

// ── FINAL SUMMARY ─────────────────────────────────────────────
console.log(`\n══ FINAL: ${passed} passed, ${failed} failed ══`);
console.log(failed === 0 ? '✅ ALL PASS' : '❌ SOME FAILED');
