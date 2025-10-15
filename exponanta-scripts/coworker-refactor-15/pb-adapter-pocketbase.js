// ============================================================================
// pb-adapter-pocketbase.js - PocketBase Adapter (SELECT operation only)
// ============================================================================

pb._adapters = pb._adapters || {};

pb._adapters.pocketbase = {
  /**
   * @function query
   * @description Execute SELECT query on PocketBase
   * @param {Object} params - { filter, sort, fields }
   * @param {number} take - Page size
   * @param {number} skip - Skip count
   * @returns {Promise<Object>} { items, meta }
   */
  async query(params, take, skip) {
    const cleanParams = {};
    if (params.filter) cleanParams.filter = params.filter;
    if (params.sort) cleanParams.sort = params.sort;
    //if (params.fields) cleanParams.fields = params.fields;

    let result;
    let items;
    let metaData;

    if (take !== undefined) {
      // Paginated query
      const page = skip ? Math.floor(skip / take) + 1 : 1;
      result = await pb.collection(window.MAIN_COLLECTION).getList(
        page,
        take,
        cleanParams
      );
      
      items = result.items;
      metaData = {
        total: result.totalItems,
        page: result.page,
        pageSize: result.perPage,
        totalPages: result.totalPages,
        hasMore: result.page < result.totalPages
      };
    } else {
      // Full list query
      items = await pb.collection(window.MAIN_COLLECTION).getFullList(cleanParams);
      metaData = {
        total: items.length,
        page: 1,
        pageSize: items.length,
        totalPages: 1,
        hasMore: false
      };
    }

    // Return in standard format
    return {
      items: items,  // PocketBase already has .data field
      meta: metaData
    };
  }
};


//https://claude.ai/chat/ea5d6df6-3c04-41cf-9d12-3787f3817fe2
// TODO o add the other operations (CREATE/UPDATE/DELETE)

// Set PocketBase as active adapter
pb._currentAdapter = 'pocketbase';

// Adapter delegation
pb._dbQuery = async function (params, take, skip) {
  return await this._adapters[this._currentAdapter].query(params, take, skip);
};

console.log("✅ PocketBase adapter loaded (SELECT only)");