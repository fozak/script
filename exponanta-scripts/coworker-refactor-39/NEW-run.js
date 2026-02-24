// ============================================================
// coworker-run.js
// ============================================================
const CW = globalThis.CW;

// ============================================================
// SCHEMA CACHE
// ============================================================
CW._schemaCache = new Map();

// ============================================================
// RESOLVER
// ============================================================
CW._resolveAll = function (op) {
  const cfg = CW._config;
  const resolved = {};

  resolved.operation =
    cfg.operationAliases[op.operation?.toLowerCase()] || op.operation;

  const dtMap = cfg.doctypeAliases || {};
  resolved.source_doctype = op.source_doctype
    ? dtMap[op.source_doctype.toLowerCase()] || op.source_doctype
    : null;
  resolved.target_doctype = op.target_doctype
    ? dtMap[op.target_doctype.toLowerCase()] || op.target_doctype
    : null;

  resolved.view =
    cfg.operationToView[resolved.operation?.toLowerCase()] ?? null;

  const viewConfig = cfg.views?.[resolved.view?.toLowerCase()] || {};
  resolved.component = viewConfig.component ?? null;
  resolved.container = viewConfig.container ?? null;
  resolved.options = viewConfig.options || {};

  resolved.owner = op.owner || "system";

  return resolved;
};

// ============================================================
// MAIN run()
// ============================================================
CW.run = async function (op) {
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
    input: op.input || {},
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
    },
  });

  // browser only — global reference for console testing
  if (typeof window !== "undefined") {
    globalThis.CW.RUN = run_doc;
  }

  // draft init
  if (run_doc.options.draft) {
    if (run_doc.query.where?.name && !run_doc.input.name) {
      run_doc.input.name = run_doc.query.where.name;
    }
  }

  // computed doc getter
  Object.defineProperty(run_doc, "doc", {
    get() {
      const original = this.target?.data?.[0] || {};
      const delta = this.input || {};
      return this.options.draft ? { ...original, ...delta } : original;
    },
  });

  // child factory
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

  // execute
  try {
    const result = await CW._exec(run_doc);

    run_doc.target = result.target || result;
    run_doc.success = result.success === true;
    run_doc.error = result.error || null;

    if (
      run_doc.options.draft &&
      run_doc.target?.data?.[0]?.doctype &&
      !run_doc.input.doctype
    ) {
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
      stack: CW.getConfig("debug") ? err.stack : undefined,
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
CW._exec = async function (run_doc) {
  const hasStateIntents =
    run_doc.input?._state &&
    Object.values(run_doc.input._state).some((v) => v === "");

  if (hasStateIntents) {
    return await CW.controller(run_doc);
  }

  return await CW.controllerLegacy.execute(run_doc);
};

// ============================================================
// FAIL EARLY
// ============================================================
CW._failEarly = function (message, start) {
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

console.log("✅ coworker-run.js loaded");
