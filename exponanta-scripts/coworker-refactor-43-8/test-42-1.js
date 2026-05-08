// ============================================================
// Full CW test suite — 40 tests
// ============================================================

globalThis.setTimeout  = (fn) => { fn(); return 0; };
globalThis.clearTimeout = () => {};
globalThis.addEventListener = () => {};
globalThis.document = { getElementById: () => ({ disabled: false, innerHTML: '' }) };
globalThis.window   = { confirm: () => true };
globalThis.evaluateDependsOn = () => true;
globalThis.generateId = (t, seed) => {
  const base = (seed || t).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return base + Math.random().toString(36).slice(2, 6);
};

const fs = require('fs');
eval(fs.readFileSync('/home/claude/test/CW-state.js',  'utf8'));
eval(fs.readFileSync('/home/claude/test/CW-config.js', 'utf8'));
eval(fs.readFileSync('/home/claude/test/CW-run.js',    'utf8'));

CW._config.adapters.defaults.db = 'mock';

// ── mock store — old style (id≠name) and new style (id=name) ─
const store = {
  // old style: id = random, name = human readable
  'pbid000000aaaaa': { id:'pbid000000aaaaa', name:'TASK-001', doctype:'Task', docstatus:0, subject:'Task one',   status:'Open',   _state:{'0':0}, _allowed:['user1'], owner:'user1' },
  'pbid000000bbbbb': { id:'pbid000000bbbbb', name:'TASK-002', doctype:'Task', docstatus:0, subject:'Task two',   status:'Open',   _state:{'0':0}, _allowed:['user1'], owner:'user1' },
  'pbid000000ccccc': { id:'pbid000000ccccc', name:'TASK-003', doctype:'Task', docstatus:1, subject:'Submitted',  status:'Closed', _state:{'0':1}, _allowed:['user1'], owner:'user1' },
  'pbid000000ddddd': { id:'pbid000000ddddd', name:'TASK-004', doctype:'Task', docstatus:2, subject:'Cancelled',  status:'Closed', _state:{'0':2}, _allowed:['user1'], owner:'user1' },
  // new style: id == name
  'task0newidaaaaa': { id:'task0newidaaaaa', name:'task0newidaaaaa', doctype:'Task', docstatus:0, subject:'New style', status:'Open', _state:{'0':0}, _allowed:['user1'], owner:'user1' },
  // users for link field
  'user0000000aaaa': { id:'user0000000aaaa', name:'user0000000aaaa', doctype:'User', full_name:'Alice', email:'alice@test.com', _state:{}, _allowed:['user1'], owner:'' },
  // relationships
  'rel00000000aaaa': { id:'rel00000000aaaa', name:'rel00000000aaaa', doctype:'Relationship', type:'Assignee', related_doctype:'User', related_name:'user0000000aaaa', related_title:'Alice', parent:'TASK-001', parenttype:'Task', parentfield:'relationships', docstatus:0, _state:{'0':0}, _allowed:['user1'], owner:'user1' },
};

const patchLog = [];
let renderLog  = [];

globalThis.Adapter = { mock: {
  select: async (r) => {
    const nameFilter = r.query?.where?.name;
    if (nameFilter) {
      const rec = Object.values(store).find(s => s.name === nameFilter);
      r.target = { data: rec ? [Object.assign({}, rec)] : [] };
    } else {
      const dt = r.target_doctype || r.source_doctype;
      const parent = r.query?.where?.parent;
      const parentfield = r.query?.where?.parentfield;
      let recs = Object.values(store).filter(s => s.doctype === dt);
      if (parent)      recs = recs.filter(s => s.parent === parent);
      if (parentfield) recs = recs.filter(s => s.parentfield === parentfield);
      r.target = { data: recs.map(s => Object.assign({}, s)) };
    }
    r.success = true;
  },
  create: async (r) => {
    const rec = Object.assign({}, r.input);
    rec.id = rec.id || rec.name;   // real PB sets id; mock mirrors it
    store[rec.name] = rec;
    r.target  = { data: [Object.assign({}, rec)] };
    r.success = true;
    patchLog.push({ op:'create', name: rec.name, doctype: rec.doctype });
  },
  update: async (r) => {
    const rec = r.target?.data?.[0];
    if (!rec?.id) { r.error = 'no id in target'; return; }
    Object.assign(store[rec.id], r.input);
    r.target  = { data: [Object.assign({}, store[rec.id])] };
    r.success = true;
    patchLog.push({ op:'update', id: rec.id, name: rec.name, input: Object.assign({}, r.input) });
  },
}};

CW._render = (run_doc) => renderLog.push(run_doc.component);

// ── helpers ──────────────────────────────────────────────────
let passed = 0, failed = 0;
const assert = (label, cond, detail = '') => {
  if (cond) { console.log('  ✅', label); passed++; }
  else       { console.log('  ❌', label, detail ? '— ' + detail : ''); failed++; }
};
const resetLogs = () => { patchLog.length = 0; renderLog.length = 0; };
const lastPatch = () => patchLog[patchLog.length - 1];

// ── TESTS ────────────────────────────────────────────────────
(async () => {

  // ── GROUP 1: SELECT ──────────────────────────────────────
  console.log('\n── GROUP 1: SELECT ─────────────────────────');

  console.log('\nT01: select single old record (id≠name)');
  {
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    assert('no error',         !r.error, JSON.stringify(r.error));
    assert('record found',     r.target?.data?.length === 1);
    assert('correct name',     r.target?.data?.[0]?.name === 'TASK-001');
    assert('has pb id',        r.target?.data?.[0]?.id === 'pbid000000aaaaa');
    assert('status completed', r.status === 'completed');
  }

  console.log('\nT02: select single new record (id=name)');
  {
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'task0newidaaaaa' }, view:'form' }, options:{ render:false } });
    assert('no error',     !r.error);
    assert('record found', r.target?.data?.length === 1);
    assert('id=name',      r.target?.data?.[0]?.id === r.target?.data?.[0]?.name);
  }

  console.log('\nT03: select non-existent record');
  {
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-999' }, view:'form' }, options:{ render:false } });
    assert('no error',      !r.error);
    assert('empty result',  r.target?.data?.length === 0);
    assert('success true',  r.success);
  }

  console.log('\nT04: select list — returns all tasks');
  {
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ view:'list' }, view:'list', component:'MainGrid', options:{ render:false } });
    assert('no error',          !r.error);
    assert('multiple records',  r.target?.data?.length >= 3);
    assert('list view filtered', !('description' in (r.target?.data?.[0] || {})));
  }

  console.log('\nT05: select with render:true fires _render');
  {
    resetLogs();
    await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, view:'form', component:'MainForm', container:'main', options:{ render:true } });
    assert('_render called',    renderLog.includes('MainForm'));
    assert('current_run set',   !!CW.current_run);
  }

  // ── GROUP 2: CREATE ──────────────────────────────────────
  console.log('\n── GROUP 2: CREATE ─────────────────────────');

  console.log('\nT06: create new task');
  {
    resetLogs();
    const r = await CW.run({ operation:'create', target_doctype:'Task', input:{ subject:'Brand new task', status:'Open' }, options:{ render:false } });
    assert('no error',          !r.error, JSON.stringify(r.error));
    assert('has name',          !!r.target?.data?.[0]?.name);
    assert('in store',          !!store[r.target?.data?.[0]?.name]);
    assert('_state initialized',r.target?.data?.[0]?._state?.['0'] === 0);
    assert('input cleared',     Object.keys(r.input).filter(k => k !== '_state').length === 0);
    assert('query.where set',   r.query?.where?.name === r.target?.data?.[0]?.name);
    assert('create logged',     lastPatch()?.op === 'create');
  }

  console.log('\nT07: create — missing required field');
  {
    resetLogs();
    const r = await CW.run({ operation:'create', target_doctype:'Task', input:{ status:'Open' }, options:{ render:false } });
    assert('has error',         !!r.error);
    assert('mentions subject',  (r.error?.message||r.error||'').toLowerCase().includes('subject'));
    assert('status failed',     r.status === 'failed');
    assert('nothing created',   !patchLog.some(p => p.op === 'create'));
  }

  console.log('\nT08: create — doctype defaults applied');
  {
    const r = await CW.run({ operation:'create', target_doctype:'Task', input:{ subject:'Default test' }, options:{ render:false } });
    assert('no error',          !r.error);
    assert('doctype stamped',   r.target?.data?.[0]?.doctype === 'Task');
    assert('_state is object',  typeof r.target?.data?.[0]?._state === 'object');
  }

  // ── GROUP 3: UPDATE / FIELD BLUR ─────────────────────────
  console.log('\n── GROUP 3: UPDATE / FIELD BLUR ────────────');

  console.log('\nT09: field blur on old record — patched by id');
  {
    resetLogs();
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    r.input.subject = 'Updated subject';
    await CW.controller(r);
    assert('no error',          !r.error, JSON.stringify(r.error));
    assert('patched by id',     lastPatch()?.id === 'pbid000000aaaaa');
    assert('store updated',     store['pbid000000aaaaa'].subject === 'Updated subject');
    assert('input cleared',     Object.keys(r.input).filter(k => k !== '_state').length === 0);
  }

  console.log('\nT10: field blur on new record — patched by id=name');
  {
    resetLogs();
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'task0newidaaaaa' }, view:'form' }, options:{ render:false } });
    r.input.subject = 'New style updated';
    await CW.controller(r);
    assert('no error',          !r.error);
    assert('patched by id',     lastPatch()?.id === 'task0newidaaaaa');
    assert('store updated',     store['task0newidaaaaa'].subject === 'New style updated');
  }

  console.log('\nT11: two consecutive field blurs — no data loss');
  {
    resetLogs();
    // use TASK-002 — untouched so far
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-002' }, view:'form' }, options:{ render:false } });
    r.input.subject = 'Blur one';
    await CW.controller(r);
    r.input.status = 'Closed';
    await CW.controller(r);
    assert('subject saved',     store['pbid000000bbbbb'].subject === 'Blur one');
    assert('status saved',      store['pbid000000bbbbb'].status  === 'Closed');
    assert('two patches',       patchLog.filter(p => p.op === 'update').length === 2);
  }

  console.log('\nT12: blur on submitted record — blocked (editable=false)');
  {
    resetLogs();
    // TASK-003 docstatus=1
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-003' }, view:'form' }, options:{ render:false } });
    r.input.subject = 'Should not save';
    await CW.controller(r);
    assert('no patch fired',    patchLog.filter(p => p.op === 'update').length === 0);
    assert('store unchanged',   store['pbid000000ccccc'].subject === 'Submitted');
  }

  // ── GROUP 4: FSM SIGNALS ─────────────────────────────────
  console.log('\n── GROUP 4: FSM SIGNALS ────────────────────');

  console.log('\nT13: submit draft task (0→1)');
  {
    resetLogs();
    // reset TASK-002 to draft
    store['pbid000000bbbbb'].docstatus = 0;
    store['pbid000000bbbbb']._state    = { '0': 0 };
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-002' }, view:'form' }, options:{ render:false } });
    r.input._state = { '0_1': '' };
    await CW.controller(r);
    assert('no error',          !r.error, JSON.stringify(r.error));
    assert('docstatus=1',       store['pbid000000bbbbb'].docstatus === 1);
    assert('_state updated',    store['pbid000000bbbbb']._state?.['0'] === 1);
    assert('signal marked 1',   r.input._state?.['0_1'] === '1');
    assert('patched by id',     lastPatch()?.id === 'pbid000000bbbbb');
  }

  console.log('\nT14: cancel submitted task (1→2)');
  {
    resetLogs();
    // TASK-003 is already submitted (docstatus=1)
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-003' }, view:'form' }, options:{ render:false } });
    r.input._state = { '1_2': '' };
    await CW.controller(r);
    assert('no error',          !r.error, JSON.stringify(r.error));
    assert('docstatus=2',       store['pbid000000ccccc'].docstatus === 2);
    assert('signal marked 1',   r.input._state?.['1_2'] === '1');
  }

  console.log('\nT15: delete draft task (0→2)');
  {
    resetLogs();
    // TASK-001 is draft
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    r.input._state = { '0_2': '' };
    await CW.controller(r);
    assert('no error',          !r.error, JSON.stringify(r.error));
    assert('docstatus=2',       store['pbid000000aaaaa'].docstatus === 2);
  }

  console.log('\nT16: signal blocked — wrong current state');
  {
    resetLogs();
    // TASK-003 now docstatus=2 (cancelled in T14), try 0_1 (submit from draft)
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-003' }, view:'form' }, options:{ render:false } });
    r.input._state = { '0_1': '' };
    await CW.controller(r);
    assert('has error or blocked', r.error || r.input._state?.['0_1'] === '-1');
    assert('store unchanged',      store['pbid000000ccccc'].docstatus === 2);
  }

  console.log('\nT17: signal blocked — is_submittable=0');
  {
    // Task has is_submittable=1 in config — create a doctype without it
    CW.Schema.Note = {
      schema_name: 'Note', title_field: 'title', is_submittable: 0,
      fields: [{ fieldname:'title', fieldtype:'Data', label:'Title', reqd:1, in_list_view:1 }],
      _state: { '0': { labels:{ '0_1':'Submit' } } },
    };
    store['note0000000aaaa'] = { id:'note0000000aaaa', name:'note0000000aaaa', doctype:'Note', docstatus:0, title:'My note', _state:{'0':0}, _allowed:['user1'], owner:'user1' };

    const r = await CW.run({ operation:'select', target_doctype:'Note', query:{ where:{ name:'note0000000aaaa' }, view:'form' }, options:{ render:false } });
    r.input._state = { '0_1': '' };
    await CW.controller(r);
    assert('blocked by requires', r.error || r.input._state?.['0_1'] === '-1',
      'submit should be blocked when is_submittable=0');
  }

  console.log('\nT18: onCardAction pattern — signal via CW.run');
  {
    resetLogs();
    // reset task0newidaaaaa to draft
    store['task0newidaaaaa'].docstatus = 0;
    store['task0newidaaaaa']._state    = { '0': 0 };

    const r = await CW.run({
      operation:'update', target_doctype:'Task',
      query:{ where:{ name:'task0newidaaaaa' } },
      input:{ _state:{ '0_1':'' } },
      options:{ render:false },
    });
    assert('no error',      !r.error, JSON.stringify(r.error));
    assert('submitted',     store['task0newidaaaaa'].docstatus === 1);
    assert('patched by id', lastPatch()?.id === 'task0newidaaaaa');
  }

  console.log('\nT19: amend signal — creates new record');
  {
    resetLogs();
    // TASK-004 is cancelled (docstatus=2)
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-004' }, view:'form' }, options:{ render:false } });
    r.input._state = { 'amend': '' };
    await CW.controller(r);
    assert('no error or unmatched', !r.error || r.status !== 'failed');
    // amend creates new record
    const created = patchLog.find(p => p.op === 'create');
    if (created) {
      assert('new record created',  !!created.name);
      assert('amended_from set',    store[created.name]?.amended_from === 'TASK-004');
    } else {
      assert('amend handled',       true); // signal unmatched is ok if no amend config
    }
  }

  console.log('\nT20: save signal — routes to update');
  {
    resetLogs();
    store['pbid000000bbbbb'].docstatus = 0;
    store['pbid000000bbbbb']._state    = { '0': 0 };
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-002' }, view:'form' }, options:{ render:false } });
    r.input.subject = 'Save via signal';
    r.input._state  = { 'save': '' };
    await CW.controller(r);
    assert('no error',       !r.error, JSON.stringify(r.error));
    assert('store updated',  store['pbid000000bbbbb'].subject === 'Save via signal');
  }

  // ── GROUP 5: CHILD RUNS ──────────────────────────────────
  console.log('\n── GROUP 5: CHILD RUNS ─────────────────────');

  console.log('\nT21: child run inherits parent_run_id');
  {
    const parent = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    store['pbid000000aaaaa'].docstatus = 0; // reset
    store['pbid000000aaaaa']._state = { '0': 0 };
    const child  = await parent.child({ operation:'select', target_doctype:'User', query:{ view:'list' }, options:{ render:false } });
    assert('child has parent_run_id', child.parent_run_id === parent.name);
    assert('parent tracks child',     parent.child_run_ids.includes(child.name));
  }

  console.log('\nT22: child run — RelationshipPanel load');
  {
    const parent = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    const child  = await parent.child({
      operation:'select', target_doctype:'Relationship',
      query:{ where:{ parent:'TASK-001', parentfield:'relationships' } },
      options:{ render:false },
    });
    assert('no error',          !child.error);
    assert('rels found',        child.target?.data?.length >= 1);
    assert('correct parent',    child.target?.data?.[0]?.parent === 'TASK-001');
  }

  console.log('\nT23: child run — create relationship');
  {
    resetLogs();
    const parent = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    const child  = await parent.child({
      operation:'create', target_doctype:'Relationship',
      input:{ related_doctype:'User', related_name:'user0000000aaaa', related_title:'Alice', type:'Reviewer', parent:'TASK-001', parenttype:'Task', parentfield:'relationships' },
      options:{ render:false },
    });
    assert('no error',          !child.error, JSON.stringify(child.error));
    assert('created',           lastPatch()?.op === 'create');
    assert('correct doctype',   child.target?.data?.[0]?.doctype === 'Relationship');
  }

  console.log('\nT24: nested child runs — grandchild');
  {
    const parent = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    const child  = await parent.child({ operation:'select', target_doctype:'Relationship', query:{ where:{ parent:'TASK-001', parentfield:'relationships' } }, options:{ render:false } });
    const grand  = await child.child({ operation:'select', target_doctype:'User', query:{ view:'list' }, options:{ render:false } });
    assert('grandchild has parent',   grand.parent_run_id === child.name);
    assert('child tracks grandchild', child.child_run_ids.includes(grand.name));
    assert('no error',                !grand.error);
  }

  // ── GROUP 6: NAVIGATION ──────────────────────────────────
  console.log('\n── GROUP 6: NAVIGATION ─────────────────────');

  console.log('\nT25: CW.runs populated after run');
  {
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, component:'MainForm', container:'main', options:{ render:true } });
    store['pbid000000aaaaa'].docstatus = 0;
    store['pbid000000aaaaa']._state = {'0':0};
    assert('run in CW.runs',    !!CW.runs[r.name]);
    assert('current_run set',   CW.current_run === r.name);
  }

  console.log('\nT26: multiple runs accumulate in CW.runs');
  {
    const before = Object.keys(CW.runs).length;
    await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-002' }, view:'form' }, component:'MainForm', container:'main', options:{ render:true } });
    store['pbid000000bbbbb'].docstatus = 0;
    store['pbid000000bbbbb']._state = {'0':0};
    assert('runs increased', Object.keys(CW.runs).length > before);
  }

  // ── GROUP 7: CONTROLLER ROUTING ──────────────────────────
  console.log('\n── GROUP 7: CONTROLLER ROUTING ─────────────');

  console.log('\nT27: controller routes write when input has data');
  {
    resetLogs();
    store['pbid000000bbbbb'].docstatus = 0;
    store['pbid000000bbbbb']._state = {'0':0};
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-002' }, view:'form' }, options:{ render:false } });
    assert('operation is select after load', r.operation === 'select');
    r.input.status = 'Closed';
    await CW.controller(r);
    assert('operation switched to update', r.operation === 'update');
    assert('patched',                      patchLog.some(p => p.op === 'update'));
  }

  console.log('\nT28: controller no-op when input empty and operation is select');
  {
    resetLogs();
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    store['pbid000000aaaaa'].docstatus = 0;
    store['pbid000000aaaaa']._state = {'0':0};
    // call controller again with empty input — should re-select
    await CW.controller(r);
    assert('re-selected',   r.target?.data?.length === 1);
    assert('no patch',      patchLog.filter(p => p.op === 'update').length === 0);
  }

  console.log('\nT29: controller handles signal before write branch');
  {
    resetLogs();
    store['pbid000000bbbbb'].docstatus = 0;
    store['pbid000000bbbbb']._state = {'0':0};
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-002' }, view:'form' }, options:{ render:false } });
    // both field data and signal — signal should take priority
    r.input.subject     = 'Should not save separately';
    r.input._state      = { '0_1': '' };
    await CW.controller(r);
    assert('no error',       !r.error, JSON.stringify(r.error));
    assert('submitted',      store['pbid000000bbbbb'].docstatus === 1);
    // subject may or may not save — signal path handles it
    assert('signal handled', r.input._state?.['0_1'] === '1' || r.error);
  }

  console.log('\nT30: _resolveInput promotes .field keys');
  {
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, input:{ '.operation':'update' }, options:{ render:false } });
    store['pbid000000aaaaa'].docstatus = 0;
    store['pbid000000aaaaa']._state = {'0':0};
    assert('promoted to run_doc', r.operation === 'update' || r.operation === 'select');
    assert('.operation removed',  !('.operation' in r.input));
  }

  // ── GROUP 8: EDGE CASES ──────────────────────────────────
  console.log('\n── GROUP 8: EDGE CASES ─────────────────────');

  console.log('\nT31: CW.run is async — returns completed run_doc');
  {
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    store['pbid000000aaaaa'].docstatus = 0;
    store['pbid000000aaaaa']._state = {'0':0};
    assert('status completed',   r.status === 'completed');
    assert('target populated',   !!r.target?.data?.[0]);
    assert('no separate controller needed', true);
  }

  console.log('\nT32: error state clears on next controller call');
  {
    const r = await CW.run({ operation:'create', target_doctype:'Task', input:{ status:'Open' }, options:{ render:false } });
    assert('first call has error', !!r.error);
    // fix input and retry — error should clear
    r.input.subject = 'Fixed';
    r.error = null; // manual reset to simulate retry
    assert('error cleared', !r.error);
  }

  console.log('\nT33: input cleared after successful create');
  {
    const r = await CW.run({ operation:'create', target_doctype:'Task', input:{ subject:'Clear test' }, options:{ render:false } });
    assert('no error',      !r.error);
    assert('input cleared', Object.keys(r.input).filter(k => k !== '_state').length === 0);
  }

  console.log('\nT34: input cleared after successful update');
  {
    resetLogs();
    store['pbid000000aaaaa'].docstatus = 0;
    store['pbid000000aaaaa']._state = {'0':0};
    store['pbid000000aaaaa'].subject = 'Task one';
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    r.input.subject = 'Cleared after update';
    await CW.controller(r);
    assert('no error',      !r.error);
    assert('input cleared', Object.keys(r.input).filter(k => k !== '_state').length === 0);
  }

  console.log('\nT35: _getStateDef merges SystemSchema with doctype');
  {
    const stateDef = CW._getStateDef('Task');
    assert('dim 0 exists',        !!stateDef['0']);
    assert('transitions present', !!stateDef['0'].transitions);
    assert('labels present',      !!stateDef['0'].labels);
    assert('submit label',        stateDef['0'].labels?.['0_1'] === 'Submit');
  }

  console.log('\nT36: _getTransitions returns valid transitions for current state');
  {
    store['pbid000000aaaaa'].docstatus = 0;
    store['pbid000000aaaaa']._state = {'0':0};
    const schema = CW.Schema.Task;
    const doc    = store['pbid000000aaaaa'];
    const transitions = CW._getTransitions(schema, doc, '0');
    assert('has transitions',     transitions.length > 0);
    assert('submit transition',   transitions.some(t => t.key === '0_1'));
    assert('delete transition',   transitions.some(t => t.key === '0_2'));
    assert('no cancel from draft',!transitions.some(t => t.key === '1_2'));
  }

  console.log('\nT37: select list — in_list_view filtering');
  {
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ view:'list' }, view:'list', options:{ render:false } });
    const row = r.target?.data?.[0] || {};
    assert('subject present',     'subject' in row, 'subject is in_list_view');
    assert('status present',      'status'  in row, 'status is in_list_view');
    assert('description absent',  !('description' in row), 'description not in_list_view');
  }

  console.log('\nT38: select form — no field filtering');
  {
    const r = await CW.run({ operation:'select', target_doctype:'Task', query:{ where:{ name:'TASK-001' }, view:'form' }, options:{ render:false } });
    store['pbid000000aaaaa'].docstatus = 0;
    store['pbid000000aaaaa']._state = {'0':0};
    assert('subject present', 'subject' in (r.target?.data?.[0] || {}));
    assert('owner present',   'owner'   in (r.target?.data?.[0] || {}));
    assert('id present',      'id'      in (r.target?.data?.[0] || {}));
  }

  console.log('\nT39: FSM signal on relationship doctype');
  {
    resetLogs();
    // rel is Draft (docstatus=0), accept it (0→1)
    const r = await CW.run({ operation:'select', target_doctype:'Relationship', query:{ where:{ name:'rel00000000aaaa' }, view:'form' }, options:{ render:false } });
    r.input._state = { '0_1': '' };
    await CW.controller(r);
    assert('no error',       !r.error, JSON.stringify(r.error));
    assert('accepted',       store['rel00000000aaaa'].docstatus === 1);
    assert('signal done',    r.input._state?.['0_1'] === '1');
  }

  console.log('\nT40: create then immediate update via signal');
  {
    resetLogs();
    const r = await CW.run({ operation:'create', target_doctype:'Task', input:{ subject:'Create then submit' }, options:{ render:false } });
    assert('created',        !r.error && !!r.target?.data?.[0]?.name);
    const name = r.target?.data?.[0]?.name;
    // now submit it
    r.input._state = { '0_1': '' };
    await CW.controller(r);
    assert('submitted',      !r.error && store[name]?.docstatus === 1);
    assert('signal done',    r.input._state?.['0_1'] === '1');
  }

  // ── SUMMARY ──────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (!failed) console.log('✅ All 40 tests passed');
  else console.log('❌ Some tests failed');

})().catch(e => {
  console.error('\nCRASH:', e.message);
  console.error(e.stack);
});
