// ============================================================
// COWORKER COMPONENTS - React UI Components
// ORDER IS CRITICAL: Field components MUST be defined before MainForm
// ============================================================

// ============================================================
// FIELD COMPONENTS (MUST BE FIRST)
// ============================================================

/**
 * FieldData - Text input with auto-save
 */
const FieldData = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || "");
  const debounceTimerRef = React.useRef(null);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      run.input[field.fieldname] = newValue;
      coworker.controller.autoSave(run);
    }, 300);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement("input", {
      type: "text",
      className: CWStyles.field.input,
      value: localValue,
      readOnly: field.read_only,
      placeholder: field.placeholder,
      onChange: handleChange,
    })
  );
};

/**
 * FieldText - Textarea (3 rows)
 */
const FieldText = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || "");
  const debounceTimerRef = React.useRef(null);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      run.input[field.fieldname] = newValue;
      coworker.controller.autoSave(run);
    }, 300);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement("textarea", {
      className: CWStyles.field.textarea,
      value: localValue,
      readOnly: field.read_only,
      rows: 3,
      onChange: handleChange,
    })
  );
};

/**
 * FieldLongText - Textarea (6 rows)
 */
const FieldLongText = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || "");
  const debounceTimerRef = React.useRef(null);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      run.input[field.fieldname] = newValue;
      coworker.controller.autoSave(run);
    }, 300);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement("textarea", {
      className: CWStyles.field.textarea,
      value: localValue,
      readOnly: field.read_only,
      rows: 6,
      onChange: handleChange,
    })
  );
};

/**
 * FieldInt - Integer input
 */
const FieldInt = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || 0);
  const debounceTimerRef = React.useRef(null);

  const handleChange = (e) => {
    const newValue = parseInt(e.target.value) || 0;
    setLocalValue(newValue);

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      run.input[field.fieldname] = newValue;
      coworker.controller.autoSave(run);
    }, 300);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement("input", {
      type: "number",
      className: CWStyles.field.input,
      value: localValue,
      readOnly: field.read_only,
      onChange: handleChange,
    })
  );
};

/**
 * FieldFloat - Float input
 */
const FieldFloat = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || 0);
  const debounceTimerRef = React.useRef(null);

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value) || 0;
    setLocalValue(newValue);

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      run.input[field.fieldname] = newValue;
      coworker.controller.autoSave(run);
    }, 300);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement("input", {
      type: "number",
      step: "0.01",
      className: CWStyles.field.input,
      value: localValue,
      readOnly: field.read_only,
      onChange: handleChange,
    })
  );
};

/**
 * FieldCurrency - Currency input
 */
const FieldCurrency = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || 0);
  const debounceTimerRef = React.useRef(null);

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value) || 0;
    setLocalValue(newValue);

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      run.input[field.fieldname] = newValue;
      coworker.controller.autoSave(run);
    }, 300);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement("input", {
      type: "number",
      step: "0.01",
      className: CWStyles.field.input,
      value: localValue,
      readOnly: field.read_only,
      onChange: handleChange,
    })
  );
};

/**
 * FieldCheck - Checkbox
 */
const FieldCheck = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || false);

  const handleChange = (e) => {
    const newValue = e.target.checked;
    setLocalValue(newValue);
    run.input[field.fieldname] = newValue;
    coworker.controller.autoSave(run);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement(
      "label",
      { className: CWStyles.form.label },
      React.createElement("input", {
        type: "checkbox",
        checked: localValue,
        disabled: field.read_only,
        className: CWStyles.field.input,
        onChange: handleChange,
      }),
      " " + field.label
    )
  );
};

/**
 * FieldDate - Date picker
 */
const FieldDate = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || "");

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    run.input[field.fieldname] = newValue;
    coworker.controller.autoSave(run);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement("input", {
      type: "date",
      className: CWStyles.field.input,
      value: localValue,
      readOnly: field.read_only,
      onChange: handleChange,
    })
  );
};

/**
 * FieldDatetime - Datetime picker
 */
const FieldDatetime = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || "");

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    run.input[field.fieldname] = newValue;
    coworker.controller.autoSave(run);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement("input", {
      type: "datetime-local",
      className: CWStyles.field.input,
      value: localValue,
      readOnly: field.read_only,
      onChange: handleChange,
    })
  );
};

/**
 * FieldTime - Time picker
 */
const FieldTime = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || "");

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    run.input[field.fieldname] = newValue;
    coworker.controller.autoSave(run);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement("input", {
      type: "time",
      className: CWStyles.field.input,
      value: localValue,
      readOnly: field.read_only,
      onChange: handleChange,
    })
  );
};

/**
 * FieldSelect - Dropdown select
 */
const FieldSelect = ({ field, run, value }) => {
  const [localValue, setLocalValue] = React.useState(value || "");

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    run.input[field.fieldname] = newValue;
    coworker.controller.autoSave(run);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement(
      "select",
      {
        className: CWStyles.field.select,
        value: localValue,
        disabled: field.read_only,
        onChange: handleChange,
      },
      (field.options || "")
        .split("\n")
        .map((opt, i) =>
          React.createElement("option", { key: i, value: opt }, opt)
        )
    )
  );
};

/**
 * FieldLink - Link to another doctype with dropdown
 */
const FieldLink = ({ field, run, value }) => {
  const [options, setOptions] = React.useState([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState(value || "");
  const debounceTimerRef = React.useRef(null);

  const loadOptions = async () => {
    const childRun = await run.child({
      operation: "select",
      doctype: field.options,
      query: { take: 50 },
      options: { render: false },
    });

    if (childRun.success) {
      setOptions(childRun.output.data);
      setIsOpen(true);
    }
  };

  const handleSelect = (option) => {
    setSearchText(option.name);
    setIsOpen(false);

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      run.input[field.fieldname] = option.name;
      coworker.controller.autoSave(run);
    }, 300);
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement("label", { className: CWStyles.form.label }, field.label),
    React.createElement(
      "div",
      { style: { position: "relative" } },
      React.createElement("input", {
        type: "text",
        className: CWStyles.field.input,
        value: searchText,
        onFocus: loadOptions,
        onChange: (e) => setSearchText(e.target.value),
        placeholder: `Select ${field.label}...`,
        readOnly: field.read_only,
      }),
      isOpen &&
        React.createElement(
          "div",
          {
            className: CWStyles.field.linkDropdown,
            style: { display: "block" },
          },
          options.map((opt) =>
            React.createElement(
              "div",
              {
                key: opt.name,
                style: {
                  padding: "8px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                },
                onClick: () => handleSelect(opt),
                onMouseEnter: (e) =>
                  (e.target.style.backgroundColor = "#f0f0f0"),
                onMouseLeave: (e) => (e.target.style.backgroundColor = "white"),
              },
              opt.name
            )
          )
        )
    )
  );
};

/**
 * FieldSectionBreak - Visual separator with optional label
 */
const FieldSectionBreak = ({ field }) => {
  return React.createElement(
    "div",
    { 
      className: CWStyles.form.sectionBreak,
      style: { 
        marginTop: '2rem',
        marginBottom: '1rem',
        borderTop: '1px solid #e5e7eb',
        paddingTop: '1rem'
      }
    },
    field.label && React.createElement('h4', {
      style: { 
        marginBottom: '1rem',
        fontSize: '1.1rem',
        fontWeight: '600'
      }
    }, field.label)
  );
};

/**
 * FieldButton - Action button (triggers save/submit operations)
 */
const FieldButton = ({ field, run }) => {
  const [loading, setLoading] = React.useState(false);
  
  const handleClick = async () => {
    setLoading(true);
    
    try {
      // Check if this is a submit button
      if (field.fieldname === 'submit_button') {
        run.input.docstatus = 1;
      }
      
      // Call save directly (Option 1 - Simple)
      await coworker.controller.save(run);
      
    } catch (error) {
      console.error("Button error:", error);
    }
    
    setLoading(false);
  };
  
  return React.createElement(
    "div",
    { className: CWStyles.form.fieldWrapper },
    React.createElement('button', {
      className: CWStyles.button.primary,
      onClick: handleClick,
      disabled: loading || field.read_only,
      type: "button"
    }, loading ? 'Saving...' : field.label)
  );
};

// ============================================================
// REGISTER FIELD COMPONENTS - SINGLE SOURCE OF TRUTH
// ============================================================
window.components = {
  FieldData,
  FieldText,
  FieldLongText,
  FieldInt,
  FieldFloat,
  FieldCurrency,
  FieldCheck,
  FieldSelect,
  FieldLink,
  FieldDate,
  FieldDatetime,
  FieldTime,
  FieldSectionBreak,
  FieldButton,
};

// ============================================================
// UTILITY COMPONENTS
// ============================================================

/**
 * RecordLink - Clickable record link
 */
const RecordLink = ({
  record,
  children,
  context = {},
  as = "div",
  ...props
}) => {
  return React.createElement(
    as,
    {
      ...props,
      onClick: () => coworker.onRecordClick(record, context),
      style: { cursor: "pointer", ...props.style },
    },
    children
  );
};

// ============================================================
// MAIN COMPONENTS
// ============================================================

/**
 * MainForm - Document form with all fields
 */
// ============================================================
// MAIN FORM COMPONENT - With Whitelist
// ============================================================

const MainForm = ({ run }) => {
  const [schema, setSchema] = React.useState(run?.output?.schema || null);
  
  const doc = run?.doc || {};
  const doctype = doc.doctype || run?.source_doctype || run?.target_doctype;

  // Load schema if missing
  React.useEffect(() => {
    if (!schema && doctype && coworker?.getSchema) {
      coworker.getSchema(doctype).then(setSchema);
    }
  }, [doctype]);

  // Guard clause
  if (!schema) {
    return React.createElement("div", { className: CWStyles.alert.warning }, 
      "Loading schema..."
    );
  }

  // Safe extracts
  const titleField = schema.title_field || 'name';
  const title = doc[titleField] || doc.name || 'New';
  const fields = schema.fields || [];

  const implementedTypes = [
    "Data",
    "Text",
    "Long Text",
    "Int",
    "Float",
    "Currency",
    "Check",
    "Select",
    "Link",
    "Date",
    "Datetime",
    "Time",
  ];

  return React.createElement(
    "div",
    { className: CWStyles.form.wrapper },
    
    // Header
    React.createElement(
      "div",
      {
        className: `${CWStyles.display.flex} ${CWStyles.justify.between} ${CWStyles.spacing.mb3}`,
      },
      React.createElement("h5", null, title)
    ),

    // Fields
    fields
      .filter((field) => implementedTypes.includes(field.fieldtype))
      .map((field) => {
        const componentName = `Field${field.fieldtype.replace(/ /g, "")}`;
        const Component = window.components?.[componentName];

        if (!Component) {
          console.warn(`Component not found: ${componentName}`);
          return null;
        }

        return React.createElement(Component, {
          key: field.fieldname,
          field: field,
          run: run,
          value: doc[field.fieldname],
        });
      })
  );
};

function renderField(field, doc, run) {
  if (!field || field.fieldtype === 'Section Break') return null;
  
  const fieldname = field.fieldname;
  const value = doc[fieldname] ?? '';
  
  return React.createElement("div", { key: fieldname, className: CWStyles.formGroup },
    React.createElement("label", null, field.label || fieldname),
    React.createElement("input", {
      type: "text",
      value: value,
      onChange: (e) => { run.input[fieldname] = e.target.value; }
    })
  );
}

/**
 * MainGrid - List view with table
 */
const MainGrid = ({ run }) => {
  const data = run.output?.data;
  
  if (!data || data.length === 0) {
    return React.createElement(
      "div",
      { className: CWStyles.alert.info },
      "No records found"
    );
  }

  const keys = Object.keys(data[0] || {});

  return React.createElement(
    "div",
    { className: CWStyles.grid.wrapper },
    React.createElement(
      "div",
      { className: CWStyles.grid.header },
      React.createElement("h2", {}, run.source_doctype || "List"),
      React.createElement(
        "div",
        { className: CWStyles.grid.toolbar },
        React.createElement(
          "button",
          { className: CWStyles.button.primary },
          "New"
        )
      )
    ),
    React.createElement(
      "div",
      { className: CWStyles.grid.body },
      React.createElement(
        "table",
        { className: CWStyles.table.base + " " + CWStyles.table.striped },
        React.createElement(
          "thead",
          {},
          React.createElement(
            "tr",
            { className: CWStyles.grid.row },
            keys.map((key) =>
              React.createElement(
                "th",
                { key: key, className: CWStyles.grid.cell },
                key
              )
            )
          )
        ),
        React.createElement(
          "tbody",
          {},
          data.map((row, i) =>
            React.createElement(
              RecordLink,
              {
                key: i,
                record: row,
                as: "tr",
                className: CWStyles.grid.row,
              },
              keys.map((key) =>
                React.createElement(
                  "td",
                  { key: key, className: CWStyles.grid.cell },
                  String(row[key] || "")
                )
              )
            )
          )
        )
      )
    )
  );
};

/**
 * MainChat - AI chat interface
 */
const MainChat = ({ run }) => {
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const response = await run.child({
      operation: "ai_chat",
      input: { message: input },
    });

    if (response.success) {
      const aiMessage = { role: "ai", content: response.output.message };
      setMessages((prev) => [...prev, aiMessage]);
    }
  };

  return React.createElement(
    "div",
    { className: CWStyles.chat.wrapper },
    React.createElement(
      "div",
      { className: CWStyles.chat.messages },
      messages.map((msg, i) =>
        React.createElement(
          "div",
          {
            key: i,
            className:
              msg.role === "user"
                ? CWStyles.chat.messageUser
                : CWStyles.chat.messageAI,
          },
          msg.content
        )
      )
    ),
    React.createElement(
      "div",
      { className: CWStyles.chat.inputWrapper },
      React.createElement("input", {
        type: "text",
        className: CWStyles.chat.input,
        value: input,
        onChange: (e) => setInput(e.target.value),
        onKeyPress: (e) => e.key === "Enter" && handleSend(),
        placeholder: "Type a message...",
      }),
      React.createElement(
        "button",
        { className: CWStyles.button.primary, onClick: handleSend },
        "Send"
      )
    )
  );
};

/**
 * ErrorConsole - Error display
 */
const ErrorConsole = ({ run }) => {
  if (!run?.error) return null;

  return React.createElement(
    "div",
    { className: CWStyles.alert.danger },
    React.createElement("h4", {}, "Error: " + (run.error.code || "UNKNOWN")),
    React.createElement("p", {}, run.error.message),
    run.error.stack &&
      React.createElement(
        "pre",
        { className: CWStyles.text.monospace },
        run.error.stack
      )
  );
};

// ============================================================
// REGISTER MAIN COMPONENTS
// ============================================================
window.MainForm = MainForm;
window.MainGrid = MainGrid;
window.MainChat = MainChat;
window.ErrorConsole = ErrorConsole;
window.RecordLink = RecordLink;

console.log("✅ Coworker components loaded");
console.log("   • Field components:", Object.keys(window.components).length);
console.log("   • Main components: MainForm, MainGrid, MainChat, ErrorConsole");