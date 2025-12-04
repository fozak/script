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
 async update(name, inputData) {
  // 1️⃣ Find record by name
  const records = await pb.collection(window.MAIN_COLLECTION).getList(1, 1, {
    filter: `name = "${name}"`
  });

  if (!records.items.length) {
    throw new Error(`Record with name "${name}" not found`);
  }

  const recordId = records.items[0].id;
  const currentData = records.items[0].data;

  // 2️⃣ Merge inputData into record.data
  const updatedData = { ...currentData, ...inputData };  //this merget shoudl happen in run() ANDNOT here

  // 3️⃣ Update using recordId
  const record = await pb.collection(window.MAIN_COLLECTION).update(recordId, updatedData);

  // 4️⃣ Return in standard run.doc format
  return {
    data: [record.data], // ✅ only user fields
    meta: {
      name: record.data.name, // ✅ name from record.data
      updated: true
    }
  };
}


  
};

