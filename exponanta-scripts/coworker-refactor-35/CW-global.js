// ============================================================
// CW- Centralized GLOBLA NEW
// ============================================================

globalThis.CW = {
  runs: [
    {
      doctype: "Run",
      name: "runbqlprmtmxmfu",
      creation: 1770230033388,
      modified: 1770230033491,
      operation_key:
        '{"operation":"takeone","doctype":"Adapter","query":{"where":{"name":"adapterqlegh6hr"}},"options":{"render":true}}',
      modified_by: "system",
      docstatus: 0,
      owner: "system",
      config: {},
      functions: {},
      operation: "takeone",
      operation_original: "takeone",
      source: null,
      source_doctype: "Adapter",
      target: {
        data: [
          {
            _allowed: "",
            _allowed_read: "",
            adapter_name: "memory",
            config: {
              operators: {
                "=": "String(a) === String(b)",
                "!=": "String(a) !== String(b)",
                ">": "Number(a) > Number(b)",
                ">=": "Number(a) >= Number(b)",
                "<": "Number(a) < Number(b)",
                "<=": "Number(a) <= Number(b)",
                "~": "new RegExp(b, 'i').test(String(a))",
              },
            },
            doctype: "Adapter",
            functions: {
              select:
                "async function(run_doc) { const query = run_doc.query || {}; const take = query.take; const skip = query.skip || 0; let items = [...window.MEMORY_DB]; if (query.where) { items = this._applyFilter(items, query.where); } if (query.sort) { items = this._applySort(items, query.sort); } const total = items.length; if (take !== undefined) { const start = skip; items = items.slice(start, start + take); const page = skip ? Math.floor(skip / take) + 1 : 1; const totalPages = Math.ceil(total / take); run_doc.output = { data: items, meta: { total, page, pageSize: take, totalPages, hasMore: page < totalPages } }; } else { run_doc.output = { data: items, meta: { total, page: 1, pageSize: total, totalPages: 1, hasMore: false } }; } run_doc.success = true; return run_doc; }",
              _applyFilter:
                "function(items, filter) { if (!filter) return items; const predicates = this._parseFilter(filter); return items.filter(item => this._evaluatePredicates(item, predicates)); }",
              _parseFilter:
                "function(filter) { const predicates = []; const parts = filter.split(/(\\s+AND\\s+|\\s+OR\\s+|\\s+&&\\s+|\\s+\\|\\|\\s+)/i); for (let i = 0; i < parts.length; i += 2) { const part = parts[i].trim(); const logicalOp = parts[i + 1]?.trim().toUpperCase(); const cleanPart = part.replace(/^\\(|\\)$/g, ''); const match = cleanPart.match(/^(.+?)\\s*(=|!=|>|>=|<|<=|~)\\s*(.+)$/); if (match) { let [, field, op, value] = match; field = field.replace(/^data\\./, ''); value = value.replace(/^[\"']|[\"']$/g, ''); predicates.push({ field, operator: op, value, logicalOp: logicalOp === 'AND' || logicalOp === '&&' ? 'AND' : logicalOp === 'OR' || logicalOp === '||' ? 'OR' : null }); } } return predicates; }",
              _evaluatePredicates:
                "function(item, predicates) { if (predicates.length === 0) return true; let result = this._evaluatePredicate(item, predicates[0]); for (let i = 1; i < predicates.length; i++) { const pred = predicates[i]; const match = this._evaluatePredicate(item, pred); const op = predicates[i - 1].logicalOp; result = op === 'AND' ? result && match : op === 'OR' ? result || match : result; } return result; }",
              _evaluatePredicate:
                "function(item, { field, operator, value }) { const itemValue = item[field]; const evalFn = new Function('a', 'b', `return ${this.config.operators[operator]}`); return evalFn ? evalFn(itemValue, value) : false; }",
              _applySort:
                "function(items, sort) { if (!sort) return items; const sortFields = sort.split(',').map(s => { const dir = s[0] === '-' ? 'desc' : 'asc'; const field = s.replace(/^[+-]/, '').replace(/^data\\./, ''); return { field, dir }; }); return items.sort((a, b) => { for (const { field, dir } of sortFields) { const aVal = a[field]; const bVal = b[field]; if (aVal < bVal) return dir === 'desc' ? 1 : -1; if (aVal > bVal) return dir === 'desc' ? -1 : 1; } return 0; }); }",
            },
            id: "adapterqlegh6hr",
            is_default: true,
            name: "adapterqlegh6hr",
          },
        ],
        // ─── Compiled Runtime NOT confirmed─────────────────────
        runtime: [
          {
            select: Function,
            _applyFilter: Function,
            _parseFilter: Function,
            _evaluatePredicates: Function,
            _evaluatePredicate: Function,
            _applySort: Function,
          },
        ],
        schema: {
          _schema_doctype: "Adapter",
          actions: [],
          allow_rename: 1,
          autoname: "field:adapter_name",
          creation: "2013-01-08 15:50:01",
          doctype: "Schema",
          document_type: "Document",
          engine: "InnoDB",
          field_order: [
            "id",
            "name",
            "adapter_name",
            "restrict_to_domain",
            "column_break_4",
            "disabled",
            "is_custom",
            "desk_access",
            "two_factor_auth",
            "docstatus",
            "owner",
            "_allowed",
            "_allowed_read",
            "config",
            "functions",
            "permissions",
            "is_default",
          ],
          fields: [
            {
              fieldname: "adapter_name",
              fieldtype: "Data",
              label: "adapter Name",
              oldfieldname: "adapter_name",
              oldfieldtype: "Data",
              reqd: 1,
              unique: 1,
            },
            {
              default: "0",
              description:
                "If disabled, this adapter will be removed from all users.",
              fieldname: "disabled",
              fieldtype: "Check",
              label: "Disabled",
            },
            {
              default: "0",
              fieldname: "two_factor_auth",
              fieldtype: "Check",
              label: "Two Factor Authentication",
            },
            {
              fieldname: "restrict_to_domain",
              fieldtype: "Link",
              label: "Restrict To Domain",
              options: "Domain",
            },
            {
              description: 'Route: Example "/app"',
              fieldname: "home_page",
              fieldtype: "Data",
              label: "Home Page",
            },
            {
              fieldname: "column_break_4",
              fieldtype: "Column Break",
            },
            {
              default: "0",
              fieldname: "is_custom",
              fieldtype: "Check",
              in_list_view: 1,
              label: "Is Custom",
            },
            {
              default: "0",
              fieldname: "docstatus",
              fieldtype: "Int",
              hidden: 1,
              label: "Document Status",
              no_copy: 1,
              print_hide: 1,
              read_only: 1,
            },
            {
              fieldname: "owner",
              fieldtype: "Data",
              hidden: 1,
              label: "Created By",
              no_copy: 1,
              print_hide: 1,
              read_only: 1,
            },
            {
              fieldname: "_allowed",
              fieldtype: "Code",
              options: "JSON",
              hidden: 1,
              label: "Allowed adapters (Write)",
              no_copy: 1,
              print_hide: 1,
              read_only: 1,
            },
            {
              fieldname: "_allowed_read",
              fieldtype: "Code",
              options: "JSON",
              hidden: 1,
              label: "Allowed adapters (Read)",
              no_copy: 1,
              print_hide: 1,
              read_only: 1,
            },
            {
              fieldname: "config",
              fieldtype: "Code",
              options: "JSON",
              label: "Adapter Configuration",
              description: "Static or runtime configuration for the adapter",
            },
            {
              fieldname: "functions",
              fieldtype: "Code",
              options: "JSON",
              label: "Adapter Functions",
              description: "Callable adapter functions or operation mappings",
            },
            {
              fieldname: "permissions",
              fieldtype: "Code",
              options: "JSON",
              label: "Adapter Permissions",
              description: "Fine-grained permission rules beyond read/write",
            },
            {
              default: "0",
              description:
                "This format is used to use select this document as default",
              fieldname: "is_default",
              fieldtype: "Check",
              in_list_view: 1,
              label: "Is Default",
            },
          ],
          icon: "fa fa-bookmark",
          id: "schemaadaptht8e",
          idx: 1,
          index_web_pages_for_search: 1,
          links: [],
          modified: "2024-09-19 17:07:08.672124",
          modified_by: "Administrator",
          module: "Core",
          name: "schemaadaptht8e",
          naming_rule: "By fieldname",
          owner: "",
          permissions: [
            {
              create: 1,
              delete: 1,
              email: 1,
              print: 1,
              read: 1,
              report: 1,
              role: "System Manager",
              share: 1,
              write: 1,
            },
          ],
          quick_entry: 1,
          sort_field: "creation",
          sort_order: "DESC",
          states: [],
          track_changes: 1,
          translated_doctype: 1,
        },
        viewConfig: {
          layout: "table",
          view: "form",
        },
      },
      target_doctype: null,
      view: "form",
      component: "MainForm",
      container: "main_container",
      query: {
        where: {
          name: "adapterqlegh6hr",
        },
        take: 1,
        view: "form",
      },
      input: {
        doctype: "Adapter",
      },
      state: {},
      status: "completed",
      success: true,
      error: null,
      duration: 103,
      parent_run_id: null,
      child_run_ids: [],
      flow_id: null,
      flow_template: null,
      step_id: null,
      step_title: null,
      agent: null,
      options: {
        render: true,
        draft: true,
      },
    },
  ], // indexed by run.name
  runsByOpKey: {}, // indexed by operation_key
  current_run: null,

  // Helper to update both indexes
  _updateFromRun: function (run_doc) {
    this.runs[run_doc.name] = run_doc;

    if (run_doc.operation_key) {
      this.runsByOpKey[run_doc.operation_key] = run_doc;
    }

    // Only track navigation runs as "current"
    if (
      run_doc.component?.startsWith("Main") &&
      run_doc.options?.render !== false
    ) {
      this.current_run = run_doc.name;
    }

    globalThis.dispatchEvent(
      new CustomEvent("coworker:state:change", {
        detail: { run: run_doc },
      }),
    );
  },
};
