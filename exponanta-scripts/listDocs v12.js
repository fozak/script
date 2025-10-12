
//v12
/**
 * Field Renderer Registry  * Each fieldtype has display and edit renderers
 */
pb.fieldRenderers = {
  
  // CHECKBOX FIELD
  Check: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (value === null || value === undefined) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      return value ? '✓' : '✗';
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly } = context;
      return e('div', { className: pb.BS.form.check },
        e('input', {
          type: 'checkbox',
          checked: !!value,
          onChange: ev => onChange(ev.target.checked ? 1 : 0),
          disabled: readOnly,
          className: pb.BS.form.checkInput,
          id: `field-${fieldDef.fieldname}`
        }),
        context.showLabel && e('label', {
          className: pb.BS.form.checkLabel,
          htmlFor: `field-${fieldDef.fieldname}`
        }, fieldDef.label)
      );
    },
    
    processValue: (rawValue) => rawValue ? 1 : 0
  },
  
  // SELECT FIELD
  Select: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (!value) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      const badgeColor = pb.getSelectBadgeColor(value);
      const badgeClass = pb.BS.badge[badgeColor] || pb.BS.badge.secondary;
      return e('span', { className: badgeClass }, value);
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly } = context;
      const options = pb.parseSelectOptions(fieldDef.options);
      
      return e('select', {
        value: value || '',
        onChange: ev => onChange(ev.target.value),
        disabled: readOnly,
        className: `${pb.BS.input.base} ${context.location === 'childTable' ? pb.BS.input.sm : ''}`
      }, [
        e('option', { key: 'empty', value: '' }, `-- Select ${fieldDef.label} --`),
        ...options.map(opt =>
          e('option', { key: opt.value, value: opt.value }, opt.text)
        )
      ]);
    },
    
    processValue: (rawValue) => rawValue || null
  },
  
  // LINK FIELD
  Link: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (!value) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      return e('a', {
        href: '#',
        className: pb.BS.text.primary,
        onClick: ev => {
          ev.preventDefault();
          // Handle link navigation
        }
      }, value);
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly, options = [] } = context;
      
      return e('select', {
        value: value || '',
        onChange: ev => onChange(ev.target.value),
        disabled: readOnly,
        className: pb.BS.input.base
      }, [
        e('option', { key: 'empty', value: '' }, `-- Select ${fieldDef.label} --`),
        ...options.map(opt =>
          e('option', { key: opt.value, value: opt.value }, opt.text)
        )
      ]);
    },
    
    processValue: (rawValue) => rawValue || null
  },
  
  // DYNAMIC LINK FIELD
  'Dynamic Link': {
    display: (value, fieldDef, context) => {
      // Same as Link for display
      return pb.fieldRenderers.Link.display(value, fieldDef, context);
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly, formData = {}, options = [] } = context;
      
      const dependentField = fieldDef.options;
      const dependentValue = formData[dependentField];
      const isReady = !!dependentValue;
      
      if (!isReady) {
        return e('select', {
          disabled: true,
          className: pb.BS.input.base
        }, 
          e('option', {}, `Select ${dependentField} first`)
        );
      }
      
      return e('select', {
        value: value || '',
        onChange: ev => onChange(ev.target.value),
        disabled: readOnly,
        className: pb.BS.input.base
      }, [
        e('option', { key: 'empty', value: '' }, `-- Select ${fieldDef.label} --`),
        ...options.map(opt =>
          e('option', { key: opt.value, value: opt.value }, opt.text)
        )
      ]);
    },
    
    processValue: (rawValue) => rawValue || null
  },
  
  // DATE FIELD
  Date: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (!value) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(value).toLocaleDateString();
      }
      return String(value);
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly } = context;
      return e('input', {
        type: 'date',
        value: value || '',
        onChange: ev => onChange(ev.target.value),
        disabled: readOnly,
        className: pb.BS.input.base
      });
    },
    
    processValue: (rawValue) => rawValue || null
  },
  
  // DATETIME FIELD
  Datetime: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (!value) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      return new Date(value).toLocaleString();
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly } = context;
      return e('input', {
        type: 'datetime-local',
        value: value || '',
        onChange: ev => onChange(ev.target.value),
        disabled: readOnly,
        className: pb.BS.input.base
      });
    },
    
    processValue: (rawValue) => rawValue || null
  },
  
  // INT FIELD
  Int: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (value === null || value === undefined) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      return String(value);
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly } = context;
      return e('input', {
        type: 'number',
        value: value || '',
        onChange: ev => onChange(ev.target.value),
        disabled: readOnly,
        className: pb.BS.input.base,
        step: '1'
      });
    },
    
    processValue: (rawValue) => {
      if (rawValue === '' || rawValue === null || rawValue === undefined) return null;
      return parseInt(rawValue, 10);
    }
  },
  
  // FLOAT/CURRENCY/PERCENT FIELDS
  Float: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (value === null || value === undefined) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      return String(value);
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly } = context;
      return e('input', {
        type: 'number',
        value: value || '',
        onChange: ev => onChange(ev.target.value),
        disabled: readOnly,
        className: pb.BS.input.base,
        step: '0.01'
      });
    },
    
    processValue: (rawValue) => {
      if (rawValue === '' || rawValue === null || rawValue === undefined) return null;
      return parseFloat(rawValue);
    }
  },
  
  // CURRENCY (uses Float renderer with currency formatting)
  Currency: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (value === null || value === undefined) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    },
    
    edit: (value, fieldDef, context) => {
      return pb.fieldRenderers.Float.edit(value, fieldDef, context);
    },
    
    processValue: (rawValue) => {
      return pb.fieldRenderers.Float.processValue(rawValue);
    }
  },
  
  // PERCENT (uses Float renderer with % display)
  Percent: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (value === null || value === undefined) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      return `${value}%`;
    },
    
    edit: (value, fieldDef, context) => {
      return pb.fieldRenderers.Float.edit(value, fieldDef, context);
    },
    
    processValue: (rawValue) => {
      return pb.fieldRenderers.Float.processValue(rawValue);
    }
  },
  
  // TEXT/SMALL TEXT FIELDS
  Data: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (!value) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      return String(value);
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly } = context;
      return e('input', {
        type: 'text',
        value: value || '',
        onChange: ev => onChange(ev.target.value),
        disabled: readOnly,
        className: pb.BS.input.base
      });
    },
    
    processValue: (rawValue) => rawValue || null
  },
  
  // TEXTAREA FIELDS (Text, Small Text, Text Editor, Code)
  Text: {
    display: (value, fieldDef, context) => {
      const { createElement: e, pb } = context;
      if (!value) {
        return e('span', { className: pb.BS.text.muted }, '—');
      }
      // Truncate in table view
      if (context.location === 'table' && value.length > 50) {
        return e('span', { title: value }, value.substring(0, 50) + '...');
      }
      return String(value);
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly } = context;
      return e('textarea', {
        value: value || '',
        onChange: ev => onChange(ev.target.value),
        disabled: readOnly,
        className: pb.BS.input.base,
        rows: 3
      });
    },
    
    processValue: (rawValue) => rawValue || null
  },
  
  // EDITABLE CONTENT (for child tables)
  Editable: {
    display: (value, fieldDef, context) => {
      return pb.fieldRenderers.Data.display(value, fieldDef, context);
    },
    
    edit: (value, fieldDef, context) => {
      const { createElement: e, pb, onChange, readOnly } = context;
      return e('div', {
        contentEditable: !readOnly,
        suppressContentEditableWarning: true,
        className: `${pb.BS.spacing.px2} ${pb.BS.spacing.py1} ${readOnly ? `${pb.BS.bg.light} ${pb.BS.text.muted}` : ''}`,
        style: {
          minWidth: '80px',
          cursor: readOnly ? 'not-allowed' : 'text'
        },
        onBlur: ev => !readOnly && onChange(ev.target.textContent),
        title: readOnly ? `Auto-filled from: ${fieldDef.fetch_from}` : ''
      }, value || '');
    },
    
    processValue: (rawValue) => rawValue || null
  }
};

// Alias common fieldtypes to base renderers
pb.fieldRenderers['Small Text'] = pb.fieldRenderers.Text;
pb.fieldRenderers['Text Editor'] = pb.fieldRenderers.Text;
pb.fieldRenderers.Code = pb.fieldRenderers.Text;
pb.fieldRenderers['Long Text'] = pb.fieldRenderers.Text;

/**
 * Main render function - delegates to appropriate renderer
 */
pb.renderField = function(value, fieldDef, context) {
  if (!fieldDef) {
    // Fallback for unknown fields
    return context.createElement('span', {}, String(value || ''));
  }
  
  const renderer = this.fieldRenderers[fieldDef.fieldtype];
  
  if (!renderer) {
    // Fallback to Data renderer for unknown types
    return this.fieldRenderers.Data[context.mode](value, fieldDef, context);
  }
  
  const mode = context.mode || 'display';
  return renderer[mode](value, fieldDef, context);
};

/**
 * Process field value before saving
 */
pb.processFieldValue = function(value, fieldDef) {
  const renderer = this.fieldRenderers[fieldDef.fieldtype];
  
  if (!renderer || !renderer.processValue) {
    return value;
  }
  
  return renderer.processValue(value);
};


//-getDocs.js

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



// Maind grid 

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
          cell: ({ getValue, row }) => {
            const val = getValue();
            
            // Delegate to field renderer registry
            return pb.renderField(val, fieldDef, {
              mode: 'display',
              location: 'table',
              row: row.original,
              pb: pb,
              createElement: e
            });
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


//--test

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