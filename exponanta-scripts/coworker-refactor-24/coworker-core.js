// ============================================================
// COWORKER CORE - Rendering Layer Only
// Execution logic lives in coworker-run.js
// ============================================================

// ============================================================
// RENDERING
// ============================================================

// React 18 roots cache
coworker._reactRoots = new Map();

coworker._getOrCreateRoot = function(containerId) {
  if (!this._reactRoots.has(containerId)) {
    const container = document.getElementById(containerId);
    if (container && typeof ReactDOM.createRoot !== 'undefined') {
      this._reactRoots.set(containerId, ReactDOM.createRoot(container));
    }
  }
  return this._reactRoots.get(containerId);
};

coworker._preprocessRender = function(run_doc) {
  // Default: only render if explicitly requested
  return run_doc.options?.render === true;
};

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
  },

  FieldLink: function(run_doc) {
    const root = this._getOrCreateRoot(run_doc.container);
    if (root && typeof FieldLink !== 'undefined') {
      root.render(React.createElement(FieldLink, { run: run_doc }));
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
    input: { where: { name: record.name } },
    options: { render: true },
    ...context
  });
};

// ============================================================
// UTILITIES
// ============================================================

coworker._generateId = function(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

coworker.getConfig = function(key, defaultValue) {
  return this._config?.[key] !== undefined ? this._config[key] : defaultValue;
};

coworker.setConfig = function(key, value) {
  if (!this._config) this._config = {};
  this._config[key] = value;
};