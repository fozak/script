// ============================================================
// COWORKER STATE - Centralized State Management
// ============================================================

window.CoworkerState = {
  runs: {},
  current_run: null,

  _updateFromRun: function(run_doc) {
    this.runs[run_doc.name] = run_doc;
    this.current_run = run_doc.name;
    
    // Emit state change event
    window.dispatchEvent(new CustomEvent('coworker:state:change', {
      detail: { run: run_doc }
    }));
  },

  getRun: function(run_id) {
    return this.runs[run_id];
  },

  getCurrentRun: function() {
    return this.runs[this.current_run];
  },

  getAllRuns: function() {
    return Object.values(this.runs);
  },

  getRunsByStatus: function(status) {
    return Object.values(this.runs).filter(r => r.status === status);
  },

  clear: function() {
    this.runs = {};
    this.current_run = null;
  }
};