// ============================================================
// CW-run.js — refactored
// Signal format: "dim.from_to" — e.g. "0.0_1", "1.0_1"
// FSM pure helpers in CW-utils.js
// target.data[0] is single source of truth
// input is cleared after _mergeInput — all reads from target
// ============================================================

//const CW = globalThis.CW;



// ============================================================
// RESOLVER
// ============================================================

CW._resolveAll = function (op) {
  const cfg = CW._config;

  op.operation =
    cfg.operationAliases?.[op.operation?.toLowerCase()] || op.operation;

  const dtMap = cfg.doctypeAliases || {};
  op.source_doctype = op.source_doctype
    ? dtMap[op.source_doctype.toLowerCase()] || op.source_doctype
    : null;
  op.target_doctype = op.target_doctype
    ? dtMap[op.target_doctype.toLowerCase()] || op.target_doctype
    : null;

  const opConfig    = cfg.operations?.[op.operation] || {};
  /* const adapterType = opConfig.adapterType || 'db';
  op.adapter        = cfg.adapters?.defaults?.[adapterType] || cfg.adapters?.defaults?.db; */

  const adapterType = opConfig.adapterType || 'db';
//const doctypeOverride = cfg.adapters?.doctypeAdapters?.[run_doc.target_doctype];

const doctypeOverride = cfg.adapters?.doctypeAdapters?.[op.target_doctype];
op.adapter = doctypeOverride 
  || cfg.adapters?.defaults?.[adapterType] 
  || cfg.adapters?.defaults?.db;

  const view       = cfg.operationToView?.[op.operation] ?? null;
  const viewConfig = cfg.views?.[view?.toLowerCase()] || {};
  op.view          = 'view' in op ? op.view : view;

  // skip component/container resolution for child runs
if (op.parent_run_id && op.options?.render === false) {
  if (!('component' in op)) op.component = null;
  if (!('container' in op)) op.container = null;
  return;
}

  const resolvedView = op.view || view;
  if (!('component' in op) || !('container' in op)) {
    let resolved = null;
    if (resolvedView && CW._resolveViewComponent) {
      resolved = CW._resolveViewComponent(op.target_doctype, resolvedView, op.container);
    }
    if (resolved && typeof resolved === 'object') {
      if (!('component' in op)) op.component = resolved.component ?? null;
      if (!('container' in op)) op.container = resolved.container ?? viewConfig.container ?? null;
    } else {
      if (!('component' in op)) op.component = (typeof resolved === 'string' ? resolved : null) ?? viewConfig.component ?? null;
      if (!('container' in op)) op.container = viewConfig.container ?? null;
    }
  }
};

// ============================================================
// RESOLVE INPUT — meta channel: input['.field'] → run_doc.field
// ============================================================

CW._resolveInput = function (run_doc) {
  for (const [key, value] of Object.entries(run_doc.input)) {
    if (key.startsWith('.')) {
      run_doc[key.slice(1)] = value;
      delete run_doc.input[key];
    }
  }
};

// ============================================================
// MERGE INPUT → target.data[0]
// Everything including virtual and _state
// ============================================================

CW._mergeInput = function (run_doc) {
  if (!run_doc.target) run_doc.target = { data: [{}] };
  if (!run_doc.target.data) run_doc.target.data = [{}];
  if (!run_doc.target.data[0]) run_doc.target.data[0] = {};

  const doc = run_doc.target.data[0];

  for (const [k, v] of Object.entries(run_doc.input)) {
    if (k === '_state') continue;
    doc[k] = v;
  }

  if (run_doc.input._state && typeof run_doc.input._state === 'object') {
    if (!doc._state) doc._state = {};
    const inputState  = run_doc.input._state;
    const targetState = doc._state;

    // preserve history — only overwrite the exact incoming signal keys
    //for (const sig of Object.keys(inputState)) {
    //  delete targetState[sig];
    //}
    Object.assign(targetState, inputState);
  }
};

// ============================================================
// CLEAR INPUT — empty input after merge, preserve _state shape
// ============================================================

CW._clearInput = function (run_doc) {
  run_doc.input = { _state: {} };
};

// ============================================================
// STRIP VIRTUAL — remove virtual fields from target before persist
// ============================================================

CW._stripVirtual = function (run_doc) {
  const schema = CW.Schema?.[run_doc.target_doctype];
  const doc    = run_doc.target?.data?.[0];
  if (!schema?.fields || !doc) return;
  schema.fields.filter(f => f.virtual).forEach(f => delete doc[f.fieldname]);
};

// ============================================================
// _execTransition — fire sideEffects + sync docstatus + view switch
// ============================================================

CW._execTransition = async function (run_doc, dim, key) {
  const doctype  = run_doc.target_doctype;
  const stateDef = CW._getStateDef(doctype);
  const dimDef   = stateDef[dim];
  if (!dimDef) return;

  // collect and fire sideEffects
  const effects = Object.entries(dimDef.sideEffects || {}).filter(
    ([k]) => k === key || k.startsWith(key + '.'),
  );

  for (const [effectKey, fn] of effects) {
    if (effectKey === key) {
      if (typeof fn === 'function') {
        await fn(run_doc);
      } else if (typeof fn === 'string') {
        // string path — resolve from globalThis e.g. "Adapter.pocketbase.signUp"
        const path   = fn.split('.');
        let resolved = globalThis;
        for (const p of path) resolved = resolved?.[p];
        if (typeof resolved === 'function') await resolved(run_doc);
        else console.warn('[CW] Effect not found:', fn);
      }
    } else {
      const path   = effectKey.slice(key.length + 1).split('.');
      let target   = globalThis;
      for (const p of path) target = target?.[p];
      if (typeof target === 'function') await target(run_doc);
      else console.warn('[CW] Adapter effect not found:', effectKey.slice(key.length + 1));
    }
  }

  // sync docstatus for dim 0 → target.data[0]
  const to  = parseInt(key.split('_')[1]);
  const doc = run_doc.target?.data?.[0];
  if (doc && String(dim) === '0') {
    doc.docstatus = to;
  }

  // view switch after transition
  if (run_doc.container && dimDef.views?.[String(to)]) {
    const view      = dimDef.views[String(to)];
    const resolved  = CW._resolveViewComponent(doctype, view, run_doc.container);
    const component = resolved?.component ?? (typeof resolved === 'string' ? resolved : null);
    const container = run_doc.container || resolved?.container || CW._config.views?.[view]?.container;
    if (component) {
      await run_doc.child({
        operation:      'select',
        target_doctype: doctype,
        query:          { where: { name: run_doc.target?.data?.[0]?.name || run_doc.query?.where?.name } },
        view, component, container,
        options:        { render: true },
        source_field:   '_state',   // ← add
      });
    }
  }
};

// ============================================================
// HANDLE SIGNAL
// Reads signal from target.data[0]._state
// All reads/writes go to target.data[0]
// ============================================================

CW._handleSignal = async function (run_doc) {
  const _savedInternal = run_doc.options?.internal;
  if (!run_doc.options) run_doc.options = {};
  run_doc.options.internal = true;

  const signal   = run_doc._signal;
  const doctype  = run_doc.target_doctype;
  const schema   = CW.Schema?.[doctype];
  //const db       = CW._config.adapters.defaults.db;  //NEVER used
  const doc      = run_doc.target?.data?.[0] || {};

  const stateDef = CW._getStateDef(doctype);

const _failSignal = (err, dim, fromVal) => {
  run_doc.error = err;
  if (doc._state && dim !== undefined) {
    doc._state[signal] = '-1';
    doc._state[dim] = fromVal;
  }
  run_doc.options.internal = _savedInternal;
};

  let matched = false;

  for (const [dim, dimDef] of Object.entries(stateDef)) {
    if (!signal.startsWith(dim + '.')) continue;
    const key = signal.slice(dim.length + 1);

    if (dimDef.sideEffects?.[key] === undefined && dimDef.labels?.[key] === undefined) continue;

    const currentVal = CW._getDimValue(doc, dim, dimDef);
    const fromVal    = parseInt(key.split('_')[0]);
    const toVal      = parseInt(key.split('_')[1]);

    if (!isNaN(fromVal) && !isNaN(toVal)) {
      const validTos = dimDef.transitions?.[String(currentVal)] || [];
      if (fromVal !== currentVal || !validTos.includes(toVal)) {
        _failSignal(`Transition ${key} not allowed from current state ${currentVal} (dim ${dim})`);
        return;
      }
    }

    const requires  = dimDef.requires?.[key] || {};
    const reqPassed = Object.entries(requires).every(
      ([k, v]) => Number(schema?.[k] ?? 0) === Number(v),
    );
    if (!reqPassed) {
      _failSignal(`${signal} not allowed for this doctype`);
      return;
    }

    const rule = dimDef.rules?.[key];
    if (typeof rule === 'function' && !rule(run_doc)) {
      _failSignal(`${signal} rule not satisfied`);
      return;
    }

    try {
      await CW._execTransition(run_doc, dim, key);

      // preserve full history — mark signal success
      if (!doc._state) doc._state = {};
      doc._state[signal] = '1';
      doc._state[dim] = toVal;   // ← ADDed THIS LINE

      // also mark in input._state so _preflight picks it up for DB write
      run_doc.input._state[signal] = '1';

      run_doc.operation = doc.name ? 'update' : 'create';
      if (run_doc.operation === 'update') {
        await CW._handlers.update(run_doc);
      } else {
        await CW._handlers.create(run_doc);
      }

    } catch (e) {
      _failSignal(e.message);
    }

    matched = true;
    break;
  }

  if (!matched) {
    if (signal === 'save') {
      run_doc.operation = doc.name ? 'update' : 'create';
      await CW._handlers[run_doc.operation](run_doc);

    } else if (signal === 'submit') {
      doc.docstatus    = 1;
      run_doc.operation = 'update';
      await CW._handlers.update(run_doc);

    } else if (signal === 'cancel') {
      doc.docstatus    = 2;
      run_doc.operation = 'update';
      await CW._handlers.update(run_doc);

    } else if (signal === 'amend') {
      if ((doc.docstatus ?? 0) !== 2) {
        _failSignal('amend only allowed on cancelled records (docstatus=2)');
        return;
      }
      const skipAmend = new Set(['name','id','created','modified','modified_by','_state','docstatus','amended_from']);
      const newDoc = {};
      for (const [k, v] of Object.entries(doc)) {
        if (!skipAmend.has(k)) newDoc[k] = v;
      }
      newDoc.amended_from = doc.name;
      newDoc.docstatus    = 0;
      run_doc.target      = { data: [newDoc] };
      run_doc.operation   = 'create';
      await CW._handlers.create(run_doc);

    } else {
      _failSignal(`Unknown signal: ${signal}`);
    }
  }

  run_doc.options.internal = _savedInternal;

  if (!run_doc.error) {
    if (run_doc.operation === 'create' && run_doc.target?.data?.[0]?.name) {
      run_doc.query = Object.assign({}, run_doc.query, {
        where: { name: run_doc.target.data[0].name },
      });
    }
  }
};

// ============================================================
// CW._expand 
// ============================================================

CW._getChildRun = function (run_doc, fieldname) {
  if (!fieldname) return null;
  return run_doc.child_run_ids
    .map(id => CW.runs[id])
    .find(r => r?.source_field === fieldname) || null;
};


//=============================================================


CW._expand = async function (run_doc, fieldname) {
  const schema  = CW.Schema?.[run_doc.target_doctype];
  const doc     = run_doc.target?.data?.[0];
  const docName = doc?.name;
  if (!schema || !docName) return;

  const fields = fieldname
    ? schema.fields?.filter(f => f.fieldname === fieldname)
    : schema.fields?.filter(f =>
        f.fieldtype === 'Table'              ||
        f.fieldtype === 'Relationship Panel' ||
        f.fieldtype === 'Link'               ||
        f.fieldtype === 'ChildRun'
      );

  const promises = [];
  for (const field of fields || []) {
    const exists = run_doc.child_run_ids
      .some(id => CW.runs[id]?.source_field === field.fieldname);
    if (exists) continue;

    if (field.fieldtype === 'ChildRun') {
      promises.push(run_doc.child({
        ...field.run_args,
        operation:    field.run_args?.operation || 'select',
        query:        CW._resolveQuery(run_doc, field.fieldname),
        source_field: field.fieldname,
        options:      { render: false },
        component:    null,
        container:    null,
      }));
      continue;
    }

    if (field.fieldtype === 'Link') {
      const val = doc[field.fieldname];
      if (!val) continue;
      promises.push(run_doc.child({
        operation:      'select',
        target_doctype: field.options,
        query:          { where: { name: val } },
        source_field:   field.fieldname,
        options:        { render: false },
        view:           'list',
        component:      null,
        container:      null,
      }));
      continue;
    }

    promises.push(run_doc.child({
      operation:      'select',
      target_doctype: field.options,
      query:          { where: { parent: docName } },
      source_field:   field.fieldname,
      options:        { render: false },
      view:           'list',
      component:      null,
      container:      null,
    }));
  }

  await Promise.all(promises);
};

// ============================================================
// CONTROLLER
// ============================================================

CW.controller = async function (run_doc) {
  run_doc.status = 'running';
  run_doc.error  = null;

  try {
    // 1. meta channel — input['.field'] → run_doc.field
    CW._resolveInput(run_doc);

if (
  (run_doc.operation === 'update' || run_doc.operation === 'delete') &&
  !run_doc.target?.data?.[0]?.name
) {
  //await globalThis.Adapter[CW._config.adapters.defaults.db].select(run_doc)

   await CW._handlers.select(run_doc);
}

    await CW._logChanges(run_doc)  // ← before merge

    // 2. merge all input → target.data[0] (including virtual + _state)
    CW._mergeInput(run_doc);

    // 3. clear input — everything is now in target.data[0]
    CW._clearInput(run_doc);

    const doc = run_doc.target?.data?.[0] || {};

    // 4. dispatch: signal or data or operation
    const signal = Object.entries(doc._state || {}).find(([,v]) => v === '');

    if (signal) {
      run_doc._signal = signal[0];
      await CW._handleSignal(run_doc);
    } else {
      const opConfig = CW._config.operations?.[run_doc.operation] || {};
      if (opConfig.type === 'read' || opConfig.type === 'auth') {
        await CW._handlers[run_doc.operation]?.(run_doc);
      } else {
        // data change — create or update
        const schema   = CW.Schema?.[run_doc.target_doctype];
        const autosave = schema?._autosave ?? 1;
        if (autosave !== 0) {
          run_doc.operation = doc.name ? 'update' : 'create';
          await CW._handlers[run_doc.operation](run_doc);
          if (!run_doc.error && run_doc.operation === 'create' && run_doc.target?.data?.[0]?.name) {
            run_doc.query = Object.assign({}, run_doc.query, {
              where: { name: run_doc.target.data[0].name },
            });
          }
        }
      }
    }

    run_doc.status  = run_doc.error ? 'failed' : 'completed';
    run_doc.success = !run_doc.error;

  } catch (err) {
    run_doc.error = {
      message: err.message,
      code:    `${run_doc.operation?.toUpperCase()}_FAILED`,
    };
    run_doc.status  = 'failed';
    run_doc.success = false;
  }

  run_doc.modified = Date.now();
  if (CW._updateFromRun) CW._updateFromRun(run_doc);
  if (CW._render && run_doc.options?.render === true) CW._render(run_doc);
};

// ============================================================
// RUN FACTORY
// ============================================================

CW.run = async function (op) {
  CW._resolveAll(op);

  const run_doc = {
    doctype:            'Run',
    name:               generateId('Run'),
    creation:           Date.now(),
    modified:           Date.now(),
    owner:              op.owner || 'system',
    modified_by:        op.owner || 'system',
    docstatus:          0,

    operation:          op.operation,
    operation_original: op.operation,
    source_doctype:     op.source_doctype,

    search:             op.search || '',
    source_field:       op.source_field ?? null,

    target_doctype:     op.target_doctype,
    adapter:            op.adapter,

    view:               op.view,
    component:          op.component,
    container:          op.container,
    context:            op.context || {},  //DO NOT USE IT

    query:              op.query  || {},
    target:             op.target || null,
    input:              op.input  || {},

    status:             'pending',
    success:            false,
    error:              null,

    parent_run_id:      op.parent_run_id || null,
    child_run_ids:      [],
    options:            op.options || {},
    user: op.user ?? {
      name:     globalThis.pb?.authStore?.model?.id     ?? null,
      email:    globalThis.pb?.authStore?.model?.email  ?? null,
      token:    globalThis.pb?.authStore?.token         ?? null,
      verified: globalThis.pb?.authStore?.model?.verified ?? false,
    },
  };

  run_doc.child = async function (childOp) {
    childOp.parent_run_id = run_doc.name;
    childOp.user          = childOp.user ?? run_doc.user;
    const child           = await CW.run(childOp);
    if (!run_doc.child_run_ids.includes(child.name)) {
      run_doc.child_run_ids.push(child.name);
    }
    return child;
  };

  CW.runs[run_doc.name] = run_doc;
  if (CW._updateFromRun) CW._updateFromRun(run_doc);
  await CW.controller(run_doc);
  return run_doc;
};

// ============================================================
// PREFLIGHT
// Operates on target.data[0] — not input
// ============================================================

CW._preflight = function (run_doc) {
  const operation = run_doc.operation;
  const schema = CW.Schema?.[run_doc.target_doctype];
  const doc    = run_doc.target?.data?.[0];
  if (!doc) return;

  if (operation === 'create') {
    // reqd validation
    if (schema?.fields) {
      const missing = schema.fields
        .filter(f =>
          f.reqd &&
          f.fieldtype !== 'Table' &&
          evaluateDependsOn(f.depends_on, doc, run_doc) &&
          (doc[f.fieldname] === undefined || doc[f.fieldname] === null || doc[f.fieldname] === ''),
        )
        .map(f => f.label || f.fieldname);
      if (missing.length) {
        run_doc.error = `Required: ${missing.join(', ')}`;
        return;
      }
    }

    // apply defaults
    if (schema?.fields) {
      for (const f of schema.fields) {
        if (f.default !== undefined && doc[f.fieldname] === undefined) {
          doc[f.fieldname] = f.default;
        }
      }
    }

    // initialize _state
    if (!doc._state) doc._state = {};

  }

  if (operation === 'update') {   //was if (operation === 'update'
    // reqd validation against target.data[0] (already merged)
    if (schema?.fields) {
      const missing = schema.fields
        .filter(f =>
          f.reqd &&
           !f.virtual &&
          f.fieldtype !== 'Table' &&
          evaluateDependsOn(f.depends_on, doc, run_doc) &&
          (doc[f.fieldname] === undefined || doc[f.fieldname] === null || doc[f.fieldname] === ''),
        )
        .map(f => f.label || f.fieldname);
      if (missing.length) {
        run_doc.error = `Required: ${missing.join(', ')}`;
        return;
      }
    }
  }

  // JSON stringify Code fields
  if (schema?.fields) {
    for (const f of schema.fields) {
      if (
        f.fieldtype === 'Code' &&
        f.options   === 'JSON' &&
        typeof doc[f.fieldname] === 'object'
      ) {
        if (f.fieldname === '_state') continue;
        doc[f.fieldname] = JSON.stringify(doc[f.fieldname]);
      }
    }
  }

  // systemFields — operate on target.data[0] via run_doc
  for (const sf of CW._config.systemFields || []) {
    if (sf.onWrite)                    sf.onWrite(run_doc);
    if (sf.onCreate && operation === 'create') sf.onCreate(run_doc);
  }
};

// ============================================================
// HANDLERS
// ============================================================

CW._handlers = {

  select: async function (run_doc) {
    /*const db = CW._config.adapters.defaults.db;
    await globalThis.Adapter[db].select(run_doc);*/

    await globalThis.Adapter[run_doc.adapter].select(run_doc); //insetad


    if (run_doc.error || !run_doc.target?.data) return;

    const schema     = CW.Schema?.[run_doc.target_doctype ?? run_doc.source_doctype];
    const activeView = run_doc.view || run_doc.query?.view || 'list';
    const sel        = run_doc.query?.select;

    if (schema && !sel) {
      const shouldFilter = activeView === 'list' || activeView === 'card';
      if (shouldFilter) {
        const viewFields   = schema.fields.filter(f => f.in_list_view).map(f => f.fieldname);
        const titleField   = schema.title_field ? [schema.title_field] : [];
        //const systemFields = (CW._config.systemFields || []).filter(sf => sf.fetch).map(sf => sf.name);
        //const fields       = [...new Set([...systemFields, ...titleField, ...viewFields])];
        const fields     = [...new Set([...titleField, ...viewFields])];
        run_doc.target.data = run_doc.target.data.map(item => {
          const filtered = {};
          fields.forEach(f => { if (f in item) filtered[f] = item[f]; });
          return filtered;
        });
      }
    } else if (sel && Array.isArray(sel)) {
      const titleField   = schema?.title_field ? [schema.title_field] : [];
      const systemFields = CW.defaultFields || [];
      const allFields    = [...new Set([...systemFields, ...titleField, ...sel])];
      run_doc.target.data = run_doc.target.data.map(item => {
        const filtered = {};
        allFields.forEach(f => { if (f in item) filtered[f] = item[f]; });
        return filtered;
      });
    }

    // expand child fields for form view — after data is ready
  if (run_doc.view === 'form' && run_doc.target?.data?.[0]?.name) {
    await CW._expand(run_doc);
  }
  },

  create: async function (run_doc) {
    CW._preflight(run_doc);
    if (run_doc.error) return;
    CW._stripVirtual(run_doc);  // strip virtual after validation, before DB write
    /* const db = CW._config.adapters.defaults.db;
    await globalThis.Adapter[db].create(run_doc); */
    await globalThis.Adapter[run_doc.adapter].create(run_doc);
  },

  update: async function (run_doc) {
    //const db  = CW._config.adapters.defaults.db;
    const doc = run_doc.target?.data?.[0];
    const name = doc?.name || run_doc.query?.where?.name;

    if (!name) {
      run_doc.error = 'Update requires a record name';
      return;
    }
    if (!run_doc.query?.where?.name) {
      run_doc.query = Object.assign({}, run_doc.query, { where: { name } });
    }

    const editable = (doc?.docstatus ?? 0) === 0;
    if (!editable && !run_doc.options?.internal) return;

    CW._preflight(run_doc);
    if (run_doc.error) return;
    CW._stripVirtual(run_doc);  // strip virtual after validation, before DB write
    //await globalThis.Adapter[db].update(run_doc);

    await globalThis.Adapter[run_doc.adapter].update(run_doc);
  },

  delete: async function (run_doc) {
    if (run_doc.target?.data?.[0]) run_doc.target.data[0].docstatus = 2;
    await CW._handlers.update(run_doc);
  },

};

console.log('✅ CW-run.js loaded (signal format: dim.from_to e.g. 0.0_1, 1.0_1)');
