// ============================================================================
// coworker.js COWORKER runtime - Universal Event-Driven Runtime (Immutable)
// Works in: Browser, Node.js, Web Workers, Service Workers
// ============================================================================

const coworker = {
  _version: '1.0.0',
  _plugins: new Map(),
  _hooks: new Map(),
  _config: {},

  /**
   * Initialize runtime with configuration
   * @param {string|object} config - Config URL or object
   */
  async init(config) {
    // Load config from URL or use directly
    if (typeof config === 'string') {
      const response = await fetch(config);
      this._config = await response.json();
    } else {
      this._config = config;
    }

    // Load plugins defined in config
    if (this._config.plugins) {
      for (const pluginConfig of this._config.plugins) {
        await this.use(pluginConfig);
      }
    }

    // Emit initialization event
    await this.emit('coworker:init', { config: this._config });
    
    console.log('✅ Coworker initialized');
    return this;
  },

  /**
   * Load and install a plugin
   * @param {object} pluginConfig - Plugin configuration
   */
  async use(pluginConfig) {
    const { name, url, type = 'module', plugin: inlinePlugin } = pluginConfig;
    
    if (this._plugins.has(name)) {
      console.warn(`⚠️  Plugin already loaded: ${name}`);
      return this;
    }

    console.log(`🔌 Loading plugin: ${name}`);

    let plugin;

    if (type === 'module' && url) {
      // Load from external URL
      const module = await import(url);
      plugin = module.default || module.plugin;
    } else if (type === 'inline' && inlinePlugin) {
      // Use inline plugin
      plugin = inlinePlugin;
    } else {
      throw new Error(`Invalid plugin config for: ${name}`);
    }

    if (plugin && typeof plugin.install === 'function') {
      await plugin.install(this);
      this._plugins.set(name, plugin);
      console.log(`✅ Plugin installed: ${name}`);
    } else {
      throw new Error(`Plugin ${name} missing install() method`);
    }

    return this;
  },

  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   * @param {number} priority - Execution priority (higher = first)
   */
  on(event, handler, priority = 0) {
    if (!this._hooks.has(event)) {
      this._hooks.set(event, []);
    }

    this._hooks.get(event).push({ handler, priority });

    // Sort by priority (higher executes first)
    this._hooks.get(event).sort((a, b) => b.priority - a.priority);

    return this;
  },

  /**
   * Emit event to all registered handlers
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {Promise<array>} Array of results from handlers
   */
  async emit(event, data) {
    const handlers = this._hooks.get(event) || [];
    const results = [];

    for (const { handler } of handlers) {
      try {
        const result = await handler.call(this, data);
        results.push(result);
      } catch (error) {
        console.error(`❌ Error in handler for '${event}':`, error);
        // Continue executing other handlers
      }
    }

    return results;
  },

  /**
   * Get configuration value by path
   * @param {string} path - Dot-notation path (e.g., 'database.host')
   * @param {any} defaultValue - Default if path not found
   */
  getConfig(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this._config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  },

  /**
   * Get plugin by name
   * @param {string} name - Plugin name
   */
  getPlugin(name) {
    return this._plugins.get(name);
  },

  /**
   * List all loaded plugins
   */
  listPlugins() {
    return Array.from(this._plugins.keys());
  }
};

// ============================================================================
// UNIVERSAL EXPORT - Works in Browser, Node.js, Workers
// ============================================================================

// Detect environment and expose coworker appropriately
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
    // Try self (workers) first, then window (browser), then globalThis (universal)
    const globalScope = typeof self !== 'undefined' ? self :
                       typeof window !== 'undefined' ? window :
                       typeof global !== 'undefined' ? global :
                       globalThis;
    
    globalScope.coworker = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  return coworker;
}));

// ============================================================================
// CORE IS COMPLETE - NEVER MODIFY ABOVE THIS LINE
// ============================================================================
