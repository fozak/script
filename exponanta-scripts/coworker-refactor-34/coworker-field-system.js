// ============================================================================
// COWORKER-FIELD-SYSTEM.JS
// Three-tier document processing system + Serialization/Deserialization
// ============================================================================

// ============================================================================
// FIELD TYPE HANDLERS REGISTRY
// ============================================================================

coworker._fieldHandlers = coworker._fieldHandlers || {};

// Code field handler (JSON serialization/deserialization)
coworker._fieldHandlers.Code = {
  // On READ: Parse JSON strings to objects
  preprocess({ val, field }) {
    if (field.options === "JSON" && typeof val === "string" && val) {
      try {
        return JSON.parse(val);
      } catch (e) {
        console.warn(`Failed to parse JSON for ${field.fieldname}:`, e);
        return val;  // Keep as string if invalid
      }
    }
    return val;
  },
  
  // On WRITE: Stringify objects to JSON
  postprocess({ val, field }) {
    if (field.options === "JSON" && typeof val === "object" && val !== null) {
      return JSON.stringify(val);
    }
    return val;
  }
};

// ============================================================================
// TIER 1: SYSTEM FIELD RULES
// ============================================================================

coworker._applySystemFieldRules = async function(run_doc) {
  const { operation } = run_doc;
  
  // Get the correct doctype based on operation
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  
  // Get the document being processed
  const doc = run_doc.input?.data;
  if (!doc) {
    throw new Error('No document data in run_doc.input.data');
  }
  
  // Fetch schema - check target first (if already fetched), then fetch if needed
  let schema = run_doc.target?.schema;
  if (!schema) {
    schema = await this.getSchema(doctype);
    // Store it in run_doc for reuse (but not in target yet)
    run_doc._schema = schema;
  }

  // Get applicable rules, sorted by priority
  const rules = Object.entries(this._systemFieldRules || {})
    .filter(([fname, rule]) => {
      if (!rule) return false;

      if (rule.applies_to === 'all') return true;
      if (rule.applies_to === 'specific') {
        return rule.specific_doctypes?.includes(doctype);
      }
      if (rule.applies_to === 'submittable') return schema?.is_submittable;
      if (rule.applies_to === 'child_tables') return schema?.istable;

      return false;
    })
    .sort((a, b) => (a[1].priority || 100) - (b[1].priority || 100));

  // Apply each rule
  for (const [fieldname, rule] of rules) {
    // Auto-generate value
    if (rule.auto_set_on === operation || rule.auto_set_on === 'both') {
      if (rule.generator && doc[fieldname] == null) {
        doc[fieldname] = await rule.generator({ 
          doc, 
          operation, 
          doctype,
          run_doc,
          user: run_doc.owner,
          schema
        });
      } else if (rule.defaultValue && doc[fieldname] == null) {
        doc[fieldname] = rule.defaultValue;
      } else if (rule.defaultFn && doc[fieldname] == null) {
        doc[fieldname] = await rule.defaultFn({ doc, run_doc, schema });
      }
    }

    // Validate required
    if (rule.required_on === 'always' || rule.required_on === operation) {
      if (doc[fieldname] == null || doc[fieldname] === '') {
        throw new Error(`${fieldname} is required`);
      }
    }

    // Custom validation
    if (rule.validate) {
      const error = await rule.validate({ 
        val: doc[fieldname], 
        doc, 
        operation, 
        doctype,
        run_doc,
        schema
      });
      if (error) throw new Error(error);
    }
  }

  console.log(`  ✅ Tier 1: Applied ${rules.length} system field rules`);
};


// ============================================================================
// TIER 2: FIELD TYPE HANDLERS
// ============================================================================

coworker._applyFieldTypeHandlers = async function(run_doc) {
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  const doc = run_doc.input?.data;
  
  if (!doc) {
    throw new Error('No document data in run_doc.input.data');
  }
  
  // Get schema from run_doc or fetch it
  let schema = run_doc.target?.schema || run_doc._schema;
  if (!schema) {
    schema = await this.getSchema(doctype);
    run_doc._schema = schema;
  }

  if (!schema?.fields) return;

  let processedCount = 0;

  for (const field of schema.fields) {
    const handler = this._fieldHandlers?.[field.fieldtype];
    if (!handler) continue;

    const val = doc[field.fieldname];

    // Preprocess (normalize/cast)
    if (handler.preprocess) {
      doc[field.fieldname] = handler.preprocess({ 
        val, 
        field, 
        doc,
        doctype,
        run_doc
      });
    }

    // Postprocess (transform before save)
    if (handler.postprocess) {
      doc[field.fieldname] = handler.postprocess({
        val: doc[field.fieldname],
        field,
        doc,
        doctype,
        run_doc
      });
    }

    // Sync validation
    if (handler.validate) {
      const error = handler.validate(doc[field.fieldname], field);
      if (error) throw new Error(`${field.fieldname}: ${error}`);
    }

    // Async validation
    if (handler.validateAsync) {
      const error = await handler.validateAsync({
        val: doc[field.fieldname],
        field,
        doc,
        doctype,
        run_doc
      });
      if (error) throw new Error(`${field.fieldname}: ${error}`);
    }

    processedCount++;
  }

  console.log(`  ✅ Tier 2: Processed ${processedCount} fields`);
};


// ============================================================================
// TIER 3: CUSTOM FIELD RULES (PLACEHOLDER)
// ============================================================================

coworker._applyCustomFieldRules = async function(run_doc) {
  // Tier 3: Custom business rules
  // This is where you would add:
  // - Computed fields (e.g., total = quantity * rate)
  // - Cross-field validation (e.g., end_date > start_date)
  // - Domain-specific business logic
  
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  const doc = run_doc.input?.data;
  
  if (!doc) {
    throw new Error('No document data in run_doc.input.data');
  }
  
  // Example: Add custom rules here when needed
  // if (doctype === 'Invoice') {
  //   doc.total = doc.quantity * doc.rate;
  // }
  
  console.log(`  ⏭️  Tier 3: Custom rules (not implemented)`);
};


// ============================================================================
// SERIALIZATION: For WRITE operations (create/update)
// ============================================================================

coworker.processDocument = async function(run_doc) {
  const { operation } = run_doc;
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  
  // Validate we have document data
  if (!run_doc.input?.data) {
    throw new Error('run_doc.input.data is required for document processing');
  }
  
  console.log(`🔧 Processing document: ${doctype} (${operation})`);

  // All tiers receive run_doc
  await this._applySystemFieldRules(run_doc);
  await this._applyFieldTypeHandlers(run_doc);  // ← postprocess serializes
  await this._applyCustomFieldRules(run_doc);

  console.log(`✅ Document processed: ${run_doc.input.data.name || 'unnamed'}`);

  return run_doc.input.data;  // Return the processed document
};


// ============================================================================
// DESERIALIZATION: For READ operations (select/takeone)
// ============================================================================

coworker.deserializeDocument = async function(doc, doctype) {
  if (!doc || typeof doc !== 'object') return doc;
  
  // Fetch schema
  const schema = await this.getSchema(doctype);
  if (!schema?.fields) return doc;

  // Apply preprocess to each field
  for (const field of schema.fields) {
    const handler = this._fieldHandlers?.[field.fieldtype];
    if (handler?.preprocess) {
      doc[field.fieldname] = handler.preprocess({
        val: doc[field.fieldname],
        field,
        doc,
        doctype
      });
    }
  }

  return doc;
};

// Batch deserialization helper
coworker.deserializeDocuments = async function(docs, doctype) {
  if (!Array.isArray(docs) || docs.length === 0) return docs;
  
  return await Promise.all(
    docs.map(doc => this.deserializeDocument(doc, doctype))
  );
};


// ============================================================================
// CREATE HANDLER (with serialization)
// ============================================================================

coworker._handlers.create = async function (run_doc) {
  const { target_doctype, input, options } = run_doc;
  const { includeSchema = true, includeMeta = false } = options || {};

  // ✅ Accept both wrapped (input.data) and unwrapped (input) formats
  const inputData = input?.data || input;

  if (!inputData || Object.keys(inputData).length === 0) {
    throw new Error("CREATE requires input with data");
  }

  // Ensure input.data exists with doctype for 3-tier system
  run_doc.input = run_doc.input || {};
  run_doc.input.data = {
    ...inputData,
    doctype: target_doctype
  };

  // ✅ RUN THE 3-TIER ENGINE (includes serialization via postprocess)
  const processedDoc = await coworker.processDocument(run_doc);

  // Execute via adapter (processedDoc has serialized JSON strings)
  const result = await coworker._dbCreate(processedDoc);

  // ✅ DESERIALIZE the returned document
  const deserializedDoc = await coworker.deserializeDocument(
    result.data,
    target_doctype
  );

  // Store schema in target if we fetched it
  const schema = run_doc._schema || (includeSchema ? await coworker.getSchema(target_doctype) : undefined);

  return {
    success: true,
    target: {
      data: [deserializedDoc],  // ← Deserialized for user
      schema: includeSchema ? schema : undefined,
      meta: includeMeta ? { operation: 'create', created: 1 } : undefined
    }
  };
};


// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('✅ Field system loaded (3-tier processing + serialization)');