// ============================================================
// CW-run.js
// Controller, preflight, handlers.
// All functions: function(run_doc) — mutate only, no return.
// ============================================================

// ============================================================
// RESOLVER
// ============================================================

CW._resolveAll = function(run_doc_or_op) {
  const op  = run_doc_or_op;
  const cfg = CW._config;

  op.operation     = cfg.operationAliases[op.operation?.toLowerCase()] || op.operation;

  const dtMap      = cfg.doctypeAliases || {};
  op.source_doctype = op.source_doctype ? dtMap[op.source_doctype.toLowerCase()] || op.source_doctype : null;
  op.target_doctype = op.target_doctype ? dtMap[op.target_doctype.toLowerCase()] || op.target_doctype : null;

  const opConfig   = cfg.operations[op.operation] || {};
  const adapterType = opConfig.adapterType || "db";
  op.adapter       = cfg.adapters.defaults[adapterType] || cfg.adapters.defaults.db;

  const view       = cfg.operationToView?.[op.operation] ?? null;
  const viewConfig = cfg.views?.[view?.toLowerCase()] || {};
  op.view          = "view"      in op ? op.view      : view;
  op.component     = "component" in op ? op.component : (viewConfig.component ?? null);
  op.container     = "container" in op ? op.container : (viewConfig.container ?? null);
};

// ============================================================
// RUN FACTORY
// ============================================================

CW.run = function(op) {
  CW._resolveAll(op);

  const run_doc = {
    doctype:            "Run",
    name:               generateId("Run"),
    creation:           Date.now(),
    modified:           Date.now(),
    owner:              op.owner || "system",
    modified_by:        op.owner || "system",
    docstatus:          0,
    operation_key:      JSON.stringify(op),

    operation:          op.operation,
    operation_original: op.operation,
    source_doctype:     op.source_doctype,
    target_doctype:     op.target_doctype,
    adapter:            op.adapter,

    view:               op.view,
    component:          op.component,
    container:          op.container,

    query:              op.query  || {},
    input:              op.input  || {},
    target:             op.target || null,

    status:             "pending",
    success:            false,
    error:              null,

    parent_run_id:      op.parent_run_id || null,
    child_run_ids:      [],
    user:               op.user || null,
  };

  // Proxy on input — wakes controller on every mutation
  run_doc.input = new Proxy(run_doc.input, {
    set(t, p, v) {
      t[p] = v;
      queueMicrotask(() =>
        Promise.resolve(CW.controller(run_doc)).catch(err => console.error("[CW]", err))
      );
      return true;
    },
    deleteProperty(t, p) {
      delete t[p];
      queueMicrotask(() =>
        Promise.resolve(CW.controller(run_doc)).catch(err => console.error("[CW]", err))
      );
      return true;
    },
  });

  run_doc.child = async function(op) {
    op.parent_run_id = run_doc.name;
    op.user          = op.user ?? run_doc.user;
    const child      = await CW.controller(CW.run(op));
    if (!run_doc.child_run_ids.includes(child.name)) {
      run_doc.child_run_ids.push(child.name);
    }
    return child;
  };

  if (CW._updateFromRun) CW._updateFromRun(run_doc);

  return run_doc;
};

// ============================================================
// CONTROLLER
// ============================================================

CW.controller = async function(run_doc) {
  if (run_doc._running) { run_doc._needsRun = true; return; }

  run_doc._running = true;
  run_doc.status   = "running";

  try {
    // Check _state signals first
    const signal = run_doc.input?._state
      ? Object.entries(run_doc.input._state).find(([, v]) => v === "")
      : null;

    if (signal) {
      await CW._handleSignal(run_doc, signal[0]);
    } else {
      const handler = CW._handlers[run_doc.operation];
      if (handler) await handler(run_doc);
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

  if (run_doc._needsRun) {
    run_doc._needsRun = false;
    await CW.controller(run_doc);
  }
};

// ============================================================
// SIGNAL HANDLER (_state signals from UI buttons)
// ============================================================

CW._handleSignal = async function(run_doc, signal) {
  const behavior = CW.getBehavior(
    CW.Schema?.[run_doc.target_doctype],
    run_doc.input
  );

  if (behavior?.guardian?.blockOperations?.includes(signal)) {
    run_doc.input._state = { ...run_doc.input._state, [signal]: "-1" };
    run_doc.error = `${signal} not allowed in current state`;
    return;
  }

  if (signal === "save") {
    run_doc.operation = run_doc.input.name ? "update" : "create";
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
    run_doc.input.amended_from = run_doc.input.name;
    delete run_doc.input.name;
    run_doc.input.docstatus = 0;
    run_doc.operation = "create";
    await CW._handlers.create(run_doc);
  }

  if (!run_doc.error) {
    run_doc.input._state = { ...run_doc.input._state, [signal]: "1" };
  } else {
    run_doc.input._state = { ...run_doc.input._state, [signal]: "-1" };
  }
};

// ============================================================
// PREFLIGHT (schema-driven, mutates run_doc.input)
// ============================================================

CW._preflight = function(run_doc, operation) {
  const schema  = CW.Schema?.[run_doc.target_doctype];
  const input   = run_doc.input;

  if (operation === "create") {
    // 1. generateId from schema.autoname
    if (!input.name) {
      const autoname = schema?.autoname;
      input.name = autoname?.startsWith("field:")
        ? generateId(run_doc.target_doctype, input[autoname.slice(6)])
        : generateId(run_doc.target_doctype);
    }

    // 2. apply field defaults
    if (schema?.fields) {
      for (const f of schema.fields) {
        if (f.default !== undefined && input[f.fieldname] === undefined) {
          input[f.fieldname] = f.default;
        }
      }
    }

    // 3. validate reqd fields
    if (schema?.fields) {
      const missing = schema.fields
        .filter(f => f.reqd && (input[f.fieldname] === undefined || input[f.fieldname] === null || input[f.fieldname] === ""))
        .map(f => f.label || f.fieldname);
      if (missing.length) {
        run_doc.error = `Required: ${missing.join(", ")}`;
        return;
      }
    }
  }

  if (operation === "update") {
    // validate reqd on merged doc
    if (schema?.fields) {
      const merged  = { ...run_doc.target?.data?.[0], ...input };
      const missing = schema.fields
        .filter(f => f.reqd && (merged[f.fieldname] === undefined || merged[f.fieldname] === null || merged[f.fieldname] === ""))
        .map(f => f.label || f.fieldname);
      if (missing.length) {
        run_doc.error = `Required: ${missing.join(", ")}`;
        return;
      }
    }
  }

  // 4. serialize JSON/Code fields (both create + update)
  if (schema?.fields) {
    for (const f of schema.fields) {
      if (f.fieldtype === "Code" && f.options === "JSON" && typeof input[f.fieldname] === "object") {
        input[f.fieldname] = JSON.stringify(input[f.fieldname]);
      }
    }
  }

  // 5. stamp doctype + modified
  input.doctype  = input.doctype || run_doc.target_doctype;
  input.modified = Date.now();
};

// ============================================================
// HANDLERS
// ============================================================

CW._handlers = {

  select: async function(run_doc) {
    const db     = CW._config.adapters.defaults.db;
    await CW.Adapter[db].select(run_doc);
    if (run_doc.error || !run_doc.target?.data) return;

    // Field filtering by view
    const schema     = CW.Schema?.[run_doc.target_doctype ?? run_doc.source_doctype];
    const activeView = run_doc.view || run_doc.query?.view || "list";
    const select     = run_doc.query?.select;

    if (schema && !select) {
      const shouldFilter = activeView === "list" || activeView === "card";
      if (shouldFilter) {
        const viewProp  = `in_${activeView}_view`;
        const viewFields = schema.fields.filter(f => f[viewProp]).map(f => f.fieldname);
        const fields     = ["name", "doctype", ...viewFields];
        run_doc.target.data = run_doc.target.data.map(item => {
          const filtered = {};
          fields.forEach(f => { if (f in item) filtered[f] = item[f]; });
          return filtered;
        });
      }
    } else if (select && Array.isArray(select)) {
      run_doc.target.data = run_doc.target.data.map(item => {
        const filtered = {};
        select.forEach(f => { if (f in item) filtered[f] = item[f]; });
        return filtered;
      });
    }
  },

  create: async function(run_doc) {
    CW._preflight(run_doc, "create");
    if (run_doc.error) return;

    const db = CW._config.adapters.defaults.db;
    await CW.Adapter[db].create(run_doc);
  },

  update: async function(run_doc) {
    const db = CW._config.adapters.defaults.db;

    // Fetch existing first
    await CW.Adapter[db].select(run_doc);
    if (run_doc.error) return;

    CW._preflight(run_doc, "update");
    if (run_doc.error) return;

    await CW.Adapter[db].update(run_doc);
  },

  delete: async function(run_doc) {
    run_doc.input.docstatus = 2;
    await CW._handlers.update(run_doc);
  },

};

console.log("✅ CW-run.js loaded");
