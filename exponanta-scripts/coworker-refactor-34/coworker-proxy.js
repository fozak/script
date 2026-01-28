/* coworker-proxy.js */



  
/*************************************************
   * 1. VIRTUAL ROW (context without mutation)
   *************************************************/
  function createVirtualRow(row, run) {
    return new Proxy(row, {
      get(target, key) {
        if (key in target) return target[key];

        if (key === "$") {
          return {
            row: () => target,
            run: () => run,
            target: () => run.target,
            schema: () => run.target?.schema,
            input: () => run.input,
            operation: () => run.operation,
            runId: () => run.name,
            doctype: () => target.doctype
          };
        }
      }
    });
  }

  /*************************************************
   * 2. MINI-QUERY (immutable & chainable)
   *************************************************/
  function Query(rows) {
    return {
      rows,

      where(predicateOrObject) {
        const filtered =
          typeof predicateOrObject === "function"
            ? rows.filter(predicateOrObject)
            : rows.filter(r =>
                Object.entries(predicateOrObject)
                  .every(([k, v]) => r[k] === v)
              );
        return Query(filtered);
      },

      first() { return rows[0] || null; },

      one() {
        if (rows.length !== 1) throw new Error(`Expected 1 row, got ${rows.length}`);
        return rows[0];
      },

      byId(id) { return rows.find(r => r.id === id) || null; },

      count() { return rows.length; },

      map(fn) { return rows.map(fn); },

      value() { return rows; },

      schema() { return rows[0]?.$?.schema() || null; },

      fromRun(runId) { return Query(rows.filter(r => r.$.runId() === runId)); },

      /*************************************************
       * ✅ NEW: all() returns array of all rows
       *************************************************/
      all() { return rows.map(r => r); }
    };
  }

  /*************************************************
   * 3. PROXY ENTRY FOR DOCTYPES
   *************************************************/
window.CoworkerState.$ = new Proxy({
  // Static methods
  all() {
    return Query(
      Object.values(CoworkerState.runs)
        .flatMap(r => (r.target?.data || []).map(d => createVirtualRow(d, r)))
    );
  },
  
  runs() {
    return Query(
      Object.values(CoworkerState.runs).map(r => createVirtualRow(r, r))
    );
  }
}, {
  get(target, doctype) {
    // Check if it's a static method first
    if (doctype in target) return target[doctype];
    
    // Otherwise, filter by doctype (current behavior)
    const rows = Object.values(CoworkerState.runs)
      .flatMap(r => {
        return (r.target?.data || [])
          .filter(d => d.doctype === doctype)
          .map(d => createVirtualRow(d, r));
      });
    return Query(rows);
  }
});

  /*************************************************
   * 4. GLOBAL FUNCTION LOOKUP + EXECUTION
   *************************************************/
  async function runAdapterFunction(funcName, input = {}) {
  const adapter = CoworkerState.$.Adapter.all().find(a => a.functions?.[funcName]);
  if (!adapter) throw new Error(`Function "${funcName}" not found`);

  const run_doc = {
    adapter,
    input,
    target: { doctype: null, data: [] },
    target: {}
  };

  const fnStr = adapter.functions[funcName];
  const fn = eval('(' + fnStr + ')');
  return await fn(run_doc);
}





  /* UI */
  const input = document.getElementById("expr");
const preview = document.getElementById("preview");

// Polling function every 200ms
setInterval(() => {
  const expr = input.value;
  if (!expr) return preview.textContent = '';
  
  try {
    // Evaluate in the browser context
    const value = eval(expr);
    preview.textContent = JSON.stringify(value, null, 2);
  } catch(e) {
    preview.textContent = e.message;
  }
}, 200);


/* USAGE 

CoworkerState.$.Adapter.first().$.run()


*/
