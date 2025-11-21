// ============================================================================
// COWORKER-FIELD-SYSTEM.JS - Field Handler & Rule Engine
// Manages fieldtype handlers and fieldname rules from Field doctype
// Version: 1.0.0
// ============================================================================

// ============================================================================
// SECTION 1: LOADING FIELD RULES FROM DATABASE
// → Place in: coworker-run.js (after coworker._handlers definition)
// ============================================================================

/**
 * Load all Field documents from DB and compile into runtime handlers
 * Separates into:
 * - _fieldHandlers (fieldtype behavior)
 * - _systemFieldRules (fieldname cross-doctype rules)
 */
coworker.loadFieldRules = async function() {
  console.log('🔄 Loading field rules from database...');

  const result = await this.run({
    operation: 'select',
    doctype: 'Field',
    input: { where: { docstatus: 1 } },
    options: { includeSchema: false }
  });

  if (!result.success) {
    console.error('❌ Failed to load field rules');
    return;
  }

  this._fieldHandlers = {};
  this._systemFieldRules = {};

  result.output.data.forEach(doc => {
    if (doc.type === 'fieldtype') {
      // Compile fieldtype handler
      this._fieldHandlers[doc.fieldtype] = {
        is_standard_input: doc.is_standard_input,
        component: doc.component,
        custom_handler: doc.custom_handler,
        category: doc.category,
        jstype: doc.jstype,

        // Compile functions from strings
        parse: doc.parse ? this._compileFunction(doc.parse, 'parse') : null,
        format: doc.format ? this._compileFunction(doc.format, 'format') : null,
        preprocess: doc.preprocess ? this._compileFunction(doc.preprocess, 'preprocess') : null,
        postprocess: doc.postprocess ? this._compileFunction(doc.postprocess, 'postprocess') : null,
        validate: doc.validate ? this._compileFunction(doc.validate, 'validate') : null,
        validateAsync: doc.validate_async ? this._compileFunction(doc.validate_async, 'validateAsync') : null,

        inputType: doc.input_type,
        inputProps: doc.input_props ? this._compileFunction(doc.input_props, 'inputProps') : null,

        gridFormat: doc.grid_format ? this._compileFunction(doc.grid_format, 'gridFormat') : null,
        gridWidth: doc.grid_width,
        sortable: doc.sortable,
        filterable: doc.filterable,

        saveOn: doc.save_on,
        debounce: doc.debounce,

        defaultValue: doc.default_value,
        defaultFn: doc.default_function ? this._compileFunction(doc.default_function, 'defaultFn') : null
      };

    } else if (doc.type === 'fieldname') {
      // Compile fieldname rule
      this._systemFieldRules[doc.fieldname] = {
        priority: doc.priority || 100,
        applies_to: doc.applies_to,
        specific_doctypes: doc.specific_doctypes?.split(',').map(s => s.trim()),
        auto_set_on: doc.auto_set_on,
        generator: doc.generator_function ? this._compileFunction(doc.generator_function, 'generator') : null,
        read_only_after_insert: doc.read_only_after_insert,
        unique: doc.unique_constraint,
        indexed: doc.indexed,
        required_on: doc.required_on,
        validate: doc.validate ? this._compileFunction(doc.validate, 'validate') : null,
        defaultValue: doc.default_value,
        defaultFn: doc.default_function ? this._compileFunction(doc.default_function, 'defaultFn') : null
      };
    }
  });

  console.log(`✅ Loaded ${Object.keys(this._fieldHandlers).length} field handlers`);
  console.log(`✅ Loaded ${Object.keys(this._systemFieldRules).length} system field rules`);
};

/**
 * Safely compile function string to actual function
 * Wraps in try-catch to prevent eval errors
 */
coworker._compileFunction = function(fnString, name) {
  if (!fnString) return null;

  try {
    // Detect if it's already wrapped in () or not
    const wrapped = fnString.trim().startsWith('(')
      ? fnString
      : `(${fnString})`;

    return eval(wrapped);
  } catch (error) {
    console.error(`Failed to compile function ${name}:`, error);
    console.error('Function string:', fnString);
    return null;
  }
};

/**
 * Clear and reload field rules (for runtime updates)
 */
coworker.reloadFieldRules = async function() {
  this._fieldHandlers = {};
  this._systemFieldRules = {};
  await this.loadFieldRules();
  console.log('🔄 Field rules reloaded');
};


// ============================================================================
// SECTION 2: 3-TIER DOCUMENT PROCESSING ENGINE
// → Place in: NEW FILE coworker-process.js OR bottom of coworker-run.js
// ============================================================================

/**
 * Process document through 3-tier engine:
 * Tier 1: System field rules (name, owner, creation, etc)
 * Tier 2: Field type handlers (Data, Int, Link validation)
 * Tier 3: Custom field rules (business logic, computed fields)
 */
coworker.processDocument = async function(operation, doc, context) {
  context.doc = doc;

  console.log(`🔧 Processing document: ${doc.doctype} (${operation})`);

  // Tier 1: System field rules
  await this._applySystemFieldRules(operation, doc, context);

  // Tier 2: Field type handlers
  await this._applyFieldTypeHandlers(doc, context);

  // Tier 3: Custom field rules (placeholder for now)
  await this._applyCustomFieldRules(operation, doc, context);

  console.log(`✅ Document processed: ${doc.name}`);

  return doc;
};


// ============================================================================
// TIER 1: SYSTEM FIELD RULES
// ============================================================================

coworker._applySystemFieldRules = async function(operation, doc, context) {
  const schema = context.schema;

  // Get applicable rules, sorted by priority
  const rules = Object.entries(this._systemFieldRules || {})
    .filter(([fname, rule]) => {
      if (!rule) return false;

      // Check if rule applies to this doctype
      if (rule.applies_to === 'all') return true;
      if (rule.applies_to === 'specific') {
        return rule.specific_doctypes?.includes(doc.doctype);
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
        doc[fieldname] = await rule.generator({ doc, operation, context });
      } else if (rule.defaultValue && doc[fieldname] == null) {
        doc[fieldname] = rule.defaultValue;
      } else if (rule.defaultFn && doc[fieldname] == null) {
        doc[fieldname] = await rule.defaultFn({ doc, context });
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
      const error = await rule.validate({ val: doc[fieldname], doc, operation, context });
      if (error) throw new Error(error);
    }
  }

  console.log(`  ✅ Tier 1: Applied ${rules.length} system field rules`);
};


// ============================================================================
// TIER 2: FIELD TYPE HANDLERS
// ============================================================================

coworker._applyFieldTypeHandlers = async function(doc, context) {
  const schema = context.schema;
  if (!schema?.fields) return;

  let processedCount = 0;

  for (const field of schema.fields) {
    const handler = this._fieldHandlers?.[field.fieldtype];
    if (!handler) continue;

    const val = doc[field.fieldname];

    // Preprocess (normalize/cast)
    if (handler.preprocess) {
      doc[field.fieldname] = handler.preprocess({ val, field, context });
    }

    // Postprocess (transform before save)
    if (handler.postprocess) {
      doc[field.fieldname] = handler.postprocess({
        val: doc[field.fieldname],
        field,
        context
      });
    }

    // Sync validation
    if (handler.validate) {
      const error = handler.validate(doc[field.fieldname], field);
      if (error) throw new Error(`${field.fieldname}: ${error}`);
    }

    // Async validation (e.g., Link field DB lookup)
    if (handler.validateAsync) {
      const error = await handler.validateAsync({
        val: doc[field.fieldname],
        field,
        context
      });
      if (error) throw new Error(`${field.fieldname}: ${error}`);
    }

    processedCount++;
  }

  console.log(`  ✅ Tier 2: Processed ${processedCount} fields`);
};


// ============================================================================
// TIER 3: CUSTOM FIELD RULES (Placeholder)
// ============================================================================

coworker._applyCustomFieldRules = async function(operation, doc, context) {
  // TODO: Implement custom business logic rules
  // Example: computed fields with dependencies
  // This will be loaded from another doctype or config in the future

  console.log(`  ✅ Tier 3: Custom rules (not implemented yet)`);
};


// ============================================================================
// SECTION 3: INTEGRATE INTO CREATE/UPDATE HANDLERS
// → Place in: coworker-run.js (replace existing create/update handlers)
// ============================================================================

/**
 * CREATE handler with 3-tier processing
 */
coworker._handlers.create = async function (run_doc) {
  const { target_doctype, input, options } = run_doc;
  const { data } = input || {};
  const { includeSchema = true, includeMeta = false } = options || {};

  if (!data) throw new Error("CREATE requires input.data");

  // Fetch schema
  const schema = await this.getSchema(target_doctype);

  // Prepare initial doc
  const doc = {
    ...data,
    doctype: target_doctype
  };

  // ✅ RUN THE 3-TIER ENGINE
  const processedDoc = await this.processDocument('create', doc, {
    schema,
    user: run_doc.owner,
    db: {
      exists: async (dt, val) => {
        const res = await this._dbQuery({ filter: `doctype = "${dt}" && name = "${val}"` });
        return res.data.length > 0;
      }
    }
  });

  // Execute via adapter
  const result = await this._dbCreate(processedDoc);

  return {
    success: true,
    output: {
      data: [result.data],
      schema: includeSchema ? schema : undefined,
      meta: includeMeta ? { operation: 'create', created: 1 } : undefined
    }
  };
};

/**
 * UPDATE handler with 3-tier processing
 */
coworker._handlers.update = async function (run_doc) {
  const { target_doctype, input, options } = run_doc;
  const { where, data } = input || {};
  const { includeSchema = true, includeMeta = false } = options || {};

  if (!data) throw new Error("UPDATE requires input.data");
  if (!where) throw new Error("UPDATE requires input.where");

  // Fetch schema
  const schema = await this.getSchema(target_doctype);

  // Build filter
  const queryDoctype = target_doctype === "All" ? "" : target_doctype;
  const pbFilter = this._buildPrismaWhere(queryDoctype, where);

  // Find matching records
  const { data: items } = await this._dbQuery({ filter: pbFilter });

  if (items.length === 0) {
    return {
      success: true,
      output: {
        data: [],
        schema: includeSchema ? schema : undefined,
        meta: includeMeta ? { operation: 'update', updated: 0 } : undefined
      }
    };
  }

  // Update each record through 3-tier engine
  const updates = await Promise.all(
    items.map(async (item) => {
      const mergedDoc = { ...item, ...data };

      // ✅ RUN THE 3-TIER ENGINE
      const processedDoc = await this.processDocument('update', mergedDoc, {
        schema,
        user: run_doc.owner,
        db: {
          exists: async (dt, val) => {
            const res = await this._dbQuery({ filter: `doctype = "${dt}" && name = "${val}"` });
            return res.data.length > 0;
          }
        }
      });

      return this._dbUpdate(item.name, processedDoc);
    })
  );

  return {
    success: true,
    output: {
      data: updates.map((u) => u.data),
      schema: includeSchema ? schema : undefined,
      meta: includeMeta ? { operation: 'update', updated: updates.length } : undefined
    }
  };
};


// ============================================================================
// SECTION 4: GENERIC FIELD COMPONENT
// → Place in: coworker-components.js (replace existing FieldData, FieldInt, etc.)
// ============================================================================

/**
 * Generic Field component - driven by Field doctype handlers
 * Handles all standard input types (Data, Int, Float, Date, etc.)
 * Delegates to custom components for special types (Select, Link, Table)
 */
const Field = ({ field, value, doc, docname, doctype }) => {
  // Get handler from loaded config
  const handler = coworker._fieldHandlers?.[field.fieldtype];

  if (!handler) {
    console.warn('No handler for fieldtype:', field.fieldtype);
    return null;
  }

  // For non-standard inputs, delegate to custom component
  if (!handler.is_standard_input) {
    const CustomComponent = window.components?.[handler.component];
    if (!CustomComponent) {
      console.warn('Component not found:', handler.component);
      return null;
    }
    return React.createElement(CustomComponent, { field, value, doc, docname, doctype });
  }

  // ══════════════════════════════════════════════════════════
  // STANDARD INPUT FIELD (driven by handler config)
  // ══════════════════════════════════════════════════════════

  const [error, setError] = React.useState(null);
  const inputRef = React.useRef(null);

  // Evaluate visibility
  const isVisible = field.depends_on
    ? evaluateDependsOn(field.depends_on, doc)
    : !field.hidden;

  const isReadOnly = field.read_only ||
    (field.read_only_depends_on && evaluateDependsOn(field.read_only_depends_on, doc));

  const isRequired = field.reqd ||
    (field.mandatory_depends_on && evaluateDependsOn(field.mandatory_depends_on, doc));

  if (!isVisible) return null;

  // Handle blur (validation + save)
  const handleBlur = async (e) => {
    const rawValue = handler.inputType === 'checkbox' ? e.target.checked : e.target.value;

    // Parse
    const parsed = handler.parse ? handler.parse(rawValue) : rawValue;

    // Preprocess
    const preprocessed = handler.preprocess
      ? handler.preprocess({ val: parsed, field, context: { doc } })
      : parsed;

    // Validate
    const fieldWithRequired = { ...field, required: isRequired };
    const err = handler.validate
      ? handler.validate(preprocessed, fieldWithRequired)
      : null;

    if (err) {
      setError(err);
      return;
    }

    // Async validation
    if (handler.validateAsync) {
      const asyncErr = await handler.validateAsync({
        val: preprocessed,
        field,
        context: { doc, docname, doctype }
      });

      if (asyncErr) {
        setError(asyncErr);
        return;
      }
    }

    // Skip if unchanged
    if (preprocessed === value) return;

    setError(null);

    // Save via run() if configured
    if (handler.saveOn === 'blur') {
      try {
        await coworker.run({
          operation: 'update',
          doctype: doctype,
          input: {
            where: { name: docname },
            data: { [field.fieldname]: preprocessed }
          },
          options: { render: true }
        });
      } catch (e) {
        setError(e.message);
      }
    }
  };

  // Generate input props from handler
  const inputProps = handler.inputProps
    ? handler.inputProps({ ...field, read_only: isReadOnly })
    : {};

  // Format value for display
  const displayValue = handler.format ? handler.format(value) : value;

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  return React.createElement('div', {
    className: `${CWStyles.field.wrapper} ${error ? CWStyles.field.hasError : ''}`
  },
    // Label
    React.createElement('label', {
      className: CWStyles.field.label,
      htmlFor: `field_${field.fieldname}`
    },
      field.label,
      isRequired && React.createElement('span', {
        className: CWStyles.field.required
      }, ' *')
    ),

    // Input (type from handler.inputType)
    handler.inputType === 'textarea'
      ? React.createElement('textarea', {
          id: `field_${field.fieldname}`,
          ref: inputRef,
          className: `${CWStyles.field.textarea} ${error ? CWStyles.field.inputError : ''}`,
          defaultValue: displayValue,
          onBlur: handleBlur,
          ...inputProps
        })
      : React.createElement('input', {
          id: `field_${field.fieldname}`,
          ref: inputRef,
          type: handler.inputType,
          className: `${CWStyles.field.input} ${error ? CWStyles.field.inputError : ''}`,
          defaultValue: handler.inputType === 'checkbox' ? undefined : displayValue,
          defaultChecked: handler.inputType === 'checkbox' ? !!value : undefined,
          onBlur: handleBlur,
          ...inputProps
        }),

    // Error message
    error && React.createElement('span', {
      className: CWStyles.field.error
    }, error),

    // Description
    field.description && React.createElement('span', {
      className: CWStyles.field.description
    }, field.description)
  );
};

/**
 * Helper: Evaluate depends_on expressions
 */
function evaluateDependsOn(expression, doc) {
  if (!expression) return true;

  // Handle "eval:doc.status == 'Closed'"
  if (expression.startsWith('eval:')) {
    try {
      const code = expression.slice(5);
      return new Function('doc', `return ${code}`)(doc);
    } catch (e) {
      console.warn('depends_on eval failed:', e);
      return true;
    }
  }

  // Simple field reference: "status"
  return !!doc[expression];
}

// Register generic component
window.components = window.components || {};
window.components.Field = Field;


// ============================================================================
// SECTION 5: UPDATE _renderField
// → Place in: coworker-renderer.js (replace existing _renderField)
// ============================================================================

coworker._renderField = function({ field, value, docname, doctype, key }) {
  // Get full doc for depends_on evaluation
  const doc = this._currentDoc || { [field.fieldname]: value };

  // Always use generic Field component
  // It decides internally whether to delegate to custom component
  return React.createElement(Field, {
    key,
    field,
    value,
    doc,
    docname,
    doctype
  });
};


// ============================================================================
// SECTION 6: INITIALIZATION
// → Place in: Bottom of coworker-run.js OR create coworker-init.js
// ============================================================================

/**
 * Initialize coworker system
 * Load field rules on startup
 */
coworker.init = async function() {
  console.log('🚀 Initializing coworker system...');

  try {
    // Load field handlers and rules from database
    await this.loadFieldRules();

    console.log('✅ Coworker system initialized');
  } catch (error) {
    console.error('❌ Failed to initialize coworker:', error);
    throw error;
  }
};

// Auto-initialize when coworker is ready
if (typeof coworker !== 'undefined' && coworker.run) {
  // Wait for DOM and dependencies
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => coworker.init());
  } else {
    coworker.init();
  }
}


// ============================================================================
// END OF COWORKER-FIELD-SYSTEM.JS
// ============================================================================
