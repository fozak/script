// ============================================================
// CW-run.js
// ============================================================


// ============================================================
// RESOLVER
// ============================================================
CW._resolveAll = function(op) {
  const cfg = CW._config;
  const resolved = {};

  resolved.operation = cfg.operationAliases[op.operation?.toLowerCase()] || op.operation;

  const dtMap = cfg.doctypeAliases || {};
  resolved.source_doctype = op.source_doctype ? dtMap[op.source_doctype.toLowerCase()] || op.source_doctype : null;
  resolved.target_doctype = op.target_doctype ? dtMap[op.target_doctype.toLowerCase()] || op.target_doctype : null;

  resolved.view = cfg.operationToView[resolved.operation?.toLowerCase()] ?? null;

  const viewConfig = cfg.views?.[resolved.view?.toLowerCase()] || {};
  resolved.component = viewConfig.component ?? null;
  resolved.container = viewConfig.container ?? null;
  resolved.options = viewConfig.options || {};

  resolved.owner = op.owner || "system";

  // resolve adapter from input._state key OR default db
  const adapterKey = Object.keys(op.input?._state || {}).find(k => k.startsWith('Adapter.'));
  resolved.adapter = adapterKey ? adapterKey.split('.')[1] : cfg.adapters.defaults.db;

  return resolved;
};

// ============================================================
// MAIN run()
// ============================================================
CW.run = async function(op) {
  const start = Date.now();

  if (!op?.operation) return CW._failEarly("operation is required", start);

  const resolved = CW._resolveAll(op);
  const mergedOptions = { ...resolved.options, ...op.options };

  const run_doc = {
    doctype: "Run",
    name: generateId("run"),
    creation: start,
    modified: start,
    owner: resolved.owner,
    modified_by: resolved.owner,
    docstatus: 0,

    operation: resolved.operation,
    operation_original: op.operation,
    source_doctype: resolved.source_doctype,
    target_doctype: resolved.target_doctype,

    view: "view" in op ? op.view : resolved.view,
    component: "component" in op ? op.component : resolved.component,
    container: "container" in op ? op.container : resolved.container,

    query: op.query || {},
    input: {
      ...op.input,
      _state: {
        [`Adapter.${resolved.adapter}.${resolved.operation}`]: "",
        ...op.input?._state
      }
    },
    target: op.target || null,

    config: op.config || {},
    functions: op.functions || {},

    status: "running",
    success: false,
    error: null,
    duration: 0,

    parent_run_id: mergedOptions.parentRunId || null,
    child_run_ids: [],

    user: op.user || null,

    options: mergedOptions,

    child: null,
  };

  // proxy input to fire CW.controller on every mutation
  run_doc.input = new Proxy(run_doc.input, {
    set(target, prop, value) {
      target[prop] = value;
      CW.controller(run_doc);
      return true;
    }
  });

  if (typeof window !== 'undefined') {
    globalThis.CW.RUN = run_doc;
  }

  if (run_doc.options.draft) {
    if (run_doc.query.where?.name && !run_doc.input.name) {
      run_doc.input.name = run_doc.query.where.name;
    }
  }

  Object.defineProperty(run_doc, "doc", {
    get() {
      const original = this.target?.data?.[0] || {};
      const delta = this.input || {};
      return this.options.draft ? { ...original, ...delta } : original;
    }
  });

  run_doc.child = async (cfg) => {
    const childRun = await CW.run({
      ...cfg,
      user: cfg.user ?? run_doc.user,
      options: {
        ...cfg.options,
        parentRunId: run_doc.name,
      },
    });
    if (!run_doc.child_run_ids.includes(childRun.name)) {
      run_doc.child_run_ids.push(childRun.name);
    }
    return childRun;
  };

  if (CW._updateFromRun) CW._updateFromRun(run_doc);

  try {
    const result = await CW._exec(run_doc);

    run_doc.target = result.target || result;
    run_doc.success = result.success === true;
    run_doc.error = result.error || null;

    if (run_doc.options.draft && run_doc.target?.data?.[0]?.doctype && !run_doc.input.doctype) {
      run_doc.input.doctype = run_doc.target.data[0].doctype;
    }

    run_doc.status = "completed";
    run_doc.duration = Date.now() - start;
    run_doc.modified = Date.now();

  } catch (err) {
    run_doc.success = false;
    run_doc.status = "failed";
    run_doc.error = {
      message: err.message,
      code: `${run_doc.operation?.toUpperCase() || "OPERATION"}_FAILED`,
      stack: CW.getConfig('debug') ? err.stack : undefined,
    };
    run_doc.duration = Date.now() - start;
    run_doc.modified = Date.now();
  }

  if (CW._updateFromRun) CW._updateFromRun(run_doc);
  if (typeof CW._render === "function") CW._render(run_doc);

  return run_doc;
};

// ============================================================
// EXEC
// ============================================================
CW._exec = async function(run_doc) {
  const hasStateIntents = run_doc.input?._state &&
    Object.values(run_doc.input._state).some(v => v === '');

  if (hasStateIntents) {
    return await CW.controller(run_doc);
  }

  return await CW.controllerLegacy.execute(run_doc);
};

// ============================================================
// FAIL EARLY
// ============================================================
CW._failEarly = function(message, start) {
  return {
    doctype: "Run",
    name: generateId("run"),
    creation: start,
    status: "failed",
    success: false,
    error: { message, code: "VALIDATION_FAILED" },
    duration: Date.now() - start,
  };
};

// ============================================================
// HANDLERS — materialize target.data (view filtering only)
// ============================================================
CW._handlers = {

  select: async function(run_doc) {
    const { source_doctype, query = {} } = run_doc;
    const { view = 'list', select } = query;
    const data = run_doc.target?.data || [];
    const schema = CW.Schema[source_doctype];

    if (schema && !select) {
      const shouldFilter = view === 'list' || view === 'card';
      if (shouldFilter) {
        const viewProp = `in_${view}_view`;
        const viewFields = schema.fields
          .filter(f => f[viewProp])
          .map(f => f.fieldname);
        const fields = ['name', 'doctype', ...viewFields];

        run_doc.target.data = data.map(item => {
          const filtered = {};
          fields.forEach(f => { if (f in item) filtered[f] = item[f]; });
          return filtered;
        });
      }
    } else if (select && Array.isArray(select)) {
      run_doc.target.data = data.map(item => {
        const filtered = {};
        select.forEach(f => { if (f in item) filtered[f] = item[f]; });
        return filtered;
      });
    }

    return run_doc;
  },

  takeone: async function(run_doc) {
    run_doc.query = run_doc.query || {};
    run_doc.query.take = 1;
    run_doc.query.view = 'form';
    return await CW._handlers.select(run_doc);
  },

  create: async function(run_doc) {
    run_doc.input.doctype = run_doc.input.doctype || run_doc.target_doctype;
    run_doc.input.name = run_doc.input.name || generateId(run_doc.target_doctype);
    return run_doc;
  },

  update: async function(run_doc) {
    return run_doc;
  },

  delete: async function(run_doc) {
    if (!run_doc.query?.where || Object.keys(run_doc.query.where).length === 0) {
      throw new Error('DELETE requires query.where to prevent mass deletion');
    }
    return run_doc;
  }
};

console.log("✅ coworker-run.js loaded");
