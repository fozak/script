store all data 1 pocketbase collection - items

- items.id - pocketbase ids
- items.schema (json) - schema in json using (like task.json). then items.schema.name = Task
- items.code (text) - code that reads schema, displays UI and saving result into items.data
- items.data (json) - data, generated from schema on client side and saves
- items.children [itemid1, itemid2] - establishing relationships in between items
- items.users - [userid1, userid2] - pocketbase users collection ids



<!--issues-->
- items.schema (issue IS-missing universal data) (json) is document specific, and lacks  universal non-document spesific like assigned_to, files_attached, workflow related and tagging etc
- 

<!--data.users section --> 
- 
Great question — since you're already thinking deeply about architecture, here's a grounded recommendation based on how PocketBase works **today (as of 2025)** and your use case.

---

## 🧠 Recommendation: **Hybrid Approach (Lean PB Relations + Rich `data.users`)**

| Layer                     | Role                                                      |
| ------------------------- | --------------------------------------------------------- |
| `items.users` (relation)  | **Access gate** — who can fetch/see the item              |
| `items.data.users` (JSON) | **Role + permission logic** — what they can do in the app |

---

## ✅ Why This Hybrid Approach Is Ideal for PocketBase

| Reason                  | Explanation                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 🔒 **Native filtering** | PocketBase lets you filter by relation: `users ~ "user123"` — fast and enforced server-side                        |
| 🧠 **Flexible logic**   | Your `data.users` can support roles, timestamps, custom fields, invitations, etc.                                  |
| ✍️ **Easier UI**        | You can build admin/collaborator interfaces from `data.users`, not just a flat ID list                             |
| ⚙️ **Scoped access**    | PB rules can restrict writes (only owners can write), while your app handles collaboration nuance                  |
| 🧪 **Scalable**         | You can later move to a dedicated `user_roles` collection if things get complex, but you don’t have to start there |

---

## ✅ What to Avoid

| Approach                                                | Why Not                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Only using `users` relation                             | No room for roles/permissions, and you'll need hacks for UI or logic                                |
| Only using `data.users`                                 | You lose PB's built-in filtering and security layers — all access control must be in your app       |
| Complex `users[]` + per-role fields (`owner`, `editor`) | You'll duplicate the logic and make updates hard to maintain                                        |
| Building a full ACL system in a separate collection     | Overkill unless you’re doing enterprise-level multi-tenant auth — more boilerplate, harder to debug |

---

## 🛠 What You Should Do

### 🗃 Your `items` Schema (PocketBase)

| Field   | Type                    | Notes                                               |
| ------- | ----------------------- | --------------------------------------------------- |
| `users` | `Relation[]` to `users` | Determines **who can access** the item              |
| `data`  | `JSON`                  | Contains `data.users` for **roles and permissions** |

```json
"data": {
  "title": "Form A",
  "users": [
    { "id": "user123", "role": "owner", "access": "write" },
    { "id": "user456", "role": "collaborator", "access": "read" }
  ]
}
```

---

### ✅ Server-Side Rules Example

```sql
@request.auth.id != "" && users ~ @request.auth.id
```

> Only allow access if the current user is listed in `users` relation.

---

### 🧩 Bonus: Optional Metadata on Relation

If needed later, you can introduce `data.user_metadata`, like:

```json
"user_metadata": {
  "user123": { "invitedAt": "2025-07-08", "status": "active" },
  "user456": { "invitedAt": "2025-07-09", "status": "pending" }
}
```

---

## 🚦 Final Recommendation

Stick to:

* ✅ `users` relation: enforced by PocketBase (fast + secure)
* ✅ `data.users`: for role-based logic (flexible + future-proof)
* ❌ Don't try to cram roles into relation
* ❌ Avoid splitting roles into separate fields like `editorIds`, `viewerIds` — it doesn’t scale

---

If you’d like, I can give you:

* A PocketBase schema definition (JSON)
* A helper that syncs `data.users` → `users[]`
* Sample permission check code for client or hooks

Let me know which part you'd like to build next.




PocketBase collection 'code' 
js code stored in code like 
pb.collection('code').create({
  code: "console.log('code');",
  schema: { type: "form", fields: ["question"] },
  data: { question: "What is your name?" }
});

schema is Frappe json: 
{
 "actions": [],
 "allow_import": 1,
 "autoname": "TASK-.YYYY.-.#####",
 "creation": "2013-01-29 19:25:50",
 "doctype": "DocType",
 "document_type": "Setup",
 "engine": "InnoDB",
 "field_order": [
  "subject",
  "project",
  "issue",
  "type",
  "color",
  "is_group",
  "is_template",
  "column_break0",
  "status",
  "priority",
  "task_weight",
  "parent_task",
  "completed_by",
  "completed_on",
  "sb_timeline",
  "exp_start_date",
  "expected_time",
  "start",
  "column_break_11",
  "exp_end_date",
  "progress",
  "duration",
  "is_milestone",
  "sb_details",
  "description",
  "sb_depends_on",
  "depends_on",
  "depends_on_tasks",
  "sb_actual",
  "act_start_date",
  "actual_time",
  "column_break_15",
  "act_end_date",
  "sb_costing",
  "total_costing_amount",
  "column_break_20",
  "total_billing_amount",
  "sb_more_info",
  "review_date",
  "closing_date",
  "column_break_22",
  "department",
  "company",
  "lft",
  "rgt",
  "old_parent",
  "template_task"
 ],
 "fields": [
  {
   "allow_in_quick_entry": 1,
   "fieldname": "subject",
   "fieldtype": "Data",
   "in_global_search": 1,
   "in_standard_filter": 1,
   "label": "Subject",
   "reqd": 1,
   "search_index": 1
  },
  {
   "allow_in_quick_entry": 1,
   "bold": 1,
   "fieldname": "project",
   "fieldtype": "Link",
   "in_global_search": 1,
   "in_list_view": 1,
   "in_standard_filter": 1,
   "label": "Project",
   "oldfieldname": "project",
   "oldfieldtype": "Link",
   "options": "Project",
   "remember_last_selected_value": 1,
   "search_index": 1
  },
  {
   "fieldname": "issue",
   "fieldtype": "Link",
   "label": "Issue",
   "options": "Issue"
  },
  {
   "fieldname": "type",
   "fieldtype": "Link",
   "label": "Type",
   "options": "Task Type"
  },
  {
   "bold": 1,
   "default": "0",
   "fieldname": "is_group",
   "fieldtype": "Check",
   "in_list_view": 1,
   "label": "Is Group"
  },
  {
   "fieldname": "column_break0",
   "fieldtype": "Column Break",
   "oldfieldtype": "Column Break",
   "print_width": "50%",
   "width": "50%"
  },
  {
   "bold": 1,
   "fieldname": "status",
   "fieldtype": "Select",
   "in_list_view": 1,
   "in_standard_filter": 1,
   "label": "Status",
   "no_copy": 1,
   "oldfieldname": "status",
   "oldfieldtype": "Select",
   "options": "Open\nWorking\nPending Review\nOverdue\nTemplate\nCompleted\nCancelled"
  },
  {
   "fieldname": "priority",
   "fieldtype": "Select",
   "in_list_view": 1,
   "in_standard_filter": 1,
   "label": "Priority",
   "oldfieldname": "priority",
   "oldfieldtype": "Select",
   "options": "Low\nMedium\nHigh\nUrgent",
   "search_index": 1
  },
  {
   "fieldname": "color",
   "fieldtype": "Color",
   "label": "Color"
  },
  {
   "bold": 1,
   "fieldname": "parent_task",
   "fieldtype": "Link",
   "ignore_user_permissions": 1,
   "label": "Parent Task",
   "options": "Task",
   "search_index": 1
  },
  {
   "collapsible": 1,
   "collapsible_depends_on": "exp_start_date",
   "fieldname": "sb_timeline",
   "fieldtype": "Section Break",
   "label": "Timeline"
  },
  {
   "bold": 1,
   "fieldname": "exp_start_date",
   "fieldtype": "Datetime",
   "label": "Expected Start Date",
   "oldfieldname": "exp_start_date",
   "oldfieldtype": "Date"
  },
  {
   "default": "0",
   "fieldname": "expected_time",
   "fieldtype": "Float",
   "label": "Expected Time (in hours)",
   "oldfieldname": "exp_total_hrs",
   "oldfieldtype": "Data"
  },
  {
   "fetch_from": "type.weight",
   "fieldname": "task_weight",
   "fieldtype": "Float",
   "label": "Weight"
  },
  {
   "fieldname": "column_break_11",
   "fieldtype": "Column Break"
  },
  {
   "bold": 1,
   "fieldname": "exp_end_date",
   "fieldtype": "Datetime",
   "label": "Expected End Date",
   "oldfieldname": "exp_end_date",
   "oldfieldtype": "Date",
   "search_index": 1
  },
  {
   "fieldname": "progress",
   "fieldtype": "Percent",
   "label": "% Progress",
   "no_copy": 1
  },
  {
   "default": "0",
   "fieldname": "is_milestone",
   "fieldtype": "Check",
   "in_list_view": 1,
   "label": "Is Milestone"
  },
  {
   "fieldname": "sb_details",
   "fieldtype": "Section Break",
   "label": "Details",
   "oldfieldtype": "Section Break"
  },
  {
   "fieldname": "description",
   "fieldtype": "Text Editor",
   "label": "Task Description",
   "oldfieldname": "description",
   "oldfieldtype": "Text Editor",
   "print_width": "300px",
   "width": "300px"
  },
  {
   "fieldname": "sb_depends_on",
   "fieldtype": "Section Break",
   "label": "Dependencies",
   "oldfieldtype": "Section Break"
  },
  {
   "fieldname": "depends_on",
   "fieldtype": "Table",
   "label": "Dependent Tasks",
   "options": "Task Depends On"
  },
  {
   "fieldname": "depends_on_tasks",
   "fieldtype": "Code",
   "hidden": 1,
   "label": "Depends on Tasks",
   "read_only": 1
  },
  {
   "fieldname": "sb_actual",
   "fieldtype": "Section Break",
   "oldfieldtype": "Column Break",
   "print_width": "50%",
   "width": "50%"
  },
  {
   "fieldname": "act_start_date",
   "fieldtype": "Date",
   "label": "Actual Start Date (via Timesheet)",
   "oldfieldname": "act_start_date",
   "oldfieldtype": "Date",
   "read_only": 1
  },
  {
   "fieldname": "actual_time",
   "fieldtype": "Float",
   "label": "Actual Time in Hours (via Timesheet)",
   "read_only": 1
  },
  {
   "fieldname": "column_break_15",
   "fieldtype": "Column Break"
  },
  {
   "fieldname": "act_end_date",
   "fieldtype": "Date",
   "label": "Actual End Date (via Timesheet)",
   "oldfieldname": "act_end_date",
   "oldfieldtype": "Date",
   "read_only": 1
  },
  {
   "collapsible": 1,
   "fieldname": "sb_costing",
   "fieldtype": "Section Break",
   "label": "Costing"
  },
  {
   "fieldname": "total_costing_amount",
   "fieldtype": "Currency",
   "label": "Total Costing Amount (via Timesheet)",
   "oldfieldname": "actual_budget",
   "oldfieldtype": "Currency",
   "options": "Company:company:default_currency",
   "read_only": 1
  },
  {
   "fieldname": "column_break_20",
   "fieldtype": "Column Break"
  },
  {
   "fieldname": "total_billing_amount",
   "fieldtype": "Currency",
   "label": "Total Billable Amount (via Timesheet)",
   "read_only": 1
  },
  {
   "collapsible": 1,
   "fieldname": "sb_more_info",
   "fieldtype": "Section Break",
   "label": "More Info"
  },
  {
   "depends_on": "eval:doc.status == \"Closed\" || doc.status == \"Pending Review\"",
   "fieldname": "review_date",
   "fieldtype": "Date",
   "label": "Review Date",
   "oldfieldname": "review_date",
   "oldfieldtype": "Date"
  },
  {
   "depends_on": "eval:doc.status == \"Closed\"",
   "fieldname": "closing_date",
   "fieldtype": "Date",
   "label": "Closing Date",
   "oldfieldname": "closing_date",
   "oldfieldtype": "Date"
  },
  {
   "fieldname": "column_break_22",
   "fieldtype": "Column Break"
  },
  {
   "fieldname": "department",
   "fieldtype": "Link",
   "label": "Department",
   "options": "Department"
  },
  {
   "fetch_from": "project.company",
   "fieldname": "company",
   "fieldtype": "Link",
   "label": "Company",
   "options": "Company",
   "remember_last_selected_value": 1
  },
  {
   "fieldname": "lft",
   "fieldtype": "Int",
   "hidden": 1,
   "label": "lft",
   "read_only": 1
  },
  {
   "fieldname": "rgt",
   "fieldtype": "Int",
   "hidden": 1,
   "label": "rgt",
   "read_only": 1
  },
  {
   "fieldname": "old_parent",
   "fieldtype": "Data",
   "hidden": 1,
   "ignore_user_permissions": 1,
   "label": "Old Parent",
   "read_only": 1
  },
  {
   "depends_on": "eval: doc.status == \"Completed\"",
   "fieldname": "completed_by",
   "fieldtype": "Link",
   "label": "Completed By",
   "no_copy": 1,
   "options": "User"
  },
  {
   "default": "0",
   "fieldname": "is_template",
   "fieldtype": "Check",
   "label": "Is Template"
  },
  {
   "depends_on": "is_template",
   "fieldname": "start",
   "fieldtype": "Int",
   "label": "Begin On (Days)"
  },
  {
   "depends_on": "is_template",
   "fieldname": "duration",
   "fieldtype": "Int",
   "label": "Duration (Days)"
  },
  {
   "depends_on": "eval: doc.status == \"Completed\"",
   "fieldname": "completed_on",
   "fieldtype": "Date",
   "label": "Completed On",
   "mandatory_depends_on": "eval: doc.status == \"Completed\""
  },
  {
   "fieldname": "template_task",
   "fieldtype": "Data",
   "hidden": 1,
   "label": "Template Task"
  }
 ],
 "icon": "fa fa-check",
 "idx": 1,
 "is_tree": 1,
 "links": [],
 "max_attachments": 5,
 "modified": "2024-05-24 12:36:12.214577",
 "modified_by": "Administrator",
 "module": "Projects",
 "name": "Task",
 "naming_rule": "Expression (old style)",
 "nsm_parent_field": "parent_task",
 "owner": "Administrator",
 "permissions": [
  {
   "create": 1,
   "delete": 1,
   "email": 1,
   "print": 1,
   "read": 1,
   "report": 1,
   "role": "Projects User",
   "share": 1,
   "write": 1
  }
 ],
 "quick_entry": 1,
 "search_fields": "subject",
 "show_name_in_global_search": 1,
 "show_preview_popup": 1,
 "sort_field": "creation",
 "sort_order": "DESC",
 "states": [],
 "timeline_field": "project",
 "title_field": "subject",
 "track_seen": 1
}

execution on client like:
currentRecord = await pb.collection('code').getOne(recordId); 
eval(currentRecord.code);

so architecure is 
1) user saving widget code in currentRecord.code (mostly React code)
2) user saving schema in currentRecord.schema
3) browser renders it, after user click on Save button, it goes to currentRecord.data

currentRecord.data is 
