/* the idea was to implement js-based document manager based json documents and schemas from Frappe
* Used core functions run(operation, doctype, input, view, options) for key CRUD operations over documents
* the run_doc is center of truth, the UI in React is just rendeding run_doc over _render, data is pushed there
* the challenges: 
* the nessesity of complex controler for run.update
* the nessestiry of granular states and state machine for the system. 
current code: */
// ============================================================================
// COWORKER-RUN.JS - Operation Execution Plugin
// Base CRUD operations: select, create, update, delete
// Version: 4.1.0 - WORKING WITH CONTROLLER
// ============================================================================



      // ============================================================
      // ORCHESTRATION LAYER - Main run() function
      // ============================================================
      coworker.run = async function (op) {
        const start = Date.now();

        // Validation
        if (!op?.operation) {
          return this._failEarly("operation is required", start);
        }

        // Resolve all fields via config
        const resolved = this._resolveAll(op);

        // Merge options: config defaults + user overrides
        const mergedOptions = { ...resolved.options, ...op.options };

        // Construct run document
        const run_doc = {
          // Frappe standard fields
          doctype: "Run",
          name: generateId("run"),
          creation: start,
          modified: start,
          operation_key: JSON.stringify(op),    //added operation_key
          modified_by: resolved.owner || "system",
          docstatus: 0,
          owner: resolved.owner || "system",

          //compatibility with univeral doctype like Adapter
          config: op.config || {}, // ADDED config
          functions: op.functions || {}, // ADDED functions

          // Operation definition
          operation: resolved.operation,
          operation_original: op.operation,
          source: op.source || null, // ADDED use this for mutations of original + input
          source_doctype: resolved.source_doctype,
          target: op.target || null, // ADDED use this instead target
          target_doctype: resolved.target_doctype,

          // UI/Rendering (explicit takes priority over resolved)
          view: "view" in op ? op.view : resolved.view,
          component: "component" in op ? op.component : resolved.component,
          container: "container" in op ? op.container : resolved.container,

          // DATA - Delta architecture
          query: op.query || {},
          input: op.input || {},
          target: null,

          // Execution state
          state: {}, //ADDED state
          status: "running",
          success: false,
          error: null,
          duration: 0,

          // Hierarchy
          parent_run_id: mergedOptions.parentRunId || null,
          child_run_ids: [],

          // Flow context
          flow_id: op.flow_id || null,
          flow_template: op.flow_template || null,
          step_id: op.step_id || null,
          step_title: op.step_title || null,

          // Authorization
          agent: op.agent || null,

          // Options
          options: mergedOptions,

          // Runtime helpers
          child: null,
        };

        // Initialize draft mode
        if (run_doc.options.draft) {
          run_doc.input = run_doc.input || {};

          // For takeone with query, preserve the name for updates
          if (run_doc.query.where?.name && !run_doc.input.name) {
            run_doc.input.name = run_doc.query.where.name;
          }
        }

        // Define run.doc getter (computed merge of original + delta)
        Object.defineProperty(run_doc, "doc", {
          get() {
            const original = this.target?.data?.[0] || {};
            const delta = this.input || {};
            return this.options.draft ? { ...original, ...delta } : original;
          },
        });

        // Update state: RUNNING
        if (
          typeof CoworkerState !== "undefined" &&
          CoworkerState._updateFromRun
        ) {
          CoworkerState._updateFromRun(run_doc);
        }

        // ✅ IMPROVED: Child factory with context inheritance & tracking https://claude.ai/chat/c50f00d4-2043-404b-ad94-6e6d204da92e
        run_doc.child = async (cfg) => {
          const childRun = await coworker.run({
            // Spread user config first
            ...cfg,

            // ✅ Inherit parent context (unless explicitly overridden)
            flow_id: cfg.flow_id ?? run_doc.flow_id,
            flow_template: cfg.flow_template ?? run_doc.flow_template,
            agent: cfg.agent ?? run_doc.agent,

            // Merge options with parent context
            options: {
              // Parent context defaults
              adapter: run_doc.options?.adapter,

              // User overrides
              ...cfg.options,

              // ✅ Always set parentRunId
              parentRunId: run_doc.name,
            },
          });

          // ✅ Track bidirectional relationship
          if (!run_doc.child_run_ids.includes(childRun.name)) {
            run_doc.child_run_ids.push(childRun.name);

            // Update state if tracking is active
            if (
              typeof CoworkerState !== "undefined" &&
              CoworkerState._updateFromRun
            ) {
              CoworkerState._updateFromRun(run_doc);
            }
          }

          return childRun;
        };

        // Execute operation
        try {
          const result = await this._exec(run_doc);

          run_doc.target = result.target || result;
          run_doc.success = result.success === true;
          run_doc.error = result.error || null;

          // Copy doctype to input if missing (for saves)
          if (run_doc.options.draft && run_doc.target?.data?.[0]?.doctype) {
            if (!run_doc.input.doctype) {
              run_doc.input.doctype = run_doc.target.data[0].doctype;
            }
          }

          // Update state: COMPLETED
          run_doc.status = "completed";
          run_doc.duration = Date.now() - start;
          run_doc.modified = Date.now();

          if (
            typeof CoworkerState !== "undefined" &&
            CoworkerState._updateFromRun
          ) {
            CoworkerState._updateFromRun(run_doc);
          }
        } catch (err) {
          run_doc.success = false;
          run_doc.status = "failed";
          run_doc.error = {
            message: err.message,
            code:
              err.code ||
              `${run_doc.operation?.toUpperCase() || "OPERATION"}_FAILED`,
            stack:
              this.getConfig && this.getConfig("debug") ? err.stack : undefined,
          };

          // Update state: FAILED
          run_doc.duration = Date.now() - start;
          run_doc.modified = Date.now();

          if (
            typeof CoworkerState !== "undefined" &&
            CoworkerState._updateFromRun
          ) {
            CoworkerState._updateFromRun(run_doc);
          }
        }

        // Rendering (if system available)
        if (typeof this._render === "function") {
          this._render(run_doc);
        }

        return run_doc;
      };

      // ============================================================
      // EXECUTION ROUTER - Route through controller
      // ============================================================
      coworker._exec = async function (run_doc) {
        const previousAdapter = pb._currentAdapter;
        if (run_doc.options?.adapter) {
          pb.useAdapter(run_doc.options.adapter);
        }

        try {
          // ✅ A1: Route through controller (all operations)
          return await this.controller.execute(run_doc);
        } finally {
          pb.useAdapter(previousAdapter);
        }
      };

      // ============================================================
      // HELPER: EARLY FAILURE
      // ============================================================
      coworker._failEarly = function (message, start) {
        return {
          doctype: "Run",
          name: generateId("run"),
          creation: start,
          status: "failed",
          success: false,
          error: {
            message,
            code: "VALIDATION_FAILED",
          },
          duration: Date.now() - start,
        };
      };

      // ============================================================
      // CRUD HANDLERS (select, create, update, delete)
      // ✅ B2: All use coworker.* instead of this.*
      // ============================================================
      coworker._handlers = {
        // ════════════════════════════════════════════════════════
        // SELECT - Read operations
        // ════════════════════════════════════════════════════════
        select: async function (run_doc) {
          const { source_doctype, query, options } = run_doc;
          const { where, orderBy, take, skip, select } = query || {};
          const view = run_doc.view || query.view || "list";  //working const view = query.view || "list";
          const { includeSchema = true, includeMeta = false } = options || {};

          // partly deleted
          

            filteredData = data.map((item) => {
              const filtered = {
                doctype: source_doctype, // ✅ Always set doctype from source_doctype
              };
              fields.forEach((field) => {
                if (item.hasOwnProperty(field)) {
                  filtered[field] = item[field];
                }
              });
              return filtered;
            });
          } else if (select && Array.isArray(select)) {
            filteredData = data.map((item) => {
              const filtered = {};
              select.forEach((field) => {
                if (item.hasOwnProperty(field)) {
                  filtered[field] = item[field];
                }
              });
              return filtered;
            });
          }

          return {
            success: true,
            target: {
              data: filteredData,
              schema: includeSchema ? schema : undefined,
              meta: includeMeta ? meta : undefined,
              viewConfig: { layout: view === "card" ? "grid" : "table", view },
            },
          };
        },

        // ════════════════════════════════════════════════════════
        // TAKEONE - Single record (enforces take: 1)
        // ════════════════════════════════════════════════════════
        takeone: async function (run_doc) {
          if (!run_doc.query) run_doc.query = {};
          run_doc.query.take = 1;
          run_doc.query.view = "form";



          // partly deleted
          
          if (result.success && result.target?.data?.length === 0) {
            return {
              success: false,
              error: {
                message: "Record not found",
                code: "NOT_FOUND",
              },
            };
          }

          return result;
        },

        // ════════════════════════════════════════════════════════
        // CREATE - Insert operations (CORRECTED)
        // ════════════════════════════════════════════════════════
        // ✅ Updated (flexible)
        create: async function (run_doc) {
          const { target_doctype, input, options } = run_doc;
          const {
            includeSchema = true,
            includeMeta = false,
            applyRBAC = true,
          } = options || {};

          const inputData = input?.data || input;

        /*partly deleted*/
              // Continue without RBAC if it fails
            }
          }

          // ✅ Fetch schema if needed
          let schema = null;
          if (includeSchema) {
            schema = await coworker.getSchema(target_doctype);
          }

          // ✅ Use proper abstraction layer (goes through adapter switch)
          const result = await coworker._dbCreate(recordData);

          console.log("✅ CREATE success:", result.data.name);

          return {
            success: true,
            target: {
              data: [result.data],
              schema: includeSchema ? schema : undefined,
              meta: includeMeta
                ? {
                    operation: "create",
                    created: 1,
                    id: result.meta?.id,
                    name: result.data.name,
                  }
                : undefined,
            },
          };
        },

        // ════════════════════════════════════════════════════════
        // HANDLER - Just Execution (No Logic) https://claude.ai/chat/a92d380b-8725-40c1-98f2-2486fc9ba997
        // ════════════════════════════════════════════════════════
        update: async function (run_doc) {
  const { source_doctype, target_doctype, input, query, options } = run_doc;  // ← Add target_doctype here
  const inputData = input?.data || input;
  const where = query?.where || query;

  const { includeSchema = true, includeMeta = false } = options || {};
  const doctype = source_doctype || target_doctype;  // ← Now target_doctype is defined

  /*partly deleted*/

  

      // ✅ SERIALIZE: Create temporary run_doc for processing
      const tempRunDoc = {
        operation: "update",
        target_doctype: doctype,  // ← Use target_doctype (field handlers check this)
        input: { data: merged },
        target: { schema },
      };

      // Apply field handlers (serialization)
      await coworker._applyFieldTypeHandlers(tempRunDoc);

      // Use processed data
      const result = await coworker._dbUpdate(
        item.name || item.id,
        tempRunDoc.input.data,
      );

      // ✅ DESERIALIZE result
      return {
        ...result,
        data: await coworker.deserializeDocument(
          result.data,
          doctype,  // ← Use doctype
        ),
      };
    }),
  );

  return {
    success: true,
    target: {
      data: updates.map((u) => u.data),
      schema,
      meta: { operation: "update", updated: updates.length },
    },
  };
},
/* 
* PROPOSAL
* - for all atomic change inside 1 run to introduce concept of actions(transition over minimum step) and action state machine
* - all change of documents and key system variables (which are also in schema or doctyp) should be in this state machine
* - implement actions part of  run.input (there is mutating). Make it as mosre general 
* then just input { fieldname: value }, can be array of variables
* the goal is to have NEW chained controller with univeral controller.exectute(run_doc, action) for all actions that assumes that we are 
* in the context of 1 run.update where input is mutated 

* 2 modes of execution: default pipleline (from fsm) chains, custom execution, where the action consequesnce is 
* imporant constants: context is run.update over 1 document that has schema

DRAFT PROPOSED FSM */
const DocumentFSM = {
  runtime: { docstatus: 0, dirty: false, operation: "idle" },
  
  schema: {
    docstatus: { options: [0, 1, 2], transitions: { 0: [1], 1: [2] } },
    dirty: { options: [true, false], transitions: { false: [true], true: [false] } },
    operation: {
      options: ["idle", "saving", "submitting", "cancelling"],
      transitions: {
        idle: ["saving", "submitting", "cancelling"],
        saving: ["idle"],
        submitting: ["idle"],
        cancelling: ["idle"]
      }
    }
  },
  
  rules: {
    canTransition(variable, from, to, runtime) {
      // Static check
      if (!DocumentFSM.schema[variable]?.transitions[from]?.includes(to)) return false;
      
      // Cross-variable rules
      if (variable === "docstatus" && to === 1 && runtime.dirty) return false;
      if (variable === "dirty" && to === true && runtime.docstatus !== 0) return false;
      if (variable === "operation") {
        if (to === "saving" && (runtime.docstatus !== 0 || !runtime.dirty)) return false;
        if (to === "submitting" && (runtime.docstatus !== 0 || runtime.dirty)) return false;
        if (to === "cancelling" && runtime.docstatus !== 1) return false;
      }
      
      return true;
    }
  },
  
  transition(variable, newValue) {
    const currentValue = this.runtime[variable];
    if (currentValue === newValue) return { success: true, noop: true };
    
    if (!this.rules.canTransition(variable, currentValue, newValue, this.runtime)) {
      return { success: false, error: `Cannot transition ${variable}` };
    }
    
    this.runtime[variable] = newValue;
    return { success: true };
  },
  
  // ✅ Direct methods - easy to read, debug, maintain
  async save(run) {
    // Pre-check using rules
    if (!this.rules.canTransition('operation', this.runtime.operation, 'saving', this.runtime)) {
      return { success: false, error: "Cannot save" };
    }
    
    this.transition('operation', 'saving');
    
    const merged = { ...run.target.data[0], ...run.input };
    const result = await coworker._dbUpdate({
      doctype: run.source_doctype,
      filter: { name: merged.name },
      data: merged
    });
    
    if (result.success) {
      run.target.data[0] = result.data;
      run.input = {};
      this.transition('operation', 'idle');
      this.transition('dirty', false);
      return { success: true };
    } else {
      run._saveError = result.error;
      this.transition('operation', 'idle');
      return { success: false, error: result.error };
    }
  },
  
  async submit(run) {
    if (!this.rules.canTransition('operation', this.runtime.operation, 'submitting', this.runtime)) {
      return { success: false, error: "Cannot submit" };
    }
    
    this.transition('operation', 'submitting');
    
    const result = await coworker._dbUpdate({
      doctype: run.source_doctype,
      filter: { name: run.target.data[0].name },
      data: { docstatus: 1 }
    });
    
    if (result.success) {
      run.target.data[0].docstatus = 1;
      this.transition('docstatus', 1);
      this.transition('operation', 'idle');
      return { success: true };
    } else {
      run._submitError = result.error;
      this.transition('operation', 'idle');
      return { success: false, error: result.error };
    }
  }
};

/*CURRENT CONTROLLER (BAD)*/
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

    // ✅ partly deleted
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


/* Ask me questions to finilize the requirements and design.  */



