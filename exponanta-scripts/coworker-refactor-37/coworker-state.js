// ============================================================
// globalThis.CW - Centralized State & Runtime. ADDED 
// ============================================================

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