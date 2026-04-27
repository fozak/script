// ============================================================
// CW-state.js - Centralized State & Runtime
// ============================================================

globalThis.CW = globalThis.CW || {};

Object.assign(globalThis.CW, {
  runs: {},
  current_run: null,
  _index: null,

  _updateFromRun: function (run_doc) {
    this.runs[run_doc.name] = run_doc;

    if (
      run_doc.component?.startsWith("Main") &&
      run_doc.options?.render !== false
    ) {
      this.current_run = run_doc.name;
    }

    this._invalidateIndex();

    // browser only
    if (
      typeof globalThis.dispatchEvent === "function" &&
      typeof CustomEvent !== "undefined"
    ) {
      globalThis.dispatchEvent(
        new CustomEvent("coworker:state:change", {
          detail: { run: run_doc },
        }),
      );
    }
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
    this._invalidateIndex();
  },

  _buildIndex: function () {
    if (this._index) return;
    this._index = {};

    const allDocs = [];

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

    const autonameMap = {};
    for (const entry of Object.values(this._index["Schema"] || {})) {
      if (entry?.schema_name && entry?.autoname) {
        autonameMap[entry.schema_name] = entry.autoname;
      }
    }

    for (const doc of allDocs) {
      const autoname = autonameMap[doc.doctype];
      if (autoname?.startsWith("field:")) {
        const semanticField = autoname.slice(6);
        const semanticValue = doc[semanticField];
        if (semanticValue && semanticValue !== doc.name) {
          this._index[doc.doctype][semanticValue] =
            this._index[doc.doctype][doc.name];
        }
      }
    }
  },

  _invalidateIndex: function () {
    this._index = null;
  },

  getDoctype: function (doctype) {
    this._buildIndex();
    return this._index[doctype] || {};
  },

  getDocument: function (doctype, name) {
    this._buildIndex();
    return this._index[doctype]?.[name];
  },

  _compileDocument: async function (run_doc) {
    const docs = Array.isArray(run_doc.target?.data)
      ? run_doc.target.data
      : [run_doc.target?.data].filter(Boolean);

    for (const doc of docs) {
      if (!globalThis[doc.doctype]) globalThis[doc.doctype] = {};

      const autoname = globalThis.CW.Schema?.[doc.doctype]?.autoname;
      const semanticField = autoname?.startsWith("field:")
        ? autoname.slice(6)
        : null;
      const semanticValue = semanticField ? doc[semanticField] : null;

      // Load Scripts
      const scripts = doc.scripts
        ? (typeof doc.scripts === "string" ? JSON.parse(doc.scripts) : doc.scripts)
        : [];

      if (Array.isArray(scripts)) {
        for (const script of scripts) {
          if (script.type === "sdk" || (!script.type && script.src)) {
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
      const runtime = {
        config:
          typeof doc.config === "string" ? JSON.parse(doc.config) : doc.config,
      };

      if (doc.functions) {
        const fns =
          typeof doc.functions === "string"
            ? JSON.parse(doc.functions)
            : doc.functions;
        Object.entries(fns).forEach(([name, fnStr]) => {
          runtime[name] = eval("(" + fnStr + ")");
        });
      }

      globalThis[doc.doctype][doc.name] = runtime;
      if (semanticValue && semanticValue !== doc.name) {
        globalThis[doc.doctype][semanticValue] = runtime;
      }
    }

    this._invalidateIndex();
  },

  // compile sideEffects and rules strings in CW.Schema into live functions
  // call once at boot after CW.Schema is populated from db.json
  // after this no further eval of schema strings is needed anywhere
  _compileSchemas: function () {
    for (const [doctype, schema] of Object.entries(globalThis.CW.Schema || {})) {
      for (const [dim, def] of Object.entries(schema._state || {})) {
        for (const [key, fnStr] of Object.entries(def.sideEffects || {})) {
          if (typeof fnStr === 'string') {
            // skip adapter path keys — "0_1.Adapter.x.y" resolved at runtime, not compiled
            if (key.includes('.')) continue;
            try { def.sideEffects[key] = eval('(' + fnStr + ')'); }
            catch(e) { console.error(`[CW] compile sideEffects[${doctype}][${dim}][${key}]`, e); }
          }
        }
        for (const [key, fnStr] of Object.entries(def.rules || {})) {
          if (typeof fnStr === 'string') {
            try { def.rules[key] = eval('(' + fnStr + ')'); }
            catch(e) { console.error(`[CW] compile rules[${doctype}][${dim}][${key}]`, e); }
          }
        }
      }
    }
    console.log('✅ CW.Schema compiled');
  },

  compileAll: async function () {
    let compiled = 0;
    for (const run of Object.values(this.runs)) {
      const docs = run.target?.data;
      if (!Array.isArray(docs)) continue;

      const hasCompilable = docs.some((doc) => doc?.functions || doc?.scripts);
      if (hasCompilable) {
        await this._compileDocument(run);
        compiled++;
      }
    }
    console.log(`✓ Compiled ${compiled} run(s)`);
    return compiled;
  },

});

// ============================================================
// Wrap CW in Proxy for Dynamic Doctype Access
// ============================================================

globalThis.CW = new Proxy(globalThis.CW, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return globalThis[prop] || {};
  },
});

console.log("✅ CW-state.js loaded");
