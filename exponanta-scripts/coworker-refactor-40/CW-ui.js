// ============================================================
// CW-ui.js
// React 18 UMD, no JSX, Tabler CSS
// All functions: function(run_doc) — mutate only, no return
// ============================================================

const CW = globalThis.CW;

// ============================================================
// RENDER SYSTEM
// ============================================================

CW._reactRoots = new Map();

CW._getOrCreateRoot = function(containerId) {
  if (!CW._reactRoots.has(containerId)) {
    const container = document.getElementById(containerId);
    if (container) {
      CW._reactRoots.set(containerId, ReactDOM.createRoot(container));
    }
  }
  return CW._reactRoots.get(containerId);
};

CW._render = function(run_doc) {
  if (!run_doc?.component || !run_doc?.container) return;

  const component = CW._components[run_doc.component];
  if (!component) return;

  const root = CW._getOrCreateRoot(run_doc.container);
  if (!root) return;

  root.render(React.createElement(component, { run_doc }));
};

// ============================================================
// NAVIGATION HELPERS
// ============================================================

function _getMainRuns() {
  return Object.values(CW.runs)
    .filter(r => r.component?.startsWith('Main') && r.options?.render !== false)
    .sort((a, b) => a.creation - b.creation);
}

function _getCurrentIndex() {
  return _getMainRuns().findIndex(r => r.name === CW.current_run);
}

function navigate(direction) {
  const runs  = _getMainRuns();
  const idx   = _getCurrentIndex();
  const target = direction === 'back' ? idx - 1 : idx + 1;
  if (target >= 0 && target < runs.length) {
    CW.current_run = runs[target].name;
    CW._render(runs[target]);
    _updateNavUI();
    return true;
  }
  return false;
}

function navigateTo(runName) {
  const run = CW.runs[runName];
  if (!run) return false;
  CW.current_run = runName;
  CW._render(run);
  _updateNavUI();
  return true;
}

function _getBreadcrumbs() {
  const current = CW.getCurrentRun();
  const home    = _getMainRuns()[0]?.name;

  if (!current?.component?.startsWith('Main')) {
    return [{ text: 'Home', runName: home }];
  }

  if (current.component === 'MainGrid') {
    return [
      { text: 'Home', runName: home },
      { text: current.source_doctype || current.target_doctype || 'List', runName: null },
    ];
  }

  if (current.component === 'MainForm') {
    const doctype = current.source_doctype || current.target_doctype;
    const docname = current.target?.data?.[0]?.name || 'New';
    const gridRun = _findGridRun(doctype);
    return [
      { text: 'Home', runName: home },
      { text: doctype, runName: gridRun },
      { text: docname, runName: null },
    ];
  }

  return [{ text: 'Home', runName: home }];
}

function _findGridRun(doctype) {
  const runs = _getMainRuns();
  const idx  = _getCurrentIndex();
  for (let i = idx - 1; i >= 0; i--) {
    if (runs[i].component === 'MainGrid' && (runs[i].source_doctype === doctype || runs[i].target_doctype === doctype)) {
      return runs[i].name;
    }
  }
  return null;
}

function _updateNavUI() {
  const runs = _getMainRuns();
  const idx  = _getCurrentIndex();

  const backBtn    = document.getElementById('back_btn');
  const forwardBtn = document.getElementById('forward_btn');
  if (backBtn)    backBtn.disabled    = idx <= 0;
  if (forwardBtn) forwardBtn.disabled = idx >= runs.length - 1;

  const breadcrumbsEl = document.getElementById('breadcrumbs');
  if (breadcrumbsEl) {
    breadcrumbsEl.innerHTML = _getBreadcrumbs().map((crumb, i, arr) => {
      const isLast = i === arr.length - 1;
      if (isLast) return `<span class="breadcrumb-item active">${crumb.text}</span>`;
      if (crumb.runName) return `<span class="breadcrumb-item"><a href="#" onclick="navigateTo('${crumb.runName}');return false;">${crumb.text}</a></span>`;
      return `<span class="breadcrumb-item">${crumb.text}</span>`;
    }).join('');
  }
}

globalThis.navigate   = navigate;
globalThis.navigateTo = navigateTo;

globalThis.addEventListener('coworker:state:change', _updateNavUI);

// ============================================================
// FIELD RENDERER
// ============================================================

const FieldRenderer = function({ field, run_doc }) {
  const schema  = CW.Schema?.[run_doc.target_doctype];
  const doc     = Object.assign({}, run_doc.target?.data?.[0], run_doc.input);
  const value   = doc[field.fieldname];
  const safeVal = value === null || value === undefined
    ? (field.fieldtype === 'Check' ? false : '')
    : value;

  const onChange = (val) => {
    run_doc.input[field.fieldname] = val;
  };

  // Section Break
  if (field.fieldtype === 'Section Break') {
    return React.createElement('div', { className: 'col-12 mt-3' },
      field.label ? React.createElement('h5', { className: 'mb-2' }, field.label) : null,
      React.createElement('hr', { className: 'mt-0' })
    );
  }

  // Column Break — handled by grid layout
  if (field.fieldtype === 'Column Break') return null;

  // Read Only
  if (field.fieldtype === 'Read Only') {
    return React.createElement('input', {
      type: 'text',
      className: 'form-control',
      value: safeVal,
      readOnly: true,
    });
  }

  // Check
  if (field.fieldtype === 'Check') {
    return React.createElement('div', { className: 'form-check' },
      React.createElement('input', {
        type: 'checkbox',
        className: 'form-check-input',
        checked: !!safeVal,
        onChange: (e) => onChange(e.target.checked ? 1 : 0),
      })
    );
  }

  // Select
  if (field.fieldtype === 'Select') {
    const options = (field.options || '').split('\n').filter(Boolean);
    return React.createElement('select', {
      className: 'form-select',
      value: safeVal,
      onChange: (e) => onChange(e.target.value),
    },
      React.createElement('option', { value: '' }, ''),
      options.map(opt => React.createElement('option', { key: opt, value: opt }, opt))
    );
  }

  // Int / Float / Currency / Percent
  if (['Int', 'Float', 'Currency', 'Percent'].includes(field.fieldtype)) {
    return React.createElement('input', {
      type: 'number',
      className: 'form-control',
      value: safeVal,
      step: field.fieldtype === 'Int' ? '1' : '0.01',
      onChange: (e) => onChange(field.fieldtype === 'Int' ? parseInt(e.target.value) : parseFloat(e.target.value)),
    });
  }

  // Date / Datetime / Time
  if (field.fieldtype === 'Date')     return React.createElement('input', { type: 'date',           className: 'form-control', value: safeVal, onChange: (e) => onChange(e.target.value) });
  if (field.fieldtype === 'Datetime') return React.createElement('input', { type: 'datetime-local', className: 'form-control', value: safeVal, onChange: (e) => onChange(e.target.value) });
  if (field.fieldtype === 'Time')     return React.createElement('input', { type: 'time',           className: 'form-control', value: safeVal, onChange: (e) => onChange(e.target.value) });

  // Text / Long Text / Text Editor
  if (['Text', 'Long Text', 'Text Editor'].includes(field.fieldtype)) {
    return React.createElement('textarea', {
      className: 'form-control',
      rows: field.fieldtype === 'Long Text' ? 6 : 3,
      value: safeVal,
      onChange: (e) => onChange(e.target.value),
    });
  }

  // Code
  if (field.fieldtype === 'Code') {
    const displayVal = typeof safeVal === 'object' ? JSON.stringify(safeVal, null, 2) : safeVal;
    return React.createElement('textarea', {
      className: 'form-control font-monospace',
      rows: 6,
      value: displayVal,
      onChange: (e) => {
        try { onChange(JSON.parse(e.target.value)); }
        catch { onChange(e.target.value); }
      },
    });
  }

  // Password
  if (field.fieldtype === 'Password') {
    return React.createElement('input', {
      type: 'password',
      className: 'form-control',
      value: safeVal,
      onChange: (e) => onChange(e.target.value),
    });
  }

  // Link
  if (field.fieldtype === 'Link') {
    return React.createElement('input', {
      type: 'text',
      className: 'form-control',
      value: safeVal,
      placeholder: `Select ${field.label || field.fieldname}...`,
      onChange: (e) => onChange(e.target.value),
    });
  }

  // Default — Data
  return React.createElement('input', {
    type: 'text',
    className: 'form-control',
    value: safeVal,
    onChange: (e) => onChange(e.target.value),
  });
};

// ============================================================
// MAIN FORM
// ============================================================

const MainForm = function({ run_doc }) {
  const doctype  = run_doc.target_doctype || run_doc.source_doctype;
  const schema   = CW.Schema?.[doctype];
  const behavior = schema ? CW.getBehavior(schema, run_doc.input) : null;
  const doc      = Object.assign({}, run_doc.target?.data?.[0], run_doc.input);

  if (!schema) {
    return React.createElement('div', { className: 'alert alert-warning' }, `Schema not found: ${doctype}`);
  }

  const title     = doc[schema.title_field || 'name'] || doc.name || 'New';
  const fields    = schema.fields || [];
  const skipTypes = new Set(['Section Break', 'Column Break', 'Tab Break', 'HTML']);

  // badge
  const badge = behavior?.ui?.badge;
  const docstatusBadge = !badge && schema.is_submittable
    ? [null, { cls: 'bg-warning', label: 'Draft' }, { cls: 'bg-success', label: 'Submitted' }, { cls: 'bg-danger', label: 'Cancelled' }][doc.docstatus ?? 0]
    : null;

  return React.createElement('div', { className: 'card' },
    React.createElement('div', { className: 'card-header d-flex justify-content-between align-items-center' },
      React.createElement('h3', { className: 'card-title mb-0' }, title),
      React.createElement('div', { className: 'd-flex gap-2 align-items-center' },
        badge
          ? React.createElement('span', { className: `badge ${badge.class}` }, badge.label)
          : docstatusBadge
            ? React.createElement('span', { className: `badge ${docstatusBadge.cls}` }, docstatusBadge.label)
            : null,
        // behavior buttons
        behavior?.ui?.showButtons?.map(action =>
          React.createElement('button', {
            key: action,
            className: action === 'delete' ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm',
            onClick: () => { run_doc.input._state = { [action]: '' }; },
          }, action.charAt(0).toUpperCase() + action.slice(1))
        )
      )
    ),
    React.createElement('div', { className: 'card-body' },
      React.createElement('div', { className: 'row g-3' },
        fields
          .filter(f => evaluateDependsOn(f.depends_on, doc))
          .map(f => {
            if (f.fieldtype === 'Section Break') {
              return React.createElement('div', { key: f.fieldname, className: 'col-12 mt-2' },
                f.label ? React.createElement('h5', { className: 'mb-1' }, f.label) : null,
                React.createElement('hr', { className: 'mt-0 mb-2' })
              );
            }
            if (skipTypes.has(f.fieldtype)) return null;

            return React.createElement('div', { key: f.fieldname, className: 'col-md-6' },
              f.label && React.createElement('label', { className: 'form-label' },
                f.label,
                f.reqd && React.createElement('span', { className: 'text-danger ms-1' }, '*')
              ),
              React.createElement(FieldRenderer, { field: f, run_doc }),
              run_doc._validationErrors?.find(e => e.field === f.fieldname) &&
                React.createElement('div', { className: 'text-danger small mt-1' },
                  run_doc._validationErrors.find(e => e.field === f.fieldname).message
                )
            );
          })
      )
    ),
    run_doc.error && React.createElement('div', { className: 'card-footer' },
      React.createElement('div', { className: 'alert alert-danger mb-0' }, 
        typeof run_doc.error === 'string' ? run_doc.error : run_doc.error.message
      )
    )
  );
};

// ============================================================
// MAIN GRID
// ============================================================

const MainGrid = function({ run_doc }) {
  const data      = run_doc.target?.data || [];
  const doctype   = run_doc.source_doctype || run_doc.target_doctype;
  const validData = data.filter(Boolean);

  const onNew = () => {
    CW.run({
      operation: 'create',
      target_doctype: doctype,
      view: 'form',
      component: 'MainForm',
      container: run_doc.container,
      options: { render: true },
    });
  };

  const onRowClick = (record) => {
    const r = CW.run({
      operation: 'select',
      target_doctype: record.doctype || doctype,
      query: { where: { name: record.name }, view: 'form' },
      view: 'form',
      component: 'MainForm',
      container: run_doc.container,
      options: { render: true },
    });
    CW.controller(r);
  };

  if (!validData.length) {
    return React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'card-header d-flex justify-content-between align-items-center' },
        React.createElement('h3', { className: 'card-title mb-0' }, doctype),
        React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: onNew }, '+ New')
      ),
      React.createElement('div', { className: 'card-body' },
        React.createElement('div', { className: 'alert alert-info mb-0' }, 'No records found')
      )
    );
  }

  const keys = Object.keys(validData[0]).filter(k => !k.startsWith('_'));

  return React.createElement('div', { className: 'card' },
    React.createElement('div', { className: 'card-header d-flex justify-content-between align-items-center' },
      React.createElement('h3', { className: 'card-title mb-0' }, doctype),
      React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: onNew }, '+ New')
    ),
    React.createElement('div', { className: 'card-body p-0' },
      React.createElement('div', { className: 'table-responsive' },
        React.createElement('table', { className: 'table table-vcenter table-hover card-table' },
          React.createElement('thead', {},
            React.createElement('tr', {},
              keys.map(k => React.createElement('th', { key: k }, k))
            )
          ),
          React.createElement('tbody', {},
            validData.map((row, i) =>
              React.createElement('tr', {
                key: i,
                style: { cursor: 'pointer' },
                onClick: () => onRowClick(row),
              },
                keys.map(k => React.createElement('td', { key: k }, String(row[k] ?? '')))
              )
            )
          )
        )
      )
    )
  );
};

// ============================================================
// COMPONENT REGISTRY
// ============================================================

CW._components = { MainForm, MainGrid };

// Listen for state changes → re-render current run
globalThis.addEventListener('coworker:state:change', (e) => {
  const run_doc = e.detail?.run;
  if (run_doc?.options?.render === true) {
    CW._render(run_doc);
    _updateNavUI();
  }
});

console.log('✅ CW-ui.js loaded');
