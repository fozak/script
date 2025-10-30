// ============================================================================
// RUN.JS - Runtime Plugin for Coworker (UMD)
// Adds .run() method to coworker
// ============================================================================

(function(root, factory) {
  // Universal Module Definition (UMD)
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    // Node.js / CommonJS
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD (RequireJS)
    define([], factory);
  } else {
    // Browser globals, Web Workers, Service Workers
    const globalScope = typeof self !== 'undefined' ? self :
                       typeof window !== 'undefined' ? window :
                       typeof global !== 'undefined' ? global :
                       globalThis;
    
    // Export as named export for direct script loading
    globalScope.runtimePlugin = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {

  const runtimePlugin = {
    name: 'runtime',
    version: '1.0.0',
    
    /**
     * Install plugin into coworker
     * @param {object} coworker - Coworker instance
     */
    async install(coworker) {
      console.log('📦 Installing runtime plugin...');

      /**
       * Execute a run operation
       * This method is ADDED to coworker by this plugin
       * @param {object} config - Run configuration
       * @returns {Promise<object>} Run result
       */
      coworker.run = async function(config) {
        const context = {
          id: this._generateUUID(),
          timestamp: Date.now(),
          operation: config.operation,
          doctype: config.doctype || null,
          flow: config.flow || null,
          input: config.input || null,
          options: config.options || {},      // ← ADDED
          owner: config.owner || this.getConfig('defaultUser', 'system'),
          agent: config.agent || null,
          status: 'pending',                  // ← ADDED
          // Result placeholders (operation plugins fill these)
          output: null,
          error: null,
          success: false,
          duration: 0
        };

        const startTime = Date.now();

        try {
          // Validate operation
          if (!context.operation) {
            throw new Error('operation is required');
          }

          context.status = 'running';         // ← ADDED

          // 🔥 Emit: before:run
          await this.emit('coworker:before:run', context);

          // 🔥 Emit: run:{operation}
          // Examples: 'coworker:run:create', 'coworker:run:flow', 'coworker:run:select'
          // Operation plugins listen to these events and handle the actual work
          const results = await this.emit(`coworker:run:${context.operation}`, context);

          // Get first non-null result from plugins
          const result = results.find(r => r !== null && r !== undefined);
          
          if (result) {
            context.output = result.output || result;
            context.success = result.success !== false;
            context.error = result.error || null;
          } else {
            throw new Error(`No plugin handled operation: ${context.operation}`);
          }

          context.status = 'completed';       // ← ADDED

          // 🔥 Emit: after:run
          await this.emit('coworker:after:run', context);

        } catch (error) {
          context.status = 'failed';          // ← ADDED
          context.success = false;
          context.error = {
            message: error.message,
            code: error.code || 'RUN_FAILED',
            details: error.details || null,
            stack: error.stack
          };
          
          // 🔥 Emit: error:run
          await this.emit('coworker:error:run', { context, error });
        } finally {
          context.duration = Date.now() - startTime;
        }

        return context;
      };

      // ======================================================================
      // HELPER METHODS
      // ======================================================================

      /**
       * Generate unique UUID for run operations
       * @returns {string} UUID
       */
      coworker._generateUUID = function() {
        return 'run-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      };

      /**
       * Batch run multiple operations
       * @param {array} configs - Array of run configurations
       * @returns {Promise<array>} Array of run results
       */
      coworker.runBatch = async function(configs) {
        const results = [];
        
        for (const config of configs) {
          const result = await this.run(config);
          results.push(result);
          
          // Stop on first error if specified
          if (config.stopOnError && !result.success) {
            break;
          }
        }
        
        return results;
      };

      /**
       * Run operations in parallel
       * @param {array} configs - Array of run configurations
       * @returns {Promise<array>} Array of run results
       */
      coworker.runParallel = async function(configs) {
        const promises = configs.map(config => this.run(config));
        return await Promise.all(promises);
      };

      /**
       * Run with timeout
       * @param {object} config - Run configuration
       * @param {number} timeout - Timeout in milliseconds
       * @returns {Promise<object>} Run result
       */
      coworker.runWithTimeout = async function(config, timeout = 30000) {
        return Promise.race([
          this.run(config),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), timeout)
          )
        ]);
      };

      /**
       * Dry run - validate without executing
       * @param {object} config - Run configuration
       * @returns {Promise<object>} Validation result
       */
      coworker.dryRun = async function(config) {
        const context = {
          id: this._generateUUID(),
          timestamp: Date.now(),
          operation: config.operation,
          doctype: config.doctype || null,
          flow: config.flow || null,
          input: config.input || null,
          options: config.options || {},      // ← ADDED
          owner: config.owner || this.getConfig('defaultUser', 'system'),
          agent: config.agent || null,
          status: 'validating',               // ← ADDED
          dryRun: true,
          output: null,
          error: null,
          success: false,
          duration: 0
        };

        try {
          // Validate operation exists
          if (!context.operation) {
            throw new Error('operation is required');
          }

          // Emit validation event
          await this.emit('coworker:validate:run', context);

          // Check if operation handler exists
          const handlers = this._hooks.get(`coworker:run:${context.operation}`) || [];
          if (handlers.length === 0) {
            throw new Error(`No plugin handles operation: ${context.operation}`);
          }

          context.status = 'valid';           // ← ADDED
          context.success = true;
          context.output = {
            valid: true,
            message: `Operation '${context.operation}' is valid`,
            handlers: handlers.length
          };

        } catch (error) {
          context.status = 'invalid';         // ← ADDED
          context.success = false;
          context.error = {
            message: error.message,
            code: 'VALIDATION_FAILED'
          };
        }

        return context;
      };

      console.log('✅ Runtime plugin installed');
      console.log('   • coworker.run()');
      console.log('   • coworker.runBatch()');
      console.log('   • coworker.runParallel()');
      console.log('   • coworker.runWithTimeout()');
      console.log('   • coworker.dryRun()');
    }
  };

  return runtimePlugin;

}));

// ============================================================================
// PLUGIN IS COMPLETE - NEVER MODIFY ABOVE THIS LINE
// ============================================================================