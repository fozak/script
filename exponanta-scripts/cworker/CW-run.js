// ============================================================
// v 44.3 CW-run.js — refactored  select updated to become UNIVERSAL
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

  const opConfig = cfg.operations?.[op.operation] || {};
  /* const adapterType = opConfig.adapterType || 'db';
  op.adapter        = cfg.adapters?.defaults?.[adapterType] || cfg.adapters?.defaults?.db; */

  const adapterType = opConfig.adapterType || "db";
  //const doctypeOverride = cfg.adapters?.doctypeAdapters?.[run_doc.target_doctype];

  const doctypeOverride = cfg.adapters?.doctypeAdapters?.[op.target_doctype];
  op.adapter =
    doctypeOverride ||
    cfg.adapters?.defaults?.[adapterType] ||
    cfg.adapters?.defaults?.db;

  const view = cfg.operationToView?.[op.operation] ?? null;
  const viewConfig = cfg.views?.[view?.toLowerCase()] || {};
  op.view = "view" in op ? op.view : view;

  // skip component/container resolution for child runs
  if (op.parent_run_id && op.options?.render === false) {
    if (!("component" in op)) op.component = null;
    if (!("container" in op)) op.container = null;
    return;
  }

  const resolvedView = op.view || view;
  if (!("component" in op) || !("container" in op)) {
    let resolved = null;
    if (resolvedView && CW._resolveViewComponent) {
      resolved = CW._resolveViewComponent(
        op.target_doctype,
        resolvedView,
        op.container,
      );
    }
    if (resolved && typeof resolved === "object") {
      if (!("component" in op)) op.component = resolved.component ?? null;
      if (!("container" in op))
        op.container = resolved.container ?? viewConfig.container ?? null;
    } else {
      if (!("component" in op))
        op.component =
          (typeof resolved === "string" ? resolved : null) ??
          viewConfig.component ??
          null;
      if (!("container" in op)) op.container = viewConfig.container ?? null;
    }
  }
};

// ============================================================
// RESOLVE INPUT — meta channel: input['.field'] → run_doc.field
// ============================================================

CW._resolveInput = function (run_doc) {
  for (const [key, value] of Object.entries(run_doc.input)) {
    if (key.startsWith(".")) {
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

  //test
  //console.log('_mergeInput input:', JSON.stringify(run_doc.input));
  //console.log('_mergeInput doc.status before:', doc?.status);
  //
  const schema = CW.Schema?.[run_doc.target_doctype];
  const readOnly = new Set(
    (schema?.fields || []).filter((f) => f.read_only).map((f) => f.fieldname),
  );

  for (const [k, v] of Object.entries(run_doc.input)) {
    if (k === "_state") continue;
    if (readOnly.has(k)) continue; // ← skip read_only fields
    doc[k] = v;
  }

  if (run_doc.input._state && typeof run_doc.input._state === "object") {
    if (!doc._state) doc._state = {};
    Object.assign(doc._state, run_doc.input._state);
  }
  //test
   //console.log('_mergeInput doc.status after:', doc?.status);
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
  const doc = run_doc.target?.data?.[0];
  if (!schema?.fields || !doc) return;
  schema.fields
    .filter((f) => f.virtual)
    .forEach((f) => delete doc[f.fieldname]);
};


// ============================================================
// CW._expand
// ============================================================

CW._getChildRun = function (run_doc, fieldname) {
  if (!fieldname) return null;
  return (
    run_doc.child_run_ids
      .map((id) => CW.runs[id])
      .find((r) => r?.source_field === fieldname) || null
  );
};

//=============================================================

CW._expand = async function (run_doc, fieldname) {
  if (run_doc.options?.expand === false) return; // ← add this line
  const schema = CW.Schema?.[run_doc.target_doctype];
  const doc = run_doc.target?.data?.[0];
  const docName = doc?.name;
  if (!schema || !docName) return;

  const fields = fieldname
    ? schema.fields?.filter((f) => f.fieldname === fieldname)
    : schema.fields?.filter(
        (f) =>
          f.fieldtype === "Table" ||
          f.fieldtype === "Relationship Panel" ||
          f.fieldtype === "Link" ||
          f.fieldtype === "ChildRun",
      );

  const promises = [];
  for (const field of fields || []) {
    const exists = run_doc.child_run_ids.some(
      (id) => CW.runs[id]?.source_field === field.fieldname,
    );
    if (exists) continue;

    if (field.fieldtype === "ChildRun") {
      promises.push(
        run_doc.child({
          ...field.run_args,
          operation: field.run_args?.operation || "select",
          query: CW._resolveQuery(run_doc, field.fieldname),
          source_field: field.fieldname,
          options: { render: false },
          component: null,
          container: null,
        }),
      );
      continue;
    }

    if (field.fieldtype === "Link") {
      const val = doc[field.fieldname];
      if (!val) continue;
      promises.push(
        run_doc.child({
          operation: "select",
          target_doctype: field.options,
          query: { where: { name: val } },
          source_field: field.fieldname,
          options: { render: false },
          view: "list",
          component: null,
          container: null,
        }),
      );
      continue;
    }

    promises.push(
      run_doc.child({
        operation: "select",
        target_doctype: field.options,
        query: { where: { parent: docName } },
        source_field: field.fieldname,
        options: { render: false },
        view: "list",
        component: null,
        container: null,
      }),
    );
  }

  await Promise.all(promises);
};

// ============================================================
// CONTROLLER
// ============================================================

CW.controller = async function (run_doc) {
  run_doc.status = "running";
  run_doc.error = null;

  try {
    // 1. meta channel — input['.field'] → run_doc.field
    CW._resolveInput(run_doc);

    if (
      (run_doc.operation === "update" ||
        run_doc.operation === "delete" ||
        run_doc.operation === "updateMany") &&
      !run_doc.target?.data?.[0]?.name
    ) {
      //await globalThis.Adapters[CW._config.adapters.defaults.db].select(run_doc)

      // await CW._handlers.select(run_doc);

      const _savedOp = run_doc.operation;
      run_doc.operation = "select";
      await CW._handlers.select(run_doc);
      run_doc.operation = _savedOp;
    }
    // skip log/merge/clear for updateMany
    if (run_doc.operation !== "updateMany") {
      await CW._logChanges(run_doc); // ← before merge

      // 2. merge all input → target.data[0] (including virtual + _state)
      CW._mergeInput(run_doc);

      // 3. clear input — everything is now in target.data[0]
      CW._clearInput(run_doc);
    }

    const doc = run_doc.target?.data?.[0] || {};

    // 4. dispatch: signal or data or operation
    const signal = Object.entries(doc._state || {}).find(([, v]) => v === "");

    if (signal) {
      run_doc._signal = signal[0];
      await CW._handleSignal(run_doc);
    } else {
      if (CW._handlers[run_doc.operation]) {
        await CW._handlers[run_doc.operation](run_doc);
      } else if (
        globalThis.Adapters[CW._getAdapters(run_doc)[0]]?.[run_doc.operation]
      ) {
        for (const a of CW._getAdapters(run_doc))
          await globalThis.Adapters[a][run_doc.operation]?.(run_doc);
      } else {
        run_doc.operation = doc.name ? "update" : "create";

        // PHASE 1 — transform adapters (non-db)
        for (const a of CW._getAdapters(run_doc)) {
          if (run_doc.error) break;
          if (CW._config.adapters.registry?.[a]?.type !== "db") {
            await globalThis.Adapters[a]?.[run_doc.operation]?.(run_doc);
          }
        }

        if (!run_doc.error) {
          // ADAPTER PASS — log → merge → clear
          await CW._logChanges(run_doc);
          CW._mergeInput(run_doc);
          CW._clearInput(run_doc);

          // PHASE 2 — persist adapters (db only)
          CW._preflight(run_doc);
          if (!run_doc.error) {
            CW._stripVirtual(run_doc);

            for (const a of CW._getAdapters(run_doc)) {
              if (run_doc.error) break;
              const schema = CW.Schema?.[run_doc.target_doctype];
              const autosave = run_doc.autosave ?? schema?.autosave ?? 1;

              if (
                CW._config.adapters.registry?.[a]?.type === "db" &&
                autosave !== 0
              ) {
                await globalThis.Adapters[a]?.[run_doc.operation]?.(run_doc);
              }
            }
          }
        }

        if (
          !run_doc.error &&
          run_doc.operation === "create" &&
          run_doc.target?.data?.[0]?.name
        ) {
          run_doc.query = Object.assign({}, run_doc.query, {
            where: { name: run_doc.target.data[0].name },
          });
        }
      }
    }

    run_doc.status = run_doc.error ? "failed" : "completed";
    run_doc.success = !run_doc.error;
  } catch (err) {
    //line 475
    run_doc.error = {
      message: err.message,
      code: `${run_doc.operation?.toUpperCase()}_FAILED`,
    };
    run_doc.status = "failed";
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
    doctype: "Run",
    name: generateId("Run"),
    creation: Date.now(),
    modified: Date.now(),
    owner: op.owner || "system",
    modified_by: op.owner || "system",
    docstatus: 0,

    operation: op.operation,
    operation_original: op.operation,
    source_doctype: op.source_doctype,

    search: op.search || "",
    source_field: op.source_field ?? null,

    target_doctype: op.target_doctype,
    adapter: op.adapter,

    view: op.view,
    component: op.component,
    container: op.container,

    autosave: op.autosave ?? null, // ← added this

    query: op.query || {},
    target: op.target || null,
    input: op.input || {},

    status: "pending",
    success: false,
    error: null,

    parent_run_id: op.parent_run_id || null,
    child_run_ids: [],
    options: op.options || {},
    user: op.user ?? {
      name: globalThis.pb?.authStore?.model?.id ?? null,
      email: globalThis.pb?.authStore?.model?.email ?? null,
      token: globalThis.pb?.authStore?.token ?? null,
      verified: globalThis.pb?.authStore?.model?.verified ?? false,
    },
  };

  run_doc.child = async function (childOp) {
    childOp.parent_run_id = run_doc.name;
    childOp.user = childOp.user ?? run_doc.user;
    const child = await CW.run(childOp);
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
  const doc = run_doc.target?.data?.[0];
  if (!doc) return;

  if (operation === "create") {
    // reqd validation
    if (schema?.fields) {
      const missing = schema.fields
        .filter(
          (f) =>
            f.reqd &&
            f.fieldtype !== "Table" &&
            evaluateDependsOn(f.depends_on, doc, run_doc) &&
            (doc[f.fieldname] === undefined ||
              doc[f.fieldname] === null ||
              doc[f.fieldname] === ""),
        )
        .map((f) => f.label || f.fieldname);
      if (missing.length) {
        run_doc.error = `Required: ${missing.join(", ")}`;
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

  if (operation === "update") {
    //was if (operation === 'update'
    // reqd validation against target.data[0] (already merged)
    if (schema?.fields) {
      const missing = schema.fields
        .filter(
          (f) =>
            f.reqd &&
            !f.virtual &&
            f.fieldtype !== "Table" &&
            evaluateDependsOn(f.depends_on, doc, run_doc) &&
            (doc[f.fieldname] === undefined ||
              doc[f.fieldname] === null ||
              doc[f.fieldname] === ""),
        )
        .map((f) => f.label || f.fieldname);
      if (missing.length) {
        run_doc.error = `Required: ${missing.join(", ")}`;
        return;
      }
    }
  }

  // systemFields — operate on target.data[0] via run_doc
  for (const sf of CW._config.systemFields || []) {
    if (sf.onWrite) sf.onWrite(run_doc);
    if (sf.onCreate && operation === "create") sf.onCreate(run_doc);
  }
};

// ============================================================
// _getAdapters — resolves adapter config to string array
// ============================================================

CW._getAdapters = function (run_doc) {
  const a = run_doc.adapter;
  if (!a) return [CW._config.adapters.defaults.db];
  if (typeof a === "string") return [a];
  if (Array.isArray(a)) return a;
  const resolved =
    a[run_doc.operation] || a["default"] || CW._config.adapters.defaults.db;
  return [].concat(resolved);
};

// ============================================================
// HANDLERS
// ============================================================

CW._handlers = {
  select: async function (run_doc) {
    for (const a of CW._getAdapters(run_doc)) {
      await globalThis.Adapters[a].select(run_doc);
      if (run_doc.error) break;
    }

    if (run_doc.error || !run_doc.target?.data) return;

    const schema =
      CW.Schema?.[run_doc.target_doctype ?? run_doc.source_doctype];
    const activeView = run_doc.view || run_doc.query?.view || "list";
    const sel = run_doc.query?.select;

    if (schema && !sel) {
      const viewFieldFlag = `in_${activeView}_view`;
      const hasViewFields = schema.fields.some((f) => f[viewFieldFlag]);
      const shouldFilter = activeView === "list" || hasViewFields;

      if (shouldFilter) {
        const flagToUse = hasViewFields ? viewFieldFlag : "in_list_view";
        const viewFields = schema.fields
          .filter((f) => f[flagToUse])
          .map((f) => f.fieldname);
        const titleField = schema.title_field ? [schema.title_field] : [];
        const fields = [...new Set([...titleField, ...viewFields])];
        run_doc.target.data = run_doc.target.data.map((item) => {
          const filtered = {};
          fields.forEach((f) => {
            if (f in item) filtered[f] = item[f];
          });
          return filtered;
        });
      }
    } else if (sel && Array.isArray(sel)) {
      const titleField = schema?.title_field ? [schema.title_field] : [];
      const systemFields = CW.defaultFields || [];
      const allFields = [...new Set([...systemFields, ...titleField, ...sel])];
      run_doc.target.data = run_doc.target.data.map((item) => {
        const filtered = {};
        allFields.forEach((f) => {
          if (f in item) filtered[f] = item[f];
        });
        return filtered;
      });
    }

    // expand child fields for form view — after data is ready
    if (run_doc.view === "form" && run_doc.target?.data?.[0]?.name) {
      await CW._expand(run_doc);
    }
  },

  create: async function (run_doc) {
    CW._preflight(run_doc);
    if (run_doc.error) return;
    CW._stripVirtual(run_doc); // strip virtual after validation, before DB write

    for (const a of CW._getAdapters(run_doc)) {
      if (run_doc.error) break;
      const schema = CW.Schema?.[run_doc.target_doctype];
      const autosave = run_doc.autosave ?? schema?.autosave ?? 1;
      if (autosave !== 0) {
        await globalThis.Adapters[a].create(run_doc);
      }
    }
  },

  update: async function (run_doc) {
    const doc = run_doc.target?.data?.[0];
    const name = doc?.name || run_doc.query?.where?.name;

    if (!name) {
      run_doc.error = "Update requires a record name";
      return;
    }
    if (!run_doc.query?.where?.name) {
      run_doc.query = Object.assign({}, run_doc.query, { where: { name } });
    }

    const editable = (doc?.docstatus ?? 0) === 0;
    if (!editable && !run_doc.options?.internal) return;

    CW._preflight(run_doc);
    if (run_doc.error) return;
    CW._stripVirtual(run_doc); // strip virtual after validation, before DB write

    for (const a of CW._getAdapters(run_doc)) {
      if (run_doc.error) break;
      const schema = CW.Schema?.[run_doc.target_doctype];
      const autosave = run_doc.autosave ?? schema?.autosave ?? 1;
      if (autosave !== 0) {
        await globalThis.Adapters[a].update(run_doc);
      }
    }
  },

  updateMany: async function (run_doc) {
    const docs = run_doc.target?.data || [];
    const patch = { ...run_doc.input }; // shared patch, snapshot once

    for (let i = 0; i < docs.length; i++) {
      if (run_doc.error) break;

      run_doc.target.data[0] = docs[i]; // OLD → target
      run_doc.input = { ...patch }; // patch → input, restored each iteration

      await CW._logChanges(run_doc);
      CW._mergeInput(run_doc);
      CW._clearInput(run_doc);

      await CW._handlers.update(run_doc);

      docs[i] = run_doc.target.data[0];
    }

    run_doc.target.data = docs;
  },

  delete: async function (run_doc) {
    if (run_doc.target?.data?.[0]) run_doc.target.data[0].docstatus = 2;
    await CW._handlers.update(run_doc);
  },
};

console.log(
  "✅ CW-run.js loaded (signal format: dim.from_to e.g. 0.0_1, 1.0_1)",
);
