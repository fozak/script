// ============================================================================
// coworker-adapter-manager.js - Unified Adapter Management System
// ============================================================================

/**
 * Adapter Manager - Handles all adapter operations
 */
coworker._adapterManager = {
  // Current active adapters per type
  _current: {},

  /**
   * Initialize adapters from config
   */
  init() {
    const defaults = coworker.getConfig("adapters.defaults");

    if (!defaults) {
      console.warn("⚠️ No adapter defaults in config");
      return;
    }

    // Set default adapters
    for (const [type, adapter] of Object.entries(defaults)) {
      if (adapter) {
        this._current[type] = adapter;
      }
    }

    console.log("✅ Adapter manager initialized");
    console.log("📦 Active adapters:", this._current);
  },

  /**
   * Get adapter configuration from registry
   */
  getAdapter(name) {
    const registry = coworker.getConfig("adapters.registry");
    return registry?.[name];
  },

  /**
   * List adapters by type
   */
  listByType(type) {
    const registry = coworker.getConfig("adapters.registry");
    if (!registry) return [];

    return Object.entries(registry)
      .filter(([_, config]) => config.type === type)
      .map(([name, config]) => ({
        name,
        ...config,
      }));
  },

  /**
   * Switch adapter for a type
   */
  use(type, adapterName) {
    const adapter = this.getAdapter(adapterName);

    if (!adapter) {
      throw new Error(`Unknown adapter: ${adapterName}`);
    }

    if (adapter.type !== type) {
      throw new Error(
        `Adapter ${adapterName} is type ${adapter.type}, not ${type}`
      );
    }

    const previous = this._current[type];
    this._current[type] = adapterName;

    console.log(`🔄 ${type} adapter: ${previous} → ${adapterName}`);
    return adapterName;
  },

  /**
   * Get current adapter (lazy loads from config if not set)
   */
  getCurrent(type) {
    // Lazy load from config if not cached
    if (!this._current[type]) {
      this._current[type] = coworker.getConfig(`adapters.defaults.${type}`);
    }
    return this._current[type];
  },

  /**
   * Get adapter handler function
   */
  getHandler(adapterName) {
    const adapter = this.getAdapter(adapterName);
    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterName}`);
    }

    // Resolve handler path (e.g., "_dbAdapters.pocketbase")
    const parts = adapter.handler.split(".");
    let handler = coworker;

    for (const part of parts) {
      handler = handler[part];
      if (!handler) {
        throw new Error(`Handler not found: ${adapter.handler}`);
      }
    }

    return handler;
  },

  /**
   * Check if adapter supports operation
   */
  supports(adapterName, operation) {
    const adapter = this.getAdapter(adapterName);
    if (!adapter) return false;

    return adapter.capabilities.includes(operation);
  },

  /**
   * Execute operation through adapter
   */
  async execute(type, operation, run_doc) {
    // Get adapter name from run options or current default
    const adapterName = run_doc.options?.adapter || this._current[type];

    if (!adapterName) {
      throw new Error(`No ${type} adapter configured`);
    }

    const adapter = this.getAdapter(adapterName);

    if (!adapter) {
      throw new Error(`Adapter not found: ${adapterName}`);
    }

    // Check capability
    if (!this.supports(adapterName, operation)) {
      throw new Error(
        `Adapter ${adapterName} does not support operation: ${operation}`
      );
    }

    // Get handler
    const handler = this.getHandler(adapterName);

    // Execute
    if (typeof handler[operation] !== "function") {
      throw new Error(
        `Handler ${adapter.handler} missing operation: ${operation}`
      );
    }

    return await handler[operation](run_doc);
  },
};

/**
 * Convenience method: Switch adapter
 */
coworker.useAdapter = function (type, adapter) {
  return this._adapterManager.use(type, adapter);
};

/**
 * Convenience method: Get current adapter
 */
coworker.getCurrentAdapter = function (type = "db") {
  return this._adapterManager.getCurrent(type);
};

/**
 * Convenience method: List adapters
 */
coworker.listAdapters = function (type) {
  return this._adapterManager.listByType(type);
};

console.log("✅ Adapter manager loaded");
