//Step 1: Define Actions explicitly (outside Frappe)
//Create your own canonical action model:

Action = {
  name: "submit",
  declared_by: "schema",
  requires: [
    "docstatus == 0",        // stored in particular document Task     "is_submittable == 1"   //<-came from schema of doctype like Task, before its enriched 
    "is_submittable == 1"   //<-came from schema of doctype like Task, before its enriched 
                            // 2 issues here: the schema carries the data is_submittable == 1 (where)
  ],
  permission: "submit",
  effects: ["docstatus = 1"]
}