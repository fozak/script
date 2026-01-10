// ═══════════════════════════════════════════════════════════
// NORMALIZED run_doc (zero duplication)
// ═══════════════════════════════════════════════════════════

run_doc = {
  // Identity
  doctype: "Run",
  name: "run-xxx",
  
  // Operation
  operation: "update",
  
  // Command
  query: { where: {...} },
  patch: { status: "Done" },
  
  // Pipeline Data (ONLY doctypes here)
  source: {
    doctype: "Task",     // ✅ initialized early
    data: [...],         // ✅ populated after fetch
    schema: {...},       // ✅ populated by _fetchSchemas
    meta: { fetched: 1 } // ✅ populated after fetch
  },
  
  target: {
    doctype: "Task",      // ✅ initialized early
    data: [...],          // ✅ populated after execution
    schema: {...},        // ✅ populated by _fetchSchemas
    meta: { updated: 1 }  // ✅ populated after execution
  },
  
  // State
  status, success, error, duration,
  
  // Options
  options: {...}
}