v2

await coworker.run({
  operation: 'run',
  children: [
    { id: 'emails', operation: 'select', doctype: 'Email' },
    { id: 'summary', operation: 'summarize', input: '{{emails.output}}' },
    
    // 1. CONDITIONAL: Skip if condition false
    { id: 'notify', operation: 'create', doctype: 'Notification', 
      if: '{{emails.output.data.length}} > 5' },
    
    // 2. PARALLEL: Run simultaneously (not sequential)
    { parallel: ['task1', 'task2'], operations: [
        { id: 'task1', operation: 'create', doctype: 'Task' },
        { id: 'task2', operation: 'update', doctype: 'Email' }
      ]
    },
    
    // 3. ERROR HANDLER: Fallback on failure
    { id: 'send', operation: 'send', onError: { operation: 'log' } }
  ]
});



v1

# Chaining Inside coworker-run.js

**Architecture**: Chaining logic built INTO coworker.run() using synthetic `operation: 'run'`

---

## 🎯 Core Concept

**Instead of external chain orchestration**, add chaining as a **built-in operation** in coworker-run.js:

```javascript
// User calls this:
await coworker.run({
  operation: 'run',  // ← Synthetic meta-operation
  children: [
    { operation: 'select', doctype: 'Email' },
    { operation: 'summarize', input: '{{prev.output}}' },
    { operation: 'create', doctype: 'Task', input: '{{prev.output}}' }
  ]
});

// coworker-run.js internally handles:
// - Sequential execution of children
// - Template resolution ({{prev.output}})
// - Parent/child linking
// - Unified state.runs storage
```

---

## 📊 How It Transforms coworker-run.js

### BEFORE (Basic CRUD Only)

```javascript
// coworker-run.js - BEFORE
coworker.run = async function(config) {
  const context = { id, operation, doctype, input, ... };
  
  // Route to handlers
  switch (context.operation) {
    case 'select':
      result = await this._handleSelect(context);
      break;
    case 'create':
      result = await this._handleCreate(context);
      break;
    // ... other CRUD operations
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
  
  context.status = 'completed';
  return context;
};
```

### AFTER (With Chaining Support)

```javascript
// coworker-run.js - AFTER
coworker.run = async function(config) {
  const context = { id, operation, doctype, input, ... };
  
  // ADD: Handle synthetic 'run' operation
  if (context.operation === 'run') {
    return await this._handleRunChain(context);
  }
  
  // Existing CRUD operations
  switch (context.operation) {
    case 'select':
      result = await this._handleSelect(context);
      break;
    case 'create':
      result = await this._handleCreate(context);
      break;
    // ... other operations
  }
  
  // ADD: Store ALL runs in state.runs (not just activeRuns)
  await this._storeRunInState(context);
  
  context.status = 'completed';
  return context;
};

// NEW: Chain orchestration handler
coworker._handleRunChain = async function(context) {
  const children = context.input?.children || [];
  const results = [];
  let parentRunId = context.id;
  
  // Store parent 'run' operation in state.runs
  await this._storeRunInState({
    ...context,
    status: 'running',
    childRunIds: []
  });
  
  // Execute each child sequentially
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    
    // 1. Resolve templates from previous results
    const resolved = this._resolveTemplates(child, results);
    
    // 2. Execute child through coworker.run() (recursive!)
    const childContext = await this.run({
      ...resolved,
      options: {
        ...resolved.options,
        parentRunId: parentRunId,
        stepIndex: i,
        chainId: context.chainId || context.id
      }
    });
    
    results.push(childContext);
    
    // 3. Update parent's childRunIds
    const parentRun = state.runs[parentRunId];
    if (parentRun) {
      parentRun.childRunIds.push(childContext.id);
    }
    
    // 4. Break on error
    if (!childContext.success) {
      context.error = childContext.error;
      break;
    }
    
    // 5. Set this child as parent for next child
    parentRunId = childContext.id;
  }
  
  // Update parent run status
  await this._storeRunInState({
    ...context,
    status: 'completed',
    output: {
      steps: results,
      success: results.every(r => r.success)
    }
  });
  
  return context;
};

// NEW: Template resolution
coworker._resolveTemplates = function(step, results) {
  const resolved = JSON.parse(JSON.stringify(step));
  const prev = results[results.length - 1];
  
  // Replace {{prev.output}} with actual value
  const replaceInObject = (obj, search, replace) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string' && obj[key].includes(search)) {
        obj[key] = obj[key].replace(search, JSON.stringify(replace));
      } else if (typeof obj[key] === 'object') {
        replaceInObject(obj[key], search, replace);
      }
    }
  };
  
  if (prev?.output) {
    replaceInObject(resolved, '{{prev.output}}', prev.output);
  }
  
  return resolved;
};

// NEW: Unified state storage
coworker._storeRunInState = async function(context) {
  if (!state.runs) state.runs = {};
  
  // Store in unified state.runs
  state.runs[context.id] = {
    id: context.id,
    operation: context.operation,
    doctype: context.doctype,
    status: context.status,
    created: context.timestamp,
    input: context.input,
    output: context.output,
    error: context.error,
    success: context.success,
    parentRunId: context.options?.parentRunId || null,
    childRunIds: context.childRunIds || [],
    chainId: context.options?.chainId || null,
    role: context.role || null,
    keepAlive: context.options?.keepAlive || false
  };
  
  // Notify state listeners
  CoworkerState.notify();
};
```

---

## 🔗 Complete Flow Example

### User Action
```javascript
await coworker.run({
  operation: 'run',
  children: [
    { 
      operation: 'message', 
      role: 'user', 
      input: { text: 'Create tasks from emails' } 
    },
    { 
      operation: 'select', 
      doctype: 'Email' 
    },
    { 
      operation: 'summarize', 
      input: '{{prev.output}}' 
    },
    { 
      operation: 'create', 
      doctype: 'Task', 
      input: '{{prev.output}}' 
    },
    { 
      operation: 'message', 
      role: 'assistant', 
      input: { text: 'Created tasks!' } 
    }
  ]
});
```

### Internal Execution Flow

```
1. coworker.run() called with operation: 'run'
   ↓
2. Detects 'run' → calls _handleRunChain()
   ↓
3. Stores parent run in state.runs:
   {
     id: 'run-parent-1',
     operation: 'run',
     status: 'running',
     childRunIds: []
   }
   ↓
4. Loop through children:
   
   4a. Child 0: message (user)
       → coworker.run({ operation: 'message', role: 'user', ... })
       → _handleDefault() emits 'coworker:run:message'
       → Stores in state.runs['run-child-1']
       → parent.childRunIds.push('run-child-1')
   
   4b. Child 1: select
       → coworker.run({ operation: 'select', doctype: 'Email', parentRunId: 'run-child-1' })
       → _handleSelect() executes query
       → Stores in state.runs['run-child-2'] with output: [...emails]
       → parent.childRunIds.push('run-child-2')
   
   4c. Child 2: summarize
       → _resolveTemplates() replaces '{{prev.output}}' with emails data
       → coworker.run({ operation: 'summarize', input: <emails>, parentRunId: 'run-child-2' })
       → Stores in state.runs['run-child-3'] with output: summary
       → parent.childRunIds.push('run-child-3')
   
   4d. Child 3: create
       → _resolveTemplates() replaces '{{prev.output}}' with summary
       → coworker.run({ operation: 'create', doctype: 'Task', input: <summary>, parentRunId: 'run-child-3' })
       → _handleCreate() creates tasks
       → Stores in state.runs['run-child-4']
       → parent.childRunIds.push('run-child-4')
   
   4e. Child 4: message (assistant)
       → coworker.run({ operation: 'message', role: 'assistant', parentRunId: 'run-child-4' })
       → Stores in state.runs['run-child-5']
       → parent.childRunIds.push('run-child-5')
   ↓
5. Update parent run:
   {
     id: 'run-parent-1',
     operation: 'run',
     status: 'completed',
     childRunIds: ['run-child-1', 'run-child-2', 'run-child-3', 'run-child-4', 'run-child-5'],
     output: { steps: [...results], success: true }
   }
   ↓
6. CoworkerState.notify() triggers UI update
   ↓
7. UI components render chain via activePipelines view
```

---

## 📊 State Structure After Execution

```javascript
state.runs = {
  // Parent 'run' operation
  'run-parent-1': {
    id: 'run-parent-1',
    operation: 'run',
    status: 'completed',
    childRunIds: ['run-child-1', 'run-child-2', 'run-child-3', 'run-child-4', 'run-child-5'],
    output: { steps: [...], success: true }
  },
  
  // Child 1: User message
  'run-child-1': {
    id: 'run-child-1',
    operation: 'message',
    role: 'user',
    status: 'completed',
    input: { text: 'Create tasks from emails' },
    parentRunId: 'run-parent-1',
    keepAlive: true
  },
  
  // Child 2: Select emails
  'run-child-2': {
    id: 'run-child-2',
    operation: 'select',
    doctype: 'Email',
    status: 'completed',
    output: { data: [...emails] },
    parentRunId: 'run-child-1',
    chainId: 'run-parent-1'
  },
  
  // Child 3: Summarize
  'run-child-3': {
    id: 'run-child-3',
    operation: 'summarize',
    status: 'completed',
    input: { data: [...emails] },
    output: { summary: '...' },
    parentRunId: 'run-child-2',
    chainId: 'run-parent-1'
  },
  
  // Child 4: Create tasks
  'run-child-4': {
    id: 'run-child-4',
    operation: 'create',
    doctype: 'Task',
    status: 'completed',
    input: { data: { summary: '...' } },
    output: { data: [...tasks] },
    parentRunId: 'run-child-3',
    chainId: 'run-parent-1'
  },
  
  // Child 5: AI response
  'run-child-5': {
    id: 'run-child-5',
    operation: 'message',
    role: 'assistant',
    status: 'completed',
    input: { text: 'Created tasks!' },
    parentRunId: 'run-child-4',
    keepAlive: true
  }
}
```

---

## ✅ Key Implementation Changes

### 1. Add 'run' Operation Handler

```javascript
// In coworker.run()
if (context.operation === 'run') {
  return await this._handleRunChain(context);
}
```

### 2. Implement _handleRunChain()

- Loops through children
- Resolves templates
- Recursively calls coworker.run()
- Tracks results
- Links parent/child relationships

### 3. Add _resolveTemplates()

- Replaces `{{prev.output}}` with actual data
- Supports nested object replacement
- Handles multiple template patterns

### 4. Add _storeRunInState()

- Stores ALL runs in state.runs
- Maintains unified schema
- Notifies state listeners
- Supports keepAlive flag

### 5. Modify Existing CRUD Handlers

- Call _storeRunInState() after execution
- Remove direct activeRuns manipulation
- Let unified storage handle all runs

---

## 🎨 Benefits

### 1. Single Entry Point Preserved
```javascript
// Everything still goes through coworker.run()
coworker.run({ operation: 'run', children: [...] })
coworker.run({ operation: 'select', doctype: 'Task' })
coworker.run({ operation: 'create', doctype: 'Email', ... })
```

### 2. No External State Manipulation
```javascript
// ❌ BEFORE: External manipulation
state.activeRuns[id] = { ... };

// ✅ AFTER: coworker-run.js handles it
await coworker.run({ ... });
```

### 3. Composable
```javascript
// Chains can contain chains
coworker.run({
  operation: 'run',
  children: [
    { operation: 'select', doctype: 'Email' },
    {
      operation: 'run',  // Nested chain!
      children: [
        { operation: 'summarize' },
        { operation: 'extract' }
      ]
    },
    { operation: 'create', doctype: 'Task' }
  ]
});
```

### 4. Event System Works
```javascript
before:run → parent 'run'
  ↓
  before:run → child 1
  after:run → child 1
  ↓
  before:run → child 2
  after:run → child 2
  ↓
after:run → parent 'run'
```

### 5. Unified State
```javascript
// All runs in state.runs
// - Parent 'run' operations
// - Child operations (CRUD, messages, etc.)
// - Linked via parentRunId/childRunIds
// - Queryable, filterable, debuggable
```

---

## 🚀 Usage Examples

### Simple Chain
```javascript
await coworker.run({
  operation: 'run',
  children: [
    { operation: 'select', doctype: 'Task' },
    { operation: 'update', doctype: 'Task', input: '{{prev.output}}' }
  ]
});
```

### Chat with AI Planning
```javascript
await coworker.run({
  operation: 'run',
  children: [
    { operation: 'message', role: 'user', input: { text: 'Hello' } },
    { operation: 'interpret', role: 'assistant', input: '{{prev.output}}' },
    { operation: 'message', role: 'assistant', input: '{{prev.output}}' }
  ]
});
```

### Multi-Step Data Pipeline
```javascript
await coworker.run({
  operation: 'run',
  children: [
    { operation: 'select', doctype: 'Email', input: { where: { unread: true } } },
    { operation: 'summarize', input: '{{prev.output}}' },
    { operation: 'create', doctype: 'Task', input: '{{prev.output}}' },
    { operation: 'update', doctype: 'Email', input: { data: { unread: false } } }
  ]
});
```

---

## 🎯 Summary

**What changes in coworker-run.js:**

1. **Add** `_handleRunChain()` - orchestrates child operations
2. **Add** `_resolveTemplates()` - handles {{prev.output}}
3. **Add** `_storeRunInState()` - unified state storage
4. **Modify** main `coworker.run()` - detect 'run' operation
5. **Modify** CRUD handlers - use _storeRunInState()

**What stays the same:**

- Single entry point (coworker.run())
- Event system (before:run, after:run)
- CRUD operations (select, create, update, delete)
- Schema fetching
- Query builders

**Result:**

- ✅ Chaining built into coworker.run()
- ✅ No external orchestration needed
- ✅ Unified state.runs structure
- ✅ Template resolution built-in
- ✅ Composable and recursive
- ✅ Respects architecture principles

**This transforms coworker.run() from a simple CRUD executor into a powerful operation orchestrator.**
