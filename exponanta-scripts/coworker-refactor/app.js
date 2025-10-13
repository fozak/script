// app.js - search and braedcrumb v5

// app.js - Complete Application with Universal Search
// app.js - Optimized with Persistent Universal Search

(function() {
  'use strict';
  
  console.log('🚀 Initializing application...');
  
  // ============================================================================
  // UNIVERSAL SEARCH INPUT (Compact, always visible)
  // ============================================================================
  
  pb.components.UniversalSearchInput = function() {
  const { createElement: e, useState, useEffect, useRef } = React;
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [doctypes, setDoctypes] = useState([]);  // ✅ Dynamic
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  
  // ✅ Get unique doctypes from "All" view
  useEffect(() => {
    pb.listDocs("All", {}, { includeSchema: false })
      .then(result => {
        // Extract unique doctypes from the data
        const uniqueDoctypes = [...new Set(
          result.data.map(item => item.doctype).filter(Boolean)
        )].sort();
        
        console.log('✅ Discovered doctypes:', uniqueDoctypes);
        setDoctypes(uniqueDoctypes);
      })
      .catch(err => {
        console.error('Failed to load doctypes:', err);
      });
  }, []);
  
  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Search function
  const performSearch = async (text) => {
    if (text.length < 2 || doctypes.length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    
    setIsSearching(true);
    setShowDropdown(true);
    
    try {
      const searchPromises = doctypes.map(async (doctype) => {
        try {
          const result = await pb.listDocs(doctype, {
            where: { name: { contains: text } },
            take: 5
          });
          return result.data || [];
        } catch (error) {
          return [];
        }
      });
      
      const allResults = await Promise.all(searchPromises);
      setResults(allResults.flat());
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => performSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText, doctypes]);
  
  const handleResultClick = (result) => {
    pb.nav.item(result.name, result.doctype);
    setShowDropdown(false);
    setSearchText('');
  };
  
  return e('div', { 
    ref: searchRef,
    className: 'position-relative',
    style: { minWidth: '300px', maxWidth: '400px' }
  }, [
    e('input', {
      key: 'input',
      type: 'text',
      className: 'form-control form-control-sm',
      placeholder: `🔍 Search ${doctypes.length} types...`,
      value: searchText,
      onChange: (ev) => setSearchText(ev.target.value),
      onFocus: () => searchText.length >= 2 && setShowDropdown(true),
      disabled: doctypes.length === 0
    }),
    
    showDropdown && e('div', {
      key: 'dropdown',
      className: 'position-absolute w-100 mt-1 bg-white border rounded shadow-lg',
      style: { maxHeight: '300px', overflowY: 'auto', zIndex: 1050 }
    }, [
      isSearching && e('div', {
        key: 'loading',
        className: 'p-2 text-center text-muted small'
      }, 'Searching...'),
      
      !isSearching && results.length === 0 && searchText.length >= 2 && e('div', {
        key: 'empty',
        className: 'p-2 text-center text-muted small'
      }, 'No results found'),
      
      !isSearching && results.length > 0 && e('div', { key: 'results' },
        results.map((result, idx) => 
          e('div', {
            key: `${result.doctype}-${result.name}-${idx}`,
            className: 'px-3 py-2 border-bottom',
            style: { cursor: 'pointer' },
            onClick: () => handleResultClick(result),
            onMouseEnter: (ev) => ev.currentTarget.style.backgroundColor = '#f8f9fa',
            onMouseLeave: (ev) => ev.currentTarget.style.backgroundColor = 'white'
          }, [
            e('div', { key: 'name', className: 'fw-bold small' }, result.name),
            e('small', { key: 'meta', className: 'text-muted' }, 
              `${result.doctype}${result.status ? ` • ${result.status}` : ''}`
            )
          ])
        )
      )
    ])
  ]);
};
  
  // ============================================================================
  // MAIN GRID (No search input - uses universal search in header)
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

    if (isLoading) {
      return e('div', { className: 'p-4 text-center' }, 'Loading...');
    }

    if (!currentList) {
      return e('div', { className: 'p-4' }, 'No data');
    }

    const { data, schema } = currentList;

    if (!schema) {
      return e('div', { className: 'p-4 text-danger' }, 'Schema not found');
    }

    if (!data || data.length === 0) {
      return e('div', { className: 'alert alert-info m-3' },
        `No ${doctype} records found. Use search above to find items.`
      );
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

    return e(pb.components.BaseTable, { data, columns });
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
        
        if (list && list.data) {
          const isSingleItem = list.data.length === 1 && list.params?.query?.take === 1;
          setView(isSingleItem ? 'form' : 'list');
        }
      });
      
      return unsubscribe;
    }, []);
    
    // Loading state
    if (isLoading) {
      return e('div', { className: 'container mt-5 text-center' },
        e('div', { className: 'spinner-border text-primary' }),
        e('p', { className: 'mt-3' }, 'Loading...')
      );
    }
    
    // Home state
    if (!currentList) {
      return e('div', { className: 'container-fluid' }, [
        // Header with search
        e('nav', { 
          key: 'header',
          className: 'navbar navbar-light bg-light mb-4'
        },
          e('div', { className: 'container-fluid d-flex justify-content-between align-items-center' }, [
            e('span', { key: 'brand', className: 'navbar-brand' }, '🚀 PocketBase'),
            e(pb.components.UniversalSearchInput, { key: 'search' })
          ])
        ),
        
        // Home content
        e('div', { key: 'content', className: 'container mt-5' },
          e('div', { className: 'card' },
            e('div', { className: 'card-body text-center' },
              e('h1', { className: 'mb-4' }, 'Choose a DocType'),
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
                }, '👤 Users'),
                e('button', {
                  key: 'customer',
                  className: 'btn btn-info',
                  onClick: () => pb.nav.list('Customer')
                }, '🏢 Customers')
              ])
            )
          )
        )
      ]);
    }
    
    // Main view with persistent search in header
    return e('div', { className: 'container-fluid' }, [
      // Header with breadcrumbs and search
      e('nav', { 
        key: 'header',
        className: 'navbar navbar-light bg-light mb-4'
      },
        e('div', { className: 'container-fluid' }, [
          // Breadcrumbs
          e('ol', { key: 'breadcrumb', className: 'breadcrumb mb-0 me-3' }, [
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
          ]),
          
          // Universal search (always visible)
          e('div', { key: 'search', className: 'flex-grow-1 mx-3' },
            e(pb.components.UniversalSearchInput, {})
          ),
          
          // Navigation buttons
          e('div', { key: 'nav', className: 'btn-group btn-group-sm' }, [
            e('button', {
              key: 'back',
              className: 'btn btn-outline-secondary',
              onClick: () => pb.nav.back(),
              disabled: !pb.navigation.canGoBack()
            }, '⬅️'),
            e('button', {
              key: 'refresh',
              className: 'btn btn-outline-primary',
              onClick: () => pb.nav.refresh()
            }, '🔄')
          ])
        ])
      ),
      
      // Content
      e('div', { key: 'content', className: 'row' },
        e('div', { className: 'col' },
          view === 'list' 
            ? e(pb.components.MainGrid, { doctype: currentList.params.doctype })
            : e('div', { className: 'card m-3' },
                e('div', { className: 'card-header' },
                  e('h3', null, currentList.data[0]?.name || 'Item View')
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
    
    window.testNav = {
      tasks: () => pb.nav.list('Task'),
      users: () => pb.nav.list('User'),
      back: () => pb.nav.back()
    };
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
  

})();