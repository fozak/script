(async () => {
  // ── mock infrastructure ────────────────────────────────────────────────────

  const CW = { runs: {} };

  function tryParseJSON(val) {
    if (val === null || val === undefined) return val;
    if (typeof val !== 'string') return val;
    try { return JSON.parse(val); } catch { return val; }
  }

  function generateId(prefix) {
    return (prefix || 'run').toLowerCase().replace(/\s/g, '') +
      Math.random().toString(36).slice(2, 10);
  }

  async function mockAdapter(run_doc) {
    await new Promise(r => setTimeout(r, 10));

    if (run_doc.operation === 'select' && run_doc.target_doctype === 'Run') {
      const record = fakeDB.Run[run_doc.query?.where?.name];
      if (!record) throw new Error(`Run not found: ${run_doc.query?.where?.name}`);
      run_doc.target = { data: [record] };

    } else if (run_doc.operation === 'select' && run_doc.target_doctype === 'Task') {
      run_doc.target = { data: Object.values(fakeDB.Task) };

    } else if (run_doc.operation === 'select' && run_doc.target_doctype === 'SalesInvoice') {
      run_doc.target = { data: Object.values(fakeDB.SalesInvoice) };

    } else if (run_doc.operation === 'update' && run_doc.target_doctype === 'SalesInvoice') {
      const name = run_doc.query?.where?.name;
      if (name && fakeDB.SalesInvoice[name]) {
        Object.assign(fakeDB.SalesInvoice[name], run_doc.input);
        run_doc.target = { data: [fakeDB.SalesInvoice[name]] };
        console.log(`  ✅ updated SalesInvoice "${name}"`, run_doc.input);
      } else {
        console.warn(`  ⚠️ update skipped — no name in query`, run_doc.query);
        run_doc.target = { data: [] };
      }

    } else {
      run_doc.target = { data: [] };
    }

    run_doc.status  = 'completed';
    run_doc.success = true;
  }

  CW.run = async function (op) {
    const run_doc = {
      name:           generateId('run'),
      operation:      op.operation,
      target_doctype: op.target_doctype,
      query:          op.query  || {},
      input:          op.input  || {},
      view:           op.view,
      options:        op.options || {},
      parent_run_id:  op.parent_run_id || null,
      child_run_ids:  [],
      target:         null,
      status:         'pending',
      success:        false,
    };

    run_doc.child = async function (childOp) {
      childOp.parent_run_id = run_doc.name;
      const child = await CW.run(childOp);
      if (!run_doc.child_run_ids.includes(child.name)) {
        run_doc.child_run_ids.push(child.name);
      }
      return child;
    };

    CW.runs[run_doc.name] = run_doc;
    await mockAdapter(run_doc);
    return run_doc;
  };

  // ── fake database ──────────────────────────────────────────────────────────

  const fakeDB = {
    Run: {
      'notebook-001': {
        name:      'notebook-001',
        operation: 'chain',
        steps:     JSON.stringify([
          { name: 'cell-select-tasks'    },
          { name: 'cell-select-invoices' },
          { name: 'cell-script-update'   },
        ]),
        code:  null,
        query: null,
        input: null,
      },
      'cell-select-tasks': {
        name:           'cell-select-tasks',
        operation:      'select',
        target_doctype: 'Task',
        steps:          null,
        code:           null,
        query:          JSON.stringify({ where: {} }),
        input:          null,
      },
      'cell-select-invoices': {
        name:           'cell-select-invoices',
        operation:      'select',
        target_doctype: 'SalesInvoice',
        steps:          null,
        code:           null,
        query:          JSON.stringify({ where: {} }),
        input:          null,
      },
      'cell-script-update': {
        name:           'cell-script-update',
        operation:      'update',
        target_doctype: 'SalesInvoice',
        steps:          null,
        code: `
          const doc = run_doc.source;
          return {
            _name:     doc.name,
            status:    'Paid',
            paid_date: '2026-07-31',
            _note:     'set by runChain script cell',
          };
        `,
        query: null,
        input: null,
      },
    },

    Task: {
      'task-001': { name: 'task-001', title: 'Review INV-001', due_date: '2026-08-01' },
      'task-002': { name: 'task-002', title: 'Review INV-002', due_date: '2026-08-15' },
      'task-003': { name: 'task-003', title: 'Review INV-003', due_date: '2026-09-01' },
    },

    SalesInvoice: {
      'inv-001': { name: 'inv-001', amount: 1200, status: 'Unpaid', paid_date: null },
      'inv-002': { name: 'inv-002', amount:  850, status: 'Unpaid', paid_date: null },
      'inv-003': { name: 'inv-003', amount: 3400, status: 'Unpaid', paid_date: null },
    },
  };

  // ── runChain ───────────────────────────────────────────────────────────────

  async function runChain(notebookName, data_prev = null) {

    const notebook_run = await CW.run({
      operation:      'select',
      target_doctype: 'Run',
      query:          { where: { name: notebookName } },
      view:           'form',
      options:        { render: false }
    });

    const cells = tryParseJSON(notebook_run.target.data[0].steps);
    data_prev = data_prev ?? notebook_run;

    for (const cell of cells) {

      const t = await data_prev.child({
        operation:      'select',
        target_doctype: 'Run',
        query:          { where: { name: cell.name } },
        view:           'form',
        options:        { render: false }
      });
      const template = t.target.data[0];

      console.log(`\n── cell: ${template.name} ──`);
      console.log(`   dispatch: ${template.steps?.length ? 'notebook' : template.code ? 'script' : 'operation'}`);

      if (template.steps?.length) {
        data_prev = await runChain(template.name, data_prev);

      } else if (template.code) {
        // per-doc updates — script returns { _name, ...patch }
        const fn   = new Function('run_doc', template.code);
        const docs = data_prev.target.data;
        const last = [];

        for (const doc of docs) {
          const patch = fn({ source: doc });
          const name  = patch._name ?? doc.name;
          const { _name, ...input } = patch;

          const r = await t.child({
            operation:      template.operation ?? 'update',
            target_doctype: template.target_doctype,
            query:          { where: { name } },
            input,
            options:        { render: false }
          });
          last.push(r);
        }

        // data_prev becomes the last update run
        data_prev = last[last.length - 1];

      } else {
        data_prev = await t.child({
          operation:      template.operation,
          target_doctype: template.target_doctype,
          query:          tryParseJSON(template.query),
          input:          tryParseJSON(template.input),
          options:        { render: false }
        });
        console.log(`   target.data (${data_prev.target.data.length} records):`,
          data_prev.target.data.map(d => d.name));
      }
    }

    return data_prev;
  }

  // ── tree printer ───────────────────────────────────────────────────────────

  function printTree(runs) {
    const byParent = {};
    for (const r of Object.values(runs)) {
      const p = r.parent_run_id ?? '__root__';
      (byParent[p] = byParent[p] || []).push(r);
    }
    function walk(parentId, depth) {
      for (const r of byParent[parentId] || []) {
        const indent = '    '.repeat(depth) + (depth ? '└── ' : '');
        console.log(`${indent}${r.name}  ${r.operation} ${r.target_doctype ?? ''}  [${r.status}]`);
        walk(r.name, depth + 1);
      }
    }
    walk('__root__', 0);
  }

  // ── run ────────────────────────────────────────────────────────────────────

  console.log('═══ runChain test start ═══\n');
  console.log('SalesInvoice BEFORE:', JSON.parse(JSON.stringify(fakeDB.SalesInvoice)));

  const result = await runChain('notebook-001');

  console.log('\nSalesInvoice AFTER:', JSON.parse(JSON.stringify(fakeDB.SalesInvoice)));

  console.log('\n═══ CW.runs tree ═══');
  printTree(CW.runs);

  console.log('\n═══ final data_prev ═══');
  console.log('name:',    result.name);
  console.log('op:',      result.operation);
  console.log('doctype:', result.target_doctype);
  console.log('target:',  result.target);

  console.log('\n═══ done ═══');
})();