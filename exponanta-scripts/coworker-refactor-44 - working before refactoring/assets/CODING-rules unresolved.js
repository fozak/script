The final set:
Pipeline functions — (run_doc) only
javascriptCW.controller(run_doc)

CW._preflight(run_doc)
CW._mergeInput(run_doc)
CW._resolveInput(run_doc)
CW._expand(run_doc)  //TODO: not implemented
CW.refetch(run_doc)  // TODO: 

// path-aware functions — (run_doc, path)

CW._getChildRun(run_doc, path) 
/* CW._getChildRun(run_doc, path)2:17 PMClaude responded: The approach was:The approach was:
javascriptrun_doc = CW._getChildRun(run_doc, path) || run_doc;
First line of every function. Reassign run_doc to the child run if path present. After that line — function works with run_doc directly, no awareness of whether it's parent or child.
path = field.fieldname. Absent = work with current run_doc. Present = resolve child run and reassign.
So functions don't take path as a separate argument in the pipeline — they take run_doc and let the caller resolve the right run before calling:
javascript// caller resolves
run_doc = CW._getChildRun(run_doc, field.fieldname) || run_doc;
// then calls pipeline function normally
CW.controller(run_doc);*/
CW._expand(run_doc, path)       // path optional
CW.search(run_doc, term)        // term not path but same pattern

//Grid action functions — (run_doc, row)
javascriptCW.onRowClick(run_doc, row)
CW.onRowAction(run_doc, row, btn)
CW.toggleSelected(run_doc, row.name)
Mutation functions — (run_doc, patch)
javascriptCW._merge(run_doc, patch)
Component props — ({ run_doc, field })
javascriptFieldRenderer({ run_doc, field })
FieldLink({ run_doc, field })
FieldTable({ run_doc, field })   // UniversalGrid
MainForm({ run_doc })
UniversalGrid({ run_doc, field })
The rule:

pipeline → (run_doc)
path/child context → (run_doc, path)
grid actions → (run_doc, row) or (run_doc, row, btn)
components → { run_doc, field? }

row is a full record object — not just row.name — because functions need more than just the name (onRowAction needs row for FSM button context).