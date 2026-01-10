// ============================================================
// COWORKER COMPONENTS - React UI Components
// ORDER IS CRITICAL: Field components MUST be defined before MainForm
// ============================================================

// ============================================================
// FIELD COMPONENTS (MUST BE FIRST)
// ============================================================

/**
 * FieldLink - Link to another doctype with dropdown
 */

/**
 * FieldSectionBreak - Visual separator with optional label
 */
const FieldSectionBreak = ({ field }) => {
  return React.createElement(
    "div",
    {
      className: CWStyles.form.sectionBreak,
      style: {
        marginTop: "2rem",
        marginBottom: "1rem",
        borderTop: "1px solid #e5e7eb",
        paddingTop: "1rem",
      },
    },
    field.label &&
      React.createElement(
        "h4",
        {
          style: {
            marginBottom: "1rem",
            fontSize: "1.1rem",
            fontWeight: "600",
          },
        },
        field.label
      )
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
      if (field.fieldname === "submit_button") {
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
    React.createElement(
      "button",
      {
        className: CWStyles.button.primary,
        onClick: handleClick,
        disabled: loading || field.read_only,
        type: "button",
      },
      loading ? "Saving..." : field.label
    )
  );
};

// ============================================================
// REGISTER FIELD COMPONENTS - SINGLE SOURCE OF TRUTH
/* ============================================================
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
};*/

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

// ============================================================
// MAIN FORM COMPONENT - With Whitelist CRITICAL TO KEEP renderField
// ============================================================

//funtion added

coworker.renderField = function ({ field, value, handlers, run }) {
  // Get field type definition
  const fieldType = this._config.fieldTypes[field.fieldtype];
  if (!fieldType) return null;

  // Sanitize null/undefined values
  const sanitizeValue = (val, fieldType) => {
    if (val === null || val === undefined) {
      if (
        fieldType.element === "input" &&
        fieldType.props?.type === "checkbox"
      ) {
        return false;
      }
      if (fieldType.element === "input" && fieldType.props?.type === "number") {
        return "";
      }
      return "";
    }
    return val;
  };

  const safeValue = sanitizeValue(value, fieldType);
  const elementDefaults = this._config.elementDefaults[fieldType.element] || {};

  const evalContext = {
    field,
    value: safeValue,
    readOnly: !handlers.onChange,
    CWStyles: window.CWStyles,
    run,
    item: null,
  };

  const elementProps = {
    ...this._config._evalTemplateObj(elementDefaults, evalContext),
    ...this._config._evalTemplateObj(fieldType.props, evalContext),
  };

  // Create state
  const [state, setState] = React.useState(() => {
    const stateConfig = fieldType.state || {};
    const initialState = {};
    for (const key in stateConfig) {
      const stateEvalContext = { ...evalContext, value: safeValue };
      initialState[key] = this._config._evalTemplate(
        stateConfig[key],
        stateEvalContext
      );
    }
    return initialState;
  });

  // Create event handlers
  const eventHandlers = {};
  for (const eventName in fieldType.events || {}) {
    const eventConfig = fieldType.events[eventName];

    // Handle custom events
    if (eventConfig.custom && eventConfig.handler) {
      eventHandlers[eventName] = (e) => {
        eventConfig.handler(e, setState, handlers, field);
      };
      continue;
    }

    // Standard events
    eventHandlers[eventName] = (e) => {
      let newValue;
      if (eventConfig.extract) {
        newValue = e.target[eventConfig.extract];
      } else {
        newValue = e.target.value;
      }

      if (eventConfig.transform) {
        if (eventConfig.transform === "parseInt") {
          newValue = parseInt(newValue, 10) || 0;
        } else if (eventConfig.transform === "parseFloat") {
          newValue = parseFloat(newValue) || 0;
        }
      }

      if (eventConfig.updateState) {
        setState((prev) => ({
          ...prev,
          [eventConfig.updateState]: newValue,
        }));
      }

      if (eventConfig.delegate && handlers[eventConfig.delegate]) {
        handlers[eventConfig.delegate](field.fieldname, newValue);
      }
    };
  }

  // Use state value if available
  if (state.localValue !== undefined) {
    if (fieldType.element === "input" && fieldType.props?.type === "checkbox") {
      elementProps.checked = state.localValue;
    } else {
      elementProps.value = state.localValue;
    }
  }

  // Handle children (for select options)
  let children = null;
  if (fieldType.children) {
    children = fieldType.children
      .map((childDesc, childIdx) => {
        if (childDesc.repeat) {
          const items = this._config._evalTemplate(
            childDesc.repeat,
            evalContext
          );
          return items.map((item, itemIdx) => {
            const childContext = { ...evalContext, item };
            const childProps = this._config._evalTemplateObj(
              childDesc.props,
              childContext
            );
            const childContent = this._config._evalTemplate(
              childDesc.content,
              childContext
            );

            return React.createElement(
              childDesc.element,
              { key: `repeat-${childIdx}-${itemIdx}`, ...childProps },
              childContent
            );
          });
        }

        const childProps = this._config._evalTemplateObj(
          childDesc.props,
          evalContext
        );
        const childContent = this._config._evalTemplate(
          childDesc.content,
          evalContext
        );

        return React.createElement(
          childDesc.element,
          { key: `static-${childIdx}`, ...childProps },
          childContent
        );
      })
      .flat();
  }

  // Create element
  const element = React.createElement(
    fieldType.element,
    { ...elementProps, ...eventHandlers },
    children
  );

  // Handle suffix (e.g., "%" for Percent fields)
  if (fieldType.suffix) {
    return React.createElement(
      "div",
      { className: window.CWStyles.field.percentWrapper },
      element,
      React.createElement(
        "span",
        {
          className: window.CWStyles.field.percentSuffix,
        },
        fieldType.suffix
      )
    );
  }

  return element;
};

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
    return React.createElement(
      "div",
      { className: CWStyles.alert.warning },
      "Loading schema..."
    );
  }

  // Safe extracts
  const titleField = schema.title_field || "name";
  const title = doc[titleField] || doc.name || "New";
  const fields = schema.fields || [];

  // ✅ Whitelist
  const implementedTypes = [
    // Basic inputs
    "Data",
    "Text",
    "Long Text",
    "Password", // ✅ ADD
    "Read Only", // ✅ ADD

    // Numbers
    "Int",
    "Float",
    "Currency",
    "Percent", // ✅ ADD - CRITICAL for Project

    // Boolean
    "Check",

    // Date/Time
    "Date",
    "Datetime",
    "Time",

    // Selection
    "Select",
    "Link",

    // Text content
    "Text Editor", // ✅ ADD - CRITICAL for Project
    "Code",
    "HTML", // ✅ ADD

    // Layout
    "Section Break",
    "Column Break",
    "Tab Break",

    // Actions/Media
    "Button", // ✅ ADD
    "Attach Image",
  ];

  // ✅ Get behavior from config
  const behavior = coworker._config.getBehavior(schema, doc);

  // ✅ Get interaction profile
  const interactionConfig = coworker._config.fieldInteractionConfig;
  const profile = interactionConfig.profiles[interactionConfig.activeProfile];

  // ✅ Debounce timers
  const timersRef = React.useRef({});

  // ✅ Config-driven handlers
  const handlers = React.useMemo(() => {
    const executeAction = (action, fieldname, value) => {
      switch (action) {
        case "write_draft":
          run.input[fieldname] = value;
          console.log(`✅ Draft: ${fieldname} = ${value}`);
          break;

        case "validate":
          run.input[fieldname] = value;
          if (coworker.controller.validate) {
            const validation = coworker.controller.validate(run);
            if (validation && !validation.valid) {
              run._validationErrors = validation.errors;
            }
          }
          console.log(`✅ Validated: ${fieldname}`);
          break;

        case "auto_save":
          run.input[fieldname] = value;
          if (behavior.controller.autoSave) {
            coworker.controller.autoSave(run);
            console.log(`✅ Auto-saved: ${fieldname}`);
          } else {
            console.log(`⚠️ Auto-save disabled by behavior`);
          }
          break;

        default:
          console.warn(`Unknown action: ${action}`);
      }
    };

    return {
      onChange: (fieldname, value) => {
        const config = profile.onChange;
        if (!config.enabled) return;

        const perform = () => executeAction(config.action, fieldname, value);

        if (config.debounce > 0) {
          clearTimeout(timersRef.current[`onChange_${fieldname}`]);
          timersRef.current[`onChange_${fieldname}`] = setTimeout(
            perform,
            config.debounce
          );
        } else {
          perform();
        }
      },

      onBlur: (fieldname, value) => {
        const config = profile.onBlur;
        if (!config.enabled) return;

        const perform = () => executeAction(config.action, fieldname, value);

        if (config.debounce > 0) {
          clearTimeout(timersRef.current[`onBlur_${fieldname}`]);
          timersRef.current[`onBlur_${fieldname}`] = setTimeout(
            perform,
            config.debounce
          );
        } else {
          perform();
        }
      },
    };
  }, [run, behavior, profile]);

  // Docstatus badge helper
  const getDocstatusBadge = (docstatus) => {
    if (docstatus === 0) {
      return { className: CWStyles.badge.warning, label: "Draft" };
    }
    if (docstatus === 1) {
      return { className: CWStyles.badge.success, label: "Submitted" };
    }
    if (docstatus === 2) {
      return { className: CWStyles.badge.danger, label: "Cancelled" };
    }
    return null;
  };

  return React.createElement(
    "div",
    { className: CWStyles.form.wrapper },

    // Header
    React.createElement(
      "div",
      {
        className: `${CWStyles.display.flex} ${CWStyles.justify.between} ${CWStyles.spacing.mb3}`,
      },
      React.createElement("h5", null, title),

      // Badge
      behavior.ui.badge
        ? React.createElement(
            "span",
            { className: CWStyles.badge[behavior.ui.badge.class] },
            behavior.ui.badge.label
          )
        : schema.is_submittable && doc.docstatus !== undefined
        ? (() => {
            const badge = getDocstatusBadge(doc.docstatus);
            return badge
              ? React.createElement(
                  "span",
                  { className: badge.className },
                  badge.label
                )
              : null;
          })()
        : null
    ),

    // ✅ Fields - with custom component support
    fields
      .filter((field) => {
        // Whitelist check
        if (!implementedTypes.includes(field.fieldtype)) {
          return false;
        }

        // depends_on check
        return evaluateDependsOn(field.depends_on, doc);
      })
      .map((field) => {
        const fieldError = run._validationErrors?.find(
          (err) => err.field === field.fieldname
        )?.message;

        const fieldType = coworker._config.fieldTypes[field.fieldtype];

        if (!fieldType) {
          console.warn(`Field type not in config: ${field.fieldtype}`);
          return null;
        }

        // ✅ CRITICAL: Handle layout-only fields FIRST
        if (fieldType.layoutOnly && fieldType.render) {
          return React.createElement(
            React.Fragment,
            { key: field.fieldname },
            fieldType.render({ field, run })
          );
        }

        // Sanitize values
        const fieldValue = doc[field.fieldname];
        const safeValue =
          fieldValue === null || fieldValue === undefined
            ? field.fieldtype === "Check"
              ? false
              : ""
            : fieldValue;

        // Regular fields
        return React.createElement(
          "div",
          {
            key: field.fieldname,
            className: CWStyles.form.fieldWrapper,
          },

          field.label &&
            React.createElement(
              "label",
              { className: CWStyles.form.label },
              field.label
            ),

          // ✅ Check for custom component OR use renderField
          fieldType.customComponent && fieldType.render
            ? fieldType.render({ field, value: safeValue, handlers, run })
            : coworker.renderField({ field, value: safeValue, handlers, run }),

          fieldError &&
            React.createElement(
              "span",
              { className: CWStyles.text.danger },
              fieldError
            )
        );
      })
  );
};

/**
 * MainGrid - List view with table (WITH NULL PROTECTION)
 */
const MainGrid = ({ run }) => {
  const data = run.output?.data;

  // ✅ Filter out null/undefined records
  const validData = data?.filter((row) => row != null) || [];

  if (validData.length === 0) {
    return React.createElement(
      "div",
      { className: CWStyles.alert.info },
      "No records found"
    );
  }

  // ✅ Get keys from first valid record
  const keys = Object.keys(validData[0] || {});

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
          validData.map(
            (
              row,
              i // ✅ Use validData instead of data
            ) =>
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
                    // ✅ Extra protection on cell value
                    String(row?.[key] ?? "")
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
