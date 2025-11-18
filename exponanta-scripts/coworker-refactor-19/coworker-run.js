// ============================================================================
// COWORKER-RUN.JS - Runtime + Query + Schema + CRUD (All-in-One)
// Self-contained
// Version: 2.1.0
// ============================================================================

(function (root, factory) {
  // Universal Module Definition (UMD)
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    const globalScope =
      typeof self !== "undefined"
        ? self
        : typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
        ? global
        : globalThis;
    globalScope.coworkerRun = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

/**
 * Executes a coworker operation and acts as the single source of truth
 * for updating the global CoworkerState.
 *
 * @param {object} config - The configuration for the run.
 * @returns {Promise<object>} A promise that resolves with the final context of the run.
 */


  const coworkerRun = {
    name: "coworker-run",
    version: "1.0.0",

    async install(coworker) {
      console.log("📦 Installing coworker-run plugin...");

      // Schema cache
      const schemaCache = new Map();

      // ========================================================================
      // PUBLIC API: CORE EXECUTION
      // ========================================================================

      /**
       * Execute a run operation
       * @param {object} config - Run configuration
       * @returns {Promise<object>} Run context with results
       */
coworker.run = async function (config) {
  // Create minimal context for early errors
  const context = {
    id: generateId('run'),
    timestamp: Date.now(),
    status: "pending",
    duration: 0,
    success: false,
    error: null,
  };

  const startTime = Date.now();

  try {
    // Validation INSIDE try-catch for consistent error handling
    if (!config || typeof config !== "object") {
      throw new Error("run() requires a config object");
    }

    if (!config.operation) {
      throw new Error("operation is required");
    }

    // Populate full context after validation
    Object.assign(context, {
      operation: config.operation,
      
      // Operation Targets (semantic naming with fallback)
      doctype: config.doctype || config.from || config.into || config.template || null,
      from: config.from || config.doctype || null,
      into: config.into || config.doctype || null,
      template: config.template || null,

      // Data Flow
      flow: config.flow || null,
      input: config.input || null,
      output: null,

      // Relationships (explicit for chaining)
      parentRunId: config.options?.parentRunId || null,
      childRunIds: [],
      chainId: config.options?.chainId || null,

      // Authorization
      owner: config.owner || this.getConfig("defaultUser", "system"),
      agent: config.agent || null,

      // Execution Control
      options: config.options || {},
    });

    context.status = "running";
    await this.emit("coworker:before:run", context);

    // Resolve operation aliases
    const operationAliases = {
      'read': 'select',
      'insert': 'create'
    };
    const resolvedOp = operationAliases[context.operation.toLowerCase()] || context.operation;
    
    // Dynamic handler lookup
    const handlerName = `_handle${capitalize(resolvedOp)}`;
    let result;
    
    if (typeof this[handlerName] === 'function') {
      result = await this[handlerName](context);
    } else {
      // Fallback to event system for plugins
      const results = await this.emit(`coworker:run:${context.operation}`, context);
      result = results.find((r) => r !== null && r !== undefined);
    }

    if (result) {
      context.output = result.output || result;
      context.success = result.success === true;
      context.error = result.error || null;
    } else {
      throw new Error(`No handler for operation: ${context.operation}`);
    }

    context.status = "completed";
    await this.emit("coworker:after:run", context);
    
  } catch (error) {
    context.status = "failed";
    context.success = false;
    context.error = {
      message: error.message,
      code: error.code || `${context.operation?.toUpperCase() || 'RUN'}_FAILED`,
      details: {
        ...(error.details || {}),
        operation: context.operation,
        doctype: context.doctype,
        runId: context.id,
        flowId: context.options?.flowId,
        stepId: context.options?.stepId,
        ...(error.context && { errorContext: error.context })
      },
      ...(this.getConfig("debug") && { stack: error.stack }),
    };
    await this.emit("coworker:error:run", { context, error });
    
  } finally {
    context.duration = Date.now() - startTime;
  }

  return context;
};

      /**
       * Batch run multiple operations sequentially
       */
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

      /**
       * Run operations in parallel
       */
      coworker.runParallel = async function (configs) {
        if (!Array.isArray(configs)) {
          throw new Error("runParallel() requires an array of configs");
        }
        const promises = configs.map((config) => this.run(config));
        return await Promise.all(promises);
      };

      /**
       * Run with timeout
       */
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

      /**
       * Dry run - validate without executing
       */
      coworker.dryRun = async function (config) {
        if (!config || typeof config !== "object") {
          throw new Error("dryRun() requires a config object");
        }

        const context = {
          id: generateId('run'),
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

          await this.emit("coworker:validate:run", context);

          const validOps = ["select", "create", "update", "delete"];
          const handlers =
            this._hooks.get(`coworker:run:${context.operation}`) || [];

          if (!validOps.includes(context.operation) && handlers.length === 0) {
            throw new Error(`No handler for operation: ${context.operation}`);
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

      // ========================================================================
      // PUBLIC API: SCHEMA MANAGEMENT
      // ========================================================================

      // ========================================================================
      // PUBLIC API: SCHEMA MANAGEMENT
      // ========================================================================

      /**
       * Get schema for a doctype (cached)
       */
      coworker.getSchema = async function (doctype) {
        if (schemaCache.has(doctype)) {
          return schemaCache.get(doctype);
        }

        try {
          // ✅ Use coworker.run() to fetch schema (self-referential!)
          const result = await this.run({
            operation: "select",
            doctype: "Schema",
            input: {
              where: { _schema_doctype: doctype },
              take: 1,
            },
            options: { includeSchema: false }, // ← CRITICAL: Don't fetch schema for Schema!
          });

          // ✅ FIX: Check result structure correctly
          if (
            !result.success ||
            !result.output?.data ||
            result.output.data.length === 0
          ) {
            console.warn(`Schema not found for: ${doctype}`);
            return null;
          }

          // ✅ FIX: Extract schema from result.output.data (not result.data)
          const schema = result.output.data[0];

          // Cache it
          schemaCache.set(doctype, schema);
          return schema;
        } catch (error) {
          console.error(`Error fetching schema for ${doctype}:`, error);
          return null;
        }
      };

      /**
       * Clear schema cache
       */
      coworker.clearSchemaCache = function () {
        schemaCache.clear();
        console.log("🗑️ Schema cache cleared");
      };

      // ========================================================================
      // PRIVATE: CRUD HANDLERS
      // ========================================================================

      /**
       * Handle SELECT operations
       */
      coworker._handleSelect = async function (context) {
        const { doctype, input, options } = context;
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
        if (includeSchema && doctype !== "All" && doctype !== "Schema") {
          schema = await this.getSchema(doctype);
        }

        // Build query
        const queryDoctype = doctype === "All" ? "" : doctype;
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
      };

      /**
       * Handle CREATE operations
       */
      coworker._handleCreate = async function (context) {
        const { doctype, input, options } = context;
        const { data } = input || {};
        const { includeSchema = true, includeMeta = false } = options || {};

        if (!data) {
          throw new Error("CREATE requires input.data");
        }

        // Fetch schema
        let schema = null;
        if (includeSchema && doctype !== "Schema") {
          schema = await this.getSchema(doctype);
        }

        // Prepare record
        const recordData = {
          ...data,
          doctype,
          name: data.name || this._generateName(doctype),
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
      };

      /**
       * Handle UPDATE operations
       */
      coworker._handleUpdate = async function (context) {
        const { doctype, input, options } = context;
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
        if (includeSchema && doctype !== "Schema") {
          schema = await this.getSchema(doctype);
        }

        // Build filter
        const queryDoctype = doctype === "All" ? "" : doctype;
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
      };

      /**
       * Handle DELETE operations
       */
      coworker._handleDelete = async function (context) {
        const { doctype, input, options } = context;
        const { where } = input || {};
        const { includeMeta = false } = options || {};

        if (!where || Object.keys(where).length === 0) {
          throw new Error(
            "DELETE requires input.where to prevent accidental mass deletion"
          );
        }

        // Build filter
        const queryDoctype = doctype === "All" ? "" : doctype;
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
      };

      // ========================================================================
      // PRIVATE: QUERY BUILDERS
      // ========================================================================

      /**
       * Build PocketBase filter from Prisma where clause
       */
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

      /**
       * Build where clause recursively
       */
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

      /**
       * Build PocketBase sort from Prisma orderBy
       */
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

      /**
       * Get field path (handles nested data structure)
       */
      coworker._getFieldPath = function (fieldName) {
        if (["doctype", "name", "id"].includes(fieldName)) {
          return fieldName;
        }
        return `data.${fieldName}`;
      };

      // ========================================================================
      // PRIVATE: UTILITIES
      // ========================================================================

      /**
       * Generate unique UUID
       */
      coworker._generateUUID = function () {
        return (
          "run-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9)
        );
      };

      /**
       * Generate unique name for record
       */
      coworker._generateName = function (doctype) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${doctype.toLowerCase()}-${timestamp}-${random}`;
      };

      // ========================================================================
      // PRIVATE: ADAPTER WRAPPERS
      // ========================================================================

      // ========================================================================
      // PRIVATE: ADAPTER WRAPPERS (Delegate to pb)
      // ========================================================================

      /**
       * Adapter query wrapper - delegates to pb._dbQuery()
       */
      coworker._dbQuery = async function (params, take, skip) {
        if (!pb || typeof pb._dbQuery !== "function") {
          throw new Error(
            "pb._dbQuery not found. Load pb-adapter files first."
          );
        }
        return await pb._dbQuery(params, take, skip);
      };

      /**
       * Adapter create wrapper - delegates to pb._dbCreate()
       */
      coworker._dbCreate = async function (data) {
        if (!pb || typeof pb._dbCreate !== "function") {
          throw new Error(
            "pb._dbCreate not found. Load pb-adapter files first."
          );
        }
        return await pb._dbCreate(data);
      };

      /**
       * Adapter update wrapper - delegates to pb._dbUpdate()
       */
      coworker._dbUpdate = async function (id, data) {
        if (!pb || typeof pb._dbUpdate !== "function") {
          throw new Error(
            "pb._dbUpdate not found. Load pb-adapter files first."
          );
        }
        return await pb._dbUpdate(id, data);
      };

      /**
       * Adapter delete wrapper - delegates to pb._dbDelete()
       */
      coworker._dbDelete = async function (id) {
        if (!pb || typeof pb._dbDelete !== "function") {
          throw new Error(
            "pb._dbDelete not found. Load pb-adapter files first."
          );
        }
        return await pb._dbDelete(id);
      };
      // ========================================================================
      // INSTALLATION COMPLETE
      // ========================================================================

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

  return coworkerRun;
});

if (typeof coworker !== "undefined" && coworker.use) {
  // Call install directly and synchronously
  coworkerRun.install(coworker);
  console.log("✅ coworker-run installed synchronously");
}
// ============================================================================
// END OF COWORKER-RUN.JS
// ============================================================================
