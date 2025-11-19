// ============================================================================
// COWORKER-RUN.JS - Operation Execution Plugin
// Base CRUD operations: select, create, update, delete
// Version: 2.2.0
// ============================================================================

(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD
    define(["coworker"], factory);
  } else if (typeof module === "object" && module.exports) {
    // CommonJS
    module.exports = factory(require("coworker"));
  } else {
    // Browser globals
    root.coworkerRun = factory(root.coworker);
  }
})(typeof self !== "undefined" ? self : this, function (coworker) {
  "use strict";

  const coworkerRun = {
    name: "coworker-run",
    version: "1.0.0",

    install: function (coworker) {
      if (!coworker) {
        throw new Error("Coworker instance required");
      }

      // Schema cache (private to plugin)
      const schemaCache = new Map();

      // ============================================================
      // RESOLVER - Maps user input to internal operations
      // ============================================================


coworker._resolveAll = function (op) {
  const cfg = this._config;
  const resolved = {};

  // STEP 1: Resolve operation (user alias → internal name)
  resolved.operation = cfg.operationAliases[op.operation?.toLowerCase()] || op.operation;

  // STEP 2: Resolve doctype (user alias → canonical name)
  const dtMap = cfg.doctypeAliases || {};
  
  // Determine source/target based on operation
  const [source_raw, target_raw] = op.from
    ? [op.from, op.doctype]
    : ["create", "update"].includes(resolved.operation)
    ? [null, op.doctype]
    : [op.doctype, null];
  
  resolved.source_doctype = source_raw
    ? (dtMap[source_raw?.toLowerCase()] || source_raw)
    : null;
  resolved.target_doctype = target_raw
    ? (dtMap[target_raw?.toLowerCase()] || target_raw)
    : null;

  // STEP 3: Chain resolution - operation → view → component/container
  resolved.view = cfg.operationToView[resolved.operation?.toLowerCase()] ?? null;
  resolved.component = cfg.viewToComponent[resolved.view?.toLowerCase()] ?? null;
  resolved.container = cfg.viewToContainer[resolved.view?.toLowerCase()] ?? null;
  
  // STEP 4: Defaults
  resolved.owner = op.owner || "system";

  /* DEBUG LOGGING
  if (cfg.debug) {
    console.log("🔍 [_resolveAll] Resolution:", {
      original_operation: op.operation,
      resolved_operation: resolved.operation,
      source_doctype: resolved.source_doctype,
      target_doctype: resolved.target_doctype,
      resolved_view: resolved.view,
      resolved_component: resolved.component,
      resolved_container: resolved.container
    });
  }*/

  return resolved;
};

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

        /* ✅ ADD THIS DEBUG LOG
        console.log("🔍 [run()] After _resolveAll:", {
          resolved_view: resolved.view,
          resolved_component: resolved.component,
          resolved_container: resolved.container,
          op_options_render: op.options?.render,
        });*/

        // Construct run document
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

          // UI/Rendering (resolved from config or explicit)
          view: resolved.view || op.view || null,
          component: resolved.component || op.component || null,
          container: resolved.container || op.container || null,

          // Data flow
          input: op.input || {},
          output: null,

          // Execution state
          status: "running",
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

          // Runtime helpers
          child: null,
        };

        // Update state: RUNNING
        if (
          typeof CoworkerState !== "undefined" &&
          CoworkerState._updateFromRun
        ) {
          CoworkerState._updateFromRun(run_doc);
        }

        // Inject child factory for nested operations
        run_doc.child = (cfg) =>
          this.run({
            ...cfg,
            options: { ...cfg.options, parentRunId: run_doc.name },
          });

        // Execute operation
        try {
          const result = await this._exec(run_doc);

          run_doc.output = result.output || result;
          run_doc.success = result.success === true;
          run_doc.error = result.error || null;

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
      // EXECUTION ROUTER
      // ============================================================
      coworker._exec = async function (run_doc) {
        const handler = this._handlers[run_doc.operation] || this._handlers.select; //falling back select

        /*if (!handler) {
          throw new Error(`Unknown operation: ${run_doc.operation}`);
        }*/ // Modified to allow custom operations

    


        return await handler.call(this, run_doc);
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
      // ============================================================
      coworker._handlers = {
        // ════════════════════════════════════════════════════════
        // SELECT - Read operations
        // ════════════════════════════════════════════════════════
        select: async function (run_doc) {
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
          if (
            includeSchema &&
            source_doctype !== "All" &&
            source_doctype !== "Schema"
          ) {
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

          // Field filtering based on view
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

        // ════════════════════════════════════════════════════════
        // CREATE - Insert operations
        // ════════════════════════════════════════════════════════
        create: async function (run_doc) {
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
              meta: includeMeta
                ? { operation: "create", created: 1 }
                : undefined,
            },
          };
        },

        // ════════════════════════════════════════════════════════
        // UPDATE - Modify operations
        // ════════════════════════════════════════════════════════
        update: async function (run_doc) {
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
                meta: includeMeta
                  ? { operation: "update", updated: 0 }
                  : undefined,
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

        // ════════════════════════════════════════════════════════
        // DELETE - Remove operations
        // ════════════════════════════════════════════════════════
        delete: async function (run_doc) {
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
                meta: includeMeta
                  ? { operation: "delete", deleted: 0 }
                  : undefined,
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
        },
      };

      // ============================================================
      // QUERY BUILDERS
      // ============================================================

      coworker._buildPrismaWhere = function (doctype, where) {
        const parts = [];

        if (doctype) {
          parts.push(`doctype = "${doctype}"`);
        }

        if (where) {
          const whereParts = this._buildWhereClause(where);
          if (whereParts) {
            parts.push(`(${whereParts})`);
          }
        }

        return parts.length > 0 ? parts.join(" && ") : undefined;
      };

      coworker._buildWhereClause = function (where) {
        if (!where || typeof where !== "object") return "";

        const parts = [];

        for (const [key, value] of Object.entries(where)) {
          // Logical operators
          if (key === "OR") {
            if (!Array.isArray(value) || value.length === 0) continue;
            const orParts = value
              .map((condition) => this._buildWhereClause(condition))
              .filter(Boolean);
            if (orParts.length > 0) {
              parts.push(`(${orParts.join(" || ")})`);
            }
            continue;
          }

          if (key === "AND") {
            if (!Array.isArray(value) || value.length === 0) continue;
            const andParts = value
              .map((condition) => this._buildWhereClause(condition))
              .filter(Boolean);
            if (andParts.length > 0) {
              parts.push(`(${andParts.join(" && ")})`);
            }
            continue;
          }

          if (key === "NOT") {
            const notClause = this._buildWhereClause(value);
            if (notClause) {
              parts.push(`!(${notClause})`);
            }
            continue;
          }

          // Regular field
          const fieldPath = this._getFieldPath(key);

          // Simple equality
          if (value === null || value === undefined) {
            parts.push(`${fieldPath} = null`);
            continue;
          }

          if (typeof value === "string") {
            parts.push(`${fieldPath} = "${value}"`);
            continue;
          }

          if (typeof value === "number" || typeof value === "boolean") {
            parts.push(`${fieldPath} = ${value}`);
            continue;
          }

          // Operators
          if (typeof value === "object" && !Array.isArray(value)) {
            for (const [op, opValue] of Object.entries(value)) {
              switch (op) {
                case "equals":
                  parts.push(
                    typeof opValue === "string"
                      ? `${fieldPath} = "${opValue}"`
                      : `${fieldPath} = ${opValue}`
                  );
                  break;
                case "contains":
                  parts.push(`${fieldPath} ~ "${opValue}"`);
                  break;
                case "startsWith":
                  parts.push(`${fieldPath} ~ "^${opValue}"`);
                  break;
                case "endsWith":
                  parts.push(`${fieldPath} ~ "${opValue}$"`);
                  break;
                case "gt":
                  parts.push(`${fieldPath} > ${opValue}`);
                  break;
                case "gte":
                  parts.push(`${fieldPath} >= ${opValue}`);
                  break;
                case "lt":
                  parts.push(`${fieldPath} < ${opValue}`);
                  break;
                case "lte":
                  parts.push(`${fieldPath} <= ${opValue}`);
                  break;
                case "in":
                  if (Array.isArray(opValue) && opValue.length > 0) {
                    const inValues = opValue.map((v) =>
                      typeof v === "string"
                        ? `${fieldPath} = "${v}"`
                        : `${fieldPath} = ${v}`
                    );
                    parts.push(`(${inValues.join(" || ")})`);
                  }
                  break;
                case "notIn":
                  if (Array.isArray(opValue) && opValue.length > 0) {
                    const notInValues = opValue.map((v) =>
                      typeof v === "string"
                        ? `${fieldPath} != "${v}"`
                        : `${fieldPath} != ${v}`
                    );
                    parts.push(`(${notInValues.join(" && ")})`);
                  }
                  break;
                case "not":
                  if (opValue === null) {
                    parts.push(`${fieldPath} != null`);
                  } else if (typeof opValue === "string") {
                    parts.push(`${fieldPath} != "${opValue}"`);
                  } else if (typeof opValue === "object") {
                    const notClause = this._buildWhereClause({
                      [key]: opValue,
                    });
                    if (notClause) parts.push(`!(${notClause})`);
                  } else {
                    parts.push(`${fieldPath} != ${opValue}`);
                  }
                  break;
              }
            }
          }
        }

        return parts.join(" && ");
      };

      coworker._buildPrismaOrderBy = function (orderBy) {
        if (!orderBy) return undefined;

        if (Array.isArray(orderBy)) {
          return orderBy
            .map((obj) => {
              const [field, order] = Object.entries(obj)[0];
              const fieldPath = this._getFieldPath(field);
              return order === "desc" ? `-${fieldPath}` : `+${fieldPath}`;
            })
            .join(",");
        }

        return Object.entries(orderBy)
          .map(([field, order]) => {
            const fieldPath = this._getFieldPath(field);
            return order === "desc" ? `-${fieldPath}` : `+${fieldPath}`;
          })
          .join(",");
      };

      coworker._getFieldPath = function (fieldName) {
        if (["doctype", "name", "id"].includes(fieldName)) {
          return fieldName;
        }
        return `data.${fieldName}`;
      };

      // ============================================================
      // UTILITIES
      // ============================================================

      coworker._generateName = function (doctype) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${doctype.toLowerCase()}-${timestamp}-${random}`;
      };

      // ============================================================
      // ADAPTER WRAPPERS (Delegate to pb)
      // ============================================================

      coworker._dbQuery = async function (params, take, skip) {
        if (!pb || typeof pb._dbQuery !== "function") {
          throw new Error(
            "pb._dbQuery not found. Load pb-adapter files first."
          );
        }
        return await pb._dbQuery(params, take, skip);
      };

      coworker._dbCreate = async function (data) {
        if (!pb || typeof pb._dbCreate !== "function") {
          throw new Error(
            "pb._dbCreate not found. Load pb-adapter files first."
          );
        }
        return await pb._dbCreate(data);
      };

      coworker._dbUpdate = async function (id, data) {
        if (!pb || typeof pb._dbUpdate !== "function") {
          throw new Error(
            "pb._dbUpdate not found. Load pb-adapter files first."
          );
        }
        return await pb._dbUpdate(id, data);
      };

      coworker._dbDelete = async function (id) {
        if (!pb || typeof pb._dbDelete !== "function") {
          throw new Error(
            "pb._dbDelete not found. Load pb-adapter files first."
          );
        }
        return await pb._dbDelete(id);
      };

      // ============================================================
      // SCHEMA MANAGEMENT
      // ============================================================

      coworker.getSchema = async function (doctype) {
        if (schemaCache.has(doctype)) {
          return schemaCache.get(doctype);
        }

        try {
          const result = await this.run({
            operation: "select",
            doctype: "Schema",
            input: {
              where: { _schema_doctype: doctype },
              take: 1,
            },
            options: { includeSchema: false },
          });

          if (
            !result.success ||
            !result.output?.data ||
            result.output.data.length === 0
          ) {
            console.warn(`Schema not found for: ${doctype}`);
            return null;
          }

          const schema = result.output.data[0];
          schemaCache.set(doctype, schema);
          return schema;
        } catch (error) {
          console.error(`Error fetching schema for ${doctype}:`, error);
          return null;
        }
      };

      coworker.clearSchemaCache = function () {
        schemaCache.clear();
        console.log("🗑️ Schema cache cleared");
      };

      // ============================================================
      // BATCH & PARALLEL OPERATIONS
      // ============================================================

      coworker.runBatch = async function (configs) {
        if (!Array.isArray(configs)) {
          throw new Error("runBatch() requires an array of configs");
        }

        const results = [];
        for (const config of configs) {
          const result = await this.run(config);
          results.push(result);
          if (config.stopOnError && !result.success) break;
        }
        return results;
      };

      coworker.runParallel = async function (configs) {
        if (!Array.isArray(configs)) {
          throw new Error("runParallel() requires an array of configs");
        }
        const promises = configs.map((config) => this.run(config));
        return await Promise.all(promises);
      };

      coworker.runWithTimeout = async function (config, timeout = 30000) {
        if (!config || typeof config !== "object") {
          throw new Error("runWithTimeout() requires a config object");
        }
        return Promise.race([
          this.run(config),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Operation timeout")), timeout)
          ),
        ]);
      };

      coworker.dryRun = async function (config) {
        if (!config || typeof config !== "object") {
          throw new Error("dryRun() requires a config object");
        }

        const context = {
          id: `run-${Date.now()}`,
          timestamp: Date.now(),
          operation: config.operation,
          doctype: config.doctype || null,
          status: "validating",
          dryRun: true,
          success: false,
          error: null,
        };

        try {
          if (!context.operation) {
            throw new Error("operation is required");
          }

          const validOps = ["select", "create", "update", "delete"];
          if (!validOps.includes(context.operation)) {
            throw new Error(`Invalid operation: ${context.operation}`);
          }

          context.status = "valid";
          context.success = true;
          context.output = {
            valid: true,
            message: `Operation '${context.operation}' is valid`,
          };
        } catch (error) {
          context.status = "invalid";
          context.success = false;
          context.error = {
            message: error.message,
            code: "VALIDATION_FAILED",
          };
        }

        return context;
      };

      // ============================================================
      // INSTALLATION COMPLETE
      // ============================================================

      console.log("✅ coworker-run plugin installed");
      console.log("   • coworker.run(config)");
      console.log("   • coworker.runBatch(configs)");
      console.log("   • coworker.runParallel(configs)");
      console.log("   • coworker.runWithTimeout(config, timeout)");
      console.log("   • coworker.dryRun(config)");
      console.log("   • coworker.getSchema(doctype)");
      console.log("   • coworker.clearSchemaCache()");
    },
  };

  // Auto-install if coworker is available
  if (coworker && coworker.use) {
    coworkerRun.install(coworker);
  }

  return coworkerRun;
});

// ============================================================================
// END OF COWORKER-RUN.JS
// ============================================================================
