//v7 https://claude.ai/chat/aef35e97-1e6f-42ab-bec0-c679972990fc

(function () {
  if (typeof pb === 'undefined') {
    console.error('PocketBase instance (pb) not found. Make sure PocketBase is initialized.');
    return;
  }
  if (typeof selectedTarget === 'undefined' || !selectedTarget) {
    console.error('selectedTarget not found. Make sure a record is selected.');
    return;
  }

  pb.autoCancellation(false); // Critical setting

  // Load CSS
  const cssLinks = ['https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/css/bootstrap.min.css'];
  cssLinks.forEach(href => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  });

  // Disable AMD to avoid conflicts
  const prevDefine = window.define;
  window.define = undefined;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadReact() {
    if (window.React && window.ReactDOM) {
      return { React: window.React, ReactDOM: window.ReactDOM };
    }

    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js');
      
      if (!window.React || !window.ReactDOM) {
        throw new Error('React libraries failed to load properly');
      }
      
      return { React: window.React, ReactDOM: window.ReactDOM };
    } finally {
      // Restore AMD if it existed
      if (prevDefine) window.define = prevDefine;
    }
  }

  // Create React grid for main doctype listing
  function createMainDataGrid(schema, React) {
    const { useState, useEffect, useCallback } = React;

    return function MainDataGrid() {
      const [rows, setRows] = useState([]);
      const [selectedRows, setSelectedRows] = useState(new Set());
      const [sortField, setSortField] = useState('');
      const [sortDir, setSortDir] = useState('asc');
      const [filter, setFilter] = useState('');

      const loadData = useCallback(async () => {
        const records = await pb.collection('item').getFullList({ 
          filter: `doctype = "${selectedTarget.doctype}"` 
        }).catch(() => []);
        setRows(records);
      }, []);

      useEffect(() => { loadData(); }, [loadData]);

      const visibleFields = schema?.fields?.filter(f => f.in_list_view) || [];
      const filteredRows = rows.filter(row => 
        !filter || [row.name, row.doctype, ...Object.values(row.data || {})].some(v => 
          String(v).toLowerCase().includes(filter.toLowerCase())
        )
      );
      const sortedRows = sortField ? [...filteredRows].sort((a, b) => {
        let aVal = sortField === 'name' ? a.name : sortField === 'doctype' ? a.doctype : a.data?.[sortField];
        let bVal = sortField === 'name' ? b.name : sortField === 'doctype' ? b.doctype : b.data?.[sortField];
        return sortDir === 'asc' ? String(aVal || '').localeCompare(String(bVal || '')) : String(bVal || '').localeCompare(String(aVal || ''));
      }) : filteredRows;

      return React.createElement('div', { style: { marginTop: '20px' } }, [
        React.createElement('h5', { key: 'title' }, `${selectedTarget.doctype} Records`),
        React.createElement('div', { key: 'controls', className: 'mb-2 d-flex gap-2' }, [
          selectedRows.size > 0 && React.createElement('span', { key: 'selected', className: 'badge badge-info' }, `${selectedRows.size} selected`),
          React.createElement('input', { key: 'filter', className: 'form-control form-control-sm ml-auto', style: { width: '200px' }, placeholder: 'Filter records...', value: filter, onChange: e => setFilter(e.target.value) })
        ]),
        React.createElement('div', { key: 'table', className: 'table-responsive', style: { maxHeight: '400px', overflowY: 'auto' } },
          React.createElement('table', { className: 'table table-sm table-striped' }, [
            React.createElement('thead', { key: 'head', className: 'thead-dark sticky-top' },
              React.createElement('tr', {}, [
                React.createElement('th', { key: 'check', style: { width: '30px' } },
                  React.createElement('input', { type: 'checkbox', onChange: e => setSelectedRows(e.target.checked ? new Set(rows.map(r => r.id)) : new Set()) })
                ),
                React.createElement('th', { key: 'name', style: { cursor: 'pointer' }, onClick: () => { setSortField('name'); setSortDir(sortField === 'name' && sortDir === 'asc' ? 'desc' : 'asc'); } }, 'Name'),
                React.createElement('th', { key: 'doctype', style: { cursor: 'pointer' }, onClick: () => { setSortField('doctype'); setSortDir(sortField === 'doctype' && sortDir === 'asc' ? 'desc' : 'asc'); } }, 'Doctype'),
                ...visibleFields.map(f => React.createElement('th', { key: f.fieldname, style: { cursor: 'pointer' }, onClick: () => { setSortField(f.fieldname); setSortDir(sortField === f.fieldname && sortDir === 'asc' ? 'desc' : 'asc'); } }, f.label))
              ])
            ),
            React.createElement('tbody', { key: 'body' },
              sortedRows.map(row => React.createElement('tr', { key: row.id, className: selectedRows.has(row.id) ? 'table-active' : '' }, [
                React.createElement('td', { key: 'check' },
                  React.createElement('input', { type: 'checkbox', checked: selectedRows.has(row.id), onChange: e => setSelectedRows(prev => { const next = new Set(prev); if (e.target.checked) next.add(row.id); else next.delete(row.id); return next; }) })
                ),
                React.createElement('td', { key: 'name' },
                  React.createElement('a', { href: '#', className: 'text-primary', onClick: e => { e.preventDefault(); window.selectExistingRecord && window.selectExistingRecord(row.id); } }, row.name)
                ),
                React.createElement('td', { key: 'doctype' }, row.doctype),
                ...visibleFields.map(f => React.createElement('td', { key: f.fieldname }, 
                  f.fieldtype === 'Check' ? (row.data?.[f.fieldname] ? '✓' : '✗') : (row.data?.[f.fieldname] || '')
                ))
              ]))
            )
          ])
        )
      ]);
    };
  }

  loadReact().then(({ React, ReactDOM }) => {
    const { useState, useEffect, useCallback, useMemo } = React;

    const ChildTable = ({ field, formData, onChange }) => {
      const [childRows, setChildRows] = useState([]);
      const [childSchema, setChildSchema] = useState(null);
      const [selectedRows, setSelectedRows] = useState(new Set());
      const [sortField, setSortField] = useState('');
      const [sortDir, setSortDir] = useState('asc');
      const [filter, setFilter] = useState('');

      const loadChildData = useCallback(async () => {
        try {
          // Load child schema
          const childSchemaResult = await pb.collection('item').getList(1, 1, { 
            filter: `doctype = "Schema" && data.name = "${field.options}"` 
          });
          if (childSchemaResult.items.length > 0) {
            setChildSchema(childSchemaResult.items[0].data);
          }

          // Load child records
          const children = await pb.collection('item').getFullList({ 
            filter: `doctype = "${field.options}" && data.parent = "${selectedTarget.name}"` 
          });
          setChildRows(children);
        } catch (err) {
          console.error('Error loading child data:', err);
        }
      }, [field.options]);

      const addRow = useCallback(async () => {
        const newChild = await pb.collection('item').create({
          doctype: field.options,
          name: `new-${field.options.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          data: { parent: selectedTarget.name, parenttype: selectedTarget.doctype, parentfield: field.fieldname }
        });
        setChildRows(prev => [...prev, newChild]);
      }, [field]);

      const deleteSelected = useCallback(async () => {
        for (const id of selectedRows) {
          await pb.collection('item').delete(id);
        }
        setChildRows(prev => prev.filter(row => !selectedRows.has(row.id)));
        setSelectedRows(new Set());
      }, [selectedRows]);

      const updateCell = useCallback(async (rowId, fieldName, value) => {
        const row = childRows.find(r => r.id === rowId);
        const newData = { ...row.data, [fieldName]: value };
        await pb.collection('item').update(rowId, { data: newData });
        setChildRows(prev => prev.map(r => r.id === rowId ? { ...r, data: newData } : r));
      }, [childRows]);

      useEffect(() => { loadChildData(); }, [loadChildData]);

      if (!childSchema) return React.createElement('div', { className: 'text-muted' }, 'Loading...');

      const visibleFields = childSchema.fields.filter(f => f.in_list_view);
      const filteredRows = childRows.filter(row => 
        !filter || Object.values(row.data).some(v => String(v).toLowerCase().includes(filter.toLowerCase()))
      );
      const sortedRows = sortField ? [...filteredRows].sort((a, b) => {
        const aVal = a.data[sortField] || '';
        const bVal = b.data[sortField] || '';
        return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
      }) : filteredRows;

      return React.createElement('div', { className: 'form-group mb-4' }, [
        React.createElement('label', { key: 'label', className: 'form-label' }, field.label),
        React.createElement('div', { key: 'controls', className: 'mb-2 d-flex gap-2' }, [
          React.createElement('button', { key: 'add', className: 'btn btn-sm btn-primary', onClick: addRow }, 'Add Row'),
          selectedRows.size > 0 && React.createElement('button', { key: 'delete', className: 'btn btn-sm btn-danger', onClick: deleteSelected }, `Delete (${selectedRows.size})`),
          React.createElement('input', { key: 'filter', className: 'form-control form-control-sm ml-auto', style: { width: '200px' }, placeholder: 'Filter...', value: filter, onChange: e => setFilter(e.target.value) })
        ]),
        React.createElement('div', { key: 'table', className: 'table-responsive', style: { maxHeight: '300px', overflowY: 'auto' } },
          React.createElement('table', { className: 'table table-sm table-hover' }, [
            React.createElement('thead', { key: 'head', className: 'thead-light sticky-top' },
              React.createElement('tr', {}, [
                React.createElement('th', { key: 'check', style: { width: '30px' } },
                  React.createElement('input', { type: 'checkbox', onChange: e => setSelectedRows(e.target.checked ? new Set(childRows.map(r => r.id)) : new Set()) })
                ),
                React.createElement('th', { key: 'name', style: { width: '120px', cursor: 'pointer' }, onClick: () => { setSortField('name'); setSortDir(sortField === 'name' && sortDir === 'asc' ? 'desc' : 'asc'); } }, 'Name'),
                ...visibleFields.map(f => React.createElement('th', { key: f.fieldname, style: { cursor: 'pointer' }, onClick: () => { setSortField(f.fieldname); setSortDir(sortField === f.fieldname && sortDir === 'asc' ? 'desc' : 'asc'); } }, f.label))
              ])
            ),
            React.createElement('tbody', { key: 'body' },
              sortedRows.map(row => React.createElement('tr', { key: row.id, className: selectedRows.has(row.id) ? 'table-active' : '' }, [
                React.createElement('td', { key: 'check' },
                  React.createElement('input', { type: 'checkbox', checked: selectedRows.has(row.id), onChange: e => setSelectedRows(prev => { const next = new Set(prev); if (e.target.checked) next.add(row.id); else next.delete(row.id); return next; }) })
                ),
                React.createElement('td', { key: 'name' },
                  React.createElement('a', { href: '#', className: 'text-primary', onClick: e => { e.preventDefault(); window.selectExistingRecord && window.selectExistingRecord(row.id); } }, row.name)
                ),
                ...visibleFields.map(f => React.createElement('td', { key: f.fieldname, contentEditable: true, suppressContentEditableWarning: true, onBlur: e => updateCell(row.id, f.fieldname, e.target.textContent), style: { minWidth: '80px' } }, 
                  f.fieldtype === 'Check' ? (row.data[f.fieldname] ? '✓' : '✗') : (row.data[f.fieldname] || '')
                ))
              ]))
            )
          ])
        )
      ]);
    };

    const FormField = ({ field, value, onChange, formData, linkOptions }) => {
      if (field.fieldtype === 'Table') {
        return React.createElement(ChildTable, { field, formData, onChange });
      }

      const fieldType = useMemo(() => {
        switch (field.fieldtype) {
          case 'Int': case 'Float': case 'Currency': case 'Percent': return 'number';
          case 'Date': return 'date';
          case 'Datetime': return 'datetime-local';
          case 'Time': return 'time';
          case 'Check': return 'checkbox';
          case 'Text': case 'Small Text': case 'Text Editor': case 'Code': return 'textarea';
          case 'Color': return 'color';
          case 'Password': return 'password';
          case 'Link': case 'Dynamic Link': case 'Select': return 'select';
          default: return 'text';
        }
      }, [field.fieldtype]);

      const handleChange = useCallback((e) => {
        let val = e.target.value;
        if (field.fieldtype === 'Int') val = val === '' ? null : parseInt(val);
        else if (['Float', 'Currency', 'Percent'].includes(field.fieldtype)) val = val === '' ? null : parseFloat(val);
        else if (field.fieldtype === 'Check') val = e.target.checked ? 1 : 0;
        onChange(field.fieldname, val);
      }, [field, onChange]);

      const options = linkOptions[field.fieldname] || [];
      const isDynamic = field.fieldtype === 'Dynamic Link';
      const canShowOptions = !isDynamic || formData[field.options];

      return React.createElement('div', { className: 'form-group mb-3' }, [
        React.createElement('label', { key: 'label', className: 'form-label' }, field.label),
        fieldType === 'select' 
          ? React.createElement('select', {
              key: 'select',
              className: 'form-control',
              value: value || '',
              onChange: handleChange
            }, [
              React.createElement('option', { key: 'empty', value: '' }, '-- Select --'),
              !canShowOptions && React.createElement('option', { key: 'disabled', disabled: true }, `Select ${field.options} first`),
              ...options.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.text))
            ])
          : fieldType === 'textarea'
          ? React.createElement('textarea', {
              key: 'textarea',
              className: 'form-control',
              value: value || '',
              onChange: handleChange,
              rows: 3
            })
          : fieldType === 'checkbox'
          ? React.createElement('input', {
              key: 'checkbox',
              type: 'checkbox',
              className: 'form-check-input',
              checked: !!value,
              onChange: handleChange
            })
          : React.createElement('input', {
              key: 'input',
              type: fieldType,
              className: 'form-control',
              value: value || '',
              onChange: handleChange
            })
      ]);
    };

    const UniversalFrappeForm = () => {
      const [schema, setSchema] = useState(null);
      const [formData, setFormData] = useState(selectedTarget.data ? { ...selectedTarget.data } : {});
      const [linkOptions, setLinkOptions] = useState({});
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);

      const [saving, setSaving] = useState(false);
      const [saveStatus, setSaveStatus] = useState(null);

      const saveToDatabase = useCallback(async (newData) => {
        try {
          setSaving(true);
          setSaveStatus(null);
          
          await pb.collection('item').update(selectedTarget.id, {
            data: newData
          });
          
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
          console.error('Save error:', err);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus(null), 3000);
        } finally {
          setSaving(false);
        }
      }, []);

      const onChange = useCallback((fieldName, value) => {
        const newData = { ...formData, [fieldName]: value };
        setFormData(newData);
        
        // Debounced save
        clearTimeout(window.formSaveTimeout);
        window.formSaveTimeout = setTimeout(() => {
          saveToDatabase(newData);
        }, 1000);
      }, [formData, saveToDatabase]);

      const getTitleField = useCallback((doctype) => schema?.title_field || 'subject', [schema]);

      const loadData = useCallback(async () => {
        try {
          const doctype = selectedTarget.doctype;
          
          // Batch load schema
          const schemaPromises = [];
          if (selectedTarget.meta?.schema) {
            schemaPromises.push(
              pb.collection('item').getList(1, 1, { filter: `name = "${selectedTarget.meta.schema}"` })
                .catch(() => ({ items: [] }))
            );
          }
          schemaPromises.push(
            pb.collection('item').getList(1, 1, { filter: `doctype = "Schema" && data.name = "${doctype}"` })
              .catch(() => ({ items: [] }))
          );
          
          const schemaResults = await Promise.all(schemaPromises);
          let schemaData = null;
          
          for (const result of schemaResults) {
            if (result.items.length > 0) {
              schemaData = result.items[0].data;
              break;
            }
          }
          
          if (!schemaData) throw new Error(`No schema found for doctype: ${doctype}`);
          setSchema(schemaData);

          // Batch load link options
          const linkFields = schemaData.fields.filter(f => f.fieldtype === 'Link');
          const doctypes = [...new Set(linkFields.map(f => f.options))];
          
          if (doctypes.length > 0) {
            const linkPromises = doctypes.map(dt => 
              pb.collection('item').getFullList({ filter: `doctype = "${dt}"` })
                .then(records => ({ doctype: dt, records }))
                .catch(err => {
                  console.warn(`Failed to load records for ${dt}:`, err);
                  return { doctype: dt, records: [] };
                })
            );
            
            const linkResults = await Promise.all(linkPromises);
            const options = {};
            
            linkResults.forEach(({ doctype: dt, records }) => {
              const titleField = schemaData.title_field || 'subject';
              linkFields
                .filter(f => f.options === dt)
                .forEach(f => {
                  options[f.fieldname] = records.map(r => ({
                    value: r.name,
                    text: r.data[titleField] || r.name
                  }));
                });
            });
            
            setLinkOptions(options);
          }
          
          setLoading(false);
        } catch (err) {
          console.error('Error loading data:', err);
          setError(`Failed to load form: ${err.message}`);
          setLoading(false);
        }
      }, []);

      // Handle dynamic link updates
      useEffect(() => {
        if (!schema) return;
        
        const dynamicFields = schema.fields.filter(f => f.fieldtype === 'Dynamic Link');
        
        dynamicFields.forEach(field => {
          const sourceValue = formData[field.options];
          if (sourceValue && !linkOptions[field.fieldname]) {
            pb.collection('item').getFullList({ filter: `doctype = "${sourceValue}"` })
              .then(records => {
                const titleField = schema.title_field || 'subject';
                const options = records.map(r => ({
                  value: r.name,
                  text: r.data[titleField] || r.name
                }));
                setLinkOptions(prev => ({ ...prev, [field.fieldname]: options }));
              })
              .catch(err => console.warn(`Failed to load dynamic options for ${field.fieldname}:`, err));
          }
        });
      }, [formData, schema, linkOptions]);

      useEffect(() => {
        loadData();
      }, [loadData]);

      if (loading) return React.createElement('div', { className: 'text-center p-4' }, 
        React.createElement('div', { className: 'spinner-border' }, 
          React.createElement('span', { className: 'sr-only' }, 'Loading...')
        )
      );
      
      if (error) return React.createElement('div', { className: 'alert alert-danger' }, error);
      
      if (!schema) return null;

      const fieldsMap = Object.fromEntries(schema.fields.map(f => [f.fieldname, f]));
      const fieldOrder = schema.field_order || [];

      return React.createElement('div', { className: 'form-layout' }, [
        // Save status indicator
        saveStatus && React.createElement('div', { 
          key: 'status',
          className: `alert ${saveStatus === 'saved' ? 'alert-success' : 'alert-danger'} mb-3` 
        }, [
          saving && React.createElement('span', { key: 'spinner', className: 'spinner-border spinner-border-sm me-2' }),
          saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '✗ Save failed' : 'Saving...'
        ]),
        
        // Main data grid (moved here)
        schema && React.createElement(createMainDataGrid(schema, React), { key: 'main-grid' }),
        
        // Form fields
        ...fieldOrder.map(fieldName => {
          const field = fieldsMap[fieldName];
          return field ? React.createElement(FormField, {
            key: fieldName,
            field,
            value: formData[fieldName],
            onChange,
            formData,
            linkOptions
          }) : null;
        }).filter(Boolean)
      ]);
    };

    // Create container and render
    let container = document.getElementById('universal-form-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'universal-form-container';
      document.body.appendChild(container);
    }

    // Support both React 18 and older versions
    try {
      if (ReactDOM.createRoot) {
        ReactDOM.createRoot(container).render(React.createElement(UniversalFrappeForm));
      } else {
        ReactDOM.render(React.createElement(UniversalFrappeForm), container);
      }
    } catch (renderError) {
      console.error('Render error:', renderError);
      container.innerHTML = `<div class="alert alert-danger">Failed to render form: ${renderError.message}</div>`;
    }

  }).catch(err => {
    console.error('Failed to load React:', err);
    const container = document.getElementById('universal-form-container') || document.body;
    container.innerHTML = `<div class="alert alert-danger">Failed to load React: ${err.message}</div>`;
  });
})();