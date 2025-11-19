// ============================================================
// coworker-config.js COWORKER CONFIG - Configuration Only (No Execution Logic)
// ============================================================

coworker._config = {
  // ============================================================
  // SYSTEM CONFIG
  // ============================================================
  debug: true,
  
// User aliases → Internal operations
  operationAliases: {
    read: "select",
    insert: "create",
    query: "select",
    fetch: "select",
    add: "create",
    remove: "delete",
    modify: "update",
    patch: "update"
  },
  
  // User aliases → Canonical doctypes
  doctypeAliases: {
    user: "User",
    order: "Sales Order",
    customer: "Customer",
    item: "Item",
    invoice: "Sales Invoice"
  },
  
  // Operation → View mapping
  operationToView: {
    select: "list",
    create: "form",
    update: "form",
    delete: null,
    takeone: "form"   // Internal operation for rendering
  },
  
  // View → Component mapping
  viewToComponent: {
    list: "MainGrid",
    form: "MainForm",
    chat: "MainChat",
    grid: "MainGrid",
    detail: "MainForm",
    conversation: "MainChat"
  },
  
  // View → Container mapping
  viewToContainer: {
    list: "main_container",
    form: "main_container",
    chat: "right_pane",
    grid: "main_container",
    detail: "main_container",
    MainGrid: "main_container",
    MainForm: "main_container",
    MainChat: "right_pane"
  },

  // ============================================================
  // FIELD HANDLERS CONFIG (Rendering Only)
  // ============================================================
  field_handlers: {
    // ===== TEXT FIELDS =====
    'Data': { 
      component: 'FieldData',
      category: 'text',
      jstype: 'string',
      value_processor: 'text'
    },
    'Text': { 
      component: 'FieldText',
      category: 'text',
      jstype: 'string',
      value_processor: 'text'
    },
    'Long Text': { 
      component: 'FieldLongText',
      category: 'text',
      jstype: 'string',
      value_processor: 'text'
    },
    'Small Text': { 
      component: 'FieldText',
      category: 'text',
      jstype: 'string',
      value_processor: 'text'
    },
    'Read Only': { 
      component: 'FieldData',
      category: 'input',
      jstype: 'string',
      value_processor: 'text'
    },

    // ===== NUMERIC FIELDS =====
    'Int': { 
      component: 'FieldInt',
      category: 'numeric',
      jstype: 'number',
      value_processor: 'numeric'
    },
    'Float': { 
      component: 'FieldFloat',
      category: 'numeric',
      jstype: 'number',
      value_processor: 'numeric'
    },
    'Currency': { 
      component: 'FieldCurrency',
      category: 'numeric',
      jstype: 'number',
      value_processor: 'numeric'
    },
    'Percent': { 
      component: 'FieldFloat',
      category: 'numeric',
      jstype: 'number',
      value_processor: 'numeric'
    },
    'Rating': { 
      component: 'FieldInt',
      category: 'numeric',
      jstype: 'number',
      value_processor: 'numeric'
    },
    'Duration': { 
      component: 'FieldFloat',
      category: 'numeric',
      jstype: 'number',
      value_processor: 'numeric'
    },

    // ===== BOOLEAN FIELDS =====
    'Check': { 
      component: 'FieldCheck',
      category: 'boolean',
      jstype: 'boolean',
      value_processor: 'boolean'
    },

    // ===== CHOICE FIELDS =====
    'Select': { 
      component: 'FieldSelect',
      category: 'choice',
      jstype: 'string',
      value_processor: 'text',
      _optionsResolver: '_resolverSelect'
    },

    // ===== REFERENCE FIELDS =====
    'Link': { 
      component: 'FieldLink',
      category: 'reference',
      jstype: 'string',
      value_processor: 'text',
      _optionsResolver: '_resolverLink'
    },
    'Dynamic Link': { 
      component: 'FieldLink',
      category: 'reference',
      jstype: 'string',
      value_processor: 'text'
    },

    // ===== DATE/TIME FIELDS =====
    'Date': { 
      component: 'FieldDate',
      category: 'date',
      jstype: 'string',
      value_processor: 'date'
    },
    'Datetime': { 
      component: 'FieldDatetime',
      category: 'date',
      jstype: 'string',
      value_processor: 'date'
    },
    'Time': { 
      component: 'FieldTime',
      category: 'date',
      jstype: 'string',
      value_processor: 'text'
    },

    // ===== MULTI-VALUE FIELDS =====
    'MultiSelect': { 
      _handler: '_handleMultiSelectField',
      category: 'multi',
      jstype: 'array',
      value_processor: 'multi'
    },
    'MultiCheck': { 
      _handler: '_handleMultiCheckField',
      category: 'multi',
      jstype: 'array',
      value_processor: 'multi'
    },

    // ===== CHILD TABLE FIELDS =====
    'Table': { 
      _handler: '_handleTableField',
      category: 'child',
      jstype: 'array',
      value_processor: 'multi'
    },
    'Table MultiSelect': { 
      _handler: '_handleTableMultiSelectField',
      category: 'child',
      jstype: 'array',
      value_processor: 'multi'
    },

    // ===== MEDIA FIELDS =====
    'Attach': { 
      _handler: '_handleAttachField',
      category: 'media',
      jstype: 'string',
      value_processor: 'text'
    },
    'Attach Image': { 
      _handler: '_handleAttachImageField',
      category: 'media',
      jstype: 'string',
      value_processor: 'text'
    },
    'Image': { 
      _handler: '_handleAttachImageField',
      category: 'media',
      jstype: 'string',
      value_processor: 'text'
    },
    'Signature': { 
      _handler: '_handleSignatureField',
      category: 'media',
      jstype: 'string',
      value_processor: 'text'
    },

    // ===== SPECIAL FIELDS =====
    'HTML': { 
      _handler: '_handleHTMLField',
      category: 'layout',
      jstype: 'string',
      value_processor: 'text'
    },
    'HTML Editor': { 
      _handler: '_handleHTMLEditorField',
      category: 'text',
      jstype: 'string',
      value_processor: 'text'
    },
    'Code': { 
      _handler: '_handleCodeField',
      category: 'text',
      jstype: 'string',
      value_processor: 'text'
    },
    'Markdown Editor': { 
      _handler: '_handleMarkdownField',
      category: 'text',
      jstype: 'string',
      value_processor: 'text'
    },
    'JSON': { 
      _handler: '_handleJSONField',
      category: 'data',
      jstype: 'object',
      value_processor: 'text'
    },
    'Geolocation': { 
      _handler: '_handleGeolocationField',
      category: 'data',
      jstype: 'object',
      value_processor: 'text'
    },

    // ===== INPUT FIELDS =====
    'Autocomplete': { 
      component: 'FieldData',
      category: 'input',
      jstype: 'string',
      value_processor: 'text'
    },
    'Barcode': { 
      component: 'FieldData',
      category: 'input',
      jstype: 'string',
      value_processor: 'text'
    },
    'Color': { 
      component: 'FieldData',
      category: 'input',
      jstype: 'string',
      value_processor: 'text'
    },
    'Phone': { 
      component: 'FieldData',
      category: 'input',
      jstype: 'string',
      value_processor: 'text'
    },

    // ===== LAYOUT FIELDS (no component needed) =====
    'Section Break': { 
      category: 'layout',
      jstype: 'null'
    },
    'Column Break': { 
      category: 'layout',
      jstype: 'null'
    },
    'Heading': { 
      category: 'layout',
      jstype: 'null'
    },
    'Fold': { 
      category: 'layout',
      jstype: 'null'
    },

    // ===== CONTROL FIELDS =====
    'Button': { 
      category: 'control',
      jstype: 'null'
    }
  },

  // ============================================================
  // FIELD METADATA (from Configuration doctype)
  // ============================================================
  field_metadata: {
    all_fieldtypes: {
      "Attach": { category: "media", jstype: "string" },
      "AttachImage": { category: "media", jstype: "string" },
      "Autocomplete": { category: "input", jstype: "string" },
      "Barcode": { category: "input", jstype: "string" },
      "Button": { category: "control", jstype: "null" },
      "Check": { category: "boolean", jstype: "boolean" },
      "Code": { category: "text", jstype: "string" },
      "Color": { category: "input", jstype: "string" },
      "Column Break": { category: "layout", jstype: "null" },
      "Currency": { category: "numeric", jstype: "number" },
      "Data": { category: "text", jstype: "string" },
      "Date": { category: "date", jstype: "string" },
      "Datetime": { category: "date", jstype: "string" },
      "Duration": { category: "numeric", jstype: "number" },
      "Dynamic Link": { category: "reference", jstype: "string" },
      "Float": { category: "numeric", jstype: "number" },
      "Fold": { category: "layout", jstype: "null" },
      "Geolocation": { category: "data", jstype: "object" },
      "Heading": { category: "layout", jstype: "null" },
      "HTML": { category: "layout", jstype: "string" },
      "HTML Editor": { category: "text", jstype: "string" },
      "Image": { category: "media", jstype: "string" },
      "Int": { category: "numeric", jstype: "number" },
      "JSON": { category: "data", jstype: "object" },
      "Link": { category: "reference", jstype: "string" },
      "Long Text": { category: "text", jstype: "string" },
      "Markdown Editor": { category: "text", jstype: "string" },
      "MultiCheck": { category: "multi", jstype: "array" },
      "MultiSelect": { category: "multi", jstype: "array" },
      "Percent": { category: "numeric", jstype: "number" },
      "Phone": { category: "input", jstype: "string" },
      "Read Only": { category: "input", jstype: "string" },
      "Rating": { category: "numeric", jstype: "number" },
      "Section Break": { category: "layout", jstype: "null" },
      "Select": { category: "choice", jstype: "string" },
      "Signature": { category: "media", jstype: "string" },
      "Small Text": { category: "text", jstype: "string" },
      "Table": { category: "child", jstype: "array" },
      "Table MultiSelect": { category: "child", jstype: "array" },
      "Text": { category: "text", jstype: "string" },
      "Time": { category: "date", jstype: "string" }
    },

    boolean_fieldtypes: ["Check"],
    child_fieldtypes: ["Table", "Table MultiSelect"],
    date_fieldtypes: ["Date", "Datetime", "Duration", "Time"],
    html_fieldtypes: ["HTML", "HTML Editor", "Markdown Editor"],
    layout_fieldtypes: ["Column Break", "Fold", "Heading", "Section Break"],
    multi_value_fieldtypes: ["MultiCheck", "MultiSelect", "Table MultiSelect"],
    numeric_fieldtypes: ["Currency", "Duration", "Float", "Int", "Percent", "Rating"],
    text_fieldtypes: ["Autocomplete", "Barcode", "Code", "Color", "Data", "Long Text", "Phone", "Read Only", "Select", "Small Text", "Text"],

    link_behavior: {
      default: "lazy",
      overrides: {
        "Company": "cached",
        "Role": "lazy",
        "User": "eager"
      }
    },

    std_fields_override: {
      "creation": { jstype: "string", description: "ISO datetime string when created" },
      "docstatus": { jstype: "number", enum: [0, 1, 2] },
      "idx": { jstype: "number" },
      "modified": { jstype: "string" },
      "modified_by": { jstype: "string", link: "User" },
      "name": { jstype: "string", description: "Primary key" },
      "owner": { jstype: "string", link: "User" },
      "parent": { jstype: "string", link: "Any" },
      "parentfield": { jstype: "string" },
      "parenttype": { jstype: "string" }
    }
  },

  // ============================================================
  // RENDER BEHAVIOR
  // ============================================================
  render_behavior: {
    value_processors: {
      boolean: "Boolean(value)",
      date: "new Date(value).toISOString()",
      numeric: "Number(value)",
      text: "String(value)",
      multi: "Array.isArray(value) ? value : []"
    }
  },

  // ============================================================
  // LAYOUT RULES
  // ============================================================
  layout_rules: {
    'Section Break': {
      type: 'container',
      className: 'form.section',
      creates_section: true,
      header: { type: 'heading', level: 3, className: 'form.sectionLabel' }
    },
    'Column Break': {
      type: 'container',
      className: 'form.column',
      creates_column: true
    },
    '_default': {
      type: 'field',
      wrapper: { type: 'container', className: 'form.fieldWrapper' }
    }
  },

  // ============================================================
  // RENDER MAP (Universal Renderer Config)
  // ============================================================
  render_map: {
    container: { element: 'div' },
    heading: { element: (cfg) => `h${cfg.level || 2}` },
    label: { element: 'label' },
    field: { handler: '_renderField' },
    button: { element: 'button' },
    link: { element: 'a' },
    component: { handler: '_renderComponent' }
  }
};

// ============================================================
// FIELD RESOLVERS (For fetching field options)
// ============================================================

coworker._resolverLink = async function(field, searchTerm) {
  return await this.run({
    operation: "select",
    doctype: field.options,
    input: {
      where: { name: { contains: searchTerm } },
      take: 20
    },
    component: "FieldLink",
    container: `field_${field.fieldname}`,
    options: { render: true }
  });
};

coworker._resolverSelect = async function(field) {
  const options = field.options.split('\n').map(opt => ({ name: opt }));
  return { success: true, output: { data: options } };
};

// ============================================================
// VALUE PROCESSORS
// ============================================================

coworker._processValue = function(processorName, value) {
  const processor = this._config.render_behavior.value_processors[processorName];
  if (!processor) return value;
  
  try {
    return eval(processor);
  } catch (err) {
    console.error('Value processor error:', err);
    return value;
  }
};

// ============================================================
// CUSTOM FIELD HANDLERS (Return render config)
// ============================================================

coworker._handleTableField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'TableField',
    props: { field, value, docname, doctype }
  };
};

coworker._handleMultiSelectField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'MultiSelectField',
    props: { field, value, docname, doctype }
  };
};

coworker._handleMultiCheckField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'MultiCheckField',
    props: { field, value, docname, doctype }
  };
};

coworker._handleTableMultiSelectField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'TableMultiSelectField',
    props: { field, value, docname, doctype }
  };
};

coworker._handleAttachField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'AttachField',
    props: { field, value, docname, doctype }
  };
};

coworker._handleAttachImageField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'AttachImageField',
    props: { field, value, docname, doctype }
  };
};

coworker._handleSignatureField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'SignatureField',
    props: { field, value, docname, doctype }
  };
};

coworker._handleHTMLField = function({ field, value }) {
  return {
    type: 'container',
    className: 'form.fieldWrapper',
    children: [
      {
        type: 'label',
        className: 'form.label',
        content: field.label
      },
      {
        type: 'container',
        className: 'field.html',
        dangerouslySetInnerHTML: { __html: value || '' }
      }
    ]
  };
};

coworker._handleHTMLEditorField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'HTMLEditor',
    props: { field, value, docname, doctype }
  };
};

coworker._handleCodeField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'CodeEditor',
    props: { field, value, docname, doctype }
  };
};

coworker._handleMarkdownField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'MarkdownEditor',
    props: { field, value, docname, doctype }
  };
};

coworker._handleJSONField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'JSONEditor',
    props: { field, value, docname, doctype }
  };
};

coworker._handleGeolocationField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'GeolocationField',
    props: { field, value, docname, doctype }
  };
};