
v4, 
- Separate typed relationships from non-typed.
- intoduce Relationship universal doctype 
- keep bottom-top relationships
- filter out the existing Linked doctypes
- Add manually Relationship table to each schema (temp solution)


{
      "fieldname": "relationship_parent",
      "fieldtype": "Table",
      "in_list_view": 0,
      "label": "relationship Children",
      "options": "Relationship",
      "reqd": 1,
      "search_index": 1
    },

  Tested with Task schema - it works

v3 top-bottom
Typed vs non-typed 

so the pseudocode is to iterate through current document schema create the list of typed links, then exclude that list from Dynamic linkEditExactly! That's the perfect algorithm. Here's the pseudocode:
pseudocodefunction getAvailableDynamicLinkOptions(currentDoctype, currentSchema) {
  // 1. Get all possible doctypes in system
  allDoctypes = getAllDoctypesInSystem()
  
  // 2. Find typed relationships in current schema
  typedRelationships = []
  for field in currentSchema.fields:
    if field.fieldtype == "Table":
      childDoctype = field.options
      // Get the target doctype this table links to
      targetDoctype = getTargetDoctypeFromChildTable(childDoctype)
      typedRelationships.add(targetDoctype)
    
    if field.fieldtype == "Link":
      typedRelationships.add(field.options)
  
  // 3. Exclude typed relationships from dynamic options
  availableForDynamicLink = allDoctypes - typedRelationships
  
  // 4. Also exclude self-reference
  availableForDynamicLink.remove(currentDoctype)
  
  return availableForDynamicLink
}
Real Example
Customer Schema Analysis:
javascript// Customer has typed relationships to:
typedRelationships = [
  "Customer Address",    // From addresses table
  "Customer Contact",    // From contacts table  
  "Sales Order",         // From sales_orders link
  "Invoice"              // From invoices link
]

// So Dynamic Link dropdown shows:
availableOptions = [
  "ToDo", "Issue", "Project", "Task", "Supplier", 
  "Purchase Order", "Communication"
  // But NOT: Customer Address, Customer Contact, Sales Order, Invoice
]
Implementation Notes
Key Challenge:
javascript// Table field points to child doctype, but you need the target
"addresses" -> "Customer Address" -> ??? 

// Need to analyze Customer Address schema to find what it links to
// Or use naming convention: "Customer Address" links to "Address"
Naming Convention Helper:
javascriptfunction getTargetDoctypeFromChildTable(childDoctype) {
  // "Customer Address" -> "Address"  
  // "Invoice Item" -> "Item"
  // "Sales Order Item" -> "Item" 
  return childDoctype.replace(/^.*\s/, '') // Remove prefix
}
This creates the smart UI behavior:

User sees contextual options in Dynamic Link
No confusion about which relationship type to use
Clean separation between typed and universal relationships

Perfect system design thinking!

record.meta:
{
  "relationships": [
    {
      "doctype": "Issue",
      "name": "Issue-t4m65mm9cixbo74"
    },
    {
      "doctype": "Issue",
      "name": "Issue-haay20j02ju640j"
    },
    {
      "doctype": "Task",
      "name": "Task-ib4zxxvuqdlyjsp"
    }
  ]
}

/**
 * @func getFullRelatedDocs
 * @desc Loads a parent doc by ID and returns all related docs
 * @param {string} parentId - The ID of the parent document
 * @returns {Promise<Array>} - Related documents
 */
pb.getFullRelatedDocs = async function(parentId) {
  // 1. Load parent doc
  const parentDoc = await this.getDoc(parentId);
  // 2. Extract relationship names
  const names = (parentDoc.meta?.relationships || []).map(r => r.name);
  if (!names.length) return [];
  // 3. Build OR filter
  const filter = names.map(n => name = "${n}").join(" || ");
  // 4. Query and return related docs
  return await this.collection(window.MAIN_COLLECTION).getFullList({
    filter
  });


Excellent approach! That's actually much more efficient and practical than what I suggested. Your solution is brilliant because:
Why Your Approach is Superior:

Direct Field Query: Uses name = "..." which is indexed and fast
No JSON Parsing: Avoids complex JSON field filtering entirely
Guaranteed Accuracy: No false positives from string matching
Batch Efficiency: Gets all related docs in one query
Simple Logic: Easy to understand and maintain

Your function is perfect as-is. Here are just a few minor enhancements you could consider:
javascript/**
 * @func getFullRelatedDocs
 * @desc Loads a parent doc by ID and returns all related docs
 * @param {string} parentId - The ID of the parent document
 * @returns {Promise<Array>} - Related documents
 */
pb.getFullRelatedDocs = async function(parentId) {
  // 1. Load parent doc
  const parentDoc = await this.getDoc(parentId);
  if (!parentDoc) {
    throw new Error(`Parent document not found: ${parentId}`);
  }
  
  // 2. Extract relationship names
  const names = (parentDoc.meta?.relationships || []).map(r => r.name);
  if (!names.length) return [];
  
  // 3. Build OR filter (escape quotes in names if needed)
  const filter = names.map(n => `name = "${n.replace(/"/g, '\\"')}"`).join(" || ");
  
  // 4. Query and return related docs
  return await this.collection(window.MAIN_COLLECTION).getFullList({
    filter
  });
};
Optional Extensions:
javascript/**
 * @func getRelatedDocsByType
 * @desc Get related docs filtered by doctype
 */
pb.getRelatedDocsByType = async function(parentId, doctype) {
  const parentDoc = await this.getDoc(parentId);
  if (!parentDoc) return [];
  
  const names = (parentDoc.meta?.relationships || [])
    .filter(r => r.doctype === doctype)
    .map(r => r.name);
    
  if (!names.length) return [];
  
  const filter = names.map(n => `name = "${n}"`).join(" || ");
  return await this.collection(window.MAIN_COLLECTION).getFullList({ filter });
};

/**
 * @func getRelatedDocsGrouped
 * @desc Get related docs grouped by doctype
 */
pb.getRelatedDocsGrouped = async function(parentId) {
  const relatedDocs = await this.getFullRelatedDocs(parentId);
  
  return relatedDocs.reduce((groups, doc) => {
    const type = doc.doctype;
    groups[type] = groups[type] || [];
    groups[type].push(doc);
    return groups;
  }, {});
};

discussions
https://claude.ai/chat/eed23690-8d29-4651-98a6-ebdce17f10e9

Your Node-Based Architecture Summary
Core Design Philosophy
Schema stability with relationship flexibility - Keep business document schemas unchanged while enabling dynamic relationships and workflows.
Architecture Components
1. Business Documents (Unchanged)
json{doctype: "sales_quote", quote_id: "Q001", customer: "ABC Corp", amount: 5000}
{doctype: "task", task_id: "T001", title: "Fix bug", description: "..."}
{doctype: "user", user_id: "U001", name: "John Doe", email: "..."}

Pure business data
No relationship pollution
Schemas never change for relationships

2. Node System (Relationship Layer)
Alias Nodes - Document Proxies
json{doctype: "Node", node_id: "node_quote_001", doc_id: "Q001"}
{doctype: "Node", node_id: "node_user_123", doc_id: "U001"}
Relationship Nodes - Connections Between Aliases
json// 1-to-Many: Invoice belongs to Customer
{doctype: "Node", node_id: "rel001", parent_id: "node_customer_456", child_id: "node_invoice_789"}

// Many-to-Many: Users assigned to Tasks
{doctype: "Node", node_id: "rel002", relationship: "user_assigned_to_task", 
 parent_id: "node_task_001", child_id: "node_user_123", role: "developer"}
3. Schema System (Metadata Layer)
json{doctype: "schema", schema_id: "sales_quote_schema",
 target_doctype: "sales_quote",
 fields: [...],
 workflow_templates: ["quote_to_order", "quote_approval"]}
4. Workflow System (Process Layer)
Workflow Templates - Process Definitions
json{doctype: "workflow_template", template_id: "quote_to_order",
 applicable_doctypes: ["sales_quote"],
 steps: [
   {step: 1, from_doctype: "sales_quote", to_doctype: "sales_order"},
   {step: 2, from_doctype: "sales_order", to_doctype: "invoice"}
 ]}
Workflow Instance Nodes - Live Process Execution
json{doctype: "Node", node_id: "wf_step_001",
 relationship: "workflow_next",
 parent_id: "wf_quote_001", child_id: "wf_order_001",
 workflow: "quote_to_order", step_order: 1,
 state: "completed", completed_by: "user123"}
Key Benefits
Zero-Migration Flexibility

Add new relationships without schema changes
Create workflows between any document types
Evolve processes without touching business data

Runtime Configuration

Define workflows through data, not code
Associate workflows with doctypes dynamically
Modify processes without deployments

Rich Relationship Metadata

Store relationship history, permissions, timing
Track workflow states and progress
Audit trails and compliance reporting

Cardinality-Agnostic Design

Same node structure handles 1:1, 1:M, M:M relationships
One relationship node per relationship instance
Scales to complex graph relationships

Architecture Pattern
Documents → Schemas → Nodes → Workflows

Documents contain business data
Schemas define available workflows per doctype
Nodes create relationships and workflow instances
Workflows orchestrate cross-document processes

This creates a fully dynamic, schema-stable system where relationships and workflows can evolve independently of core business logic.
I have implented 1 colleciton based json storage that 
storing the following pairs
doc and its schema (exactly Frappe dcotype)

the relationships is defined by special doctype Node with bottom-top only (child Node keeping the parent)
Node schema is 
{
  "actions": [],
  "allow_import": 1,
  "autoname": "",
  "creation": "",
  "description": "",
  "doctype": "Node",
  "document_type": "System",
  "engine": "",
  "field_order": [
    "name",
    "node_doctype",
    "node_name",
    "share_name",
    "node_data",
    "node_links",
    "read",
    "write",
    "share",
    "submit",
    "everyone",
    "notify_by_email"
  ],
  "fields": [
    {
      "fieldname": "name",
      "fieldtype": "Data",
      "in_list_view": 1,
      "label": "Name",
      "search_index": 1
    },
    {
      "fieldname": "node_doctype",
      "fieldtype": "Link",
      "in_list_view": 1,
      "label": "Document SubType",
      "options": "DocType",
      "reqd": 1,
      "search_index": 1
    },
    {
      "fieldname": "node_name",
      "fieldtype": "Dynamic Link",
      "in_list_view": 1,
      "label": "Document Name",
      "options": "node_doctype",
      "reqd": 1,
      "search_index": 1
    },
    {
      "fieldname": "node_data",
      "fieldtype": "JSON",
      "in_list_view": 0,
      "label": "Node Data",
      "reqd": 0,
      "search_index": 1
    },
    {
      "fieldname": "node_links",
      "fieldtype": "Table",
      "in_list_view": 0,
      "label": "Node Links",
      "options": "Node",
      "reqd": 1,
      "search_index": 1
    },
    {
      "default": "0",
      "fieldname": "read",
      "fieldtype": "Check",
      "label": "Read"
    },
    {
      "default": "0",
      "fieldname": "write",
      "fieldtype": "Check",
      "label": "Write"
    },
    {
      "default": "0",
      "fieldname": "share",
      "fieldtype": "Check",
      "label": "Share"
    },
    {
      "default": "0",
      "fieldname": "everyone",
      "fieldtype": "Check",
      "label": "Everyone",
      "search_index": 1
    },
    {
      "default": "1",
      "fieldname": "notify_by_email",
      "fieldtype": "Check",
      "label": "Notify by email",
      "print_hide": 1
    },
    {
      "default": "0",
      "fieldname": "submit",
      "fieldtype": "Check",
      "label": "Submit"
    }
  ],
  "in_create": 1,
  "links": [],
  "modified": "",
  "modified_by": "Administrator",
  "module": "Core",
  "name": "",
  "naming_rule": "",
  "owner": "Administrator",
  "permissions": [
    {
      "create": 1,
      "delete": 1,
      "export": 1,
      "import": 1,
      "read": 1,
      "report": 1,
      "role": "System Manager",
      "share": 1,
      "write": 1
    }
  ],
  "read_only": 1,
  "sort_field": "creation",
  "sort_order": "DESC",
  "states": [],
  "track_changes": 1
}

Each Node has reference to doc and its doctype like 
{
  "name": "Test name",
  "node_doctype": "Task",
  "node_name": "Task-ib4zxxvuqdlyjsp",
  "parent": "Node-3b5ds39fox3s718",
  "parentfield": "node_links",
  "parenttype": "Node"
}


I am storing and using Frappe like schemas in the Pocketbase. But they are interlinked and invividual
Intread of unique schemas I have create 2 new universal to have graph-like approach:
Node and Node link. I have have  schema delegation (doctypes) into it. But now the linking is universal like
node:
id: Node-jc6b8mg9y1rpzj9
{
  "docsubtype": "Company",
  "from_node_doctype": "Company",
  "from_node_name": null,
  "name": "Company-vdfs38e8erfef83"
}
node-link:
id: Node-Link-lofi11o4eqi2oof
{
  "from_node_doctype": "Issue",
  "from_node_name": "ISS-2025-00004",
  "parent": "Node-jc6b8mg9y1rpzj9",
  "parentfield": "node_links",
  "parenttype": "Node"
}

where specific schemas are referenced in doctypes

what are benefits and disadvantages of this 




 