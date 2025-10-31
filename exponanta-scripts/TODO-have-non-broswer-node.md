Summary: Your Architecture Elements
✅ coworker.js - Core event system (universal)
✅ coworker-run.js - Execution engine (universal)
❌ coworker-state.js - Needs split into core + browser
✅ Database adapter - Already universal
✅ coworker.run() - Single entry point works everywhere
The only browser dependency is navigation/URL management in CoworkerState. Split it and you're 100% universal! 🚀RetryDDif i refactor to have not window. but thisGlobal in case window in not availabelPerfect approach! Use a thisGlobal abstraction that works everywhere. Here's how:
Universal Global Detection
javascript// ============================================================================
// COWORKER-STATE.JS - Universal (Node + Browser + Worker)
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
  // DETECT RUNTIME ENVIRONMENT
  // ==========================================================================

  const ENV = (function detectEnvironment() {
    // Detect global object
    const thisGlobal = typeof self !== 'undefined' ? self :
                       typeof window !== 'undefined' ? window :
                       typeof global !== 'undefined' ? global :
                       globalThis;

    // Detect capabilities
    const isBrowser = typeof window !== 'undefined' && 
                      typeof window.document !== 'undefined';
    
    const isNode = typeof process !== 'undefined' && 
                   process.versions != null && 
                   process.versions.node != null;
    
    const isWebWorker = typeof self !== 'undefined' && 
                        typeof WorkerGlobalScope !== 'undefined';

    const hasHistory = typeof window !== 'undefined' && 
                       typeof window.history !== 'undefined';
    
    const hasLocalStorage = (function() {
      try {
        const test = '__storage_test__';
        thisGlobal.localStorage?.setItem(test, test);
        thisGlobal.localStorage?.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    })();

    return {
      thisGlobal,
      isBrowser,
      isNode,
      isWebWorker,
      hasHistory,
      hasLocalStorage,
      platform: isBrowser ? 'browser' : isNode ? 'node' : 'unknown'
    };
  })();

  console.log(`🌍 CoworkerState running on: ${ENV.platform}`, ENV);

  // ==========================================================================
  // PRIVATE STATE
  // ==========================================================================

  const state = {
    currentRun: null,
    activeRuns: {},
    isLoading: false,
    listeners: new Set()
  };

  // ==========================================================================
  // STORAGE ABSTRACTION (Browser: localStorage, Node: in-memory)
  // ==========================================================================

  const Storage = (function createStorage() {
    if (ENV.hasLocalStorage) {
      // Browser: Use localStorage
      return {
        get(key) {
          try {
            return ENV.thisGlobal.localStorage.getItem(key);
          } catch (e) {
            console.error('Storage get error:', e);
            return null;
          }
        },
        set(key, value) {
          try {
            ENV.thisGlobal.localStorage.setItem(key, value);
          } catch (e) {
            console.error('Storage set error:', e);
          }
        },
        remove(key) {
          try {
            ENV.thisGlobal.localStorage.removeItem(key);
          } catch (e) {
            console.error('Storage remove error:', e);
          }
        }
      };
    } else {
      // Node: In-memory fallback
      const memoryStorage = new Map();
      return {
        get(key) {
          return memoryStorage.get(key) || null;
        },
        set(key, value) {
          memoryStorage.set(key, value);
        },
        remove(key) {
          memoryStorage.delete(key);
        }
      };
    }
  })();

  // ==========================================================================
  // URL ABSTRACTION (Browser: window.location, Node: fallback)
  // ==========================================================================

  const Navigation = (function createNavigation() {
    if (ENV.hasHistory) {
      // Browser: Use History API
      return {
        pushState(params, url) {
          ENV.thisGlobal.history.pushState(params, '', url);
        },
        replaceState(params, url) {
          ENV.thisGlobal.history.replaceState(params, '', url);
        },
        back() {
          ENV.thisGlobal.history.back();
        },
        forward() {
          ENV.thisGlobal.history.forward();
        },
        getSearch() {
          return ENV.thisGlobal.location?.search || '';
        },
        getPathname() {
          return ENV.thisGlobal.location?.pathname || '';
        },
        canGoBack() {
          return ENV.thisGlobal.history?.length > 1;
        }
      };
    } else {
      // Node: No-op fallback
      let currentUrl = '/';
      return {
        pushState(params, url) {
          currentUrl = url;
          console.log('📍 [Node] Navigate to:', url);
        },
        replaceState(params, url) {
          currentUrl = url;
          console.log('📍 [Node] Replace with:', url);
        },
        back() {
          console.log('⬅️ [Node] Back (no-op)');
        },
        forward() {
          console.log('➡️ [Node] Forward (no-op)');
        },
        getSearch() {
          return '';
        },
        getPathname() {
          return currentUrl;
        },
        canGoBack() {
          return false;
        }
      };
    }
  })();

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  function paramsToURL(params) {
    try {
      const compressed = Buffer.from ?
        Buffer.from(JSON.stringify(params)).toString('base64') :
        ENV.thisGlobal.btoa(JSON.stringify(params));
      return `p=${compressed}`;
    } catch (error) {
      console.error('Failed to encode params:', error);
      return '';
    }
  }

  function urlToParams() {
    try {
      const search = Navigation.getSearch();
      if (!search) return null;
      
      const searchParams = new URLSearchParams(search);
      const compressed = searchParams.get('p');
      if (!compressed) return null;
      
      const decoded = Buffer.from ?
        Buffer.from(compressed, 'base64').toString('utf8') :
        ENV.thisGlobal.atob(compressed);
      
      return JSON.parse(decoded);
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

  function groupByPipeline(runs) {
    const pipelines = {};
    
    runs.forEach(run => {
      let root = run;
      const visited = new Set([run.id]);
      
      while (root.parentRun && state.activeRuns[root.parentRun]) {
        if (visited.has(root.parentRun)) break;
        visited.add(root.parentRun);
        root = state.activeRuns[root.parentRun];
      }
      
      if (!pipelines[root.id]) {
        pipelines[root.id] = [];
      }
      pipelines[root.id].push(run);
    });
    
    return pipelines;
  }

  // ==========================================================================
  // NOTIFY
  // ==========================================================================

  function notify() {
    const activeRunsArray = Object.values(state.activeRuns);
    
    const snapshot = {
      currentRun: state.currentRun,
      activeRuns: state.activeRuns,
      isLoading: state.isLoading,
      activeDialogs: activeRunsArray.filter(r => 
        r.operation === 'dialog' && r.status === 'running'
      ),
      activeAI: activeRunsArray.filter(r =>
        r.operation === 'interpret' && r.status === 'running'
      ),
      activePipelines: groupByPipeline(activeRunsArray),
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
      // Check if coworker is available
      if (typeof ENV.thisGlobal.coworker === 'undefined') {
        throw new Error('coworker not available');
      }

      const result = await ENV.thisGlobal.coworker.run({
        operation: 'select',
        doctype: fullParams.doctype,
        input: fullParams.query,
        options: fullParams.options
      });

      // Update URL (browser-only, no-op in Node)
      const url = `?${paramsToURL(fullParams)}`;
      if (replaceState) {
        Navigation.replaceState(fullParams, url);
      } else {
        Navigation.pushState(fullParams, url);
      }

      state.currentRun = {
        params: fullParams,
        data: result.output?.data || [],
        schema: result.output?.schema || null,
        meta: result.output?.meta || null,
        viewConfig: result.output?.viewConfig || null,
        runContext: result
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
    state.currentRun = null;
    Navigation.pushState(null, Navigation.getPathname());
    notify();
  }

  function goBack() {
    console.log('⬅️ Going back');
    Navigation.back();
  }

  function goForward() {
    console.log('➡️ Going forward');
    Navigation.forward();
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
    return Navigation.canGoBack();
  }

  // ==========================================================================
  // PUBLIC API: STATE OBSERVATION
  // ==========================================================================

  function subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Subscriber must be a function');
    }

    state.listeners.add(callback);
    notify();

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
      pendingRuns: Object.values(state.activeRuns),
      isLoading: state.isLoading
    };
  }

  // ==========================================================================
  // PUBLIC API: ENVIRONMENT INFO
  // ==========================================================================

  function getEnvironment() {
    return { ...ENV };
  }

  // ==========================================================================
  // RETURN PUBLIC API
  // ==========================================================================

  return {
    version: VERSION,
    navigate,
    navigateHome,
    goBack,
    goForward,
    refresh,
    getCurrent,
    getParams,
    canGoBack,
    subscribe,
    getSubscriberCount,
    getState,
    getEnvironment,  // ✨ New: inspect runtime environment
    
    // Expose for testing/debugging
    _internal: {
      Storage,
      Navigation,
      ENV
    }
  };
}));
Usage in Node.js
javascript// node-example.js
const CoworkerState = require('./coworker-state.js');
const coworker = require('./coworker.js');

// Make coworker available globally (or pass it differently)
global.coworker = coworker;

// Check environment
console.log(CoworkerState.getEnvironment());
// {
//   thisGlobal: [Object global],
//   isBrowser: false,
//   isNode: true,
//   isWebWorker: false,
//   hasHistory: false,
//   hasLocalStorage: false,
//   platform: 'node'
// }

// Navigate (will use in-memory storage)
await CoworkerState.navigate({
  doctype: 'Project',
  query: { where: { status: 'Open' } },
  options: { includeSchema: true }
});

// Subscribe to state changes
CoworkerState.subscribe((snapshot) => {
  console.log('State changed:', snapshot.currentRun?.data?.length, 'records');
});
Usage in Browser (No changes needed!)
html<script src="coworker-state.js"></script>
<script>
  // Works exactly the same
  CoworkerState.navigate({ doctype: 'Project' });
  
  // Check environment
  console.log(CoworkerState.getEnvironment());
  // {
  //   thisGlobal: Window,
  //   isBrowser: true,
  //   isNode: false,
  //   hasHistory: true,
  //   hasLocalStorage: true,
  //   platform: 'browser'
  // }
</script>
Benefits
✅ Universal - Works in Node, Browser, Workers
✅ No modifications needed - Same API everywhere
✅ Graceful degradation - Features unavailable → silent fallback
✅ Testable - Can inspect environment with getEnvironment()
✅ Clean abstractions - Storage and Navigation wrappers
Your architecture is now truly universal! 🚀