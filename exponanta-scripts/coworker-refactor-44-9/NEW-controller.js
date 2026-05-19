run_doc.input = {
  // 1. Meta channel — controls run_doc top-level fields
  ".operation": "update",
  ".view":      "form",

  // 2. FSM channel — controls document state transitions  
  "_state": { "0.0_1": "" },

  // 3. Data channel — controls document fields
  "subject":    "New Task",
  "status":     "In Progress"
}
/*
run_doc.operation = CRUD operation on target (in memory):

select → populate target from source
update → modify target
create → initialize target
delete → mark target as deleted

Target is primary. DB is secondary — just a persistence layer for target.
The three channels are orthogonal:
ChannelControlsrun_doc.operationhow target is populated/initializedFSM signalstate transitions on target._stateData fieldsfield values on target
All three operate on target.data[0]. DB write is just a side effect of any of them when persist conditions are met.
_dispatchRun → calls _handlers[operation] → operates on target
_dispatchFSM → operates on target._state
_dispatchData → operates on target fields
None of them "decide" to write to DB. The persist step is a separate concern that happens after any of them modify target.

*/
CW.controller = async function (run_doc) {
  run_doc.status = "running";
  run_doc.error = null;
  
  
  CW._resolveInput(run_doc);

mergeInput(run_doc); //merging all three into target

dispatchRun(); // dispatch .fields of run
dispatchFSM();  // dispatch _state
dispatchData(); // dispatch the rest

}
