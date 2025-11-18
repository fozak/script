// ============================================================
// COWORKER CORE - Rendering Layer Only
// Execution logic lives in coworker-run.js
// ============================================================

// ============================================================
// RENDERING
// ============================================================

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
    const target = document.getElementById(run_doc.container);
    if (target && typeof MainGrid !== 'undefined') {
      ReactDOM.render(React.createElement(MainGrid, { run: run_doc }), target);
    }
  },
  
  MainForm: function(run_doc) {
    const target = document.getElementById(run_doc.container);
    if (target && typeof MainForm !== 'undefined') {
      ReactDOM.render(React.createElement(MainForm, { run: run_doc }), target);
    }
  },
  
  MainChat: function(run_doc) {
    const target = document.getElementById(run_doc.container);
    if (target && typeof MainChat !== 'undefined') {
      ReactDOM.render(React.createElement(MainChat, { run: run_doc }), target);
    }
  },
  
  ErrorConsole: function(run_doc) {
    const target = document.getElementById(run_doc.container);
    if (target && typeof ErrorConsole !== 'undefined') {
      ReactDOM.render(React.createElement(ErrorConsole, { run: run_doc }), target);
    }
  },
  
  FieldLink: function(run_doc) {
    const target = document.getElementById(run_doc.container);
    if (target && typeof FieldLink !== 'undefined') {
      ReactDOM.render(React.createElement(FieldLink, { run: run_doc }), target);
    }
  }
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