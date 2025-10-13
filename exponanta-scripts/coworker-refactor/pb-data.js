// v 14 b-data.js - TESTED

// ==============================================
// 📝 Schema Database Operations
// ==============================================

/**
 * @func getSchema
 * @description Get schema data for a given doctype v6.
 */
pb.getSchema = async function (doctype) {
  try {
    const schemaResult = await this.collection(window.MAIN_COLLECTION).getList(
      1,
      1,
      {
        filter: `doctype = "Schema" && data._schema_doctype = "${doctype}"`,
      }
    );
    return schemaResult.items.length > 0 ? schemaResult.items[0].data : null;
  } catch (error) {
    console.error(`Error fetching schema for doctype "${doctype}":`, error);
    return null;
  }
};

//---

pb.listDocs = async function (doctype = "", query = {}, options = {}) {
  const { where, orderBy, take, skip, select } = query;

  const {
    includeMeta = false,
    includeSchema = true, // Default to true
    view = "list",
  } = options;

  // Auto-derive fields from schema if not explicitly provided
  let fields = select;
  let schema = null;

  if (!fields && doctype) {
    schema = await this.getSchema(doctype);
    if (schema && schema.fields) {
      const viewFieldMap = {
        list: "in_list_view",
        card: "in_card_view",
        report: "in_report_view",
        mobile: "in_mobile_view",
      };

      const viewField = viewFieldMap[view] || "in_list_view";

      // Get fields marked for this view
      const viewFields = schema.fields
        .filter((f) => f[viewField])
        .map((f) => f.fieldname);

      // Always include name and doctype, plus view fields
      fields = ["name", "doctype", ...viewFields];
    }
  }

  // Handle special case: fetch all fields
  if (fields === "*") {
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
    fields: pbFields,
  };

  // Remove undefined params
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined) delete params[key];
  });

  // Execute query
  let result;
  let items;
  let metaData;

  if (take !== undefined) {
    // Paginated query (Prisma uses take/skip, PocketBase uses page/perPage)
    const page = skip ? Math.floor(skip / take) + 1 : 1;
    result = await this.collection(window.MAIN_COLLECTION).getList(
      page,
      take,
      params
    );
    items = result.items;
    metaData = {
      total: result.totalItems,
      page: result.page,
      pageSize: result.perPage,
      totalPages: result.totalPages,
      hasMore: result.page < result.totalPages,
    };
  } else {
    // Full list query
    items = await this.collection(window.MAIN_COLLECTION).getFullList(params);
    metaData = {
      total: items.length,
      page: 1,
      pageSize: items.length,
      totalPages: 1,
      hasMore: false,
    };
  }

  // Extract nested data only (flatten items)
  const flattenedItems = items.map((item) => item.data);

  // Auto-infer schema if not fetched yet and schema is needed
  if (includeSchema && !schema && items.length > 0) {
    const inferredDoctype = items[0].data?.doctype;
    if (inferredDoctype) {
      schema = await this.getSchema(inferredDoctype);
    }
  }

  // ALWAYS return consistent structure
  const response = {
    data: flattenedItems,
  };

  // Add schema if available AND requested
  if (includeSchema && schema) {
    if (fields) {
      // Filter schema fields if specific fields were requested
      response.schema = {
        ...schema,
        fields: schema.fields?.filter((f) => fields.includes(f.fieldname)),
      };
    } else {
      response.schema = schema;
    }
  }

  // Add meta if requested
  if (includeMeta) {
    response.meta = metaData;
  }

  return response;
};

/**
 * Build PocketBase filter from Prisma where clause
 */
pb._buildPrismaWhere = function (doctype, where) {
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

  return parts.length > 0 ? parts.join(" && ") : undefined;
};

/**
 * Recursively build where clause from Prisma syntax
 */
pb._buildWhereClause = function (where) {
  if (!where || typeof where !== "object") return "";

  const parts = [];

  for (const [key, value] of Object.entries(where)) {
    // Handle OR operator
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

    // Handle AND operator
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

    // Handle NOT operator
    if (key === "NOT") {
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

  return parts.join(" && ");
};

/**
 * Build PocketBase sort from Prisma orderBy
 * @param {Object|Array} orderBy - { field: 'asc'|'desc' } or [{ field: 'asc' }]
 */
pb._buildPrismaOrderBy = function (orderBy) {
  if (!orderBy) return undefined;

  // Handle array format: [{ name: 'asc' }, { created: 'desc' }]
  if (Array.isArray(orderBy)) {
    return orderBy
      .map((obj) => {
        const [field, order] = Object.entries(obj)[0];
        const fieldPath = this._getFieldPath(field);
        return order === "desc" ? `-${fieldPath}` : fieldPath;
      })
      .join(",");
  }

  // Handle object format: { name: 'asc', created: 'desc' }
  return Object.entries(orderBy)
    .map(([field, order]) => {
      const fieldPath = this._getFieldPath(field);
      return order === "desc" ? `-${fieldPath}` : fieldPath;
    })
    .join(",");
};

/**
 * Build PocketBase field list from array of field names
 */
pb._buildFieldList = function (fields) {
  if (!fields || fields.length === 0) return undefined;

  const selectedFields = [];

  // Add all requested fields under data.* namespace
  fields.forEach((field) => {
    selectedFields.push(`data.${field}`);
  });

  return selectedFields.join(",");
};

/**
 * Get proper field path for PocketBase queries
 */
pb._getFieldPath = function (field) {
  return `data.${field}`;
};

//*END OF listDocs.js *//

// ==========================================
// pb.navigation - Self-contained navigation system
// Requires: pb (from pb-core.js) and pb.listDocs (defined earlier in this file)
// ==========================================

pb.navigation = (function () {
  "use strict";

  const VERSION = "2.0.0";

  // ==========================================
  // Private State
  // ==========================================

  let currentList = null;
  let isLoading = false;
  const listeners = new Set();

  // ==========================================
  // Private Helper Functions
  // ==========================================

  function paramsToURL(params) {
    try {
      const compressed = btoa(JSON.stringify(params));
      return `p=${compressed}`;
    } catch (error) {
      console.error("Failed to encode params:", error);
      return "";
    }
  }

  function urlToParams() {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const compressed = searchParams.get("p");
      if (!compressed) {
        return { doctype: "", query: {}, options: {} };
      }
      return JSON.parse(atob(compressed));
    } catch (error) {
      console.error("Failed to decode URL params:", error);
      return { doctype: "", query: {}, options: {} };
    }
  }

  function validateParams(params) {
    if (!params || typeof params !== "object") {
      throw new Error("Invalid params. Expected: { doctype, query, options }");
    }
    return {
      doctype: params.doctype || "",
      query: params.query || {},
      options: params.options || {},
    };
  }

  function notify() {
    listeners.forEach((callback) => {
      try {
        callback(currentList, isLoading);
      } catch (error) {
        console.error("Subscriber error:", error);
      }
    });
  }

  // ==========================================
  // Public Functions
  // ==========================================

  async function navigate(params, replaceState = false) {
    const fullParams = validateParams(params);

    console.log("🚀 Navigating to:", fullParams);

    isLoading = true;
    notify();

    try {
      // Call pb.listDocs (defined earlier in pb-data.js)
      const result = await pb.listDocs(
        fullParams.doctype,
        fullParams.query,
        fullParams.options
      );

      // Update URL
      const url = `?${paramsToURL(fullParams)}`;
      if (replaceState) {
        window.history.replaceState(fullParams, "", url);
      } else {
        window.history.pushState(fullParams, "", url);
      }

      // Update current list (source of truth)
      currentList = {
        params: fullParams,
        data: result.data || [],
        schema: result.schema || null,
        meta: result.meta || null,
      };

      console.log("✅ Navigation complete:", currentList);

      isLoading = false;
      notify();

      return currentList;
    } catch (error) {
      console.error("❌ Navigation error:", error);
      isLoading = false;
      notify();
      throw error;
    }
  }

  function subscribe(callback) {
    if (typeof callback !== "function") {
      throw new Error("Subscriber must be a function");
    }

    // Add subscriber
    listeners.add(callback);

    // Call immediately with current state
    try {
      callback(currentList, isLoading);
    } catch (error) {
      console.error("Initial subscriber call error:", error);
    }

    // Return unsubscribe function
    return function unsubscribe() {
      listeners.delete(callback);
    };
  }

  function goBack() {
    console.log("⬅️ Going back");
    window.history.back();
  }

  function goForward() {
    console.log("➡️ Going forward");
    window.history.forward();
  }

  async function refresh() {
    if (!currentList) {
      console.warn("Nothing to refresh");
      return null;
    }
    console.log("🔄 Refreshing current view");
    return navigate(currentList.params, true);
  }

  function getCurrent() {
    return currentList;
  }

  function getParams() {
    return currentList?.params || null;
  }

  function canGoBack() {
    return window.history.length > 1;
  }

  function getSubscriberCount() {
    return listeners.size;
  }

  // ==========================================
  // Browser Back/Forward Handler
  // ==========================================

  async function handlePopState(event) {
    console.log("🔙 Browser back/forward detected");

    const params = event.state || urlToParams();
    console.log("📍 Restoring state:", params);

    isLoading = true;
    notify();

    try {
      const result = await pb.listDocs(
        params.doctype || "",
        params.query || {},
        params.options || {}
      );

      currentList = {
        params,
        data: result.data || [],
        schema: result.schema || null,
        meta: result.meta || null,
      };

      console.log("✅ State restored:", currentList);
    } catch (error) {
      console.error("❌ Error restoring state:", error);
    } finally {
      isLoading = false;
      notify();
    }
  }

  // Install popstate listener
  window.addEventListener("popstate", handlePopState);

  // ==========================================
  // Auto-Initialize from URL
  // ==========================================

  (async function init() {
    const params = urlToParams();

    // Only navigate if URL has params
    if (params.doctype || Object.keys(params.query).length > 0) {
      console.log("🎬 Initializing navigation from URL:", params);
      await navigate(params, true);
    } else {
      console.log("💡 Navigation ready. No URL params to restore.");
    }
  })();

  // ==========================================
  // Public API
  // ==========================================

  return {
    VERSION,
    navigate,
    subscribe,
    goBack,
    goForward,
    refresh,
    getCurrent,
    getParams,
    canGoBack,
    getSubscriberCount,
  };
})();

// ==========================================
// pb.nav - Convenience Shortcuts
// ==========================================

pb.nav = {

home: () => {
    return pb.navigation.navigate({
      doctype: "All",  // ✅ Use "All" as a real doctype
      query: {},
      options: {}
    });
  },

  // Quick navigate to list
  list: (doctype, options = {}) => {
    return pb.navigation.navigate({
      doctype,
      query: {},
      options,
    });
  },

  // Quick navigate to filtered list
  filter: (doctype, where, options = {}) => {
    return pb.navigation.navigate({
      doctype,
      query: { where },
      options,
    });
  },

  // Quick navigate to single item by name
  item: (name, doctype = "", options = {}) => {
    return pb.navigation.navigate({
      doctype,
      query: { where: { name }, take: 1 },
      options,
    });
  },

  // Navigate to item in edit mode
  edit: (name, doctype = "") => {
    return pb.navigation.navigate({
      doctype,
      query: { where: { name }, take: 1 },
      options: { mode: "edit" },
    });
  },

  // Navigate to item in view mode
  view: (name, doctype = "") => {
    return pb.navigation.navigate({
      doctype,
      query: { where: { name }, take: 1 },
      options: { mode: "view" },
    });
  },

  // Get current state
  current: () => pb.navigation.getCurrent(),

  // Navigation controls
  back: () => pb.navigation.goBack(),
  forward: () => pb.navigation.goForward(),
  refresh: () => pb.navigation.refresh(),
};

console.log(`✅ pb.navigation v${pb.navigation.VERSION} loaded`);
