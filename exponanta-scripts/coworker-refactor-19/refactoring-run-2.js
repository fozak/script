
Prefinal version 


// === ORCHESTRATION LAYER ===
coworker.run = async function(op) {
  const start = Date.now();
  if (!op?.operation) return this._failEarly("operation is required", start);
  
  const run_doc = {
    id: generateId("run"),
    timestamp: start,
    operation: op.operation,
    doctype: op.doctype,
    input: op.input || null,
    output: null,
    success: false,
    error: null,
    status: "running",
    parent_run_id: op.options?.parentRunId || null,
    options: op.options || {},
    owner: op.owner || "system",
    duration: 0
  };
  
  const persist = async (action) => {
    await this[`_handle${capitalize(action)}`]({ doctype: "Run", input: { data: run_doc }, options: {} });
    CoworkerState._updateFromRun(run_doc);
  };
  
  const child = (cfg) => this.run({ ...cfg, options: { ...cfg.options, parentRunId: run_doc.id } });
  
  await persist("create");
  
  try {
    const res = await this._handleOperation({ ...op, child });
    Object.assign(run_doc, { status: "completed", success: true, output: res.output || res });
  } catch (err) {
    Object.assign(run_doc, { 
      status: "failed", 
      success: false, 
      error: { 
        message: err.message, 
        code: err.code || `${op.operation?.toUpperCase() || 'OPERATION'}_FAILED`,
        stack: this.getConfig("debug") ? err.stack : undefined
      }
    });
  }
  
  run_doc.duration = Date.now() - start;
  await persist("update");
  if (!run_doc.parent_run_id) CoworkerState._renderFromRun(run_doc);
  return run_doc;
};

// === EXECUTION LAYER ===
coworker._handleOperation = async function(op) {
  const map = { read: "select", insert: "create" };
  const resolved = map[op.operation?.toLowerCase()] || op.operation;
  const name = `_handle${capitalize(resolved)}`;
  const handler = this[name] || ((ctx) => this._emitOperation(resolved, ctx));
  
  return await handler({ 
    operation: resolved,
    doctype: op.doctype,
    input: op.input,
    options: op.options,
    child: op.child
  });
};
















//== we create 3 new doctypes with its frappe-like schemas. operation_doc, run_doc, flow_doc

coworker.run = async function(operation_doc) {
  const start = Date.now();
  const run_id = generateId('run');
  

  // --- 1. BASIC VALIDATION ---
  if (!operation_doc || typeof operation_doc !== "object")
    return this._failEarly("Invalid operation_doc", start);
  if (!operation_doc.operation)
    return this._failEarly("operation is required", start);

  // --- 2. BUILD CONTEXT ---
  const run_doc = this._handleCreateFrom({ from: operation_doc, data: { run_id, start, status: "running" } }); //MakeRunDoc was before need to create createFrom to create from another doctype
  
  // --- 3. CHILD FACTORY ---  TODO is this recursion??
  const child = (childoperation_doc) => this.run({
    ...childoperation_doc,
    options: { ...childoperation_doc.options, parentRunId: runId }
  });

  // --- 4. EXECUTION PHASE --- POTENTIALLY OPERATION RESOLVER should be first plance operation_doc and run_doc should have either real ops of fail
  try {
    const opAlias = { read: "select", insert: "create" }; //CALL resolver from configuration.json - call resolver from configuration
    const resolvedOp = opAlias[run_doc.operation.toLowerCase()] || run_doc.operation;
    const handlerName = `_handle${capitalize(resolvedOp)}`;

    const context = {
      ...run_doc,
      operation: resolvedOp,
      child,
    };

    const result = await (typeof this[handlerName] === "function"
      ? this[handlerName](context)
      : this._emitOperation(resolvedOp, context)); // EVENT EMITTER AS FALLBACK

    if (!result) throw new Error(`No handler for operation: ${resolvedOp}`);

    run_doc.output = result.output || result;
    run_doc.success = !!result.success;
    run_doc.error = result.error || null;

    await this._handleUpdate(run_doc, "completed", start);
  } catch (err) {
    await this._handleUpdate(run_doc, "failed", start, err);
  }

  // --- 5. RENDER TOP LEVEL ---
  if (!run_doc.parent_run_id) CoworkerState._renderFromRun(run_doc);
  return run_doc;
};

// ============================================================================
// HELPERS
// ============================================================================

// Build standardized run_doc
coworker._makeRunDoc = function(config, id, start) {
  const d = (k, ...alts) => alts.find(Boolean); // fallback resolver
  return {
    id, name: id, timestamp: start,
    status: "pending", duration: 0, success: false, error: null,
    operation: config.operation,
    doctype: d(config.doctype, config.from, config.into, config.template),
    from: d(config.from, config.doctype),
    into: d(config.into, config.doctype),
    template: config.template || null,
    flow: config.flow || null,
    input: config.input || null,
    output: null,
    parent_run_id: config.options?.parentRunId || null,
    child_run_ids: [],
    chain_id: config.options?.chainId || null,
    owner: config.owner || this.getConfig("defaultUser", "system"),
    agent: config.agent || null,
    options: config.options || {},
  };
};

// Generic status setter (create/update with duration + state sync)
coworker._setStatus = async function(run_doc, status, start, err = null) {
  run_doc.status = status;
  run_doc.duration = Date.now() - start;
  if (err) {
    run_doc.success = false;
    run_doc.error = this._normalizeError(run_doc, err);
  } else if (status === "completed") {
    run_doc.success = true;
  }
  const op = status === "running" ? "_handleCreate" : "_handleUpdate";
  await this[op]({ doctype: "Run", input: { data: run_doc }, options: {} });
  CoworkerState._updateFromRun(run_doc);
};

// Normalize errors
coworker._normalizeError = function(run_doc, err) {
  return {
    message: err.message,
    code: err.code || `${run_doc.operation?.toUpperCase() || 'RUN'}_FAILED`,
    details: {
      ...(err.details || {}),
      operation: run_doc.operation,
      doctype: run_doc.doctype,
      runId: run_doc.id,
      flowId: run_doc.options?.flowId,
      stepId: run_doc.options?.stepId,
    },
    ...(this.getConfig("debug") && { stack: err.stack }),
  };
};

// Fallback for event-based handlers
coworker._emitOperation = async function(op, ctx) {
  const results = await this.emit(`coworker:run:${op}`, ctx);
  return results.find(r => r != null);
};

// Fast fail for invalid config
coworker._failEarly = function(message, start) {
  const now = Date.now();
  return {
    id: generateId('run'),
    timestamp: start,
    status: "failed",
    duration: now - start,
    success: false,
    error: { message, code: "VALIDATION_FAILED" },
  };
};
