// ============================================================================
// coworker-db-adapters.js - Database Adapters
// ============================================================================

coworker._dbAdapters = {
  // ══════════════════════════════════════════════════════════
  // POCKETBASE ADAPTER
  // ══════════════════════════════════════════════════════════
  pocketbase: {
    // ────────────────────────────────────────────────────────
    // SELECT (renamed from query)
    // ────────────────────────────────────────────────────────
    async select(params, take, skip) {
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

      // Extract .data from all items, filter out nulls
      return {
        data: items.map((item) => item.data).filter(data => data != null),
        meta: metaData,
      };
    },

    // ────────────────────────────────────────────────────────
    // CREATE
    // ────────────────────────────────────────────────────────
    async create(inputData) {
      if (!inputData || typeof inputData !== 'object') {
        throw new Error('CREATE requires data object');
      }

      try {
        // Generate ID using global generateId function
        const recordId = typeof generateId === 'function' 
          ? generateId(inputData.doctype?.toLowerCase() || 'record')
          : `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Extract doctype
        const doctype = inputData.doctype;
        if (!doctype) {
          throw new Error('CREATE requires doctype field in data');
        }

        // Build complete data object with all top-level fields replicated
        const completeData = {
          id: recordId,
          name: recordId,
          doctype: doctype,
          ...inputData
        };

        console.log('📝 PocketBase CREATE:', {
          doctype,
          id: recordId,
          name: recordId,
          fields: Object.keys(completeData)
        });

        // Create record in PocketBase
        const created = await pb.collection(window.MAIN_COLLECTION).create({
          id: recordId,
          name: recordId,
          doctype: doctype,
          data: completeData
        });

        console.log('✅ PocketBase CREATE success:', created.id);

        return {
          data: created.data,
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

    // ────────────────────────────────────────────────────────
    // UPDATE
    // ────────────────────────────────────────────────────────
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

        // Check if identifier is PocketBase ID
        const isPocketBaseId = /^[a-z0-9]{15}$/.test(identifier);

        if (isPocketBaseId) {
          recordId = identifier;
          recordName = identifier;
          console.log('📝 PocketBase UPDATE by ID:', recordId);
          
          existingRecord = await pb.collection(window.MAIN_COLLECTION).getOne(recordId);
        } else {
          console.log('🔍 PocketBase UPDATE: Looking up by name:', identifier);
          
          const records = await pb.collection(window.MAIN_COLLECTION).getFullList({
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

        // Extract doctype
        const doctype = data.doctype || existingRecord.doctype;
        if (!doctype) {
          throw new Error('UPDATE requires doctype field in data');
        }

        // Build complete data object
        const completeData = {
          id: recordId,
          name: recordName,
          doctype: doctype,
          ...data
        };

        console.log('📝 PocketBase UPDATE:', {
          id: recordId,
          name: recordName,
          doctype,
          fields: Object.keys(completeData)
        });

        const updated = await pb.collection(window.MAIN_COLLECTION).update(
          recordId,
          {
            name: recordName,
            doctype: doctype,
            data: completeData
          }
        );

        console.log('✅ PocketBase UPDATE success');

        return {
          data: updated.data,
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

    // ────────────────────────────────────────────────────────
    // DELETE
    // ────────────────────────────────────────────────────────
    async delete(identifier) {
      if (!identifier) {
        throw new Error('DELETE requires an identifier (id or name)');
      }

      try {
        let recordId;

        const isPocketBaseId = /^[a-z0-9]{15}$/.test(identifier);

        if (isPocketBaseId) {
          recordId = identifier;
        } else {
          const records = await pb.collection(window.MAIN_COLLECTION).getFullList({
            filter: `data.name = "${identifier}"`,
          });

          if (records.length === 0) {
            throw new Error(`Record not found: ${identifier}`);
          }

          recordId = records[0].id;
        }

        console.log('🗑️ PocketBase DELETE:', recordId);

        await pb.collection(window.MAIN_COLLECTION).delete(recordId);

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
  },

  // ══════════════════════════════════════════════════════════
  // MEMORY ADAPTER (placeholder - add your implementation)
  // ══════════════════════════════════════════════════════════
  memory: {
    _store: new Map(),

    async select(params, take, skip) {
      // TODO: Copy from pb-adapter-memory.js query() method
      throw new Error('Memory adapter not yet implemented');
    },

    async create(data) {
      // TODO: Copy from pb-adapter-memory.js create() method
      throw new Error('Memory adapter not yet implemented');
    },

    async update(name, data) {
      // TODO: Copy from pb-adapter-memory.js update() method
      throw new Error('Memory adapter not yet implemented');
    },

    async delete(name) {
      // TODO: Copy from pb-adapter-memory.js delete() method
      throw new Error('Memory adapter not yet implemented');
    }
  },
};

console.log("✅ DB adapters loaded");