(() => {

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
            output: () => run.output,
            schema: () => run.output?.schema,
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

      first() {
        return rows[0] || null;
      },

      one() {
        if (rows.length !== 1) {
          throw new Error(`Expected 1 row, got ${rows.length}`);
        }
        return rows[0];
      },

      byId(id) {
        return rows.find(r => r.id === id) || null;
      },

      count() {
        return rows.length;
      },

      map(fn) {
        return rows.map(fn);
      },

      value() {
        return rows;
      },

      schema() {
        return rows[0]?.$?.schema() || null;
      },

      fromRun(runId) {
        return Query(rows.filter(r => r.$.runId() === runId));
      }
    };
  }


  /*************************************************
   * 3. $ PROXY (pure read-only facade)
   *************************************************/

  CoworkerState.$ = new Proxy({}, {
    get(_, key) {

      // $.Run("runId")
      if (key === "Run") {
        return (runId) => CoworkerState.runs[runId] || null;
      }

      // $.Customer / $.Invoice / etc
      const rows = [];

      for (const run of Object.values(CoworkerState.runs)) {
        for (const row of run.output?.data || []) {
          if (row.doctype === key) {
            rows.push(createVirtualRow(row, run));
          }
        }
      }

      return Query(rows);
    }
  });

})();

/*Usage 

undefined
CoworkerState.$.Customer.first().customer_name

'Jim Vorough - required field updated from FORM223'
CoworkerState.$.Customer
  .fromRun("runcw2z9q4fpjpi")
  .schema();

null
CoworkerState.$.Customer.first().$.schema()
{_schema_doctype: 'Customer', actions: Array(0), allow_events_in_timeline: 1, allow_import: 1, allow_rename: 1, …}
CoworkerState.$.Customer.first().$.schema()._schema_doctype
'Customer' */