

// this is convenient but not 100% clear

run({
operation: "update",
from: "Task",
view: "form",
query: { where: { name: "TASK-2025-00003" } },  // DOES QUERY means FIRST? 
input : { status: "Completed" }, // when appy
options: { adapter: "pocketbase" }, // what load, when load, for WHAT use
})

// why it worked before - linear CRUD operations 

/* initial logic
1) 
* If NO  preflight doctype like options: { adapter: "pocketbase" } 
* AND operation: "update", is DEFAUL operation name (from confiig)
* THEN _execute default CRUD pipeline

2) If preflight doctype exists like like options: { adapter: "pocketbase" } 
* then check if operation: "update" === functions in preflight document so
* THEN execute custom pipeline

3) regargless of operation the syntax from: "Task", view: "form",
query: { where: { name: "TASK-2025-00003" } }, means that separate EXTRACTION should happen
by using CRUD pipiline + default db adapter to get original and place it into run_doc.target.data[0]



