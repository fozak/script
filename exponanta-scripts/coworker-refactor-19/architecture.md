Got it — you want this fully refactored to use a universal singleton State and coworker.run() for all operations (nonDialog/dialog), no pb.query(), with navigation just being a type of run(), and all updates emitted to console instead of UI. Here's the refactor:
// ============================================================================
// universal-navigation.js - Single State + coworker.run orchestration
// ============================================================================

const UniversalNav = (function () {
  "use strict";

  const VERSION = "1.0.0";

  // ==========================================
  // Singleton State
  // ==========================================
  const state = {
    currentRun: null,      // main user-initiated run
    currentData: null,     // result of main run
    currentParams: null,   // params of main run
    pendingRuns: [],       // background/dialog runs
    listeners: new Set(),  // observers
    isLoading: false
  };

  // ==========================================
  // Private Helpers
  // ==========================================
  function notify() {
    state.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error("Listener error:", err);
      }
    });
    console.log("📢 State updated:", state);
  }

  function validateParams(params) {
    if (!params || typeof params !== "object") {
      throw new Error("Invalid params. Expected object");
    }
    return { operation: params.operation || "", payload: params.payload || {} };
  }

  // ==========================================
  // Run orchestration
  // ==========================================
  async function run(runType, params) {
    const { operation, payload } = validateParams(params);

    const runObj = {
      operation,
      payload,
      status: "running",
      updatedAt: Date.now()
    };

    if (runType === "nonDialog (like select, create, update)") {
      state.currentRun = runObj;
      state.currentParams = payload;
      state.isLoading = true;
      notify();

      try {
        const result = await coworker.run({ operation, ...payload });
        state.currentData = result;
        runObj.status = "success";
      } catch (err) {
        runObj.status = "error";
        runObj.error = err;
      } finally {
        state.isLoading = false;
        runObj.updatedAt = Date.now();
        notify();
        return state.currentData;
      }
    } else if (runType === "dialog") {
      state.pendingRuns.push(runObj);
      notify();

      try {
        const result = await coworker.run({ operation, ...payload });
        runObj.status = "success";
        runObj.result = result;
      } catch (err) {
        runObj.status = "error";
        runObj.error = err;
      } finally {
        runObj.updatedAt = Date.now();
        notify();
      }
    } else {
      throw new Error("Unknown runType: " + runType);
    }
  }

  // ==========================================
  // Public API
  // ==========================================
  return {
    VERSION,

    run,  // universal run

    navigate: (params) => run("nonDialog", { operation: "navigate", payload: params }),
    openDialog: (params) => run("dialog", { operation: "dialog", payload: params }),

    subscribe(callback) {
      if (typeof callback !== "function") throw new Error("Callback must be a function");
      state.listeners.add(callback);
      callback(state); // initial emit
      return () => state.listeners.delete(callback);
    },

    getState: () => state
  };
})();

// ==========================================
// Example usage
// ==========================================
const nav = {
  home: () => UniversalNav.navigate({ page: "home" }),
  list: (name) => UniversalNav.navigate({ page: "list", name }),
  showDialog: (msg) => UniversalNav.openDialog({ message: msg })
};

console.log(`✅ UniversalNav v${UniversalNav.VERSION} loaded`);


🔹 Notes


All runs go through coworker.run().


Two run types: nonDialog → main UI (updates currentRun/currentData/currentParams), dialog → added to pendingRuns.


All listeners observe the same singleton state, no separation between UIs.


navigate() is just a helper for nonDialog runs.


Console emits instead of any UI.



If you want, I can also refactor the shortcut helpers (home, list, item, edit, view) fully into this pattern so pb.nav is replaced with pure coworker-run-based navigation.
Do you want me to do that next?