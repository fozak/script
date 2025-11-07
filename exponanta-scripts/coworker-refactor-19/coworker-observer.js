// ============================================================================
// COWORKER OBSERVER - Error & Audit (Browser sequential <script> style)
// ============================================================================
(function (root) {
  "use strict";

  const observer = {
    async install(coworker) {
      // Listen to coworker-run errors
      coworker.on("coworker:error:run", async ({ context, error }) => {
        console.error("❌ Operation failed:", context, error);
        await observer._handleCoworkerError(context, error);
      });

      // ADD: Success listener
      /* Add error logging to see if handler is called but fails silently: THIS IS NOT NEEDED YET
      coworker.on("coworker:after:run", async (context) => {
        console.log("🔵 Observer handler called:", context.operation);
        await observer._handleSuccess(context);
      });*/

      // Integrate global JS errors
      window.addEventListener("error", async (event) => {
        const errorInfo = {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack || null,
        };
        console.error("🌐 Global JS Error:", errorInfo);
        await observer._handleGlobalError(errorInfo);
      });

      window.addEventListener("unhandledrejection", async (event) => {
        const errorInfo = {
          reason: event.reason,
          stack: event.reason?.stack || null,
        };
        console.error("🌐 Unhandled Promise Rejection:", errorInfo);
        await observer._handleGlobalError(errorInfo);
      });

      console.log(
        "✅ Observer plugin installed with global JS error integration"
      );
    },

    async _handleCoworkerError(context, error) {
      // Route by error type
      if (error.code === "VALIDATION_FAILED") {
        await this._handleValidation(context, error);
      } else if (error.code === "PERMISSION_DENIED") {
        await this._handlePermission(context, error);
      } else {
        await this._handleExecution(context, error);
      }

      // Audit state-changing operations
      if (["create", "update", "delete"].includes(context.operation)) {
        await this._audit(context, error);
      }
    },

    /* NOT NEEDED YET Move _handleSuccess here (same level as _handleCoworkerError)
    async _handleSuccess(context) {
    console.log("🔵 _handleSuccess handler called:");
      const now = performance.now();
      const started = context.startedAt || now - context.duration || now;
      const duration = now - started;
      context.duration = duration;

      if (duration > 500) {
        console.warn(
          `🐌 Slow operation: ${context.operation} ${duration.toFixed(0)}ms`
        );
      }
    },*/

    async _handleGlobalError(errorInfo) {
      // Wrap global errors into an "operation-like" record for audit
      const context = {
        id: "globaljs_" + Date.now(),
        timestamp: Date.now(),
        actor: "browser",
        operation: "javascript",
        doctype: "global-js-error",
        success: false,
        error: errorInfo,
      };
      await this._audit(context, errorInfo);
    },

    async _handleValidation(context, error) {
      console.warn("Validation failed:", context.operation, context.doctype);
    },

    async _handlePermission(context, error) {
      console.warn(
        "Permission denied:",
        context.actor,
        context.operation,
        context.doctype
      );
    },

    async _handleExecution(context, error) {
      console.error(
        "Execution failed:",
        error.message || error.reason || error
      );
    },

    async _audit(context, error) {
      const auditRecord = {
        eventType: "FAILED_OPERATION",
        operation: context.operation,
        doctype: context.doctype,
        actor: context.actor || context.owner || "system",
        timestamp: context.timestamp,
        errorCode: error.code || "JS_RUNTIME",
        errorDetails: error.message || error.reason || null,
        runId: context.id,
      };
      console.log("📝 Audit:", auditRecord);

      // TODO: optionally persist to coworker-run or server
      // await coworker.run({ operation: 'create', doctype: 'Audit', input: auditRecord });
    },
  };

  // Export first
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { plugin: observer };
  } else {
    root.coworkerObserver = observer;
  }

  // Auto-install INSIDE the IIFE (before closing)
  if (root.coworker) {
    observer.install(root.coworker);
  } else {
    console.warn("⚠️ Coworker not loaded yet, observer not auto-installed");
  }
})(typeof window !== "undefined" ? window : globalThis);
