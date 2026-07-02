// Check the Adapter run that exists
const adapterRun = CoworkerState.runs['run2977a6vps05p'];
console.log('Existing Adapter run operation_key:', adapterRun.operation_key);

// Parse and compare
const existingOp = JSON.parse(adapterRun.operation_key);
console.log('Existing op:', existingOp);

// Your query
const bootstrapOp = {
  operation: 'select',
  from: 'Adapter',
  view: 'form',
  query: { where: { adapter_name: 'bootstrap_fsm' } },
  options: { adapter: 'pocketbase' }
};
console.log('Looking for op:', bootstrapOp);

// Key difference
console.log('Existing has query?', !!existingOp.query);
console.log('Existing has adapter option?', existingOp.options?.adapter);
console.log('Existing has render option?', existingOp.options?.render);
VM9353:3 Existing Adapter run operation_key: {"operation":"select","from":"Adapter","view":"form","options":{"render":true}}
VM9353:7 Existing op: {operation: 'select', from: 'Adapter', view: 'form', options: {…}}from: "Adapter"operation: "select"options: {render: true}view: "form"[[Prototype]]: Object
VM9353:17 Looking for op: {operation: 'select', from: 'Adapter', view: 'form', query: {…}, options: {…}}from: "Adapter"operation: "select"options: {adapter: 'pocketbase'}query: where: {adapter_name: 'bootstrap_fsm'}[[Prototype]]: Objectview: "form"[[Prototype]]: Object
VM9353:20 Existing has query? false
VM9353:21 Existing has adapter option? undefined
VM9353:22 Existing has render option? true
undefined
// 1. Check if the new run is in both indexes
const newRunName = 'rungbr9wau17bzn';
console.log('Run by name:', CoworkerState.runs[newRunName]);

// 2. Test lookup by operation_key
const bootstrapOp = {
  operation: 'select',
  from: 'Adapter',
  view: 'form',
  query: { where: { adapter_name: 'bootstrap_fsm' } },
  options: { adapter: 'pocketbase' }
};

const runByOpKey = CoworkerState.findByOperation(bootstrapOp);
console.log('Run by operation:', runByOpKey);

// 3. Verify it's the same
console.log('Same run?', CoworkerState.runs[newRunName] === runByOpKey);

// 4. Check all current Adapter runs
console.log('\nAll Adapter runs:');
Object.values(CoworkerState.runs).forEach(run => {
  try {
    const op = JSON.parse(run.operation_key);
    if (op.from === 'Adapter') {
      console.log('  -', run.name, '→', op.query?.where?.adapter_name || 'no adapter_name', op.options);
    }
  } catch(e) {}
});
VM9357:3 Run by name: {doctype: 'Run', name: 'rungbr9wau17bzn', creation: 1769011540522, modified: 1769011540749, operation_key: '{"operation":"select","from":"Adapter","view":"for…tstrap_fsm"}},"options":{"adapter":"pocketbase"}}', …}agent: nullchild: async (cfg) => {…}child_run_ids: []component: "MainGrid"container: "main_container"creation: 1769011540522docstatus: 0doctype: "Run"duration: 227error: nullflow_id: nullflow_template: nullinput: {}modified: 1769011540749modified_by: "system"name: "rungbr9wau17bzn"operation: "select"operation_key: "{\"operation\":\"select\",\"from\":\"Adapter\",\"view\":\"form\",\"query\":{\"where\":{\"adapter_name\":\"bootstrap_fsm\"}},\"options\":{\"adapter\":\"pocketbase\"}}"operation_original: "select"options: {render: true, adapter: 'pocketbase', draft: false}output: {data: Array(1), schema: {…}, meta: undefined, viewConfig: {…}}owner: "system"parent_run_id: nullquery: {where: {…}}source_doctype: "Adapter"status: "completed"step_id: nullstep_title: nullsuccess: truetarget_doctype: nullview: "form"doc: (...)get doc: ƒ get()[[Prototype]]: Object
VM9357:15 Run by operation: {doctype: 'Run', name: 'rungbr9wau17bzn', creation: 1769011540522, modified: 1769011540749, operation_key: '{"operation":"select","from":"Adapter","view":"for…tstrap_fsm"}},"options":{"adapter":"pocketbase"}}', …}agent: nullchild: async (cfg) => {…}child_run_ids: []component: "MainGrid"container: "main_container"creation: 1769011540522docstatus: 0doctype: "Run"duration: 227error: nullflow_id: nullflow_template: nullinput: {}modified: 1769011540749modified_by: "system"name: "rungbr9wau17bzn"operation: "select"operation_key: "{\"operation\":\"select\",\"from\":\"Adapter\",\"view\":\"form\",\"query\":{\"where\":{\"adapter_name\":\"bootstrap_fsm\"}},\"options\":{\"adapter\":\"pocketbase\"}}"operation_original: "select"options: {render: true, adapter: 'pocketbase', draft: false}output: {data: Array(1), schema: {…}, meta: undefined, viewConfig: {…}}owner: "system"parent_run_id: nullquery: {where: {…}}source_doctype: "Adapter"status: "completed"step_id: nullstep_title: nullsuccess: truetarget_doctype: nullview: "form"doc: (...)get doc: ƒ get()[[Prototype]]: Object
VM9357:18 Same run? true
VM9357:21 
All Adapter runs:
VM9357:26   - run2977a6vps05p → no adapter_name {render: true}
VM9357:26   - rungbr9wau17bzn → bootstrap_fsm {adapter: 'pocketbase'}
undefined
 Object.values(CoworkerState.runs).filter(r => r.success)
(5) [{…}, {…}, {…}, {…}, {…}]0: {doctype: 'Run', name: 'runq4to557l1if8', creation: 1769011251892, modified: 1769011252278, operation_key: '{"operation":"select","from":"Schema","view":"form","options":{"adapter":"pocketbase"}}', …}1: {doctype: 'Run', name: 'runir118lq3sn97', creation: 1769011251894, modified: 1769011252075, operation_key: '{"operation":"select","doctype":"Schema","query":{…s":{"includeSchema":false,"skipController":true}}', …}2: {doctype: 'Run', name: 'run2977a6vps05p', creation: 1769011252284, modified: 1769011252479, operation_key: '{"operation":"select","from":"Adapter","view":"form","options":{"render":true}}', …}3: {doctype: 'Run', name: 'runqc5e58td8h54', creation: 1769011252285, modified: 1769011252437, operation_key: '{"operation":"select","doctype":"Schema","query":{…s":{"includeSchema":false,"skipController":true}}', …}4: {doctype: 'Run', name: 'rungbr9wau17bzn', creation: 1769011540522, modified: 1769011540749, operation_key: '{"operation":"select","from":"Adapter","view":"for…tstrap_fsm"}},"options":{"adapter":"pocketbase"}}', …}length: 5[[Prototype]]: Array(0)
CoworkerState.runs[newRunName]
{doctype: 'Run', name: 'rungbr9wau17bzn', creation: 1769011540522, modified: 1769011540749, operation_key: '{"operation":"select","from":"Adapter","view":"for…tstrap_fsm"}},"options":{"adapter":"pocketbase"}}', …}agent: nullchild: async (cfg) => {…}child_run_ids: []component: "MainGrid"container: "main_container"creation: 1769011540522docstatus: 0doctype: "Run"duration: 227error: nullflow_id: nullflow_template: nullinput: {}modified: 1769011540749modified_by: "system"name: "rungbr9wau17bzn"operation: "select"operation_key: "{\"operation\":\"select\",\"from\":\"Adapter\",\"view\":\"form\",\"query\":{\"where\":{\"adapter_name\":\"bootstrap_fsm\"}},\"options\":{\"adapter\":\"pocketbase\"}}"operation_original: "select"options: {render: true, adapter: 'pocketbase', draft: false}output: {data: Array(1), schema: {…}, meta: undefined, viewConfig: {…}}owner: "system"parent_run_id: nullquery: {where: {…}}source_doctype: "Adapter"status: "completed"step_id: nullstep_title: nullsuccess: truetarget_doctype: nullview: "form"doc: (...)get doc: ƒ get()[[Prototype]]: Object
CoworkerState.runsByOpKey['{"operation":"select","from":"Adapter","view":"form","query":{"where":{"adapter_name":"bootstrap_fsm"}},"options":{"adapter":"pocketbase"}}']?.success