const UniversalGrid = function ({ run_doc, field }) {
 
  // ── mode ──────────────────────────────────────────────────
  const mode = !field
    ? 'MainGrid'
    : field.fieldtype === 'Table'
      ? 'Table'
      : 'Relationship';
 
  // ── schema ────────────────────────────────────────────────
  const doctype    = mode === 'MainGrid'
    ? (run_doc.target_doctype || run_doc.source_doctype)
    : field.options;
 
  const schema     = CW.Schema?.[doctype] || {};
  const titleField = schema.title_field || 'name';
  //=========
  
  const rowsNEW = run_doc.target?.data || [];

const columns = Object.keys(rowsNEW[0] || {})
  .filter(k => k !== titleField && k !== 'name')
  .map(k => ({
    fieldname: k,
    label: schema.fields?.find(f => f.fieldname === k)?.label || k
  }));


  //const columns    = (schema.fields || []).filter(f => f.in_list_view).slice(0, 6);
 
  // ── selection ─────────────────────────────────────────────
  const selected   = CW.getGridSelected(run_doc);
  const rows       = run_doc.target?.data || [];
  const allChecked = selected.length === rows.length && rows.length > 0;
 
  // ── hover state ───────────────────────────────────────────
  const [hoveredRow, setHoveredRow] = React.useState(null);
 
  // ── fsm buttons per row ───────────────────────────────────
const getRowButtons = (row) => {
  const result = CW._getFormButtons ? CW._getFormButtons(run_doc, row) : [];
  return Array.isArray(result) ? result : [];
};
  /*
  const getRowButtons = (row) => CW._getFormButtons
    ? CW._getFormButtons(run_doc, row)
    : [];*/
 
  // ── open record ───────────────────────────────────────────
  const openRecord = (name) => run_doc.child({
    operation:      'select',
    target_doctype: doctype,
    query:          { where: { name } },
    options:        { render: true },
  });
 
  // ── toolbar ───────────────────────────────────────────────
  const renderToolbar = () => {
    // bulk bar replaces toolbar when rows selected
    if (selected.length > 0) {
      const commonButtons = rows
        .filter(r => selected.includes(r.name))
        .map(r => getRowButtons(r).map(b => b.signal))
        .reduce((acc, sigs) => acc.filter(s => sigs.includes(s)));
 
      return ce('div', { className: 'cw-grid-toolbar cw-grid-bulk-bar d-flex align-items-center gap-2 px-3 py-2 border-bottom' },
        ce('button', {
          className: 'btn btn-sm btn-ghost-secondary',
          onClick: () => CW.clearSelected(run_doc)
        }, ce('i', { className: 'ti ti-x me-1' }), selected.length + ' selected'),
        commonButtons.map(signal => {
          const label = CW._getStateDef(doctype)?.[signal.split('.')[0]]?.labels?.[signal.split('.').slice(1).join('.')] || signal;
          return ce('button', {
            key: signal,
            className: 'btn btn-sm btn-secondary',
            onClick: async () => {
              for (const name of selected) {
                await run_doc.child({
                  operation:      'update',
                  target_doctype: doctype,
                  query:          { where: { name } },
                  input:          { _state: { [signal]: '' } },
                  options:        { render: false, internal: true },
                });
              }
              CW.clearSelected(run_doc);
            }
          }, label);
        }),
        ce('button', {
          className: 'btn btn-sm btn-ghost-danger ms-auto',
          onClick: async () => {
            for (const name of selected) {
              await run_doc.child({
                operation:      'delete',
                target_doctype: doctype,
                query:          { where: { name } },
                options:        { render: false },
              });
            }
            CW.clearSelected(run_doc);
            CW.refetchGrid(run_doc);
          }
        }, ce('i', { className: 'ti ti-trash me-1' }), 'Delete')
      );
    }
 
    // normal toolbar
    return ce('div', { className: 'cw-grid-toolbar d-flex align-items-center gap-2 px-3 py-2 border-bottom' },
      mode === 'MainGrid' && ce('button', {
        className: 'btn btn-sm btn-primary',
        onClick: () => run_doc.child({
          operation:      'create',
          target_doctype: doctype,
          options:        { render: true },
        })
      }, ce('i', { className: 'ti ti-plus me-1' }), 'New'),
 
      mode === 'Table' && ce('button', {
        className: 'btn btn-sm btn-secondary',
        onClick: () => {}  // Table add — not yet implemented
      }, ce('i', { className: 'ti ti-plus me-1' }), 'Add'),
 
      mode === 'MainGrid' && ce('div', { className: 'cw-grid-search ms-2 flex-grow-1' },
        ce('input', {
          type:        'text',
          className:   'form-control form-control-sm',
          placeholder: 'Search ' + (schema.label || doctype) + '...',
          onChange:    e => CW.searchGridDebounced(e.target.value),
        })
      )
    );
  };
 
  // ── status badge ──────────────────────────────────────────
  const renderStatusBadge = (row) => {
    const stateDef = CW._getStateDef?.(doctype);
    if (!stateDef) return null;
    const dim0     = stateDef['0'];
    if (!dim0) return null;
    const val      = CW._getDimValue?.(row, '0', dim0);
    const label    = dim0.labels?.[val] || val;
    const color    = dim0.colors?.[val] || 'secondary';
    return ce('span', { className: `badge bg-${color}-lt me-2` }, label);
  };
 
  // ── row ───────────────────────────────────────────────────
  const renderRow = (row) => {
    const isHovered  = hoveredRow === row.name;
    const isSelected = selected.includes(row.name);
    const btns       = isHovered ? getRowButtons(row) : [];
 
    return ce('tr', {
      key:          row.name,
      className:    'cw-grid-row' + (isSelected ? ' table-active' : ''),
      onMouseEnter: () => setHoveredRow(row.name),
      onMouseLeave: () => setHoveredRow(null),
    },
      // checkbox col
      ce('td', {
        className: 'cw-grid-col-check ps-3',
        style:     { width: 36 },
        onClick:   e => { e.stopPropagation(); CW.toggleSelected(run_doc, row.name); }
      },
        isHovered || isSelected
          ? ce('input', { type: 'checkbox', className: 'form-check-input', checked: isSelected, readOnly: true })
          : ce('span', { className: 'cw-grid-circle' })
      ),
 
      // status badge col
      ce('td', { className: 'cw-grid-col-status', style: { width: 120 } },
        renderStatusBadge(row)
      ),
 
      // title col
      ce('td', { className: 'cw-grid-col-title fw-medium', style: { cursor: 'pointer' },
        onClick: () => openRecord(row.name)
      }, row[titleField] || row.name),
 
      // in_list_view cols
      columns.filter(f => f.fieldname !== titleField).map(f =>
        ce('td', { key: f.fieldname, className: 'cw-grid-col text-secondary' },
          row[f.fieldname] ?? ''
        )
      ),
 
      // hover action buttons
      ce('td', { className: 'cw-grid-col-actions text-end pe-3', style: { width: 160 } },
        isHovered && btns.map(btn =>
          ce('button', {
            key:       btn.signal,
            className: 'btn btn-sm btn-ghost-secondary ms-1',
            onClick:   async e => {
              e.stopPropagation();
              await run_doc.child({
                operation:      'update',
                target_doctype: doctype,
                query:          { where: { name: row.name } },
                input:          { _state: { [btn.signal]: '' } },
                options:        { render: false, internal: true },
              });
              CW.refetchGrid(run_doc);
            }
          }, btn.label)
        )
      )
    );
  };
 
  // ── header ────────────────────────────────────────────────
  const renderHeader = () => ce('thead', null,
    ce('tr', { className: 'cw-grid-header' },
      ce('th', {
        className: 'ps-3',
        style:     { width: 36 },
        onClick:   () => CW.toggleAllSelected(run_doc)
      },
        allChecked
          ? ce('input', { type: 'checkbox', className: 'form-check-input', checked: true, readOnly: true })
          : ce('span', { className: 'cw-grid-circle' })
      ),
      ce('th', { style: { width: 120 } }, 'Status'),
      ce('th', null, schema.label || doctype),
      columns.filter(f => f.fieldname !== titleField).map(f =>
        ce('th', { key: f.fieldname }, f.label || f.fieldname)
      ),
      ce('th', { style: { width: 160 } })
    )
  );
 
  // ── render ────────────────────────────────────────────────
  return ce('div', { className: 'cw-universal-grid' },
    renderToolbar(),
    ce('div', { className: 'table-responsive' },
      ce('table', { className: 'table table-hover table-sm mb-0' },
        renderHeader(),
        ce('tbody', null, rows.map(renderRow))
      )
    ),
    rows.length === 0 && ce('div', { className: 'text-center text-secondary py-5' },
      ce('i', { className: 'ti ti-inbox fs-1 d-block mb-2' }),
      'No records'
    )
  );
};
 
globalThis.UniversalGrid = UniversalGrid;
console.log('✅ UniversalGrid loaded');