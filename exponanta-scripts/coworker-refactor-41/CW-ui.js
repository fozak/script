// ============================================================
// CW-ui.js
// React 18 UMD, no JSX, Tabler CSS
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
// NAVIGATION
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
  const runs   = _getMainRuns();
  const idx    = _getCurrentIndex();
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

function _findGridRun(doctype) {
  const runs = _getMainRuns();
  const idx  = _getCurrentIndex();
  for (let i = idx - 1; i >= 0; i--) {
    if (runs[i].component === 'MainGrid' &&
       (runs[i].source_doctype === doctype || runs[i].target_doctype === doctype)) {
      return runs[i].name;
    }
  }
  return null;
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
    const doctype    = current.source_doctype || current.target_doctype;
    const schema     = CW.Schema?.[doctype];
    const titleField = schema?.title_field || 'name';
    const doc        = current.target?.data?.[0] || {};
    const docname    = doc[titleField] || doc.name || 'New';
    return [
      { text: 'Home', runName: home },
      { text: doctype, runName: _findGridRun(doctype) },
      { text: docname, runName: null },
    ];
  }
  return [{ text: 'Home', runName: home }];
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
      if (isLast)        return `<li class="breadcrumb-item active">${crumb.text}</li>`;
      if (crumb.runName) return `<li class="breadcrumb-item"><a href="#" onclick="navigateTo('${crumb.runName}');return false;">${crumb.text}</a></li>`;
      return             `<li class="breadcrumb-item">${crumb.text}</li>`;
    }).join('');
  }
}

globalThis.navigate   = navigate;
globalThis.navigateTo = navigateTo;

globalThis.addEventListener('coworker:state:change', _updateNavUI);

// ============================================================
// FIELD RENDERER
// React owns localVal — display only, preserves focus
// Controller owns run_doc.input — delta only
// No merging here
// ============================================================

const FieldRenderer = function({ field, run_doc }) {
  const doc_       = run_doc.target?.data?.[0] || {};
  const readOnly   = (doc_.docstatus ?? 0) !== 0;
  const initial    = run_doc.target?.data?.[0]?.[field.fieldname];
  const safeInitial = initial === null || initial === undefined
    ? (field.fieldtype === 'Check' ? 0 : '')
    : initial;

  const [localVal, setLocalVal] = React.useState(safeInitial);
  const timerRef = React.useRef(null);
  const debounceOnChange = CW._config?.fieldInteractionConfig?.onChange?.debounce ?? 5000;
  const debounceOnBlur   = CW._config?.fieldInteractionConfig?.onBlur?.debounce   ?? 0;

  // Link field state — must be at top level (Rules of Hooks)
  const linkSchema  = CW.Schema?.[field.options];
  const titleField  = linkSchema?.title_field || 'name';
  const [linkOptions, setLinkOptions] = React.useState([]);
  const [isOpen, setIsOpen]           = React.useState(false);
  const [searchText, setSearchText]   = React.useState(field.fieldtype === 'Link' ? (safeInitial || '') : '');

  // Table field state — must be at top level (Rules of Hooks)
  const childSchema   = CW.Schema?.[field.options];
  const colFields     = React.useMemo(() => {
    if (field.fieldtype !== 'Table') return [];
    const listFields = childSchema?.fields?.filter(f => f.in_list_view) || [];
    return listFields.length > 0
      ? listFields
      : childSchema?.fields?.filter(f => !['Section Break','Column Break','Tab Break','HTML','Button'].includes(f.fieldtype))?.slice(0,5) || [];
  }, [field.options, field.fieldtype]);
  const [childData, setChildData]     = React.useState([]);
  const [childLoaded, setChildLoaded] = React.useState(false);
  const doc__ = run_doc.target?.data?.[0] || {};
  React.useEffect(() => {
    if (field.fieldtype !== 'Table') return;
    if (!field.options || !doc__.name || childLoaded) return;
    setChildLoaded(true);
    run_doc.child({
      operation:      'select',
      target_doctype: field.options,
      query:          { where: { parent: doc__.name, parentfield: field.fieldname } },
      options:        { render: false },
    }).then(childRun => {
      if (childRun.success) setChildData(childRun.target?.data || []);
    });
  }, [doc__.name, field.fieldtype]);

  const onChange = (val) => {
    setLocalVal(val);                           // React — immediate, preserves focus
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // skip write if value unchanged from what DB already has
      const persisted = run_doc.target?.data?.[0]?.[field.fieldname];
      if (val === persisted) return;
      run_doc.input[field.fieldname] = val;     // delta → Proxy → controller
    }, debounceOnChange);
  };

  const onBlur = (val) => {
    clearTimeout(timerRef.current);
    // skip write if value unchanged from what DB already has
    const persisted = run_doc.target?.data?.[0]?.[field.fieldname];
    if (val === persisted) return;
    if (debounceOnBlur === 0) {
      run_doc.input[field.fieldname] = val;     // immediate on blur
    } else {
      setTimeout(() => { run_doc.input[field.fieldname] = val; }, debounceOnBlur);
    }
  };

  // Section Break
  if (field.fieldtype === 'Section Break') {
    return React.createElement('div', { className: 'col-12 mt-3' },
      field.label ? React.createElement('h5', { className: 'mb-2' }, field.label) : null,
      React.createElement('hr', { className: 'mt-0' })
    );
  }

  // Column Break
  if (field.fieldtype === 'Column Break') return null;

  // Read Only
  if (field.fieldtype === 'Read Only' || readOnly) {
    return React.createElement('input', {
      type: 'text', className: 'form-control', value: localVal, readOnly: true,
    });
  }

  // Check — immediate write on click, no debounce needed
  if (field.fieldtype === 'Check') {
    return React.createElement('div', { className: 'form-check' },
      React.createElement('input', {
        type: 'checkbox', className: 'form-check-input',
        checked: !!localVal,
        onChange: (e) => {
          const val = e.target.checked ? 1 : 0;
          setLocalVal(val);
          onBlur(val);  // immediate write, bypasses debounce
        },
      })
    );
  }

  // Select
  if (field.fieldtype === 'Select') {
    const options = (field.options || '').split('\n').filter(Boolean);
    return React.createElement('select', {
      className: 'form-select', value: localVal,
      onChange: (e) => onChange(e.target.value),
    },
      React.createElement('option', { value: '' }, ''),
      options.map(opt => React.createElement('option', { key: opt, value: opt }, opt))
    );
  }

  // Int / Float / Currency / Percent
  if (['Int', 'Float', 'Currency', 'Percent'].includes(field.fieldtype)) {
    return React.createElement('input', {
      type: 'number', className: 'form-control', value: localVal,
      step: field.fieldtype === 'Int' ? '1' : '0.01',
      onChange: (e) => onChange(field.fieldtype === 'Int' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0),
      onBlur:   (e) => onBlur(field.fieldtype === 'Int' ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0),
    });
  }

  // Date / Datetime / Time
  if (field.fieldtype === 'Date')     return React.createElement('input', { type: 'date',           className: 'form-control', value: localVal, onChange: (e) => onChange(e.target.value), onBlur: (e) => onBlur(e.target.value) });
  if (field.fieldtype === 'Datetime') return React.createElement('input', { type: 'datetime-local', className: 'form-control', value: localVal, onChange: (e) => onChange(e.target.value), onBlur: (e) => onBlur(e.target.value) });
  if (field.fieldtype === 'Time')     return React.createElement('input', { type: 'time',           className: 'form-control', value: localVal, onChange: (e) => onChange(e.target.value), onBlur: (e) => onBlur(e.target.value) });

  // Text / Long Text / Text Editor
  if (['Text', 'Long Text', 'Text Editor'].includes(field.fieldtype)) {
    return React.createElement('textarea', {
      className: 'form-control',
      rows: field.fieldtype === 'Long Text' ? 6 : 3,
      value: localVal,
      onChange: (e) => onChange(e.target.value),
      onBlur:   (e) => onBlur(e.target.value),
    });
  }

  // Code
  if (field.fieldtype === 'Code') {
    const displayVal = typeof localVal === 'object' ? JSON.stringify(localVal, null, 2) : (localVal || '');
    return React.createElement('textarea', {
      className: 'form-control font-monospace', rows: 6,
      value: displayVal,
      onChange: (e) => {
        setLocalVal(e.target.value);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          try { run_doc.input[field.fieldname] = JSON.parse(e.target.value); }
          catch { run_doc.input[field.fieldname] = e.target.value; }
        }, 300);
      },
      onBlur: (e) => {
        try { run_doc.input[field.fieldname] = JSON.parse(e.target.value); }
        catch { run_doc.input[field.fieldname] = e.target.value; }
      },
    });
  }

  // Password
  if (field.fieldtype === 'Password') {
    return React.createElement('input', {
      type: 'password', className: 'form-control', value: localVal,
      onChange: (e) => onChange(e.target.value),
      onBlur:   (e) => onBlur(e.target.value),
    });
  }

  // Table — child grid
  if (field.fieldtype === 'Table') {
    const onChildRowClick = (row) => {
      const r = CW.run({
        operation:      'select',
        target_doctype: field.options,
        query:          { where: { name: row.name }, view: 'form' },
        view:           'form',
        component:      'MainForm',
        container:      run_doc.container,
        options:        { render: true },
      });
      CW.controller(r).then(() => { r.input['.operation'] = 'update'; });
    };

    if (childData.length === 0) {
      return React.createElement('div', { className: 'text-muted small py-2' }, 
        childLoaded ? 'No records' : 'Loading...'
      );
    }

    const keys = colFields.map(f => f.fieldname).filter(k => childData[0] && k in childData[0]);

    return React.createElement('div', { className: 'table-responsive' },
      React.createElement('table', { className: 'table table-vcenter table-hover table-sm card-table mb-0' },
        React.createElement('thead', {},
          React.createElement('tr', {},
            keys.map(k => {
              const f = colFields.find(cf => cf.fieldname === k);
              return React.createElement('th', { key: k }, f?.label || k);
            })
          )
        ),
        React.createElement('tbody', {},
          childData.map((row, i) =>
            React.createElement('tr', {
              key: row.name || i,
              style: { cursor: 'pointer' },
              onClick: () => onChildRowClick(row),
            },
              keys.map(k => React.createElement('td', { key: k }, String(row[k] ?? '')))
            )
          )
        )
      )
    );
  }

  // Link — dropdown search
  if (field.fieldtype === 'Link') {
    const loadOptions = async () => {
      if (!field.options) return;
      const childRun = await run_doc.child({
        operation:      'select',
        target_doctype: field.options,
        query:          { take: 50, select: ['name', titleField] },
        options:        { render: false },
      });
      if (childRun.success) {
        setLinkOptions(childRun.target?.data || []);
        setIsOpen(true);
      }
    };

    const handleSelect = (opt) => {
      const display    = opt[titleField] || opt.name;
      setSearchText(display);
      setIsOpen(false);
      run_doc.input[field.fieldname] = opt.name;
    };

    const handleBlur = () => {
      setTimeout(() => setIsOpen(false), 200);
      if (searchText !== localVal) {
        run_doc.input[field.fieldname] = searchText;
      }
    };

    return React.createElement('div', { className: 'position-relative' },
      React.createElement('input', {
        type: 'text', className: 'form-control',
        value: searchText,
        placeholder: `Select ${field.label || field.fieldname}...`,
        readOnly: readOnly,
        onFocus:  () => { if (!readOnly) loadOptions(); },
        onChange: (e) => setSearchText(e.target.value),
        onBlur:   handleBlur,
      }),
      isOpen && linkOptions.length > 0 && React.createElement('div', {
        className: 'dropdown-menu show w-100',
        style: { maxHeight: '200px', overflowY: 'auto', zIndex: 1050 },
      },
        linkOptions.map(opt =>
          React.createElement('button', {
            key:       opt.name,
            className: 'dropdown-item',
            type:      'button',
            onMouseDown: (e) => { e.preventDefault(); handleSelect(opt); },
          }, opt[titleField] || opt.name)
        )
      )
    );
  }

  // Default — Data
  return React.createElement('input', {
    type: 'text', className: 'form-control', value: localVal,
    onChange: (e) => onChange(e.target.value),
    onBlur:   (e) => onBlur(e.target.value),
  });
};

// ============================================================
// MAIN FORM
// Reads target.data[0] for display only — no merging
// ============================================================

const MainForm = function({ run_doc }) {
  const doctype  = run_doc.target_doctype || run_doc.source_doctype;
  const schema   = CW.Schema?.[doctype];
  const doc      = run_doc.target?.data?.[0] || {};

  if (!schema) {
    return React.createElement('div', { className: 'alert alert-warning' }, `Schema not found: ${doctype}`);
  }

  const title     = doc[schema.title_field || 'name'] || doc.name || 'New';
  const fields    = schema.fields || [];
  const skipTypes = new Set(['Column Break', 'Tab Break', 'HTML']);

  // FSM — dimension 0
  const stateDef  = CW._getStateDef(doctype);
  const dim0      = stateDef?.['0'];
  const current   = doc._state?.['0'] ?? doc.docstatus ?? 0;
  const editable  = current === 0;

  // badge from FSM options
  const badgeLabels = ['bg-warning', 'bg-success', 'bg-danger'];
  const badgeLabel  = dim0?.options?.[current] || '';
  const badgeCls    = badgeLabels[current] || 'bg-secondary';

  // buttons from FSM transitions
  const buttons = [];
  const allowed = dim0?.transitions?.[String(current)] || [];
  for (const to of allowed) {
    const key      = `${current}_${to}`;
    const requires = dim0?.requires?.[key] || {};
    const rule     = dim0?.rules?.[key];
    const reqPassed  = Object.entries(requires).every(([k, v]) => schema[k] === v);
    const rulePassed = typeof rule === 'function' ? rule(run_doc) : true;
    if (reqPassed && rulePassed) {
      buttons.push({ key, label: dim0?.labels?.[key] || key, confirm: dim0?.confirm?.[key] });
    }
  }

  const onButtonClick = (btn) => {
    if (btn.confirm && !window.confirm(btn.confirm)) return;
    run_doc.input._state = { [btn.key]: '' };
  };

  return React.createElement('div', { className: 'card' },
    React.createElement('div', { className: 'card-header d-flex justify-content-between align-items-center' },
      React.createElement('h3', { className: 'card-title mb-0' }, title),
      React.createElement('div', { className: 'd-flex gap-2 align-items-center' },
        badgeLabel
          ? React.createElement('span', { className: `badge ${badgeCls}` }, badgeLabel)
          : null,
        buttons.map(btn =>
          React.createElement('button', {
            key: btn.key,
            className: (btn.label === 'Delete' || btn.label === 'Cancel') ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm',
            onClick: () => onButtonClick(btn),
          }, btn.label)
        )
      )
    ),
    React.createElement('div', { className: 'card-body' },
      React.createElement('div', { className: 'row g-3' },
        fields
          .filter(f => evaluateDependsOn(f.depends_on, doc))
          .filter(f => !skipTypes.has(f.fieldtype))
          .map(f =>
            f.fieldtype === 'Section Break'
              ? React.createElement('div', { key: f.fieldname, className: 'col-12 mt-2' },
                  f.label ? React.createElement('h5', { className: 'mb-1' }, f.label) : null,
                  React.createElement('hr', { className: 'mt-0 mb-2' })
                )
              : React.createElement('div', { key: f.fieldname, className: 'col-md-6' },
                  f.label && React.createElement('label', { className: 'form-label' },
                    f.label,
                    f.reqd && React.createElement('span', { className: 'text-danger ms-1' }, '*')
                  ),
                  React.createElement(FieldRenderer, { field: f, run_doc })
                )
          )
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
    const r = CW.run({
      operation:      'create',
      target_doctype: doctype,
      view:           'form',
      component:      'MainForm',
      container:      run_doc.container,
      options:        { render: true },
    });
    CW.controller(r);
  };

  const onRowClick = (record) => {
    const r = CW.run({
      operation:      'select',
      target_doctype: record.doctype || doctype,
      query:          { where: { name: record.name }, view: 'form' },
      view:           'form',
      component:      'MainForm',
      container:      run_doc.container,
      options:        { render: true },
    });
    // after select fetches full record, stream .operation=update
    // so field mutations trigger autoSave
    CW.controller(r).then(() => {
      r.input['.operation'] = 'update';
    });
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

globalThis.addEventListener('coworker:state:change', (e) => {
  _updateNavUI();
});

console.log('✅ CW-ui.js loaded');
