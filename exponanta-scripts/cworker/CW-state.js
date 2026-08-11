// ============================================================
// v 44.6 added sql compile CW-state.js - Centralized State & Runtime
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
        ? //? (typeof doc.scripts === "string" ? JSON.parse(doc.scripts) : doc.scripts)
          tryParseJSON(doc.scripts)
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
          //typeof doc.config === "string" ? JSON.parse(doc.config) : doc.config,
          tryParseJSON(doc.config) || {},
      };

      if (doc.functions) {
        const fns =
          /*typeof doc.functions === "string"
            ? JSON.parse(doc.functions)
            : doc.functions;*/ tryParseJSON(doc.functions) || {};
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
  // after this no further eval of schema strings is needed anywhere   -1 version
  /*
_compileSchemas: function () {
  for (const [doctype, schema] of Object.entries(globalThis.CW.Schema || {})) {

    // ── 1. systemFields → schema.fields: system WINS ──────────
const sysFields = (globalThis.CW._config?.systemFields || [])
  .map((sf) => {
    const field = {}
    for (const [k, v] of Object.entries(sf)) {
      if (k === "name")                                                    field.fieldname = v
      else if (k === "onWrite" || k === "onCreate" || k === "fetch" || k === "_state") continue
      else field[k] = v
    }
    field.fieldname = field.fieldname || sf.name
    return field
  })

    if (!schema.fields) schema.fields = []
    for (const sf of sysFields) {
      const idx = schema.fields.findIndex((f) => f.fieldname === sf.fieldname)
      if (idx === -1) {
        schema.fields.push(sf)                                       // new → push
      } else {
        schema.fields[idx] = { ...schema.fields[idx], ...sf }       // system WINS
      }
    }

    // ── 2. systemFields._state → schema._state: MERGE ─────────
    if (!schema._state) schema._state = {}
    for (const sf of globalThis.CW._config?.systemFields || []) {
      if (!sf._state) continue
      const key = sf._state.name
      if (!(key in schema._state)) {
        schema._state[key] = { ...sf._state }                       // new dim → add
      } else {
        schema._state[key] = { ...sf._state, ...schema._state[key] } // doctype overrides system
      }
    }

    // ── 3. doctypeFields → schema.fields: existing WINS ───────
    const doctypeFields = globalThis.CW._config?.doctypeFields?.[doctype] || []
    for (const df of doctypeFields) {
      const idx = schema.fields.findIndex((f) => f.fieldname === df.fieldname)
      if (idx === -1) {
        schema.fields.push(df)                                       // new → push
      } else {
        schema.fields[idx] = { ...df, ...schema.fields[idx] }       // existing WINS
      }
    }

    // ── 4. doctypeFields._state → schema._state: existing WINS ─
    for (const df of doctypeFields) {
      if (!df._state) continue
      const key = df._state.name
      if (!(key in schema._state)) {
        schema._state[key] = { ...df._state }                       // new dim → add
      } else {
        schema._state[key] = { ...df._state, ...schema._state[key] } // existing WINS
      }
    }

    // ── 5. compile sideEffects/rules LAST ─────────────────────
    for (const [dim, def] of Object.entries(schema._state || {})) {
      for (const [key, fnStr] of Object.entries(def.sideEffects || {})) {
        if (typeof fnStr === "string") {
          if (key.includes(".") || !fnStr.includes("function")) continue
          try { def.sideEffects[key] = eval("(" + fnStr + ")") }
          catch (e) { console.error(`[CW] compile sideEffects[${doctype}][${dim}][${key}]`, e) }
        }
      }
      for (const [key, fnStr] of Object.entries(def.rules || {})) {
        if (typeof fnStr === "string") {
          try { def.rules[key] = eval("(" + fnStr + ")") }
          catch (e) { console.error(`[CW] compile rules[${doctype}][${dim}][${key}]`, e) }
        }
      }
    }
  }

  console.log("✅ CW.Schema compiled")
},*/
_compileSchemas: function () {
  for (const [doctype, schema] of Object.entries(globalThis.CW.Schema || {})) {

    // ── 1. shell schema.fields exist, systemFields enrich/override ─
    if (!schema.fields) schema.fields = [];
    if (!schema._state) schema._state = {};

    for (const sf of globalThis.CW._config?.systemFields || []) {
      // normalize name → fieldname
      const field = { ...sf };
      if (sf.name && !sf.fieldname) field.fieldname = sf.name;
      delete field.name;
      delete field._state;

      const idx = schema.fields.findIndex((f) => f.fieldname === field.fieldname);
      if (idx === -1) {
        schema.fields.push(field);                               // new → add
      } else {
        schema.fields[idx] = { ...schema.fields[idx], ...field }; // system WINS
      }

      // _state dim from systemField
      if (sf._state) {
        const key = sf._state.name;
        if (!(key in schema._state)) {
          schema._state[key] = { ...sf._state };                // new dim → add
        } else {
          schema._state[key] = { ...sf._state, ...schema._state[key] }; // doctype overrides system
        }
      }
    }

    // ── 2. doctypeFields — last override, doctype WINS ────────────
    const doctypeFields = globalThis.CW._config?.doctypeFields?.[doctype] || [];

    for (const df of doctypeFields) {
      const field = { ...df };
      if (df.name && !df.fieldname) field.fieldname = df.name;
      delete field.name;
      delete field._state;

      const idx = schema.fields.findIndex((f) => f.fieldname === field.fieldname);
      if (idx === -1) {
        schema.fields.push(field);                               // new → add
      } else {
        schema.fields[idx] = { ...schema.fields[idx], ...field }; // doctype WINS
      }

      // _state dim from doctypeField
      if (df._state) {
        const key = df._state.name;
        if (!(key in schema._state)) {
          schema._state[key] = { ...df._state };
        } else {
          schema._state[key] = { ...df._state, ...schema._state[key] }; // doctype overrides
        }
      }
    }

    // ── 3. compile sideEffects/rules strings → live fns ──────────
    for (const [dim, def] of Object.entries(schema._state || {})) {
      for (const [key, fnStr] of Object.entries(def.sideEffects || {})) {
        if (typeof fnStr === "string") {
          try { def.sideEffects[key] = eval("(" + fnStr + ")"); }
          catch (e) { console.error(`[CW] sideEffects[${doctype}][${dim}][${key}]`, e); }
        }
      }
      for (const [key, fnStr] of Object.entries(def.rules || {})) {
        if (typeof fnStr === "string") {
          try { def.rules[key] = eval("(" + fnStr + ")"); }
          catch (e) { console.error(`[CW] rules[${doctype}][${dim}][${key}]`, e); }
        }
      }
    }
  }

  console.log("✅ CW.Schema compiled");
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
