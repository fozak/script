// app.js - Application Entry Point

(function() {
  'use strict';
  
  console.log('🚀 Initializing application...');
  
  // ============================================================================
  // SIMPLE SEARCH COMPONENT
  // ============================================================================
  
  pb.components.SimpleSearch = function({ doctype, onSearch }) {
    const { createElement: e, useState } = React;
    const [searchText, setSearchText] = useState('');
    
    const handleSearch = () => {
      if (searchText.trim()) {
        onSearch({ name: { contains: searchText } });
      } else {
        onSearch({});
      }
    };
    
    return e('div', { className: 'input-group mb-3' }, [
      e('input', {
        key: 'input',
        type: 'text',
        className: 'form-control',
        placeholder: 'Search by name...',
        value: searchText,
        onChange: (ev) => setSearchText(ev.target.value),
        onKeyPress: (ev) => ev.key === 'Enter' && handleSearch()
      }),
      e('button', {
        key: 'search',
        className: 'btn btn-primary',
        onClick: handleSearch
      }, '🔍 Search'),
      searchText && e('button', {
        key: 'clear',
        className: 'btn btn-outline-secondary',
        onClick: () => {
          setSearchText('');
          onSearch({});
        }
      }, 'Clear')
    ]);
  };
  
  // ============================================================================
  // BREADCRUMB COMPONENT
  // ============================================================================
  
  pb.components.Breadcrumb = function({ currentList, view }) {
    const { createElement: e } = React;
    
    if (!currentList) return null;
    
    return e('nav', { 'aria-label': 'breadcrumb' },
      e('ol', { className: 'breadcrumb mb-0' }, [
        e('li', { key: 'home', className: 'breadcrumb-item' },
          e('a', { 
            href: '#',
            onClick: (ev) => {
              ev.preventDefault();
              window.location.href = window.location.pathname;
            }
          }, 'Home')
        ),
        currentList.params?.doctype && e('li', { 
          key: 'doctype',
          className: 'breadcrumb-item' + (view === 'list' ? ' active' : '')
        },
          view === 'list' 
            ? currentList.params.doctype
            : e('a', {
                href: '#',
                onClick: (ev) => {
                  ev.preventDefault();
                  pb.nav.list(currentList.params.doctype);
                }
              }, currentList.params.doctype)
        ),
        view === 'form' && currentList.data && currentList.data[0] && e('li', { 
          key: 'item',
          className: 'breadcrumb-item active'
        }, currentList.data[0].name)
      ])
    );
  };
  
  // ============================================================================
  // ENHANCED MAIN GRID WITH SIMPLE SEARCH
  // ============================================================================
  
  pb.components.MainGrid = function({ doctype }) {
    const { createElement: e, useState, useEffect } = React;
    const [currentList, setCurrentList] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      const unsubscribe = pb.navigation.subscribe((list, loading) => {
        setCurrentList(list);
        setIsLoading(loading);
      });
      return unsubscribe;
    }, []);

    useEffect(() => {
      const current = pb.navigation.getCurrent();
      if (!current || current.params?.doctype !== doctype) {
        pb.nav.list(doctype);
      }
    }, [doctype]);

    const handleSearch = (where) => {
      pb.nav.filter(doctype, where);
    };

    if (isLoading) {
      return e('div', { className: 'p-4' }, 'Loading...');
    }

    if (!currentList) {
      return e('div', { className: 'p-4' }, 'No data');
    }

    const { data, schema } = currentList;

    if (!schema) {
      return e('div', { className: 'p-4 text-danger' }, 'Schema not found');
    }

    if (!data || data.length === 0) {
      return e('div', {}, [
        e(pb.components.SimpleSearch, {
          key: 'search',
          doctype,
          onSearch: handleSearch
        }),
        e('div', { key: 'empty', className: 'alert alert-info' },
          `No ${doctype} records found`
        )
      ]);
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
          
          const schemaField = schema.fields?.find(f => f.fieldname === key);
          if (schemaField) {
            const rendered = pb.renderField(schemaField, value, row.original);
            return e("span", {
              dangerouslySetInnerHTML: { __html: rendered }
            });
          }
          
          return value;
        }
      }));

    return e('div', {}, [
      e(pb.components.SimpleSearch, {
        key: 'search',
        doctype,
        onSearch: handleSearch
      }),
      e(pb.components.BaseTable, { key: 'table', data, columns })
    ]);
  };
  
  // ============================================================================
  // APP COMPONENT
  // ============================================================================
  
  const App = function() {
    const { createElement: e, useState, useEffect } = React;
    const [currentList, setCurrentList] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('list');
    
    useEffect(() => {
      const unsubscribe = pb.navigation.subscribe((list, loading) => {
        setCurrentList(list);
        setIsLoading(loading);
        
        // Determine view based on data
        if (list && list.data) {
          const isSingleItem = list.data.length === 1 && list.params?.query?.take === 1;
          setView(isSingleItem ? 'form' : 'list');
        }
      });
      
      return unsubscribe;
    }, []);
    
    // Loading
    if (isLoading) {
      return e('div', { className: 'container mt-5 text-center' },
        e('div', { className: 'spinner-border text-primary' }),
        e('p', { className: 'mt-3' }, 'Loading...')
      );
    }
    
    // No data - show home
    if (!currentList) {
      return e('div', { className: 'container mt-5' },
        e('div', { className: 'card' },
          e('div', { className: 'card-body text-center' },
            e('h1', {}, '🚀 PocketBase Framework'),
            e('p', { className: 'mb-4' }, 'Choose a doctype to view'),
            e('div', { className: 'btn-group' }, [
              e('button', {
                key: 'task',
                className: 'btn btn-primary',
                onClick: () => pb.nav.list('Task')
              }, '📋 Tasks'),
              e('button', {
                key: 'user',
                className: 'btn btn-success',
                onClick: () => pb.nav.list('User')
              }, '👤 Users')
            ])
          )
        )
      );
    }
    
    // Main view
    return e('div', { className: 'container-fluid' }, [
      // Header
      e('div', { key: 'header', className: 'navbar navbar-light bg-light mb-4' },
        e('div', { className: 'container-fluid d-flex justify-content-between align-items-center' }, [
          e(pb.components.Breadcrumb, { 
            key: 'crumb',
            currentList, 
            view 
          }),
          e('div', { key: 'nav', className: 'btn-group btn-group-sm' }, [
            e('button', {
              key: 'back',
              className: 'btn btn-outline-secondary',
              onClick: () => pb.nav.back(),
              disabled: !pb.navigation.canGoBack()
            }, '⬅️ Back'),
            e('button', {
              key: 'refresh',
              className: 'btn btn-outline-primary',
              onClick: () => pb.nav.refresh()
            }, '🔄')
          ])
        ])
      ),
      
      // Content
      e('div', { key: 'content' },
        view === 'list' 
          ? e(pb.components.MainGrid, { doctype: currentList.params.doctype })
          : e('div', { className: 'card m-3' },
              e('div', { className: 'card-header' },
                e('h3', {}, currentList.data[0]?.name || 'Item View')
              ),
              e('div', { className: 'card-body' },
                e('pre', { className: 'bg-light p-3' },
                  JSON.stringify(currentList.data[0], null, 2)
                ),
                e('button', {
                  className: 'btn btn-secondary mt-3',
                  onClick: () => pb.nav.list(currentList.params.doctype)
                }, '⬅️ Back to List')
              )
            )
      )
    ]);
  };
  
  // ============================================================================
  // INIT
  // ============================================================================
  
  function initApp() {
    const container = document.getElementById('app');
    if (!container || !window.pb?.navigation) {
      console.error('❌ Missing container or framework');
      return;
    }
    
    console.log('✅ Mounting app');
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(App));
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
  
})();