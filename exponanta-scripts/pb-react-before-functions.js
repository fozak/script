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

    // Cache for storing fetched document data to avoid repeated API calls
    const documentCache = new Map();

    // Utility function to handle fetch_from logic
    const processFetchFrom = async (fetchFromPath, sourceValue, formData, setFormData) => {
      if (!fetchFromPath || !sourceValue) return;

      try {
        const [sourceField, targetProperty] = fetchFromPath.split('.');
        
        if (sourceField && targetProperty) {
          // Check cache first
          const cacheKey = `${sourceValue}`;
          let sourceDoc = documentCache.get(cacheKey);
          
          if (!sourceDoc) {
            // Fetch the linked document
            const sourceRecords = await pb.collection('item').getFullList({
              filter: `name = "${sourceValue}"`
            });
            
            if (sourceRecords.length > 0) {
              sourceDoc = sourceRecords[0];
              documentCache.set(cacheKey, sourceDoc);
            }
          }
          
          if (sourceDoc && sourceDoc.data && sourceDoc.data[targetProperty] !== undefined) {
            return sourceDoc.data[targetProperty];
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${fetchFromPath}:`, error);
      }
      
      return null;
    };

    // Enhanced function to handle all fetch_from fields when a source field changes
    const handleFetchFromUpdates = async (changedField, newValue, schema, formData, setFormData) => {
      if (!schema || !schema.fields) return;

      // Find all fields that have fetch_from referencing the changed field
      const fetchFromFields = schema.fields.filter(field => 
        field.fetch_from && field.fetch_from.startsWith(`${changedField}.`)
      );

      if (fetchFromFields.length === 0) return;

      // Process all fetch_from fields in parallel
      const fetchPromises = fetchFromFields.map(async (field) => {
        const fetchedValue = await processFetchFrom(field.fetch_from, newValue, formData, setFormData);
        return { fieldname: field.fieldname, value: fetchedValue };
      });

      try {
        const results = await Promise.all(fetchPromises);
        
        // Update form data with fetched values
        const updates = {};
        results.forEach(({ fieldname, value }) => {
          if (value !== null) {
            updates[fieldname] = value;
          }
        });

        if (Object.keys(updates).length > 0) {
          setFormData(prev => ({ ...prev, ...updates }));
        }
      } catch (error) {
        console.error('Error processing fetch_from updates:', error);
      }
    };

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
        // Step 1: Create the child record with a temporary name
        const newChild = await pb.collection('item').create({
          doctype: field.options,
          name: `temp-${Date.now()}`, // Temporary name
          data: { parent: selectedTarget.name, parenttype: selectedTarget.doctype, parentfield: field.fieldname }
        });
        
        // Step 2: Update the name with the proper format using the real PocketBase ID
        const finalName = `${field.options.replace(/\s+/g, '-')}-${newChild.id}`;
        const updatedChild = await pb.collection('item').update(newChild.id, {
          name: finalName
        });
        
        // Use the updated record for the state
        setChildRows(prev => [...prev, { ...newChild, name: finalName }]);
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

        // Handle fetch_from for child table fields
        if (childSchema) {
          handleFetchFromUpdates(fieldName, value, childSchema, newData, (updates) => {
            const finalData = { ...newData, ...updates };
            pb.collection('item').update(rowId, { data: finalData });
            setChildRows(prev => prev.map(r => r.id === rowId ? { ...r, data: finalData } : r));
          });
        }
      }, [childRows, childSchema]);

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
                ...visibleFields.map(f => React.createElement('td', { 
                  key: f.fieldname, 
                  contentEditable: !f.fetch_from, // Make fetch_from fields read-only
                  suppressContentEditableWarning: true, 
                  onBlur: e => updateCell(row.id, f.fieldname, e.target.textContent), 
                  style: { 
                    minWidth: '80px',
                    backgroundColor: f.fetch_from ? '#f8f9fa' : 'transparent', // Visual indicator for fetch_from fields
                    cursor: f.fetch_from ? 'not-allowed' : 'text'
                  },
                  title: f.fetch_from ? `Auto-fetched from: ${f.fetch_from}` : ''
                }, 
                  f.fieldtype === 'Check' ? (row.data[f.fieldname] ? '✓' : '✗') : (row.data[f.fieldname] || '')
                ))
              ]))
            )
          ])
        )
      ]);
    };

    const FormField = ({ field, value, onChange, formData, linkOptions, schema }) => {
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

      const handleChange = useCallback(async (e) => {
        let val = e.target.value;
        if (field.fieldtype === 'Int') val = val === '' ? null : parseInt(val);
        else if (['Float', 'Currency', 'Percent'].includes(field.fieldtype)) val = val === '' ? null : parseFloat(val);
        else if (field.fieldtype === 'Check') val = e.target.checked ? 1 : 0;
        
        // Update the field value first
        onChange(field.fieldname, val);

        // Then handle fetch_from updates if this field change affects other fields
        if (schema && (field.fieldtype === 'Link' || field.fieldtype === 'Dynamic Link')) {
          // Use a ref or timeout to get the updated formData
          setTimeout(() => {
            handleFetchFromUpdates(field.fieldname, val, schema, { ...formData, [field.fieldname]: val }, (updates) => {
              Object.entries(updates).forEach(([fieldname, value]) => {
                onChange(fieldname, value);
              });
            });
          }, 10); // Minimal delay to ensure state update
        }
      }, [field, onChange, formData, schema]);

      const options = linkOptions[field.fieldname] || [];
      const isDynamic = field.fieldtype === 'Dynamic Link';
      const canShowOptions = !isDynamic || formData[field.options];

      // Check if this field is auto-populated by fetch_from
      const isReadOnly = !!field.fetch_from;

      return React.createElement('div', { className: 'form-group mb-3' }, [
        React.createElement('label', { 
          key: 'label', 
          className: 'form-label',
          title: field.fetch_from ? `Auto-fetched from: ${field.fetch_from}` : ''
        }, [
          field.label,
          field.fetch_from && React.createElement('small', { 
            key: 'fetch-indicator',
            className: 'text-muted ml-2',
            style: { fontSize: '0.8em' }
          }, '(auto-filled)')
        ]),
        fieldType === 'select' 
          ? React.createElement('select', {
              key: 'select',
              className: `form-control ${isReadOnly ? 'bg-light' : ''}`,
              value: value || '',
              onChange: handleChange,
              disabled: isReadOnly
            }, [
              React.createElement('option', { key: 'empty', value: '' }, '-- Select --'),
              !canShowOptions && React.createElement('option', { key: 'disabled', disabled: true }, `Select ${field.options} first`),
              ...options.map(opt => React.createElement('option', { key: opt.value, value: opt.value }, opt.text))
            ])
          : fieldType === 'textarea'
          ? React.createElement('textarea', {
              key: 'textarea',
              className: `form-control ${isReadOnly ? 'bg-light' : ''}`,
              value: value || '',
              onChange: handleChange,
              rows: 3,
              readOnly: isReadOnly
            })
          : fieldType === 'checkbox'
          ? React.createElement('input', {
              key: 'checkbox',
              type: 'checkbox',
              className: 'form-check-input',
              checked: !!value,
              onChange: handleChange,
              disabled: isReadOnly
            })
          : React.createElement('input', {
              key: 'input',
              type: fieldType,
              className: `form-control ${isReadOnly ? 'bg-light' : ''}`,
              value: value || '',
              onChange: handleChange,
              readOnly: isReadOnly
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
      }, []); // Remove formData dependency to prevent loops

      // Handle dynamic link updates
      useEffect(() => {
        if (!schema || !schema.fields) return;
        
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
      }, [formData, schema?.fields]); // More specific dependencies

      // Separate useEffect for initial fetch_from processing
      useEffect(() => {
        if (!schema || !schema.fields || loading) return;
        
        const processFetchFromFields = async () => {
          const fetchFromFields = schema.fields.filter(f => f.fetch_from);
          let hasUpdates = false;
          const updates = {};
          
          for (const field of fetchFromFields) {
            const [sourceField] = field.fetch_from.split('.');
            const sourceValue = formData[sourceField];
            
            if (sourceValue && !formData[field.fieldname]) {
              const fetchedValue = await processFetchFrom(field.fetch_from, sourceValue, formData, setFormData);
              if (fetchedValue !== null) {
                updates[field.fieldname] = fetchedValue;
                hasUpdates = true;
              }
            }
          }
          
          if (hasUpdates) {
            setFormData(prev => ({ ...prev, ...updates }));
          }
        };
        
        processFetchFromFields();
      }, [schema?.fields, loading]); // Process once when schema loads

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
            linkOptions,
            schema
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