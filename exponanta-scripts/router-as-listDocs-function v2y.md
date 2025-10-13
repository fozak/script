// ============================================
// NAVIGATION SYSTEM - Complete Standalone
// Paste this entire file into console to test
// ============================================

(function() {
  'use strict';

  // ============================================
  // useNavigation Hook (as plain function for console)
  // ============================================
  
  window.navigation = {
    currentList: null,
    isLoading: false,
    listeners: new Set(),

    // Subscribe to changes
    subscribe(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    },

    // Notify all listeners
    notify() {
      this.listeners.forEach(callback => callback(this.currentList, this.isLoading));
    },

    // Convert params to URL search params
    paramsToURL(params) {
      const compressed = btoa(JSON.stringify(params));
      return `p=${compressed}`;
    },

    // Convert URL search params back to params
    urlToParams() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const compressed = searchParams.get('p');
        if (!compressed) {
          return { doctype: '', query: {}, options: {} };
        }
        return JSON.parse(atob(compressed));
      } catch (error) {
        console.error('Invalid URL params:', error);
        return { doctype: '', query: {}, options: {} };
      }
    },

    // Main navigate function
    async navigate(params, replaceState = false) {
      // Validate params structure
      if (!params || typeof params !== 'object') {
        console.error('Invalid params. Expected object with { doctype, query, options }');
        return;
      }

      // Ensure all required keys exist
      const fullParams = {
        doctype: params.doctype || '',
        query: params.query || {},
        options: params.options || {}
      };

      console.log('🚀 Navigating to:', fullParams);

      this.isLoading = true;
      this.notify();

      try {
        // Call listDocs with the params
        const result = await pb.listDocs(
          fullParams.doctype,
          fullParams.query,
          fullParams.options
        );

        console.log('✅ Navigation result:', result);

        // Update URL
        const url = `?${this.paramsToURL(fullParams)}`;
        if (replaceState) {
          window.history.replaceState(fullParams, '', url);
        } else {
          window.history.pushState(fullParams, '', url);
        }

        // Update current list
        this.currentList = {
          params: fullParams,
          data: result.data,
          schema: result.schema,
          meta: result.meta
        };

        this.isLoading = false;
        this.notify();

        return this.currentList;
      } catch (error) {
        console.error('❌ Navigation error:', error);
        this.isLoading = false;
        this.notify();
        throw error;
      }
    },

    // Go back
    goBack() {
      console.log('⬅️ Going back');
      window.history.back();
    },

    // Go forward
    goForward() {
      console.log('➡️ Going forward');
      window.history.forward();
    },

    // Refresh current view
    async refresh() {
      if (!this.currentList) {
        console.warn('Nothing to refresh');
        return;
      }
      console.log('🔄 Refreshing current view');
      return this.navigate(this.currentList.params, true);
    },

    // Get current state
    getCurrent() {
      return this.currentList;
    },

    // Check if can go back
    canGoBack() {
      return window.history.length > 1;
    }
  };

  // ============================================
  // Handle browser back/forward buttons
  // ============================================
  
  window.addEventListener('popstate', async (event) => {
    console.log('🔙 Browser back/forward detected');
    
    // Get params from event state or URL
    const params = event.state || window.navigation.urlToParams();
    
    console.log('📍 Restoring state:', params);
    
    window.navigation.isLoading = true;
    window.navigation.notify();

    try {
      const result = await pb.listDocs(
        params.doctype || '',
        params.query || {},
        params.options || {}
      );

      window.navigation.currentList = {
        params,
        data: result.data,
        schema: result.schema,
        meta: result.meta
      };

      window.navigation.isLoading = false;
      window.navigation.notify();

      console.log('✅ State restored:', window.navigation.currentList);
    } catch (error) {
      console.error('❌ Error restoring state:', error);
      window.navigation.isLoading = false;
      window.navigation.notify();
    }
  });

  // ============================================
  // Initialize from URL on load
  // ============================================
  
  (async function init() {
    const params = window.navigation.urlToParams();
    
    // Only navigate if URL has params
    if (params.doctype || Object.keys(params.query).length > 0) {
      console.log('🎬 Initializing from URL:', params);
      await window.navigation.navigate(params, true);
    } else {
      console.log('💡 Navigation system ready. No URL params to restore.');
    }
  })();

  // ============================================
  // Convenience methods for testing
  // ============================================
  
  window.nav = {
    // Quick navigate to list
    list: (doctype) => {
      return window.navigation.navigate({
        doctype,
        query: {},
        options: {}
      });
    },

    // Quick navigate to filtered list
    filter: (doctype, where) => {
      return window.navigation.navigate({
        doctype,
        query: { where },
        options: {}
      });
    },

    // Quick navigate to single item
    item: (name, doctype = '') => {
      return window.navigation.navigate({
        doctype,
        query: { where: { name }, take: 1 },
        options: {}
      });
    },

    // Navigate with edit mode
    edit: (name, doctype = '') => {
      return window.navigation.navigate({
        doctype,
        query: { where: { name }, take: 1 },
        options: { mode: 'edit' }
      });
    },

    // Get current state
    current: () => {
      return window.navigation.getCurrent();
    },

    // Go back
    back: () => {
      window.navigation.goBack();
    },

    // Refresh
    refresh: () => {
      return window.navigation.refresh();
    }
  };

  // ============================================
  // Simple visual indicator (optional)
  // ============================================
  
  window.navigation.subscribe((currentList, isLoading) => {
    console.log('📊 Navigation state updated:', {
      isLoading,
      currentList
    });
  });

  console.log(`
╔════════════════════════════════════════════╗
║  🚀 NAVIGATION SYSTEM LOADED               ║
╠════════════════════════════════════════════╣
║  Usage:                                    ║
║                                            ║
║  Full API:                                 ║
║  await navigation.navigate({               ║
║    doctype: 'User',                        ║
║    query: { where: { ... } },              ║
║    options: {}                             ║
║  })                                        ║
║                                            ║
║  Quick shortcuts:                          ║
║  await nav.list('User')                    ║
║  await nav.filter('User', {enabled: 1})    ║
║  await nav.item('Guest')                   ║
║  await nav.edit('Guest')                   ║
║  nav.back()                                ║
║  nav.refresh()                             ║
║  nav.current()                             ║
║                                            ║
║  Browser back/forward: ✅ Supported        ║
║  URL bookmarking: ✅ Supported             ║
║  State in URL: ✅ Encoded                  ║
╚════════════════════════════════════════════╝
  `);

})();

// ============================================
// TEST COMMANDS (uncomment to run)
// ============================================

/*
// Test 1: Navigate to list
await nav.list('User');

// Test 2: Navigate to filtered list
await nav.filter('User', { enabled: 1 });

// Test 3: Navigate to single item
await nav.item('Guest');

// Test 4: Navigate with edit mode
await nav.edit('Guest');

// Test 5: Go back (browser button also works!)
nav.back();

// Test 6: Check current state
console.log(nav.current());

// Test 7: Refresh current view
await nav.refresh();

// Test 8: Full API navigation
await navigation.navigate({
  doctype: 'User',
  query: { 
    where: { enabled: 1 },
    orderBy: { created: 'desc' },
    take: 10
  },
  options: { view: 'card' }
});

// Test 9: Check URL (should be encoded)
console.log(window.location.href);

// Test 10: Subscribe to changes
const unsubscribe = navigation.subscribe((currentList, isLoading) => {
  console.log('State changed!', { currentList, isLoading });
});
// Later: unsubscribe();
*/

/*
Pattern B (Observable) is actually the RIGHT choice!
Why?
javascript// pb.listDocs is external
// Therefore navigation should be external too
// React just observes the external system

External Layer:
  pb.listDocs ← Data source
  navigation ← Wrapper with URL/history
  
React Layer:
  useNavigation ← Observer hook
  Components ← UI
This keeps the boundary clean:
javascript// Everything about data fetching lives outside React
pb.listDocs()
navigation.navigate()
navigation.currentList

// React just observes it
useNavigation() {
  const [list, setList] = useState(navigation.currentList);
  useEffect(() => navigation.subscribe(setList), []);
  return { list, navigate: navigation.navigate };
}

The Pattern You Already Have is Correct!
javascript// External (PocketBase + Navigation)
pb.listDocs(doctype, query, options) → data
navigation.navigate(params) → calls listDocs, manages URL, notifies

// Bridge (React observes external)
navigation.subscribe(callback) → notifies React when data changes

// React (UI Layer)
useNavigation() → subscribes and provides navigate function
Components → use navigate, render currentList

What About "React Doesn't Own State" Concern?
That's actually CORRECT architecture for external data sources:
javascript// Examples of external data sources:
WebSocket.onmessage → React doesn't own socket state
Firebase.onSnapshot → React doesn't own Firebase state  
Redux store → React doesn't own Redux state
pb.listDocs → React doesn't own PocketBase state

// Pattern for all:
External system (source of truth)
    ↓
Subscription/Observer (bridge)
    ↓
React state (local copy for rendering)
Your navigation is just another external data source!

Final Architecture:
javascript// ============================================
// Layer 1: PocketBase (Data Source)
// ============================================
pb.listDocs(doctype, query, options) → Promise<{data, schema, meta}>

// ============================================
// Layer 2: Navigation (State + URL Management)
// ============================================
navigation = {
  currentList: null,  // Source of truth
  
  async navigate(params) {
    const result = await pb.listDocs(params.doctype, params.query, params.options);
    this.currentList = { params, ...result };
    window.history.pushState(...);
    this.notify();
  },
  
  subscribe(callback) { ... }
};

// ============================================
// Layer 3: React (UI Observer)
// ============================================
function useNavigation() {
  const [currentList, setCurrentList] = useState(navigation.currentList);
  
  useEffect(() => {
    return navigation.subscribe(setCurrentList);
  }, []);
  
  return {
    currentList,
    navigate: (params) => navigation.navigate(params)
  };
}

// ============================================
// Layer 4: Components (UI)
// ============================================
function MyComponent() {
  const { currentList, navigate } = useNavigation();
  
  return (
    <div onClick={() => navigate({...})}>
      {currentList?.data.map(...)}
    </div>
  );
}

The Answer:
Since pb.listDocs is always external, your subscribe pattern is the RIGHT architecture:
✅ Keeps navigation external (where pb.listDocs lives)
✅ React observes via subscribe (clean bridge)
✅ Works in console (can test without React)
✅ Single source of truth (navigation.currentList)
✅ Framework agnostic (can swap React for Vue)
The onClick "going outside React" is not a bug, it's the correct design!
React is just the UI layer observing an external data system. This is the same pattern used by Redux, Firebase, WebSockets, and every other external state management system.
Your architecture is correct! 