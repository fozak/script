// ============================================================
// CW-run.js — refactored
// Signal format: "dim.from_to" e.g. "0.0_1", "1.0_1"
// FSM pure helpers moved to CW-utils.js
// ============================================================

const CW = globalThis.CW;

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
  const adapterType = opConfig.adapterType || "db";
  op.adapter =
    cfg.adapters?.defaults?.[adapterType] || cfg.adapters?.defaults?.db;

  const view = cfg.operationToView?.[op.operation] ?? null;
  const viewConfig = cfg.views?.[view?.toLowerCase()] || {};
  op.view = "view" in op ? op.view : view;

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
// RESOLVE INPUT
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
// _execTransition
// ============================================================

CW._execTransition = async function (run_doc, dim, key) {
  const doctype = run_doc.target_doctype;
  const stateDef = CW._getStateDef(doctype);
  const dimDef = stateDef[dim];
  if (!dimDef) return;

  // collect all effects for this transition:
  // bare key "0_1"               → inline compiled function
  // dotted key "0_1.Adapter.x.y" → adapter call via globalThis path
  const effects = Object.entries(dimDef.sideEffects || {}).filter(
    ([k]) => k === key || k.startsWith(key + "."),
  );

  for (const [effectKey, fn] of effects) {
    if (effectKey === key) {
      // inline function
      if (typeof fn === "function") await fn(run_doc);
    } else {
      // adapter path — strip "key." prefix → "Adapter.auth.activate"
      const path = effectKey.slice(key.length + 1).split(".");
      let target = globalThis;
      for (const p of path) target = target?.[p];
      if (typeof target === "function") await target(run_doc);
      else
        console.warn(
          "[CW] Adapter effect not found:",
          effectKey.slice(key.length + 1),
        );
    }
  }

  const to = parseInt(key.split("_")[1]);
  if (!run_doc.input._state || typeof run_doc.input._state !== "object") {
    run_doc.input._state = {};
  }
  // dim current value NOT stored as bare key — derived from signal key by _getDimValue
  // only docstatus synced for dim 0 (field on document, not in _state)
  if (String(dim) === "0") {
    run_doc.input.docstatus = to;
  }

  // view switch after transition
  if (run_doc.container && dimDef.views?.[String(to)]) {
    const view = dimDef.views[String(to)];
    const resolved = CW._resolveViewComponent(doctype, view, run_doc.container);
    const component =
      resolved?.component ?? (typeof resolved === "string" ? resolved : null);
    const container =
      run_doc.container ||
      resolved?.container ||
      CW._config.views?.[view]?.container;
    if (component) {
      await run_doc.child({
        operation: "select",
        target_doctype: doctype,
        query: {
          where: {
            name: run_doc.target?.data?.[0]?.name || run_doc.query?.where?.name,
          },
        },
        view,
        component,
        container,
        options: { render: true },
      });
    }
  }
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
    target_doctype: op.target_doctype,
    adapter: op.adapter,

    view: op.view,
    component: op.component,
    container: op.container,
    context: op.context || {},

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
// CONTROLLER
// ============================================================

CW.controller = async function (run_doc) {
  run_doc.status = "running";
  run_doc.error = null;

  try {
    CW._resolveInput(run_doc);

    const stateEntries = Object.entries(run_doc.input._state || {});
    const signal = stateEntries.find(([, v]) => v === "");

    if (signal) {
      run_doc._signal = signal[0];
      await CW._handleSignal(run_doc);
    } else {
      const dataKeys = Object.keys(run_doc.input).filter((k) => k !== "_state");

      if (dataKeys.length > 0) {
        const hasName =
          run_doc.input.name ||
          run_doc.target?.data?.[0]?.name ||
          run_doc.query?.where?.name;
        run_doc.operation = hasName ? "update" : "create";

        if (run_doc.operation === "update") {
          await CW._handlers.update(run_doc);
        } else {
          await CW._handlers.create(run_doc);
        }

        if (!run_doc.error) {
          if (
            run_doc.operation === "create" &&
            run_doc.target?.data?.[0]?.name
          ) {
            run_doc.query = Object.assign({}, run_doc.query, {
              where: { name: run_doc.target.data[0].name },
            });
          }
          Object.keys(run_doc.input)
            .filter((k) => k !== "_state")
            .forEach((k) => delete run_doc.input[k]);
        }
      } else {
        const opConfig = CW._config.operations?.[run_doc.operation] || {};
        if (opConfig.type === "read" || opConfig.type === "auth") {
          await CW._handlers[run_doc.operation]?.(run_doc);
        }
      }
    }

    run_doc.status = run_doc.error ? "failed" : "completed";
    run_doc.success = !run_doc.error;
  } catch (err) {
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
// SIGNAL HANDLER
// Signal format: "dim.from_to" — e.g. "0.0_1", "1.0_1"
// Strict prefix matching — each dim only processes signals prefixed with "dim."
// ============================================================

CW._handleSignal = async function (run_doc) {
  const _savedInternal = run_doc.options?.internal;
  if (!run_doc.options) run_doc.options = {};
  run_doc.options.internal = true;

  const signal = run_doc._signal;
  const doctype = run_doc.target_doctype;
  const schema = CW.Schema?.[doctype];
  const db = CW._config.adapters.defaults.db;

  const existingName =
    run_doc.target?.data?.[0]?.name ||
    run_doc.input?.name ||
    run_doc.query?.where?.name;
  let existingDoc = run_doc.target?.data?.[0] || {};

  if (existingName && run_doc.target?.data?.[0]?.name !== existingName) {
    run_doc.query = Object.assign({}, run_doc.query, {
      where: { name: existingName },
    });
    await globalThis.Adapter[db].select(run_doc);
    existingDoc = run_doc.target?.data?.[0] || {};
  } else if (existingName) {
    run_doc.query = Object.assign({}, run_doc.query, {
      where: { name: existingName },
    });
    existingDoc = run_doc.target?.data?.[0] || {};
  }

  const stateDef = CW._getStateDef(doctype);

  let matched = false;
  for (const [dim, dimDef] of Object.entries(stateDef)) {
    if (!signal.startsWith(dim + ".")) continue;
    const key = signal.slice(dim.length + 1);

    if (
      dimDef.sideEffects?.[key] === undefined &&
      dimDef.labels?.[key] === undefined
    )
      continue;

    const currentVal = CW._getDimValue(existingDoc, dim, dimDef);
    const fromVal = parseInt(key.split("_")[0]);
    const toVal = parseInt(key.split("_")[1]);
    if (!isNaN(fromVal) && !isNaN(toVal)) {
      const validTos = dimDef.transitions?.[String(currentVal)] || [];
      if (fromVal !== currentVal || !validTos.includes(toVal)) {
        run_doc.error =
          "Transition " +
          key +
          " not allowed from current state " +
          currentVal +
          " (dim " +
          dim +
          ")";
        run_doc.input._state[signal] = "-1";
        run_doc.options.internal = _savedInternal;
        return;
      }
    }

    const requires = dimDef.requires?.[key] || {};
    const reqPassed = Object.entries(requires).every(
      ([k, v]) => Number(schema?.[k] ?? 0) === Number(v),
    );
    if (!reqPassed) {
      run_doc.error = `${signal} not allowed for this doctype`;
      run_doc.input._state[signal] = "-1";
      run_doc.options.internal = _savedInternal;
      return;
    }

    const rule = dimDef.rules?.[key];
    if (typeof rule === "function" && !rule(run_doc)) {
      run_doc.error = `${signal} rule not satisfied`;
      run_doc.input._state[signal] = "-1";
      run_doc.options.internal = _savedInternal;
      return;
    }

    try {
      await CW._execTransition(run_doc, dim, key);

      // clear previous signals for this dim — keep only latest per dim
      const prefix = dim + ".";
      Object.keys(run_doc.input._state).forEach((k) => {
        if (k.startsWith(prefix)) delete run_doc.input._state[k];
      });

      // mark signal success BEFORE write — "1" gets stored to PB
      run_doc.input._state[signal] = "1";

      run_doc.operation =
        run_doc.input.name || existingDoc.name ? "update" : "create";
      if (run_doc.operation === "update") {
        await CW._handlers.update(run_doc);
      } else {
        await CW._handlers.create(run_doc);
      }
    } catch (e) {
      run_doc.input._state[signal] = "-1";
      run_doc.error = e.message;
    }

    matched = true;
    break;
  }

  if (!matched) {
    if (signal === "save") {
      run_doc.operation =
        run_doc.input.name || existingDoc.name ? "update" : "create";
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
      const currentDocstatus = existingDoc.docstatus ?? 0;
      if (currentDocstatus !== 2) {
        run_doc.error = "amend only allowed on cancelled records (docstatus=2)";
        run_doc.input._state[signal] = "-1";
        run_doc.options.internal = _savedInternal;
        return;
      }
      const skipAmend = new Set([
        "name",
        "id",
        "created",
        "modified",
        "modified_by",
        "_state",
        "docstatus",
        "amended_from",
      ]);
      for (const [k, v] of Object.entries(existingDoc)) {
        if (!skipAmend.has(k)) run_doc.input[k] = v;
      }
      run_doc.input.amended_from = existingDoc.name;
      run_doc.input.docstatus = 0;
      delete run_doc.input.name;
      run_doc.operation = "create";
      await CW._handlers.create(run_doc);
    } else {
      run_doc.error = `Unknown signal: ${signal}`;
      run_doc.input._state[signal] = "-1";
    }
  }

  run_doc.options.internal = _savedInternal;

  if (!run_doc.error) {
    if (run_doc.operation === "create" && run_doc.target?.data?.[0]?.name) {
      run_doc.query = Object.assign({}, run_doc.query, {
        where: { name: run_doc.target.data[0].name },
      });
    }
    Object.keys(run_doc.input)
      .filter((k) => k !== "_state")
      .forEach((k) => delete run_doc.input[k]);
  } else {
    if (run_doc.input._state) {
      run_doc.input._state[signal] = "-1";
    }
  }
};

// ============================================================
// PREFLIGHT
// ============================================================

CW._preflight = function (run_doc, operation) {
  const schema = CW.Schema?.[run_doc.target_doctype];
  const input = run_doc.input;

  if (operation === "create") {
    if (schema?.fields) {
      const missing = schema.fields
        .filter(
          (f) =>
            f.reqd &&
            f.fieldtype !== "Table" &&
            (input[f.fieldname] === undefined ||
              input[f.fieldname] === null ||
              input[f.fieldname] === ""),
        )
        .map((f) => f.label || f.fieldname);
      if (missing.length) {
        run_doc.error = `Required: ${missing.join(", ")}`;
        return;
      }
    }

    if (schema?.fields) {
      for (const f of schema.fields) {
        if (f.default !== undefined && input[f.fieldname] === undefined) {
          input[f.fieldname] = f.default;
        }
      }
    }

    // initialize _state as empty — signal keys written on first transition
    input._state = {};

    // populate _allowed/_allowed_read from schema.permissions
    // Self is skipped — owner is handled by systemFields
    const perms = schema?.permissions || [];
    const fromPerms = [];
    const fromPermsRead = [];
    for (const p of perms) {
      if (!p.role || p.role === "Self") continue;
      const roleId = generateId("Role", p.role);
      if (p.write || p.create || p.delete) fromPerms.push(roleId);
      else if (p.read) fromPermsRead.push(roleId);
    }
    if (fromPerms.length) {
      input._allowed = [...new Set([...(input._allowed || []), ...fromPerms])];
    }
    if (fromPermsRead.length) {
      input._allowed_read = [
        ...new Set([...(input._allowed_read || []), ...fromPermsRead]),
      ];
    }
  }

  if (operation === "update") {
    if (schema?.fields) {
      const merged = Object.assign({}, run_doc.target?.data?.[0], input);
      const missing = schema.fields
        .filter(
          (f) =>
            f.reqd &&
            f.fieldtype !== "Table" &&
            (merged[f.fieldname] === undefined ||
              merged[f.fieldname] === null ||
              merged[f.fieldname] === ""),
        )
        .map((f) => f.label || f.fieldname);
      if (missing.length) {
        run_doc.error = `Required: ${missing.join(", ")}`;
        return;
      }
    }

    // preserve existing _state keys from other dims
    // clear same-dim signals — keep only latest per dim
    if (run_doc.target?.data?.[0]?._state) {
      const targetState = run_doc.target.data[0]._state;
      // strip same-dim signals from targetState before merge
      Object.keys(input._state || {}).forEach((sig) => {
        const dim = sig.split(".")[0];
        if (isNaN(dim)) return;
        const prefix = dim + ".";
        Object.keys(targetState).forEach((k) => {
          if (k.startsWith(prefix)) delete targetState[k];
        });
      });
      input._state = Object.assign({}, targetState, input._state || {});
    }
  }

  if (schema?.fields) {
    for (const f of schema.fields) {
      if (
        f.fieldtype === "Code" &&
        f.options === "JSON" &&
        typeof input[f.fieldname] === "object"
      ) {
        if (f.fieldname === "_state") continue; // _state managed by FSM — never stringify
        input[f.fieldname] = JSON.stringify(input[f.fieldname]);
      }
    }
  }

  for (const sf of CW._config.systemFields || []) {
    if (sf.onWrite) sf.onWrite(run_doc);
    if (sf.onCreate && operation === "create") sf.onCreate(run_doc);
  }
};

// ============================================================
// HANDLERS
// ============================================================

CW._handlers = {
  select: async function (run_doc) {
    const db = CW._config.adapters.defaults.db;
    await globalThis.Adapter[db].select(run_doc);
    if (run_doc.error || !run_doc.target?.data) return;

    const schema =
      CW.Schema?.[run_doc.target_doctype ?? run_doc.source_doctype];
    const activeView = run_doc.view || run_doc.query?.view || "list";
    const sel = run_doc.query?.select;

    if (schema && !sel) {
      const shouldFilter = activeView === "list" || activeView === "card";
      if (shouldFilter) {
        const viewFields = schema.fields
          .filter((f) => f.in_list_view)
          .map((f) => f.fieldname);
        const titleField = schema.title_field ? [schema.title_field] : [];
        const systemFields = (CW._config.systemFields || [])
          .filter((sf) => sf.fetch)
          .map((sf) => sf.name);
        const fields = [
          ...new Set([...systemFields, ...titleField, ...viewFields]),
        ];
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
  },

  create: async function (run_doc) {
    CW._preflight(run_doc, "create");
    if (run_doc.error) return;
    const db = CW._config.adapters.defaults.db;
    await globalThis.Adapter[db].create(run_doc);
  },

  update: async function (run_doc) {
    const db = CW._config.adapters.defaults.db;
    const name =
      run_doc.input?.name ||
      run_doc.target?.data?.[0]?.name ||
      run_doc.query?.where?.name;
    if (!name) {
      run_doc.error = "Update requires a record name";
      return;
    }
    if (!run_doc.query?.where?.name) {
      run_doc.query = Object.assign({}, run_doc.query, { where: { name } });
    }

    const savedSelect = run_doc.query?.select;
    if (savedSelect)
      run_doc.query = Object.assign({}, run_doc.query, { select: undefined });
    await globalThis.Adapter[db].select(run_doc);
    if (savedSelect)
      run_doc.query = Object.assign({}, run_doc.query, { select: savedSelect });
    if (run_doc.error) return;

    const freshDoc = run_doc.target?.data?.[0] || {};
    const editable = (freshDoc.docstatus ?? 0) === 0;
    if (!editable && !run_doc.options?.internal) return;

    CW._preflight(run_doc, "update");
    if (run_doc.error) return;
    await globalThis.Adapter[db].update(run_doc);
  },

  delete: async function (run_doc) {
    run_doc.input.docstatus = 2;
    await CW._handlers.update(run_doc);
  },
};

console.log(
  "✅ CW-run.js loaded (signal format: dim.from_to e.g. 0.0_1, 1.0_1)",
);
