// ============================================================================
// SCHEMA MANAGEMENT - Uses pb.query() to fetch schemas
// ============================================================================

/**
 * @function pb.getSchema
 * @description Fetch schema using pb.query() - self-referential!
 * @param {string} doctype - Document type
 * @returns {Promise<Object>} Schema object
 */
pb.getSchema = async function (doctype) {
  // Check cache first
  if (!this._schemaCache) {
    this._schemaCache = {};
  }

  if (this._schemaCache[doctype]) {
    return this._schemaCache[doctype];
  }

  try {
    // ✅ Use pb.query() to fetch schema (self-referential!)
    const result = await this.query('Schema', {
      where: { _schema_doctype: doctype },
      take: 1
    }, {
      includeSchema: false  // ← CRITICAL: Don't fetch schema for Schema!
    });

    if (!result.data || result.data.length === 0) {
      console.warn(`Schema not found for: ${doctype}`);
      return null;
    }

    const schema = result.data[0];
    
    // Cache it
    this._schemaCache[doctype] = schema;
    
    return schema;
  } catch (error) {
    console.error(`Error fetching schema for ${doctype}:`, error);
    return null;
  }
};

/**
 * @function pb.clearSchemaCache
 * @description Clear schema cache
 */
pb.clearSchemaCache = function () {
  this._schemaCache = {};
  console.log('🗑️ Schema cache cleared');
};

// ============================================================================
// UNIVERSAL pb.query()
// ============================================================================

/**
 * @function pb.query
 * @description Universal data operation
 * @param {string} doctype - Document type
 * @param {Object} query - Query object
 * @param {Object} options - Response options
 * @returns {Promise<Object>} Result
 */
pb.query = async function (doctype = "", query = {}, options = {}) {
  const { operation = 'select', data, where } = query;
  const { includeSchema = true } = options;

  // Validate doctype
  if (!doctype) {
    throw new Error('doctype is required');
  }

  // Fetch schema once at the top (unless we're querying Schema itself!)
  let schema = null;
  if (includeSchema && doctype !== 'All' && doctype !== 'Schema') {
    schema = await this.getSchema(doctype);
    // ↑ This calls pb.query('Schema', ...) internally!
  }

  // Route to operation handler
  switch(operation.toLowerCase()) {
    case 'create':
    case 'insert':
      if (!data) throw new Error('CREATE requires data');
      return this._handleCreate(doctype, data, schema, options);
    
    case 'update':
      if (!data) throw new Error('UPDATE requires data');
      if (!where) throw new Error('UPDATE requires where');
      return this._handleUpdate(doctype, where, data, schema, options);
    
    case 'delete':
      if (!where) throw new Error('DELETE requires where');
      return this._handleDelete(doctype, where, schema, options);
    
    case 'select':
    case 'read':
    default:
      return this._handleRead(doctype, query, schema, options);
  }
};

// ... rest of handlers 

// ============================================================================
// OPERATION HANDLERS
// ============================================================================

/**
 * @function pb._handleRead
 * @description Handles SELECT operations
 * @param {string} doctype - Document type
 * @param {Object} query - Query object
 * @param {Object} schema - Schema (already fetched)
 * @param {Object} options - Response options
 * @returns {Promise<Object>} { data, schema?, meta?, viewConfig? }
 */
pb._handleRead = async function (doctype, query, schema, options) {
  const { where, orderBy, take, skip, select, view = 'list' } = query;
  const { includeMeta = false, includeSchema = true } = options;

  // Special case: "All" doctype (query across all types)
  const queryDoctype = doctype === "All" ? "" : doctype;

  // Resolve fields: explicit select > view fields > all fields
  let fields;
  if (select === '*') {
    fields = undefined; // All fields
  } else if (select) {
    fields = Array.isArray(select) ? select : [select];
  } else if (schema?.fields) {
    // Use schema view property: view='list' → 'in_list_view'
    const viewProp = `in_${view}_view`;
    const viewFields = schema.fields
      .filter(f => f[viewProp])
      .map(f => f.fieldname);
    fields = ['name', 'doctype', ...viewFields];
  }

  // Build query parameters
  const pbFilter = this._buildPrismaWhere(queryDoctype, where);
  const pbSort = orderBy ? this._buildPrismaOrderBy(orderBy) : undefined;
  const pbFields = fields ? this._buildFieldList(fields) : undefined;

  const params = {};
  if (pbFilter) params.filter = pbFilter;
  if (pbSort) params.sort = pbSort;
  if (pbFields) params.fields = pbFields;

  // Execute via adapter
  const { items, meta } = await this._dbQuery(params, take, skip);

  // Extract data
  const data = items.map(item => item.data).filter(Boolean);

  // Build response
  const response = { data };
  
  if (includeSchema && schema) {
    response.schema = schema;
  }
  
  if (includeMeta) {
    response.meta = meta;
  }
  
  // Add view configuration for UI
  response.viewConfig = { 
    layout: view === 'card' ? 'grid' : 'table', 
    view 
  };

  return response;
};

/**
 * @function pb._handleCreate
 * @description Handles CREATE operations
 * @param {string} doctype - Document type
 * @param {Object} data - Record data
 * @param {Object} schema - Schema
 * @param {Object} options - Response options
 * @returns {Promise<Object>} { data, schema?, meta? }
 */
pb._handleCreate = async function (doctype, data, schema, options) {
  const { includeSchema = true, includeMeta = false } = options;

  // Prepare record data
  const recordData = {
    ...data,
    doctype,
    name: data.name || this._generateName(doctype)
  };

  // Execute via adapter
  const result = await this._dbCreate(recordData);

  // Build response
  const response = { data: [result.data] };
  
  if (includeSchema && schema) {
    response.schema = schema;
  }
  
  if (includeMeta) {
    response.meta = { 
      operation: 'create', 
      created: 1,
      recordId: result.data.name
    };
  }

  return response;
};

/**
 * @function pb._handleUpdate
 * @description Handles UPDATE operations
 * @param {string} doctype - Document type
 * @param {Object} where - Filter criteria
 * @param {Object} data - Updated data
 * @param {Object} schema - Schema
 * @param {Object} options - Response options
 * @returns {Promise<Object>} { data, schema?, meta? }
 */
pb._handleUpdate = async function (doctype, where, data, schema, options) {
  const { includeSchema = true, includeMeta = false } = options;

  // Build filter
  const queryDoctype = doctype === "All" ? "" : doctype;
  const pbFilter = this._buildPrismaWhere(queryDoctype, where);

  // Find matching records
  const { items } = await this._dbQuery({ filter: pbFilter });

  if (items.length === 0) {
    return { 
      data: [], 
      meta: includeMeta ? { operation: 'update', updated: 0 } : undefined 
    };
  }

  // Update each record via adapter
  const updates = await Promise.all(
    items.map(item => this._dbUpdate(item.data.name, data))
  );

  // Build response
  const response = { data: updates.map(u => u.data) };
  
  if (includeSchema && schema) {
    response.schema = schema;
  }
  
  if (includeMeta) {
    response.meta = { 
      operation: 'update', 
      updated: updates.length,
      recordIds: updates.map(u => u.data.name)
    };
  }

  return response;
};

/**
 * @function pb._handleDelete
 * @description Handles DELETE operations
 * @param {string} doctype - Document type
 * @param {Object} where - Filter criteria
 * @param {Object} schema - Schema
 * @param {Object} options - Response options
 * @returns {Promise<Object>} { data, meta? }
 */
pb._handleDelete = async function (doctype, where, schema, options) {
  const { includeMeta = false } = options;

  // Require where clause for safety
  if (!where || Object.keys(where).length === 0) {
    throw new Error('DELETE requires WHERE clause to prevent accidental mass deletion');
  }

  // Build filter
  const queryDoctype = doctype === "All" ? "" : doctype;
  const pbFilter = this._buildPrismaWhere(queryDoctype, where);

  // Find matching records
  const { items } = await this._dbQuery({ filter: pbFilter });

  if (items.length === 0) {
    return { 
      data: [], 
      meta: includeMeta ? { operation: 'delete', deleted: 0 } : undefined 
    };
  }

  // Delete each record via adapter
  await Promise.all(
    items.map(item => this._dbDelete(item.data.name))
  );

  // Build response
  const response = { data: [] };
  
  if (includeMeta) {
    response.meta = { 
      operation: 'delete', 
      deleted: items.length,
      recordIds: items.map(i => i.data.name)
    };
  }

  return response;
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * @function pb._generateName
 * @description Generate unique name for record
 * @param {string} doctype - Document type
 * @returns {string} Generated name
 */
pb._generateName = function (doctype) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);    //TODO: fix this
  return `${doctype.toLowerCase()}-${timestamp}-${random}`;
};

console.log("✅ pb-query.js loaded");

// ============================================================================
// pb-query.js - Query Translation Layer
// Converts Prisma-style queries to database-specific syntax
// ============================================================================

/**
 * @function pb._buildPrismaWhere
 * @description Converts Prisma where clause to PocketBase filter string
 * @param {string} doctype - Document type (empty for "All")
 * @param {Object} where - Prisma where conditions
 * @returns {string|undefined} PocketBase filter string
 */
pb._buildPrismaWhere = function (doctype, where) {
  const parts = [];

  // Add doctype filter (if not querying all types)
  if (doctype) {
    parts.push(`doctype = "${doctype}"`);
  }

  // Build where clause from conditions
  if (where) {
    const whereParts = this._buildWhereClause(where);
    if (whereParts) {
      parts.push(`(${whereParts})`);
    }
  }

  return parts.length > 0 ? parts.join(" && ") : undefined;
};

/**
 * @function pb._buildWhereClause
 * @description Recursively builds where clause from Prisma syntax
 * @param {Object} where - Where conditions object
 * @returns {string} Filter expression
 */
pb._buildWhereClause = function (where) {
  if (!where || typeof where !== "object") return "";

  const parts = [];

  for (const [key, value] of Object.entries(where)) {
    // Handle logical operators
    if (key === "OR") {
      if (!Array.isArray(value) || value.length === 0) continue;
      const orParts = value
        .map((condition) => this._buildWhereClause(condition))
        .filter(Boolean);
      if (orParts.length > 0) {
        parts.push(`(${orParts.join(" || ")})`);
      }
      continue;
    }

    if (key === "AND") {
      if (!Array.isArray(value) || value.length === 0) continue;
      const andParts = value
        .map((condition) => this._buildWhereClause(condition))
        .filter(Boolean);
      if (andParts.length > 0) {
        parts.push(`(${andParts.join(" && ")})`);
      }
      continue;
    }

    if (key === "NOT") {
      const notClause = this._buildWhereClause(value);
      if (notClause) {
        parts.push(`!(${notClause})`);
      }
      continue;
    }

    // Regular field
    const fieldPath = this._getFieldPath(key);

    // Simple equality
    if (value === null || value === undefined) {
      parts.push(`${fieldPath} = null`);
      continue;
    }

    if (typeof value === "string") {
      parts.push(`${fieldPath} = "${value}"`);
      continue;
    }

    if (typeof value === "number") {
      parts.push(`${fieldPath} = ${value}`);
      continue;
    }

    if (typeof value === "boolean") {
      parts.push(`${fieldPath} = ${value}`);
      continue;
    }

    // Object with operators
    if (typeof value === "object" && !Array.isArray(value)) {
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case "equals":
            if (typeof opValue === "string") {
              parts.push(`${fieldPath} = "${opValue}"`);
            } else {
              parts.push(`${fieldPath} = ${opValue}`);
            }
            break;

          case "in":
            if (Array.isArray(opValue) && opValue.length > 0) {
              const inValues = opValue.map((v) =>
                typeof v === "string"
                  ? `${fieldPath} = "${v}"`
                  : `${fieldPath} = ${v}`
              );
              parts.push(`(${inValues.join(" || ")})`);
            }
            break;

          case "notIn":
            if (Array.isArray(opValue) && opValue.length > 0) {
              const notInValues = opValue.map((v) =>
                typeof v === "string"
                  ? `${fieldPath} != "${v}"`
                  : `${fieldPath} != ${v}`
              );
              parts.push(`(${notInValues.join(" && ")})`);
            }
            break;

          case "contains":
            parts.push(`${fieldPath} ~ "${opValue}"`);
            break;

          case "startsWith":
            parts.push(`${fieldPath} ~ "^${opValue}"`);
            break;

          case "endsWith":
            parts.push(`${fieldPath} ~ "${opValue}$"`);
            break;

          case "gt":
            parts.push(`${fieldPath} > ${opValue}`);
            break;

          case "gte":
            parts.push(`${fieldPath} >= ${opValue}`);
            break;

          case "lt":
            parts.push(`${fieldPath} < ${opValue}`);
            break;

          case "lte":
            parts.push(`${fieldPath} <= ${opValue}`);
            break;

          case "not":
            if (opValue === null) {
              parts.push(`${fieldPath} != null`);
            } else if (typeof opValue === "string") {
              parts.push(`${fieldPath} != "${opValue}"`);
            } else if (typeof opValue === "object") {
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

  return parts.join(" && ");
};

/**
 * @function pb._buildPrismaOrderBy
 * @description Converts Prisma orderBy to PocketBase sort string
 * @param {Object|Array} orderBy - { field: 'asc'|'desc' } or array
 * @returns {string} PocketBase sort string (e.g., "-created,+name")
 */
pb._buildPrismaOrderBy = function (orderBy) {
  if (!orderBy) return undefined;

  // Handle array format: [{ name: 'asc' }, { created: 'desc' }]
  if (Array.isArray(orderBy)) {
    return orderBy
      .map((obj) => {
        const [field, order] = Object.entries(obj)[0];
        const fieldPath = this._getFieldPath(field);
        return order === "desc" ? `-${fieldPath}` : `+${fieldPath}`;
      })
      .join(",");
  }

  // Handle object format: { name: 'asc', created: 'desc' }
  return Object.entries(orderBy)
    .map(([field, order]) => {
      const fieldPath = this._getFieldPath(field);
      return order === "desc" ? `-${fieldPath}` : `+${fieldPath}`;
    })
    .join(",");
};

/**
 * @function pb._buildFieldList
 * @description Converts field array to PocketBase fields parameter
 * @param {Array<string>} fields - Array of field names
 * @returns {string} Comma-separated field list
 */
pb._buildFieldList = function (fields) {
  if (!fields || !Array.isArray(fields)) return undefined;
  return fields.join(",");
};

/**
 * @function pb._getFieldPath
 * @description Converts field name to database field path
 * @param {string} fieldName - Field name
 * @returns {string} Field path (e.g., "data.email" for nested JSON)
 */
pb._getFieldPath = function (fieldName) {
  // Special fields that are not nested in data
  if (fieldName === 'doctype' || fieldName === 'name' || fieldName === 'id') {
    return fieldName;
  }
  
  // Regular fields are nested in data object
  return `data.${fieldName}`;
};

console.log("✅ pb-query-builders.js loaded");