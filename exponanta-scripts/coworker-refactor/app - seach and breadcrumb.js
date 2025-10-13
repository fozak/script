// app.js - search and braedcrumb v5

// app.js - Complete Application with Universal Search

(function() {
  'use strict';
  
  console.log('🚀 Initializing application...');
  
  // ============================================================================
  // UNIVERSAL SEARCH COMPONENT
  // ============================================================================
  
  pb.components.UniversalSearch = function() {
    const { createElement: e, useState, useEffect } = React;
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    
    const doctypes = ['Task', 'User', 'Customer', 'Project'];
    
    const performSearch = async (text) => {
      if (text.length < 2) {
        setSearchResults(null);
        return;
      }
      
      setIsSearching(true);
      
      try {
        const searchPromises = doctypes.map(async (doctype) => {
          try {
            const result = await pb.listDocs(doctype, {
              where: { name: { contains: text } },
              take: 10
            });
            return result.data || [];
          } catch (error) {
            console.warn(`Search failed for ${doctype}:`, error);
            return [];
          }
        });
        
        const allResults = await Promise.all(searchPromises);
        const flatResults = allResults.flat();
        
        setSearchResults({
          data: flatResults,
          schema: {
            fields: [
              { fieldname: 'name', label: 'Name' },
              { fieldname: 'doctype', label: 'Type' }
            ]
          }
        });
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults(null);
      } finally {
        setIsSearching(false);
      }
    };
    
    useEffect(() => {
      const timer = setTimeout(() => performSearch(searchText), 300);
      return () => clearTimeout(timer);
    }, [searchText]);
    
    return e('div', { className: 'container-fluid' }, [
      e('div', { key: 'search', className: 'mb-3' },
        e('input', {
          type: 'text',
          className: 'form-control form-control-lg',
          placeholder: '🔍 Search everywhere (min 2 chars)...',
          value: searchText,
          onChange: (ev) => setSearchText(ev.target.value)
        })
      ),
      
      isSearching && e('div', { key: 'loading', className: 'text-center' }, 
        'Searching...'
      ),
      
      !isSearching && searchResults && searchResults.data.length > 0 && e('div', { key: 'results' }, [
        e('h5', { key: 'title', className: 'mb-3' }, 
          `Found ${searchResults.data.length} results`
        ),
        e(pb.components.BaseTable, {
          key: 'table',
          data: searchResults.data,
          columns: [
            {
              accessorKey: 'name',
              header: 'Name',
              cell: ({ getValue, row }) => {
                const value = getValue();
                return e(pb.components.DocLink, {
                  doctype: row.original.doctype,
                  name: value
                }, value);
              }
            },
            {
              accessorKey: 'doctype',
              header: 'Type'
            }
          ]
        })
      ]),
      
      !isSearching && searchResults && searchResults.data.length === 0 && e('div', {
        key: 'empty',
        className: 'alert alert-info'
      }, 'No results found')
    ]);
  };
  
  // ============================================================================
  // SIMPLE SEARCH COMPONENT (for individual doctype lists)
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
  // MAIN GRID WITH SEARCH
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
    const [showUniversalSearch, setShowUniversalSearch] = useState(false);
    
    useEffect(() => {
      console.log('📡 App subscribing to navigation...');
      
      const unsubscribe = pb.navigation.subscribe((list, loading) => {
        console.log('📬 Navigation update:', { list, loading });
        setCurrentList(list);
        setIsLoading(loading);
        
        // Reset universal search when navigating
        setShowUniversalSearch(false);
        
        // Determine view type based on data
        if (list && list.data) {
          const isSingleItem = list.data.length === 1 && list.params?.query?.take === 1;
          setView(isSingleItem ? 'form' : 'list');
        }
      });
      
      return unsubscribe;
    }, []);
    
    // Loading state
    if (isLoading) {
      return e('div', { className: 'container mt-5' },
        e('div', { className: 'text-center' },
          e('div', { className: 'spinner-border text-primary', role: 'status' },
            e('span', { className: 'visually-hidden' }, 'Loading...')
          ),
          e('p', { className: 'mt-3' }, 'Loading data...')
        )
      );
    }
    
    // Initial/Home state - show universal search option
    if (!currentList && !showUniversalSearch) {
      return e('div', { className: 'container mt-5' },
        e('div', { className: 'card' },
          e('div', { className: 'card-body text-center' },
            e('h1', { className: 'card-title' }, '🚀 PocketBase Framework'),
            e('p', { className: 'card-text mb-4' }, 
              'Test your pb.navigation + components framework'
            ),
            e('button', {
              className: 'btn btn-lg btn-primary mb-4',
              onClick: () => setShowUniversalSearch(true)
            }, '🔍 Search Everything'),
            e('hr', { className: 'mb-4' }),
            e('div', { className: 'btn-group', role: 'group' },
              e('button', {
                className: 'btn btn-outline-primary',
                onClick: () => pb.nav.list('Task')
              }, '📋 View Tasks'),
              e('button', {
                className: 'btn btn-outline-success',
                onClick: () => pb.nav.list('User')
              }, '👤 View Users'),
              e('button', {
                className: 'btn btn-outline-info',
                onClick: () => pb.nav.list('Customer')
              }, '🏢 View Customers')
            )
          )
        )
      );
    }
    
    // Show universal search page
    if (showUniversalSearch) {
      return e('div', { className: 'container-fluid' }, [
        e('nav', { 
          key: 'header',
          className: 'navbar navbar-light bg-light mb-4',
          'aria-label': 'breadcrumb' 
        },
          e('div', { className: 'container-fluid' }, [
            e('ol', { key: 'breadcrumb', className: 'breadcrumb mb-0' },
              e('li', { className: 'breadcrumb-item active' }, 'All')
            ),
            e('button', {
              key: 'close',
              className: 'btn btn-outline-secondary',
              onClick: () => setShowUniversalSearch(false)
            }, '✕ Close Search')
          ])
        ),
        e(pb.components.UniversalSearch, { key: 'search' })
      ]);
    }
    
    // Main content with breadcrumbs
    return e('div', { className: 'container-fluid' },
      // Header/Breadcrumbs
      e('nav', { 
        className: 'navbar navbar-light bg-light mb-4',
        'aria-label': 'breadcrumb' 
      },
        e('div', { className: 'container-fluid' },
          e('ol', { className: 'breadcrumb mb-0' },
            e('li', { className: 'breadcrumb-item' },
              e('a', { 
                href: '#',
                onClick: (ev) => {
                  ev.preventDefault();
                  setShowUniversalSearch(true);
                }
              }, 'All')
            ),
            currentList.params?.doctype && e('li', { 
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
              className: 'breadcrumb-item active'
            }, currentList.data[0].name)
          ),
          
          // Navigation buttons
          e('div', { className: 'btn-group btn-group-sm' },
            e('button', {
              className: 'btn btn-outline-secondary',
              onClick: () => pb.nav.back(),
              disabled: !pb.navigation.canGoBack()
            }, '⬅️ Back'),
            e('button', {
              className: 'btn btn-outline-primary',
              onClick: () => pb.nav.refresh()
            }, '🔄 Refresh')
          )
        )
      ),
      
      // Main content area
      e('div', { className: 'row' },
        e('div', { className: 'col' },
          view === 'list' 
            ? e(pb.components.MainGrid, { 
                doctype: currentList.params.doctype 
              })
            : e('div', { className: 'card' },
                e('div', { className: 'card-header' },
                  e('h3', null, currentList.data[0]?.name || 'Form View')
                ),
                e('div', { className: 'card-body' },
                  e('pre', { className: 'bg-light p-3' },
                    JSON.stringify(currentList.data[0], null, 2)
                  ),
                  e('div', { className: 'mt-3' },
                    e('button', {
                      className: 'btn btn-secondary ms-2',
                      onClick: () => pb.nav.list(currentList.params.doctype)
                    }, '⬅️ Back to List')
                  )
                )
              )
        )
      )
    );
  };
  
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
      components: Object.keys(pb.components),
      renderers: Object.keys(pb.fieldRenderers || {})
    });
    
    console.log('🎨 Mounting React app...');
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(App));
    
    console.log('✅ App mounted successfully!');
    
    window.testNav = {
      tasks: () => pb.nav.list('Task'),
      users: () => pb.nav.list('User'),
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