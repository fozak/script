// ============================================================
// COWORKER STATE - Centralized State Management - now only Main and
// ============================================================

window.CoworkerState = {
  runs: {}, // indexed by run.name
  runsByOpKey: {}, // indexed by operation_key
  current_run: null,

  // Helper to update both indexes
  _updateFromRun: function (run_doc) {
    this.runs[run_doc.name] = run_doc;

    if (run_doc.operation_key) {
      this.runsByOpKey[run_doc.operation_key] = run_doc;
    }

    // Only track navigation runs as "current"
    if (
      run_doc.component?.startsWith("Main") &&
      run_doc.options?.render !== false
    ) {
      this.current_run = run_doc.name;
    }

    window.dispatchEvent(
      new CustomEvent("coworker:state:change", {
        detail: { run: run_doc },
      }),
    );
  },

  getRun: function (run_id) {
    return this.runs[run_id];
  },

  getCurrentRun: function () {
    return this.runs[this.current_run];
  },

  getAllRuns: function () {
    return Object.values(this.runs);
  },

  getRunsByStatus: function (status) {
    return Object.values(this.runs).filter((r) => r.status === status);
  },

  clear: function () {
    this.runs = {};
    this.current_run = null;
  },


// Helper to find run by operation
  findByOperation: function(op) {
    const key = JSON.stringify(op);
    return this.runsByOpKey[key];
  },

  // Helper to remove run (maintain both indexes)
  _removeRun: function(run_name) {
    const run = this.runs[run_name];
    if (run) {
      delete this.runs[run_name];
      if (run.operation_key) {
        delete this.runsByOpKey[run.operation_key];
      }
    }
  }


};


//added 
