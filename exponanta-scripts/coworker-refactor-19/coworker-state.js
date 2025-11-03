// ============================================================================
// COWORKER-STATE.JS - State Manager + Navigation
// Version: 2.0.0 - Optimized for streaming
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

  const VERSION = '2.0.0';

  // ==========================================================================
  // PRIVATE STATE
  // ==========================================================================

  const state = {
    currentRun: null,      // Current main UI run (completed data operations)
    activeRuns: {},        // Active runs indexed by ID (pending/running only)
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

  // ==========================================================================
  // HELPER - Group runs by pipeline
  // ==========================================================================

  function groupByPipeline(runs) {
    const pipelines = {};
    
    runs.forEach(run => {
      // Find root run (walk up parentRun chain)
      let root = run;
      const visited = new Set([run.id]); // Prevent infinite loops
      
      while (root.parentRun && state.activeRuns[root.parentRun]) {
        if (visited.has(root.parentRun)) break; // Circular reference protection
        visited.add(root.parentRun);
        root = state.activeRuns[root.parentRun];
      }
      
      // Group by root ID
      if (!pipelines[root.id]) {
        pipelines[root.id] = [];
      }
      pipelines[root.id].push(run);
    });
    
    return pipelines;
  }

  // ==========================================================================
  // NOTIFY - Pre-compute views
  // ==========================================================================

  function notify() {
    const activeRunsArray = Object.values(state.activeRuns);
    
    // Pre-compute common views (computed ONCE per notify)
    const snapshot = {
      // Raw data
      currentRun: state.currentRun,
      activeRuns: state.activeRuns,
      isLoading: state.isLoading,
      
      // Pre-computed views (saves components from filtering)
      activeDialogs: activeRunsArray.filter(r => 
        r.operation === 'dialog' && r.status === 'running'
      ),
      
      activeAI: activeRunsArray.filter(r =>
        r.operation === 'interpret' && r.status === 'running'
      ),
      
      activePipelines: groupByPipeline(activeRunsArray),
      
      // Backward compatibility
      pendingRuns: activeRunsArray
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

  function navigateHome() {
    console.log('🏠 Navigating to home');
    
    // Clear current run
    state.currentRun = null;
    
    // Clear URL
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', window.location.pathname);
    }
    
    // Notify subscribers
    notify();
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
    notify();

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
      activeRuns: state.activeRuns,
      pendingRuns: Object.values(state.activeRuns), // Backward compat
      isLoading: state.isLoading
    };
  }

  // ==========================================================================
  // INTERNAL: UPDATE FROM RUN EVENTS
  // ==========================================================================

  function updateFromRun(context) {
    const { id, status, operation } = context;
    
    // Add/update in activeRuns if pending or running
    if (status === 'pending' || status === 'running') {
      state.activeRuns[id] = context;
    }
    
    // Move to currentRun when completed (data operations only)
    if (status === 'completed') {
      if (['select', 'create', 'update', 'delete'].includes(operation)) {
        state.currentRun = {
          params: context.params || state.currentRun?.params,
          data: context.output?.data || [],
          schema: context.output?.schema || null,
          meta: context.output?.meta || null,
          viewConfig: context.output?.viewConfig || null,
          runContext: context
        };
      }
      
      // Remove from activeRuns (auto-cleanup)
      delete state.activeRuns[id];
    }
    
    // Failed runs also get cleaned up
    if (status === 'failed') {
      delete state.activeRuns[id];
    }
    
    // Update loading state
    // Update loading state (only for blocking operations)
const blockingOps = ['select', 'create', 'update', 'delete'];
state.isLoading = Object.values(state.activeRuns).some(
  r => r.status === 'running' && blockingOps.includes(r.operation)
);

    
    notify();
  }

  // ==========================================================================
  // UPDATE METHODS - For streaming updates
  // ==========================================================================

  function updateRunField(runId, fieldPath, value) {
    const run = state.activeRuns[runId];
    if (!run) {
      console.warn('Run not found:', runId);
      return;
    }
    
    // Handle nested paths
    const keys = fieldPath.split('.');
    let target = run;
    
    // Navigate to parent of target field
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      
      // Handle array indices: 'steps.0' -> steps[0]
      if (!isNaN(key)) {
        target = target[parseInt(key)];
      } else {
        // Create nested object if doesn't exist
        if (!target[key]) {
          target[key] = {};
        }
        target = target[key];
      }
      
      if (!target) {
        console.warn('Invalid path:', fieldPath);
        return;
      }
    }
    
    // Set the final value
    const finalKey = keys[keys.length - 1];
    target[finalKey] = value;
    
    notify();
  }

  function updateRunStep(runId, stepIndex, updates) {
    const run = state.activeRuns[runId];
    if (!run || !run.steps || !run.steps[stepIndex]) {
      console.warn('Run or step not found:', runId, stepIndex);
      return;
    }
    
    // Merge updates into step
    Object.assign(run.steps[stepIndex], updates);
    
    notify();
  }

  function getActiveRun(runId) {
    return state.activeRuns[runId] || null;
  }

  function getActiveRuns() {
    return Object.values(state.activeRuns);
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
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', handlePopState);
  }

  // ==========================================================================
  // AUTO-INITIALIZE FROM URL
  // ==========================================================================

  (async function init() {
    if (typeof window === 'undefined') return;
    
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
    navigateHome,        // NEW: Clear state and return to home
    goBack,
    goForward,
    refresh,
    canGoBack,
    
    // State access
    getCurrent,
    getParams,
    getState,
    getActiveRun,
    getActiveRuns,
    
    // Observation
    subscribe,
    getSubscriberCount,
    
    // Write (for streaming updates)
    updateRunField,
    updateRunStep,
    
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
  home: () => CoworkerState.navigateHome(),

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

console.log(`✅ CoworkerState v${CoworkerState.VERSION} loaded`);
console.log('   • CoworkerState.navigate(params)');
console.log('   • CoworkerState.navigateHome() [NEW]');
console.log('   • CoworkerState.subscribe(callback)');
console.log('   • CoworkerState.updateRunField(id, path, value)');
console.log('   • CoworkerState.updateRunStep(id, index, updates)');
console.log('   • nav.home(), nav.list(), nav.item(), nav.back(), nav.refresh()');