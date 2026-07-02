

const MainForm = ({ run }) => {
  const [schema, setSchema] = React.useState(run?.target?.schema || null);

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

  // Whitelist
  const implementedTypes = [
    "Data", "Text", "Long Text", "Password", "Read Only",
    "Int", "Float", "Currency", "Percent",
    "Check",
    "Date", "Datetime", "Time",
    "Select", "Link",
    "Text Editor", "Code", "HTML",
    "Section Break", "Column Break", "Tab Break",
    "Button", "Attach Image",
  ];

  // Get behavior from config
  const behavior = coworker.getBehavior(schema, doc);      //WE ARE HE<--

  // Get interaction profile
  const interactionConfig = coworker._config.fieldInteractionConfig;
  const profile = interactionConfig.profiles[interactionConfig.activeProfile];

  // Debounce timers
  const timersRef = React.useRef({});

  // Config-driven handlers
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