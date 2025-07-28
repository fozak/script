// ==============================================
// 🎯 PocketBase Frappe Database Functions
// Raw DB operations for Frappe document system
// ==============================================

(function() {
  if (typeof pb === 'undefined') {
    console.error('PocketBase instance (pb) not found');
    return;
  }

  // Global config
  window.MAIN_COLLECTION = window.MAIN_COLLECTION || 'item';

  // ==============================================
  // 📋 Document Database Operations
  // ==============================================

  pb.getDoc = async function(doctype, name) {
    const records = await this.collection(window.MAIN_COLLECTION).getFullList({
      filter: `doctype = "${doctype}" && name = "${name}"`
    });
    return records.length > 0 ? records[0] : null;
  };

  pb.createDoc = async function(doctype, data = {}) {
    // Step 1: Create with temp name
    const tempDoc = await this.collection(window.MAIN_COLLECTION).create({
      doctype,
      name: `temp-${Date.now()}`,
      data
    });
    
    // Step 2: Update with proper name
    const finalName = `${doctype.replace(/\s+/g, '-')}-${tempDoc.id}`;
    await this.collection(window.MAIN_COLLECTION).update(tempDoc.id, {
      name: finalName
    });
    
    return { ...tempDoc, name: finalName };
  };

  pb.updateDoc = async function(id, data) {
    return await this.collection(window.MAIN_COLLECTION).update(id, { data });
  };

  pb.deleteDoc = async function(id) {
    return await this.collection(window.MAIN_COLLECTION).delete(id);
  };

  pb.listDocs = async function(doctype, filter = '') {
    let fullFilter = `doctype = "${doctype}"`;
    if (filter) fullFilter += ` && (${filter})`;
    
    return await this.collection(window.MAIN_COLLECTION).getFullList({ 
      filter: fullFilter 
    });
  };

  // ==============================================
  // 👥 Child Table Database Operations
  // ==============================================

  pb.createChild = async function(childDoctype, parentName, parentDoctype, parentField, data = {}) {
    const childData = {
      parent: parentName,
      parenttype: parentDoctype,
      parentfield: parentField,
      ...data
    };
    
    return await this.createDoc(childDoctype, childData);
  };

  pb.getChildren = async function(childDoctype, parentName) {
    return await this.collection(window.MAIN_COLLECTION).getFullList({
      filter: `doctype = "${childDoctype}" && data.parent = "${parentName}"`
    });
  };

  pb.updateChild = async function(childId, fieldName, value) {
    const child = await this.collection(window.MAIN_COLLECTION).getOne(childId);
    const newData = { ...child.data, [fieldName]: value };
    return await this.collection(window.MAIN_COLLECTION).update(childId, { data: newData });
  };

  pb.deleteChildren = async function(childIds) {
    const promises = childIds.map(id => 
      this.collection(window.MAIN_COLLECTION).delete(id)
    );
    return await Promise.allSettled(promises);
  };

  // ==============================================
  // 📝 Schema Database Operations
  // ==============================================

  pb.getSchema = async function(doctype) {
    const schemaResult = await this.collection(window.MAIN_COLLECTION).getList(1, 1, { 
      filter: `doctype = "Schema" && data.name = "${doctype}"` 
    });
    
    return schemaResult.items.length > 0 ? schemaResult.items[0].data : null;
  };

  // ==============================================
  // 🔗 Link Field Database Operations
  // ==============================================

  pb.getLinkOptions = async function(doctype, titleField = 'subject') {
    const records = await this.collection(window.MAIN_COLLECTION).getFullList({
      filter: `doctype = "${doctype}"`
    });
    
    return records.map(record => ({
      value: record.name,
      text: record.data[titleField] || record.name
    }));
  };

  pb.getDynamicLinkOptions = async function(doctype, titleField = 'subject') {
    return await this.getLinkOptions(doctype, titleField);
  };

  // ==============================================
  // ⚡ Fetch From Database Operations
  // ==============================================

  pb.processFetchFrom = async function(fetchFromPath, sourceValue) {
    if (!fetchFromPath || !sourceValue) return null;

    const [sourceField, targetProperty] = fetchFromPath.split('.');
    
    if (!sourceField || !targetProperty) return null;

    // Fetch the linked document
    const sourceRecords = await this.collection(window.MAIN_COLLECTION).getFullList({
      filter: `name = "${sourceValue}"`
    });
    
    if (sourceRecords.length > 0) {
      const sourceDoc = sourceRecords[0];
      return sourceDoc.data?.[targetProperty] || null;
    }
    
    return null;
  };

  pb.processFetchFromBatch = async function(fetchFromFields, formData) {
    const fetchPromises = fetchFromFields.map(async (field) => {
      const [sourceField] = field.fetch_from.split('.');
      const sourceValue = formData[sourceField];
      
      if (sourceValue) {
        const fetchedValue = await this.processFetchFrom(field.fetch_from, sourceValue);
        return { fieldname: field.fieldname, value: fetchedValue };
      }
      
      return { fieldname: field.fieldname, value: null };
    });

    const results = await Promise.all(fetchPromises);
    
    const updates = {};
    results.forEach(({ fieldname, value }) => {
      if (value !== null) {
        updates[fieldname] = value;
      }
    });

    return updates;
  };

  // ==============================================
  // 🔍 Search Database Operations
  // ==============================================

  pb.search = async function(doctype, searchTerm, fields = ['name']) {
    const filterConditions = fields.map(field => {
      if (field === 'name') {
        return `name ~ "${searchTerm}"`;
      } else {
        return `data.${field} ~ "${searchTerm}"`;
      }
    });
    
    const filter = `doctype = "${doctype}" && (${filterConditions.join(' || ')})`;
    
    return await this.collection(window.MAIN_COLLECTION).getFullList({ filter });
  };

  // ==============================================
  // 🔄 Batch Database Operations
  // ==============================================

  pb.batchUpdate = async function(updates) {
    const promises = updates.map(({ id, data }) => 
      this.collection(window.MAIN_COLLECTION).update(id, { data })
    );
    return await Promise.allSettled(promises);
  };

  pb.batchDelete = async function(ids) {
    const promises = ids.map(id => 
      this.collection(window.MAIN_COLLECTION).delete(id)
    );
    return await Promise.allSettled(promises);
  };

  pb.batchCreate = async function(doctype, dataArray) {
    const promises = dataArray.map(data => this.createDoc(doctype, data));
    return await Promise.allSettled(promises);
  };

  // ==============================================
  // 🎯 React-Friendly Composite Operations
  // ==============================================

  // Load everything needed for a form (React-friendly)
  pb.loadFormData = async function(doctype, recordId = null) {
    const promises = [
      this.getSchema(doctype),
      recordId ? this.collection(window.MAIN_COLLECTION).getOne(recordId) : Promise.resolve(null)
    ];

    const [schema, record] = await Promise.all(promises);

    if (!schema) {
      throw new Error(`Schema not found for doctype: ${doctype}`);
    }

    // Load link options for all Link fields
    const linkFields = schema.fields?.filter(f => f.fieldtype === 'Link') || [];
    const linkPromises = linkFields.map(async (field) => {
      const options = await this.getLinkOptions(field.options, schema.title_field || 'subject');
      return { fieldname: field.fieldname, options };
    });

    const linkResults = await Promise.all(linkPromises);
    const linkOptions = {};
    linkResults.forEach(({ fieldname, options }) => {
      linkOptions[fieldname] = options;
    });

    return {
      schema,
      record,
      linkOptions,
      formData: record?.data || {}
    };
  };

  // Load child table data (React-friendly)
  pb.loadChildTableData = async function(childDoctype, parentName) {
    const promises = [
      this.getSchema(childDoctype),
      this.getChildren(childDoctype, parentName)
    ];

    const [childSchema, childRecords] = await Promise.all(promises);

    return {
      schema: childSchema,
      records: childRecords,
      formattedRecords: childRecords.map(record => ({
        ...record,
        _isNew: false,
        _isDirty: false
      }))
    };
  };

  // Handle fetch_from updates for React forms
  pb.handleFetchFromUpdates = async function(changedField, newValue, schema, currentFormData) {
    if (!schema?.fields) return {};

    const fetchFromFields = schema.fields.filter(field => 
      field.fetch_from && field.fetch_from.startsWith(`${changedField}.`)
    );

    if (fetchFromFields.length === 0) return {};

    return await this.processFetchFromBatch(fetchFromFields, {
      ...currentFormData,
      [changedField]: newValue
    });
  };

  // ==============================================
  // 📊 Analytics & Reporting Database Operations
  // ==============================================

  pb.getDocCount = async function(doctype, filter = '') {
    let fullFilter = `doctype = "${doctype}"`;
    if (filter) fullFilter += ` && (${filter})`;
    
    const result = await this.collection(window.MAIN_COLLECTION).getList(1, 1, { 
      filter: fullFilter 
    });
    return result.totalItems;
  };

  pb.getFieldValues = async function(doctype, fieldname, filter = '') {
    let fullFilter = `doctype = "${doctype}"`;
    if (filter) fullFilter += ` && (${filter})`;
    
    const records = await this.collection(window.MAIN_COLLECTION).getFullList({
      filter: fullFilter,
      fields: `data.${fieldname}`
    });
    
    return records.map(r => r.data?.[fieldname]).filter(v => v !== undefined);
  };

  // ==============================================
  // 🔧 Utility Database Operations
  // ==============================================

  pb.docExists = async function(doctype, name) {
    try {
      const doc = await this.getDoc(doctype, name);
      return !!doc;
    } catch {
      return false;
    }
  };

  pb.getLastModified = async function(doctype, name) {
    const doc = await this.getDoc(doctype, name);
    return doc?.updated || null;
  };

  pb.duplicateDoc = async function(doctype, sourceName, newData = {}) {
    const sourceDoc = await this.getDoc(doctype, sourceName);
    if (!sourceDoc) throw new Error(`Source document not found: ${sourceName}`);
    
    const duplicatedData = { ...sourceDoc.data, ...newData };
    return await this.createDoc(doctype, duplicatedData);
  };

  console.log('✅ PocketBase Frappe Database Functions loaded!');
  console.log(`📋 Collection: ${window.MAIN_COLLECTION}`);

})();