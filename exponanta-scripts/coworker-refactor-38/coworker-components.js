// ============================================================
// COWORKER COMPONENTS - React UI Components
// ORDER IS CRITICAL: Field components MUST be defined before MainForm
// ============================================================

// ============================================================
// FIELD COMPONENTS (MUST BE FIRST)
// ============================================================

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
        field.label,
      ),
  );
};

// ============================================================
// UTILITY COMPONENTS
// ============================================================

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
    children,
  );
};

// ============================================================
// FIELD RENDERER - Proper React component (fixes Rules of Hooks)
// ============================================================

coworker.FieldRenderer = function ({ field, value, handlers, run }) {
  const coworkerRef = coworker;
  const fieldType = coworkerRef._config.fieldTypes[field.fieldtype];

  // Sanitize null/undefined values
  const sanitizeValue = (val, ft) => {
    if (val === null || val === undefined) {
      if (ft.element === "input" && ft.props?.type === "checkbox") return false;
      if (ft.element === "input" && ft.props?.type === "number") return "";
      return "";
    }
    return val;
  };

  const safeValue = fieldType ? sanitizeValue(value, fieldType) : "";
  const elementDefaults = fieldType
    ? coworkerRef._config.elementDefaults[fieldType.element] || {}
    : {};

  const evalContext = {
    field,
    value: safeValue,
    readOnly: !handlers?.onChange,
    CWStyles: globalThis.CWStyles,
    run,
    item: null,
  };

  // ✅ ALL hooks unconditionally at the top
  const [state, setState] = React.useState(() => {
    if (!fieldType) return {};
    const stateConfig = fieldType.state || {};
    const initialState = {};
    for (const key in stateConfig) {
      const stateEvalContext = { ...evalContext, value: safeValue };
      initialState[key] = coworkerRef.evalTemplate(
        stateConfig[key],
        stateEvalContext,
      );
    }
    return initialState;
  });

  const handlersRef = React.useRef(handlers);
  React.useEffect(() => {
    handlersRef.current = handlers;
  });

  // ✅ Early return AFTER all hooks
  if (!fieldType) return null;

  const elementProps = {
    ...coworkerRef.evalTemplateObj(elementDefaults, evalContext),
    ...coworkerRef.evalTemplateObj(fieldType.props, evalContext),
  };

  // Create event handlers
  const eventHandlers = {};
  for (const eventName in fieldType.events || {}) {
    const eventConfig = fieldType.events[eventName];

    if (eventConfig.custom && eventConfig.handler) {
      eventHandlers[eventName] = (e) => {
        eventConfig.handler(e, setState, handlersRef.current, field);
      };
      continue;
    }

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

      if (eventConfig.delegate && handlersRef.current?.[eventConfig.delegate]) {
        handlersRef.current[eventConfig.delegate](field.fieldname, newValue);
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
          const items = coworkerRef.evalTemplate(
            childDesc.repeat,
            evalContext,
          );
          return items.map((item, itemIdx) => {
            const childContext = { ...evalContext, item };
            const childProps = coworkerRef.evalTemplateObj(
              childDesc.props,
              childContext,
            );
            const childContent = coworkerRef.evalTemplate(
              childDesc.content,
              childContext,
            );
            return React.createElement(
              childDesc.element,
              { key: `repeat-${childIdx}-${itemIdx}`, ...childProps },
              childContent,
            );
          });
        }

        const childProps = coworkerRef.evalTemplateObj(
          childDesc.props,
          evalContext,
        );
        const childContent = coworkerRef.evalTemplate(
          childDesc.content,
          evalContext,
        );

        return React.createElement(
          childDesc.element,
          { key: `static-${childIdx}`, ...childProps },
          childContent,
        );
      })
      .flat();
  }

  const element = React.createElement(
    fieldType.element,
    { ...elementProps, ...eventHandlers },
    children,
  );

  if (fieldType.suffix) {
    return React.createElement(
      "div",
      { className: globalThis.CWStyles.field.percentWrapper },
      element,
      React.createElement(
        "span",
        { className: globalThis.CWStyles.field.percentSuffix },
        fieldType.suffix,
      ),
    );
  }

  return element;
};

// ============================================================
// MAIN FORM COMPONENT
// ============================================================

const MainForm = ({ run }) => {
  const [schema, setSchema] = React.useState(run?.target?.schema || null);

  const doc = run?.doc || {};
  const doctype = doc.doctype || run?.source_doctype || run?.target_doctype;

  // ✅ ALL hooks before any early return
  React.useEffect(() => {
    if (!schema && doctype && coworker?.getSchema) {
      coworker.getSchema(doctype).then(setSchema);
    }
  }, [doctype]);

  const timersRef = React.useRef({});

  // Derive these before useMemo - safe even if schema is null
  const behavior = schema ? coworker.getBehavior(schema, doc) : null;
  const interactionConfig = coworker._config.fieldInteractionConfig;
  const profile = interactionConfig.profiles[interactionConfig.activeProfile];

  const handlers = React.useMemo(() => {
    if (!behavior) return {};

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

        case "workflow_action":
          if (coworker.controller?.save) {
            coworker.controller.save(run);
            console.log(`✅ Button action: ${fieldname}`);
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
            config.debounce,
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
            config.debounce,
          );
        } else {
          perform();
        }
      },

      onButtonClick: (fieldname, value) => {
        const config = profile.onButtonClick;
        if (!config?.enabled) return;
        const perform = () => executeAction(config.action, fieldname, value);
        if (config.debounce > 0) {
          clearTimeout(timersRef.current[`onButtonClick_${fieldname}`]);
          timersRef.current[`onButtonClick_${fieldname}`] = setTimeout(
            perform,
            config.debounce,
          );
        } else {
          perform();
        }
      },
    };
  }, [run, behavior, profile]);

  // ✅ Early return AFTER all hooks
  if (!schema) {
    return React.createElement(
      "div",
      { className: CWStyles.alert.warning },
      "Loading schema...",
    );
  }

  const titleField = schema.title_field || "name";
  const title = doc[titleField] || doc.name || "New";
  const fields = schema.fields || [];

  const implementedTypes = [
    "Data",
    "Text",
    "Long Text",
    "Password",
    "Read Only",
    "Int",
    "Float",
    "Currency",
    "Percent",
    "Check",
    "Date",
    "Datetime",
    "Time",
    "Select",
    "Link",
    "Text Editor",
    "Code",
    "HTML",
    "Section Break",
    "Column Break",
    "Tab Break",
    "Button",
    "Attach Image",
  ];

  const getDocstatusBadge = (docstatus) => {
    if (docstatus === 0) return { className: CWStyles.badge.warning, label: "Draft" };
    if (docstatus === 1) return { className: CWStyles.badge.success, label: "Submitted" };
    if (docstatus === 2) return { className: CWStyles.badge.danger, label: "Cancelled" };
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

      behavior.ui.badge
        ? React.createElement(
            "span",
            { className: CWStyles.badge[behavior.ui.badge.class] },
            behavior.ui.badge.label,
          )
        : schema.is_submittable && doc.docstatus !== undefined
          ? (() => {
              const badge = getDocstatusBadge(doc.docstatus);
              return badge
                ? React.createElement(
                    "span",
                    { className: badge.className },
                    badge.label,
                  )
                : null;
            })()
          : null,
    ),

    // Fields grid
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        },
      },

      fields
        .filter((field) => {
          if (!implementedTypes.includes(field.fieldtype)) return false;
          return evaluateDependsOn(field.depends_on, doc);
        })
        .map((field) => {
          const fieldType = coworker._config.fieldTypes[field.fieldtype];
          if (!fieldType) {
            console.warn(`Field type not in config: ${field.fieldtype}`);
            return null;
          }

          // Skip Column Break
          if (field.fieldtype === "Column Break") {
            return null;
          }

          // Layout fields (full width)
          if (fieldType.layoutOnly && fieldType.render) {
            return React.createElement(
              "div",
              {
                key: field.fieldname,
                style: { gridColumn: "1 / -1" },
              },
              // ✅ Single call, with handlers
              fieldType.render({ field, handlers, run }),
            );
          }

          // Regular fields
          const fieldError = run._validationErrors?.find(
            (err) => err.field === field.fieldname,
          )?.message;

          const fieldValue = doc[field.fieldname];
          const safeValue =
            fieldValue === null || fieldValue === undefined
              ? field.fieldtype === "Check"
                ? false
                : ""
              : fieldValue;

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
                field.label,
              ),

            // ✅ Use React.createElement with FieldRenderer - fixes hooks violation
            fieldType.customComponent && fieldType.render
              ? fieldType.render({ field, value: safeValue, handlers, run })
              : React.createElement(coworker.FieldRenderer, {
                  key: field.fieldname,
                  field,
                  value: safeValue,
                  handlers,
                  run,
                }),

            fieldError &&
              React.createElement(
                "span",
                { className: CWStyles.text.danger },
                fieldError,
              ),
          );
        }),
    ),
  );
};

// ============================================================
// UNIVERSAL RECORD HANDLER
// ============================================================

coworker.onRecordClick = function (record, context = {}) {
  return this.run({
    operation: "takeone",
    doctype: record.doctype,
    query: { where: { name: record.name } },
    options: { render: true },
    ...context,
  });
};

// ============================================================
// MAIN GRID COMPONENT
// ============================================================

const MainGrid = ({ run }) => {
  const data = run.target?.data;
  const validData = data?.filter((row) => row != null) || [];

  if (validData.length === 0) {
    return React.createElement(
      "div",
      { className: CWStyles.alert.info },
      "No records found",
    );
  }

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
          "New",
        ),
      ),
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
                key,
              ),
            ),
          ),
        ),
        React.createElement(
          "tbody",
          {},
          validData.map((row, i) =>
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
                  String(row?.[key] ?? ""),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
};

// ============================================================
// MAIN CHAT COMPONENT
// ============================================================

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
      const aiMessage = { role: "ai", content: response.target.message };
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
          msg.content,
        ),
      ),
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
        "Send",
      ),
    ),
  );
};

// ============================================================
// ERROR CONSOLE COMPONENT
// ============================================================

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
        run.error.stack,
      ),
  );
};

// ============================================================
// REGISTER COMPONENTS
// ============================================================
globalThis.MainForm = MainForm;
globalThis.MainGrid = MainGrid;
globalThis.MainChat = MainChat;
globalThis.ErrorConsole = ErrorConsole;
globalThis.RecordLink = RecordLink;

console.log("✅ Coworker components loaded");
