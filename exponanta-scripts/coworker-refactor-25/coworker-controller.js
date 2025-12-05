// ============================================================
// COWORKER-CONTROLLER.JS
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
      return `${field.label || field.fieldname} must be valid ${
        field.fieldtype
      }`;
    }

    // Length validation
    if (field.length && value.length > field.length) {
      return `${field.label || field.fieldname} exceeds max length ${
        field.length
      }`;
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
    const { operation, target_doctype, options = {} } = run_doc;

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

    // ✅ Fetch schema if needed (with cache)
    if (opConfig.requiresSchema && !options.skipSchema) {
      if (!run_doc.output) run_doc.output = {};

      // ✅ Use source_doctype for reads, target_doctype for writes
      const doctype = run_doc.source_doctype || run_doc.target_doctype;

      if (!run_doc.output.schema && doctype && doctype !== "Schema") {
        const schema = await coworker.getSchema(doctype);
        run_doc.output.schema = schema;
      }
    }

    // ✅ Route based on type
    if (opConfig.type === "read") {
      return await coworker._handlers[operation](run_doc);
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
    const { operation, target_doctype, input, query } = run_doc;
    const schema = run_doc.output?.schema;

    // ✅ Fetch originals if config says so
    let items = [];
    if (opConfig.fetchOriginals && query?.where) {
      const filter = coworker._buildPrismaWhere(target_doctype, query.where);
      const result = await coworker._dbQuery({ filter });
      items = result.data;

      if (items.length === 0) {
        return {
          success: true,
          output: {
            data: [],
            schema,
            meta: { operation, affected: 0 },
          },
        };
      }
    }

    // ✅ Validate based on config
    if (opConfig.validate) {
      // For operations that fetch originals (UPDATE), validate merged
      if (items.length > 0) {
        for (const item of items) {
          const merged = { ...item, ...input };
          const validation = this._validate(merged, schema);
          if (!validation.valid) {
            return { success: false, errors: validation.errors };
          }
        }
      }
      // For operations that don't fetch (CREATE), validate input
      else {
        const validation = this._validate(input, schema);
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

    run.output?.schema?.fields.forEach((field) => {
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
    const original = run.output?.data?.[0] || {};
    const delta = run.input || {};
    const merged = { ...original, ...delta };

    // Determine if new or update
    const isNew = !merged.name || merged.name.startsWith("new-");

    // Save
    run._saving = true;
    if (typeof coworker._render === "function") {
      coworker._render(run);
    }

    try {
      const saveRun = await run.child({
        operation: isNew ? "create" : "update",
        doctype: run.source_doctype,
        input: merged,
        query: { where: { name: merged.name } },
        options: {
          draft: false,
          includeSchema: false,
        },
      });

      if (saveRun.success) {
        // Update local state
        run.output.data = [saveRun.output.data[0]];
        run.input = {};
        run.options.draft = false;
        delete run._saving;
        delete run._validationErrors;

        if (typeof coworker._render === "function") {
          coworker._render(run);
        }

        return { success: true, data: saveRun.output.data[0] };
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
    if (!run.options?.draft) return;
    if (run._saving) return;
    if (!this.isComplete(run)) {
      if (typeof coworker._render === "function") {
        coworker._render(run);
      }
      return;
    }

    return await this.save(run);
  },
};
