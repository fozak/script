// ============================================================================
// coworker-state.js - Universal State Manager with Navigation
// ============================================================================

const CoworkerState = (function () {
  "use strict";

  const VERSION = "4.0.0";

  // ==========================================
  // Single Source of Truth (In-Memory State)
  // ==========================================
  const state = {
    currentRun: null,      // Current main UI run
    pendingRuns: [],       // Background/dialog runs
    isLoading: false,
    listeners: new Set()
  };

  // ==========================================
  // Private Helper Functions
  // ==========================================

  function paramsToURL(params) {
    try {
      const compressed = btoa(JSON.stringify(params));
      return `p=${compressed}`;
    } catch (error) {
      console.error("Failed to encode params:", error);
      return "";
    }
  }

  function urlToParams() {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const compressed = searchParams.get("p");
      if (!compressed) {
        return null;
      }
      return JSON.parse(atob(compressed));
    } catch (error) {
      console.error("Failed to decode URL params:", error);
      return null;
    }
  }

  function validateParams(params) {
    if (!params || typeof params !== "object") {
      throw new Error("Invalid params. Expected: { doctype, query, options }");
    }
    return {
      doctype: params.doctype || "",
      query: params.query || {},
      options: params.options || {},
    };
  }

  function notify() {
    state.listeners.forEach((callback) => {
      try {
        callback(state.currentRun, state.isLoading);
      } catch (error) {
        console.error("Subscriber error:", error);
      }
    });
  }

  // ==========================================
  // Core: Navigate (via coworker.run)
  // ==========================================

  async function navigate(params, replaceState = false) {
    const fullParams = validateParams(params);

    console.log("🚀 Navigating to:", fullParams);

    state.isLoading = true;
    notify();

    try {
      // Execute via coworker.run()
      const result = await coworker.run({
        operation: "select",
        doctype: fullParams.doctype,
        input: fullParams.query,
        options: fullParams.options
      });

      // Update URL
      const url = `?${paramsToURL(fullParams)}`;
      if (replaceState) {
        window.history.replaceState(fullParams, "", url);
      } else {
        window.history.pushState(fullParams, "", url);
      }

      // Update state (currentRun = the navigation result)
      state.currentRun = {
        params: fullParams,
        data: result.output?.data || [],
        schema: result.output?.schema || null,
        meta: result.output?.meta || null,
        viewConfig: result.output?.viewConfig || null,
        runContext: result // Full run context for reference
      };

      console.log("✅ Navigation complete:", state.currentRun);

      state.isLoading = false;
      notify();

      return state.currentRun;
    } catch (error) {
      console.error("❌ Navigation error:", error);
      state.isLoading = false;
      notify();
      throw error;
    }
  }

  // ==========================================
  // Update State (called by coworker events for non-navigation runs)
  // ==========================================

  function updateFromRun(runContext) {
    // Is this a dialog/background operation?
    const isDialog = runContext.operation === "dialog";

    if (isDialog) {
      // Add to pending runs
      state.pendingRuns.push(runContext);
    }

    // Clean completed from pending
    state.pendingRuns = state.pendingRuns.filter(
      (r) => r.status !== "completed" && r.status !== "failed"
    );

    // Update loading state
    state.isLoading = state.pendingRuns.some((r) => r.status === "running");

    notify();
  }

  // ==========================================
  // Subscribe to State Changes
  // ==========================================

  function subscribe(callback) {
    if (typeof callback !== "function") {
      throw new Error("Subscriber must be a function");
    }

    state.listeners.add(callback);

    // Call immediately with current state
    try {
      callback(state.currentRun, state.isLoading);
    } catch (error) {
      console.error("Initial subscriber call error:", error);
    }

    // Return unsubscribe function
    return function unsubscribe() {
      state.listeners.delete(callback);
    };
  }

  // ==========================================
  // Navigation Controls
  // ==========================================

  function goBack() {
    console.log("⬅️ Going back");
    window.history.back();
  }

  function goForward() {
    console.log("➡️ Going forward");
    window.history.forward();
  }

  async function refresh() {
    if (!state.currentRun) {
      console.warn("Nothing to refresh");
      return null;
    }
    console.log("🔄 Refreshing current view");
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

  function getSubscriberCount() {
    return state.listeners.size;
  }

  // ==========================================
  // Browser Back/Forward Handler
  // ==========================================

  async function handlePopState(event) {
    console.log("🔙 Browser back/forward detected");

    const params = event.state || urlToParams();
    
    if (!params || !params.doctype) {
      console.log("No params to restore");
      return;
    }

    console.log("📍 Restoring state:", params);

    state.isLoading = true;
    notify();

    try {
      // Execute via coworker.run()
      const result = await coworker.run({
        operation: "select",
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

      console.log("✅ State restored:", state.currentRun);
    } catch (error) {
      console.error("❌ Error restoring state:", error);
    } finally {
      state.isLoading = false;
      notify();
    }
  }

  // Install popstate listener
  window.addEventListener("popstate", handlePopState);

  // ==========================================
  // Auto-Initialize from URL
  // ==========================================

  (async function init() {
    const params = urlToParams();

    // Only navigate if URL has params
    if (params && (params.doctype || Object.keys(params.query || {}).length > 0)) {
      console.log("🎬 Initializing from URL:", params);
      await navigate(params, true);
    } else {
      console.log("💡 CoworkerState ready. No URL params to restore.");
    }
  })();

  // ==========================================
  // Public API
  // ==========================================

  return {
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
    get: () => ({
      currentRun: state.currentRun,
      pendingRuns: [...state.pendingRuns],
      isLoading: state.isLoading
    }),

    // Observation
    subscribe,
    getSubscriberCount,

    // Internal update (called by coworker events)
    _updateFromRun: updateFromRun,

    // Debug
    _state: state
  };
})();

// ==========================================
// Auto-update on coworker.run() completion (for non-navigation runs)
// ==========================================

coworker.on("after:run", (context) => {
  // Only update for non-select operations (select is handled by navigate())
  if (context.operation !== "select") {
    CoworkerState._updateFromRun(context);
  }
});

// ==========================================
// Convenience Shortcuts (pb.nav equivalent)
// ==========================================

const nav = {
  home: () =>
    CoworkerState.navigate({
      doctype: "All",
      query: {},
      options: { includeSchema: true, includeMeta: true },
    }),

  list: (doctype, query = {}, options = {}) =>
    CoworkerState.navigate({
      doctype,
      query,
      options: { includeSchema: true, includeMeta: true, ...options },
    }),

  filter: (doctype, where, options = {}) =>
    CoworkerState.navigate({
      doctype,
      query: { where },
      options: { includeSchema: true, includeMeta: true, ...options },
    }),

  item: (name, doctype, options = {}) =>
    CoworkerState.navigate({
      doctype,
      query: { where: { name }, take: 1 },
      options: { includeSchema: true, ...options },
    }),

  edit: (name, doctype) =>
    CoworkerState.navigate({
      doctype,
      query: { where: { name }, take: 1 },
      options: { includeSchema: true, mode: "edit" },
    }),

  view: (name, doctype) =>
    CoworkerState.navigate({
      doctype,
      query: { where: { name }, take: 1 },
      options: { includeSchema: true, mode: "view" },
    }),

  current: () => CoworkerState.getCurrent(),
  back: () => CoworkerState.goBack(),
  forward: () => CoworkerState.goForward(),
  refresh: () => CoworkerState.refresh(),
};

// Expose globally
window.CoworkerState = CoworkerState;
window.nav = nav;

console.log(`✅ CoworkerState v${VERSION} loaded`);