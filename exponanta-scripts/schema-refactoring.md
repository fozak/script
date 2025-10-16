// Schema DocType structure
{
  name: "Schema-a6v04us71cjkpp7",
  _schema_doctype: "Task",
  docstatus: 1,  // 0=Draft, 1=Submitted(Active), 2=Cancelled
  creation: "2025-01-15T09:00:00Z",
  modified: "2025-01-15T10:00:00Z",
  owner: "Administrator",
  fields: [...]
}

// Query active schema
const schema = await this.query("Schema", {
  where: {
    _schema_doctype: "Task",
    docstatus: 1  // Only submitted = active
  },
  take: 1
});

// Task binds to submitted schema
{
  name: "Task-vwdkmsdv34t46",
  _schema_name: "Schema-vdjsuvfd1242",
  docstatus: 0,  // Task itself can be draft/submitted
  // ... business fields
}

const tasks = await pb.query("Task", {
  where: {
    _schema_name: "Schema-a6v04us71cjkpp7"
  },
});

Benefits of This Approach 🎉

Natural Lifecycle Management

Draft schema (docstatus=0) = Work in progress, not used yet
Submitted schema (docstatus=1) = Active, used for new documents
Cancelled schema (docstatus=2) = Deprecated, historical reference only


Immutability Built-in

Submitted schemas can't be edited (Frappe prevents it)
Must cancel + create amendment to change
Perfect for schema versioning!


No Deletion Needed

All history preserved forever
Cancelled schemas stay for documents that reference them
Audit trail automatically maintained


Standard Frappe Behavior

Users already understand draft/submit/cancel
UI automatically shows status
Validation rules built-in




Two Remaining Challenges
Challenge #1: Multiple Submitted Schemas Problem ⚠️
The Problem:
javascript// Scenario: You have TWO submitted schemas for Task
Schema-v1: { docstatus: 1, _schema_doctype: "Task" }
Schema-v2: { docstatus: 1, _schema_doctype: "Task" }

// This query returns... which one? 🤔
const schema = await this.query("Schema", {
  where: {
    _schema_doctype: "Task",
    docstatus: 1
  },
  take: 1  // Takes first, but which is "first"?
});
Why Multiple Submitted Schemas Exist:

Version Overlap Period

javascript   // Day 1: Schema-v1 submitted (docstatus=1)
   // Day 100: Schema-v2 submitted (docstatus=1)
   // You forgot to cancel v1! Now both are submitted.

