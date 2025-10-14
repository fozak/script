// app.js - Application Entry Point
// Testing the complete pb framework

(function() {
  'use strict';
  
  console.log('🚀 Initializing application...');
  
  // ============================================================================
  // APP COMPONENT - Main Router
  // ============================================================================
  
  const App = function() {
    const { createElement: e, useState, useEffect } = React;
    const [currentList, setCurrentList] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('list'); // 'list' or 'form'
    
    // Subscribe to navigation changes
    useEffect(() => {
      console.log('📡 App subscribing to navigation...');
      
      const unsubscribe = pb.navigation.subscribe((list, loading) => {
        console.log('📬 Navigation update:', { list, loading });
        setCurrentList(list);
        setIsLoading(loading);
        
        // Determine view type based on data
        if (list && list.data) {
          const isSingleItem = list.data.length === 1 && list.params.query?.take === 1;
          setView(isSingleItem ? 'form' : 'list');
        }
      });
      
      return unsubscribe;
    }, []);
    
    // Render loading state
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
    
    // Render initial/empty state
    if (!currentList) {
      return e('div', { className: 'container mt-5' },
        e('div', { className: 'card' },
          e('div', { className: 'card-body text-center' },
            e('h1', { className: 'card-title' }, '🚀 PocketBase Framework'),
            e('p', { className: 'card-text mb-4' }, 
              'Test your pb.navigation + components framework'
            ),
            e('div', { className: 'btn-group', role: 'group' },
              e('button', {
                className: 'btn btn-primary',
                onClick: () => pb.nav.list('Task')
              }, '📋 View Tasks'),
              e('button', {
                className: 'btn btn-success',
                onClick: () => pb.nav.list('User')
              }, '👤 View Users'),
              e('button', {
                className: 'btn btn-info',
                onClick: () => pb.nav.list('Customer')
              }, '🏢 View Customers')
            )
          )
        )
      );
    }
    
    // Render main content based on view type
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
                  window.location.href = '/';
                }
              }, 'Home')
            ),
            currentList.params.doctype && e('li', { 
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
            view === 'form' && currentList.data[0] && e('li', { 
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
              className: 'btn btn-outline-secondary',
              onClick: () => pb.nav.forward()
            }, '➡️ Forward'),
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
                      className: 'btn btn-primary',
                      onClick: () => pb.nav.edit(
                        currentList.data[0].name,
                        currentList.params.doctype
                      )
                    }, '✏️ Edit'),
                    e('button', {
                      className: 'btn btn-secondary ms-2',
                      onClick: () => pb.nav.list(currentList.params.doctype)
                    }, '⬅️ Back to List')
                  )
                )
              )
        )
      ),
      
      // Debug panel (collapsible)
      e('div', { className: 'position-fixed bottom-0 end-0 m-3' },
        e('div', { className: 'card', style: { width: '300px' } },
          e('div', { 
            className: 'card-header bg-dark text-white',
            style: { cursor: 'pointer' },
            'data-bs-toggle': 'collapse',
            'data-bs-target': '#debugPanel'
          }, '🐛 Debug Info'),
          e('div', { 
            id: 'debugPanel',
            className: 'collapse card-body p-2',
            style: { fontSize: '0.75rem' }
          },
            e('div', null,
              e('strong', null, 'View: '), view
            ),
            e('div', null,
              e('strong', null, 'Doctype: '), currentList?.params.doctype || 'N/A'
            ),
            e('div', null,
              e('strong', null, 'Records: '), currentList?.data.length || 0
            ),
            e('div', null,
              e('strong', null, 'Loading: '), isLoading ? 'Yes' : 'No'
            ),
            e('div', null,
              e('strong', null, 'Subscribers: '), pb.navigation.getSubscriberCount()
            ),
            e('div', { className: 'mt-2' },
              e('small', { className: 'text-muted' }, 
                'URL: ' + window.location.search.substring(0, 30) + '...'
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
    
    // Verify framework is loaded
    if (!window.pb) {
      console.error('❌ pb framework not loaded');
      return;
    }
    
    if (!window.pb.navigation) {
      console.error('❌ pb.navigation not loaded');
      return;
    }
    
    if (!window.pb.components) {
      console.error('❌ pb.components not loaded');
      return;
    }
    
    console.log('✅ Framework loaded:', {
      version: pb.navigation.VERSION,
      components: Object.keys(pb.components),
      renderers: Object.keys(pb.fieldRenderers || {})
    });
    
    // Mount React app
    console.log('🎨 Mounting React app...');
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(App));
    
    console.log('✅ App mounted successfully!');
    
    // Add some helpful console shortcuts
    window.testNav = {
      tasks: () => pb.nav.list('Task'),
      users: () => pb.nav.list('User'),
      customers: () => pb.nav.list('Customer'),
      current: () => console.log(pb.nav.current()),
      back: () => pb.nav.back(),
      refresh: () => pb.nav.refresh()
    };
    
    console.log('💡 Test shortcuts available: window.testNav');
    console.log('   - testNav.tasks()     → Navigate to Tasks');
    console.log('   - testNav.users()     → Navigate to Users');
    console.log('   - testNav.current()   → Show current state');
    console.log('   - testNav.back()      → Go back');
    console.log('   - testNav.refresh()   → Refresh view');
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
  
})();