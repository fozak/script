// ============================================================
// COWORKER COMPONENTS - React Components
// ============================================================

// ============================================================
// UNIVERSAL RECORD LINK
// ============================================================
const RecordLink = ({ record, children, context = {}, as = 'div', ...props }) => {
  return React.createElement(as, {
    ...props,
    onClick: () => coworker.onRecordClick(record, context),
    style: { cursor: 'pointer', ...props.style }
  }, children);
};

// ============================================================
// FIELD COMPONENTS
// ============================================================

const FieldData = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('input', {
      type: 'text',
      className: CWStyles.field.input,
      value: value || '',
      readOnly: field.read_only,
      placeholder: field.placeholder
    })
  );
};

const FieldText = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('textarea', {
      className: CWStyles.field.textarea,
      value: value || '',
      readOnly: field.read_only,
      rows: 3
    })
  );
};

const FieldLongText = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('textarea', {
      className: CWStyles.field.textarea,
      value: value || '',
      readOnly: field.read_only,
      rows: 6
    })
  );
};

const FieldInt = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('input', {
      type: 'number',
      className: CWStyles.field.input,
      value: value || 0,
      readOnly: field.read_only
    })
  );
};

const FieldFloat = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('input', {
      type: 'number',
      step: '0.01',
      className: CWStyles.field.input,
      value: value || 0,
      readOnly: field.read_only
    })
  );
};

const FieldCurrency = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('input', {
      type: 'number',
      step: '0.01',
      className: CWStyles.field.input,
      value: value || 0,
      readOnly: field.read_only
    })
  );
};

const FieldCheck = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('input', {
      type: 'checkbox',
      checked: value || false,
      disabled: field.read_only
    })
  );
};

const FieldSelect = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('select', {
      className: CWStyles.field.select,
      value: value || '',
      disabled: field.read_only
    },
      (field.options || '').split('\n').map((opt, i) =>
        React.createElement('option', { key: i, value: opt }, opt)
      )
    )
  );
};

const FieldLink = ({ field, run, value }) => {
  const [options, setOptions] = React.useState([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState(value || '');
  
  const loadOptions = async () => {
    console.log('FieldLink: Loading options for', field.options);
    
    const childRun = await run.child({
      operation: 'select',
      doctype: field.options,
      input: { take: 50 }
    });
    
    console.log('FieldLink: Got options', childRun.output.data);
    setOptions(childRun.output.data);
    setIsOpen(true);
  };
  
  const handleSelect = (option) => {
    setSearchText(option.name);
    setIsOpen(false);
    
    if (!run.input) run.input = {};
    if (!run.input.data) run.input.data = {};
    run.input.data[field.fieldname] = option.name;
    
    console.log('FieldLink: Selected', option.name);
  };
  
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('div', { style: { position: 'relative' } },
      React.createElement('input', {
        type: 'text',
        className: CWStyles.field.input,
        value: searchText,
        onFocus: loadOptions,
        onChange: (e) => setSearchText(e.target.value),
        placeholder: `Select ${field.label}...`
      }),
      isOpen && React.createElement('div', {
        className: CWStyles.field.linkDropdown,
        style: { display: 'block' }
      },
        options.map(opt => 
          React.createElement('div', {
            key: opt.name,
            style: { padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' },
            onClick: () => handleSelect(opt),
            onMouseEnter: (e) => e.target.style.backgroundColor = '#f0f0f0',
            onMouseLeave: (e) => e.target.style.backgroundColor = 'white'
          }, opt.name)
        )
      )
    )
  );
};

const FieldDate = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('input', {
      type: 'date',
      className: CWStyles.field.input,
      value: value || '',
      readOnly: field.read_only
    })
  );
};

const FieldDatetime = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('input', {
      type: 'datetime-local',
      className: CWStyles.field.input,
      value: value || '',
      readOnly: field.read_only
    })
  );
};

const FieldTime = ({ field, run, value }) => {
  return React.createElement('div', { className: CWStyles.form.fieldWrapper },
    React.createElement('label', { className: CWStyles.form.label }, field.label),
    React.createElement('input', {
      type: 'time',
      className: CWStyles.field.input,
      value: value || '',
      readOnly: field.read_only
    })
  );
};

// ============================================================
// REGISTER FIELD COMPONENTS FIRST
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
  FieldTime
};

// ============================================================
// MAINFORM COMPONENT
// ============================================================
const MainForm = ({ run }) => {
  const schema = run.output?.schema;
  
  if (!schema) {
    return React.createElement('div', { className: CWStyles.alert.warning }, 
      'No schema available'
    );
  }
  
  const doc = run.output?.data?.[0] || {};
  
  const implementedTypes = [
    'Data', 'Text', 'Long Text', 'Int', 'Float', 'Currency',
    'Check', 'Select', 'Link', 'Date', 'Datetime', 'Time'
  ];
  
  return React.createElement('div', { className: CWStyles.form.wrapper },
    React.createElement('div', { 
      className: `${CWStyles.display.flex} ${CWStyles.justify.between} ${CWStyles.spacing.mb3}` 
    },
      React.createElement('h5', null, doc.name || `New ${schema.name}`)
    ),
    
    schema.fields
      .filter(field => implementedTypes.includes(field.fieldtype))
      .map(field => {
        const componentName = `Field${field.fieldtype.replace(/ /g, '')}`;
        const Component = window.components[componentName];
        
        return React.createElement(Component, {
          key: field.fieldname,
          field: field,
          run: run,
          value: doc[field.fieldname]
        });
      })
  );
};

// ============================================================
// MAIN GRID
// ============================================================


// ============================================================
// MAIN CHAT
// ============================================================
const MainChat = ({ run }) => {
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  
  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    const response = await run.child({
      operation: 'ai_chat',
      input: { message: input }
    });
    
    if (response.success) {
      const aiMessage = { role: 'ai', content: response.output.message };
      setMessages(prev => [...prev, aiMessage]);
    }
  };
  
  return React.createElement('div', { className: CWStyles.chat.wrapper },
    React.createElement('div', { className: CWStyles.chat.messages },
      messages.map((msg, i) =>
        React.createElement('div', { 
          key: i, 
          className: msg.role === 'user' 
            ? CWStyles.chat.messageUser 
            : CWStyles.chat.messageAI
        }, msg.content)
      )
    ),
    React.createElement('div', { className: CWStyles.chat.inputWrapper },
      React.createElement('input', {
        type: 'text',
        className: CWStyles.chat.input,
        value: input,
        onChange: (e) => setInput(e.target.value),
        onKeyPress: (e) => e.key === 'Enter' && handleSend(),
        placeholder: 'Type a message...'
      }),
      React.createElement('button', {
        className: CWStyles.button.primary,
        onClick: handleSend
      }, 'Send')
    )
  );
};

// ============================================================
// ERROR CONSOLE
// ============================================================
const ErrorConsole = ({ run }) => {
  if (!run?.error) return null;
  
  return React.createElement('div', { className: CWStyles.alert.danger },
    React.createElement('h4', {}, 'Error: ' + (run.error.code || 'UNKNOWN')),
    React.createElement('p', {}, run.error.message),
    run.error.stack && React.createElement('pre', { 
      className: CWStyles.text.monospace 
    }, run.error.stack)
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