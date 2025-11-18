// pb-adapter-pocketbase.js
pb._adapters = pb._adapters || {};

pb._adapters.pocketbase = {
  async query(params, take, skip) {
    const cleanParams = {};
    if (params.filter) cleanParams.filter = params.filter;
    if (params.sort) cleanParams.sort = params.sort;

    let result;
    let items;
    let metaData;

    if (take !== undefined) {
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
      items = await pb.collection(window.MAIN_COLLECTION).getFullList(cleanParams);
      metaData = {
        total: items.length,
        page: 1,
        pageSize: items.length,
        totalPages: 1,
        hasMore: false
      };
    }

    // ✅ Extract .data from all items
    return {
      data: items.map(item => item.data),
      meta: metaData
    };
  }
};


//https://claude.ai/chat/ea5d6df6-3c04-41cf-9d12-3787f3817fe2
// TODO o add the other operations (CREATE/UPDATE/DELETE)

/*  this moved to switch Set PocketBase as active adapter
pb._currentAdapter = 'pocketbase';

// Adapter delegation
pb._dbQuery = async function (params, take, skip) {
  return await this._adapters[this._currentAdapter].query(params, take, skip);
};

console.log("✅ PocketBase adapter loaded (SELECT only)");*/