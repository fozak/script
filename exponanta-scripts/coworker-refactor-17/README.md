refactoring ONLY UPDATE


https://chatgpt.com/c/68f05d4e-67b8-8328-97c2-37b8e97121eb

Current (Overcomplicated)
javascript// Adapter returns
{ items: [{ data: {...} }, { data: {...} }], meta: {...} }
  ↓
// pb._handleRead unwraps
items.map(item => item.data)
  ↓
// pb.query returns
{ data: [...], meta: {...} }
Why add { data: ... } wrapper just to unwrap it immediately? Wasteful!
Simplified (Better)
javascript// Adapter returns DIRECTLY
{ data: [{ doctype: 'User', ... }, { doctype: 'User', ... }], meta: {...} }
  ↓
// pb._handleRead just passes through
return { data, schema, meta, viewConfig }
  ↓
// pb.query returns
{ data: [...], schema: {...}, meta: {...}, viewConfig: {...} }


pb.query() ← Universal data operations (read/create/update/delete)
    ↓
pb.navigation ← State manager with subscribe/notify
    ↓
pb.nav.* ← High-level navigation shortcuts
    ↓
React Components ← Subscribe and render





//Updated Navigation with pb.query()

  // ============================================================================
  // OLDER VERSION : navigate() - Universal data operation with state management
  // ============================================================================
  




pb.navigation = (function() {
  let currentList = null;
  let isLoading = false;
  const listeners = new Set();

  function notify() {
    listeners.forEach(callback => {
      try {
        callback(currentList, isLoading);
      } catch (error) {
        console.error("Listener error:", error);
      }
    });
  }

  async function navigate(params, replaceState = false) {
    const fullParams = validateParams(params);

    console.log("🚀 Navigating:", fullParams);

    isLoading = true;
    notify();

    try {
      // ✅ Use pb.query() for ALL operations (read/create/update/delete)
      const result = await pb.query(
        fullParams.doctype,
        fullParams.query,
        fullParams.options
      );

      // Determine if this was a mutation or read
      const isMutation = fullParams.query.data || fullParams.query.where && !fullParams.query.orderBy;
      
      // Update URL only for read operations
      if (!isMutation) {
        const url = `?${paramsToURL(fullParams)}`;
        if (replaceState) {
          window.history.replaceState(fullParams, "", url);
        } else {
          window.history.pushState(fullParams, "", url);
        }
      }

      // Update current list (source of truth)
      currentList = {
        params: fullParams,
        data: result.data || [],
        schema: result.schema || null,
        meta: result.meta || null,
        permissions: result.permissions || null,
        editConfig: result.editConfig || null
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

  // ============================================================================
  // MUTATIONS: Wrapped navigate() calls
  // ============================================================================

  async function createDoc(doctype, data) {
    console.log("➕ Creating:", doctype, data);
    
    const result = await navigate({
      doctype,
      query: { data },
      options: { includeSchema: true }
    }, true); // replaceState
    
    // After create, refresh the list view
    if (currentList && currentList.params.doctype === doctype) {
      return refresh();
    }
    
    return result;
  }

  async function updateDoc(doctype, where, data) {
    console.log("📝 Updating:", doctype, where, data);
    
    await navigate({
      doctype,
      query: { where, data },
      options: { includeSchema: true }
    }, true); // replaceState
    
    // After update, refresh the list view
    return refresh();
  }

  async function updateDocs(doctype, where, data) {
    // Same as updateDoc (handles bulk internally)
    return updateDoc(doctype, where, data);
  }

  async function deleteDoc(doctype, where) {
    console.log("🗑️ Deleting:", doctype, where);
    
    await navigate({
      doctype,
      query: { where },
      options: {}
    }, true); // replaceState
    
    // After delete, refresh the list view
    return refresh();
  }

  async function deleteDocs(doctype, where) {
    // Same as deleteDoc (handles bulk internally)
    return deleteDoc(doctype, where);
  }

  // ============================================================================
  // SUBSCRIPTION: React to state changes
  // ============================================================================

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

  // ============================================================================
  // NAVIGATION HELPERS
  // ============================================================================

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

  // ============================================================================
  // VALIDATION
  // ============================================================================

  function validateParams(params) {
    if (!params.doctype) {
      throw new Error("doctype is required");
    }
    return {
      doctype: params.doctype,
      query: params.query || {},
      options: params.options || {}
    };
  }

  function paramsToURL(params) {
    const searchParams = new URLSearchParams();
    searchParams.set('doctype', params.doctype);
    if (params.query) {
      searchParams.set('query', JSON.stringify(params.query));
    }
    return searchParams.toString();
  }

  // ============================================================================
  // BROWSER HISTORY: Listen to back/forward
  // ============================================================================

  window.addEventListener('popstate', (event) => {
    if (event.state) {
      console.log("⏮️ History popstate:", event.state);
      navigate(event.state, true);
    }
  });

  // ============================================================================
  // RETURN PUBLIC API
  // ============================================================================

  return {
    navigate,
    createDoc,
    updateDoc,
    updateDocs,
    deleteDoc,
    deleteDocs,
    subscribe,
    goBack,
    goForward,
    refresh,
    getCurrent,
    getParams,
    canGoBack,
    getSubscriberCount
  };
})();

// ============================================================================
// HIGH-LEVEL SHORTCUTS: pb.nav.*
// ============================================================================

pb.nav = {
  // Navigate to list view
  list(doctype, query = {}) {
    return pb.navigation.navigate({
      doctype,
      query,
      options: { includeSchema: true, includeMeta: true }
    });
  },

  // Navigate to single item view
  item(name, doctype) {
    return pb.navigation.navigate({
      doctype,
      query: { where: { name } },
      options: { includeSchema: true }
    });
  },

  // Create and refresh
  create(doctype, data) {
    return pb.navigation.createDoc(doctype, data);
  },

  // Update and refresh
  update(doctype, where, data) {
    return pb.navigation.updateDoc(doctype, where, data);
  },

  // Delete and refresh
  delete(doctype, where) {
    return pb.navigation.deleteDoc(doctype, where);
  },

  // Refresh current view
  refresh() {
    return pb.navigation.refresh();
  },

  // Browser navigation
  back() {
    return pb.navigation.goBack();
  },

  forward() {
    return pb.navigation.goForward();
  }
};

console.log("✅ pb-navigation.js loaded");