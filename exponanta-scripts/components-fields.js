One Field doctype with a rule_type to distinguish:
{
  "name": "Field",
  "doctype": "DocType",
  "module": "Core",
  "field_order": [
    "rule_type_section",
    "rule_type",
    "fieldname",
    "fieldtype",
    "column_break_0",
    "is_active",
    "priority",
    
    "section_system_rules",
    "applies_to",
    "specific_doctypes",
    "auto_set_on",
    "generator_function",
    "column_break_system",
    "read_only_after_insert",
    "unique_constraint",
    "indexed",
    "required_on",
    
    "section_handler",
    "is_standard_input",
    "component",
    "custom_handler",
    "column_break_handler",
    "category",
    "jstype",
    
    "section_processing",
    "parse",
    "format",
    "column_break_proc",
    "preprocess",
    "postprocess",
    
    "section_validation",
    "validate",
    "validate_async",
    
    "section_ui",
    "input_type",
    "input_props",
    
    "section_grid",
    "grid_format",
    "grid_width",
    "column_break_grid",
    "sortable",
    "filterable",
    
    "section_change",
    "save_on",
    "debounce",
    
    "section_defaults",
    "default_value",
    "default_function",
    
    "section_meta",
    "description",
    "version"
  ],
  "fields": [
    {
      "fieldname": "rule_type_section",
      "fieldtype": "Section Break",
      "label": "Rule Type"
    },
    {
      "fieldname": "rule_type",
      "fieldtype": "Select",
      "label": "Rule Type",
      "options": "Field Handler\nSystem Field Rule",
      "reqd": 1,
      "in_list_view": 1,
      "bold": 1,
      "description": "Field Handler = fieldtype behavior | System Field Rule = cross-doctype field rules"
    },
    {
      "fieldname": "fieldname",
      "fieldtype": "Data",
      "label": "Field Name",
      "depends_on": "eval:doc.rule_type=='System Field Rule'",
      "mandatory_depends_on": "eval:doc.rule_type=='System Field Rule'",
      "in_list_view": 1,
      "description": "For System Rules: name, owner, creation, etc."
    },
    {
      "fieldname": "fieldtype",
      "fieldtype": "Data",
      "label": "Field Type",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "mandatory_depends_on": "eval:doc.rule_type=='Field Handler'",
      "in_list_view": 1,
      "unique": 1,
      "description": "For Handlers: Data, Int, Link, etc."
    },
    {
      "fieldname": "column_break_0",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "is_active",
      "fieldtype": "Check",
      "label": "Is Active",
      "default": "1",
      "in_list_view": 1
    },
    {
      "fieldname": "priority",
      "fieldtype": "Int",
      "label": "Priority",
      "default": "100",
      "description": "Execution order for System Rules (lower = earlier)"
    },
    
    {
      "fieldname": "section_system_rules",
      "fieldtype": "Section Break",
      "label": "System Field Rules",
      "depends_on": "eval:doc.rule_type=='System Field Rule'"
    },
    {
      "fieldname": "applies_to",
      "fieldtype": "Select",
      "label": "Applies To",
      "options": "all\nspecific\nsubmittable\nchild_tables",
      "default": "all",
      "depends_on": "eval:doc.rule_type=='System Field Rule'"
    },
    {
      "fieldname": "specific_doctypes",
      "fieldtype": "Small Text",
      "label": "Specific DocTypes",
      "depends_on": "eval:doc.rule_type=='System Field Rule' && doc.applies_to=='specific'",
      "description": "Comma-separated doctype names"
    },
    {
      "fieldname": "auto_set_on",
      "fieldtype": "Select",
      "label": "Auto Set On",
      "options": "\ncreate\nupdate\nboth\nsubmit\ncancel",
      "depends_on": "eval:doc.rule_type=='System Field Rule'",
      "description": "When to auto-generate this field"
    },
    {
      "fieldname": "generator_function",
      "fieldtype": "Code",
      "label": "Generator Function",
      "options": "JavaScript",
      "depends_on": "eval:doc.rule_type=='System Field Rule' && doc.auto_set_on",
      "description": "({ doc, operation, context }) => value"
    },
    {
      "fieldname": "column_break_system",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "read_only_after_insert",
      "fieldtype": "Check",
      "label": "Read Only After Insert",
      "default": "0",
      "depends_on": "eval:doc.rule_type=='System Field Rule'"
    },
    {
      "fieldname": "unique_constraint",
      "fieldtype": "Check",
      "label": "Unique Constraint",
      "default": "0",
      "depends_on": "eval:doc.rule_type=='System Field Rule'"
    },
    {
      "fieldname": "indexed",
      "fieldtype": "Check",
      "label": "Indexed",
      "default": "0",
      "depends_on": "eval:doc.rule_type=='System Field Rule'"
    },
    {
      "fieldname": "required_on",
      "fieldtype": "Select",
      "label": "Required On",
      "options": "\nalways\ncreate\nupdate\nsubmit",
      "depends_on": "eval:doc.rule_type=='System Field Rule'"
    },
    
    {
      "fieldname": "section_handler",
      "fieldtype": "Section Break",
      "label": "Field Handler Config",
      "depends_on": "eval:doc.rule_type=='Field Handler'"
    },
    {
      "fieldname": "is_standard_input",
      "fieldtype": "Check",
      "label": "Is Standard Input",
      "default": "1",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "description": "Use generic Field component with inputType/inputProps"
    },
    {
      "fieldname": "component",
      "fieldtype": "Data",
      "label": "Component Name",
      "depends_on": "eval:doc.rule_type=='Field Handler' && !doc.is_standard_input",
      "description": "React component name (e.g., FieldSelect, FieldLink)"
    },
    {
      "fieldname": "custom_handler",
      "fieldtype": "Data",
      "label": "Custom Handler",
      "depends_on": "eval:doc.rule_type=='Field Handler' && !doc.is_standard_input",
      "description": "Coworker method name (e.g., _handleTableField)"
    },
    {
      "fieldname": "column_break_handler",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "category",
      "fieldtype": "Select",
      "label": "Category",
      "options": "text\nnumeric\nboolean\ndate\nchoice\nreference\nlayout\nmedia\nspecial\nchild",
      "default": "text",
      "depends_on": "eval:doc.rule_type=='Field Handler'"
    },
    {
      "fieldname": "jstype",
      "fieldtype": "Select",
      "label": "JavaScript Type",
      "options": "string\nnumber\nboolean\nobject\narray\nnull",
      "default": "string",
      "depends_on": "eval:doc.rule_type=='Field Handler'"
    },
    
    {
      "fieldname": "section_processing",
      "fieldtype": "Section Break",
      "label": "Data Processing",
      "depends_on": "eval:doc.rule_type=='Field Handler'"
    },
    {
      "fieldname": "parse",
      "fieldtype": "Code",
      "label": "Parse Function",
      "options": "JavaScript",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "description": "Convert string/input to typed value: (val) => typed"
    },
    {
      "fieldname": "format",
      "fieldtype": "Code",
      "label": "Format Function",
      "options": "JavaScript",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "description": "Convert typed value to display string: (val) => string"
    },
    {
      "fieldname": "column_break_proc",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "preprocess",
      "fieldtype": "Code",
      "label": "Preprocess Function",
      "options": "JavaScript",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "description": "Normalize value on input: ({ val, field, context }) => normalized"
    },
    {
      "fieldname": "postprocess",
      "fieldtype": "Code",
      "label": "Postprocess Function",
      "options": "JavaScript",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "description": "Transform after validation, before save: ({ val, field, context }) => transformed"
    },
    
    {
      "fieldname": "section_validation",
      "fieldtype": "Section Break",
      "label": "Validation"
    },
    {
      "fieldname": "validate",
      "fieldtype": "Code",
      "label": "Validate Function",
      "options": "JavaScript",
      "description": "Sync validation: (val, field) => error_message | null OR ({ val, doc, operation, context }) => error | null"
    },
    {
      "fieldname": "validate_async",
      "fieldtype": "Code",
      "label": "Validate Async Function",
      "options": "JavaScript",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "description": "Async validation: async ({ val, field, context }) => error_message | null"
    },
    
    {
      "fieldname": "section_ui",
      "fieldtype": "Section Break",
      "label": "UI Rendering",
      "depends_on": "eval:doc.rule_type=='Field Handler'"
    },
    {
      "fieldname": "input_type",
      "fieldtype": "Select",
      "label": "Input Type",
      "options": "text\nnumber\npassword\nemail\nurl\ntel\ndate\ndatetime-local\ntime\ncolor\nfile\ntextarea\nselect\ncheckbox\nradio",
      "default": "text",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "mandatory_depends_on": "eval:doc.rule_type=='Field Handler' && doc.is_standard_input"
    },
    {
      "fieldname": "input_props",
      "fieldtype": "Code",
      "label": "Input Props Function",
      "options": "JavaScript",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "description": "Generate input props: (field) => { type, placeholder, maxLength, ... }"
    },
    
    {
      "fieldname": "section_grid",
      "fieldtype": "Section Break",
      "label": "Grid Display",
      "depends_on": "eval:doc.rule_type=='Field Handler'"
    },
    {
      "fieldname": "grid_format",
      "fieldtype": "Code",
      "label": "Grid Format Function",
      "options": "JavaScript",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "description": "Format value for grid display: (val) => formatted_string"
    },
    {
      "fieldname": "grid_width",
      "fieldtype": "Data",
      "label": "Grid Column Width",
      "default": "auto",
      "depends_on": "eval:doc.rule_type=='Field Handler'",
      "description": "CSS width value (e.g., 150px, auto, 20%)"
    },
    {
      "fieldname": "column_break_grid",
      "fieldtype": "Column Break"
    },
    {
      "fieldname": "sortable",
      "fieldtype": "Check",
      "label": "Sortable",
      "default": "1",
      "depends_on": "eval:doc.rule_type=='Field Handler'"
    },
    {
      "fieldname": "filterable",
      "fieldtype": "Check",
      "label": "Filterable",
      "default": "1",
      "depends_on": "eval:doc.rule_type=='Field Handler'"
    },
    
    {
      "fieldname": "section_change",
      "fieldtype": "Section Break",
      "label": "Change Handling",
      "depends_on": "eval:doc.rule_type=='Field Handler'"
    },
    {
      "fieldname": "save_on",
      "fieldtype": "Select",
      "label": "Save On",
      "options": "blur\nchange\nmanual",
      "default": "blur",
      "depends_on": "eval:doc.rule_type=='Field Handler'"
    },
    {
      "fieldname": "debounce",
      "fieldtype": "Int",
      "label": "Debounce (ms)",
      "default": "0",
      "depends_on": "eval:doc.rule_type=='Field Handler' && doc.save_on=='change'"
    },
    
    {
      "fieldname": "section_defaults",
      "fieldtype": "Section Break",
      "label": "Default Values"
    },
    {
      "fieldname": "default_value",
      "fieldtype": "Data",
      "label": "Default Value",
      "description": "Static default value"
    },
    {
      "fieldname": "default_function",
      "fieldtype": "Code",
      "label": "Default Function",
      "options": "JavaScript",
      "description": "({ doc, context }) => default_value"
    },
    
    {
      "fieldname": "section_meta",
      "fieldtype": "Section Break",
      "label": "Metadata"
    },
    {
      "fieldname": "description",
      "fieldtype": "Small Text",
      "label": "Description"
    },
    {
      "fieldname": "version",
      "fieldtype": "Data",
      "label": "Version",
      "default": "1.0.0",
      "read_only": 1
    }
  ],
  "permissions": [
    {
      "role": "System Manager",
      "read": 1,
      "write": 1,
      "create": 1,
      "delete": 1
    }
  ],
  "autoname": "format:{rule_type}-{fieldname}{fieldtype}",
  "title_field": "fieldname",
  "sort_field": "rule_type,priority"
}
Sample Documents
Field Handler: Data
{
  "name": "Field Handler-Data",
  "doctype": "Field",
  "rule_type": "Field Handler",
  "fieldtype": "Data",
  "is_active": 1,
  "is_standard_input": 1,
  "category": "text",
  "jstype": "string",
  "parse": "(val) => val?.toString() ?? \"\"",
  "format": "(val) => val ?? \"\"",
  "preprocess": "({ val }) => typeof val === \"string\" ? val.trim() : val",
  "validate": "(val, field) => field.required && !val?.trim() ? \"Required\" : null",
  "input_type": "text",
  "input_props": "(field) => ({ type: 'text', maxLength: field.length, placeholder: field.placeholder })",
  "grid_format": "(val) => val ?? \"\"",
  "save_on": "blur"
}
System Field Rule: name
{
  "name": "System Field Rule-name",
  "doctype": "Field",
  "rule_type": "System Field Rule",
  "fieldname": "name",
  "is_active": 1,
  "priority": 10,
  "applies_to": "all",
  "auto_set_on": "create",
  "generator_function": "({ doc }) => doc.name || generateId(doc.doctype)",
  "read_only_after_insert": 1,
  "unique_constraint": 1,
  "indexed": 1,
  "required_on": "always"
}
Loading Both Types
coworker.loadFieldRules = async function() {
  const result = await this.run({
    operation: 'select',
    doctype: 'Field',
    input: { where: { is_active: 1 } },
    options: { includeSchema: false }
  });
  
  this._fieldHandlers = {};
  this._systemFieldRules = {};
  
  result.output.data.forEach(doc => {
    if (doc.rule_type === 'Field Handler') {
      this._fieldHandlers[doc.fieldtype] = {
        is_standard_input: doc.is_standard_input,
        component: doc.component,
        custom_handler: doc.custom_handler,
        category: doc.category,
        jstype: doc.jstype,
        parse: doc.parse ? eval(`(${doc.parse})`) : null,
        format: doc.format ? eval(`(${doc.format})`) : null,
        preprocess: doc.preprocess ? eval(`(${doc.preprocess})`) : null,
        postprocess: doc.postprocess ? eval(`(${doc.postprocess})`) : null,
        validate: doc.validate ? eval(`(${doc.validate})`) : null,
        validateAsync: doc.validate_async ? eval(`(${doc.validate_async})`) : null,
        inputType: doc.input_type,
        inputProps: doc.input_props ? eval(`(${doc.input_props})`) : null,
        gridFormat: doc.grid_format ? eval(`(${doc.grid_format})`) : null,
        gridWidth: doc.grid_width,
        sortable: doc.sortable,
        filterable: doc.filterable,
        saveOn: doc.save_on,
        debounce: doc.debounce
      };
    } else if (doc.rule_type === 'System Field Rule') {
      this._systemFieldRules[doc.fieldname] = {
        priority: doc.priority,
        applies_to: doc.applies_to,
        specific_doctypes: doc.specific_doctypes?.split(',').map(s => s.trim()),
        auto_set_on: doc.auto_set_on,
        generator: doc.generator_function ? eval(`(${doc.generator_function})`) : null,
        read_only_after_insert: doc.read_only_after_insert,
        unique: doc.unique_constraint,
        indexed: doc.indexed,
        required_on: doc.required_on,
        validate: doc.validate ? eval(`(${doc.validate})`) : null,
        default_value: doc.default_value,
        default_fn: doc.default_function ? eval(`(${doc.default_function})`) : null
      };
    }
  });
  
  console.log(`✅ Loaded ${Object.keys(this._fieldHandlers).length} field handlers`);
  console.log(`✅ Loaded ${Object.keys(this._systemFieldRules).length} system field rules`);
};
Benefits:
✅ One doctype to manage
✅ Unified interface
✅ depends_on shows/hides relevant sections
✅ Can list both types in one view with filters
✅ Simpler to understand: "Field rules live in Field doctype"
then how 3 tier processing looks like on create()
Here's the complete 3-tier processing flow on create():
The Flow
// In coworker-run.js - CREATE handler
create: async function (run_doc) {
  const { target_doctype, input, options } = run_doc;
  const { data } = input || {};
  
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
      schema: options.includeSchema ? schema : undefined
    }
  };
}
The 3-Tier Engine
// NEW FILE: coworker-process.js
coworker.processDocument = async function(operation, doc, context) {
  context.doc = doc;
  
  // ═══════════════════════════════════════════════════════════
  // TIER 1: SYSTEM FIELD RULES (cross-doctype field behavior)
  // ═══════════════════════════════════════════════════════════
  await this._applySystemFieldRules(operation, doc, context);
  
  // ═══════════════════════════════════════════════════════════
  // TIER 2: FIELD TYPE HANDLERS (fieldtype-specific processing)
  // ═══════════════════════════════════════════════════════════
  await this._applyFieldTypeHandlers(doc, context);
  
  // ═══════════════════════════════════════════════════════════
  // TIER 3: CUSTOM FIELD RULES (business logic, computed fields)
  // ═══════════════════════════════════════════════════════════
  await this._applyCustomFieldRules(operation, doc, context);
  
  return doc;
};
Tier 1: System Field Rules
coworker._applySystemFieldRules = async function(operation, doc, context) {
  const schema = context.schema;
  
  // Get applicable rules, sorted by priority
  const rules = Object.entries(this._systemFieldRules)
    .filter(([fname, rule]) => {
      if (!rule) return false;
      
      // Check if rule applies to this doctype
      if (rule.applies_to === 'all') return true;
      if (rule.applies_to === 'specific') {
        return rule.specific_doctypes?.includes(doc.doctype);
      }
      if (rule.applies_to === 'submittable') return schema.is_submittable;
      if (rule.applies_to === 'child_tables') return schema.istable;
      
      return false;
    })
    .sort((a, b) => (a[1].priority || 100) - (b[1].priority || 100));
  
  // Apply each rule
  for (const [fieldname, rule] of rules) {
    // Auto-generate value
    if (rule.auto_set_on === operation || rule.auto_set_on === 'both') {
      if (rule.generator && doc[fieldname] == null) {
        doc[fieldname] = await rule.generator({ doc, operation, context });
      } else if (rule.default_value && doc[fieldname] == null) {
        doc[fieldname] = rule.default_value;
      } else if (rule.default_fn && doc[fieldname] == null) {
        doc[fieldname] = await rule.default_fn({ doc, context });
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
  
  console.log('✅ Tier 1: System field rules applied', Object.keys(rules).length);
};
Tier 2: Field Type Handlers
coworker._applyFieldTypeHandlers = async function(doc, context) {
  const schema = context.schema;
  
  for (const field of schema.fields) {
    const handler = this._fieldHandlers[field.fieldtype];
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
  }
  
  console.log('✅ Tier 2: Field type handlers applied');
};
Tier 3: Custom Field Rules (Future - Your Business Logic)
coworker._applyCustomFieldRules = async function(operation, doc, context) {
  // This is where your FIELD_RULES from the architecture doc go
  // Example: computed fields with dependencies
  
  const FIELD_RULES = {
    closing_date: {
      depends_on: ['status'],
      fn: ({ doc }) => doc.status === 'Closed' ? new Date().toISOString() : null
    },
    review_date: {
      depends_on: ['status'],
      fn: ({ doc }) => ['Closed', 'Pending Review'].includes(doc.status) 
        ? new Date().toISOString() 
        : null
    }
  };
  
  // Topological sort by dependencies
  const sorted = this._topologicalSort(FIELD_RULES);
  
  // Apply rules in order
  for (const fieldname of sorted) {
    const rule = FIELD_RULES[fieldname];
    if (!rule) continue;
    
    // Check if dependencies are satisfied
    const depsReady = !rule.depends_on || 
      rule.depends_on.every(f => doc[f] !== undefined);
    
    if (depsReady && rule.fn) {
      const result = await rule.fn({ doc, field: { fieldname }, context });
      if (result !== undefined) {
        doc[fieldname] = result;
      }
    }
  }
  
  console.log('✅ Tier 3: Custom field rules applied');
};

coworker._topologicalSort = function(rules) {
  // Simple topo sort implementation
  const sorted = [];
  const visited = new Set();
  
  const visit = (fieldname) => {
    if (visited.has(fieldname)) return;
    visited.add(fieldname);
    
    const rule = rules[fieldname];
    if (rule?.depends_on) {
      rule.depends_on.forEach(dep => visit(dep));
    }
    
    sorted.push(fieldname);
  };
  
  Object.keys(rules).forEach(visit);
  return sorted;
};
Complete Example: Creating a Task
// User calls:
await coworker.run({
  operation: 'create',
  doctype: 'Task',
  input: {
    data: {
      title: '  Fix bug  ',  // has spaces
      status: 'Closed',
      priority: '5'  // string
    }
  }
});

// TIER 1: System Field Rules
// ─────────────────────────────
// name:        null → "task_abc123" (generated)
// owner:       null → "john@example.com" (from context.user)
// creation:    null → "2025-01-21T10:00:00Z" (new Date())
// modified:    null → "2025-01-21T10:00:00Z" (new Date())
// docstatus:   null → 0 (default)
// doctype:     "Task" (already set)

// TIER 2: Field Type Handlers
// ─────────────────────────────
// title:       "  Fix bug  " → "Fix bug" (Data.preprocess trims)
// status:      "Closed" → "Closed" (Select.validate passes)
// priority:    "5" → 5 (Int.preprocess parses)

// TIER 3: Custom Field Rules
// ─────────────────────────────
// closing_date: null → "2025-01-21T10:00:00Z" (status === 'Closed')
// review_date:  null → "2025-01-21T10:00:00Z" (status === 'Closed')

// FINAL DOCUMENT:
{
  doctype: "Task",
  name: "task_abc123",
  owner: "john@example.com",
  creation: "2025-01-21T10:00:00Z",
  modified: "2025-01-21T10:00:00Z",
  docstatus: 0,
  title: "Fix bug",
  status: "Closed",
  priority: 5,
  closing_date: "2025-01-21T10:00:00Z",
  review_date: "2025-01-21T10:00:00Z"
}

// → saved to DB via _dbCreate()
Summary
Tier	What	Where	Example
1	System field rules	_systemFieldRules (from Field doctype)	name, owner, creation auto-generated
2	Field type handlers	_fieldHandlers (from Field doctype)	Data trims, Int parses, Link validates
3	Custom field rules	FIELD_RULES (future: from DB or code)	closing_date computed from status
All driven by data stored in the Field doctype!
and how the component for FieldData will look like knowing that we have component: field and all config in document
Here's the complete FieldData component that reads everything from the Field handler config:
// ============================================================
// GENERIC FIELD COMPONENT
// Uses handler config from Field doctype
// ============================================================
const Field = ({ field, value, doc, docname, doctype }) => {
  // Get handler from loaded config
  const handler = coworker._fieldHandlers[field.fieldtype];
  
  if (!handler) {
    console.warn('No handler for fieldtype:', field.fieldtype);
    return null;
  }
  
  // For non-standard inputs, delegate to custom component
  if (!handler.is_standard_input) {
    const CustomComponent = window.components[handler.component];
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
    const rawValue = e.target.value;
    
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
        context: { doc, docname, doctype, db: coworker._dbAdapter }
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
  
  // Handle change (for debounced auto-save)
  const handleChange = (e) => {
    setError(null);
    
    if (handler.saveOn === 'change' && handler.debounce > 0) {
      // TODO: implement debounced save
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
          onChange: handleChange,
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
          onChange: handleChange,
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

// ============================================================
// HELPER: Evaluate depends_on expressions
// ============================================================
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

// ============================================================
// REGISTER GENERIC COMPONENT
// ============================================================
window.components = window.components || {};
window.components.Field = Field;
Usage in _renderField
// In coworker-renderer.js
coworker._renderField = function({ field, value, docname, doctype, key }) {
  const handler = this._config.field_handlers || this._fieldHandlers[field.fieldtype];
  
  if (!handler) {
    console.warn('No handler for:', field.fieldtype);
    return null;
  }
  
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
Custom Components (for non-standard inputs)
// Example: FieldSelect (custom because it needs <select> element)
const FieldSelect = ({ field, value, doc, docname, doctype }) => {
  const handler = coworker._fieldHandlers['Select'];
  const [error, setError] = React.useState(null);
  
  const handleBlur = async (e) => {
    const val = e.target.value;
    const err = handler.validate ? handler.validate(val, field) : null;
    
    if (err) {
      setError(err);
      return;
    }
    
    if (val !== value) {
      await coworker.run({
        operation: 'update',
        doctype,
        input: { where: { name: docname }, data: { [field.fieldname]: val } },
        options: { render: true }
      });
    }
  };
  
  const options = (field.options || '').split('\n').filter(o => o.trim());
  
  return React.createElement('div', { className: CWStyles.field.wrapper },
    React.createElement('label', { className: CWStyles.field.label }, field.label),
    React.createElement('select', {
      className: CWStyles.field.select,
      defaultValue: value,
      onBlur: handleBlur,
      disabled: field.read_only
    },
      React.createElement('option', { value: '' }, ''),
      options.map(opt => 
        React.createElement('option', { key: opt, value: opt }, opt)
      )
    ),
    error && React.createElement('span', { className: CWStyles.field.error }, error)
  );
};

window.components.FieldSelect = FieldSelect;