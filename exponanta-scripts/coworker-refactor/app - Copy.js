// app.js - Application Entry Point

(function() {
  'use strict';
  
  console.log('🚀 Initializing application...');
  
  // ============================================================================
  // SIMPLE SEARCH COMPONENT
  // ============================================================================
  
// ============================================================================
// UNIVERSAL SEARCH - Uses MainGrid + BaseTable pattern
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
      // Search all doctypes in parallel
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
      
      // Set as if it came from listDocs - same structure!
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
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => performSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);
  
  return e('div', { className: 'container-fluid' }, [
    // Search input
    e('div', { key: 'search', className: 'mb-3' },
      e('input', {
        type: 'text',
        className: 'form-control form-control-lg',
        placeholder: '🔍 Search everywhere (min 2 chars)...',
        value: searchText,
        onChange: (ev) => setSearchText(ev.target.value)
      })
    ),
    
    // Loading state
    isSearching && e('div', { key: 'loading', className: 'text-center' }, 
      'Searching...'
    ),
    
    // Results using BaseTable - same as MainGrid!
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
    
    // Empty state
    !isSearching && searchResults && searchResults.data.length === 0 && e('div', {
      key: 'empty',
      className: 'alert alert-info'
    }, 'No results found')
  ]);
};

// ============================================================================
// Update App Component - Add route for universal search
// ============================================================================

const App = function() {
  const { createElement: e, useState, useEffect } = React;
  const [currentList, setCurrentList] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState('list');
  const [showUniversalSearch, setShowUniversalSearch] = useState(false);
  
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
  
  if (isLoading) {
    return e('div', { className: 'container mt-5 text-center' },
      e('div', { className: 'spinner-border text-primary' }),
      e('p', { className: 'mt-3' }, 'Loading...')
    );
  }
  
  if (!currentList && !showUniversalSearch) {
    return e('div', { className: 'container mt-5' },
      e('div', { className: 'card' },
        e('div', { className: 'card-body text-center' },
          e('h1', {}, '🚀 PocketBase Framework'),
          e('p', { className: 'mb-4' }, 'Choose a doctype to view'),
          e('div', { className: 'btn-group mb-3' }, [
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
          ]),
          e('hr', {}),
          e('button', {
            className: 'btn btn-outline-primary btn-lg',
            onClick: () => setShowUniversalSearch(true)
          }, '🔍 Search Everything')
        )
      )
    );
  }
  
  // Show universal search
  if (showUniversalSearch) {
    return e('div', { className: 'container-fluid' }, [
      e('div', { key: 'header', className: 'navbar navbar-light bg-light mb-4' },
        e('div', { className: 'container-fluid' },
          e('button', {
            className: 'btn btn-outline-secondary',
            onClick: () => setShowUniversalSearch(false)
          }, '⬅️ Back')
        )
      ),
      e(pb.components.UniversalSearch, { key: 'search' })
    ]);
  }
  
  // Normal view
  return e('div', { className: 'container-fluid' }, [
    e('div', { key: 'header', className: 'navbar navbar-light bg-light mb-4' },
      e('div', { className: 'container-fluid d-flex justify-content-between align-items-center' }, [
        e(pb.components.Breadcrumb, { 
          key: 'crumb',
          currentList, 
          view 
        }),
        e('button', {
          key: 'search-btn',
          className: 'btn btn-outline-primary',
          onClick: () => setShowUniversalSearch(true)
        }, '🔍 Search All'),
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