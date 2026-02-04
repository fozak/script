// ============================================================================
// pb-adapter-run_memory.js - Queries CW.runs
// ============================================================================

pb._adapters = pb._adapters || {};

// Define MEMORY_DB as a getter that computes from CW
Object.defineProperty(window, 'RUN_MEMORY_DB', {
  get() {
    if (typeof CW === 'undefined') return [];
    // ✅ Just return Run documents as-is
    return Object.values(CW.runs);
  },
  enumerable: true,
  configurable: true
});

pb._adapters.run_memory = {
  /**
   * @function query
   * @description Execute SELECT query on in-memory array
   * @param {Object} params - { filter, sort, fields }
   * @param {number} take - Page size
   * @param {number} skip - Skip count
   * @returns {Promise<Object>} { data, meta }
   */
  async query(params = {}, take, skip) {
    // Start with all records
    let items = [...globalThis.RUN_MEMORY_DB];

    // Apply filter
    if (params.filter) {
      items = this._applyFilter(items, params.filter);
    }

    // Apply sort
    if (params.sort) {
      items = this._applySort(items, params.sort);
    }

    const total = items.length;

    // Apply pagination
    if (take !== undefined) {
      const start = skip || 0;
      items = items.slice(start, start + take);

      const page = skip ? Math.floor(skip / take) + 1 : 1;
      const totalPages = Math.ceil(total / take);

      return {
        // ✅ Consistent with PocketBase
        data: items,
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
      data: items,
      meta: {
        total,
        page: 1,
        pageSize: total,
        totalPages: 1,
        hasMore: false
      }
    };
  },

  _applyFilter(items, filter) {
    if (!filter) return items;
    const predicates = this._parseFilter(filter);
    return items.filter(item => this._evaluatePredicates(item, predicates));
  },

  _parseFilter(filter) {
    const predicates = [];
    const parts = filter.split(/(\s+AND\s+|\s+OR\s+|\s+&&\s+|\s+\|\|\s+)/i);

    for (let i = 0; i < parts.length; i += 2) {
      const part = parts[i].trim();
      const logicalOp = parts[i + 1]?.trim().toUpperCase();

      const cleanPart = part.replace(/^\(|\)$/g, '');
      const match = cleanPart.match(/^(.+?)\s*(=|!=|>|>=|<|<=|~)\s*(.+)$/);

      if (match) {
        let [, field, op, value] = match;
        field = field.replace(/^data\./, '');
        value = value.replace(/^["']|["']$/g, '');
        predicates.push({
          field,
          operator: op,
          value,
          logicalOp: logicalOp === 'AND' || logicalOp === '&&'
            ? 'AND'
            : logicalOp === 'OR' || logicalOp === '||'
            ? 'OR'
            : null
        });
      }
    }
    return predicates;
  },

  _evaluatePredicates(item, predicates) {
    if (predicates.length === 0) return true;
    let result = this._evaluatePredicate(item, predicates[0]);
    for (let i = 1; i < predicates.length; i++) {
      const pred = predicates[i];
      const match = this._evaluatePredicate(item, pred);
      const op = predicates[i - 1].logicalOp;
      result = op === 'AND' ? result && match : op === 'OR' ? result || match : result;
    }
    return result;
  },

  _evaluatePredicate(item, { field, operator, value }) {
    const itemValue = item[field];
    switch (operator) {
      case '=':  return String(itemValue) === String(value);
      case '!=': return String(itemValue) !== String(value);
      case '>':  return Number(itemValue) > Number(value);
      case '>=': return Number(itemValue) >= Number(value);
      case '<':  return Number(itemValue) < Number(value);
      case '<=': return Number(itemValue) <= Number(value);
      case '~':  return new RegExp(value, 'i').test(String(itemValue));
      default:   return false;
    }
  },

  _applySort(items, sort) {
    if (!sort) return items;
    const sortFields = sort.split(',').map(s => {
      const dir = s[0] === '-' ? 'desc' : 'asc';
      const field = s.replace(/^[+-]/, '').replace(/^data\./, '');
      return { field, dir };
    });
    return items.sort((a, b) => {
      for (const { field, dir } of sortFields) {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal < bVal) return dir === 'desc' ? 1 : -1;
        if (aVal > bVal) return dir === 'desc' ? -1 : 1;
      }
      return 0;
    });
  }
};

console.log("✅ Memory adapter loaded (SELECT only, PocketBase-compatible)");
