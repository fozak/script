// ============================================================================
// COWORKER-QUERY-BUILDER.JS - Universal Query Builder
// Auto-installs and creates global QueryBuilder context
// ============================================================================

(function (root) {
  "use strict";

  // ============================================================
  // QUERY BUILDER CLASS - Chainable API
  // ============================================================

  class QueryBuilder {
    constructor(doctype, coworker) {
      this._doctype = doctype;
      this._coworker = coworker;
      this._query = {};
      this._operation = "select";
      this._input = {};
      this._options = {};
    }

    // WHERE - Prisma-style conditions
    where(conditions) {
      this._query.where = { ...this._query.where, ...conditions };
      return this;
    }

    // SELECT - Field selection
    select(fields) {
      this._query.select = Array.isArray(fields) ? fields : [fields];
      return this;
    }

    // ORDER BY - Sorting
    orderBy(field, direction = "asc") {
      if (!this._query.orderBy) this._query.orderBy = [];
      this._query.orderBy.push({ [field]: direction });
      return this;
    }

    // TAKE - Limit results
    take(n) {
      this._query.take = n;
      return this;
    }

    // SKIP - Offset
    skip(n) {
      this._query.skip = n;
      return this;
    }

    view(viewType) {
      this._view = viewType;
      return this;
    }

    // FIRST - Get first result (syntactic sugar for take(1))
    first() {
      this._operation = "takeone";
      return this;
    }

    // CREATE - Switch to create operation
    create(data) {
      this._operation = "create";
      this._input = data;
      return this;
    }

    // UPDATE - Switch to update operation
    update(data) {
      this._operation = "update";
      this._input = data;
      return this;
    }

    // DELETE - Switch to delete operation
    delete() {
      this._operation = "delete";
      return this;
    }

    // OPTIONS - Set execution options
    options(opts) {
      this._options = { ...this._options, ...opts };
      return this;
    }

    // DRAFT - Enable draft mode
    draft() {
      this._options.draft = true;
      return this;
    }

    // ============================================================
    // INTERNAL: BUILD CONFIG
    // ============================================================
    _build() {
      const config = {
        operation: this._operation,
        query: this._query,
        options: this._options,
      };

      // Add view at top level if set
      if (this._view) {
        config.view = this._view;
      }

      // Set doctype based on operation
      if (
        this._operation === "select" ||
        this._operation === "takeone" ||
        this._operation === "delete"
      ) {
        config.source_doctype = this._doctype;
      } else if (this._operation === "create") {
        config.target_doctype = this._doctype;
        config.input = this._input;
      } else if (this._operation === "update") {
        config.source_doctype = this._doctype;
        config.target_doctype = this._doctype;
        config.input = this._input;
      }

      return config;
    }

    // ============================================================
    // INTERNAL: EXECUTE
    // ============================================================

    async _run() {
      const config = this._build();
      return await this._coworker.run(config);
    }

    // ============================================================
    // DEBUG METHODS
    // ============================================================

    toSQL() {
      const config = this._build();
      return this._generateSQL(config);
    }

    toString() {
      const config = this._build();
      return JSON.stringify(config, null, 2);
    }

    _generateSQL(config) {
      let sql = "";

      if (config.operation === "select" || config.operation === "takeone") {
        const fields = config.query.select
          ? config.query.select.join(", ")
          : "*";
        sql = `SELECT ${fields} FROM ${config.source_doctype}`;

        if (config.query.where) {
          sql += ` WHERE ${this._whereToSQL(config.query.where)}`;
        }

        if (config.query.orderBy) {
          const orders = config.query.orderBy
            .map((o) => {
              const [field, dir] = Object.entries(o)[0];
              return `${field} ${dir.toUpperCase()}`;
            })
            .join(", ");
          sql += ` ORDER BY ${orders}`;
        }

        if (config.query.take) {
          sql += ` LIMIT ${config.query.take}`;
        }

        if (config.query.skip) {
          sql += ` OFFSET ${config.query.skip}`;
        }
      } else if (config.operation === "create") {
        const fields = Object.keys(config.input).join(", ");
        const values = Object.values(config.input)
          .map((v) => (typeof v === "string" ? `'${v}'` : v))
          .join(", ");
        sql = `INSERT INTO ${config.target_doctype} (${fields}) VALUES (${values})`;
      } else if (config.operation === "update") {
        const sets = Object.entries(config.input)
          .map(([k, v]) => `${k} = ${typeof v === "string" ? `'${v}'` : v}`)
          .join(", ");
        sql = `UPDATE ${config.target_doctype} SET ${sets}`;

        if (config.query.where) {
          sql += ` WHERE ${this._whereToSQL(config.query.where)}`;
        }
      } else if (config.operation === "delete") {
        sql = `DELETE FROM ${config.source_doctype}`;

        if (config.query.where) {
          sql += ` WHERE ${this._whereToSQL(config.query.where)}`;
        }
      }

      return sql;
    }

    _whereToSQL(where) {
      return Object.entries(where)
        .map(([key, value]) => {
          if (key === "OR" && Array.isArray(value)) {
            return (
              "(" + value.map((v) => this._whereToSQL(v)).join(" OR ") + ")"
            );
          }
          if (key === "AND" && Array.isArray(value)) {
            return (
              "(" + value.map((v) => this._whereToSQL(v)).join(" AND ") + ")"
            );
          }
          if (key === "NOT") {
            return "NOT (" + this._whereToSQL(value) + ")";
          }

          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            return Object.entries(value)
              .map(([op, val]) => {
                switch (op) {
                  case "equals":
                    return `${key} = ${typeof val === "string" ? `'${val}'` : val}`;
                  case "contains":
                    return `${key} LIKE '%${val}%'`;
                  case "startsWith":
                    return `${key} LIKE '${val}%'`;
                  case "endsWith":
                    return `${key} LIKE '%${val}'`;
                  case "gt":
                    return `${key} > ${val}`;
                  case "gte":
                    return `${key} >= ${val}`;
                  case "lt":
                    return `${key} < ${val}`;
                  case "lte":
                    return `${key} <= ${val}`;
                  case "in":
                    return `${key} IN (${val.map((v) => (typeof v === "string" ? `'${v}'` : v)).join(", ")})`;
                  case "notIn":
                    return `${key} NOT IN (${val.map((v) => (typeof v === "string" ? `'${v}'` : v)).join(", ")})`;
                  case "not":
                    return `${key} != ${typeof val === "string" ? `'${val}'` : val}`;
                  default:
                    return "";
                }
              })
              .join(" AND ");
          }
          return `${key} = ${typeof value === "string" ? `'${value}'` : value}`;
        })
        .join(" AND ");
    }
  }

  // ============================================================
  // AUTO-INSTALL
  // ============================================================

  if (typeof window !== "undefined") {
    function initQueryBuilder() {
      if (typeof window.coworker === "undefined") {
        console.warn("⚠️ coworker not found, waiting...");
        setTimeout(initQueryBuilder, 100);
        return;
      }

      const coworker = window.coworker;

      // Expose QueryBuilder globally
      window.QueryBuilder = QueryBuilder;

      console.log("✅ Query Builder installed");
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initQueryBuilder);
    } else {
      initQueryBuilder();
    }
  }

  // ============================================================
  // UI INTEGRATION
  // ============================================================

  if (typeof document !== "undefined") {
    function initUI() {
      const input = document.getElementById("expr");
      const preview = document.getElementById("preview");
      const container = document.getElementById("query_builder");

      if (!input || !preview || !container) {
        console.warn("⚠️ Query builder UI elements not found");
        return;
      }

      // Add Run button if it doesn't exist
      let runButton = container.querySelector("#run_query");
      if (!runButton) {
        runButton = document.createElement("button");
        runButton.id = "run_query";
        runButton.textContent = "Run";
        runButton.style.cssText =
          "margin: 10px 0; padding: 8px 16px; cursor: pointer;";
        input.parentElement.insertBefore(runButton, preview);
      }

      // Live preview (shows config + SQL)
      let previewTimeout;
      input.addEventListener("input", () => {
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => {
          const expr = input.value.trim();
          if (!expr) {
            preview.textContent = "";
            return;
          }

          try {
            // Extract doctype before first dot
            const dotIndex = expr.indexOf(".");
            if (dotIndex === -1) {
              preview.textContent = "Error: Expected format: Doctype.method()";
              preview.style.color = "#d32f2f";
              return;
            }

            const doctype = expr.substring(0, dotIndex);
            const rest = expr.substring(dotIndex);

            // Build full expression
            const fullExpr = `new QueryBuilder('${doctype}', coworker)${rest}`;

            // Eval to get query
            const query = eval(fullExpr);

            if (query && typeof query._build === "function") {
              const config = query._build();
              const sql = query.toSQL();

              preview.textContent =
                "// Config:\n" +
                JSON.stringify(config, null, 2) +
                "\n\n// SQL:\n" +
                sql;
              preview.style.color = "";
            } else {
              preview.textContent = JSON.stringify(query, null, 2);
              preview.style.color = "";
            }
          } catch (e) {
            preview.textContent = `Error: ${e.message}`;
            preview.style.color = "#d32f2f";
          }
        }, 200);
      });

      // Run button click handler
      runButton.addEventListener("click", async () => {
        const expr = input.value.trim();
        if (!expr) return;

        try {
          preview.textContent = "⏳ Running query...";
          preview.style.color = "#1976d2";

          // Extract doctype before first dot
          const dotIndex = expr.indexOf(".");
          if (dotIndex === -1) {
            throw new Error("Expected format: Doctype.method()");
          }

          const doctype = expr.substring(0, dotIndex);
          const rest = expr.substring(dotIndex);

          // Build full expression
          const fullExpr = `new QueryBuilder('${doctype}', coworker)${rest}`;

          // Eval and run
          const query = eval(fullExpr);
          const result = await query._run();

          preview.textContent = JSON.stringify(result, null, 2);
          preview.style.color = "#2e7d32";
        } catch (e) {
          preview.textContent = `Error: ${e.message}\n\n${e.stack}`;
          preview.style.color = "#d32f2f";
        }
      });

      // Ctrl+Enter shortcut
      input.addEventListener("keydown", async (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          runButton.click();
        }
      });

      console.log("✅ Query Builder UI initialized");
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initUI);
    } else {
      setTimeout(initUI, 0);
    }
  }

  // ============================================================
  // EXPORTS
  // ============================================================

  root.QueryBuilder = QueryBuilder;
})(typeof self !== "undefined" ? self : this);
