// ============================================================================
// pb-navigation.js - State Manager using pb.query()
// ============================================================================

pb.navigation = (function () {
  "use strict";

  const VERSION = "3.0.0"; // Updated for pb.query()

  // ==========================================
  // Private State
  // ==========================================

  let currentList = null;
  let isLoading = false;
  const listeners = new Set();

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
        return { doctype: "", query: {}, options: {} };
      }
      return JSON.parse(atob(compressed));
    } catch (error) {
      console.error("Failed to decode URL params:", error);
      return { doctype: "", query: {}, options: {} };
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
    listeners.forEach((callback) => {
      try {
        callback(currentList, isLoading);
      } catch (error) {
        console.error("Subscriber error:", error);
      }
    });
  }

  // ==========================================
  // Public Functions
  // ==========================================

  async function navigate(params, replaceState = false) {
    const fullParams = validateParams(params);

    console.log("🚀 Navigating to:", fullParams);

    isLoading = true;
    notify();

    try {
      // ✅ Use pb.query() instead of pb.listDocs()
      const result = await pb.query(
        fullParams.doctype,
        fullParams.query,
        fullParams.options
      );

      // Update URL
      const url = `?${paramsToURL(fullParams)}`;
      if (replaceState) {
        window.history.replaceState(fullParams, "", url);
      } else {
        window.history.pushState(fullParams, "", url);
      }

      // Update current list (source of truth)
      currentList = {
        params: fullParams,
        data: result.data || [],
        schema: result.schema || null,
        meta: result.meta || null,
        viewConfig: result.viewConfig || null, // ✅ Add viewConfig
      };

      console.log("✅ Navigation complete:", currentList);

      isLoading = false;
      notify();

      return currentList;
    } catch (error) {
      console.error("❌ Navigation error:", error);
      isLoading = false;
      notify();
      throw error;
    }
  }

  function subscribe(callback) {
    if (typeof callback !== "function") {
      throw new Error("Subscriber must be a function");
    }

    listeners.add(callback);

    // Call immediately with current state
    try {
      callback(currentList, isLoading);
    } catch (error) {
      console.error("Initial subscriber call error:", error);
    }

    // Return unsubscribe function
    return function unsubscribe() {
      listeners.delete(callback);
    };
  }

  function goBack() {
    console.log("⬅️ Going back");
    window.history.back();
  }

  function goForward() {
    console.log("➡️ Going forward");
    window.history.forward();
  }

  async function refresh() {
    if (!currentList) {
      console.warn("Nothing to refresh");
      return null;
    }
    console.log("🔄 Refreshing current view");
    return navigate(currentList.params, true);
  }

  function getCurrent() {
    return currentList;
  }

  function getParams() {
    return currentList?.params || null;
  }

  function canGoBack() {
    return window.history.length > 1;
  }

  function getSubscriberCount() {
    return listeners.size;
  }

  // ==========================================
  // Browser Back/Forward Handler
  // ==========================================

  async function handlePopState(event) {
    console.log("🔙 Browser back/forward detected");

    const params = event.state || urlToParams();
    console.log("📍 Restoring state:", params);

    isLoading = true;
    notify();

    try {
      // ✅ Use pb.query() instead of pb.listDocs()
      const result = await pb.query(
        params.doctype || "",
        params.query || {},
        params.options || {}
      );

      currentList = {
        params,
        data: result.data || [],
        schema: result.schema || null,
        meta: result.meta || null,
        viewConfig: result.viewConfig || null, // ✅ Add viewConfig
      };

      console.log("✅ State restored:", currentList);
    } catch (error) {
      console.error("❌ Error restoring state:", error);
    } finally {
      isLoading = false;
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
    if (params.doctype || Object.keys(params.query).length > 0) {
      console.log("🎬 Initializing navigation from URL:", params);
      await navigate(params, true);
    } else {
      console.log("💡 Navigation ready. No URL params to restore.");
    }
  })();

  // ==========================================
  // Public API
  // ==========================================

  return {
    VERSION,
    navigate,
    subscribe,
    goBack,
    goForward,
    refresh,
    getCurrent,
    getParams,
    canGoBack,
    getSubscriberCount,
  };
})();

// ==========================================
// pb.nav - Convenience Shortcuts
// ==========================================

pb.nav = {
  /**
   * Navigate to home (All doctypes)
   */
  home: () => {
    return pb.navigation.navigate({
      doctype: "All",
      query: {},
      options: { includeSchema: true, includeMeta: true }
    });
  },

  /**
   * Navigate to list view
   */
  list: (doctype, query = {}, options = {}) => {
    return pb.navigation.navigate({
      doctype,
      query,
      options: { includeSchema: true, includeMeta: true, ...options }
    });
  },

  /**
   * Navigate to filtered list
   */
  filter: (doctype, where, options = {}) => {
    return pb.navigation.navigate({
      doctype,
      query: { where },
      options: { includeSchema: true, includeMeta: true, ...options }
    });
  },

  /**
   * Navigate to single item by name
   */
  item: (name, doctype, options = {}) => {
    return pb.navigation.navigate({
      doctype,
      query: { where: { name }, take: 1 },
      options: { includeSchema: true, ...options }
    });
  },

  /**
   * Navigate to item in edit mode
   */
  edit: (name, doctype) => {
    return pb.navigation.navigate({
      doctype,
      query: { where: { name }, take: 1 },
      options: { includeSchema: true, mode: "edit" }
    });
  },

  /**
   * Navigate to item in view mode
   */
  view: (name, doctype) => {
    return pb.navigation.navigate({
      doctype,
      query: { where: { name }, take: 1 },
      options: { includeSchema: true, mode: "view" }
    });
  },

  /**
   * Get current state
   */
  current: () => pb.navigation.getCurrent(),

  /**
   * Navigation controls
   */
  back: () => pb.navigation.goBack(),
  forward: () => pb.navigation.goForward(),
  refresh: () => pb.navigation.refresh(),
};

console.log(`✅ pb.navigation v${pb.navigation.VERSION} loaded`);