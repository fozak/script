// ============================================================
// COWORKER-.JS - PRODUCTION READY
// Version: 5.1.0 - Centralized Draft, Smart Validation, Auto-Serialization
// ============================================================

// ============================================================
// COWORKER VALIDATORS
// ============================================================

coworker.validators = {
  /**
   * Validate field based on fieldtype and properties
   */
  validateField(field, value) {
    // Required check
    if (field.reqd && (value == null || value === "")) {
      return `${field.label || field.fieldname} is required`;
    }

    // Skip if no value
    if (value == null || value === "") return null;

    // Type validation
    const typeChecks = {
      Int: (v) => Number.isInteger(Number(v)),
      Float: (v) => !isNaN(Number(v)),
      Email: (v) => /^\S+@\S+\.\S+$/.test(v),
      Date: (v) => !isNaN(Date.parse(v)),
    };

    if (typeChecks[field.fieldtype] && !typeChecks[field.fieldtype](value)) {
      return `${field.label || field.fieldname} must be valid ${field.fieldtype}`;
    }

    // Length validation
    if (field.length && value.length > field.length) {
      return `${field.label || field.fieldname} exceeds max length ${field.length}`;
    }

    // Range validation
    if (field.min_value != null && Number(value) < field.min_value) {
      return `${field.label || field.fieldname} minimum is ${field.min_value}`;
    }
    if (field.max_value != null && Number(value) > field.max_value) {
      return `${field.label || field.fieldname} maximum is ${field.max_value}`;
    }

    return null;
  },
};

// ============================================================
// COWORKER CONTROLLER
// ============================================================

coworker.controller = {
  // ══════════════════════════════════════════════════════════
  // UNIVERSAL EXECUTOR (Config-Driven)
  // ══════════════════════════════════════════════════════════

  async execute(run_doc) {
    const { operation, options = {} } = run_doc;

    // ✅ SINGLE SOURCE OF TRUTH: Set draft from operation config
    if (options.draft === undefined) {
      const opConfig = coworker._config.operations[operation];
      run_doc.options = run_doc.options || {};
      run_doc.options.draft = opConfig?.draft ?? false;
    }

    // ✅ ESCAPE HATCH: Skip controller entirely
    if (options.skipController) {
      return await coworker._handlers[operation](run_doc);
    }

    // ✅ Get operation config (default if not found)
    const opConfig = coworker._config.operations[operation] || {
      type: "custom",
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
    };

    // ✅ Fetch schema if needed (use correct doctype)
    if (opConfig.requiresSchema && !options.skipSchema) {
      if (!run_doc.target) run_doc.target = {};

      // ✅ Use source_doctype for reads/updates, target_doctype for creates
      const doctype = run_doc.source_doctype || run_doc.target_doctype;

      if (!run_doc.target.schema && doctype && doctype !== "Schema") {
        const schema = await coworker.getSchema(doctype);
        run_doc.target.schema = schema;
      }
    }

    // ✅ Route based on type
    if (opConfig.type === "read") {
      const result = await coworker._handlers[operation](run_doc);
      
      // ✅ AUTO-DESERIALIZE: Convert JSON strings to objects
      if (result.target?.data && Array.isArray(result.target.data)) {
        const doctype = run_doc.source_doctype || run_doc.target_doctype;
        if (doctype) {
          result.target.data = await coworker.deserializeDocuments(
            result.target.data,
            doctype
          );
        }
      }
      
      return result;
    }

    if (opConfig.type === "write") {
      if (options.skipValidation || !opConfig.validate) {
        return await coworker._handlers[operation](run_doc);
      }
      return await this._processWrite(run_doc, opConfig);
    }

    // Custom operations - pass through
    return await coworker._handlers[operation](run_doc);
  },

  // ══════════════════════════════════════════════════════════
  // WRITE OPERATIONS (Validation Layer)
  // ══════════════════════════════════════════════════════════

  async _processWrite(run_doc, opConfig) {
    const { operation, input, query } = run_doc;

    // ✅ Get correct doctype based on operation
    // - CREATE/INSERT: target_doctype (writing TO new)
    // - UPDATE/DELETE: source_doctype (reading FROM existing)
    const doctype = run_doc.source_doctype || run_doc.target_doctype;

    const schema = run_doc.target?.schema;

    // ✅ Fetch originals if config says so
    let items = [];
    if (opConfig.fetchOriginals && query?.where) {
      const filter = coworker._buildPrismaWhere(doctype, query.where);
      const result = await coworker._dbQuery({ filter });
      items = result.data;

      if (items.length === 0) {
        return {
          success: true,
          target: {
            data: [],
            schema,
            meta: { operation, affected: 0 },
          },
        };
      }
    }

    // ✅ Validate based on config
    if (opConfig.validate) {
      // ✅ Accept both wrapped (input.data) and unwrapped (input) formats
      const inputData = input?.data || input;

      // For operations that fetch originals (UPDATE), validate merged
      if (items.length > 0) {
        for (const item of items) {
          const merged = { ...item, ...inputData };
          const validation = this._validate(merged, schema);
          if (!validation.valid) {
            return { success: false, errors: validation.errors };
          }
        }
      }
      // For operations that don't fetch (CREATE), validate input
      else {
        const validation = this._validate(inputData, schema);
        if (!validation.valid) {
          return { success: false, errors: validation.errors };
        }
      }
    }

    // ✅ Pass fetched items to handler (avoid double fetch)
    if (items.length > 0) {
      run_doc._items = items;
    }

    // Execute via handler
    return await coworker._handlers[operation](run_doc);
  },

  // ══════════════════════════════════════════════════════════
  // VALIDATION HELPERS
  // ══════════════════════════════════════════════════════════

  _validate(doc, schema) {
    if (!schema) return { valid: true, errors: [] };

    const errors = [];
    schema.fields.forEach((field) => {
      const error = coworker.validators.validateField(
        field,
        doc[field.fieldname]
      );
      if (error) errors.push(error);
    });

    return { valid: !errors.length, errors };
  },

  validate(run) {
    const errors = [];

    run.target?.schema?.fields.forEach((field) => {
      const error = coworker.validators.validateField(
        field,
        run.doc[field.fieldname]
      );
      if (error) errors.push(error);
    });

    return { valid: !errors.length, errors };
  },

  isComplete(run) {
    return this.validate(run).valid;
  },

  // ══════════════════════════════════════════════════════════
  // DRAFT MODE HELPERS (UI Form Support)
  // ══════════════════════════════════════════════════════════

  async save(run) {
    // ✅ Check draft flag (set by execute())
    if (!run.options?.draft) {
      console.warn("save() called on non-draft run");
      return {
        success: false,
        error: { message: "Document not in draft mode" },
      };
    }

    if (run._saving) {
      console.warn("save() already in progress");
      return { success: false, error: { message: "Save in progress" } };
    }

    // Validate
    const validation = this.validate(run);
    if (!validation.valid) {
      run._validationErrors = validation.errors;
      if (typeof coworker._render === "function") {
        coworker._render(run);
      }
      return { success: false, errors: validation.errors };
    }

    // ✅ MERGE: original + delta
    const original = run.target?.data?.[0] || {};
    const delta = run.input || {};
    const merged = { ...original, ...delta };

    // Determine if new or update
    const isNew = !merged.name || merged.name.startsWith("new-");

    // ✅ Get doctype from parent run (works for both create and update)
    const doctype = run.source_doctype || run.target_doctype;

    if (!doctype) {
      console.error("save() requires doctype");
      return {
        success: false,
        error: { message: "No doctype found in run" }
      };
    }

    // Save
    run._saving = true;
    if (typeof coworker._render === "function") {
      coworker._render(run);
    }

    try {
      const saveRun = await run.child({
        operation: isNew ? "create" : "update",
        
        // ✅ Pass both doctypes - resolver will use the correct one
        source_doctype: doctype,
        target_doctype: doctype,
        
        input: merged,
        query: isNew ? undefined : { where: { name: merged.name } },
        options: {
          includeSchema: false,
        },
      });

      if (saveRun.success) {
        // Update local state
        run.target.data = [saveRun.target.data[0]];
        run.input = {};
        delete run._saving;
        delete run._validationErrors;

        // ✅ Re-render to show updated state (buttons may change based on docstatus)
        if (typeof coworker._render === "function") {
          coworker._render(run);
        }

        return { success: true, data: saveRun.target.data[0] };
      } else {
        run._saveError = saveRun.error?.message;
        delete run._saving;

        if (typeof coworker._render === "function") {
          coworker._render(run);
        }

        return { success: false, error: saveRun.error };
      }
    } catch (error) {
      run._saveError = error.message;
      delete run._saving;

      if (typeof coworker._render === "function") {
        coworker._render(run);
      }

      return { success: false, error: { message: error.message } };
    }
  },

  async autoSave(run) {
    // ✅ Check draft flag (set by execute())
    if (!run.options?.draft) return;
    if (run._saving) return;

    // ✅ Schema-level autosave control
    const schema = run.target?.schema;

    if (schema?.is_submittable === 1) {
      const autosave = schema._autosave !== undefined ? schema._autosave : 1;

      if (autosave === 0) {
        console.log("🚫 AutoSave BLOCKED: _autosave=0 for", schema.schema_name);
        return;
      }

      if (run.doc?.docstatus !== 0) {
        console.log("🚫 AutoSave BLOCKED: docstatus != 0");
        return;
      }
    }

    if (!this.isComplete(run)) {
      if (typeof coworker._render === "function") {
        coworker._render(run);
      }
      return;
    }

    console.log("✅ AutoSave proceeding to save()");
    return await this.save(run);
  }
};

console.log('✅ Controller loaded: v5.1.0 - Centralized draft, smart validation, auto-serialization');
/*

**Key Changes:**

1. **Version bump**: 5.0.0 → 5.1.0
2. **Added auto-deserialization** for read operations (lines 67-76)
3. **No handler changes required** - all handlers work as-is

**Flow:**
```
READ Operations:
  Handler returns raw strings from DB
    ↓
  Controller intercepts (type === "read")
    ↓
  Calls deserializeDocuments()
    ↓
  Returns objects to user

WRITE Operations:
  User provides objects
    ↓
  processDocument() serializes (in CREATE handler)
    ↓
  DB receives strings*/
