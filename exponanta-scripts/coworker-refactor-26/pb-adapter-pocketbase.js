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
      result = await pb
        .collection(window.MAIN_COLLECTION)
        .getList(page, take, cleanParams);

      items = result.items;
      metaData = {
        total: result.totalItems,
        page: result.page,
        pageSize: result.perPage,
        totalPages: result.totalPages,
        hasMore: result.page < result.totalPages,
      };
    } else {
      items = await pb
        .collection(window.MAIN_COLLECTION)
        .getFullList(cleanParams);
      metaData = {
        total: items.length,
        page: 1,
        pageSize: items.length,
        totalPages: 1,
        hasMore: false,
      };
    }

    // ✅ Extract .data from all items
    return {
      data: items.map((item) => item.data),
      meta: metaData,
    };
  },

  // -------------------------------
  // CREATE
  // -------------------------------
  async create(inputData) {
    //not implementsd
  },

  // -------------------------------
  // UPDATE
  // -------------------------------

  async update(id, data) {
    if (!id) {
      throw new Error("UPDATE requires an id (record name)");
    }

    if (!data || typeof data !== "object") {
      throw new Error("UPDATE requires data object");
    }

    try {
      // Find record by name (to get PocketBase ID)
      const records = await pb.collection(window.MAIN_COLLECTION).getFullList({
        filter: `name = "${id}"`,
      });

      if (records.length === 0) {
        throw new Error(`Record not found: ${id}`);
      }

      const record = records[0];

      // ✅ Write complete document (handler already merged if needed)
      const updated = await pb.collection(window.MAIN_COLLECTION).update(
        record.id,
        { data: data } // Complete document from handler
      );

      return {
        data: updated.data,
        meta: {
          id: updated.id,
          updated: updated.updated,
        },
      };
    } catch (error) {
      console.error("PocketBase UPDATE error:", error);
      throw new Error(`UPDATE failed: ${error.message}`);
    }
  },


  
};
