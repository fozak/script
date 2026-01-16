
/*DONT give code, advice how to prioritize features, from CODE MANAGEBILITY and complexity perspective.*/ 


/* CURRENT SITUATION: operations implemented the usage of exact frappe-type 
* the run_doc is formed and passing throught the run() pipleline to have output.data[0] and then then _render() to component
**
*/

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
          modified_by: resolved.owner || "system",
          docstatus: 0,
          owner: resolved.owner || "system",

          // Operation definition
          operation: resolved.operation,
          operation_original: op.operation,
          source_doctype: resolved.source_doctype,
          target_doctype: resolved.target_doctype,

          // UI/Rendering (explicit takes priority over resolved)
          view: "view" in op ? op.view : resolved.view,
          component: "component" in op ? op.component : resolved.component,
          container: "container" in op ? op.container : resolved.container,

          // DATA - Delta architecture
          query: op.query || {},
          input: op.input || {},
          output: null,

          // Execution state
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
            const original = this.output?.data?.[0] || {};
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

          run_doc.output = result.output || result;
          run_doc.success = result.success === true;
          run_doc.error = result.error || null;

          // Copy doctype to input if missing (for saves)
          if (run_doc.options.draft && run_doc.output?.data?.[0]?.doctype) {
            if (!run_doc.input.doctype) {
              run_doc.input.doctype = run_doc.output.data[0].doctype;
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

/*current RBAC */
// ══════════════════════════════════════════════════════
  // EXTRACT SCHEMA PERMISSIONS
  // ══════════════════════════════════════════════════════
  async getDocTypePermissions(doctype) {
    // Use coworker.getSchema() instead of direct DB call
    const schema = await coworker.getSchema(doctype);
    
    if (!schema) {
      throw new Error(`Schema not found for doctype: ${doctype}`);
    }
    
    const permissions = schema.permissions || [];
    
    const writeRoles = [];
    const readOnlyRoles = [];
    
    for (const perm of permissions) {
      if (perm.write) {
        writeRoles.push(perm.role);
      } else if (perm.read) {
        readOnlyRoles.push(perm.role);
      }
    }
    
    return {
      _allowed: writeRoles.map(role => generateId("Role", role)),
      _allowed_read: readOnlyRoles.map(role => generateId("Role", role)),
      roleNames: {
        write: writeRoles,
        read: readOnlyRoles
      }
    };
  },

  // ══════════════════════════════════════════════════════
  // ENSURE ROLES EXIST (AUTO-CREATE MISSING)
  // ══════════════════════════════════════════════════════
  async ensureRolesExist(doctype) {
    const doctypePerms = await this.getDocTypePermissions(doctype);
    const roleSchemaPerms = await this.getDocTypePermissions("Role");
    
    const allRoleNames = [
      ...doctypePerms.roleNames.write,
      ...doctypePerms.roleNames.read
    ];
    
    for (const roleName of allRoleNames) {
      const roleId = generateId("Role", roleName);
      
      // Use run('select') instead of direct DB call
      const checkRun = await coworker.run({
        operation: 'select',
        source_doctype: 'Role',
        query: {
          where: { id: roleId },
          take: 1
        },
        options: { 
          render: false,
          includeSchema: false
        }
      });
      
      if (checkRun.success && checkRun.output?.data?.length > 0) {
        console.log(`✓ Role exists: ${roleName}`);
      } else {
        console.log(`Creating role: ${roleName}`);
        
        // Use run('create') instead of direct DB call
        const createRun = await coworker.run({
          operation: 'create',
          target_doctype: 'Role',
          input: {
            id: roleId,
            name: roleName,
            doctype: 'Role',
            docstatus: 0,
            owner: '',
            ...roleSchemaPerms,
            role_name: roleName
          },
          options: {
            render: false,
            includeSchema: false
          }
        });
        
        if (createRun.success) {
          console.log(`✓ Created role: ${roleName}`);
        } else {
          console.error(`Failed to create role: ${roleName}`, createRun.error);
        }
      }
    }
    
    return {
      _allowed: doctypePerms._allowed,
      _allowed_read: doctypePerms._allowed_read
    };
  },

  // ══════════════════════════════════════════════════════
  // CHECK USER PERMISSION
  // ══════════════════════════════════════════════════════
  async checkPermission(userId, record, operation = "read") {
    // Get user's roles
    const userRun = await coworker.run({
      operation: 'select',
      source_doctype: 'User',
      query: {
        where: { id: userId },
        take: 1
      },
      options: { 
        render: false,
        includeSchema: false
      }
    });
    
    if (!userRun.success || !userRun.output?.data?.length) {
      return false;
    }
    
    const user = userRun.output.data[0];
    const userRoles = user._allowed_read || []; // User's capabilities
    
    // Check against record's ACL
    if (operation === "write" || operation === "update" || operation === "delete") {
      const allowed = record._allowed || [];
      return userRoles.some(role => allowed.includes(role));
    }
    
    if (operation === "read") {
      const allowed = record._allowed || [];
      const allowedRead = record._allowed_read || [];
      return userRoles.some(role => 
        allowed.includes(role) || allowedRead.includes(role)
      );
    }
    
    return false;
  }


/* GOALS:
* WHAT:
*1. Instead of writing js module, Implement complete sets of js functions and behavoius and capabilities (earlier hardcoded as js
* as loadable json documents based on one json schema that extends current schema of doctypes.
*2. Implement loading as stardard operation: run(select, doctype=Adapter..., where {full_name=httpfetch}, options: {init=true}) 
* that loads data and makes functions available for global scope. 
*3. After loading the then the functions are callable as operations run(post, input:{}, options:{adapter: 'httpfetch'}), 
*. the operation post <-> invariant to function in adapter and vs versa making it easier to validate operations syntax
*4. Document might contain steps, so 
*4. Data of configuration is stores in this full_name=httpfetch document of doctype=Adapter as well as capabilities
*5. Capabilitie are implemented as extention of permission like read, write, create, delete and becoming 
*6. User _allow field becoming RBAC for capabilities of adapters. like _allowed: ['rolehttppost', 'roles3storage']

/* HOW:
* 1. introduce new doctype = Adapter and its schema that has the following NEW fields:
* A. fieldname = functions, fieldtype =json, the array of functions that stored as strings*/
{
  "functions": {
    "post": "async function(input, options) { /* POST logic */ }",
    "get": "async function(input, options) { /* GET logic */ }",
    "put": "async function(input, options) { /* PUT logic */ }",
    "delete": "async function(input, options) { /* DELETE logic */ }"
  }
}

/* B. introduce steps json field */
{
  "name": "flow_template_list_operations",
  "description": "Example using list with calculation step",
  "steps": [
    {
      "name": "step_a1b2c3d4e5f6g7h",
      "title": "select_open_tasks",
      "operation": "select",
      "doctype": "Task",
      "args": {
        "where": { "status": "Open" }
      }
    },
    {
      "name": "step_b2c3d4e5f6g7h8i",
      "title": "calculate_task_metrics",
      "operation": "evaluate",
      "doctype": "Code",
      "source_step": "select_open_tasks",
      "args": {
        "code": `
          const task_count = tasks.length;
          const total_estimated_hours = tasks.reduce((sum, t) => sum + t.estimated_hours, 0);
          const task_names = tasks.map(t => t.name).join(', ');
          
          return { task_count, total_estimated_hours, task_names };
        `
      }
    },
    {
      "name": "step_h8i9j0k1l2m3n4o",
      "title": "create_summary_report",
      "operation": "create",
      "doctype": "Report",
      "source_step": "calculate_task_metrics",
      "args": {
        "data": {
          "title": "Open Tasks Summary",
          "task_count": "{{code.task_count}}",
          "total_estimated_hours": "{{code.total_estimated_hours}}",
          "task_names": "{{code.task_names}}"
        }
      }
    }
  ]
}

/* C. introduce permissions field which is array of json objects defining capabilities of functions in adapter:
/* 2. permissions in doctype are now copied from generic schema of doctype=Adapter
into each doctype and customized by adding capabilities like Section of doctype=Adapter..., where {full_name=httpfetch}*/ 
"permissions": [
  {
   "create": 1,
   "delete": 1,
   "email": 1,
   "export": 1,
   "get": 1,   //EXACT FUNCTION NAME
   "import": 1,
   "print": 1,
   "read": 1,
   "report": 1,
   "role": "System Manager", //USING EXISTIG ROLES
   "share": 1,
   "write": 1
  },
  {
   "permlevel": 1,
   "read": 1,
   "get": 1,   //EXACT FUNCTION NAME
   "role": "System Manager",
   "write": 1
  },
  {
    "get": 1,   //EXACT FUNCTION NAME
   "read": 1,
   "role": "Http Get User",  //NEW ROLE
   "role": "Desk User",
   "select": 1
  }
 ],

/* then capabilities are assigned to users via Existing or new roles doctype=User..., 
* where {username=httpgetuser}, */
user._allowed: ['rolehttpgetuser']  

