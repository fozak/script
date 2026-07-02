(async () => {

// ─── 1. AGENT SCHEMA ───────────────────────────────────────────────────────

CW.Schema['Agent'] = {
  name:         'schema23456789z',
  doctype:      'Schema',
  docstatus:    1,
  module:       'Core',
  autoname:     'field:name',
  track_changes: 0,
  _state: {
    '1': {
      values:      [0, 1, 2],
      options:     ['Pending', 'Running', 'Done'],
      transitions: { '0': [1], '1': [2] },
      labels:      { '0_1': 'Run', '1_2': 'Complete' },
      sideEffects: {},   // empty — agentFn assigned below
    }
  },
  fields: [
    { fieldname: 'name',    fieldtype: 'Data', label: 'Name',   reqd: 1 },
    { fieldname: 'prompt',  fieldtype: 'Text', label: 'Prompt'           },
    { fieldname: 'result',  fieldtype: 'Text', label: 'Result'           },
  ]
};

// ─── 2. INJECT SIDEEFFECT — without AI, hardcoded fn ──────────────────────

const agentFn = async function (run_doc) {
  console.log('[Agent] sideEffect fired — prompt:', run_doc.target.data[0].prompt);

  // simulate: select open Tasks
  const sel = await run_doc.child({
    operation:      'select',
    target_doctype: 'Task',
    query:          { where: { status: 'Pending' } },
    options:        { render: false },
  });

  console.log('[Agent] select result:', sel.status, sel.target?.data?.length, 'tasks');
  if (sel.error) { run_doc.error = sel.error; return; }

  // update each task exp_end_date + 30 days
  for (const task of sel.target?.data || []) {
    const d = task.exp_end_date ? new Date(task.exp_end_date) : new Date();
    d.setDate(d.getDate() + 30);
    const upd = await run_doc.child({
      operation:      'update',
      target_doctype: 'Task',
      query:          { where: { name: task.name } },
      input:          { exp_end_date: d.toISOString().slice(0, 10) },
      options:        { render: false },
    });
    console.log('[Agent] update', task.name, '->', upd.status);
    if (upd.error) { run_doc.error = upd.error; return; }
  }

  run_doc.target.data[0].result = `Updated ${sel.target?.data?.length} tasks`;
};

// inject into stateDef slot
CW.Schema['Agent']._state['1'].sideEffects['0_1'] = agentFn;  // ← source of truth

// ─── 3. RUN ────────────────────────────────────────────────────────────────

const agent = await CW.run({
  operation:      'create',
  target_doctype: 'Agent',
  input: {
    name:   generateId('Agent'),
    prompt: 'select all Tasks with open status, update closure date +30 days',
    _state: { '1.0_1': '' },   // fire the slot
  },
  options: { render: false },
});

// ─── 4. INSPECT ────────────────────────────────────────────────────────────

console.log('Agent status:', agent.status);
console.log('Agent result:', agent.target?.data?.[0]?.result);
console.log('Run tree:');
agent.child_run_ids.forEach(id => {
  const r = CW.runs[id];
  console.log(' ', r.operation, r.target_doctype,
    'status:', r.status,
    'records:', r.target?.data?.length ?? '-',
    r.error ? 'ERR:' + r.error : ''
  );
});

})();