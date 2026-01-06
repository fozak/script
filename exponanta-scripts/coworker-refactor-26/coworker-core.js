// ============================================================
// COWORKER CORE - Minimal Rendering Coordination
// Execution logic lives in coworker-run.js
// UI components live in coworker-components.js
// ============================================================

// ============================================================
// RENDERING SYSTEM
// ============================================================

// React 18 roots cache
coworker._reactRoots = new Map();

/**
 * Get or create React 18 root for container
 */
coworker._getOrCreateRoot = function(containerId) {
  if (!this._reactRoots.has(containerId)) {
    const container = document.getElementById(containerId);
    if (container && typeof ReactDOM.createRoot !== 'undefined') {
      this._reactRoots.set(containerId, ReactDOM.createRoot(container));
    }
  }
  return this._reactRoots.get(containerId);
};

/**
 * Check if run should trigger render
 */
coworker._preprocessRender = function(run_doc) {
  return run_doc.options?.render === true;
};

/**
 * Main render dispatcher
 */
coworker._render = function(run_doc) {
  if (!this._preprocessRender(run_doc)) return;

  const renderer = this._renderers[run_doc.component];
  if (renderer) {
    renderer.call(this, run_doc);
  }
};

// ============================================================
// RENDERERS REGISTRY
// ============================================================

coworker._renderers = {
  MainGrid: function(run_doc) {
    const root = this._getOrCreateRoot(run_doc.container);
    if (root && typeof MainGrid !== 'undefined') {
      root.render(React.createElement(MainGrid, { run: run_doc }));
    }
  },

  MainForm: function(run_doc) {
    const root = this._getOrCreateRoot(run_doc.container);
    if (root && typeof MainForm !== 'undefined') {
      root.render(React.createElement(MainForm, { run: run_doc }));
    }
  },

  MainChat: function(run_doc) {
    const root = this._getOrCreateRoot(run_doc.container);
    if (root && typeof MainChat !== 'undefined') {
      root.render(React.createElement(MainChat, { run: run_doc }));
    }
  },

  ErrorConsole: function(run_doc) {
    const root = this._getOrCreateRoot(run_doc.container);
    if (root && typeof ErrorConsole !== 'undefined') {
      root.render(React.createElement(ErrorConsole, { run: run_doc }));
    }
  }
};

// ============================================================
// UNIVERSAL RECORD HANDLER
// ============================================================

coworker.onRecordClick = function(record, context = {}) {
  return this.run({
    operation: 'takeone',
    doctype: record.doctype,
    query: { where: { name: record.name } },
    options: { render: true },
    ...context
  });
};

// ============================================================
// UTILITIES
// ============================================================

coworker.getConfig = function(key, defaultValue) {
  return this._config?.[key] !== undefined ? this._config[key] : defaultValue;
};

coworker.setConfig = function(key, value) {
  if (!this._config) this._config = {};
  this._config[key] = value;
};