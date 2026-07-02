// ============================================================
// UniversalGrid — CW-ui.js addition
// React 18 UMD, no JSX, Tabler CSS
// Modes: MainGrid | Table | Relationship
// ============================================================

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

  // ── rows + columns from target.data ───────────────────────
  const rows    = run_doc.target?.data || [];
  const columns = Object.keys(rows[0] || {})
    .filter(k => k !== titleField)
    .map(k => ({
      fieldname: k,
      label: schema.fields?.find(f => f.fieldname === k)?.label || k
    }));

  // ── selection ─────────────────────────────────────────────
  const selected   = CW.getGridSelected(run_doc);
  const allChecked = selected.length === rows.length && rows.length > 0;

  // ── hover state ───────────────────────────────────────────
  const [hoveredRow, setHoveredRow] = React.useState(null);

  // ── cell value — defend against objects ───────────────────
  const cellValue = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  // ── fsm buttons per row ───────────────────────────────────
  const getRowButtons = (row) => {
    if (!CW._getFormButtons) return [];
    const result = CW._getFormButtons(run_doc, row);
    if (Array.isArray(result)) return result;
    return result?.outside || [];
  };

  // ── open record ───────────────────────────────────────────
  const openRecord = (name) => run_doc.child({
    operation:      'select',
    target_doctype: doctype,
    query:          { where: { name } },
    options:        { render: true },
  });

  // ── toolbar ───────────────────────────────────────────────
  const renderToolbar = () => {
    if (selected.length > 0) {
      const selectedRows  = rows.filter(r => selected.includes(r.name));
      const allSignalSets = selectedRows.map(r => getRowButtons(r).map(b => b.signal));
      const commonSignals = allSignalSets.length === 0 ? [] :
        allSignalSets.reduce((acc, sigs) => acc.filter(s => sigs.includes(s)));

      return ce('div', { className: 'cw-grid-toolbar cw-grid-bulk-bar d-flex align-items-center gap-2 px-3 py-2 border-bottom' },
        ce('button', {
          key:       '__clear',
          className: 'btn btn-sm btn-ghost-secondary',
          onClick:   () => CW.clearSelected(run_doc)
        }, selected.length + ' selected  ×'),

        commonSignals.map(signal => {
          const dimDef = CW._getStateDef(doctype)?.[signal.split('.')[0]];
          const key    = signal.split('.').slice(1).join('.');
          const label  = dimDef?.labels?.[key] || signal;
          return ce('button', {
            key:       signal,
            className: 'btn btn-sm btn-secondary',
            onClick:   async () => {
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
              CW.refetchGrid(run_doc);
            }
          }, label);
        }),

        ce('button', {
          key:       '__delete',
          className: 'btn btn-sm btn-ghost-danger ms-auto',
          onClick:   async () => {
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
        }, 'Delete')
      );
    }

    return ce('div', { className: 'cw-grid-toolbar d-flex align-items-center gap-2 px-3 py-2 border-bottom' },
      mode === 'MainGrid' && ce('button', {
        key:       '__new',
        className: 'btn btn-sm btn-primary',
        onClick:   () => run_doc.child({
          operation:      'create',
          target_doctype: doctype,
          options:        { render: true },
        })
      }, '+ New'),

      mode === 'Table' && ce('button', {
        key:       '__add',
        className: 'btn btn-sm btn-secondary',
        onClick:   () => {}
      }, '+ Add'),

      mode === 'MainGrid' && ce('div', { key: '__search', className: 'ms-2 flex-grow-1' },
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
    const dim0  = stateDef['0'];
    if (!dim0)  return null;
    const val   = CW._getDimValue?.(row, '0', dim0);
    const label = dim0.labels?.[val] ?? String(val);
    const color = dim0.colors?.[val] || 'secondary';
    return ce('span', { className: `badge bg-${color}-lt` }, label);
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
      ce('td', {
        key:       '__check',
        className: 'cw-grid-col-check ps-3',
        style:     { width: 36 },
        onClick:   e => { e.stopPropagation(); CW.toggleSelected(run_doc, row.name); }
      },
        isHovered || isSelected
          ? ce('input', { type: 'checkbox', className: 'form-check-input', checked: isSelected, readOnly: true })
          : ce('span', { className: 'cw-grid-circle' })
      ),

      ce('td', { key: '__status', className: 'cw-grid-col-status', style: { width: 120 } },
        renderStatusBadge(row)
      ),

      ce('td', {
        key:       '__title',
        className: 'cw-grid-col-title fw-medium',
        style:     { cursor: 'pointer' },
        onClick:   () => openRecord(row.name)
      }, cellValue(row[titleField])),

      columns.map(f =>
        ce('td', { key: f.fieldname, className: 'cw-grid-col text-secondary' },
          cellValue(row[f.fieldname])
        )
      ),

      ce('td', { key: '__actions', className: 'cw-grid-col-actions text-end pe-3', style: { width: 160 } },
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
      ce('th', { key: '__check', style: { width: 36 }, onClick: () => CW.toggleAllSelected(run_doc) },
        allChecked
          ? ce('input', { type: 'checkbox', className: 'form-check-input', checked: true, readOnly: true })
          : ce('span', { className: 'cw-grid-circle' })
      ),
      ce('th', { key: '__status', style: { width: 120 } }, 'Status'),
      ce('th', { key: '__title' }, schema.label || doctype),
      columns.map(f =>
        ce('th', { key: f.fieldname }, f.label || f.fieldname)
      ),
      ce('th', { key: '__actions', style: { width: 160 } })
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
      'No records'
    )
  );
};

globalThis.UniversalGrid = UniversalGrid;
console.log('✅ UniversalGrid loaded');
