
coworker._config = {
  _resolveOperation: {
    mapping: { read: "select", insert: "create", delete: "remove" },
    inputField: "operation",
    outputField: "operation"
  },
  _resolveComponent: {
    mapping: { list: "MainGrid", form: "MainForm", chat: "MainChat" },
    inputField: "view",
    outputField: "component"
  },
  _resolveDoctype: {
    mapping: { user: "UserDoc", order: "OrderDoc" },
    inputField: "doctype",
    outputField: "doctype"
  }
};


coworker._resolveAll = function(op) {
  const resolved = {};
  
  // === RESOLVE OPERATION + SOURCE/TARGET DOCTYPES ===
  // Get config mappings
  const opAliases = this._config?._resolveOperation?.mapping || {};
  const dtAliases = this._config?._resolveDoctype?.mapping || {};
  
  // Resolve operation
  resolved.operation = opAliases[op.operation?.toLowerCase()] || op.operation;
  
  // Resolve source/target doctypes using one-liner logic
  const [source_raw, target_raw] = op.from 
    ? [op.from, op.doctype] 
    : ["create","update"].includes(resolved.operation) 
      ? [null, op.doctype] 
      : [op.doctype, null];
  
  resolved.source_doctype = source_raw ? (dtAliases[source_raw?.toLowerCase()] || source_raw) : null;
  resolved.target_doctype = target_raw ? (dtAliases[target_raw?.toLowerCase()] || target_raw) : null;
  
  // === RESOLVE OTHER FIELDS VIA CONFIG ===
  for (const resolverName in this._config) {
    if (resolverName.startsWith("_resolve") && resolverName !== "_resolveOperation" && resolverName !== "_resolveDoctype") {
      const resolver = this._config[resolverName];
      const inputValue = op[resolver.inputField];
      
      if (inputValue !== undefined) {
        const mapping = resolver.mapping || {};
        resolved[resolver.outputField] = mapping[inputValue?.toLowerCase()] || inputValue;
      }
    }
  }
  
  // === PASS THROUGH NON-RESOLVED FIELDS ===
  resolved.owner = op.owner || "system";
  
  return resolved;
};


// no persistence 
coworker.run = async function(op) {
  const start = Date.now();
  
  // === VALIDATION ===
  if (!op?.operation) {
    return this._failEarly("operation is required", start);
  }
  
  // === RESOLVE ALL FIELDS VIA CONFIG ===
  const resolved = this._resolveAll(op);
  
  // === BUILD RUN_DOC (unified context) ===
  const run_doc = {
    // Frappe standard fields
    doctype: "Run",
    name: generateId("run"),
    creation: start,
    modified: start,
    modified_by: resolved.owner || "system",
    docstatus: 0,
    owner: resolved.owner || "system",
    
    // Operation definition
    operation: resolved.operation,
    operation_original: op.operation,
    source_doctype: resolved.source_doctype,
    target_doctype: resolved.target_doctype,
    
    // Data flow
    input: op.input || {},
    output: null,
    
    // Execution state
    status: "pending",
    success: false,
    error: null,
    duration: 0,
    
    // Hierarchy
    parent_run_id: op.options?.parentRunId || null,
    child_run_ids: [],
    
    // Flow context
    flow_id: op.flow_id || null,
    flow_template: op.flow_template || null,
    step_id: op.step_id || null,
    step_title: op.step_title || null,
    
    // Authorization
    agent: op.agent || null,
    
    // Options
    options: op.options || {},
    
    // Runtime helpers (placeholder for JSON)
    child: null
  };
  
  // === STEP 1: RUNNING ===
  run_doc.status = "running";
  CoworkerState._updateFromRun(run_doc);
  
  // === INJECT CHILD FACTORY ===
  run_doc.child = (cfg) => this.run({ 
    ...cfg, 
    options: { ...cfg.options, parentRunId: run_doc.name } 
  });
  
  // === EXECUTE ===
  try {
    const result = await this._exec(run_doc);
    
    run_doc.output = result.output || result;
    run_doc.success = result.success === true;
    run_doc.error = result.error || null;
    
    // === STEP 2: COMPLETED ===
    run_doc.status = "completed";
    run_doc.duration = Date.now() - start;
    run_doc.modified = Date.now();
    CoworkerState._updateFromRun(run_doc);
    
  } catch (err) {
    run_doc.success = false;
    run_doc.status = "failed";
    run_doc.error = {
      message: err.message,
      code: err.code || `${run_doc.operation?.toUpperCase() || 'OPERATION'}_FAILED`,
      stack: this.getConfig("debug") ? err.stack : undefined
    };
    
    // === STEP 3: FAILED ===
    run_doc.duration = Date.now() - start;
    run_doc.modified = Date.now();
    CoworkerState._updateFromRun(run_doc);
  }
  
  // === RENDER (top-level runs only) ===
  if (!run_doc.parent_run_id) {
    CoworkerState._renderFromRun(run_doc);
  }
  
  return run_doc;
};

// === UNTRACKED EXECUTION ROUTER ===
coworker._exec = async function(run_doc) {
  const handler = this._handlers[run_doc.operation];
  
  if (!handler) {
    throw new Error(`Unknown operation: ${run_doc.operation}`);
  }
  
  return await handler.call(this, run_doc);
};

// === HELPER: EARLY FAILURE ===
coworker._failEarly = function(message, start) {
  return {
    doctype: "Run",
    name: generateId("run"),
    creation: start,
    status: "failed",
    success: false,
    error: { 
      message, 
      code: "VALIDATION_FAILED" 
    },
    duration: Date.now() - start
  };
};

//-------------------------------------
// === EXAMPLE RUN DOC STRUCTURE === 
const run_doc = {
  // === FRAPPE STANDARD FIELDS ===
  doctype: "Run",
  name: "run_123",                  // Primary key
  creation: 1234567890,
  modified: 1234567890,
  modified_by: "user_1",
  docstatus: 0,                     // 0=draft, 1=submitted, 2=cancelled
  owner: "system",
  
  // === OPERATION DEFINITION ===
  operation: "select",
  operation_original: "read",
  source_doctype: "Task",
  target_doctype: null,
  
  // === DATA FLOW ===
  input: {...},
  output: {...},
  
  // === EXECUTION STATE ===
  status: "running",
  success: false,
  error: {...},
  duration: 0,
  
  // === HIERARCHY ===
  parent_run_id: null,
  child_run_ids: [],
  
  // === FLOW CONTEXT ===
  flow_id: null,
  flow_template: null,
  step_id: null,
  step_title: null,
  
  // === AUTHORIZATION ===
  agent: null,
  
  // === OPTIONS ===
  options: {...},
  
  // === RUNTIME HELPERS (JSON-safe placeholder) ===
  child: null                       // Replaced with function at runtime
};



resolver 

// === FULLY DECLARATIVE CONFIG ===
coworker._config = {
  _resolveOperation: {
    mapping: { read: "select", insert: "create", delete: "remove" },
    inputField: "operation",
    outputField: "operation"
  },
  _resolveComponent: {
    mapping: { list: "MainGrid", form: "MainForm", chat: "MainChat" },
    inputField: "view",
    outputField: "component"
  },
  _resolveDoctype: {
    mapping: { user: "UserDoc", order: "OrderDoc" },
    inputField: "doctype",
    outputField: "doctype"
  }
};

// === GENERIC RESOLVER ===
coworker._resolveAll = function(op) {
  const resolved = {};

  for (const resolverName in this._config) {
    if (resolverName.startsWith("_resolve")) {
      const resolver = this._config[resolverName];
      const inputValue = op[resolver.inputField];
      
      if (inputValue !== undefined) {
        const mapping = resolver.mapping || {};
        resolved[resolver.outputField] = mapping[inputValue?.toLowerCase()] || inputValue;
      }
    }
  }

  // Pass through non-resolved fields
  resolved.input = op.input || null;
  resolved.options = op.options || {};
  resolved.owner = op.owner || "system";
  
  return resolved;
};

// === MINIMAL RUN ===
coworker.run = async function(op) {
  if (!op?.operation) return this._failEarly("operation is required");
  
  const resolved = this._resolveAll(op);
  
  const run_doc = {
    id: generateId("run"),
    timestamp: Date.now(),
    ...resolved,  // All resolved fields
    output: null,
    success: false,
    error: null,
    status: "running",
    parent_run_id: op.options?.parentRunId || null,
    duration: 0
  };
  
  // Checkpoints & execution
  // ...
  
  return run_doc;
}; 



Summary of Top Changes Made
1. Pure Component Pattern - Components Receive run Object
Before: Components subscribed to CoworkerState and read current state
After: Components are pure functions that receive the entire run object as props
javascript// Old: pb.components.MainGrid = function({ doctype }) { /* subscribe to state */ }
// New: pb.components.MainGrid = function(run) { /* use run.output, run.doctype_target */ }
2. Single Universal Renderer - CoworkerState._renderFromRun()
Before: Each component managed its own navigation and data fetching
After: One centralized render function called after every run completion

Reads run.view to determine which component to render
Maps view → component → container via CONFIG
Passes entire run object to component

3. Render Only Top-Level Runs
Before: Every run would potentially trigger UI updates
After: Child runs (steps in flows) don't render - only parent runs do
javascriptif (!run.parent_run_id) {
  CoworkerState._renderFromRun(run);
}
4. Three Checkpoint Pattern Maintained
Kept explicit checkpoints for observability:

START - status: "running", output: null
SUCCESS - status: "completed", output: result
ERROR - status: "failed", error: details

Each checkpoint persists to DB AND updates in-memory state
5. Config-Driven View Mapping
Before: Hardcoded component rendering logic
After: Schema-driven via CONFIG object
javascriptVIEW_TO_COMPONENT: { 'list': 'MainGrid', 'form': 'MainForm', 'chat': 'MainChat' }
COMPONENT_TO_CONTAINER: { 'MainGrid': 'main_container', 'MainChat': 'right_pane' }
```

## 6. **Removed Component Subscriptions**
**Before:** Components had `useEffect` with `CoworkerState.subscribe()`
**After:** Components are stateless - no subscriptions, no side effects (except for special cases like streaming chat)

## 7. **Direct Data Flow**
```
coworker.run() executes
    ↓
Updates CoworkerState (for observability)
    ↓
Renders component with run data directly
    ↓
Component extracts what it needs from run.output
No round-trip through state - just direct pass of run object to component.
Core Principle: coworker.run() is the orchestrator. Components are dumb renderers. Config defines the mapping. State is for observability, not for component communication.
// ============================================================================
// COWORKER.RUN - Universal execution engine with checkpoints
// ============================================================================

coworker.run = async function(operation, doctype, args = {}, options = {}) {
  const runId = generateId('run');
  const parentId = options.parentId || null;
  
  // Prepare run data
  const run_doc = {
    id: runId,
    name: runId,
    parent_run_id: parentId,
    operation,
    doctype_target: doctype,
    input: args,
    output: null,
    status: "running", //pending | running | completed | failed | cancelled
    success: false,
    timestamp: Date.now(),
    duration: 0,
    view: options.view || null,   //poteniall move to top of run() function as arg
    component: options.component || null, // ADDED potentially move to top . Source doctype.configuration.VIEW_TO_COMPONENT.list.MainGrid
    owner: options.owner || "system",
    agent: options.agent || null,
    child_run_ids: [],
    step_id: options.stepId || null, //Used in flow_templates
    step_title: options.stepTitle || null, //Used in flow_templates
    error: null
  };
  
  // === CHECKPOINT 1: START (running state) ===
  await coworker.run("create", "Run", { data: run_doc });     
  // AFTER ABOVE  run.has.runId,operation,doctype,args,options.view->component_is_defined.like.MainGrid. Run and operation is NOT completed, data is NOT fetched
  CoworkerState._updateFromRun(run); //this kept as state set of runs 
  
  // Child factory for spawning sub-runs - this is called and NOT blocking parent run
  const child = (op, dt, arg = {}, opt = {}) => {
    return coworker.run(op, dt, arg, { 
      ...opt, 
      parentId: opt.parentId || runId 
    });
  };
  
  // Execute handler
  try {
    const result = await handlers[operation]?.(doctype, args, options, child);
    run.output = result || null;
    run.success = true;
    run.status = "completed";   // Here we have full run completed including data needed for component rendering
    
    // === CHECKPOINT 2: SUCCESS ===
    run.duration = Date.now() - run.timestamp;
    await coworker.run("update", "Run", { data: run });
    CoworkerState._updateFromRun(run);
    
  } catch (error) {
    run.output = null;
    run.success = false;
    run.status = "failed";
    run.error = { 
      message: error.message, 
      stack: error.stack 
    };
    
    // === CHECKPOINT 3: ERROR ===
    run.duration = Date.now() - run.timestamp;
    await coworker.run("update", "Run", { data: run });
    CoworkerState._updateFromRun(run);
  }
  
return run;
};

// ============================================================================
// COWORKER STATE - Run history and state management
// ============================================================================

const CoworkerState = {
  runHistory: [],
  
  _updateFromRun(run) {
    // Add or update run in history
    const existingIndex = this.runHistory.findIndex(r => r.id === run.id);
    
    if (existingIndex >= 0) {
      this.runHistory[existingIndex] = run;
    } else {
      this.runHistory.push(run);
    }
    
    // Keep only last 100 runs
    if (this.runHistory.length > 100) {
      this.runHistory.shift();
    }
  },
  
  _renderFromRun(run) {
    // Determine view type
    const view = run.view || this._deriveView(run);
    
    // Get component mapping from config
    const componentName = CONFIG.VIEW_TO_COMPONENT[view];
    const containerName = CONFIG.COMPONENT_TO_CONTAINER[componentName];
    
    if (!componentName) {
      console.error(`No component mapping for view: ${view}`);
      return;
    }
    
    const Component = pb.components[componentName];
    
    if (!Component) {
      console.error(`Component not found: ${componentName}`);
      return;
    }
    
    const container = document.getElementById(containerName);
    
    if (!container) {
      console.error(`Container not found: ${containerName}`);
      return;
    }
    
    // Render component with run
    ReactDOM.render(
      React.createElement(Component, run),
      container
    );
  },
  
  _deriveView(run) {
    // Default view derivation logic
    if (run.operation === 'select') {
      return run.output?.data?.length > 1 ? 'list' : 'form';
    }
    if (run.operation === 'dialog') {
      return 'dialog';
    }
    if (run.operation === 'chat') {
      return 'chat';
    }
    return 'form'; // Default fallback
  }
};

// ============================================================================
// CONFIG - View to component mapping (loaded once, cached)
// ============================================================================

const CONFIG = {
  VIEW_TO_COMPONENT: {
    'list': 'MainGrid',
    'form': 'MainForm',
    'chat': 'MainChat',
    'dialog': 'DialogOverlay'
  },
  
  COMPONENT_TO_CONTAINER: {
    'MainGrid': 'main_container',
    'MainForm': 'main_container',
    'MainChat': 'right_pane',
    'DialogOverlay': 'dialog_container'
  }
};

// Load config from database on startup (if needed)
async function loadConfig() {
  try {
    const result = await pb._dbQuery({
      doctype: 'configuration',
      where: { name: 'views' },
      take: 1
    });
    
    if (result?.[0]?.data) {
      Object.assign(CONFIG, result[0].data);
    }
  } catch (error) {
    console.warn('Using default CONFIG, could not load from DB:', error);
  }
}

// Call on app initialization
// loadConfig();


coworker.run = async function(operation, doctype, args = {}, options = {}) {
  const runId = generateId('run');
  const parentId = options.parentId || null;
  //checkpoint create a new Run doc for this.run, set status = running
const ...await coworker.run({
  operation: "create",
  doctype: "Run",       // must specify the doctype
  data: {
    where: { name: generateID() },
    status: running              // optional: only fetch 1 record <set all data>
  }
  
}); 


  // 1. ONE child factory is created per run. It is a lightweight closure.
  const child = (op, dt, arg = {}, opt = {}) => {
    // 3. When called, it invokes the master run function, injecting the parentId.
    return coworker.run(op, dt, arg, {
      ...opt,
      parentId: opt.parentId || runId // The original runId is captured here.
    });
  };
  
  // 2. The handler for the CURRENT operation receives this factory.
  const result = await handlers[operation](doctype, args, options, child);
  
  //3 checkpoint error handing + status update of current run 

  //4. checkpoint update Run doc for this.run, set status = completed / failed


  // Return value is simple and consistent.
  return { result, runId, parentId };
};

//doctype: Run`
{
  "doctype": "Run",
  "id": "run_a7k3m9p2x5w8q1z",
  "parent_run_id": "run_b4n6r8t1y3u5v7c",
  "child_run_ids": [],
  "chain_id": "chain_x1y2z3a4b5c6d7e",
  "flow_run_id": "run_d2f5h7j9k0m3p6s",
  "flow_template_id": "flow_template_7xd9ml0i3xzfps6",
  "step_id": "step_e8g1i4k7m0n2q5t",
  "step_title": "select_open_tasks",
  "operation": "select",
  "doctype_target": "Task",
  "from": "Task",
  "into": null,
  "template": null,
  "view": "list",
  "args": {},
  "input": {},
  "output": {},
  "status": "completed",   pending | running | completed | failed | cancelled
  "success": true,
  "error": null,
  "timestamp": 1699620000000,
  "duration": 145,
  "owner": "user_1234",
  "agent": "coworker_browser",
  "options": {}
}