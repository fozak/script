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
  const cssLinks = [
    'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/tabulator/5.4.4/css/tabulator.min.css'
  ];
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

  // Load Tabulator and create grid
  async function createTabulatorGrid(schema) {
    if (!window.Tabulator) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/tabulator/5.4.4/js/tabulator.min.js');
    }
    
    let gridContainer = document.getElementById('tabulator-grid');
    if (!gridContainer) {
      gridContainer = document.createElement('div');
      gridContainer.id = 'tabulator-grid';
      gridContainer.style.marginTop = '20px';
      const searchResults = document.getElementById('searchResults');
      if (searchResults) {
        searchResults.parentNode.insertBefore(gridContainer, searchResults.nextSibling);
      } else {
        document.body.appendChild(gridContainer);
      }
    }

    const columns = [
      { title: "Name", field: "name", width: 150 },
      { title: "Doctype", field: "doctype", width: 120 }
    ];
    
    // Add columns for fields with in_list_view: 1
    if (schema && schema.fields) {
      schema.fields.filter(f => f.in_list_view === 1).forEach(field => {
        columns.push({
          title: field.label,
          field: `data.${field.fieldname}`,
          width: 150,
          formatter: field.fieldtype === 'Check' ? 'tickCross' : 'plaintext'
        });
      });
    }

    // Load data and create table
    const records = await pb.collection('item').getFullList({ 
      filter: `doctype = "${selectedTarget.doctype}"` 
    }).catch(() => []);

    new window.Tabulator(gridContainer, {
      data: records,
      columns: columns,
      layout: "fitColumns",
      pagination: "local",
      paginationSize: 20,
      height: "400px"
    });
  }

  loadReact().then(({ React, ReactDOM }) => {
    const { useState, useEffect, useCallback, useMemo } = React;

    const FormField = ({ field, value, onChange, formData, linkOptions }) => {
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

          // Create Tabulator grid
          createTabulatorGrid(schemaData);

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