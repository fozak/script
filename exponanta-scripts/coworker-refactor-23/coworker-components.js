// ============================================================
// COWORKER COMPONENTS - React Components coworker-components.js
// ============================================================

// ============================================================
// UNIVERSAL RECORD LINK
// ============================================================
const RecordLink = ({ record, children, context = {} }) => {
  return React.createElement('div', {
    onClick: () => coworker.onRecordClick(record, context),
    style: { cursor: 'pointer' }
  }, children);
};

// ============================================================
// MAIN FORM
// ============================================================
const MainForm = ({ run }) => {
  if (!run?.output?.data?.[0]) {
    return React.createElement('div', { className: CWStyles.alert.warning }, 
      'No document data available'
    );
  }
  
  if (!run?.output?.schema) {
    return React.createElement('div', { className: CWStyles.alert.danger }, 
      'Schema not found'
    );
  }
  
  const doc = run.output.data[0];
  const schema = run.output.schema;
  
  try {
    const renderConfig = parseLayout(schema.field_order, schema.fields);
    const enriched = coworker._enrichConfig(renderConfig, doc, run.source_doctype);
    return coworker._renderFromConfig(enriched);
  } catch (error) {
    console.error('MainForm render error:', error);
    return React.createElement('div', { className: CWStyles.alert.danger }, 
      `Error rendering form: ${error.message}`
    );
  }
};

// ============================================================
// MAIN GRID
// ============================================================
const MainGrid = ({ run }) => {
  if (!run?.output?.data) {
    return React.createElement('div', { className: CWStyles.alert.warning }, 
      'No data available'
    );
  }
  
  const data = run.output.data;
  const schema = run.output.schema || {};
  
  return React.createElement('div', { className: CWStyles.grid.wrapper },
    React.createElement('div', { className: CWStyles.grid.header },
      React.createElement('h2', {}, run.source_doctype || 'List'),
      React.createElement('div', { className: CWStyles.grid.toolbar },
        React.createElement('button', { className: CWStyles.button.primary }, 'New')
      )
    ),
    React.createElement('div', { className: CWStyles.grid.body },
      React.createElement('table', { className: CWStyles.table.base + ' ' + CWStyles.table.striped },
        React.createElement('thead', {},
          React.createElement('tr', {},
            Object.keys(data[0] || {}).map(key =>
              React.createElement('th', { key: key }, key)
            )
          )
        ),
        React.createElement('tbody', {},
          data.map((row, i) =>
            React.createElement(RecordLink, { key: i, record: row },
              React.createElement('tr', { className: CWStyles.grid.row },
                Object.values(row).map((val, j) =>
                  React.createElement('td', { key: j, className: CWStyles.grid.cell },
                    String(val || '')
                  )
                )
              )
            )
          )
        )
      )
    )
  );
};

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
    
    // Send to AI via coworker
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
// FIELD COMPONENTS
// ============================================================

const FieldData = ({ field, value, docname, doctype }) => {
  return React.createElement('input', {
    type: 'text',
    className: CWStyles.field.input,
    value: value || '',
    readOnly: field.read_only,
    placeholder: field.placeholder
  });
};

const FieldText = ({ field, value }) => {
  return React.createElement('textarea', {
    className: CWStyles.field.textarea,
    value: value || '',
    readOnly: field.read_only,
    rows: 3
  });
};

const FieldLongText = ({ field, value }) => {
  return React.createElement('textarea', {
    className: CWStyles.field.textarea,
    value: value || '',
    readOnly: field.read_only,
    rows: 6
  });
};

const FieldInt = ({ field, value }) => {
  return React.createElement('input', {
    type: 'number',
    className: CWStyles.field.input,
    value: value || 0,
    readOnly: field.read_only
  });
};

const FieldFloat = ({ field, value }) => {
  return React.createElement('input', {
    type: 'number',
    step: '0.01',
    className: CWStyles.field.input,
    value: value || 0,
    readOnly: field.read_only
  });
};

const FieldCurrency = ({ field, value }) => {
  return React.createElement('input', {
    type: 'number',
    step: '0.01',
    className: CWStyles.field.input,
    value: value || 0,
    readOnly: field.read_only
  });
};

const FieldCheck = ({ field, value }) => {
  return React.createElement('input', {
    type: 'checkbox',
    checked: value || false,
    disabled: field.read_only
  });
};

const FieldSelect = ({ field, value }) => {
  return React.createElement('select', {
    className: CWStyles.field.select,
    value: value || '',
    disabled: field.read_only
  },
    (field.options || '').split('\n').map((opt, i) =>
      React.createElement('option', { key: i, value: opt }, opt)
    )
  );
};

const FieldLink = ({ field, value, doctype }) => {
  return React.createElement('div', { className: CWStyles.field.link },
    React.createElement('input', {
      type: 'text',
      className: CWStyles.field.linkInput,
      value: value || '',
      readOnly: field.read_only,
      placeholder: `Select ${field.options || 'Document'}...`
    })
  );
};

const FieldDate = ({ field, value }) => {
  return React.createElement('input', {
    type: 'date',
    className: CWStyles.field.input,
    value: value || '',
    readOnly: field.read_only
  });
};

const FieldDatetime = ({ field, value }) => {
  return React.createElement('input', {
    type: 'datetime-local',
    className: CWStyles.field.input,
    value: value || '',
    readOnly: field.read_only
  });
};

const FieldTime = ({ field, value }) => {
  return React.createElement('input', {
    type: 'time',
    className: CWStyles.field.input,
    value: value || '',
    readOnly: field.read_only
  });
};

// Register all components globally
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