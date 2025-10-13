// app.js

(function() {
  'use strict';

  // ============================================================================
  // BREADCRUMB COMPONENT
  // ============================================================================
  
  pb.components.Breadcrumb = function() {
    const { createElement: e, useState, useEffect } = React;
    const [current, setCurrent] = useState(null);
    
    useEffect(() => {
      const unsubscribe = pb.navigation.subscribe((list, loading, state) => {
        setCurrent(state);
      });
      return unsubscribe;
    }, []);
    
    if (!current) return null;
    
    const crumbs = [];
    
    // Home
    crumbs.push(
      e('li', { key: 'home', className: 'breadcrumb-item' },
        e('a', { 
          href: '#',
          onClick: (ev) => { ev.preventDefault(); pb.nav.home(); }
        }, 'Home')
      )
    );
    
    // List view
    if (current.view === 'list') {
      crumbs.push(
        e('li', { key: 'list', className: 'breadcrumb-item active' },
          current.params.doctype
        )
      );
    }
    
    // Item view
    if (current.view === 'item') {
      crumbs.push(
        e('li', { key: 'doctype', className: 'breadcrumb-item' },
          e('a', {
            href: '#',
            onClick: (ev) => { 
              ev.preventDefault(); 
              pb.nav.list(current.params.doctype); 
            }
          }, current.params.doctype)
        )
      );
      crumbs.push(
        e('li', { key: 'item', className: 'breadcrumb-item active' },
          current.params.name
        )
      );
    }
    
    return e('nav', { 'aria-label': 'breadcrumb', className: 'mb-3' },
      e('ol', { className: 'breadcrumb' }, crumbs)
    );
  };

  // ============================================================================
  // ADVANCED SEARCH COMPONENT
  // ============================================================================
  
  pb.components.AdvancedSearch = function({ doctype, schema, onSearch }) {
    const { createElement: e, useState } = React;
    const [filters, setFilters] = useState([]);
    const [searchText, setSearchText] = useState('');
    
    const addFilter = () => {
      setFilters([...filters, { field: '', operator: 'equals', value: '' }]);
    };
    
    const removeFilter = (index) => {
      setFilters(filters.filter((_, i) => i !== index));
    };
    
    const updateFilter = (index, key, value) => {
      const newFilters = [...filters];
      newFilters[index][key] = value;
      setFilters(newFilters);
    };
    
    const handleSearch = () => {
      const where = {};
      
      // Text search across all fields
      if (searchText) {
        where.OR = schema.fields
          .filter(f => f.fieldtype === 'Data' || f.fieldtype === 'Text')
          .map(f => ({ [f.fieldname]: { contains: searchText } }));
      }
      
      // Advanced filters
      filters.forEach(filter => {
        if (filter.field && filter.value) {
          switch (filter.operator) {
            case 'equals':
              where[filter.field] = filter.value;
              break;
            case 'contains':
              where[filter.field] = { contains: filter.value };
              break;
            case 'gt':
              where[filter.field] = { gt: filter.value };
              break;
            case 'lt':
              where[filter.field] = { lt: filter.value };
              break;
            case 'in':
              where[filter.field] = { in: filter.value.split(',').map(v => v.trim()) };
              break;
          }
        }
      });
      
      onSearch(where);
    };
    
    const clearSearch = () => {
      setSearchText('');
      setFilters([]);
      onSearch({});
    };
    
    return e('div', { className: `${pb.BS.card.base} mb-3` },
      e('div', { className: pb.BS.card.body }, [
        // Quick search
        e('div', { key: 'quick', className: 'input-group mb-2' }, [
          e('input', {
            key: 'input',
            type: 'text',
            className: pb.BS.input.base,
            placeholder: 'Quick search across all fields...',
            value: searchText,
            onChange: (ev) => setSearchText(ev.target.value),
            onKeyPress: (ev) => ev.key === 'Enter' && handleSearch()
          }),
          e('button', {
            key: 'btn',
            className: pb.BS.button.primary,
            onClick: handleSearch
          }, '🔍 Search')
        ]),
        
        // Advanced filters
        filters.length > 0 && e('div', { key: 'filters', className: 'border-top pt-2' }, [
          e('small', { key: 'label', className: 'text-muted d-block mb-2' }, 
            'Advanced Filters'
          ),
          ...filters.map((filter, i) =>
            e('div', { key: i, className: 'row mb-2' }, [
              e('div', { key: 'field', className: 'col-3' },
                e('select', {
                  className: pb.BS.input.base,
                  value: filter.field,
                  onChange: (ev) => updateFilter(i, 'field', ev.target.value)
                }, [
                  e('option', { key: 'empty', value: '' }, 'Select field...'),
                  ...schema.fields.map(f =>
                    e('option', { key: f.fieldname, value: f.fieldname }, f.label)
                  )
                ])
              ),
              e('div', { key: 'operator', className: 'col-3' },
                e('select', {
                  className: pb.BS.input.base,
                  value: filter.operator,
                  onChange: (ev) => updateFilter(i, 'operator', ev.target.value)
                }, [
                  e('option', { value: 'equals' }, 'Equals'),
                  e('option', { value: 'contains' }, 'Contains'),
                  e('option', { value: 'gt' }, 'Greater than'),
                  e('option', { value: 'lt' }, 'Less than'),
                  e('option', { value: 'in' }, 'In (comma-separated)')
                ])
              ),
              e('div', { key: 'value', className: 'col-5' },
                e('input', {
                  type: 'text',
                  className: pb.BS.input.base,
                  placeholder: 'Value...',
                  value: filter.value,
                  onChange: (ev) => updateFilter(i, 'value', ev.target.value)
                })
              ),
              e('div', { key: 'remove', className: 'col-1' },
                e('button', {
                  className: pb.BS.button.danger,
                  onClick: () => removeFilter(i)
                }, '×')
              )
            ])
          )
        ]),
        
        // Action buttons
        e('div', { key: 'actions', className: 'btn-group btn-group-sm' }, [
          e('button', {
            key: 'add',
            className: pb.BS.button.secondary,
            onClick: addFilter
          }, '+ Add Filter'),
          (searchText || filters.length > 0) && e('button', {
            key: 'clear',
            className: pb.BS.button.outline,
            onClick: clearSearch
          }, 'Clear')
        ])
      ])
    );
  };

  // ============================================================================
  // ENHANCED MAIN GRID WITH SEARCH
  // ============================================================================
  
  pb.components.MainGrid = function({ doctype }) {
    const { createElement: e, useState, useEffect } = React;
    const [currentList, setCurrentList] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchWhere, setSearchWhere] = useState({});

    useEffect(() => {
      const unsubscribe = pb.navigation.subscribe((list, loading) => {
        setCurrentList(list);
        setIsLoading(loading);
      });
      return unsubscribe;
    }, []);

    useEffect(() => {
      const current = pb.navigation.getCurrent();
      if (!current || current.params.doctype !== doctype) {
        pb.nav.list(doctype);
      }
    }, [doctype]);

    const handleSearch = (where) => {
      setSearchWhere(where);
      pb.navigation.setLoading(true);
      pb.listDocs(doctype, { where }, { view: 'list' })
        .then(result => {
          pb.navigation.updateList(result);
        })
        .finally(() => {
          pb.navigation.setLoading(false);
        });
    };

    if (isLoading) {
      return e('div', { className: 'p-4' }, 'Loading...');
    }

    if (!currentList || !currentList.data.length) {
      return e('div', {},
        currentList?.schema && e(pb.components.AdvancedSearch, {
          doctype,
          schema: currentList.schema,
          onSearch: handleSearch
        }),
        e('div', { className: 'p-4 text-gray-500' },
          `No ${doctype} records found`
        )
      );
    }

    const { data, schema } = currentList;

    if (!schema) {
      return e('div', { className: 'p-4 text-red-500' }, 'Schema not found');
    }

    const columns = Object.keys(data[0])
      .map((key) => ({
        accessorKey: key,
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        cell: ({ getValue, row }) => {
          const value = getValue();
          
          if (key === "name") {
            return e(
              pb.components.DocLink,
              {
                doctype: row.original.doctype,
                name: value
              },
              value
            );
          }
          
          const schemaField = schema.fields.find(f => f.fieldname === key);
          if (schemaField) {
            const rendered = pb.renderField(schemaField, value, row.original);
            return e("span", {
              dangerouslySetInnerHTML: { __html: rendered }
            });
          }
          
          return value;
        }
      }));

    return e('div', { className: 'p-4' }, [
      e('h2', { key: 'title', className: 'text-2xl font-bold mb-4' }, doctype),
      e(pb.components.AdvancedSearch, {
        key: 'search',
        doctype,
        schema,
        onSearch: handleSearch
      }),
      e(pb.components.BaseTable, { key: 'table', data, columns })
    ]);
  };

  // ============================================================================
  // MAIN APP COMPONENT
  // ============================================================================

  function App() {
    const { createElement: e } = React;
    
    return e('div', { className: 'container-fluid' }, [
      e(pb.components.Breadcrumb, { key: 'breadcrumb' }),
      e(pb.components.Router, { key: 'router' })
    ]);
  }

  // ============================================================================
  // INITIALIZE APP
  // ============================================================================

  function initApp() {
    const container = document.getElementById('app');
    
    if (!container) {
      console.error('❌ #app container not found');
      return;
    }
    
    if (!window.pb || !window.pb.navigation || !window.pb.components) {
      console.error('❌ Framework not fully loaded');
      return;
    }
    
    console.log('✅ Framework loaded:', {
      version: pb.navigation.VERSION,
      components: Object.keys(pb.components)
    });
    
    console.log('🎨 Mounting React app...');
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(App));
    
    console.log('✅ App mounted with advanced search and breadcrumbs!');
    
    // Console shortcuts
    window.testNav = {
      tasks: () => pb.nav.list('Task'),
      users: () => pb.nav.list('User'),
      task: (name) => pb.nav.item(name, 'Task'),
      current: () => console.log(pb.nav.current()),
      back: () => pb.nav.back(),
      refresh: () => pb.nav.refresh()
    };
    
    console.log('💡 Test shortcuts: window.testNav');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
  
})();