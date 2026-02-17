// ============================================================
// PB-ADAPTER-POCKETBASE.JS - Complete with Top-Level name
// ============================================================

pb._adapters = pb._adapters || {};

pb._adapters.pocketbase = {
  // ══════════════════════════════════════════════════════════
  // READ OPERATIONS (unchanged)
  // ══════════════════════════════════════════════════════════
  
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
        .collection(globalThis.MAIN_COLLECTION)
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
        .collection(globalThis.MAIN_COLLECTION)
        .getFullList(cleanParams);
      metaData = {
        total: items.length,
        page: 1,
        pageSize: items.length,
        totalPages: 1,
        hasMore: false,
      };
    }

    // ✅ Extract .data from all items, filter out nulls
    return {
      data: items.map((item) => item.data).filter(data => data != null),
      meta: metaData,
    };
  },

  // ══════════════════════════════════════════════════════════
  // CREATE OPERATION - With top-level id, name, doctype
  // ══════════════════════════════════════════════════════════
  
  async create(inputData) {
    if (!inputData || typeof inputData !== 'object') {
      throw new Error('CREATE requires data object');
    }

    try {
      // ✅ Generate ID using global generateId function
      const recordId = typeof generateId === 'function' 
        ? generateId(inputData.doctype?.toLowerCase() || 'record')
        : `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // ✅ Extract doctype
      const doctype = inputData.doctype;
      if (!doctype) {
        throw new Error('CREATE requires doctype field in data');
      }

      // ✅ Build complete data object with all top-level fields replicated
      const completeData = {
        id: recordId,           // In data
        name: recordId,         // In data (same as id)
        doctype: doctype,       // In data
        ...inputData            // All user input fields
      };

      console.log('📝 PocketBase CREATE:', {
        doctype,
        id: recordId,
        name: recordId,
        fields: Object.keys(completeData)
      });

      // ✅ Create record in PocketBase
      // Structure: 
      // {
      //   id: "customeroaezla1",           <- PocketBase record ID
      //   name: "customeroaezla1",         <- Top level (same as id)
      //   doctype: "Customer",             <- Top level
      //   data: {
      //     id: "customeroaezla1",         <- Replicated
      //     name: "customeroaezla1",       <- Replicated
      //     doctype: "Customer",           <- Replicated
      //     customer_name: "Acme",         <- User data
      //     ...
      //   }
      // }
      const created = await pb.collection(globalThis.MAIN_COLLECTION).create({
        id: recordId,           // ✅ PocketBase record ID
        name: recordId,         // ✅ Top-level name (same as id)
        doctype: doctype,       // ✅ Top-level doctype
        data: completeData      // ✅ Complete data with all fields replicated
      });

      console.log('✅ PocketBase CREATE success:', created.id);

      return {
        data: created.data,  // Return the data field
        meta: {
          id: created.id,
          name: created.name,
          created: created.created,
          doctype: created.doctype
        }
      };
    } catch (error) {
      console.error('❌ PocketBase CREATE error:', error);
      throw new Error(`CREATE failed: ${error.message}`);
    }
  },

  // ══════════════════════════════════════════════════════════
  // UPDATE OPERATION - With top-level id, name, doctype
  // ══════════════════════════════════════════════════════════

  async update(identifier, data) {
    if (!identifier) {
      throw new Error('UPDATE requires an identifier (id or name)');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('UPDATE requires data object');
    }

    try {
      let recordId;
      let recordName;
      let existingRecord;

      // ✅ Check if identifier is PocketBase ID (format: customeroaezla1, etc.)
      const isPocketBaseId = /^[a-z0-9]{15}$/.test(identifier);

      if (isPocketBaseId) {
        // Direct PocketBase ID
        recordId = identifier;
        recordName = identifier;  // id = name
        console.log('📝 PocketBase UPDATE by ID:', recordId);
        
        // Fetch existing record
        existingRecord = await pb.collection(globalThis.MAIN_COLLECTION).getOne(recordId);
      } else {
        // Lookup by name
        console.log('🔍 PocketBase UPDATE: Looking up by name:', identifier);
        
        const records = await pb.collection(globalThis.MAIN_COLLECTION).getFullList({
          filter: `data.name = "${identifier}"`,
        });

        if (records.length === 0) {
          throw new Error(`Record not found: ${identifier}`);
        }

        existingRecord = records[0];
        recordId = existingRecord.id;
        recordName = existingRecord.name || existingRecord.id;
        console.log('✅ Found record:', recordId);
      }

      // ✅ Extract doctype
      const doctype = data.doctype || existingRecord.doctype;
      if (!doctype) {
        throw new Error('UPDATE requires doctype field in data');
      }

      // ✅ Build complete data object with all top-level fields replicated
      const completeData = {
        id: recordId,           // Maintain same id
        name: recordName,       // Maintain same name
        doctype: doctype,       // Replicate doctype
        ...data                 // All updated fields
      };

      console.log('📝 PocketBase UPDATE:', {
        id: recordId,
        name: recordName,
        doctype,
        fields: Object.keys(completeData)
      });

      // ✅ Update record (complete document replacement)
      const updated = await pb.collection(globalThis.MAIN_COLLECTION).update(
        recordId,
        {
          name: recordName,      // ✅ Update top-level name
          doctype: doctype,      // ✅ Update top-level doctype
          data: completeData     // ✅ Complete data with all fields replicated
        }
      );

      console.log('✅ PocketBase UPDATE success');

      return {
        data: updated.data,  // Return the data field
        meta: {
          id: updated.id,
          name: updated.name,
          updated: updated.updated,
          doctype: updated.doctype
        }
      };
    } catch (error) {
      console.error('❌ PocketBase UPDATE error:', error);
      throw new Error(`UPDATE failed: ${error.message}`);
    }
  },

  // ══════════════════════════════════════════════════════════
  // DELETE OPERATION (unchanged)
  // ══════════════════════════════════════════════════════════

  async delete(identifier) {
    if (!identifier) {
      throw new Error('DELETE requires an identifier (id or name)');
    }

    try {
      let recordId;

      // Check if identifier is PocketBase ID
      const isPocketBaseId = /^[a-z0-9]{15}$/.test(identifier);

      if (isPocketBaseId) {
        recordId = identifier;
      } else {
        // Lookup by name
        const records = await pb.collection(globalThis.MAIN_COLLECTION).getFullList({
          filter: `data.name = "${identifier}"`,
        });

        if (records.length === 0) {
          throw new Error(`Record not found: ${identifier}`);
        }

        recordId = records[0].id;
      }

      console.log('🗑️ PocketBase DELETE:', recordId);

      await pb.collection(globalThis.MAIN_COLLECTION).delete(recordId);

      console.log('✅ PocketBase DELETE success');

      return {
        success: true,
        meta: {
          id: recordId,
          deleted: true
        }
      };
    } catch (error) {
      console.error('❌ PocketBase DELETE error:', error);
      throw new Error(`DELETE failed: ${error.message}`);
    }
  }
};
