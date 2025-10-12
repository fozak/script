// Version 11. working - next SEE 12 with rendereders 
/**
 * Universal list function with Prisma-compatible where syntax
 * 
 * @example Basic equality
 * await pb.listDocs('Customer', {
 *   where: { status: 'Active', country: 'US' }
 * });
 * 
 * @example Comparison operators
 * await pb.listDocs('Item', {
 *   where: {
 *     price: { gte: 100, lte: 1000 },
 *     stock: { gt: 0 }
 *   }
 * });
 * 
 * @example IN / NOT IN
 * await pb.listDocs('Sales Order', {
 *   where: {
 *     status: { in: ['Draft', 'Submitted'] },
 *     territory: { notIn: ['Cancelled'] }
 *   }
 * });
 * 
 * @example Text search
 * await pb.listDocs('Customer', {
 *   where: {
 *     name: { contains: 'Corp' },
 *     email: { startsWith: 'admin' },
 *     domain: { endsWith: '.com' }
 *   }
 * });
 * 
 * @example Null checks
 * await pb.listDocs('Customer', {
 *   where: {
 *     deleted_at: null,
 *     notes: { not: null }
 *   }
 * });
 * 
 * @example Boolean logic (OR/AND/NOT)
 * await pb.listDocs('Sales Order', {
 *   where: {
 *     OR: [
 *       { status: 'Draft' },
 *       { status: 'Pending' }
 *     ],
 *     AND: [
 *       { grand_total: { gte: 1000 } },
 *       { posting_date: { gte: '2024-01-01' } }
 *     ],
 *     NOT: {
 *       status: 'Cancelled'
 *     }
 *   }
 * });
 * 
 * @example Pagination & Sorting
 * await pb.listDocs('Customer', {
 *   where: { status: 'Active' },
 *   orderBy: { modified: 'desc', name: 'asc' },
 *   take: 50,
 *   skip: 0
 * });
 * 
 * @example With metadata
 * const result = await pb.listDocs('Customer', {
 *   where: { status: 'Active' },
 *   take: 20,
 *   skip: 0
 * }, { includeMeta: true });
 * // result = { data: [...], meta: { total, hasMore } }
 * 
 * @example With schema
 * const result = await pb.listDocs('Customer', {
 *   where: { status: 'Active' }
 * }, { includeSchema: true });
 * // result = { data: [...], schema: { fields: [...] } }
 * 
 * @param {string} doctype - Document type to filter by
 * @param {Object} query - Prisma-style query object
 * @param {Object} query.where - Where clause (Prisma syntax)
 * @param {Object} query.orderBy - Sort order { field: 'asc'|'desc' }
 * @param {number} query.take - Limit results (Prisma name for limit)
 * @param {number} query.skip - Offset results (Prisma name for offset)
 * @param {Array|string} query.select - Fields to fetch, or '*' for all
 * @param {Object} options - Additional options
 * @param {boolean} options.includeMeta - Include pagination metadata
 * @param {boolean} options.includeSchema - Include schema information for returned fields
 * @param {string} options.view - View type for auto field selection
 * @returns {Promise<Array|Object>} Records array or {data, meta, schema} object
 */
pb.listDocs = async function (doctype = '', query = {}, options = {}) {
  const {
    where,
    orderBy,
    take,
    skip,
    select
  } = query;
  
  const {
    includeMeta = false,
    includeSchema = true,
    view = 'list'
  } = options;
  
  // Auto-derive fields from schema if not explicitly provided
  let fields = select;
  let schema = null;
  
  if (!fields && doctype) {
    schema = await this.getSchema(doctype);
    if (schema && schema.fields) {
      // Map view to schema field
      const viewFieldMap = {
        'list': 'in_list_view',
        'card': 'in_card_view',
        'report': 'in_report_view',
        'mobile': 'in_mobile_view'
      };
      
      const viewField = viewFieldMap[view] || 'in_list_view';
      
      // Get fields marked for this view
      const viewFields = schema.fields
        .filter(f => f[viewField])
        .map(f => f.fieldname);
      
      // Always include essential fields
      fields = ['name', 'doctype', 'id', 'created', 'updated', ...viewFields];
    }
  }
  
  // If schema is needed but wasn't fetched yet, fetch it now
  if (includeSchema && !schema && doctype) {
    schema = await this.getSchema(doctype);
  }
  
  // Handle special case: fetch all fields
  if (fields === '*') {
    fields = undefined;
  }
  
  // Build PocketBase filter from Prisma where clause
  const pbFilter = this._buildPrismaWhere(doctype, where);
  
  // Build PocketBase sort from Prisma orderBy
  const pbSort = orderBy ? this._buildPrismaOrderBy(orderBy) : undefined;
  
  // Build field selection
  const pbFields = fields ? this._buildFieldList(fields) : undefined;
  
  // Build query parameters
  const params = {
    filter: pbFilter,
    sort: pbSort,
    fields: pbFields
  };
  
  // Remove undefined params
  Object.keys(params).forEach(key => {
    if (params[key] === undefined) delete params[key];
  });
  
  // Execute query
  let result;
  
  if (take !== undefined) {
    // Paginated query (Prisma uses take/skip, PocketBase uses page/perPage)
    const page = skip ? Math.floor(skip / take) + 1 : 1;
    result = await this.collection(window.MAIN_COLLECTION).getList(page, take, params);
    
    if (includeMeta || includeSchema) {
      const response = {
        data: result.items
      };
      
      if (includeMeta) {
        response.meta = {
          total: result.totalItems,
          page: result.page,
          pageSize: result.perPage,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages
        };
      }
      
      if (includeSchema && schema) {
        // Return only relevant field definitions
        const fieldNames = fields || Object.keys(result.items[0]?.data || {});
        response.schema = {
          ...schema,
          fields: schema.fields?.filter(f => fieldNames.includes(f.fieldname))
        };
      }
      
      return response;
    }
    
    return result.items;
  } else {
    // Full list query
    const items = await this.collection(window.MAIN_COLLECTION).getFullList(params);
    
    if (includeMeta || includeSchema) {
      const response = {
        data: items
      };
      
      if (includeMeta) {
        response.meta = {
          total: items.length,
          page: 1,
          pageSize: items.length,
          totalPages: 1,
          hasMore: false
        };
      }
      
      if (includeSchema && schema) {
        const fieldNames = fields || Object.keys(items[0]?.data || {});
        response.schema = {
          ...schema,
          fields: schema.fields?.filter(f => fieldNames.includes(f.fieldname))
        };
      }
      
      return response;
    }
    
    return items;
  }
};

/**
 * Build PocketBase filter from Prisma where clause
 */
pb._buildPrismaWhere = function(doctype, where) {
  const parts = [];
  
  // Add doctype filter
  if (doctype) {
    parts.push(`doctype = "${doctype}"`);
  }
  
  // Build where clause
  if (where) {
    const whereParts = this._buildWhereClause(where);
    if (whereParts) {
      parts.push(`(${whereParts})`);
    }
  }
  
  return parts.length > 0 ? parts.join(' && ') : undefined;
};

/**
 * Recursively build where clause from Prisma syntax
 */
pb._buildWhereClause = function(where) {
  if (!where || typeof where !== 'object') return '';
  
  const parts = [];
  
  for (const [key, value] of Object.entries(where)) {
    // Handle OR operator
    if (key === 'OR') {
      if (!Array.isArray(value) || value.length === 0) continue;
      const orParts = value
        .map(condition => this._buildWhereClause(condition))
        .filter(Boolean);
      if (orParts.length > 0) {
        parts.push(`(${orParts.join(' || ')})`);
      }
      continue;
    }
    
    // Handle AND operator
    if (key === 'AND') {
      if (!Array.isArray(value) || value.length === 0) continue;
      const andParts = value
        .map(condition => this._buildWhereClause(condition))
        .filter(Boolean);
      if (andParts.length > 0) {
        parts.push(`(${andParts.join(' && ')})`);
      }
      continue;
    }
    
    // Handle NOT operator
    if (key === 'NOT') {
      const notClause = this._buildWhereClause(value);
      if (notClause) {
        parts.push(`!(${notClause})`);
      }
      continue;
    }
    
    // Regular field
    const fieldPath = this._getFieldPath(key);
    
    // Simple equality (string, number, boolean, null)
    if (value === null || value === undefined) {
      parts.push(`${fieldPath} = null`);
      continue;
    }
    
    if (typeof value === 'string') {
      parts.push(`${fieldPath} = "${value}"`);
      continue;
    }
    
    if (typeof value === 'number') {
      parts.push(`${fieldPath} = ${value}`);
      continue;
    }
    
    if (typeof value === 'boolean') {
      parts.push(`${fieldPath} = ${value}`);
      continue;
    }
    
    // Object with operators
    if (typeof value === 'object' && !Array.isArray(value)) {
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case 'equals':
            if (typeof opValue === 'string') {
              parts.push(`${fieldPath} = "${opValue}"`);
            } else {
              parts.push(`${fieldPath} = ${opValue}`);
            }
            break;
          
          case 'in':
            if (Array.isArray(opValue) && opValue.length > 0) {
              const inValues = opValue.map(v => 
                typeof v === 'string' ? `${fieldPath} = "${v}"` : `${fieldPath} = ${v}`
              );
              parts.push(`(${inValues.join(' || ')})`);
            }
            break;
          
          case 'notIn':
            if (Array.isArray(opValue) && opValue.length > 0) {
              const notInValues = opValue.map(v => 
                typeof v === 'string' ? `${fieldPath} != "${v}"` : `${fieldPath} != ${v}`
              );
              parts.push(`(${notInValues.join(' && ')})`);
            }
            break;
          
          case 'contains':
            parts.push(`${fieldPath} ~ "${opValue}"`);
            break;
          
          case 'startsWith':
            parts.push(`${fieldPath} ~ "^${opValue}"`);
            break;
          
          case 'endsWith':
            parts.push(`${fieldPath} ~ "${opValue}$"`);
            break;
          
          case 'gt':
            parts.push(`${fieldPath} > ${opValue}`);
            break;
          
          case 'gte':
            parts.push(`${fieldPath} >= ${opValue}`);
            break;
          
          case 'lt':
            parts.push(`${fieldPath} < ${opValue}`);
            break;
          
          case 'lte':
            parts.push(`${fieldPath} <= ${opValue}`);
            break;
          
          case 'not':
            if (opValue === null) {
              parts.push(`${fieldPath} != null`);
            } else if (typeof opValue === 'string') {
              parts.push(`${fieldPath} != "${opValue}"`);
            } else if (typeof opValue === 'object') {
              // Nested NOT with operators
              const notClause = this._buildWhereClause({ [key]: opValue });
              if (notClause) {
                parts.push(`!(${notClause})`);
              }
            } else {
              parts.push(`${fieldPath} != ${opValue}`);
            }
            break;
        }
      }
    }
  }
  
  return parts.join(' && ');
};

/**
 * Build PocketBase sort from Prisma orderBy
 * @param {Object|Array} orderBy - { field: 'asc'|'desc' } or [{ field: 'asc' }]
 */
pb._buildPrismaOrderBy = function(orderBy) {
  if (!orderBy) return undefined;
  
  // Handle array format: [{ name: 'asc' }, { created: 'desc' }]
  if (Array.isArray(orderBy)) {
    return orderBy.map(obj => {
      const [field, order] = Object.entries(obj)[0];
      const fieldPath = this._getFieldPath(field);
      return order === 'desc' ? `-${fieldPath}` : fieldPath;
    }).join(',');
  }
  
  // Handle object format: { name: 'asc', created: 'desc' }
  return Object.entries(orderBy)
    .map(([field, order]) => {
      const fieldPath = this._getFieldPath(field);
      return order === 'desc' ? `-${fieldPath}` : fieldPath;
    })
    .join(',');
};

/**
 * Build PocketBase field list from array of field names
 */
pb._buildFieldList = function(fields) {
  if (!fields || fields.length === 0) return undefined;
  
  const baseFields = ['id', 'name', 'doctype', 'created', 'updated', 'collectionId', 'collectionName'];
  const selectedFields = [];
  
  fields.forEach(field => {
    if (baseFields.includes(field)) {
      selectedFields.push(field);
    } else {
      selectedFields.push(`data.${field}`);
    }
  });
  
  // Always include essential fields
  const essentialFields = ['id', 'name', 'doctype'];
  essentialFields.forEach(f => {
    if (!selectedFields.includes(f)) {
      selectedFields.unshift(f);
    }
  });
  
  return selectedFields.join(',');
};

/**
 * Get proper field path for PocketBase queries
 */
pb._getFieldPath = function(field) {
  const baseFields = ['id', 'name', 'doctype', 'created', 'updated'];
  return baseFields.includes(field) ? field : `data.${field}`;
};


// get.listDocs.js

// Version 11. working - next SEE 12 with rendereders 
/**
 * Universal list function with Prisma-compatible where syntax
 * 
 * @example Basic equality
 * await pb.listDocs('Customer', {
 *   where: { status: 'Active', country: 'US' }
 * });
 * 
 * @example Comparison operators
 * await pb.listDocs('Item', {
 *   where: {
 *     price: { gte: 100, lte: 1000 },
 *     stock: { gt: 0 }
 *   }
 * });
 * 
 * @example IN / NOT IN
 * await pb.listDocs('Sales Order', {
 *   where: {
 *     status: { in: ['Draft', 'Submitted'] },
 *     territory: { notIn: ['Cancelled'] }
 *   }
 * });
 * 
 * @example Text search
 * await pb.listDocs('Customer', {
 *   where: {
 *     name: { contains: 'Corp' },
 *     email: { startsWith: 'admin' },
 *     domain: { endsWith: '.com' }
 *   }
 * });
 * 
 * @example Null checks
 * await pb.listDocs('Customer', {
 *   where: {
 *     deleted_at: null,
 *     notes: { not: null }
 *   }
 * });
 * 
 * @example Boolean logic (OR/AND/NOT)
 * await pb.listDocs('Sales Order', {
 *   where: {
 *     OR: [
 *       { status: 'Draft' },
 *       { status: 'Pending' }
 *     ],
 *     AND: [
 *       { grand_total: { gte: 1000 } },
 *       { posting_date: { gte: '2024-01-01' } }
 *     ],
 *     NOT: {
 *       status: 'Cancelled'
 *     }
 *   }
 * });
 * 
 * @example Pagination & Sorting
 * await pb.listDocs('Customer', {
 *   where: { status: 'Active' },
 *   orderBy: { modified: 'desc', name: 'asc' },
 *   take: 50,
 *   skip: 0
 * });
 * 
 * @example With metadata
 * const result = await pb.listDocs('Customer', {
 *   where: { status: 'Active' },
 *   take: 20,
 *   skip: 0
 * }, { includeMeta: true });
 * // result = { data: [...], meta: { total, hasMore } }
 * 
 * @example With schema
 * const result = await pb.listDocs('Customer', {
 *   where: { status: 'Active' }
 * }, { includeSchema: true });
 * // result = { data: [...], schema: { fields: [...] } }
 * 
 * @param {string} doctype - Document type to filter by
 * @param {Object} query - Prisma-style query object
 * @param {Object} query.where - Where clause (Prisma syntax)
 * @param {Object} query.orderBy - Sort order { field: 'asc'|'desc' }
 * @param {number} query.take - Limit results (Prisma name for limit)
 * @param {number} query.skip - Offset results (Prisma name for offset)
 * @param {Array|string} query.select - Fields to fetch, or '*' for all
 * @param {Object} options - Additional options
 * @param {boolean} options.includeMeta - Include pagination metadata
 * @param {boolean} options.includeSchema - Include schema information for returned fields
 * @param {string} options.view - View type for auto field selection
 * @returns {Promise<Array|Object>} Records array or {data, meta, schema} object
 */
pb.listDocs = async function (doctype = '', query = {}, options = {}) {
  const {
    where,
    orderBy,
    take,
    skip,
    select
  } = query;
  
  const {
    includeMeta = false,
    includeSchema = true,
    view = 'list'
  } = options;
  
  // Auto-derive fields from schema if not explicitly provided
  let fields = select;
  let schema = null;
  
  if (!fields && doctype) {
    schema = await this.getSchema(doctype);
    if (schema && schema.fields) {
      // Map view to schema field
      const viewFieldMap = {
        'list': 'in_list_view',
        'card': 'in_card_view',
        'report': 'in_report_view',
        'mobile': 'in_mobile_view'
      };
      
      const viewField = viewFieldMap[view] || 'in_list_view';
      
      // Get fields marked for this view
      const viewFields = schema.fields
        .filter(f => f[viewField])
        .map(f => f.fieldname);
      
      // Always include essential fields
      fields = ['name', 'doctype', 'id', 'created', 'updated', ...viewFields];
    }
  }
  
  // If schema is needed but wasn't fetched yet, fetch it now
  if (includeSchema && !schema && doctype) {
    schema = await this.getSchema(doctype);
  }
  
  // Handle special case: fetch all fields
  if (fields === '*') {
    fields = undefined;
  }
  
  // Build PocketBase filter from Prisma where clause
  const pbFilter = this._buildPrismaWhere(doctype, where);
  
  // Build PocketBase sort from Prisma orderBy
  const pbSort = orderBy ? this._buildPrismaOrderBy(orderBy) : undefined;
  
  // Build field selection
  const pbFields = fields ? this._buildFieldList(fields) : undefined;
  
  // Build query parameters
  const params = {
    filter: pbFilter,
    sort: pbSort,
    fields: pbFields
  };
  
  // Remove undefined params
  Object.keys(params).forEach(key => {
    if (params[key] === undefined) delete params[key];
  });
  
  // Execute query
  let result;
  
  if (take !== undefined) {
    // Paginated query (Prisma uses take/skip, PocketBase uses page/perPage)
    const page = skip ? Math.floor(skip / take) + 1 : 1;
    result = await this.collection(window.MAIN_COLLECTION).getList(page, take, params);
    
    if (includeMeta || includeSchema) {
      const response = {
        data: result.items
      };
      
      if (includeMeta) {
        response.meta = {
          total: result.totalItems,
          page: result.page,
          pageSize: result.perPage,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages
        };
      }
      
      if (includeSchema && schema) {
        // Return only relevant field definitions
        const fieldNames = fields || Object.keys(result.items[0]?.data || {});
        response.schema = {
          ...schema,
          fields: schema.fields?.filter(f => fieldNames.includes(f.fieldname))
        };
      }
      
      return response;
    }
    
    return result.items;
  } else {
    // Full list query
    const items = await this.collection(window.MAIN_COLLECTION).getFullList(params);
    
    if (includeMeta || includeSchema) {
      const response = {
        data: items
      };
      
      if (includeMeta) {
        response.meta = {
          total: items.length,
          page: 1,
          pageSize: items.length,
          totalPages: 1,
          hasMore: false
        };
      }
      
      if (includeSchema && schema) {
        const fieldNames = fields || Object.keys(items[0]?.data || {});
        response.schema = {
          ...schema,
          fields: schema.fields?.filter(f => fieldNames.includes(f.fieldname))
        };
      }
      
      return response;
    }
    
    return items;
  }
};

/**
 * Build PocketBase filter from Prisma where clause
 */
pb._buildPrismaWhere = function(doctype, where) {
  const parts = [];
  
  // Add doctype filter
  if (doctype) {
    parts.push(`doctype = "${doctype}"`);
  }
  
  // Build where clause
  if (where) {
    const whereParts = this._buildWhereClause(where);
    if (whereParts) {
      parts.push(`(${whereParts})`);
    }
  }
  
  return parts.length > 0 ? parts.join(' && ') : undefined;
};

/**
 * Recursively build where clause from Prisma syntax
 */
pb._buildWhereClause = function(where) {
  if (!where || typeof where !== 'object') return '';
  
  const parts = [];
  
  for (const [key, value] of Object.entries(where)) {
    // Handle OR operator
    if (key === 'OR') {
      if (!Array.isArray(value) || value.length === 0) continue;
      const orParts = value
        .map(condition => this._buildWhereClause(condition))
        .filter(Boolean);
      if (orParts.length > 0) {
        parts.push(`(${orParts.join(' || ')})`);
      }
      continue;
    }
    
    // Handle AND operator
    if (key === 'AND') {
      if (!Array.isArray(value) || value.length === 0) continue;
      const andParts = value
        .map(condition => this._buildWhereClause(condition))
        .filter(Boolean);
      if (andParts.length > 0) {
        parts.push(`(${andParts.join(' && ')})`);
      }
      continue;
    }
    
    // Handle NOT operator
    if (key === 'NOT') {
      const notClause = this._buildWhereClause(value);
      if (notClause) {
        parts.push(`!(${notClause})`);
      }
      continue;
    }
    
    // Regular field
    const fieldPath = this._getFieldPath(key);
    
    // Simple equality (string, number, boolean, null)
    if (value === null || value === undefined) {
      parts.push(`${fieldPath} = null`);
      continue;
    }
    
    if (typeof value === 'string') {
      parts.push(`${fieldPath} = "${value}"`);
      continue;
    }
    
    if (typeof value === 'number') {
      parts.push(`${fieldPath} = ${value}`);
      continue;
    }
    
    if (typeof value === 'boolean') {
      parts.push(`${fieldPath} = ${value}`);
      continue;
    }
    
    // Object with operators
    if (typeof value === 'object' && !Array.isArray(value)) {
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case 'equals':
            if (typeof opValue === 'string') {
              parts.push(`${fieldPath} = "${opValue}"`);
            } else {
              parts.push(`${fieldPath} = ${opValue}`);
            }
            break;
          
          case 'in':
            if (Array.isArray(opValue) && opValue.length > 0) {
              const inValues = opValue.map(v => 
                typeof v === 'string' ? `${fieldPath} = "${v}"` : `${fieldPath} = ${v}`
              );
              parts.push(`(${inValues.join(' || ')})`);
            }
            break;
          
          case 'notIn':
            if (Array.isArray(opValue) && opValue.length > 0) {
              const notInValues = opValue.map(v => 
                typeof v === 'string' ? `${fieldPath} != "${v}"` : `${fieldPath} != ${v}`
              );
              parts.push(`(${notInValues.join(' && ')})`);
            }
            break;
          
          case 'contains':
            parts.push(`${fieldPath} ~ "${opValue}"`);
            break;
          
          case 'startsWith':
            parts.push(`${fieldPath} ~ "^${opValue}"`);
            break;
          
          case 'endsWith':
            parts.push(`${fieldPath} ~ "${opValue}$"`);
            break;
          
          case 'gt':
            parts.push(`${fieldPath} > ${opValue}`);
            break;
          
          case 'gte':
            parts.push(`${fieldPath} >= ${opValue}`);
            break;
          
          case 'lt':
            parts.push(`${fieldPath} < ${opValue}`);
            break;
          
          case 'lte':
            parts.push(`${fieldPath} <= ${opValue}`);
            break;
          
          case 'not':
            if (opValue === null) {
              parts.push(`${fieldPath} != null`);
            } else if (typeof opValue === 'string') {
              parts.push(`${fieldPath} != "${opValue}"`);
            } else if (typeof opValue === 'object') {
              // Nested NOT with operators
              const notClause = this._buildWhereClause({ [key]: opValue });
              if (notClause) {
                parts.push(`!(${notClause})`);
              }
            } else {
              parts.push(`${fieldPath} != ${opValue}`);
            }
            break;
        }
      }
    }
  }
  
  return parts.join(' && ');
};

/**
 * Build PocketBase sort from Prisma orderBy
 * @param {Object|Array} orderBy - { field: 'asc'|'desc' } or [{ field: 'asc' }]
 */
pb._buildPrismaOrderBy = function(orderBy) {
  if (!orderBy) return undefined;
  
  // Handle array format: [{ name: 'asc' }, { created: 'desc' }]
  if (Array.isArray(orderBy)) {
    return orderBy.map(obj => {
      const [field, order] = Object.entries(obj)[0];
      const fieldPath = this._getFieldPath(field);
      return order === 'desc' ? `-${fieldPath}` : fieldPath;
    }).join(',');
  }
  
  // Handle object format: { name: 'asc', created: 'desc' }
  return Object.entries(orderBy)
    .map(([field, order]) => {
      const fieldPath = this._getFieldPath(field);
      return order === 'desc' ? `-${fieldPath}` : fieldPath;
    })
    .join(',');
};

/**
 * Build PocketBase field list from array of field names
 */
pb._buildFieldList = function(fields) {
  if (!fields || fields.length === 0) return undefined;
  
  const baseFields = ['id', 'name', 'doctype', 'created', 'updated', 'collectionId', 'collectionName'];
  const selectedFields = [];
  
  fields.forEach(field => {
    if (baseFields.includes(field)) {
      selectedFields.push(field);
    } else {
      selectedFields.push(`data.${field}`);
    }
  });
  
  // Always include essential fields
  const essentialFields = ['id', 'name', 'doctype'];
  essentialFields.forEach(f => {
    if (!selectedFields.includes(f)) {
      selectedFields.unshift(f);
    }
  });
  
  return selectedFields.join(',');
};

/**
 * Get proper field path for PocketBase queries
 */
pb._getFieldPath = function(field) {
  const baseFields = ['id', 'name', 'doctype', 'created', 'updated'];
  return baseFields.includes(field) ? field : `data.${field}`;
};



//___________________________________________________________
// --- REACT COMPONET

pb.components.MainGrid = function({ doctype, pb }) {
  const { createElement: e, useState, useEffect, useMemo } = React;
  
  const [data, setData] = useState([]);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // Single call with includeSchema option
        const result = await pb.listDocs(doctype, {}, { 
          view: 'list',
          includeSchema: true 
        });
        
        setData(result.data);
        setSchema(result.schema);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [doctype, pb]);

  const columns = useMemo(() => {
    if (!schema || data.length === 0) return [];
    
    // Get field names from actual returned data
    const dataFields = Object.keys(data[0].data || {});
    
    return [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue, row }) => e('a', {
          href: '#',
          className: `${pb.BS.text.primary} ${pb.BS.text.bold}`,
          onClick: ev => {
            ev.preventDefault();
            window.selectExistingRecord?.(row.original.id);
          }
        }, pb.getDisplayName(row.original, schema))
      },
      ...dataFields.map(fieldname => {
        const fieldDef = schema.fields?.find(f => f.fieldname === fieldname);
        return {
          accessorKey: `data.${fieldname}`,
          header: fieldDef?.label || fieldname,
          cell: ({ getValue }) => {
            const val = getValue();
            
            if (val === null || val === undefined) {
              return e('span', { className: pb.BS.text.muted }, '—');
            }
            
            if (fieldDef?.fieldtype === 'Check') {
              return val ? '✓' : '✗';
            }
            
            if (fieldDef?.fieldtype === 'Select') {
              const badgeColor = pb.getSelectBadgeColor(val);
              const badgeClass = pb.BS.badge[badgeColor] || pb.BS.badge.secondary;
              return e('span', { className: badgeClass }, val);
            }
            
            if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
              return new Date(val).toLocaleDateString();
            }
            
            return String(val);
          }
        };
      })
    ];
  }, [schema, data, pb, e]);

  return e(pb.components.BaseTable, {
    data,
    columns,
    loading,
    error,
    showPagination: true,
    showSearch: true,
    showSelection: false,
    headerContent: e('h6', { className: pb.BS.spacing.mb0 }, 
      `${doctype} `,
      e('span', { className: pb.BS.badge.info }, data.length)
    )
  });
};

// How to render in React
let container = document.getElementById('main-grid-container');

if (!container) {
  container = document.createElement('div');
  container.id = 'main-grid-container';
  document.body.appendChild(container);
}

ReactDOM.createRoot(container).render(
  React.createElement(pb.components.MainGrid, { doctype: 'Sales Invoice', pb })
);

