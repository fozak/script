

// ═══════════════════════════════════════════════════════════
// NORMALIZED run_doc (zero duplication)
// ═══════════════════════════════════════════════════════════

run_doc = {
  // Identity
  doctype: "Run",
  name: "run-xxx",
  
  // Operation
  operation: "update",
  
  // Query
  query: { where: {...} },

  //Delta data only
  input: { status: "Done" },
  
  //Config 
  config: {},


  // Pipeline Data (ONLY doctypes here) and mutated data is here
  source: {
    doctype: "Task",     // ✅ initialized early
    data: [...],         // ✅ populated after fetch
    schema: {...},       // ✅ populated by _fetchSchemas
    meta: { fetched: 1 } // ✅ populated after fetch
  },
  

  //final result of the run() execution
  target: {
    doctype: "ToDo",      // ✅ initialized early
    data: [...],          // ✅ populated after execution
    schema: {...},        // ✅ populated by _fetchSchemas
    meta: { updated: 1 }  // ✅ populated after execution
  },
  
  // State
  status, success, error, duration,
  
  // Options
  options: {
    adapter: "HttpFetch",   //reference to specific 
  },

   //View = UI=dataview
   view: "form",

}