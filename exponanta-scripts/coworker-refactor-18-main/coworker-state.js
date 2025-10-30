// ============================================================================
// COWORKER-STATE.JS - State Manager + Navigation
// Replaces pb-navigator.js
// Version: 1.0.0
// ============================================================================

(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    const globalScope = typeof self !== 'undefined' ? self :
                       typeof window !== 'undefined' ? window :
                       typeof global !== 'undefined' ? global :
                       globalThis;
    globalScope.CoworkerState = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const VERSION = '1.0.0';

  // ==========================================================================
  // PRIVATE STATE
  // ==========================================================================

  const state = {
    currentRun: null,      // Current main UI run
    pendingRuns: [],       // Background/dialog runs
    isLoading: false,
    listeners: new Set()
  };

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  function paramsToURL(params) {
    try {
      const compressed = btoa(JSON.stringify(params));
      return `p=${compressed}`;
    } catch (error) {
      console.error('Failed to encode params:', error);
      return '';
    }
  }

  function urlToParams() {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const compressed = searchParams.get('p');
      if (!compressed) return null;
      return JSON.parse(atob(compressed));
    } catch (error) {
      console.error('Failed to decode URL params:', error);
      return null;
    }
  }

  function validateParams(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('Invalid params. Expected: { doctype, query, options }');
    }
    return {
      doctype: params.doctype || '',
      query: params.query || {},
      options: params.options || {}
    };
  }

  function notify() {
    const snapshot = {
      currentRun: state.currentRun,
      pendingRuns: [...state.pendingRuns],
      isLoading: state.isLoading
    };

    state.listeners.forEach((callback) => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    });
  }

  // ==========================================================================
  // PUBLIC API: NAVIGATION
  // ==========================================================================

  async function navigate(params, replaceState = false) {
    const fullParams = validateParams(params);

    console.log('🚀 Navigating to:', fullParams);

    state.isLoading = true;
    notify();

    try {
      // Execute via coworker.run()
      const result = await coworker.run({
        operation: 'select',
        doctype: fullParams.doctype,
        input: fullParams.query,
        options: fullParams.options
      });

      // Update URL
      const url = `?${paramsToURL(fullParams)}`;
      if (replaceState) {
        window.history.replaceState(fullParams, '', url);
      } else {
        window.history.pushState(fullParams, '', url);
      }

      // Update state
      state.currentRun = {
        params: fullParams,
        data: result.output?.data || [],
        schema: result.output?.schema || null,
        meta: result.output?.meta || null,
        viewConfig: result.output?.viewConfig || null,
        runContext: result // Full run context
      };

      console.log('✅ Navigation complete:', state.currentRun);

      state.isLoading = false;
      notify();

      return state.currentRun;
    } catch (error) {
      console.error('❌ Navigation error:', error);
      state.isLoading = false;
      notify();
      throw error;
    }
  }

  function goBack() {
    console.log('⬅️ Going back');
    window.history.back();
  }

  function goForward() {
    console.log('➡️ Going forward');
    window.history.forward();
  }

  async function refresh() {
    if (!state.currentRun) {
      console.warn('Nothing to refresh');
      return null;
    }
    console.log('🔄 Refreshing current view');
    return navigate(state.currentRun.params, true);
  }

  function getCurrent() {
    return state.currentRun;
  }

  function getParams() {
    return state.currentRun?.params || null;
  }

  function canGoBack() {
    return window.history.length > 1;
  }

  // ==========================================================================
  // PUBLIC API: STATE OBSERVATION
  // ==========================================================================

  function subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Subscriber must be a function');
    }

    state.listeners.add(callback);

    // Call immediately with current state
    try {
      const snapshot = {
        currentRun: state.currentRun,
        pendingRuns: [...state.pendingRuns],
        isLoading: state.isLoading
      };
      callback(snapshot);
    } catch (error) {
      console.error('Initial subscriber call error:', error);
    }

    // Return unsubscribe function
    return function unsubscribe() {
      state.listeners.delete(callback);
    };
  }

  function getSubscriberCount() {
    return state.listeners.size;
  }

  function getState() {
    return {
      currentRun: state.currentRun,
      pendingRuns: [...state.pendingRuns],
      isLoading: state.isLoading
    };
  }

  // ==========================================================================
  // INTERNAL: UPDATE FROM RUN EVENTS
  // ==========================================================================

// ==========================================================================
// INTERNAL: UPDATE FROM RUN EVENTS
// ==========================================================================

// ==========================================================================
// INTERNAL: UPDATE FROM RUN EVENTS
// ==========================================================================

function updateFromRun(context) {
  // Check if this run already exists in pending
  const existingIndex = state.pendingRuns.findIndex(r => r.id === context.id);

  if (existingIndex !== -1) {
    // Update existing run
    state.pendingRuns[existingIndex] = context;
  } else {
    // Add new run only if it's a dialog/background operation and not completed
    const isDialog = context.operation === 'dialog';
    const isRunning = context.status === 'running' || context.status === 'pending';
    
    if (isDialog && isRunning) {
      state.pendingRuns.push(context);
    }
  }

  // Clean completed/failed runs
  state.pendingRuns = state.pendingRuns.filter(
    r => r.status !== 'completed' && r.status !== 'failed'
  );

  // Update loading state
  state.isLoading = state.pendingRuns.some(r => r.status === 'running');

  notify();
}

  // ==========================================================================
  // BROWSER BACK/FORWARD HANDLER
  // ==========================================================================

  async function handlePopState(event) {
    console.log('🔙 Browser back/forward detected');

    const params = event.state || urlToParams();
    
    if (!params || !params.doctype) {
      console.log('No params to restore');
      return;
    }

    console.log('📍 Restoring state:', params);

    state.isLoading = true;
    notify();

    try {
      const result = await coworker.run({
        operation: 'select',
        doctype: params.doctype,
        input: params.query || {},
        options: params.options || {}
      });

      state.currentRun = {
        params,
        data: result.output?.data || [],
        schema: result.output?.schema || null,
        meta: result.output?.meta || null,
        viewConfig: result.output?.viewConfig || null,
        runContext: result
      };

      console.log('✅ State restored:', state.currentRun);
    } catch (error) {
      console.error('❌ Error restoring state:', error);
    } finally {
      state.isLoading = false;
      notify();
    }
  }

  // Install popstate listener
  window.addEventListener('popstate', handlePopState);

  // ==========================================================================
  // AUTO-INITIALIZE FROM URL
  // ==========================================================================

  (async function init() {
    const params = urlToParams();

    if (params && (params.doctype || Object.keys(params.query || {}).length > 0)) {
      console.log('🎬 Initializing from URL:', params);
      await navigate(params, true);
    } else {
      console.log('💡 CoworkerState ready. No URL params to restore.');
    }
  })();

  // ==========================================================================
  // AUTO-UPDATE ON COWORKER EVENTS
  // ==========================================================================

  if (typeof coworker !== 'undefined') {
    coworker.on('coworker:after:run', (context) => {
      // Only update for non-select operations (select is handled by navigate())
      if (context.operation !== 'select') {
        updateFromRun(context);
      }
    });
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  const CoworkerState = {
    VERSION,
    
    // Navigation
    navigate,
    goBack,
    goForward,
    refresh,
    canGoBack,
    
    // State access
    getCurrent,
    getParams,
    getState,
    
    // Observation
    subscribe,
    getSubscriberCount,
    
    // Internal (for plugins)
    _updateFromRun: updateFromRun,
    _state: state
  };

  return CoworkerState;

}));

// ============================================================================
// CONVENIENCE SHORTCUTS (nav.*)
// ============================================================================

const nav = {
  home: () => CoworkerState.navigate({
    doctype: 'All',
    query: {},
    options: { includeSchema: true, includeMeta: true }
  }),

  list: (doctype, query = {}, options = {}) => CoworkerState.navigate({
    doctype,
    query,
    options: { includeSchema: true, includeMeta: true, ...options }
  }),

  filter: (doctype, where, options = {}) => CoworkerState.navigate({
    doctype,
    query: { where },
    options: { includeSchema: true, includeMeta: true, ...options }
  }),

  item: (name, doctype, options = {}) => CoworkerState.navigate({
    doctype,
    query: { where: { name }, take: 1 },
    options: { includeSchema: true, ...options }
  }),

  edit: (name, doctype) => CoworkerState.navigate({
    doctype,
    query: { where: { name }, take: 1 },
    options: { includeSchema: true, mode: 'edit' }
  }),

  view: (name, doctype) => CoworkerState.navigate({
    doctype,
    query: { where: { name }, take: 1 },
    options: { includeSchema: true, mode: 'view' }
  }),

  current: () => CoworkerState.getCurrent(),
  back: () => CoworkerState.goBack(),
  forward: () => CoworkerState.goForward(),
  refresh: () => CoworkerState.refresh()
};

// Expose globally
if (typeof window !== 'undefined') {
  window.CoworkerState = CoworkerState;
  window.nav = nav;
}

console.log(`✅ CoworkerState v${VERSION} loaded`);
console.log('   • CoworkerState.navigate(params)');
console.log('   • CoworkerState.subscribe(callback)');
console.log('   • nav.list(), nav.item(), nav.back(), nav.refresh()');