// ============================================================
// globalThis.CW - Centralized State & Runtime. ADDED 
// ============================================================

// refactored 


globalThis.CW = globalThis.CW || {};
const CW = globalThis.CW;


// =========================================

globalThis.CW = {
  runs: {}, // indexed by run.name
  runsByOpKey: {}, // indexed by operation_key
  current_run: null,
  _index: null,

  // ─── Run Management ─────────────────────────────────────
  _updateFromRun: function(run_doc) {
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

    // Invalidate index when runs change
    this._invalidateIndex();

    globalThis.dispatchEvent(
      new CustomEvent("coworker:state:change", {
        detail: { run: run_doc },
      }),
    );
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
    return Object.values(this.runs).filter((r) => r.status === status);
  },

  clear: function() {
    this.runs = {};
    this.current_run = null;
    this._invalidateIndex();
  },

  findByOperation: function(op) {
    const key = JSON.stringify(op);
    return this.runsByOpKey[key];
  },

  _removeRun: function(run_name) {
    const run = this.runs[run_name];
    if (run) {
      delete this.runs[run_name];
      if (run.operation_key) {
        delete this.runsByOpKey[run.operation_key];
      }
      this._invalidateIndex();
    }
  },

  // ─── Index Management ───────────────────────────────────
_buildIndex: function () {
  if (this._index) return;
  this._index = {};

  const allDocs = [];

  // Pass 1: index everything by name (PK) only
  for (const run of Object.values(this.runs)) {
    const docs = run.target?.data;
    if (!Array.isArray(docs)) continue;

    for (const doc of docs) {
      if (!doc?.doctype || !doc?.name) continue;
      if (!this._index[doc.doctype]) this._index[doc.doctype] = {};
      const runtime = globalThis[doc.doctype]?.[doc.name];
      this._index[doc.doctype][doc.name] = runtime || doc;
      allDocs.push(doc);
    }
  }

  // Pass 1.5: build doctype->autoname map directly from Schema index
  const autonameMap = {};
  for (const entry of Object.values(this._index['Schema'] || {})) {
    if (entry?.schema_name && entry?.autoname) {
      autonameMap[entry.schema_name] = entry.autoname;
    }
  }

  // Pass 2: semantic aliases using autonameMap
  for (const doc of allDocs) {
    const autoname = autonameMap[doc.doctype];
    if (autoname?.startsWith('field:')) {
      const semanticField = autoname.slice(6);
      const semanticValue = doc[semanticField];
      if (semanticValue && semanticValue !== doc.name) {
        this._index[doc.doctype][semanticValue] = this._index[doc.doctype][doc.name];
      }
    }
  }
},

  _invalidateIndex: function() {
    this._index = null;
  },

  getDoctype: function(doctype) {
    this._buildIndex();
    return this._index[doctype] || {};
  },

  getDocument: function(doctype, name) {
    this._buildIndex();
    return this._index[doctype]?.[name];
  },

  // ─── Compilation ────────────────────────────────────────
_compileDocument: async function (run_doc) {
  const docs = Array.isArray(run_doc.target?.data)
    ? run_doc.target.data
    : [run_doc.target?.data].filter(Boolean);

  for (const doc of docs) {
    if (!globalThis[doc.doctype]) globalThis[doc.doctype] = {};

    // Derive semantic alias from schema instead of hardcoding adapter_name
    const autoname = CW.Schema?.[doc.doctype]?.autoname;
    const semanticField = autoname?.startsWith('field:') ? autoname.slice(6) : null;
    const semanticValue = semanticField ? doc[semanticField] : null;

    // Load Scripts
    if (Array.isArray(doc.scripts)) {
      for (const script of doc.scripts) {
        if (script.type === 'sdk' || (!script.type && script.src)) {
          const scriptNs = script.namespace || semanticValue || doc.name;
          if (globalThis[scriptNs]) continue;
          if (script.source?.trim()) {
            (0, eval)(script.source);
          } else if (script.src) {
            const response = await fetch(script.src);
            script.source = await response.text();
            (0, eval)(script.source);
          }
        }
      }
    }

    // Compile Functions
    const runtime = { config: doc.config };
    if (doc.functions) {
      Object.entries(doc.functions).forEach(([name, fnStr]) => {
        runtime[name] = eval('(' + fnStr + ')');
      });
    }
    //if (runtime.init) runtime.init(run_doc);   commented OUT init

    // Register under PK always, semantic alias when available
    globalThis[doc.doctype][doc.name] = runtime;
    if (semanticValue && semanticValue !== doc.name) {
      globalThis[doc.doctype][semanticValue] = runtime;
    }
  }

  this._invalidateIndex();
},

  // ─── Compile All ────────────────────────────────────────
compileAll: async function() {
  let compiled = 0;
  for (const run of Object.values(this.runs)) {
    const docs = run.target?.data;
    if (!Array.isArray(docs)) continue;
    
    const hasCompilable = docs.some(doc => doc?.functions || doc?.scripts);
    if (hasCompilable) {
      await this._compileDocument(run);
      compiled++;
    }
  }
  console.log(`✓ Compiled ${compiled} run(s)`);
  return compiled;
},

  // ─── handleField ──────────────────────────────────
  _handleField : function(fieldname, fieldtype, rootObj, path) {
    // Navigate to container (the data array/object)
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    let container = globalThis;
    
    for (const part of parts) {
      container = container[part];
      if (!container) throw new Error(`Invalid path: ${path}`);
    }
    
    // Container IS the data (array or object)
    const target = Array.isArray(container) ? container[0] : container;
    
    // ✅ Get doctype FROM the data object
    const doctype = target.doctype;
    if (!doctype) throw new Error(`No doctype in data at path: ${path}`);
    
    // ✅ Get schema from CW
    const schema = CW.Schema[doctype];
    if (!schema) throw new Error(`Schema not found: ${doctype}`);
    
    // ✅ Get field from schema
    const field = schema.fields.find(f => f.fieldname === fieldname);
    if (!field) throw new Error(`Field "${fieldname}" not in ${doctype} schema`);
    
    // Apply handler
    const handler = this._fieldHandlers[fieldtype || field.fieldtype];
    const value = handler 
      ? handler(target[fieldname], field, { rootObj, schema })
      : target[fieldname];
    
    target[fieldname] = value;
    return value;
  },

};

// ============================================================
// Wrap CW in Proxy for Dynamic Doctype Access
// ============================================================

globalThis.CW = new Proxy(globalThis.CW, {
  get(target, prop) {
    // Direct property/method access
    if (prop in target) return target[prop];
    
    // Dynamic doctype access: CW.Adapter, CW.User, etc.
    target._buildIndex();
    return target._index[prop] || {};
  }
});


//========================================================
//
// new controller v2 with state, prev in v37
//========================================================
//COMMENTED OUT - moved to separate file for clarity and to avoid circular dependencies with FSM and permissions logic
globalThis.CW.controller = async function(run_doc) {
  
  if (run_doc._running) return;
  run_doc._running = true;

  const { _state, ...dataKeys } = run_doc.input;
/* commented out temp 
  Object.assign(run_doc.target.data[0], dataKeys);
  if (_state) Object.assign(run_doc.target.data[0]._state ||= {}, _state);

  console.log("[controller] doc after merge", { ...run_doc.target.data[0] });
  console.log("[controller] doc._state after merge", { ...run_doc.target.data[0]._state });

  if (Object.keys(dataKeys).length > 0) {
    run_doc._oplog = run_doc._oplog || [];
    run_doc._oplog.push({
      delta: dataKeys,
      state: _state || {},
      timestamp: Date.now(),
    });
  }
*/
  await CW.fsm.handle(run_doc);
/*
  clearTimeout(run_doc._saveTimer);
  const doc = run_doc.target.data[0];
  const immediate = doc._docstatus === 1 || doc._docstatus === 2;

  if (immediate) {
    await persist(run_doc);
  } else {
    run_doc._saveTimer = setTimeout(() => {
      persist(run_doc);
      run_doc._saveTimer = null;
    }, 300);
  }

  for (const k of Object.keys(dataKeys)) delete run_doc.input[k];
  delete run_doc.input._state;
*/
  run_doc._running = false;
  return run_doc;  
};

//========================================================
// ===  FSM == 
//========================================================

globalThis.CW.fsm = {

  // parse "1.0_1.Adapter.auth.activate" → { dim: "1", from: "0", to: "1", adapter: "Adapter.auth.activate" }
  parseKey: function(key) {
    const parts = key.split('.');
    const dim = parts[0];
    const fromTo = parts[1];
    const [from, to] = fromTo.split('_');
    const adapter = parts.slice(2).join('.');
    return { dim, from, to, adapter };
  },

  // resolve "Adapter.auth.activate" → CW.Adapter.auth.activate function
  resolveAdapter: function(adapter) {
    const parts = adapter.split('.');
    if (parts[0] === 'Adapter') {
      const name = parts[1];
      const fn = parts[2];
      return CW.Adapter[name]?.[fn];
    }
    return null;
  },

  // get all schema keys for a given dim.from_to prefix
  getSteps: function(schema_state, dim, from, to) {
    const prefix = `${dim}.${from}_${to}.`;
    return Object.entries(schema_state)
      .filter(([k]) => k.startsWith(prefix))
      .map(([k]) => k);
  },

 handle: async function(run_doc) {
    const input_state = run_doc.input?._state;
    if (!input_state || Object.keys(input_state).length === 0) return;

    const schema_state = CW.Schema[run_doc.target_doctype]?._state;
    if (!schema_state) return;

    const doc_state = run_doc.target?.data?.[0]?._state || {};

    for (const [key, val] of Object.entries(input_state)) {
      if (val !== '') continue;

      const parts = key.split('.');
      if (parts.length < 3) continue;

      const { dim, from, to, adapter } = this.parseKey(key);

      const current = String(doc_state[`${dim}.current`] ?? '0');
      if (current !== from) {
        run_doc.input._state[key] = '-1';
        run_doc._error = `Invalid transition ${dim}: current=${current} expected=${from}`;
        continue;
      }

      // owner is the key from input._state
      const ownerAdapter = adapter;
      const ownerFn = this.resolveAdapter(ownerAdapter);

      if (!ownerFn) {
        run_doc.input._state[key] = '-1';
        run_doc._error = `Adapter not found: ${ownerAdapter}`;
        continue;
      }

      try {
        await ownerFn.call(CW.Adapter[ownerAdapter.split('.')[1]], run_doc);
        run_doc.input._state[key] = '1';

        // commit state
        run_doc.input._state[`${dim}.current`] = to;

        // followers — all schema steps for this transition except owner
        const steps = this.getSteps(schema_state, dim, from, to);
        const followers = steps.filter(k => k !== key);

        if (followers.length > 0) {
          await Promise.all(followers.map(async (followerKey) => {
            const followerAdapter = this.parseKey(followerKey).adapter;
            const followerFn = this.resolveAdapter(followerAdapter);
            if (!followerFn) {
              run_doc.input._state[followerKey] = '-1';
              return;
            }
            try {
              await followerFn.call(CW.Adapter[followerAdapter.split('.')[1]], run_doc);
              run_doc.input._state[followerKey] = '1';
            } catch(e) {
              run_doc.input._state[followerKey] = '-1';
            }
          }));
        }

      } catch(e) {
        run_doc.input._state[key] = '-1';
        run_doc._error = e.message;
      }
    }
  }
};