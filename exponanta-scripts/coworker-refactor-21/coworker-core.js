// ============================================================
// COWORKER CORE - Universal Orchestration Engine
// Single entry point: coworker.run()
// ============================================================

window.coworker = {
  // Global config storage
  _config: {},
  _handlers: {},
  _renderers: {},

  // ============================================================
  // ORCHESTRATION LAYER
  // ============================================================
  run: async function (op) {
    const start = Date.now();

    // Validation
    if (!op?.operation) {
      return this._failEarly("operation is required", start);
    }

    // Resolve all fields via config
    const resolved = this._resolveAll(op);

    // Construct run document
    const run_doc = {
      // Frappe standard fields
      doctype: "Run",
      name: this._generateId("run"),
      creation: start,
      modified: start,
      modified_by: resolved.owner || "system",
      docstatus: 0,
      owner: resolved.owner || "system",

      // Operation definition
      operation: resolved.operation,
      operation_original: op.operation,
      source_doctype: resolved.source_doctype,
      target_doctype: resolved.target_doctype,

      // UI/Rendering (PROMOTED)
      view: resolved.view || op.view || null,
      component: resolved.component || op.component || null,
      container: resolved.container || op.container || null,

      // Data flow
      input: op.input || {},
      output: null,

      // Execution state
      status: "running",
      success: false,
      error: null,
      duration: 0,

      // Hierarchy
      parent_run_id: op.options?.parentRunId || null,
      child_run_ids: [],

      // Flow context
      flow_id: op.flow_id || null,
      flow_template: op.flow_template || null,
      step_id: op.step_id || null,
      step_title: op.step_title || null,

      // Authorization
      agent: op.agent || null,

      // Options
      options: op.options || {},

      // Runtime helpers (placeholder for JSON)
      child: null
    };

    // STEP 1: RUNNING
    CoworkerState._updateFromRun(run_doc);

    // Inject child factory
    run_doc.child = (cfg) => this.run({
      ...cfg,
      options: { ...cfg.options, parentRunId: run_doc.name }
    });

    // Execute
    try {
      const result = await this._exec(run_doc);

      run_doc.output = result.output || result;
      run_doc.success = result.success === true;
      run_doc.error = result.error || null;

      // STEP 2: COMPLETED
      run_doc.status = "completed";
      run_doc.duration = Date.now() - start;
      run_doc.modified = Date.now();
      CoworkerState._updateFromRun(run_doc);

    } catch (err) {
      run_doc.success = false;
      run_doc.status = "failed";
      run_doc.error = {
        message: err.message,
        code: err.code || `${run_doc.operation?.toUpperCase() || 'OPERATION'}_FAILED`,
        stack: this.getConfig("debug") ? err.stack : undefined
      };

      // STEP 3: FAILED
      run_doc.duration = Date.now() - start;
      run_doc.modified = Date.now();
      CoworkerState._updateFromRun(run_doc);
    }

    // RENDER (top-level runs only)
    this._render(run_doc);

    return run_doc;
  },

  // ============================================================
  // EXECUTION
  // ============================================================
  _exec: async function(run_doc) {
    const handler = this._handlers[run_doc.operation];
    
    if (!handler) {
      throw new Error(`No handler for operation: ${run_doc.operation}`);
    }

    return await handler.call(this, run_doc);
  },

  // ============================================================
  // RESOLUTION
  // ============================================================
  _resolveAll: function(op) {
    const cfg = this._config.operations?.[op.operation] || {};
    
    return {
      operation: op.operation,
      source_doctype: op.source_doctype || cfg.source_doctype || null,
      target_doctype: op.target_doctype || cfg.target_doctype || op.source_doctype || null,
      view: op.view || cfg.view || null,
      component: op.component || cfg.component || null,
      owner: op.owner || "system"
    };
  },

  // ============================================================
  // RENDERING
  // ============================================================
  _preprocessRender: function(run_doc) {
    // Default: only render if explicitly requested
    return run_doc.options?.render === true;
  },

  _render: function(run_doc) {
    if (!this._preprocessRender(run_doc)) return;

    const renderer = this._renderers[run_doc.component];
    if (renderer) {
      renderer.call(this, run_doc);
    }
  },

  // ============================================================
  // RENDERERS REGISTRY
  // ============================================================
  _renderers: {
    MainGrid: function(run_doc) {
      const target = document.getElementById(run_doc.container);
      if (target) ReactDOM.render(React.createElement(MainGrid, { run: run_doc }), target);
    },
    
    MainForm: function(run_doc) {
      const target = document.getElementById(run_doc.container);
      if (target) ReactDOM.render(React.createElement(MainForm, { run: run_doc }), target);
    },
    
    MainChat: function(run_doc) {
      const target = document.getElementById(run_doc.container);
      if (target) ReactDOM.render(React.createElement(MainChat, { run: run_doc }), target);
    },
    
    ErrorConsole: function(run_doc) {
      const target = document.getElementById(run_doc.container);
      if (target) ReactDOM.render(React.createElement(ErrorConsole, { run: run_doc }), target);
    },
    
    FieldLink: function(run_doc) {
      const target = document.getElementById(run_doc.container);
      if (target) ReactDOM.render(React.createElement(FieldLink, { run: run_doc }), target);
    }
  },

  // ============================================================
  // UTILITIES
  // ============================================================
  _failEarly: function(message, start) {
    return {
      doctype: "Run",
      name: this._generateId("run"),
      creation: start,
      modified: Date.now(),
      status: "failed",
      success: false,
      error: { message, code: "VALIDATION_ERROR" },
      duration: Date.now() - start
    };
  },

  _generateId: function(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  getConfig: function(key) {
    return this._config[key];
  },

  setConfig: function(key, value) {
    this._config[key] = value;
  }
};