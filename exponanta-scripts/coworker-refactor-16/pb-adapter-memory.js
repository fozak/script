// ============================================================================
// pb-adapter-memory.js - Memory Adapter (SELECT operation, using pb.query logic)
// ============================================================================

// Initialize memory database if not exists
window.MEMORY_DB = window.MEMORY_DB || [];

pb._adapters = pb._adapters || {};

pb._adapters.memory = {
  /**
   * @function query
   * @description Execute SELECT query on in-memory array
   * @param {Object} params - { filter, sort, fields }
   * @param {number} take - Page size
   * @param {number} skip - Skip count
   * @returns {Promise<Object>} { items, meta }
   */
  async query(params, take, skip) {
    // Start with all records
    let items = [...window.MEMORY_DB];

    // Apply filter (if provided)
    if (params.filter) {
      items = this._applyFilter(items, params.filter);
    }

    // Apply sort (if provided)
    if (params.sort) {
      items = this._applySort(items, params.sort);
    }

    // Total before pagination
    const total = items.length;

    // Apply pagination (if provided)
    if (take !== undefined) {
      const start = skip || 0;
      items = items.slice(start, start + take);
      
      const page = skip ? Math.floor(skip / take) + 1 : 1;
      const totalPages = Math.ceil(total / take);
      
      return {
        items: items.map(item => ({ data: item })), // Wrap in {data} for compatibility
        meta: {
          total,
          page,
          pageSize: take,
          totalPages,
          hasMore: page < totalPages
        }
      };
    }

    // No pagination - return all
    return {
      items: items.map(item => ({ data: item })),
      meta: {
        total,
        page: 1,
        pageSize: total,
        totalPages: 1,
        hasMore: false
      }
    };
  },

  /**
   * @function _applyFilter
   * @description Apply PocketBase-style filter to array
   * @param {Array} items - Array of records
   * @param {string} filter - Filter string (e.g., 'doctype = "User" && status = "Active"')
   * @returns {Array} Filtered items
   */
  _applyFilter(items, filter) {
    if (!filter) return items;
    
    // Parse filter into predicates
    const predicates = this._parseFilter(filter);
    
    // Filter items
    return items.filter(item => this._evaluatePredicates(item, predicates));
  },

  /**
   * @function _parseFilter
   * @description Parse filter string into predicates
   * @param {string} filter - Filter string
   * @returns {Array} Predicates
   */
  _parseFilter(filter) {
    const predicates = [];
    
    // Split by && and || (simplified parser)
    const parts = filter.split(/(\s+&&\s+|\s+\|\|\s+)/);
    
    for (let i = 0; i < parts.length; i += 2) {
      const part = parts[i].trim();
      const logicalOp = parts[i + 1]?.trim();
      
      // Remove outer parentheses if present
      const cleanPart = part.replace(/^\(|\)$/g, '');
      
      // Parse: field operator value
      const match = cleanPart.match(/^(.+?)\s*(=|!=|>|>=|<|<=|~)\s*(.+)$/);
      
      if (match) {
        let [, field, op, value] = match;
        
        // Clean field (remove "data." prefix if present)
        field = field.replace(/^data\./, '');
        
        // Clean value (remove quotes)
        value = value.replace(/^["']|["']$/g, '');
        
        predicates.push({
          field,
          operator: op,
          value,
          logicalOp: logicalOp === '&&' ? 'AND' : logicalOp === '||' ? 'OR' : null
        });
      }
    }
    
    return predicates;
  },

  /**
   * @function _evaluatePredicates
   * @description Evaluate predicates against a record
   * @param {Object} item - Record to test
   * @param {Array} predicates - Predicates
   * @returns {boolean} True if matches
   */
  _evaluatePredicates(item, predicates) {
    if (predicates.length === 0) return true;
    
    let result = this._evaluatePredicate(item, predicates[0]);
    
    for (let i = 1; i < predicates.length; i++) {
      const predicate = predicates[i];
      const matches = this._evaluatePredicate(item, predicate);
      
      const prevLogicalOp = predicates[i - 1].logicalOp;
      if (prevLogicalOp === 'AND') {
        result = result && matches;
      } else if (prevLogicalOp === 'OR') {
        result = result || matches;
      }
    }
    
    return result;
  },

  /**
   * @function _evaluatePredicate
   * @description Evaluate single predicate
   * @param {Object} item - Record
   * @param {Object} predicate - { field, operator, value }
   * @returns {boolean} True if matches
   */
  _evaluatePredicate(item, predicate) {
    const { field, operator, value } = predicate;
    const itemValue = item[field];
    
    switch (operator) {
      case '=':
        return String(itemValue) === String(value);
      case '!=':
        return String(itemValue) !== String(value);
      case '>':
        return Number(itemValue) > Number(value);
      case '>=':
        return Number(itemValue) >= Number(value);
      case '<':
        return Number(itemValue) < Number(value);
      case '<=':
        return Number(itemValue) <= Number(value);
      case '~':
        // Regex match (case-insensitive)
        const regex = new RegExp(value, 'i');
        return regex.test(String(itemValue));
      default:
        return false;
    }
  },

  /**
   * @function _applySort
   * @description Apply PocketBase-style sort to array
   * @param {Array} items - Array of records
   * @param {string} sort - Sort string (e.g., '-created,+name')
   * @returns {Array} Sorted items
   */
  _applySort(items, sort) {
    if (!sort) return items;
    
    // Parse sort fields
    const sortFields = sort.split(',').map(s => {
      const direction = s[0] === '-' ? 'desc' : 'asc';
      const field = s.replace(/^[+-]/, '').replace(/^data\./, '');
      return { field, direction };
    });
    
    // Sort items
    return items.sort((a, b) => {
      for (const { field, direction } of sortFields) {
        const aVal = a[field];
        const bVal = b[field];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        if (comparison !== 0) {
          return direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }
};

// TODO: Add CREATE/UPDATE/DELETE operations

console.log("✅ Memory adapter loaded (SELECT only)");