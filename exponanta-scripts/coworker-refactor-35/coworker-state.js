// ============================================================
// globalThis.CW - Centralized State & Runtime
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
  _buildIndex: function() {
    if (this._index) return;
    
    this._index = {};
    
    for (const run of Object.values(this.runs)) {
      const doc = run.target?.data?.[0];
      if (!doc?.doctype || !doc?.name) continue;
      
      if (!this._index[doc.doctype]) {
        this._index[doc.doctype] = {};
      }
      
      // Return runtime if exists, otherwise the doc
      this._index[doc.doctype][doc.name] = run.target?.runtime || doc;
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
  _compileDocument: async function(run_doc) {
    if (!run_doc || !run_doc.target || !run_doc.target.data) {
      console.error('Invalid run_doc structure:', run_doc);
      return;
    }
    
    const doc = run_doc.target.data[0];
    if (!doc) {
      console.warn('No document found in run_doc.target.data[0]');
      return;
    }
    
    if (!run_doc.target.runtime) {
      run_doc.target.runtime = {};
    }
    
    const namespace = doc.adapter_name || doc.name;
    
    // ─── Load Scripts (SDK) ─────────────────────────────────
    if (doc.scripts && Array.isArray(doc.scripts)) {
      for (const script of doc.scripts) {
        
        if (script.type === 'sdk' || (!script.type && script.src)) {
          const ns = script.namespace || namespace;
          
          if (globalThis[ns]) {
            console.log(`✓ ${ns} already loaded`);
            continue;
          }
          
          if (script.source && script.source.trim() !== "") {
            try {
              (0, eval)(script.source);
              console.log(`✓ Loaded ${ns} (cached)`);
            } catch (e) {
              console.error(`Failed to load ${ns} from cache:`, e);
              throw e;
            }
          }
          else if (script.src) {
            try {
              console.log(`📥 Fetching ${ns} from CDN...`);
              
              const response = await Promise.race([
                fetch(script.src),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Fetch timeout')), 10000)
                )
              ]);
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              
              script.source = await response.text();
              
              if (script.source.length < 100) {
                throw new Error('Source too small, likely corrupted');
              }
              
              (0, eval)(script.source);
              console.log(`✓ Loaded ${ns} from CDN (${(script.source.length / 1024).toFixed(1)}KB)`);
              
              if (!globalThis[ns]) {
                console.warn(`⚠ ${ns} didn't create global, check namespace`);
              }
              
            } catch (error) {
              console.error(`❌ Failed to load ${ns}:`, error.message);
              throw error;
            }
          }
        }
      }
    }
    
    // ─── Compile Functions ──────────────────────────────────
    if (doc.functions) {
      Object.entries(doc.functions).forEach(([name, fnString]) => {
        try {
          run_doc.target.runtime[name] = eval(`(${fnString})`);
        } catch (e) {
          console.error(`Failed to compile function '${name}':`, e);
        }
      });
      console.log(`✓ Compiled ${Object.keys(doc.functions).length} function(s)`);
    }
    
    // ─── Call init() if present ─────────────────────────────
    if (run_doc.target.runtime.init) {
      try {
        run_doc.target.runtime.init(run_doc);
      } catch (e) {
        console.error('Init function failed:', e);
      }
    }
    
    this._invalidateIndex();
    
    return run_doc;
  },

  // ─── Compile All ────────────────────────────────────────
  compileAll: async function() {
    let compiled = 0;
    for (const run of Object.values(this.runs)) {
      const doc = run.target?.data?.[0];
      if (doc?.functions || doc?.scripts) {
        await this._compileDocument(run);
        compiled++;
      }
    }
    console.log(`✓ Compiled ${compiled} document(s)`);
    return compiled;
  }
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

console.log('✓ CW initialized with Proxy');