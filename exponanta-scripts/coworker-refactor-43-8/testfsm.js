// ============================================================
// CW FSM Round-Trip Test — paste in browser console
// Tests 0→1→2→0→1→2 and checks UI state after each transition
// ============================================================
(async () => {
  const DOCTYPE = 'Relationship';
  const TEST_DOC = {
    related_doctype: 'Customer',
    related_name: 'customer6tt8esw',
    related_title: 'customer6tt8esw',
    type: 'Customer',
    notes: '',
    parent: 'taskghcroucuj68',
    parenttype: 'Task',
    parentfield: 'relationships',
  };

  const log = (tag, obj) => console.log(`[FSM-TEST][${tag}]`, JSON.stringify(obj, null, 2));
  const err = (tag, msg) => console.error(`[FSM-TEST][${tag}] ❌`, msg);
  const ok  = (tag, msg) => console.log(`[FSM-TEST][${tag}] ✅`, msg);

  // ── 1. CREATE ──────────────────────────────────────────────
  const cr = await CW.run({
    operation: 'create',
    target_doctype: DOCTYPE,
    input: TEST_DOC,
    options: { render: false },
  });
  if (cr.error) { err('CREATE', cr.error); return; }
  const name = cr.target?.data?.[0]?.name;
  ok('CREATE', `name=${name}`);
  log('CREATE _state', cr.target?.data?.[0]?._state);

  // ── helper: fetch fresh from DB ────────────────────────────
  const fetch = async () => {
    const r = await CW.run({
      operation: 'select',
      target_doctype: DOCTYPE,
      query: { where: { name } },
      options: { render: false },
    });
    return r.target?.data?.[0];
  };

  // ── helper: get buttons for a doc ─────────────────────────
  const buttons = (doc) => {
    const schema = CW.Schema?.Relationship;
    const stateDef = CW._getStateDef(DOCTYPE);
    return Object.keys(stateDef).flatMap(dim =>
      CW._getTransitions(schema, doc, dim)
    ).map(b => b.signal);
  };

  // ── helper: apply signal ───────────────────────────────────
  const signal = async (sig, round) => {
    const before = await fetch();
    log(`[${round}] BEFORE signal=${sig} _state`, before?._state);
    log(`[${round}] BEFORE buttons`, buttons(before));

    const r = await CW.run({
      operation: 'update',
      target_doctype: DOCTYPE,
      query: { where: { name } },
      input: { _state: { [sig]: '' } },
      options: { render: false, internal: true },
    });

    if (r.error) { err(`[${round}] SIGNAL ${sig}`, r.error); return null; }

    const after = await fetch();
    log(`[${round}] AFTER _state`, after?._state);
    log(`[${round}] AFTER buttons`, buttons(after));

    const dim = sig.split('.')[0];
    const toVal = parseInt(sig.split('.')[1].split('_')[1]);
    const actual = CW._getDimValue(after, dim, CW._getStateDef(DOCTYPE)[dim]);

    if (actual === toVal) {
      ok(`[${round}] ${sig}`, `dim${dim}=${actual} ✓`);
    } else {
      err(`[${round}] ${sig}`, `expected dim${dim}=${toVal} got ${actual}`);
    }

    return after;
  };

  // ── ROUND 1 ────────────────────────────────────────────────
  await signal('0.0_1', 'R1-Submit');
  await signal('0.1_2', 'R1-Cancel');
  await signal('0.2_0', 'R1-Reopen');

  // ── ROUND 2 ────────────────────────────────────────────────
  await signal('0.0_1', 'R2-Submit');
  await signal('0.1_2', 'R2-Cancel');
  await signal('0.2_0', 'R2-Reopen');

  // ── CLEANUP ────────────────────────────────────────────────
  const del = await CW.run({
    operation: 'delete',
    target_doctype: DOCTYPE,
    query: { where: { name } },
    options: { render: false, internal: true },
  });
  del.error ? err('DELETE', del.error) : ok('DELETE', `cleaned up ${name}`);

})();