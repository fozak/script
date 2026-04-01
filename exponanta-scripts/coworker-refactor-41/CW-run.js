// ============================================================
// CW-run.js
// ============================================================

const CW = globalThis.CW;

// ============================================================
// RESOLVER
// ============================================================

CW._resolveAll = function(op) {
  const cfg = CW._config;

  op.operation      = cfg.operationAliases?.[op.operation?.toLowerCase()] || op.operation;

  const dtMap       = cfg.doctypeAliases || {};
  op.source_doctype = op.source_doctype ? dtMap[op.source_doctype.toLowerCase()] || op.source_doctype : null;
  op.target_doctype = op.target_doctype ? dtMap[op.target_doctype.toLowerCase()] || op.target_doctype : null;

  const opConfig    = cfg.operations?.[op.operation] || {};
  const adapterType = opConfig.adapterType || "db";
  op.adapter        = cfg.adapters?.defaults?.[adapterType] || cfg.adapters?.defaults?.db;

  const view        = cfg.operationToView?.[op.operation] ?? null;
  const viewConfig  = cfg.views?.[view?.toLowerCase()] || {};
  op.view           = "view"      in op ? op.view      : view;
  op.component      = "component" in op ? op.component : (viewConfig.component ?? null);
  op.container      = "container" in op ? op.container : (viewConfig.container ?? null);
};

// ============================================================
// RESOLVE INPUT — promote .field keys to run_doc top level
// ============================================================

CW._resolveInput = function(run_doc) {
  for (const [key, value] of Object.entries(run_doc.input)) {
    if (key.startsWith(".")) {
      run_doc[key.slice(1)] = value;
      delete run_doc.input[key];
    }
  }
};

// ============================================================
// FSM HELPERS
// ============================================================

CW._getStateDef = function(doctype) {
  const sys  = CW.Schema?.SystemSchema?._state || {};
  const dt   = CW.Schema?.[doctype]?._state    || {};
  const dims = new Set([...Object.keys(sys), ...Object.keys(dt)]);
  const merged = {};
  for (const dim of dims) {
    merged[dim] = Object.assign({}, sys[dim] || {}, dt[dim] || {});
  }
  return merged;
};

CW._getDimValue = function(doc, dim, dimDef) {
  if (doc._state && dim in doc._state) return doc._state[dim];
  if (dimDef?.fieldname && dimDef.fieldname in doc) return doc[dimDef.fieldname];
  return dimDef?.values?.[0] ?? 0;
};

CW._getTransitions = function(schema, doc, dim) {
  const stateDef = CW._getStateDef(schema.schema_name || schema.name);
  const dimDef   = stateDef[dim];
  if (!dimDef) return [];

  const current  = CW._getDimValue(doc, dim, dimDef);
  const tos      = dimDef.transitions?.[String(current)] || [];

  return tos
    .map(to => {
      const key      = `${current}_${to}`;
      const requires = dimDef.requires?.[key] || {};
      const rule     = dimDef.rules?.[key];
      const reqPassed = Object.entries(requires).every(([k, v]) => Number(schema[k] ?? 0) === Number(v));
      const rulePassed = typeof rule === "function" ? rule({ target: { data: [doc] }, input: {} }) : true;
      if (!reqPassed || !rulePassed) return null;
      return { key, from: current, to, label: dimDef.labels?.[key], confirm: dimDef.confirm?.[key] };
    })
    .filter(Boolean);
};

CW._execTransition = async function(run_doc, dim, key) {
  const doctype  = run_doc.target_doctype;
  const stateDef = CW._getStateDef(doctype);
  const dimDef   = stateDef[dim];
  if (!dimDef) return;

  const sideEffect = dimDef.sideEffects?.[key];
  if (typeof sideEffect === "function") {
    await sideEffect(run_doc);
  }

  const to = parseInt(key.split("_")[1]);
  if (!run_doc.input._state || typeof run_doc.input._state !== "object") {
    run_doc.input._state = {};
  }
  run_doc.input._state[dim] = to;

  if (String(dim) === "0") {
    run_doc.input.docstatus = to;
  }
};

// ============================================================
// RUN FACTORY
// ============================================================

CW.run = function(op) {
  CW._resolveAll(op);

  const _input = op.input || {};

  const run_doc = {
    doctype:            "Run",
    name:               generateId("Run"),
    creation:           Date.now(),
    modified:           Date.now(),
    owner:              op.owner || "system",
    modified_by:        op.owner || "system",
    docstatus:          0,

    operation:          op.operation,
    operation_original: op.operation,
    source_doctype:     op.source_doctype,
    target_doctype:     op.target_doctype,
    adapter:            op.adapter,

    view:               op.view,
    component:          op.component,
    container:          op.container,

    query:              op.query  || {},
    target:             op.target || null,

    status:             "pending",
    success:            false,
    error:              null,

    parent_run_id:      op.parent_run_id || null,
    child_run_ids:      [],
    user:               op.user || null,
    options:            op.options || {},

    _running:           false,
    _needsRun:          false,
  };

  run_doc.input = new Proxy(_input, {
    set(t, p, v) {
      t[p] = v;
      if (!run_doc._running) {
        queueMicrotask(() => {
          CW.controller(run_doc).catch(err => console.error("[CW]", err));
        });
      }
      return true;
    },
    deleteProperty(t, p) {
      delete t[p];
      if (!run_doc._running) {
        queueMicrotask(() => {
          CW.controller(run_doc).catch(err => console.error("[CW]", err));
        });
      }
      return true;
    },
  });

  run_doc.child = async function(childOp) {
    childOp.parent_run_id = run_doc.name;
    childOp.user          = childOp.user ?? run_doc.user;
    const child           = CW.run(childOp);
    await CW.controller(child);
    if (!run_doc.child_run_ids.includes(child.name)) {
      run_doc.child_run_ids.push(child.name);
    }
    return child;
  };

  if (CW._updateFromRun) CW._updateFromRun(run_doc);

  if (op.options?.render === true) {
    queueMicrotask(() => {
      CW.controller(run_doc).catch(err => console.error('[CW]', err));
    });
  }

  return run_doc;
};

// ============================================================
// CONTROLLER
// ============================================================

CW.controller = async function(run_doc) {
  if (run_doc._running) { run_doc._needsRun = true; return; }

  run_doc._running = true;
  run_doc.status   = "running";
  run_doc.error    = null;

  try {
    CW._resolveInput(run_doc);

    const stateEntries = Object.entries(run_doc.input._state || {});
    const signal       = stateEntries.find(([, v]) => v === "");

    if (signal) {
      run_doc._signal = signal[0];
      await CW._handleSignal(run_doc);
    } else {
      const schema   = CW.Schema?.[run_doc.target_doctype];
      const doc      = run_doc.target?.data?.[0] || run_doc.input;
      const editable = (doc.docstatus ?? 0) === 0;
      const opConfig = CW._config.operations?.[run_doc.operation] || {};

      if (opConfig.type === "read" || opConfig.type === "auth") {
        await CW._handlers[run_doc.operation]?.(run_doc);
      } else if (opConfig.type === "write") {
        const dataKeys = Object.keys(run_doc.input).filter(k => k !== '_state');
        if (editable && dataKeys.length > 0) {
          run_doc.operation = (run_doc.input.name || run_doc.target?.data?.[0]?.name) ? "update" : "create";
          await CW._handlers[run_doc.operation](run_doc);
          if (!run_doc.error) {
            if (run_doc.operation === "create" && run_doc.target?.data?.[0]?.name) {
              run_doc.query = Object.assign({}, run_doc.query, { where: { name: run_doc.target.data[0].name } });
            }
            Object.keys(run_doc.input).filter(k => k !== '_state').forEach(k => delete run_doc.input[k]);
          }
        }
      }
    }

    run_doc.status  = run_doc.error ? "failed" : "completed";
    run_doc.success = !run_doc.error;

  } catch(err) {
    run_doc.error   = { message: err.message, code: `${run_doc.operation?.toUpperCase()}_FAILED` };
    run_doc.status  = "failed";
    run_doc.success = false;
  }

  run_doc.modified = Date.now();
  run_doc._running = false;

  if (CW._updateFromRun) CW._updateFromRun(run_doc);
  if (CW._render && run_doc.options?.render === true) CW._render(run_doc);

  if (run_doc._needsRun) {
    run_doc._needsRun = false;
    await CW.controller(run_doc);
  }
};

// ============================================================
// SIGNAL HANDLER
// ============================================================

CW._handleSignal = async function(run_doc) {
  const signal  = run_doc._signal;
  const doctype = run_doc.target_doctype;
  const schema  = CW.Schema?.[doctype];
  const db      = CW._config.adapters.defaults.db;

  const existingName = run_doc.target?.data?.[0]?.name || run_doc.input?.name || run_doc.query?.where?.name;
  let existingDoc = run_doc.target?.data?.[0] || {};

  // CHANGE 1: skip re-fetch if target already has the correct record
  if (existingName && run_doc.target?.data?.[0]?.name !== existingName) {
    run_doc.query = Object.assign({}, run_doc.query, { where: { name: existingName } });
    await globalThis.Adapter[db].select(run_doc);
    existingDoc = run_doc.target?.data?.[0] || {};
  } else if (existingName) {
    run_doc.query = Object.assign({}, run_doc.query, { where: { name: existingName } });
    existingDoc = run_doc.target?.data?.[0] || {};
  }

  const stateDef = CW._getStateDef(doctype);

  let matched = false;
  for (const [dim, dimDef] of Object.entries(stateDef)) {
    const key = signal.startsWith(dim + ".") ? signal.slice(dim.length + 1) : signal;
    if (dimDef.sideEffects?.[key] !== undefined || dimDef.labels?.[key] !== undefined) {
      const requires   = dimDef.requires?.[key] || {};
      const reqPassed  = Object.entries(requires).every(([k, v]) => Number(schema?.[k] ?? 0) === Number(v));
      if (!reqPassed) {
        run_doc.error = `${signal} not allowed for this doctype`;
        run_doc.input._state[signal] = "-1";
        return;
      }

      const rule = dimDef.rules?.[key];
      if (typeof rule === "function" && !rule(run_doc)) {
        run_doc.error = `${signal} rule not satisfied`;
        run_doc.input._state[signal] = "-1";
        return;
      }

      await CW._execTransition(run_doc, dim, key);

      run_doc.operation = run_doc.input.name || existingDoc.name ? "update" : "create";
      if (run_doc.operation === "update") {
        await CW._handlers.update(run_doc);
      } else {
        await CW._handlers.create(run_doc);
      }

      matched = true;
      break;
    }
  }

  if (!matched) {
    if (signal === "save") {
      run_doc.operation = (run_doc.input.name || existingDoc.name) ? "update" : "create";
      await CW._handlers[run_doc.operation](run_doc);
    } else if (signal === "submit") {
      run_doc.input.docstatus = 1;
      run_doc.operation = "update";
      await CW._handlers.update(run_doc);
    } else if (signal === "cancel") {
      run_doc.input.docstatus = 2;
      run_doc.operation = "update";
      await CW._handlers.update(run_doc);
    } else if (signal === "amend") {
      run_doc.input.amended_from = existingDoc.name;
      delete run_doc.input.name;
      run_doc.input.docstatus = 0;
      run_doc.operation = "create";
      await CW._handlers.create(run_doc);
    }
  }

  if (!run_doc.error) {
    if (run_doc.operation === "create" && run_doc.target?.data?.[0]?.name) {
      run_doc.query = Object.assign({}, run_doc.query, { where: { name: run_doc.target.data[0].name } });
    }
    Object.keys(run_doc.input).filter(k => k !== '_state').forEach(k => delete run_doc.input[k]);
    if (run_doc.input._state) {
      run_doc.input._state[signal] = "1";
    }
  } else {
    if (run_doc.input._state) {
      run_doc.input._state[signal] = "-1";
    }
  }
};

// ============================================================
// PREFLIGHT
// ============================================================

CW._preflight = function(run_doc, operation) {
  const schema  = CW.Schema?.[run_doc.target_doctype];
  const input   = run_doc.input;

  if (operation === "create") {
    if (schema?.fields) {
      const missing = schema.fields
        .filter(f => f.reqd && f.fieldtype !== 'Table' && (input[f.fieldname] === undefined || input[f.fieldname] === null || input[f.fieldname] === ""))
        .map(f => f.label || f.fieldname);
      if (missing.length) { run_doc.error = `Required: ${missing.join(", ")}`; return; }
    }

    if (!input.name) {
      const autoname = schema?.autoname;
      input.name = autoname?.startsWith("field:")
        ? generateId(run_doc.target_doctype, input[autoname.slice(6)])
        : generateId(run_doc.target_doctype);
    }

    if (schema?.fields) {
      for (const f of schema.fields) {
        if (f.default !== undefined && input[f.fieldname] === undefined) {
          input[f.fieldname] = f.default;
        }
      }
    }

    const stateDef = CW._getStateDef(run_doc.target_doctype);
    const freshState = {};
    for (const [dim, dimDef] of Object.entries(stateDef)) {
      freshState[dim] = dimDef.values?.[0] ?? 0;
    }
    input._state = freshState;
  }

  if (operation === "update") {
    if (schema?.fields) {
      const merged  = Object.assign({}, run_doc.target?.data?.[0], input);
      const missing = schema.fields
        .filter(f => f.reqd && f.fieldtype !== 'Table' && (merged[f.fieldname] === undefined || merged[f.fieldname] === null || merged[f.fieldname] === ""))
        .map(f => f.label || f.fieldname);
      if (missing.length) { run_doc.error = `Required: ${missing.join(", ")}`; return; }
    }

    if (run_doc.target?.data?.[0]?._state) {
      const targetState = run_doc.target.data[0]._state;
      const dimKeys = Object.keys(targetState).filter(k => !isNaN(k));
      const baseDimState = {};
      dimKeys.forEach(k => { baseDimState[k] = targetState[k]; });
      input._state = Object.assign({}, baseDimState, input._state || {});
    }
  }

  if (schema?.fields) {
    for (const f of schema.fields) {
      if (f.fieldtype === "Code" && f.options === "JSON" && typeof input[f.fieldname] === "object") {
        input[f.fieldname] = JSON.stringify(input[f.fieldname]);
      }
    }
  }

  input.doctype     = input.doctype || run_doc.target_doctype;
  input.modified    = Date.now();
  input.modified_by = globalThis.pb?.authStore?.model?.id || '';
  if (input.doctype === 'User') {
    input.owner = '';
  } else if (operation === 'create') {
    input.owner = input.owner || globalThis.pb?.authStore?.model?.id || '';
  }
};

// ============================================================
// HANDLERS
// ============================================================

CW._handlers = {

  select: async function(run_doc) {
    const db = CW._config.adapters.defaults.db;
    await globalThis.Adapter[db].select(run_doc);
    if (run_doc.error || !run_doc.target?.data) return;

    const schema     = CW.Schema?.[run_doc.target_doctype ?? run_doc.source_doctype];
    const activeView = run_doc.view || run_doc.query?.view || "list";
    const sel        = run_doc.query?.select;

    if (schema && !sel) {
      const shouldFilter = activeView === "list" || activeView === "card";
      if (shouldFilter) {
        const viewFields   = schema.fields.filter(f => f.in_list_view).map(f => f.fieldname);
        const titleField   = schema.title_field ? [schema.title_field] : [];
        const systemFields = CW.defaultFields || [];
        const fields = [...new Set([...systemFields, ...titleField, ...viewFields])];
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
  },

  create: async function(run_doc) {
    CW._preflight(run_doc, "create");
    if (run_doc.error) return;
    const db = CW._config.adapters.defaults.db;
    await globalThis.Adapter[db].create(run_doc);
  },

  // CHANGE 2: skip re-fetch if target already has the correct record
  update: async function(run_doc) {
    const db   = CW._config.adapters.defaults.db;
    const name = run_doc.input?.name || run_doc.target?.data?.[0]?.name || run_doc.query?.where?.name;
    if (!name) { run_doc.error = 'Update requires a record name'; return; }
    if (!run_doc.query?.where?.name) {
      run_doc.query = Object.assign({}, run_doc.query, { where: { name } });
    }

    if (run_doc.target?.data?.[0]?.name !== name) {
      // target is stale or missing — re-fetch
      const savedSelect = run_doc.query?.select;
      if (savedSelect) run_doc.query = Object.assign({}, run_doc.query, { select: undefined });
      await globalThis.Adapter[db].select(run_doc);
      if (savedSelect) run_doc.query = Object.assign({}, run_doc.query, { select: savedSelect });
      if (run_doc.error) return;
    }

    CW._preflight(run_doc, "update");
    if (run_doc.error) return;
    await globalThis.Adapter[db].update(run_doc);
  },

  delete: async function(run_doc) {
    run_doc.input.docstatus = 2;
    await CW._handlers.update(run_doc);
  },

};

console.log("✅ CW-run.js loaded");
