// ============================================================
// COWORKER-CONTROLLER.JS - PRODUCTION READY
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
        console.log("🚫 AutoSave BLOCKED: _autosave=0 for", schema._schema_doctype);
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



// ============================================================================
// COWORKER-FIELD-SYSTEM.JS
// Three-tier document processing system + Serialization/Deserialization
// ============================================================================

// ============================================================================
// FIELD TYPE HANDLERS REGISTRY
// ============================================================================

coworker._fieldHandlers = coworker._fieldHandlers || {};

// Code field handler (JSON serialization/deserialization)
coworker._fieldHandlers.Code = {
  // On READ: Parse JSON strings to objects
  preprocess({ val, field }) {
    if (field.options === "JSON" && typeof val === "string" && val) {
      try {
        return JSON.parse(val);
      } catch (e) {
        console.warn(`Failed to parse JSON for ${field.fieldname}:`, e);
        return val;  // Keep as string if invalid
      }
    }
    return val;
  },
  
  // On WRITE: Stringify objects to JSON
  postprocess({ val, field }) {
    if (field.options === "JSON" && typeof val === "object" && val !== null) {
      return JSON.stringify(val);
    }
    return val;
  }
};

// ============================================================================
// TIER 1: SYSTEM FIELD RULES
// ============================================================================

coworker._applySystemFieldRules = async function(run_doc) {
  const { operation } = run_doc;
  
  // Get the correct doctype based on operation
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  
  // Get the document being processed
  const doc = run_doc.input?.data;
  if (!doc) {
    throw new Error('No document data in run_doc.input.data');
  }
  
  // Fetch schema - check target first (if already fetched), then fetch if needed
  let schema = run_doc.target?.schema;
  if (!schema) {
    schema = await this.getSchema(doctype);
    // Store it in run_doc for reuse (but not in target yet)
    run_doc._schema = schema;
  }

  // Get applicable rules, sorted by priority
  const rules = Object.entries(this._systemFieldRules || {})
    .filter(([fname, rule]) => {
      if (!rule) return false;

      if (rule.applies_to === 'all') return true;
      if (rule.applies_to === 'specific') {
        return rule.specific_doctypes?.includes(doctype);
      }
      if (rule.applies_to === 'submittable') return schema?.is_submittable;
      if (rule.applies_to === 'child_tables') return schema?.istable;

      return false;
    })
    .sort((a, b) => (a[1].priority || 100) - (b[1].priority || 100));

  // Apply each rule
  for (const [fieldname, rule] of rules) {
    // Auto-generate value
    if (rule.auto_set_on === operation || rule.auto_set_on === 'both') {
      if (rule.generator && doc[fieldname] == null) {
        doc[fieldname] = await rule.generator({ 
          doc, 
          operation, 
          doctype,
          run_doc,
          user: run_doc.owner,
          schema
        });
      } else if (rule.defaultValue && doc[fieldname] == null) {
        doc[fieldname] = rule.defaultValue;
      } else if (rule.defaultFn && doc[fieldname] == null) {
        doc[fieldname] = await rule.defaultFn({ doc, run_doc, schema });
      }
    }

    // Validate required
    if (rule.required_on === 'always' || rule.required_on === operation) {
      if (doc[fieldname] == null || doc[fieldname] === '') {
        throw new Error(`${fieldname} is required`);
      }
    }

    // Custom validation
    if (rule.validate) {
      const error = await rule.validate({ 
        val: doc[fieldname], 
        doc, 
        operation, 
        doctype,
        run_doc,
        schema
      });
      if (error) throw new Error(error);
    }
  }

  console.log(`  ✅ Tier 1: Applied ${rules.length} system field rules`);
};


// ============================================================================
// TIER 2: FIELD TYPE HANDLERS
// ============================================================================

coworker._applyFieldTypeHandlers = async function(run_doc) {
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  const doc = run_doc.input?.data;
  
  if (!doc) {
    throw new Error('No document data in run_doc.input.data');
  }
  
  // Get schema from run_doc or fetch it
  let schema = run_doc.target?.schema || run_doc._schema;
  if (!schema) {
    schema = await this.getSchema(doctype);
    run_doc._schema = schema;
  }

  if (!schema?.fields) return;

  let processedCount = 0;

  for (const field of schema.fields) {
    const handler = this._fieldHandlers?.[field.fieldtype];
    if (!handler) continue;

    const val = doc[field.fieldname];

    // Preprocess (normalize/cast)
    if (handler.preprocess) {
      doc[field.fieldname] = handler.preprocess({ 
        val, 
        field, 
        doc,
        doctype,
        run_doc
      });
    }

    // Postprocess (transform before save)
    if (handler.postprocess) {
      doc[field.fieldname] = handler.postprocess({
        val: doc[field.fieldname],
        field,
        doc,
        doctype,
        run_doc
      });
    }

    // Sync validation
    if (handler.validate) {
      const error = handler.validate(doc[field.fieldname], field);
      if (error) throw new Error(`${field.fieldname}: ${error}`);
    }

    // Async validation
    if (handler.validateAsync) {
      const error = await handler.validateAsync({
        val: doc[field.fieldname],
        field,
        doc,
        doctype,
        run_doc
      });
      if (error) throw new Error(`${field.fieldname}: ${error}`);
    }

    processedCount++;
  }

  console.log(`  ✅ Tier 2: Processed ${processedCount} fields`);
};


// ============================================================================
// TIER 3: CUSTOM FIELD RULES (PLACEHOLDER)
// ============================================================================

coworker._applyCustomFieldRules = async function(run_doc) {
  // Tier 3: Custom business rules
  // This is where you would add:
  // - Computed fields (e.g., total = quantity * rate)
  // - Cross-field validation (e.g., end_date > start_date)
  // - Domain-specific business logic
  
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  const doc = run_doc.input?.data;
  
  if (!doc) {
    throw new Error('No document data in run_doc.input.data');
  }
  
  // Example: Add custom rules here when needed
  // if (doctype === 'Invoice') {
  //   doc.total = doc.quantity * doc.rate;
  // }
  
  console.log(`  ⏭️  Tier 3: Custom rules (not implemented)`);
};


// ============================================================================
// SERIALIZATION: For WRITE operations (create/update)
// ============================================================================

coworker.processDocument = async function(run_doc) {
  const { operation } = run_doc;
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  
  // Validate we have document data
  if (!run_doc.input?.data) {
    throw new Error('run_doc.input.data is required for document processing');
  }
  
  console.log(`🔧 Processing document: ${doctype} (${operation})`);

  // All tiers receive run_doc
  await this._applySystemFieldRules(run_doc);
  await this._applyFieldTypeHandlers(run_doc);  // ← postprocess serializes
  await this._applyCustomFieldRules(run_doc);

  console.log(`✅ Document processed: ${run_doc.input.data.name || 'unnamed'}`);

  return run_doc.input.data;  // Return the processed document
};


// ============================================================================
// DESERIALIZATION: For READ operations (select/takeone)
// ============================================================================

coworker.deserializeDocument = async function(doc, doctype) {
  if (!doc || typeof doc !== 'object') return doc;
  
  // Fetch schema
  const schema = await this.getSchema(doctype);
  if (!schema?.fields) return doc;

  // Apply preprocess to each field
  for (const field of schema.fields) {
    const handler = this._fieldHandlers?.[field.fieldtype];
    if (handler?.preprocess) {
      doc[field.fieldname] = handler.preprocess({
        val: doc[field.fieldname],
        field,
        doc,
        doctype
      });
    }
  }

  return doc;
};

// Batch deserialization helper
coworker.deserializeDocuments = async function(docs, doctype) {
  if (!Array.isArray(docs) || docs.length === 0) return docs;
  
  return await Promise.all(
    docs.map(doc => this.deserializeDocument(doc, doctype))
  );
};


// ============================================================================
// CREATE HANDLER (with serialization)
// ============================================================================

coworker._handlers.create = async function (run_doc) {
  const { target_doctype, input, options } = run_doc;
  const { includeSchema = true, includeMeta = false } = options || {};

  // ✅ Accept both wrapped (input.data) and unwrapped (input) formats
  const inputData = input?.data || input;

  if (!inputData || Object.keys(inputData).length === 0) {
    throw new Error("CREATE requires input with data");
  }

  // Ensure input.data exists with doctype for 3-tier system
  run_doc.input = run_doc.input || {};
  run_doc.input.data = {
    ...inputData,
    doctype: target_doctype
  };

  // ✅ RUN THE 3-TIER ENGINE (includes serialization via postprocess)
  const processedDoc = await coworker.processDocument(run_doc);

  // Execute via adapter (processedDoc has serialized JSON strings)
  const result = await coworker._dbCreate(processedDoc);

  // ✅ DESERIALIZE the returned document
  const deserializedDoc = await coworker.deserializeDocument(
    result.data,
    target_doctype
  );

  // Store schema in target if we fetched it
  const schema = run_doc._schema || (includeSchema ? await coworker.getSchema(target_doctype) : undefined);

  return {
    success: true,
    target: {
      data: [deserializedDoc],  // ← Deserialized for user
      schema: includeSchema ? schema : undefined,
      meta: includeMeta ? { operation: 'create', created: 1 } : undefined
    }
  };
};
