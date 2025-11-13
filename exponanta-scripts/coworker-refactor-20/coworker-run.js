// === CONFIG (loaded from Configuration doctype) ===
coworker._config = {
  _resolveOperation: {
    mapping: { read: "select", insert: "create", delete: "remove" },
    inputField: "operation",
    outputField: "operation"
  },
  _resolveComponent: {
    mapping: { list: "MainGrid", form: "MainForm", chat: "MainChat" },
    inputField: "view",
    outputField: "component"
  },
  _resolveDoctype: {
    mapping: { user: "UserDoc", order: "OrderDoc" },
    inputField: "doctype",
    outputField: "doctype"
  }
};

// === INIT: Load config from database === TODO: use _exec. to load not run.implement caching
coworker._initConfig = async function() {
  const result = await this.run({
    operation: "select",
    doctype: "Configuration",
    input: { take: 1 }
  });
  
  if (result.success && result.output?.data?.[0]) {
    this._config = result.output.data[0];
  }
};

// === RESOLVER ===
coworker._resolveAll = function(op) {
  const resolved = {};
  
  // Get config mappings
  const opAliases = this._config?._resolveOperation?.mapping || {};
  const dtAliases = this._config?._resolveDoctype?.mapping || {};
  
  // Resolve operation
  resolved.operation = opAliases[op.operation?.toLowerCase()] || op.operation;
  
  // Resolve source/target doctypes using one-liner logic
  const [source_raw, target_raw] = op.from 
    ? [op.from, op.doctype] 
    : ["create","update"].includes(resolved.operation) 
      ? [null, op.doctype] 
      : [op.doctype, null];
  
  resolved.source_doctype = source_raw ? (dtAliases[source_raw?.toLowerCase()] || source_raw) : null;
  resolved.target_doctype = target_raw ? (dtAliases[target_raw?.toLowerCase()] || target_raw) : null;
  
  // Resolve other fields via config
  for (const resolverName in this._config) {
    if (resolverName.startsWith("_resolve") && resolverName !== "_resolveOperation" && resolverName !== "_resolveDoctype") {
      const resolver = this._config[resolverName];
      const inputValue = op[resolver.inputField];
      
      if (inputValue !== undefined) {
        const mapping = resolver.mapping || {};
        resolved[resolver.outputField] = mapping[inputValue?.toLowerCase()] || inputValue;
      }
    }
  }
  
  // Pass through non-resolved fields
  resolved.owner = op.owner || "system";
  
  return resolved;
};

// === ORCHESTRATION LAYER ===
coworker.run = async function(op) {
  const start = Date.now();
  
  // Validation
  if (!op?.operation) {
    return this._failEarly("operation is required", start);
  }
  
  // Resolve all fields via config
  const resolved = this._resolveAll(op);
  
  // Build run_doc (unified context)
  const run_doc = {
    // Frappe standard fields
    doctype: "Run",
    name: generateId("run"),
    creation: start,
    modified: start,
    modified_by: resolved.owner || "system",
    docstatus: 0,
    owner: resolved.owner || "system",
    
    // Operation definition
    operation: resolved.operation,
    operation_original: op.operation,
    source_doctype: resolved.source_doctype,
    target_doctype: resolved.target_doctype,
    
    // Data flow
    input: op.input || {},
    output: null,
    
    // Execution state
    status: "pending",
    success: false,
    error: null,
    duration: 0,
    
    // Hierarchy
    parent_run_id: op.options?.parentRunId || null,
    child_run_ids: [],
    
    // Flow context
    flow_id: op.flow_id || null,
    flow_template: op.flow_template || null,
    step_id: op.step_id || null,
    step_title: op.step_title || null,
    
    // Authorization
    agent: op.agent || null,
    
    // Options
    options: op.options || {},
    
    // Runtime helpers (placeholder for JSON)
    child: null
  };
  
  // STEP 1: RUNNING
  run_doc.status = "running";
  CoworkerState._updateFromRun(run_doc);
  
  // Inject child factory
  run_doc.child = (cfg) => this.run({ 
    ...cfg, 
    options: { ...cfg.options, parentRunId: run_doc.name } 
  });
  
  // Execute
  try {
    const result = await this._exec(run_doc);
    
    run_doc.output = result.output || result;
    run_doc.success = result.success === true;
    run_doc.error = result.error || null;
    
    // STEP 2: COMPLETED
    run_doc.status = "completed";
    run_doc.duration = Date.now() - start;
    run_doc.modified = Date.now();
    CoworkerState._updateFromRun(run_doc);
    
  } catch (err) {
    run_doc.success = false;
    run_doc.status = "failed";
    run_doc.error = {
      message: err.message,
      code: err.code || `${run_doc.operation?.toUpperCase() || 'OPERATION'}_FAILED`,
      stack: this.getConfig("debug") ? err.stack : undefined
    };
    
    // STEP 3: FAILED
    run_doc.duration = Date.now() - start;
    run_doc.modified = Date.now();
    CoworkerState._updateFromRun(run_doc);
  }
  
  // Render (top-level runs only)
  if (!run_doc.parent_run_id) {
    CoworkerState._renderFromRun(run_doc);
  }
  
  return run_doc;
};

// === EXECUTION ROUTER ===
coworker._exec = async function(run_doc) {
  const handler = this._handlers[run_doc.operation];
  
  if (!handler) {
    throw new Error(`Unknown operation: ${run_doc.operation}`);
  }
  
  return await handler.call(this, run_doc);
};

// === HELPER: EARLY FAILURE ===
coworker._failEarly = function(message, start) {
  return {
    doctype: "Run",
    name: generateId("run"),
    creation: start,
    status: "failed",
    success: false,
    error: { 
      message, 
      code: "VALIDATION_FAILED" 
    },
    duration: Date.now() - start
  };
};

/*Changed from old code:

✅ context.doctype → run_doc.source_doctype / run_doc.target_doctype
✅ Handlers receive full run_doc instead of partial context
✅ All handlers in single map object
✅ Called via _exec(run_doc) router
*/

// === HANDLER MAP ===
coworker._handlers = {
  
  select: async function(run_doc) {
    const { source_doctype, input, options } = run_doc;
    const {
      where,
      orderBy,
      take,
      skip,
      select,
      view = "list",
    } = input || {};
    const { includeSchema = true, includeMeta = false } = options || {};

    // Fetch schema if needed
    let schema = null;
    if (includeSchema && source_doctype !== "All" && source_doctype !== "Schema") {
      schema = await this.getSchema(source_doctype);
    }

    // Build query
    const queryDoctype = source_doctype === "All" ? "" : source_doctype;
    const pbFilter = this._buildPrismaWhere(queryDoctype, where);
    const pbSort = this._buildPrismaOrderBy(orderBy);

    const params = {};
    if (pbFilter) params.filter = pbFilter;
    if (pbSort) params.sort = pbSort;

    // Execute via adapter
    const { data, meta } = await this._dbQuery(params, take, skip);

    // Field filtering
    let filteredData = data;
    if (schema && !select) {
      const viewProp = `in_${view}_view`;
      const viewFields = schema.fields
        .filter((f) => f[viewProp])
        .map((f) => f.fieldname);
      const fields = ["name", "doctype", ...viewFields];

      filteredData = data.map((item) => {
        const filtered = {};
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
      output: {
        data: filteredData,
        schema: includeSchema ? schema : undefined,
        meta: includeMeta ? meta : undefined,
        viewConfig: { layout: view === "card" ? "grid" : "table", view },
      },
    };
  },

  create: async function(run_doc) {
    const { target_doctype, input, options } = run_doc;
    const { data } = input || {};
    const { includeSchema = true, includeMeta = false } = options || {};

    if (!data) {
      throw new Error("CREATE requires input.data");
    }

    // Fetch schema
    let schema = null;
    if (includeSchema && target_doctype !== "Schema") {
      schema = await this.getSchema(target_doctype);
    }

    // Prepare record
    const recordData = {
      ...data,
      doctype: target_doctype,
      name: data.name || this._generateName(target_doctype),
    };

    // Execute via adapter
    const result = await this._dbCreate(recordData);

    return {
      success: true,
      output: {
        data: [result.data],
        schema: includeSchema ? schema : undefined,
        meta: includeMeta ? { operation: "create", created: 1 } : undefined,
      },
    };
  },

  update: async function(run_doc) {
    const { target_doctype, input, options } = run_doc;
    const { where, data } = input || {};
    const { includeSchema = true, includeMeta = false } = options || {};

    if (!data) {
      throw new Error("UPDATE requires input.data");
    }
    if (!where) {
      throw new Error("UPDATE requires input.where");
    }

    // Fetch schema
    let schema = null;
    if (includeSchema && target_doctype !== "Schema") {
      schema = await this.getSchema(target_doctype);
    }

    // Build filter
    const queryDoctype = target_doctype === "All" ? "" : target_doctype;
    const pbFilter = this._buildPrismaWhere(queryDoctype, where);

    // Find matching records
    const { data: items } = await this._dbQuery({ filter: pbFilter });

    if (items.length === 0) {
      return {
        success: true,
        output: {
          data: [],
          schema: includeSchema ? schema : undefined,
          meta: includeMeta ? { operation: "update", updated: 0 } : undefined,
        },
      };
    }

    // Update each record
    const updates = await Promise.all(
      items.map((item) => this._dbUpdate(item.name, data))
    );

    return {
      success: true,
      output: {
        data: updates.map((u) => u.data),
        schema: includeSchema ? schema : undefined,
        meta: includeMeta
          ? { operation: "update", updated: updates.length }
          : undefined,
      },
    };
  },

  delete: async function(run_doc) {
    const { source_doctype, input, options } = run_doc;
    const { where } = input || {};
    const { includeMeta = false } = options || {};

    if (!where || Object.keys(where).length === 0) {
      throw new Error(
        "DELETE requires input.where to prevent accidental mass deletion"
      );
    }

    // Build filter
    const queryDoctype = source_doctype === "All" ? "" : source_doctype;
    const pbFilter = this._buildPrismaWhere(queryDoctype, where);

    // Find matching records
    const { data: items } = await this._dbQuery({ filter: pbFilter });

    if (items.length === 0) {
      return {
        success: true,
        output: {
          data: [],
          meta: includeMeta ? { operation: "delete", deleted: 0 } : undefined,
        },
      };
    }

    // Delete each record
    await Promise.all(items.map((item) => this._dbDelete(item.name)));

    return {
      success: true,
      output: {
        data: [],
        meta: includeMeta
          ? { operation: "delete", deleted: items.length }
          : undefined,
      },
    };
  }
  
};