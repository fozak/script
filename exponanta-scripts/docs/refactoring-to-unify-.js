/* Goal is to streamline artchitectre from proposed 
Yes. If sideEffects write to run_doc.input (same discipline as adapters), then both paths converge cleanly:
SIGNAL PATH:
  _handleSignal validates transition (FSM-specific, stays separate)
  _execTransition fires sideEffects → sideEffects write to run_doc.input
  mark _state[signal] = '1' in run_doc.input._state
  operation = 'update' (record always exists for signals)
  → fall through to shared Phase B

DIRECT PATH (File/Task):
  resolveKey + enrich → write to run_doc.input
  lookup → branch → operation = 'update' or 'create'
  → fall through to shared Phase B

SHARED PHASE B:
  checkpoint: _logChanges → _mergeInput → _clearInput
  _preflight (onCreate if 'create', onWrite always)
  _stripVirtual
  persist (db adapters)
This unifies both dispatch mechanisms at the boundary: whatever wrote to input — whether sideEffects or adapters — gets the same checkpoint + persist treatment.
The controller becomes:
javascript// 1. dispatch — selects WHAT writes to input (different tables, same contract)
if (signal) {
  await _handleSignal(run_doc)  // validates + fires sideEffects → writes input, sets operation='update'
} else {
  await resolveKeyAndLookup(run_doc)  // sets operation = 'update'|'create'
  await enrich(run_doc)              // adapters write input
}

// 2. shared checkpoint + persist — identical for both paths
await CW._logChanges(run_doc)
CW._mergeInput(run_doc)
CW._clearInput(run_doc)
CW._preflight(run_doc)
if (!run_doc.error) {
  CW._stripVirtual(run_doc)
  await persist(run_doc)  // db adapters per operation
}/*


/* Proposed I to the controleller process. accumulate data from non-main db sourices in run_doc.source.schema_doctype like   
1) run_doc.source.fs.data similar to target 
the order of accumulation is defined by config 

doctypeAdapters: {
      File: {
    select: 'fs',
    update: ['fs', 'dispatch', 'pocketbase'],
    create: ['fs', 'pocketbase'],
    delete: 'fs',
  },

 2) after complete, push it it input 
 3) logChanges
 4) merge ->etc 

Proposed III to data storage, adapters, schema

1) Move to CW.Schema[Adap] for doctype = Adanow adapters stored in js, no field definitions of its outcomes etc. 
*/
{

    "actions": [],
    "allow_rename": 1,
    "autoname": "field:name",
    "doctype": "Schema",
    "field_order": [
      "schema_name",
      "config",
      "functions",
      "permissions",
      "is_default"
    ],
    "fields": [
      { schema_name: 
        reqd: 1,
        in_list_view: 1,
        ...
      },
      {
      
      {
        "description": "Static or runtime configuration for the adapter",
        "fieldname": "config",
        "fieldtype": "Code",
        "label": "Adapter Configuration",
        "options": "JSON"
      },
      {
        "description": "Callable adapter functions or operation mappings",
        "fieldname": "functions",
        "fieldtype": "Code",
        "label": "Adapter Functions",
        "options": "JSON"
      },
     
      }
    ],
    "icon": "fa fa-bookmark",
    "idx": 1,
    "index_web_pages_for_search": 1,
    "permissions": [
      {
        "create": 1,
        "delete": 1,
        "email": 1,
        "print": 1,
        "read": 1,
        "report": 1,
        "role": "System Manager",
        "share": 1,
        "write": 1
      }
    ],
    "quick_entry": 1,
    "schema_name": "xlsx",
    "title_field": "schema_name",
  },