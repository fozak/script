// ============================================================
// CW-ui.js — React 18 UMD, no JSX, Tabler CSS
// ============================================================

const CW = globalThis.CW;
const ce = React.createElement;

// ============================================================
// RENDER SYSTEM
// ============================================================

CW._reactRoots = new Map();

CW._getOrCreateRoot = function(containerId) {
  if (!CW._reactRoots.has(containerId)) {
    const el = document.getElementById(containerId);
    if (el) CW._reactRoots.set(containerId, ReactDOM.createRoot(el));
  }
  return CW._reactRoots.get(containerId);
};

CW._render = function(run_doc) {
  if (!run_doc?.component || !run_doc?.container) return
  const Comp = globalThis[run_doc.component]
  if (!Comp) return

  Object.values(CW.runs).forEach(r => {
    if (r.name !== run_doc.name && r.container === run_doc.container) {
      delete CW.runs[r.name]
    }
  })

  const root = CW._getOrCreateRoot(run_doc.container)
  if (!root) return
  root.render(ce(Comp, { run_doc, data: run_doc.target?.data || [] }))
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
  const runs = _getMainRuns();
  const idx  = _getCurrentIndex();
  const to   = direction === 'back' ? idx - 1 : idx + 1;
  if (to >= 0 && to < runs.length) {
    CW.current_run = runs[to].name;
    CW._render(runs[to]);
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
       (runs[i].source_doctype === doctype || runs[i].target_doctype === doctype))
      return runs[i].name;
  }
  return null;
}

function _getBreadcrumbs() {
  const current = CW.getCurrentRun();
  const home    = _getMainRuns()[0]?.name;
  if (!current?.component?.startsWith('Main'))
    return [{ text: 'Home', runName: home }];
  if (current.component === 'MainGrid')
    return [
      { text: 'Home', runName: home },
      { text: current.source_doctype || current.target_doctype || 'List', runName: null },
    ];
  if (current.component === 'MainForm') {
    const doctype  = current.source_doctype || current.target_doctype;
    const schema   = CW.Schema?.[doctype];
    const doc      = current.target?.data?.[0] || {};
    const docname  = doc[schema?.title_field || 'name'] || doc.name || 'New';
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
  const bb   = document.getElementById('back_btn');
  const fb   = document.getElementById('forward_btn');
  if (bb) bb.disabled = idx <= 0;
  if (fb) fb.disabled = idx >= runs.length - 1;
  const el = document.getElementById('breadcrumbs');
  if (el) el.innerHTML = _getBreadcrumbs().map((c, i, arr) => {
    const last = i === arr.length - 1;
    if (last)      return `<li class="breadcrumb-item active">${c.text}</li>`;
    if (c.runName) return `<li class="breadcrumb-item"><a href="#" onclick="navigateTo('${c.runName}');return false;">${c.text}</a></li>`;
    return         `<li class="breadcrumb-item">${c.text}</li>`;
  }).join('');
}

globalThis.navigate   = navigate;
globalThis.navigateTo = navigateTo;
globalThis.addEventListener('coworker:state:change', _updateNavUI);

// ============================================================
// BlockNote field
// ============================================================

const BlockNoteField = function({ field, run_doc, readOnly, timerRef, debounce }) {
  React.useEffect(() => {
    if (readOnly) return
    let alive = true
    import('./editor.js').then(({ mount }) => {
      if (!alive) return
      mount({
        run_doc,
        fieldname: field.fieldname,
        onChange: (json) => {
          run_doc.input[field.fieldname] = json
          clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => {
            CW.controller(run_doc).catch(err => console.error('[CW]', err))
          }, debounce)
        },
      })
    })
    return () => { alive = false }
  }, [run_doc.name])

  if (readOnly) {
    const DisplayComp = globalThis[field.display || 'TextRenderer']
    return DisplayComp
      ? ce(DisplayComp, { content: run_doc.target?.data?.[0]?.[field.fieldname], run_doc })
      : ce('div', { className: 'text-muted fst-italic' }, '(no renderer for ' + (field.display || 'TextRenderer') + ')')
  }

  return ce('div', { id: run_doc.name,
    style: { position: 'relative', border: '1px solid var(--tblr-border-color)', borderRadius: '4px', minHeight: '240px' }
  })
}

// ============================================================
// CWComponent — fieldtype: Component
// ============================================================

const CWComponent = function({ field, run_doc, readOnly, timerRef, debounce }) {
  const containerId = run_doc.name + '_' + field.fieldname

  React.useEffect(() => {
    if (readOnly) return
    let alive = true
    import(field.component).then(({ mount }) => {
      if (!alive) return
      mount({
        run_doc,
        fieldname: field.fieldname,
        onChange: (value) => {
          run_doc.input[field.fieldname] = value
          clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() =>
            CW.controller(run_doc).catch(e => console.error('[CWComponent]', e))
          , debounce)
        },
      })
    }).catch(err => {
      console.error('[CWComponent] module not found:', field.component, err)
      const el = document.getElementById(containerId)
      if (el) el.innerHTML = '<span class="text-danger">Component not loaded: ' + field.component + '</span>'
    })
    return () => {
      alive = false
      import(field.component).then(({ unmount }) => unmount?.(run_doc)).catch(() => {})
    }
  }, [run_doc.name])

  if (readOnly) {
    const DisplayComp = globalThis[field.display || 'TextRenderer']
    return DisplayComp
      ? ce(DisplayComp, { content: run_doc.target?.data?.[0]?.[field.fieldname], run_doc })
      : ce('div', { className: 'text-muted fst-italic' }, '(no renderer: ' + (field.display || 'TextRenderer') + ')')
  }

  return ce('div', { id: containerId,
    style: { position: 'relative', border: '1px solid var(--tblr-border-color)', borderRadius: '4px', minHeight: '120px' }
  })
}

// ============================================================
// FIELD RENDERER
// ============================================================

const FieldRenderer = function({ field, run_doc }) {
  const doc_        = run_doc.target?.data?.[0] || {};
  const readOnly    = (doc_.docstatus ?? 0) !== 0 || !['update','create'].includes(run_doc.operation);
  const initial     = doc_[field.fieldname];
  const safeInitial = initial === null || initial === undefined
    ? (field.fieldtype === 'Check' ? 0 : '')
    : (field.fieldtype === 'Check' ? Number(initial) : initial);

  const [prevName, setPrevName] = React.useState(doc_.name);
  const [localVal, setLocalVal] = React.useState(safeInitial);

  if (prevName !== doc_.name) {
    setPrevName(doc_.name);
    if (prevName !== null) setLocalVal(safeInitial);
  }

  const timerRef = React.useRef(null);
  const debounce = CW._config?.fieldInteractionConfig?.onChange?.debounce ?? 5000;

  const linkSchema = CW.Schema?.[field.options];
  const titleField = linkSchema?.title_field || 'name';
  const [linkOpts, setLinkOpts] = React.useState([]);
  const [isOpen, setIsOpen]     = React.useState(false);
  const [searchText, setSearch] = React.useState(field.fieldtype === 'Link' ? (safeInitial || '') : '');
  if (prevName !== doc_.name && field.fieldtype === 'Link') setSearch(safeInitial || '');

  const childSchema = CW.Schema?.[field.options];
  const colFields   = React.useMemo(() => {
    if (field.fieldtype !== 'Table') return [];
    const lf = childSchema?.fields?.filter(f => f.in_list_view) || [];
    return lf.length > 0 ? lf
      : childSchema?.fields?.filter(f => !['Section Break','Column Break','Tab Break','HTML','Button'].includes(f.fieldtype))?.slice(0,5) || [];
  }, [field.options, field.fieldtype]);
  const [childData, setChildData]     = React.useState([]);
  const [childLoaded, setChildLoaded] = React.useState(false);
  const docName = doc_.name;

  React.useEffect(() => {
    if (field.fieldtype !== 'Table' || !field.options || !docName || childLoaded) return;
    setChildLoaded(true);
    run_doc.child({
      operation:      'select',
      target_doctype: field.options,
      query:          { where: { parent: docName, parentfield: field.fieldname } },
      options:        { render: false },
    }).then(cr => { if (cr.success) setChildData(cr.target?.data || []); });
  }, [docName, field.fieldtype]);

  const commitField = (val) => {
    if (val === run_doc.target?.data?.[0]?.[field.fieldname]) return;
    run_doc.input[field.fieldname] = val;
    CW.controller(run_doc).catch(err => console.error('[CW]', err));
  };

  const onChange = (val) => {
    setLocalVal(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commitField(val), debounce);
  };

  const onBlur = (val) => {
    clearTimeout(timerRef.current);
    commitField(val);
  };

  if (field.fieldtype === 'BlockNote')
    return ce(BlockNoteField, { field, run_doc, readOnly, timerRef, debounce })

  if (field.fieldtype === 'Component')
    return ce(CWComponent, { field, run_doc, readOnly, timerRef, debounce })

  if (field.fieldtype === 'Section Break')
    return ce('div', { className: 'col-12 mt-3' },
      field.label ? ce('h5', { className: 'mb-2' }, field.label) : null,
      ce('hr', { className: 'mt-0' })
    );

  if (field.fieldtype === 'Column Break') return null;

  if (field.fieldtype === 'Read Only' || readOnly)
    return ce('input', { type: 'text', className: 'form-control', value: localVal, readOnly: true });

  if (field.fieldtype === 'Check')
    return ce('div', { className: 'form-check' },
      ce('input', {
        type: 'checkbox', className: 'form-check-input', checked: !!localVal,
        onChange: (e) => { const v = e.target.checked ? 1 : 0; setLocalVal(v); commitField(v); },
      })
    );

  if (field.fieldtype === 'Select') {
    const opts = (field.options || '').split('\n').filter(Boolean);
    return ce('select', { className: 'form-select', value: localVal, onChange: (e) => { setLocalVal(e.target.value); commitField(e.target.value); } },
      ce('option', { value: '' }, ''),
      opts.map(o => ce('option', { key: o, value: o }, o))
    );
  }

  if (['Int','Float','Currency','Percent'].includes(field.fieldtype))
    return ce('input', {
      type: 'number', className: 'form-control', value: localVal,
      step: field.fieldtype === 'Int' ? '1' : '0.01',
      onChange: (e) => onChange(field.fieldtype === 'Int' ? parseInt(e.target.value)||0 : parseFloat(e.target.value)||0),
      onBlur:   (e) => onBlur (field.fieldtype === 'Int' ? parseInt(e.target.value)||0 : parseFloat(e.target.value)||0),
    });

  if (field.fieldtype === 'Date')     return ce('input', { type: 'date',           className: 'form-control', value: localVal, onChange: (e) => onChange(e.target.value), onBlur: (e) => onBlur(e.target.value) });
  if (field.fieldtype === 'Datetime') return ce('input', { type: 'datetime-local', className: 'form-control', value: localVal, onChange: (e) => onChange(e.target.value), onBlur: (e) => onBlur(e.target.value) });
  if (field.fieldtype === 'Time')     return ce('input', { type: 'time',           className: 'form-control', value: localVal, onChange: (e) => onChange(e.target.value), onBlur: (e) => onBlur(e.target.value) });

  if (['Text','Long Text','Text Editor'].includes(field.fieldtype))
    return ce('textarea', {
      className: 'form-control', rows: field.fieldtype === 'Long Text' ? 6 : 3,
      value: localVal, onChange: (e) => onChange(e.target.value), onBlur: (e) => onBlur(e.target.value),
    });

  if (field.fieldtype === 'Code') {
    const dv = typeof localVal === 'object' ? JSON.stringify(localVal, null, 2) : (localVal || '');
    return ce('textarea', {
      className: 'form-control font-monospace', rows: 6, value: dv,
      onChange: (e) => {
        setLocalVal(e.target.value);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          try       { run_doc.input[field.fieldname] = JSON.parse(e.target.value); }
          catch (_) { run_doc.input[field.fieldname] = e.target.value; }
          CW.controller(run_doc).catch(err => console.error('[CW]', err));
        }, 300);
      },
      onBlur: (e) => {
        clearTimeout(timerRef.current);
        try       { run_doc.input[field.fieldname] = JSON.parse(e.target.value); }
        catch (_) { run_doc.input[field.fieldname] = e.target.value; }
        CW.controller(run_doc).catch(err => console.error('[CW]', err));
      },
    });
  }

  if (field.fieldtype === 'Password')
    return ce('input', {
      type: 'password', className: 'form-control', value: localVal,
      onChange: (e) => onChange(e.target.value), onBlur: (e) => onBlur(e.target.value),
    });

  if (field.fieldtype === 'Table') {
    const onChildClick = (row) => {
      run_doc.child({
        operation:      'select',
        target_doctype: field.options,
        query:          { where: { name: row.name }, view: 'form' },
        view:           'form',
        container:      run_doc.container,
        options:        { render: true },
      });
    };
    if (!childData.length)
      return ce('div', { className: 'text-muted small py-2' }, childLoaded ? 'No records' : 'Loading...');
    const keys = colFields.map(f => f.fieldname).filter(k => k in (childData[0] || {}));
    return ce('div', { className: 'table-responsive' },
      ce('table', { className: 'table table-vcenter table-hover table-sm card-table mb-0' },
        ce('thead', {}, ce('tr', {}, keys.map(k => ce('th', { key: k }, colFields.find(f => f.fieldname===k)?.label || k)))),
        ce('tbody', {},
          childData.map((row, i) => ce('tr', { key: row.name||i, style: { cursor:'pointer' }, onClick: () => onChildClick(row) },
            keys.map(k => ce('td', { key: k }, String(row[k] ?? '')))
          ))
        )
      )
    );
  }

  if (field.fieldtype === 'Link') {
    const loadOptions = async () => {
      if (!field.options) return;
      const cr = await run_doc.child({
        operation:      'select',
        target_doctype: field.options,
        query:          { take: 50, select: ['name', titleField] },
        options:        { render: false },
      });
      if (cr.success) { setLinkOpts(cr.target?.data || []); setIsOpen(true); }
    };
    return ce('div', { className: 'position-relative' },
      ce('input', {
        type: 'text', className: 'form-control', value: searchText,
        placeholder: `Select ${field.label || field.fieldname}...`, readOnly,
        onFocus: () => { if (!readOnly) loadOptions(); },
        onChange: (e) => setSearch(e.target.value),
        onBlur:  () => {
          setTimeout(() => setIsOpen(false), 200);
          if (searchText !== localVal) commitField(searchText);
        },
      }),
      isOpen && linkOpts.length > 0 && ce('div', {
        className: 'dropdown-menu show w-100',
        style: { maxHeight: '200px', overflowY: 'auto', zIndex: 1050 },
      },
        linkOpts.map(o => ce('button', {
          key: o.name, className: 'dropdown-item', type: 'button',
          onMouseDown: (e) => {
            e.preventDefault();
            setSearch(o[titleField] || o.name);
            setIsOpen(false);
            commitField(o.name);
          },
        }, o[titleField] || o.name))
      )
    );
  }

  if (field.fieldtype === 'Relationship Panel')
    return ce(RelationshipPanel, { run_doc });

  return ce('input', {
    type: 'text', className: 'form-control', value: localVal,
    onChange: (e) => onChange(e.target.value), onBlur: (e) => onBlur(e.target.value),
  });
};

// ============================================================
// FORM ACTIONS
// Renders outside + ••• button groups from CW._getFormButtons
// ============================================================

const FormActions = function({ run_doc }) {
  const { outside, menu } = CW._getFormButtons(run_doc)

  const onFsmClick = (btn) => {
    if (btn.confirm && !window.confirm(btn.confirm)) return
    run_doc.input._state = { [btn.signal]: '' }
    CW.controller(run_doc).catch(err => console.error('[CW]', err))
  }

  return ce('div', { className: 'd-flex gap-2 align-items-center' },

    // outside •••: Save + primary FSM buttons
    ...outside.map(btn =>
      btn.type === 'save'
        ? ce('button', { key: 'save', className: 'btn btn-primary btn-sm',
            onClick: () => { run_doc.operation = 'select'; CW._render(run_doc) }
          }, btn.label)
        : ce('button', { key: btn.signal, className: 'btn btn-primary btn-sm',
            onClick: () => onFsmClick(btn)
          }, btn.label)
    ),

    // ••• dropdown: Edit + non-primary dim 0 + dim 1+
    menu.length > 0 && ce('div', { key: 'menu', className: 'dropdown' },
      ce('button', {
        className: 'btn btn-ghost-secondary btn-sm',
        'data-bs-toggle': 'dropdown',
        'aria-expanded': 'false',
      }, '•••'),
      ce('ul', { className: 'dropdown-menu dropdown-menu-end' },
        ...menu.map(btn =>
          btn.type === 'edit'
            ? ce('li', { key: 'edit' },
                ce('button', { className: 'dropdown-item',
                  onClick: () => { run_doc.operation = 'update'; CW._render(run_doc) }
                }, btn.label))
            : ce('li', { key: btn.signal },
                ce('button', { className: 'dropdown-item',
                  onClick: () => onFsmClick(btn)
                }, btn.label))
        )
      )
    )
  )
}

// ============================================================
// MAIN FORM
// ============================================================

const MainForm = function({ run_doc }) {
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  const schema  = CW.Schema?.[doctype];
  const doc     = run_doc.target?.data?.[0] || {};

  // auto-switch to update for non-explicit-intent doctypes with editable records
  if (!schema?.explicit_edit_intent && (doc.docstatus ?? 0) === 0 && doc.name && run_doc.operation === 'select')
    run_doc.operation = 'update'

  if (!schema)
    return ce('div', { className: 'alert alert-warning' }, `Schema not found: ${doctype}`);

  const title     = doc[schema.title_field || 'name'] || doc.name || 'New';
  const fields    = schema.fields || [];
  const skipTypes = new Set(['Column Break', 'Tab Break', 'HTML']);

  // badge from dim 0 current state
  const stateDef   = CW._getStateDef(doctype);
  const dim0       = stateDef?.['0'];
  const current    = CW._getDimValue(doc, '0', dim0);
  const badgeLabel = dim0?.options?.[current] || '';
  const badgeCls   = ['bg-warning','bg-success','bg-danger'][current] || 'bg-secondary';

  return ce('div', { className: 'card' },
    ce('div', { className: 'card-header d-flex justify-content-between align-items-center' },
      ce('h3', { className: 'card-title mb-0' }, title),
      ce('div', { className: 'd-flex gap-2 align-items-center' },
        badgeLabel ? ce('span', { className: `badge ${badgeCls}` }, badgeLabel) : null,
        ce(FormActions, { run_doc })
      )
    ),
    ce('div', { className: 'card-body' },
      ce('div', { className: 'row g-3' },
        fields
          .filter(f => evaluateDependsOn(f.depends_on, doc, run_doc))
          .filter(f => !skipTypes.has(f.fieldtype))
          .map(f => f.fieldtype === 'Section Break'
            ? ce('div', { key: f.fieldname, className: 'col-12 mt-2' },
                f.label ? ce('h5', { className: 'mb-1' }, f.label) : null,
                ce('hr', { className: 'mt-0 mb-2' })
              )
            : ce('div', { key: f.fieldname, className: f.fieldtype === 'Relationship Panel' ? 'col-12' : 'col-md-6' },
                f.label && f.fieldtype !== 'Relationship Panel' && ce('label', { className: 'form-label' },
                  f.label,
                  f.reqd && ce('span', { className: 'text-danger ms-1' }, '*')
                ),
                f.fieldtype === 'Relationship Panel' && ce('h6', { className: 'mb-2 text-muted' }, f.label || 'Relationships'),
                ce(FieldRenderer, { field: f, run_doc })
              )
          )
      )
    ),
    run_doc.error && ce('div', { className: 'card-footer' },
      ce('div', { className: 'alert alert-danger mb-0' },
        typeof run_doc.error === 'string' ? run_doc.error : run_doc.error.message
      )
    )
  );
};

// ============================================================
// MAIN GRID
// ============================================================

const MainGrid = function({ run_doc, data }) {
  const doctype    = run_doc.source_doctype || run_doc.target_doctype;
  const schema     = CW.Schema?.[doctype];
  const titleField = schema?.title_field || 'name';

  const [viewMode, setViewMode] = React.useState('list');
  const [sortCol,  setSortCol]  = React.useState(null);
  const [sortDir,  setSortDir]  = React.useState('asc');

  const listFields = React.useMemo(() => {
    if (!schema?.fields) return [];
    const lf = schema.fields.filter(f =>
      f.in_list_view &&
      !['Section Break','Column Break','Tab Break','HTML','Button','Table'].includes(f.fieldtype)
    );
    return lf.length > 0 ? lf
      : Object.keys(data[0] || {}).filter(k => !k.startsWith('_') && k !== 'doctype').slice(0,6)
          .map(k => ({ fieldname: k, label: k }));
  }, [doctype, data.length]);

  const rows = React.useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = String(a[sortCol] ?? '');
      const bv = String(b[sortCol] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [data, sortCol, sortDir]);

  const toggleSort = (fieldname) => {
    if (sortCol === fieldname) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(fieldname); setSortDir('asc'); }
  };

  const onCardAction = async (record, btn) => {
    if (btn.confirm && !window.confirm(btn.confirm)) return;
    await run_doc.child({
      operation:      'update',
      target_doctype: doctype,
      query:          { where: { name: record.name } },
      input:          { _state: { [btn.signal]: '' } },
      options:        { render: false, internal: true },
    });
  };

  const onRowClick = (record) => {
    run_doc.child({
      operation:      'select',
      target_doctype: record.doctype || doctype,
      query:          { where: { name: record.name } },
      view:           'form',
      options:        { render: true },
    })
  };

  const onNew = () => {
    run_doc.child({
      operation:      'create',
      target_doctype: doctype,
      view:           'form',
      options:        { render: true },
    });
  };

  const toolbar = ce('div', { className: 'd-flex justify-content-between align-items-center mb-2 px-1' },
    ce('button', { className: 'btn btn-primary btn-sm', onClick: onNew }, '+ New'),
    ce('div', { className: 'btn-group btn-group-sm' },
      ce('button', { className: `btn ${viewMode==='list' ? 'btn-secondary' : 'btn-outline-secondary'}`, onClick: () => setViewMode('list'), title: 'List' }, '≡'),
      ce('button', { className: `btn ${viewMode==='card' ? 'btn-secondary' : 'btn-outline-secondary'}`, onClick: () => setViewMode('card'), title: 'Card' }, '⊞')
    )
  );

  if (!rows.length)
    return ce('div', { className: 'card' },
      ce('div', { className: 'card-header' }, ce('h3', { className: 'card-title mb-0' }, doctype)),
      ce('div', { className: 'card-body' }, toolbar, ce('div', { className: 'alert alert-info mb-0' }, 'No records found'))
    );

  const listView = ce('div', { className: 'table-responsive' },
    ce('table', { className: 'table table-vcenter table-hover card-table mb-0' },
      ce('thead', {}, ce('tr', {},
        listFields.map(f => ce('th', {
          key: f.fieldname, style: { cursor:'pointer', userSelect:'none' },
          onClick: () => toggleSort(f.fieldname),
        }, f.label || f.fieldname,
          sortCol === f.fieldname ? (sortDir==='asc' ? ' ↑' : ' ↓') : ' ↕'
        ))
      )),
      ce('tbody', {},
        rows.map((row, i) => ce('tr', { key: row.name||i, style: { cursor:'pointer' }, onClick: () => onRowClick(row) },
          listFields.map(f => ce('td', { key: f.fieldname }, String(row[f.fieldname] ?? '')))
        ))
      )
    )
  );

  const cardView = ce('div', { className: 'row g-2' },
    rows.map(record => {
      const btns  = CW._getTransitions(schema, record, '0');
      const title = record[titleField] || record.name;
      return ce('div', { key: record.name, className: 'col-12' },
        ce('div', { className: 'card card-sm' },
          ce('div', { className: 'card-body' },
            ce('div', { className: 'd-flex justify-content-between align-items-start' },
              ce('div', { style: { flex:1, cursor:'pointer' }, onClick: () => onRowClick(record) },
                ce('div', { className: 'fw-bold mb-1' }, title),
                ce('div', { className: 'd-flex flex-wrap gap-3' },
                  listFields.map(f => record[f.fieldname] != null && record[f.fieldname] !== ''
                    ? ce('span', { key: f.fieldname, className: 'text-muted small' },
                        ce('span', { className: 'text-secondary' }, `${f.label||f.fieldname}: `),
                        String(record[f.fieldname])
                      )
                    : null
                  )
                )
              ),
              btns.length > 0 && ce('div', { className: 'd-flex gap-1 ms-3 flex-shrink-0' },
                btns.map(btn => ce('button', {
                  key:       btn.signal,
                  className: btn.signal.endsWith('_2') ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-outline-primary',
                  onClick:   (e) => { e.stopPropagation(); onCardAction(record, btn); },
                }, btn.label))
              )
            )
          )
        )
      );
    })
  );

  return ce('div', { className: 'card' },
    ce('div', { className: 'card-header' }, ce('h3', { className: 'card-title mb-0' }, doctype)),
    ce('div', { className: viewMode==='list' ? 'card-body p-0' : 'card-body' },
      ce('div', { className: viewMode==='list' ? 'px-3 pt-3 pb-2' : 'pb-2' }, toolbar),
      viewMode === 'list' ? listView : cardView
    )
  );
};

// ============================================================
// RELATIONSHIP PANEL
// ============================================================

const RelationshipPanel = function({ run_doc }) {
  const doc     = run_doc.target?.data?.[0] || {};
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  const docName = doc.name;

  const typeMap = React.useMemo(() => {
    const map    = {};
    const dtConf = CW._config?.relationshipTypes?.[doctype] || {};
    for (const [relatedDoctype, types] of Object.entries(dtConf)) {
      for (const type of types) map[type] = relatedDoctype;
    }
    return map;
  }, [doctype]);

  const allTypes = Object.keys(typeMap);

  const [rels, setRels]         = React.useState([]);
  const [loaded, setLoaded]     = React.useState(false);
  const [selType, setSelType]   = React.useState('');
  const [searchText, setSearch] = React.useState('');
  const [linkOpts, setLinkOpts] = React.useState([]);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [selName, setSelName]   = React.useState('');
  const [selTitle, setSelTitle] = React.useState('');
  const [notes, setNotes]       = React.useState('');
  const [saving, setSaving]     = React.useState(false);

  const loadRels = React.useCallback(async () => {
    if (!docName) return;
    const cr = await run_doc.child({
      operation:      'select',
      target_doctype: 'Relationship',
      query:          { where: { parent: docName, parentfield: 'relationships' } },
      options:        { render: false },
    });
    if (cr.success) setRels(cr.target?.data || []);
    setLoaded(true);
  }, [docName]);

  React.useEffect(() => { loadRels(); }, [docName]);

  const onTypeChange = async (type) => {
    setSelType(type);
    setSelName(''); setSelTitle(''); setSearch(''); setLinkOpts([]); setLinkOpen(false);
    if (!type) return;
    const relatedDoctype = typeMap[type];
    if (!relatedDoctype) return;
    const schema     = CW.Schema?.[relatedDoctype];
    const titleField = schema?.title_field || 'name';
    const cr = await run_doc.child({
      operation:      'select',
      target_doctype: relatedDoctype,
      query:          { take: 50, select: ['name', titleField] },
      options:        { render: false },
    });
    if (cr.success) { setLinkOpts(cr.target?.data || []); setLinkOpen(true); }
  };

  const onAdd = async () => {
    if (!selType || !selName) return;
    setSaving(true);
    const cr = await run_doc.child({
      operation:      'create',
      target_doctype: 'Relationship',
      input: {
        related_doctype: typeMap[selType],
        related_name:    selName,
        related_title:   selTitle || selName,
        type:            selType,
        notes,
        parent:          docName,
        parenttype:      doctype,
        parentfield:     'relationships',
      },
      options: { render: false },
    });
    setSaving(false);
    if (!cr.error) {
      setSelType(''); setSelName(''); setSelTitle(''); setSearch(''); setNotes('');
      await loadRels();
    }
  };

  const onRelAction = async (rel, btn) => {
    const cr = await run_doc.child({
      operation:      'update',
      target_doctype: 'Relationship',
      query:          { where: { name: rel.name } },
      input:          { _state: { [btn.signal]: '' } },
      options:        { render: false, internal: true },
    });
    if (!cr.error) await loadRels();
  };

  const statusBadge = (rel) => {
    const dim0  = CW._getStateDef('Relationship')?.['0'];
    const cur   = CW._getDimValue(rel, '0', dim0);
    const label = dim0?.options?.[cur] || '';
    const cls   = ['bg-warning text-dark','bg-success','bg-danger'][cur] || 'bg-secondary';
    return label ? ce('span', { className: `badge ${cls} ms-1` }, label) : null;
  };

  const relatedDoctype = typeMap[selType] || '';
  const titleField     = CW.Schema?.[relatedDoctype]?.title_field || 'name';
  const filteredOpts   = linkOpts
    .filter(o => o.name || o.id)
    .filter(o => !searchText || (o[titleField] || o.name || o.id || '').toLowerCase().includes(searchText.toLowerCase()));

  return ce('div', { className: 'mt-3' },

    loaded && rels.length > 0 && ce('div', { className: 'mb-3' },
      rels.map(rel => {
        const relSchema = CW.Schema?.Relationship || { schema_name: 'Relationship' }
        const btns = CW._getTransitions(relSchema, rel, '0')
        return ce('div', {
          key: rel.name,
          className: 'border rounded p-2 mb-2 d-flex justify-content-between align-items-center',
        },
          ce('div', {},
            ce('div', { className: 'd-flex align-items-center gap-2' },
              ce('span', { className: 'fw-medium' }, rel.related_title || rel.related_name),
              ce('span', { className: 'text-muted small' }, rel.type),
              statusBadge(rel)
            ),
            rel.notes && ce('div', { className: 'text-muted small mt-1' }, rel.notes)
          ),
          ce('div', { className: 'd-flex gap-1' },
            btns.map(btn => ce('button', {
              key:       btn.signal,
              className: btn.signal.endsWith('_2')
                ? 'btn btn-sm btn-outline-danger'
                : btn.signal.endsWith('_0')
                ? 'btn btn-sm btn-outline-secondary'
                : 'btn btn-sm btn-outline-success',
              onClick: () => onRelAction(rel, btn),
            }, btn.label))
          )
        )
      })
    ),

    loaded && rels.length === 0 && ce('div', { className: 'text-muted small mb-2' }, 'No relationships yet'),

    allTypes.length === 0
      ? ce('div', { className: 'text-muted small' }, `No relationship types configured for ${doctype}`)
      : ce('div', { className: 'd-flex gap-2 align-items-start flex-wrap' },

          ce('select', {
            className: 'form-select form-select-sm',
            style: { width: '140px' },
            value: selType,
            onChange: (e) => onTypeChange(e.target.value),
          },
            ce('option', { value: '' }, 'Type...'),
            allTypes.map(t => ce('option', { key: t, value: t }, t))
          ),

          selType && ce('div', { className: 'position-relative', style: { width: '200px' } },
            ce('input', {
              type: 'text', className: 'form-control form-control-sm',
              placeholder: `Search ${relatedDoctype}...`,
              value: searchText,
              onChange: (e) => { setSearch(e.target.value); setLinkOpen(true); },
              onFocus:  () => setLinkOpen(true),
              onBlur:   () => setTimeout(() => setLinkOpen(false), 200),
            }),
            linkOpen && filteredOpts.length > 0 && ce('div', {
              className: 'dropdown-menu show w-100',
              style: { maxHeight: '200px', overflowY: 'auto', zIndex: 1050 },
            },
              filteredOpts.map((o, i) => {
                const oId    = o.name || o.id || String(i);
                const oTitle = o[titleField] || o.name || o.id || oId;
                return ce('button', {
                  key: oId, className: 'dropdown-item', type: 'button',
                  onMouseDown: (e) => {
                    e.preventDefault();
                    setSelName(oId);
                    setSelTitle(oTitle);
                    setSearch(oTitle);
                    setLinkOpen(false);
                  },
                }, oTitle);
              })
            )
          ),

          selType && ce('input', {
            type: 'text', className: 'form-control form-control-sm',
            style: { width: '160px' },
            placeholder: 'Notes (optional)',
            value: notes,
            onChange: (e) => setNotes(e.target.value),
          }),

          selType && ce('button', {
            className: 'btn btn-sm btn-primary',
            disabled: !selName || saving,
            onClick: onAdd,
          }, saving ? '...' : '+ Add')
        )
  );
};

// ============================================================
// COMPONENT REGISTRY
// ============================================================

globalThis.MainForm = MainForm;
globalThis.MainGrid = MainGrid;

console.log('✅ CW-ui.js loaded');
