I have own system where I have run() function and run_doc as single source of truth
all operations (CRUD) select, create, update, delete should be execucuted with it
the system is based on frappe-like docs and its doctypes. 
the logic is that every operation going through run() pipileine like
run_doc created the operation executed via _exec() and then renders through render()
everything is separated in run_doc. Particulary the input and output

the logic for input/output is very clear, all params and data arrives into input and processed into output. 
I works quite well for select. 
but it gets blured for update
for update i itroduce the isdraft = true/false (to have flag for document which is accumulated in input.data unless its ready to be processed into output.data )

help me to clean up the run_doc() and .run()itself into clean mental model where
1) input is clearly the draft state with all needed data for working with draft
2) output is finally processed doc travelling to db

Where are issues now. Mostly in update operaation
if i select original_document with select it becomes the output.data[0]
then i need to update document through run() so I need to copy output.data[0] into input or use output.data[0] data for input (second break my logic)

suggest less code but very clear mental model as me questions. My currect run()

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

        // switch output-input

        // ✅ ADD THIS: Initialize input.data for draft mode
        if (op.options?.draft) {
          if (!run_doc.input.data) run_doc.input.data = {};
        }

        // ✅ ADD THIS: Define run.doc getter
        Object.defineProperty(run_doc, "doc", {
          get: function () {
            return this.options?.draft
              ? this.input.data
              : this.output?.data?.[0] || {};
          },
        });

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
        const previousAdapter = pb._currentAdapter;
        if (run_doc.options?.adapter) {
          pb.useAdapter(run_doc.options.adapter);
        }

        try {
          const handler =
            this._handlers[run_doc.operation] || this._handlers.select;
          return await handler.call(this, run_doc);
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


the example of 
coworker.run({
  operation: 'select',
  doctype: 'Task',
  input: {
    where: { name: 'TASK-2025-00003' }
  }, includeSchema: true
})

{
    "doctype": "Run",
    "name": "run_btzgg0jjvpgj0jh",
    "creation": 1764862578692,
    "modified": 1764862579327,
    "modified_by": "system",
    "docstatus": 0,
    "owner": "system",
    "operation": "select",
    "operation_original": "select",
    "source_doctype": "Task",
    "target_doctype": null,
    "view": "list",
    "component": "MainGrid",
    "container": "main_container",
    "input": {
        "where": {
            "name": "TASK-2025-00003"
        }
    },
    "output": {
        "data": [
            {
                "name": "TASK-2025-00003",
                "doctype": "Task",
                "project": "PROJ-0009",
                "is_group": 0,
                "status": "Open",
                "priority": "Low",
                "is_milestone": 0
            }
        ],
        "schema": {
            "_schema_doctype": "Task",
            "actions": [],
            "allow_import": 1,
            "autoname": "TASK-.YYYY.-.#####",
            "creation": "2013-01-29 19:25:50",
            "doctype": "Schema",
            "docstatus": 1,
            "document_type": "Setup",
            "engine": "InnoDB",
            "field_order": [
                "subject",
                "project",
                "issue",
                "type",
                "relationship_parent",
                "color",
                "is_group",
                "is_template",
                "column_break0",
                "status",
                "priority",
                "task_weight",
                "parent_task",
                "completed_by",
                "completed_on",
                "sb_timeline",
                "exp_start_date",
                "expected_time",
                "start",
                "column_break_11",
                "exp_end_date",
                "progress",
                "duration",
                "is_milestone",
                "sb_details",
                "description",
                "sb_depends_on",
                "depends_on",
                "depends_on_tasks",
                "sb_actual",
                "act_start_date",
                "actual_time",
                "column_break_15",
                "act_end_date",
                "sb_costing",
                "total_costing_amount",
                "column_break_20",
                "total_billing_amount",
                "sb_more_info",
                "review_date",
                "closing_date",
                "column_break_22",
                "department",
                "company",
                "lft",
                "rgt",
                "old_parent",
                "template_task"
            ],
            "fields": [
                {
                    "allow_in_quick_entry": 1,
                    "fieldname": "subject",
                    "fieldtype": "Data",
                    "in_global_search": 1,
                    "in_standard_filter": 1,
                    "label": "Subject",
                    "reqd": 1,
                    "search_index": 1
                },
                {
                    "allow_in_quick_entry": 1,
                    "bold": 1,
                    "fieldname": "project",
                    "fieldtype": "Link",
                    "in_global_search": 1,
                    "in_list_view": 1,
                    "in_standard_filter": 1,
                    "label": "Project",
                    "oldfieldname": "project",
                    "oldfieldtype": "Link",
                    "options": "Project",
                    "remember_last_selected_value": 1,
                    "search_index": 1
                },
                {
                    "fieldname": "issue",
                    "fieldtype": "Link",
                    "label": "Issue",
                    "options": "Issue"
                },
                {
                    "fieldname": "type",
                    "fieldtype": "Link",
                    "label": "Type",
                    "options": "Task Type"
                },
                {
                    "bold": 1,
                    "default": "0",
                    "fieldname": "is_group",
                    "fieldtype": "Check",
                    "in_list_view": 1,
                    "label": "Is Group"
                },
                {
                    "fieldname": "column_break0",
                    "fieldtype": "Column Break",
                    "oldfieldtype": "Column Break",
                    "print_width": "50%",
                    "width": "50%"
                },
                {
                    "bold": 1,
                    "fieldname": "status",
                    "fieldtype": "Select",
                    "in_list_view": 1,
                    "in_standard_filter": 1,
                    "label": "Status",
                    "no_copy": 1,
                    "oldfieldname": "status",
                    "oldfieldtype": "Select",
                    "options": "\nDraft\nApproved\nRejected\nPending"
                },
                {
                    "fieldname": "priority",
                    "fieldtype": "Select",
                    "in_list_view": 1,
                    "in_standard_filter": 1,
                    "label": "Priority",
                    "oldfieldname": "priority",
                    "oldfieldtype": "Select",
                    "options": "Low\nMedium\nHigh\nUrgent",
                    "search_index": 1
                },
                {
                    "fieldname": "relationship_parent",
                    "fieldtype": "Table",
                    "in_list_view": 0,
                    "label": "relationship Children",
                    "options": "Relationship",
                    "reqd": 1,
                    "search_index": 1
                },
                {
                    "fieldname": "color",
                    "fieldtype": "Color",
                    "label": "Color"
                },
                {
                    "bold": 1,
                    "fieldname": "parent_task",
                    "fieldtype": "Link",
                    "ignore_user_permissions": 1,
                    "label": "Parent Task",
                    "options": "Task",
                    "search_index": 1
                },
                {
                    "collapsible": 1,
                    "collapsible_depends_on": "exp_start_date",
                    "fieldname": "sb_timeline",
                    "fieldtype": "Section Break",
                    "label": "Timeline"
                },
                {
                    "bold": 1,
                    "fieldname": "exp_start_date",
                    "fieldtype": "Datetime",
                    "label": "Expected Start Date",
                    "oldfieldname": "exp_start_date",
                    "oldfieldtype": "Date"
                },
                {
                    "default": "0",
                    "fieldname": "expected_time",
                    "fieldtype": "Float",
                    "label": "Expected Time (in hours)",
                    "oldfieldname": "exp_total_hrs",
                    "oldfieldtype": "Data"
                },
                {
                    "fetch_from": "type.weight",
                    "fieldname": "task_weight",
                    "fieldtype": "Float",
                    "label": "Weight"
                },
                {
                    "fieldname": "column_break_11",
                    "fieldtype": "Column Break"
                },
                {
                    "bold": 1,
                    "fieldname": "exp_end_date",
                    "fieldtype": "Datetime",
                    "label": "Expected End Date",
                    "oldfieldname": "exp_end_date",
                    "oldfieldtype": "Date",
                    "search_index": 1
                },
                {
                    "fieldname": "progress",
                    "fieldtype": "Percent",
                    "label": "% Progress",
                    "no_copy": 1
                },
                {
                    "default": "0",
                    "fieldname": "is_milestone",
                    "fieldtype": "Check",
                    "in_list_view": 1,
                    "label": "Is Milestone"
                },
                {
                    "fieldname": "sb_details",
                    "fieldtype": "Section Break",
                    "label": "Details",
                    "oldfieldtype": "Section Break"
                },
                {
                    "fieldname": "description",
                    "fieldtype": "Text Editor",
                    "label": "Task Description",
                    "oldfieldname": "description",
                    "oldfieldtype": "Text Editor",
                    "print_width": "300px",
                    "width": "300px"
                },
                {
                    "fieldname": "sb_depends_on",
                    "fieldtype": "Section Break",
                    "label": "Dependencies",
                    "oldfieldtype": "Section Break"
                },
                {
                    "fieldname": "depends_on",
                    "fieldtype": "Table",
                    "label": "Dependent Tasks",
                    "options": "Task Depends On"
                },
                {
                    "fieldname": "depends_on_tasks",
                    "fieldtype": "Code",
                    "hidden": 1,
                    "label": "Depends on Tasks",
                    "read_only": 1
                },
                {
                    "fieldname": "sb_actual",
                    "fieldtype": "Section Break",
                    "oldfieldtype": "Column Break",
                    "print_width": "50%",
                    "width": "50%"
                },
                {
                    "fieldname": "act_start_date",
                    "fieldtype": "Date",
                    "label": "Actual Start Date (via Timesheet)",
                    "oldfieldname": "act_start_date",
                    "oldfieldtype": "Date",
                    "read_only": 1
                },
                {
                    "fieldname": "actual_time",
                    "fieldtype": "Float",
                    "label": "Actual Time in Hours (via Timesheet)",
                    "read_only": 1
                },
                {
                    "fieldname": "column_break_15",
                    "fieldtype": "Column Break"
                },
                {
                    "fieldname": "act_end_date",
                    "fieldtype": "Date",
                    "label": "Actual End Date (via Timesheet)",
                    "oldfieldname": "act_end_date",
                    "oldfieldtype": "Date",
                    "read_only": 1
                },
                {
                    "collapsible": 1,
                    "fieldname": "sb_costing",
                    "fieldtype": "Section Break",
                    "label": "Costing"
                },
                {
                    "fieldname": "total_costing_amount",
                    "fieldtype": "Currency",
                    "label": "Total Costing Amount (via Timesheet)",
                    "oldfieldname": "actual_budget",
                    "oldfieldtype": "Currency",
                    "options": "Company:company:default_currency",
                    "read_only": 1
                },
                {
                    "fieldname": "column_break_20",
                    "fieldtype": "Column Break"
                },
                {
                    "fieldname": "total_billing_amount",
                    "fieldtype": "Currency",
                    "label": "Total Billable Amount (via Timesheet)",
                    "read_only": 1
                },
                {
                    "collapsible": 1,
                    "fieldname": "sb_more_info",
                    "fieldtype": "Section Break",
                    "label": "More Info"
                },
                {
                    "depends_on": "eval:doc.status == \"Closed\" || doc.status == \"Pending Review\"",
                    "fieldname": "review_date",
                    "fieldtype": "Date",
                    "label": "Review Date",
                    "oldfieldname": "review_date",
                    "oldfieldtype": "Date"
                },
                {
                    "depends_on": "eval:doc.status == \"Closed\"",
                    "fieldname": "closing_date",
                    "fieldtype": "Date",
                    "label": "Closing Date",
                    "oldfieldname": "closing_date",
                    "oldfieldtype": "Date"
                },
                {
                    "fieldname": "column_break_22",
                    "fieldtype": "Column Break"
                },
                {
                    "fieldname": "department",
                    "fieldtype": "Link",
                    "label": "Department",
                    "options": "Department"
                },
                {
                    "fetch_from": "project.company",
                    "fieldname": "company",
                    "fieldtype": "Link",
                    "label": "Company",
                    "options": "Company",
                    "remember_last_selected_value": 1
                },
                {
                    "fieldname": "lft",
                    "fieldtype": "Int",
                    "hidden": 1,
                    "label": "lft",
                    "read_only": 1
                },
                {
                    "fieldname": "rgt",
                    "fieldtype": "Int",
                    "hidden": 1,
                    "label": "rgt",
                    "read_only": 1
                },
                {
                    "fieldname": "old_parent",
                    "fieldtype": "Data",
                    "hidden": 1,
                    "ignore_user_permissions": 1,
                    "label": "Old Parent",
                    "read_only": 1
                },
                {
                    "depends_on": "eval: doc.status == \"Completed\"",
                    "fieldname": "completed_by",
                    "fieldtype": "Link",
                    "label": "Completed By",
                    "no_copy": 1,
                    "options": "User"
                },
                {
                    "default": "0",
                    "fieldname": "is_template",
                    "fieldtype": "Check",
                    "label": "Is Template"
                },
                {
                    "depends_on": "is_template",
                    "fieldname": "start",
                    "fieldtype": "Int",
                    "label": "Begin On (Days)"
                },
                {
                    "depends_on": "is_template",
                    "fieldname": "duration",
                    "fieldtype": "Int",
                    "label": "Duration (Days)"
                },
                {
                    "depends_on": "eval: doc.status == \"Completed\"",
                    "fieldname": "completed_on",
                    "fieldtype": "Date",
                    "label": "Completed On",
                    "mandatory_depends_on": "eval: doc.status == \"Completed\""
                },
                {
                    "fieldname": "template_task",
                    "fieldtype": "Data",
                    "hidden": 1,
                    "label": "Template Task"
                }
            ],
            "icon": "fa fa-check",
            "idx": 1,
            "is_tree": 1,
            "links": [],
            "max_attachments": 5,
            "modified": "2024-05-24 12:36:12.214577",
            "modified_by": "Administrator",
            "module": "Projects",
            "name": "SCHEMA-0001",
            "naming_rule": "Expression (old style)",
            "nsm_parent_field": "parent_task",
            "owner": "Administrator",
            "permissions": [
                {
                    "create": 1,
                    "delete": 1,
                    "email": 1,
                    "print": 1,
                    "read": 1,
                    "report": 1,
                    "role": "Projects User",
                    "share": 1,
                    "write": 1
                }
            ],
            "quick_entry": 1,
            "search_fields": "subject",
            "show_name_in_global_search": 1,
            "show_preview_popup": 1,
            "sort_field": "creation",
            "sort_order": "DESC",
            "states": [],
            "timeline_field": "project",
            "title_field": "subject",
            "track_seen": 1
        },
        "viewConfig": {
            "layout": "table",
            "view": "list"
        }
    },
    "status": "completed",
    "success": true,
    "error": null,
    "duration": 635,
    "parent_run_id": null,
    "child_run_ids": [],
    "flow_id": null,
    "flow_template": null,
    "step_id": null,
    "step_title": null,
    "agent": null,
    "options": {}
}