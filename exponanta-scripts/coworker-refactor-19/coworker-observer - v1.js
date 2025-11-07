// ============================================================================
// COWORKER OBSERVER - Error & Audit (Browser sequential <script> style)
// ============================================================================
(function(root) {
  'use strict';

  if (!root.coworker) {
    console.warn('⚠️ coworker not found, observer not attached');
    return;
  }

  // Main observer
  const observer = {
    async handleValidation(context, error) {
      console.warn('Validation failed:', context.operation, context.doctype);
    },

    async handlePermission(context, error) {
      console.warn('Permission denied:', context.owner, context.operation, context.doctype);
    },

    async handleExecution(context, error) {
      console.error('Execution failed:', error.message);
    },

    async audit(context, error) {
      const auditRecord = {
        eventType: 'FAILED_OPERATION',
        operation: context.operation,
        doctype: context.doctype,
        actor: context.owner,
        timestamp: context.timestamp,
        errorCode: error.code,
        runId: context.id,
        flowId: context.options?.flowId,
        stepId: context.options?.stepId
      };
      console.log('📝 Audit:', auditRecord);
      // TODO: Persist to audit storage
    }
  };

  // Attach error hook
  root.coworker.on('coworker:error:run', async ({ context, error }) => {
    console.error('❌ Operation failed:', context.id, context.operation, error.message);

    if (error.code === 'VALIDATION_FAILED') {
      await observer.handleValidation(context, error);
    } else if (error.code === 'PERMISSION_DENIED') {
      await observer.handlePermission(context, error);
    } else {
      await observer.handleExecution(context, error);
    }

    if (['create', 'update', 'delete'].includes(context.operation)) {
      await observer.audit(context, error);
    }
  });

  console.log('✅ Coworker observer attached');
})(window);
