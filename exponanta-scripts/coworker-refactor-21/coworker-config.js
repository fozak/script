// ============================================================
// COWORKER CONFIG - All Configuration in One Place
// ============================================================

coworker._config = {
  debug: true,

  // ============================================================
  // OPERATIONS CONFIG
  // ============================================================
  operations: {
    get_doc: {
      source_doctype: null, // Must be provided
      target_doctype: null, // Same as source
      view: "form",
      component: "MainForm"
    },
    get_list: {
      source_doctype: null,
      target_doctype: null,
      view: "list",
      component: "MainGrid"
    },
    save_doc: {
      source_doctype: null,
      target_doctype: null,
      view: "form",
      component: "MainForm"
    },
    ai_chat: {
      source_doctype: null,
      target_doctype: null,
      view: "chat",
      component: "MainChat"
    }
  },

  // ============================================================
  // FIELD HANDLERS CONFIG
  // ============================================================
  field_handlers: {
    'Data': { component: 'FieldData' },
    'Text': { component: 'FieldText' },
    'Long Text': { component: 'FieldLongText' },
    'Int': { component: 'FieldInt' },
    'Float': { component: 'FieldFloat' },
    'Currency': { component: 'FieldCurrency' },
    'Check': { component: 'FieldCheck' },
    'Select': { component: 'FieldSelect' },
    'Link': { component: 'FieldLink' },
    'Date': { component: 'FieldDate' },
    'Datetime': { component: 'FieldDatetime' },
    'Time': { component: 'FieldTime' },
    'Table': { _handler: '_handleTableField' },
    'Attach': { _handler: '_handleAttachField' },
    'Attach Image': { _handler: '_handleAttachImageField' },
    'HTML': { _handler: '_handleHTMLField' },
    'Code': { _handler: '_handleCodeField' },
    'Markdown Editor': { _handler: '_handleMarkdownField' }
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
  // RENDER MAP
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
// OPERATION HANDLERS
// ============================================================
coworker._handlers = {
  get_doc: async function(run_doc) {
    const { doctype, name } = run_doc.input;
    
    if (!doctype || !name) {
      throw new Error("get_doc requires doctype and name");
    }

    // Simulate API call
    const response = await fetch(`/api/resource/${doctype}/${name}`);
    const data = await response.json();

    return {
      success: true,
      output: {
        data: [data.data],
        schema: data.schema || {}
      }
    };
  },

  get_list: async function(run_doc) {
    const { doctype, filters, fields, limit, order_by } = run_doc.input;
    
    if (!doctype) {
      throw new Error("get_list requires doctype");
    }

    // Simulate API call
    const response = await fetch(`/api/resource/${doctype}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters, fields, limit, order_by })
    });
    const data = await response.json();

    return {
      success: true,
      output: {
        data: data.data,
        schema: data.schema || {}
      }
    };
  },

  save_doc: async function(run_doc) {
    const { doctype, doc } = run_doc.input;
    
    if (!doctype || !doc) {
      throw new Error("save_doc requires doctype and doc");
    }

    // Simulate API call
    const response = await fetch(`/api/resource/${doctype}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    const data = await response.json();

    return {
      success: true,
      output: {
        data: [data.data],
        message: "Document saved successfully"
      }
    };
  },

  ai_chat: async function(run_doc) {
    const { message, context } = run_doc.input;
    
    if (!message) {
      throw new Error("ai_chat requires message");
    }

    // Simulate streaming AI response
    const response = { 
      success: true,
      output: {
        message: `AI Response to: ${message}`,
        context: context || {}
      }
    };

    return response;
  }
};

// ============================================================
// CUSTOM FIELD HANDLERS
// ============================================================
coworker._handleTableField = function({ field, value, docname, doctype }) {
  return {
    type: 'component',
    component: 'TableField',
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