🎯 Core Concept
Every UI action → config-defined trigger → run() invocation
User interacts with UI element
  ↓
Component calls: coworker.handleUITrigger(triggerKey, context)
  ↓
Config defines: operation + parameters
  ↓
Handler builds params and calls: coworker.run(params)

📊 Config Structure
javascriptcoworker._config.uiTriggers = {
  
  // ====================================
  // MAINGRID TRIGGERS
  // ====================================
  
  'MainGrid.onRowClick': {
    buildRunParams: (ctx) => ({
      operation: 'takeone',
      source_doctype: ctx.parentRun.source_doctype,
      query: { where: { name: ctx.record.name }},
      parent_run_id: ctx.parentRun.name,
      options: { render: true }
    })
  },
  
  'MainGrid.onCellEdit': {
    buildRunParams: (ctx) => ({
      operation: 'update',
      source_doctype: ctx.parentRun.source_doctype,
      input: { [ctx.field.fieldname]: ctx.value },
      query: { where: { name: ctx.record.name }},
      parent_run_id: ctx.parentRun.name,
      options: { render: false }
    })
  },
  
  'MainGrid.onNewButton': {
    buildRunParams: (ctx) => ({
      operation: 'create',
      target_doctype: ctx.parentRun.source_doctype,
      parent_run_id: ctx.parentRun.name,
      options: { render: true }
    })
  },
  
  // ====================================
  // MAINFORM TRIGGERS
  // ====================================
  
  'MainForm.onFieldChange': {
    buildRunParams: (ctx) => ({
      operation: 'update',
      source_doctype: ctx.parentRun.source_doctype,
      input: { [ctx.field.fieldname]: ctx.value },
      query: { where: { name: ctx.parentRun.doc.name }},
      parent_run_id: ctx.parentRun.name,
      options: { 
        render: false,
        draft: true
      }
    })
  },
  
  'MainForm.onSaveButton': {
    buildRunParams: (ctx) => ({
      operation: 'update',
      source_doctype: ctx.parentRun.source_doctype,
      input: ctx.parentRun.input.data,  // All accumulated changes
      query: { where: { name: ctx.parentRun.doc.name }},
      parent_run_id: ctx.parentRun.name,
      options: { render: true }
    })
  },
  
  'MainForm.onDeleteButton': {
    buildRunParams: (ctx) => ({
      operation: 'delete',
      source_doctype: ctx.parentRun.source_doctype,
      query: { where: { name: ctx.parentRun.doc.name }},
      parent_run_id: ctx.parentRun.name,
      options: { render: true }
    })
  },
  
  'MainForm.onSubmitButton': {
    buildRunParams: (ctx) => ({
      operation: 'submit',
      source_doctype: ctx.parentRun.source_doctype,
      query: { where: { name: ctx.parentRun.doc.name }},
      parent_run_id: ctx.parentRun.name,
      options: { render: true }
    })
  },
  
  'MainForm.onCancelButton': {
    buildRunParams: (ctx) => ({
      operation: 'cancel',
      source_doctype: ctx.parentRun.source_doctype,
      query: { where: { name: ctx.parentRun.doc.name }},
      parent_run_id: ctx.parentRun.name,
      options: { render: true }
    })
  },
  
  // ====================================
  // MAINCHAT TRIGGERS
  // ====================================
  
  'MainChat.onSendMessage': {
    buildRunParams: (ctx) => ({
      operation: 'ai_chat',
      input: { message: ctx.message },
      parent_run_id: ctx.parentRun.name,
      options: { render: false }
    })
  }
}

🔧 Generic Handler (Add Once)
javascriptcoworker.handleUITrigger = function(triggerKey, context) {
  const trigger = this._config.uiTriggers[triggerKey];
  
  if (!trigger) {
    throw new Error(`Unknown UI trigger: ${triggerKey}`);
  }
  
  const params = trigger.buildRunParams(context);
  return this.run(params);
};

📊 Context Objects by Container
MainGrid Context
javascript{
  record: { name: 'CUST-001', ... },  // Row data
  parentRun: run,                      // Grid's run
  field: { fieldname: '...' },        // For cell edit
  value: 'new value'                   // For cell edit
}
MainForm Context
javascript{
  parentRun: run,                      // Form's run
  field: { fieldname: '...' },        // For field change
  value: 'new value'                   // For field change
}
MainChat Context
javascript{
  parentRun: run,                      // Chat's run
  message: 'user message text'
}

🎯 Component Changes
Components Become Minimal
javascript// Instead of:
onClick: () => coworker.onRecordClick(record, context)

// Now:
onClick: () => coworker.handleUITrigger('MainGrid.onRowClick', { record, parentRun })
No Business Logic in Components

RecordLink: 4 lines
Field components: Just call handleUITrigger
All logic in config


✅ Benefits
AspectValueCentralizedAll UI behaviors in one config fileDiscoverableSee all triggers at a glanceTestableTest config independently of UIFlexibleChange operations without touching componentsConsistentSame pattern everywhereParent contextAlways preserved via parent_run_id

🚀 What Gets Removed
javascript// DELETE ALL THESE:
coworker.onRecordClick = function(record, context) { ... }
// Any other onClick/onChange handler methods
// Business logic in components

🎯 Summary
Pattern:

Component fires trigger with context
Config maps trigger to operation
Handler builds params
run() executes

Result:

Zero business logic in UI components
All behavior defined in config
Consistent run() invocation pattern
Full parent context chain preserved