// ============================================================================
// COWORKER-RUN.JS - Operation Execution Plugin
// Base CRUD operations: select, create, update, delete
// Version: 4.1.0 - WORKING WITH CONTROLLER
// ============================================================================

(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["coworker"], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(require("coworker"));
  } else {
    root.coworkerRun = factory(root.coworker);
  }
})(typeof self !== "undefined" ? self : this, function (coworker) {
  "use strict";

  const coworkerRun = {
    name: "coworker-run",
    version: "4.1.0",

    install: function (coworker) {
      if (!coworker) {
        throw new Error("Coworker instance required");
      }

      // ============================================================
      // SCHEMA CACHE - Global (accessible everywhere)
      // ============================================================
      coworker._schemaCache = new Map();

      // ============================================================
      // RESOLVER - Maps user input to internal operations
      // ============================================================

      coworker._resolveAll = function (op) {
        const cfg = this._config;
        const resolved = {};

        // STEP 1: Resolve operation (user alias → internal name)
        resolved.operation =
          cfg.operationAliases[op.operation?.toLowerCase()] || op.operation;

        // STEP 2: Resolve doctype (user alias → canonical name)
        const dtMap = cfg.doctypeAliases || {};

        // ✅ FIX: Check if user provided source_doctype/target_doctype directly
        if (op.source_doctype || op.target_doctype) {
          resolved.source_doctype = op.source_doctype
            ? dtMap[op.source_doctype?.toLowerCase()] || op.source_doctype
            : null;
          resolved.target_doctype = op.target_doctype
            ? dtMap[op.target_doctype?.toLowerCase()] || op.target_doctype
            : null;
        }
        // ✅ Fallback: Use from/doctype resolution (backward compatibility)
        else {
          const [source_raw, target_raw] = op.from
            ? [op.from, op.doctype]
            : ["create", "update"].includes(resolved.operation)
              ? [null, op.doctype]
              : [op.doctype, null];

          resolved.source_doctype = source_raw
            ? dtMap[source_raw?.toLowerCase()] || source_raw
            : null;
          resolved.target_doctype = target_raw
            ? dtMap[target_raw?.toLowerCase()] || target_raw
            : null;
        }

        // STEP 3: Resolve view
        resolved.view =
          cfg.operationToView[resolved.operation?.toLowerCase()] ?? null;

        // STEP 4: Get view configuration (component, container, options)
        const viewConfig = cfg.views?.[resolved.view?.toLowerCase()] || {};
        resolved.component = viewConfig.component ?? null;
        resolved.container = viewConfig.container ?? null;
        resolved.options = viewConfig.options || {};

        // STEP 5: Defaults
        resolved.owner = op.owner || "system";

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

          // Fetch schema if needed
          let schema = null;
          if (
            includeSchema &&
            source_doctype !== "All" &&
            //deleted source_doctype !== "Schema" &&
            source_doctype
          ) {
            //console.log("📥 Calling getSchema for:", source_doctype);
            schema = await coworker.getSchema(source_doctype);
            //console.log("📤 getSchema returned:", schema);
          } else {
            /*console.log("❌ Skipping schema fetch because:", {
              includeSchema,
              source_doctype,
              checks: {
                notAll: source_doctype !== "All",
                notSchema: source_doctype !== "Schema",
                exists: !!source_doctype,
              },
            });*/
          }

          // ✅ B2: Use coworker._buildPrismaWhere
          const queryDoctype = source_doctype === "All" ? "" : source_doctype;
          const pbFilter = coworker._buildPrismaWhere(queryDoctype, where);
          const pbSort = coworker._buildPrismaOrderBy(orderBy);

          const params = {};
          if (pbFilter) params.filter = pbFilter;
          if (pbSort) params.sort = pbSort;

          // ✅ B2: Use coworker._dbQuery
          const { data, meta } = await coworker._dbQuery(params, take, skip);

          // Field filtering based on view
          let filteredData = data;
          const shouldFilter = view === "list" || view === "card";

          /*if (view === "all") {     //dont work
    filteredData = data;
  }

          else*/ if (schema && !select && shouldFilter) {   //was if not else if
            const viewProp = `in_${view}_view`;
            const viewFields = schema.fields
              .filter((f) => f[viewProp])
              .map((f) => f.fieldname);
            const fields = ["name", ...viewFields];

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



          // ✅ B2: Use coworker._handlers.select (not this._handlers)
          const result = await coworker._handlers.select(run_doc);

          if (result.success && result.target?.data?.length > 1) {
            console.warn(
              `takeone returned ${result.target.data.length} records, using first only`,
            );
          }

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

          if (!inputData || Object.keys(inputData).length === 0) {
            throw new Error("CREATE requires input with data");
          }

          console.log("📝 CREATE handler:", {
            doctype: target_doctype,
            hasWrappedData: !!input?.data,
            fields: Object.keys(inputData),
          });

          // ✅ AUTO-APPLY RBAC PERMISSIONS (if not already present)
          let recordData = { ...inputData, doctype: target_doctype };

          if (applyRBAC && !inputData._allowed && !inputData._allowed_read) {
            console.log("🔐 Auto-applying RBAC for:", target_doctype);
            try {
              const perms = await coworker.rbac.applyPermissions(
                target_doctype,
                recordData,
              );
              recordData = perms;
              console.log("✅ RBAC applied:", {
                _allowed: recordData._allowed,
                _allowed_read: recordData._allowed_read,
              });
            } catch (error) {
              console.warn(
                "⚠️ RBAC failed, proceeding without:",
                error.message,
              );
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

  let schema = null;
  if (includeSchema) {
    schema = await coworker.getSchema(doctype);  // ← Use doctype (not source_doctype)
  }

  const queryDoctype = source_doctype === "All" ? "" : source_doctype;
  const pbFilter = coworker._buildPrismaWhere(queryDoctype, where);

  const items =
    run_doc._items ||
    (await coworker._dbQuery({ filter: pbFilter })).data;

  if (items.length === 0) {
    return {
      success: true,
      target: { data: [], schema, meta: { updated: 0 } },
    };
  }

  // ✅ Process each update through field system
  const updates = await Promise.all(
    items.map(async (item) => {
      const merged = { ...item, ...inputData, doctype };  // ← Use doctype

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

        // ════════════════════════════════════════════════════════
        // DELETE - Remove operations
        // ════════════════════════════════════════════════════════
        delete: async function (run_doc) {
          const { source_doctype, query, options } = run_doc;
          const { where } = query || {};
          const { includeMeta = false } = options || {};

          if (!where || Object.keys(where).length === 0) {
            throw new Error(
              "DELETE requires query.where to prevent accidental mass deletion",
            );
          }

          // ✅ B2: Use coworker._buildPrismaWhere
          const queryDoctype = source_doctype === "All" ? "" : source_doctype;
          const pbFilter = coworker._buildPrismaWhere(queryDoctype, where);

          // Use pre-fetched items if controller provided them
          const items =
            run_doc._items ||
            (await coworker._dbQuery({ filter: pbFilter })).data;

          if (items.length === 0) {
            return {
              success: true,
              target: {
                data: [],
                meta: includeMeta
                  ? { operation: "delete", deleted: 0 }
                  : undefined,
              },
            };
          }

          // ✅ B2: Use coworker._dbDelete
          await Promise.all(items.map((item) => coworker._dbDelete(item.name)));

          return {
            success: true,
            target: {
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
                      : `${fieldPath} = ${opValue}`,
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
                        : `${fieldPath} = ${v}`,
                    );
                    parts.push(`(${inValues.join(" || ")})`);
                  }
                  break;
                case "notIn":
                  if (Array.isArray(opValue) && opValue.length > 0) {
                    const notInValues = opValue.map((v) =>
                      typeof v === "string"
                        ? `${fieldPath} != "${v}"`
                        : `${fieldPath} != ${v}`,
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
            "pb._dbQuery not found. Load pb-adapter files first.",
          );
        }
        return await pb._dbQuery(params, take, skip);
      };

      coworker._dbCreate = async function (data) {
        if (!pb || typeof pb._dbCreate !== "function") {
          throw new Error(
            "pb._dbCreate not found. Load pb-adapter files first.",
          );
        }
        return await pb._dbCreate(data);
      };

      coworker._dbUpdate = async function (id, data) {
        if (!pb || typeof pb._dbUpdate !== "function") {
          throw new Error(
            "pb._dbUpdate not found. Load pb-adapter files first.",
          );
        }
        return await pb._dbUpdate(id, data);
      };

      coworker._dbDelete = async function (id) {
        if (!pb || typeof pb._dbDelete !== "function") {
          throw new Error(
            "pb._dbDelete not found. Load pb-adapter files first.",
          );
        }
        return await pb._dbDelete(id);
      };

      // ============================================================
      // SCHEMA MANAGEMENT
      // ✅ A3: Standalone coworker.getSchema (original working code)
      // ✅ A4: Uses coworker._schemaCache (global accessible)
      // ============================================================

      coworker.getSchema = async function (doctype) {
        // Check cache first
        if (this._schemaCache.has(doctype)) {
          return this._schemaCache.get(doctype);
        }

        try {
          const result = await this.run({
            operation: "select",
            doctype: "Schema",
            query: {
              where: { _schema_doctype: doctype },
              take: 1,
            },
            component: null,
            container: null,
            options: { includeSchema: false, skipController: true },
          });

          if (
            !result.success ||
            !result.target?.data ||
            result.target.data.length === 0
          ) {
            console.warn(`Schema not found for: ${doctype}`);
            return null;
          }

          const schema = result.target.data[0];
          this._schemaCache.set(doctype, schema);
          return schema;
        } catch (error) {
          console.error(`Error fetching schema for ${doctype}:`, error);
          return null;
        }
      };

      coworker.clearSchemaCache = function () {
        this._schemaCache.clear();
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
            setTimeout(() => reject(new Error("Operation timeout")), timeout),
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

          const validOps = ["select", "takeone", "create", "update", "delete"];
          if (!validOps.includes(context.operation)) {
            throw new Error(`Invalid operation: ${context.operation}`);
          }

          context.status = "valid";
          context.success = true;
          context.target = {
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

      /*console.log("✅ coworker-run plugin installed (v4.1.0 - WORKING)");
      console.log("   • coworker.run(config)");
      console.log("   • coworker.controller.execute(run_doc)");
      console.log("   • coworker.getSchema(doctype)");
      console.log("   • coworker.clearSchemaCache()");*/
    },
  };

  // Auto-install if coworker is available
  if (coworker && coworker.use) {
    coworkerRun.install(coworker);
  }

  return coworkerRun;
});
