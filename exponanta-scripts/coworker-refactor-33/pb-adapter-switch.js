// ============================================================================
// pb-adapter-switch.js - Adapter Selection & Delegation
// ============================================================================

/**
 * Set default adapter
 */
pb._currentAdapter = pb._currentAdapter || 'pocketbase';

/**
 * @function pb.useAdapter
 * @description Switch between database adapters
 * @param {string} adapter - 'pocketbase' | 'memory' | 'run_memory' 
 */
pb.useAdapter = function(adapter) {
  if (!this._adapters) {
    throw new Error('No adapters loaded. Load adapter files first.');
  }
  
  if (!this._adapters[adapter]) {
    const available = Object.keys(this._adapters).join(', ');
    throw new Error(`Unknown adapter: "${adapter}". Available: ${available}`);
  }
  
  const previous = this._currentAdapter;
  this._currentAdapter = adapter;
  
  console.log(`🔄 Adapter switched: ${previous} → ${adapter}`);
  
  return adapter;
};

/**
 * @function pb._dbQuery
 * @description Delegate query to active adapter
 * @param {Object} params - Query parameters
 * @param {number} take - Page size
 * @param {number} skip - Skip count
 * @returns {Promise<Object>} { items, meta }
 */
pb._dbQuery = async function (params, take, skip) {
  if (!this._adapters[this._currentAdapter]) {
    throw new Error(`Adapter "${this._currentAdapter}" not found`);
  }
  
  return await this._adapters[this._currentAdapter].query(params, take, skip);
};

/**
 * @function pb._dbCreate
 * @description Delegate create to active adapter
 * @param {Object} data - Record data
 * @returns {Promise<Object>} Created record
 */
pb._dbCreate = async function (data) {
  if (!this._adapters[this._currentAdapter].create) {
    throw new Error(`Adapter "${this._currentAdapter}" does not support create`);
  }
  
  return await this._adapters[this._currentAdapter].create(data);
};

/**
 * @function pb._dbUpdate
 * @description Delegate update to active adapter
 * @param {string} name - Record name
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Updated record
 */
pb._dbUpdate = async function (name, data) {
  if (!this._adapters[this._currentAdapter].update) {
    throw new Error(`Adapter "${this._currentAdapter}" does not support update`);
  }
  
  return await this._adapters[this._currentAdapter].update(name, data);
};

/**
 * @function pb._dbDelete
 * @description Delegate delete to active adapter
 * @param {string} name - Record name
 * @returns {Promise<void>}
 */
pb._dbDelete = async function (name) {
  if (!this._adapters[this._currentAdapter].delete) {
    throw new Error(`Adapter "${this._currentAdapter}" does not support delete`);
  }
  
  return await this._adapters[this._currentAdapter].delete(name);
};

/**
 * @function pb.getAvailableAdapters
 * @description List all loaded adapters
 * @returns {Array<string>} Adapter names
 */
pb.getAvailableAdapters = function() {
  return Object.keys(this._adapters || {});
};

/**
 * @function pb.getCurrentAdapter
 * @description Get current active adapter name
 * @returns {string} Adapter name
 */
pb.getCurrentAdapter = function() {
  return this._currentAdapter;
};

console.log(`✅ Adapter switching ready. Current: ${pb._currentAdapter}`);
console.log(`📦 Available adapters: ${pb.getAvailableAdapters().join(', ')}`);