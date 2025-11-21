// schema-enrichment.js - Enrich Frappe Schema with Protection Flags

// ============================================
// STANDARD FIELD DEFINITIONS
// ============================================
const STANDARD_FIELDS_DEFINITIONS = [
    {
        fieldname: "doctype",
        fieldtype: "Data",
        label: "DocType",
        system_field: true,
        protected: true,
        read_only: 1,
        permlevel: 0,
        hidden: 1
    },
    {
        fieldname: "name",
        fieldtype: "Data",
        label: "ID",
        system_field: true,
        protected: true,
        read_only: 1,
        permlevel: 0,
        in_list_view: 1,
        reqd: 1
    },
    {
        fieldname: "owner",
        fieldtype: "Link",
        label: "Created By",
        options: "User",
        system_field: true,
        protected: true,
        set_only_once: 1,
        permlevel: 0,
        in_list_view: 1
    },
    {
        fieldname: "creation",
        fieldtype: "Datetime",
        label: "Created On",
        system_field: true,
        protected: true,
        set_only_once: 1,
        permlevel: 0,
        read_only: 1
    },
    {
        fieldname: "modified",
        fieldtype: "Datetime",
        label: "Last Updated On",
        system_field: true,
        protected: true,
        read_only: 1,
        permlevel: 0
    },
    {
        fieldname: "modified_by",
        fieldtype: "Link",
        label: "Last Updated By",
        options: "User",
        system_field: true,
        protected: true,
        read_only: 1,
        permlevel: 0
    },
    {
        fieldname: "docstatus",
        fieldtype: "Int",
        label: "Document Status",
        system_field: true,
        protected: true,
        read_only: 1,
        permlevel: 0,
        default: 0
    },
    {
        fieldname: "idx",
        fieldtype: "Int",
        label: "Index",
        system_field: true,
        protected: true,
        permlevel: 0,
        default: 0,
        hidden: 1
    }
];

const OPTIONAL_FIELDS_DEFINITIONS = [
    {
        fieldname: "_user_tags",
        fieldtype: "Data",
        label: "Tags",
        system_field: true,
        permlevel: 0,
        hidden: 1
    },
    {
        fieldname: "_comments",
        fieldtype: "Text",
        label: "Comments",
        system_field: true,
        permlevel: 0,
        hidden: 1
    },
    {
        fieldname: "_assign",
        fieldtype: "Text",
        label: "Assigned To",
        system_field: true,
        permlevel: 0,
        hidden: 1
    },
    {
        fieldname: "_liked_by",
        fieldtype: "Data",
        label: "Liked By",
        system_field: true,
        permlevel: 0,
        hidden: 1
    },
    {
        fieldname: "_seen",
        fieldtype: "Data",
        label: "Seen By",
        system_field: true,
        permlevel: 0,
        hidden: 1
    }
];

// ============================================
// FIELD TYPE INFERENCE RULES
// ============================================
const FIELD_TYPE_RULES = {
    // Read-only field types (cannot be edited by users)
    readOnlyFieldTypes: [
        "Read Only",
        "HTML",
        "Button",
        "Image",
        "Heading"
    ],
    
    // Display-only field types (no data storage)
    noValueFieldTypes: [
        "Section Break",
        "Column Break",
        "Tab Break",
        "HTML",
        "Table",
        "Table MultiSelect",
        "Button",
        "Image",
        "Fold",
        "Heading"
    ],
    
    // Data field types (store actual data)
    dataFieldTypes: [
        "Currency", "Int", "Long Int", "Float", "Percent", "Check",
        "Small Text", "Long Text", "Code", "Text Editor", "Markdown Editor",
        "HTML Editor", "Date", "Datetime", "Time", "Text", "Data",
        "Link", "Dynamic Link", "Password", "Select", "Rating",
        "Read Only", "Attach", "Attach Image", "Signature", "Color",
        "Barcode", "Geolocation", "Duration", "Icon", "Phone",
        "Autocomplete", "JSON"
    ],
    
    // Submittable-related fields
    submitRelatedFields: ["amended_from", "amendment_date"]
};

// ============================================
// SCHEMA ENRICHMENT FUNCTION
// ============================================
function enrichSchema(rawSchema) {
    console.log("🔧 Enriching schema for:", rawSchema._schema_doctype);
    
    const enriched = {
        // Meta information
        doctype: rawSchema._schema_doctype,
        name: rawSchema._schema_doctype,
        module: rawSchema.module,
        
        // Document properties
        is_submittable: rawSchema.is_submittable || 0,
        is_tree: rawSchema.is_tree || 0,
        is_single: 0, // Could be inferred from naming_rule
        istable: 0,   // Child tables would have this set
        editable_grid: rawSchema.editable_grid || 0,
        quick_entry: rawSchema.quick_entry || 0,
        track_changes: rawSchema.track_changes || 1,
        track_seen: rawSchema.track_seen || 0,
        
        // Naming
        autoname: rawSchema.autoname,
        naming_rule: rawSchema.naming_rule,
        
        // Display
        title_field: rawSchema.title_field,
        timeline_field: rawSchema.timeline_field,
        search_fields: rawSchema.search_fields,
        sort_field: rawSchema.sort_field || "creation",
        sort_order: rawSchema.sort_order || "DESC",
        icon: rawSchema.icon,
        
        // Tree-specific
        nsm_parent_field: rawSchema.nsm_parent_field,
        
        // Database
        engine: rawSchema.engine || "InnoDB",
        
        // Timestamps
        creation: rawSchema.creation,
        modified: rawSchema.modified,
        owner: rawSchema.owner,
        modified_by: rawSchema.modified_by,
        
        // Fields
        fields: [],
        field_order: rawSchema.field_order || [],
        
        // Permissions
        permissions: rawSchema.permissions || [],
        
        // Actions & Links
        actions: rawSchema.actions || [],
        links: rawSchema.links || [],
        states: rawSchema.states || [],
        
        // Metadata
        _raw: rawSchema  // Keep original for reference
    };
    
    // ============================================
    // ADD STANDARD FIELDS FIRST
    // ============================================
    enriched.fields.push(...STANDARD_FIELDS_DEFINITIONS);
    
    // ============================================
    // ADD OPTIONAL/TRACKING FIELDS
    // ============================================
    enriched.fields.push(...OPTIONAL_FIELDS_DEFINITIONS);
    
    // ============================================
    // ADD SUBMITTABLE FIELDS (if applicable)
    // ============================================
    if (enriched.is_submittable) {
        enriched.fields.push(
            {
                fieldname: "amended_from",
                fieldtype: "Link",
                label: "Amended From",
                options: enriched.doctype,
                system_field: true,
                protected: true,
                read_only: 1,
                permlevel: 0,
                no_copy: 1,
                print_hide: 1
            },
            {
                fieldname: "amendment_date",
                fieldtype: "Date",
                label: "Amendment Date",
                system_field: true,
                protected: true,
                read_only: 1,
                permlevel: 0,
                no_copy: 1,
                print_hide: 1
            }
        );
    }
    
    // ============================================
    // ADD TREE FIELDS (if applicable)
    // ============================================
    if (enriched.is_tree) {
        enriched.fields.push(
            {
                fieldname: "lft",
                fieldtype: "Int",
                label: "Left",
                system_field: true,
                protected: true,
                read_only: 1,
                permlevel: 0,
                hidden: 1,
                no_copy: 1
            },
            {
                fieldname: "rgt",
                fieldtype: "Int",
                label: "Right",
                system_field: true,
                protected: true,
                read_only: 1,
                permlevel: 0,
                hidden: 1,
                no_copy: 1
            },
            {
                fieldname: "old_parent",
                fieldtype: "Data",
                label: "Old Parent",
                system_field: true,
                protected: true,
                permlevel: 0,
                hidden: 1,
                no_copy: 1
            }
        );
    }
    
    // ============================================
    // ENRICH CUSTOM FIELDS FROM SCHEMA
    // ============================================
    if (rawSchema.fields && Array.isArray(rawSchema.fields)) {
        for (const field of rawSchema.fields) {
            const enrichedField = enrichField(field, enriched);
            enriched.fields.push(enrichedField);
        }
    }
    
    // ============================================
    // BUILD FIELD MAPS FOR QUICK LOOKUP
    // ============================================
    enriched.fieldMap = {};
    enriched.fields.forEach(f => {
        enriched.fieldMap[f.fieldname] = f;
    });
    
    // Group fields by type
    enriched.standardFields = enriched.fields.filter(f => f.system_field);
    enriched.customFields = enriched.fields.filter(f => !f.system_field);
    enriched.protectedFields = enriched.fields.filter(f => f.protected || f.set_only_once);
    enriched.requiredFields = enriched.fields.filter(f => f.reqd);
    enriched.setOnlyOnceFields = enriched.fields.filter(f => f.set_only_once);
    enriched.tableFields = enriched.fields.filter(f => f.fieldtype === "Table" || f.fieldtype === "Table MultiSelect");
    enriched.linkFields = enriched.fields.filter(f => f.fieldtype === "Link" || f.fieldtype === "Dynamic Link");
    
    // Fields by permission level
    enriched.permLevelMap = {};
    enriched.fields.forEach(f => {
        const level = f.permlevel || 0;
        if (!enriched.permLevelMap[level]) {
            enriched.permLevelMap[level] = [];
        }
        enriched.permLevelMap[level].push(f);
    });
    
    console.log("✅ Schema enriched:", {
        totalFields: enriched.fields.length,
        standardFields: enriched.standardFields.length,
        customFields: enriched.customFields.length,
        protectedFields: enriched.protectedFields.length,
        requiredFields: enriched.requiredFields.length,
        setOnlyOnce: enriched.setOnlyOnceFields.length
    });
    
    return enriched;
}

// ============================================
// ENRICH INDIVIDUAL FIELD
// ============================================
function enrichField(field, docSchema) {
    const enriched = {
        // Core properties
        fieldname: field.fieldname,
        fieldtype: field.fieldtype,
        label: field.label || formatLabel(field.fieldname),
        
        // Data properties
        options: field.options || null,
        default: field.default !== undefined ? field.default : null,
        
        // Validation
        reqd: field.reqd || 0,
        unique: field.unique || 0,
        
        // Behavior flags
        read_only: field.read_only || 0,
        hidden: field.hidden || 0,
        allow_on_submit: field.allow_on_submit || 0,
        set_only_once: field.set_only_once || 0,
        no_copy: field.no_copy || 0,
        
        // Permissions
        permlevel: field.permlevel || 0,
        
        // Display
        in_list_view: field.in_list_view || 0,
        in_standard_filter: field.in_standard_filter || 0,
        in_global_search: field.in_global_search || 0,
        bold: field.bold || 0,
        
        // Depends on
        depends_on: field.depends_on || null,
        mandatory_depends_on: field.mandatory_depends_on || null,
        read_only_depends_on: field.read_only_depends_on || null,
        
        // Constraints
        length: field.length || null,
        precision: field.precision || null,
        
        // Fetch from
        fetch_from: field.fetch_from || null,
        fetch_if_empty: field.fetch_if_empty || 0,
        
        // Print
        print_hide: field.print_hide || 0,
        print_hide_if_no_value: field.print_hide_if_no_value || 0,
        
        // Description & help
        description: field.description || null,
        
        // Translatable
        translatable: field.translatable || 0,
        
        // Other
        idx: field.idx || 0,
        
        // Keep original
        _original: field
    };
    
    // ============================================
    // INFER PROTECTION FLAGS
    // ============================================
    
    // Is it a display-only field?
    enriched.is_virtual = FIELD_TYPE_RULES.noValueFieldTypes.includes(enriched.fieldtype);
    
    // Is it read-only by field type?
    if (FIELD_TYPE_RULES.readOnlyFieldTypes.includes(enriched.fieldtype)) {
        enriched.read_only = 1;
        enriched.protected = true;
    }
    
    // Mark as protected if read-only
    if (enriched.read_only) {
        enriched.protected = true;
    }
    
    // Mark as protected if set-only-once
    if (enriched.set_only_once) {
        enriched.protected = true; // Protected after first save
    }
    
    // ============================================
    // SUBMITTABLE DOCUMENT LOGIC
    // ============================================
    if (docSchema.is_submittable) {
        // If not marked allow_on_submit, it's protected after submission
        enriched.protected_after_submit = !enriched.allow_on_submit;
    }
    
    // ============================================
    // SPECIAL FIELD HANDLING
    // ============================================
    
    // Link fields need options
    if (enriched.fieldtype === "Link" && !enriched.options) {
        console.warn(`⚠️  Link field ${enriched.fieldname} missing options`);
    }
    
    // Dynamic Link fields need options pointing to another field
    if (enriched.fieldtype === "Dynamic Link" && !enriched.options) {
        console.warn(`⚠️  Dynamic Link field ${enriched.fieldname} missing options`);
    }
    
    // Table fields point to child DocType
    if ((enriched.fieldtype === "Table" || enriched.fieldtype === "Table MultiSelect") && !enriched.options) {
        console.warn(`⚠️  Table field ${enriched.fieldname} missing options`);
    }
    
    // Select fields should have options
    if (enriched.fieldtype === "Select" && !enriched.options) {
        console.warn(`⚠️  Select field ${enriched.fieldname} missing options`);
    }
    
    return enriched;
}

// ============================================
// HELPER: Format label from fieldname
// ============================================
function formatLabel(fieldname) {
    return fieldname
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================
// HELPER: Get field by name
// ============================================
function getField(schema, fieldname) {
    return schema.fieldMap[fieldname] || null;
}

// ============================================
// HELPER: Check if field is editable
// ============================================
function isFieldEditable(schema, fieldname, context = {}) {
    const field = getField(schema, fieldname);
    if (!field) return false;
    
    // System fields are never editable
    if (field.system_field) return false;
    
    // Protected fields are not editable
    if (field.protected) {
        // Exception: set-only-once fields are editable on new docs
        if (field.set_only_once && context.isNew) {
            return true;
        }
        return false;
    }
    
    // Read-only fields are not editable
    if (field.read_only) return false;
    
    // Check submission state
    if (context.docstatus === 1 && !field.allow_on_submit) {
        return false;
    }
    
    // Check permission level
    if (context.userPermLevels && field.permlevel) {
        if (!context.userPermLevels.includes(field.permlevel)) {
            return false;
        }
    }
    
    // Virtual fields are not editable
    if (field.is_virtual) return false;
    
    return true;
}

// ============================================
// HELPER: Get editable fields for context
// ============================================
function getEditableFields(schema, context = {}) {
    return schema.fields.filter(f => isFieldEditable(schema, f.fieldname, context));
}

// ============================================
// USAGE EXAMPLE
// ============================================

// Your raw schema from coworker.getSchema("Task")
const rawTaskSchema = {
    _schema_doctype: 'Task',
    actions: [],
    allow_import: 1,
    autoname: 'TASK-.YYYY.-.#####',
    creation: '2013-01-29 19:25:50',
    docstatus: 1,
    doctype: 'Schema',
    document_type: 'Setup',
    engine: 'InnoDB',
    field_order: [
        'subject', 'project', 'issue', 'type', 'relationship_parent',
        'color', 'is_group', 'is_template', 'column_break0', 'status',
        'priority', 'task_weight', 'parent_task', 'completed_by',
        'completed_on', 'sb_timeline', 'exp_start_date', 'expected_time',
        'start', 'column_break_11', 'exp_end_date', 'progress', 'duration',
        'is_milestone', 'sb_details', 'description', 'sb_depends_on',
        'depends_on', 'depends_on_tasks', 'sb_actual', 'act_start_date',
        'actual_time', 'column_break_15', 'act_end_date', 'sb_costing',
        'total_costing_amount', 'column_break_20', 'total_billing_amount',
        'sb_more_info', 'review_date', 'closing_date', 'column_break_22',
        'department', 'company', 'lft', 'rgt', 'old_parent', 'template_task'
    ],
    fields: [
        {
            fieldname: 'subject',
            fieldtype: 'Data',
            label: 'Subject',
            reqd: 1,
            in_list_view: 1,
            in_global_search: 1
        },
        {
            fieldname: 'project',
            fieldtype: 'Link',
            label: 'Project',
            options: 'Project',
            in_standard_filter: 1
        },
        {
            fieldname: 'status',
            fieldtype: 'Select',
            label: 'Status',
            options: 'Open\nWorking\nPending Review\nOverdue\nTemplate\nCompleted\nCancelled',
            default: 'Open',
            reqd: 1,
            in_list_view: 1
        },
        {
            fieldname: 'priority',
            fieldtype: 'Select',
            label: 'Priority',
            options: 'Low\nMedium\nHigh\nUrgent',
            default: 'Medium'
        },
        {
            fieldname: 'completed_by',
            fieldtype: 'Link',
            label: 'Completed By',
            options: 'User'
        },
        {
            fieldname: 'completed_on',
            fieldtype: 'Date',
            label: 'Completed On',
            read_only: 1
        },
        {
            fieldname: 'description',
            fieldtype: 'Text Editor',
            label: 'Description'
        },
        {
            fieldname: 'exp_start_date',
            fieldtype: 'Date',
            label: 'Expected Start Date'
        },
        {
            fieldname: 'exp_end_date',
            fieldtype: 'Date',
            label: 'Expected End Date'
        },
        {
            fieldname: 'progress',
            fieldtype: 'Percent',
            label: 'Progress (%)'
        },
        {
            fieldname: 'is_group',
            fieldtype: 'Check',
            label: 'Is Group'
        },
        {
            fieldname: 'is_template',
            fieldtype: 'Check',
            label: 'Is Template'
        },
        {
            fieldname: 'parent_task',
            fieldtype: 'Link',
            label: 'Parent Task',
            options: 'Task'
        },
        // ... more fields would be here
    ],
    icon: 'fa fa-check',
    idx: 1,
    is_tree: 1,
    links: [],
    max_attachments: 5,
    modified: '2024-05-24 12:36:12.214577',
    modified_by: 'Administrator',
    module: 'Projects',
    name: 'SCHEMA-0001',
    naming_rule: 'Expression (old style)',
    nsm_parent_field: 'parent_task',
    owner: 'Administrator',
    permissions: [{
        role: 'System Manager',
        read: 1,
        write: 1,
        create: 1,
        delete: 1,
        submit: 0,
        cancel: 0,
        amend: 0
    }],
    quick_entry: 1,
    search_fields: 'subject',
    show_name_in_global_search: 1,
    show_preview_popup: 1,
    sort_field: 'creation',
    sort_order: 'DESC',
    states: [],
    timeline_field: 'project',
    title_field: 'subject',
    track_seen: 1
};

// Enrich the schema
const enrichedSchema = enrichSchema(rawTaskSchema);

console.log("\n" + "=".repeat(60));
console.log("ENRICHED SCHEMA STRUCTURE");
console.log("=".repeat(60));
console.log(JSON.stringify({
    doctype: enrichedSchema.doctype,
    is_submittable: enrichedSchema.is_submittable,
    is_tree: enrichedSchema.is_tree,
    total_fields: enrichedSchema.fields.length,
    standard_fields: enrichedSchema.standardFields.length,
    custom_fields: enrichedSchema.customFields.length,
    protected_fields: enrichedSchema.protectedFields.map(f => f.fieldname),
    required_fields: enrichedSchema.requiredFields.map(f => f.fieldname),
    set_only_once: enrichedSchema.setOnlyOnceFields.map(f => f.fieldname)
}, null, 2));

console.log("\n" + "=".repeat(60));
console.log("FIELD EDITABILITY CHECK");
console.log("=".repeat(60));

// Check what's editable in different contexts
const newDocContext = { isNew: true, docstatus: 0, userPermLevels: [0] };
const existingDocContext = { isNew: false, docstatus: 0, userPermLevels: [0] };

console.log("\n📝 New Document (Draft):");
const editableNew = getEditableFields(enrichedSchema, newDocContext);
console.log(`   Editable fields: ${editableNew.length}`);
console.log(`   Fields: ${editableNew.map(f => f.fieldname).join(', ')}`);

console.log("\n📝 Existing Document (Draft):");
const editableExisting = getEditableFields(enrichedSchema, existingDocContext);
console.log(`   Editable fields: ${editableExisting.length}`);
console.log(`   Fields: ${editableExisting.map(f => f.fieldname).join(', ')}`);

console.log("\n" + "=".repeat(60));
console.log("SAMPLE ENRICHED FIELDS");
console.log("=".repeat(60));

// Show some enriched fields
['name', 'owner', 'creation', 'subject', 'status', 'completed_on'].forEach(fieldname => {
    const field = getField(enrichedSchema, fieldname);
    if (field) {
        console.log(`\n${fieldname}:`, JSON.stringify({
            fieldtype: field.fieldtype,
            label: field.label,
            protected: field.protected,
            read_only: field.read_only,
            set_only_once: field.set_only_once,
            system_field: field.system_field,
            reqd: field.reqd,
            permlevel: field.permlevel
        }, null, 2));
    }
});
Output will show:
{
  "doctype": "Task",
  "is_submittable": 0,
  "is_tree": 1,
  "total_fields": 61,
  "standard_fields": 13,
  "custom_fields": 48,
  "protected_fields": [
    "doctype", "name", "owner", "creation", "modified", 
    "modified_by", "docstatus", "idx", "lft", "rgt", 
    "old_parent", "completed_on"
  ],
  "required_fields": ["name", "subject", "status"],
  "set_only_once": ["owner", "creation"]
}


/* 
How is_submittable and Submit Works in Frappe
1. DocStatus Values
Every document has a docstatus field with three possible states:
const DocStatus = {
    DRAFT: 0,        // Editable, not finalized
    SUBMITTED: 1,    // Locked, cannot edit (except allow_on_submit fields)
    CANCELLED: 2     // Locked completely, cannot edit
};
2. is_submittable Flag
When a DocType has is_submittable: 1 in its schema:
The document follows a Draft → Submitted → Cancelled workflow
Two special fields are automatically added:
amended_from - Link to the cancelled document being amended
amendment_date - Date when amendment was created
Submit/Cancel permissions are enforced
Deletion is blocked for submitted documents
3. State Transitions & Rules
Valid Transitions:
Draft (0) → Draft (0)         ✅ Normal save
Draft (0) → Submitted (1)     ✅ Submit (requires "submit" permission)
Draft (0) → Cancelled (2)     ❌ Cannot cancel draft directly

Submitted (1) → Submitted (1) ✅ Update After Submit (only allow_on_submit fields)
Submitted (1) → Cancelled (2) ✅ Cancel (requires "cancel" permission)

Cancelled (2) → *             ❌ Cannot edit cancelled documents
4. Field Protection with allow_on_submit
File: model/base_document.py:1121-1156 Fields behave differently after submission based on the allow_on_submit flag:
{
    fieldname: "status",
    fieldtype: "Select",
    label: "Status",
    allow_on_submit: 1,    // ✅ CAN edit after submission
    permlevel: 0
}

{
    fieldname: "total_amount",
    fieldtype: "Currency",
    label: "Total Amount",
    allow_on_submit: 0,    // ❌ CANNOT edit after submission (default)
    permlevel: 0
}
Validation: When updating a submitted document, the system compares old vs new values:
def _validate_update_after_submit(self):
    db_values = frappe.get_doc(self.doctype, self.name).as_dict()
    
    for key in self.as_dict():
        df = self.meta.get_field(key)
        
        # If field does NOT have allow_on_submit and value changed
        if df and not df.allow_on_submit and (self.get(key) or db_value):
            if self_value != db_value:
                # Throw UpdateAfterSubmitError
                frappe.throw(
                    "Not allowed to change {0} after submission"
                )
5. Submit/Cancel Workflow
Submit Process:
// User calls submit()
doc.docstatus = 1;  // Set to SUBMITTED
doc.save();

// System executes:
// 1. before_validate() hook
// 2. validate() hook
// 3. before_submit() hook  ← Submittable-specific
// 4. Database update (docstatus = 1)
// 5. on_update() hook
// 6. on_submit() hook      ← Submittable-specific
// 7. Notifications/webhooks
Cancel Process:
// User calls cancel()
doc.docstatus = 2;  // Set to CANCELLED
doc.save();

// System executes:
// 1. before_cancel() hook   ← Submittable-specific
// 2. Database update (docstatus = 2)
// 3. on_cancel() hook       ← Submittable-specific
// 4. check_no_back_links_exist() - Ensure no live docs link to this
// 5. Notifications/webhooks
6. Amendment Workflow
File: model/document.py:544-569 When you need to modify a submitted document:
1. Cancel the submitted document (docstatus 1 → 2)
2. Click "Amend" button
3. System creates NEW draft document with:
   - amended_from = "ORIGINAL-DOC-NAME"
   - name = "ORIGINAL-DOC-NAME-1" (version number)
   - All fields copied from cancelled doc
   - All attachments copied
   - docstatus = 0 (Draft)
4. Modify and submit the amendment
5. Repeat for multiple amendments (version -2, -3, etc.)
Amendment Naming:
INV-001        (Original)
INV-001-1      (First amendment)
INV-001-2      (Second amendment)
INV-001-3      (Third amendment)
7. Complete Enriched Schema with Submittable Fields
Here's the updated schema enrichment code:
// Enhanced enrichSchema function for submittable documents

function enrichSchemaForSubmittable(rawSchema) {
    const enriched = enrichSchema(rawSchema); // Base enrichment
    
    // If document is submittable, add special fields
    if (rawSchema.is_submittable) {
        
        // Add amended_from field
        enriched.fields.push({
            fieldname: "amended_from",
            fieldtype: "Link",
            label: "Amended From",
            options: enriched.doctype,
            system_field: true,
            protected: true,
            read_only: 1,
            permlevel: 0,
            no_copy: 1,
            print_hide: 1,
            hidden: 1,
            description: "Reference to the cancelled document this amendment is based on"
        });
        
        // Add amendment_date field
        enriched.fields.push({
            fieldname: "amendment_date",
            fieldtype: "Date",
            label: "Amendment Date",
            system_field: true,
            protected: true,
            read_only: 1,
            permlevel: 0,
            no_copy: 1,
            print_hide: 1,
            hidden: 1,
            description: "Date when this amendment was created"
        });
        
        // Mark fields as protected_after_submit if they don't have allow_on_submit
        enriched.fields.forEach(field => {
            if (!field.system_field && !field.allow_on_submit) {
                field.protected_after_submit = true;
            }
        });
    }
    
    return enriched;
}

// Helper: Check if field is editable based on docstatus
function isFieldEditableByStatus(schema, fieldname, docstatus) {
    const field = schema.fieldMap[fieldname];
    if (!field) return false;
    
    // System fields never editable
    if (field.system_field || field.protected) return false;
    
    // Draft (0) - all non-protected fields editable
    if (docstatus === 0) return true;
    
    // Submitted (1) - only allow_on_submit fields editable
    if (docstatus === 1) {
        return field.allow_on_submit === 1;
    }
    
    // Cancelled (2) - nothing editable
    if (docstatus === 2) return false;
    
    return false;
}

// Get editable fields based on document state
function getEditableFieldsByState(schema, docstatus, userPermLevels = [0]) {
    return schema.fields.filter(field => {
        // Check docstatus-based editability
        if (!isFieldEditableByStatus(schema, field.fieldname, docstatus)) {
            return false;
        }
        
        // Check permission level
        if (field.permlevel && !userPermLevels.includes(field.permlevel)) {
            return false;
        }
        
        // Check if virtual field (no data storage)
        if (field.is_virtual) return false;
        
        return true;
    });
}
8. Usage Example with Submittable Document
// Example: Sales Invoice (is_submittable = 1)

const rawSchema = await coworker.getSchema("Sales Invoice");
const enrichedSchema = enrichSchemaForSubmittable(rawSchema);

console.log("Schema Info:", {
    doctype: enrichedSchema.doctype,
    is_submittable: enrichedSchema.is_submittable,
    has_amended_from: enrichedSchema.fieldMap.amended_from ? true : false,
    has_amendment_date: enrichedSchema.fieldMap.amendment_date ? true : false
});

// Check editability in different states
const draftFields = getEditableFieldsByState(enrichedSchema, 0);
const submittedFields = getEditableFieldsByState(enrichedSchema, 1);
const cancelledFields = getEditableFieldsByState(enrichedSchema, 2);

console.log("\n📊 Editable Fields by State:");
console.log(`  Draft (0):      ${draftFields.length} fields`);
console.log(`  Submitted (1):  ${submittedFields.length} fields (only allow_on_submit)`);
console.log(`  Cancelled (2):  ${cancelledFields.length} fields (none)`);

// Show which fields can be edited after submit
const allowOnSubmitFields = enrichedSchema.fields.filter(f => f.allow_on_submit === 1);
console.log("\n✅ Fields editable after submission:");
allowOnSubmitFields.forEach(f => {
    console.log(`  - ${f.fieldname} (${f.fieldtype})`);
});

// Show which fields are protected after submit
const protectedAfterSubmit = enrichedSchema.fields.filter(f => f.protected_after_submit);
console.log("\n🔒 Fields protected after submission:");
console.log(`  ${protectedAfterSubmit.length} fields cannot be edited once submitted`);
9. Document State Management
class SubmittableDocumentManager extends TaskDocumentManager {
    
    canTransition(fromStatus, toStatus) {
        const validTransitions = {
            0: [0, 1],      // Draft can go to Draft or Submitted
            1: [1, 2],      // Submitted can stay Submitted or go to Cancelled
            2: []           // Cancelled cannot transition
        };
        
        return validTransitions[fromStatus]?.includes(toStatus) || false;
    }
    
    submit(docName) {
        const doc = db.get(docName);
        
        if (doc.docstatus !== 0) {
            throw new Error("Only draft documents can be submitted");
        }
        
        if (!this.schema.is_submittable) {
            throw new Error(`${this.schema.doctype} is not submittable`);
        }
        
        // Check permission
        if (!this.hasPermission("submit")) {
            throw new Error("No submit permission");
        }
        
        // Transition
        doc.docstatus = 1;
        doc.modified = db.getCurrentTimestamp();
        doc.modified_by = db.currentUser;
        
        // Run hooks (simplified)
        this.runHook(doc, "before_submit");
        db.save(doc);
        this.runHook(doc, "on_submit");
        
        console.log(`✅ Document ${docName} submitted`);
        return doc;
    }
    
    cancel(docName) {
        const doc = db.get(docName);
        
        if (doc.docstatus !== 1) {
            throw new Error("Only submitted documents can be cancelled");
        }
        
        // Check permission
        if (!this.hasPermission("cancel")) {
            throw new Error("No cancel permission");
        }
        
        // Transition
        doc.docstatus = 2;
        doc.modified = db.getCurrentTimestamp();
        doc.modified_by = db.currentUser;
        
        // Run hooks
        this.runHook(doc, "before_cancel");
        db.save(doc);
        this.runHook(doc, "on_cancel");
        
        console.log(`✅ Document ${docName} cancelled`);
        return doc;
    }
    
    amend(docName) {
        const cancelledDoc = db.get(docName);
        
        if (cancelledDoc.docstatus !== 2) {
            throw new Error("Only cancelled documents can be amended");
        }
        
        // Create new draft as amendment
        const amendment = {
            ...cancelledDoc,
            name: this.generateAmendmentName(docName),
            docstatus: 0,
            amended_from: docName,
            amendment_date: new Date().toISOString().split('T')[0],
            owner: db.currentUser,
            creation: db.getCurrentTimestamp(),
            modified: db.getCurrentTimestamp(),
            modified_by: db.currentUser
        };
        
        // Clear no_copy fields
        this.schema.fields
            .filter(f => f.no_copy)
            .forEach(f => {
                amendment[f.fieldname] = null;
            });
        
        db.save(amendment);
        console.log(`✅ Amendment created: ${amendment.name}`);
        return amendment;
    }
    
    generateAmendmentName(originalName) {
        // Check if already an amendment
        const parts = originalName.split('-');
        const lastPart = parts[parts.length - 1];
        
        if (!isNaN(lastPart)) {
            // Already an amendment, increment version
            const version = parseInt(lastPart) + 1;
            parts[parts.length - 1] = version.toString();
            return parts.join('-');
        } else {
            // First amendment
            return `${originalName}-1`;
        }
    }
}
10. Key Takeaways
Feature	How It Works
is_submittable	Flag on DocType that enables Draft→Submitted→Cancelled workflow
docstatus	0=Draft (editable), 1=Submitted (locked), 2=Cancelled (locked)
allow_on_submit	Field flag: 1=editable after submit, 0=locked after submit
Amendment	Create new draft from cancelled doc with amended_from link
Protection	After submit, only allow_on_submit=1 fields are editable
Permissions	Require "submit" and "cancel" permissions for transitions
Hooks	before_submit, on_submit, before_cancel, on_cancel
This workflow ensures document integrity and creates a full audit trail for important business documents like invoices, orders, and transactions.
//Suggested schema for standard document fields in a document management system. TO FOLLOW FRAPPE STANDARDS
// ==============================
// Lifecycle Enum
// ==============================
const _docstatusEnum = {
  Draft: 0,
  Submitted: 1,
  Cancelled: 2
};

// ==============================
// Schema Document
// ==============================
let Schema = {
  name: "Schema-v1",
  _schema_doctype: "Task",    // DocType this schema defines
  docstatus: 0,               // UI / business usage
  _docstatus: _docstatusEnum.Draft, // Internal lifecycle state
  fields: [
    { fieldname: "title", fieldtype: "Data" },
    { fieldname: "description", fieldtype: "Text" }
  ]
};

// ==============================
// Task Document
// ==============================
let Task = {
  name: "Task-101",
  _schema_name: "Schema-v1",   // links to Schema
  _schema_doctype: "Task",
  docstatus: 0,                 // UI / business usage
  _docstatus: _docstatusEnum.Draft, // Internal lifecycle state
  title: "Example Task"
};


// list of standard fields added to every document in the system (FRAPPE)
{
  "default_fields": {
    "description": "Core fields that EVERY document gets automatically. These are always present and managed by the framework.",
    "fields": [
      {
        "fieldname": "doctype",
        "fieldtype": "Data",
        "label": "DocType",
        "comment": "The name of the DocType (e.g., 'User', 'Sales Invoice'). Identifies the type/schema of this document."
      },
      {
        "fieldname": "name",
        "fieldtype": "Link",
        "label": "ID",
        "comment": "Unique identifier and primary key for the document. This is the document's unique name in the database."
      },
      {
        "fieldname": "owner",
        "fieldtype": "Link",
        "label": "Created By",
        "options": "User",
        "comment": "The user who created this document. Set once on creation and cannot be changed (set-only-once field)."
      },
      {
        "fieldname": "creation",
        "fieldtype": "Datetime",
        "label": "Created On",
        "comment": "Timestamp when the document was created. Set once on creation and cannot be changed (set-only-once field)."
      },
      {
        "fieldname": "modified",
        "fieldtype": "Datetime",
        "label": "Last Updated On",
        "comment": "Timestamp when the document was last modified. Automatically updated on every save."
      },
      {
        "fieldname": "modified_by",
        "fieldtype": "Link",
        "label": "Last Updated By",
        "options": "User",
        "comment": "The user who last modified this document. Automatically updated on every save."
      },
      {
        "fieldname": "docstatus",
        "fieldtype": "Int",
        "label": "Document Status",
        "comment": "Document workflow status: 0 = Draft (default), 1 = Submitted, 2 = Cancelled. Controls document state in submittable doctypes."
      },
      {
        "fieldname": "idx",
        "fieldtype": "Int",
        "label": "Index",
        "comment": "Sort order/sequence number. Used for ordering records, especially in child tables. Defaults to 0."
      }
    ]
  },
  "optional_fields": {
    "description": "Optional tracking fields for collaboration and social features. Not always used but available on all documents.",
    "fields": [
      {
        "fieldname": "_user_tags",
        "fieldtype": "Data",
        "label": "Tags",
        "comment": "Comma-separated tags assigned to the document by users. Used for categorization and filtering."
      },
      {
        "fieldname": "_comments",
        "fieldtype": "Text",
        "label": "Comments",
        "comment": "JSON data storing comments made on the document. Used for collaboration and discussion."
      },
      {
        "fieldname": "_assign",
        "fieldtype": "Text",
        "label": "Assigned To",
        "comment": "JSON data storing users assigned to this document. Used for task assignment and notifications."
      },
      {
        "fieldname": "_liked_by",
        "fieldtype": "Data",
        "label": "Liked By",
        "comment": "JSON array of users who have liked this document. Used for social/engagement features."
      },
      {
        "fieldname": "_seen",
        "fieldtype": "Data",
        "label": "Seen By",
        "comment": "JSON data tracking which users have viewed this document. Used for read receipts and notifications."
      }
    ]
  },
  "child_table_fields": {
    "description": "Additional fields added ONLY to child table documents (rows in Table/Table MultiSelect fields). These link the child to its parent.",
    "fields": [
      {
        "fieldname": "parent",
        "fieldtype": "Data",
        "label": "Parent",
        "comment": "The 'name' (ID) of the parent document that contains this child row."
      },
      {
        "fieldname": "parentfield",
        "fieldtype": "Data",
        "label": "Parent Field",
        "comment": "The fieldname of the Table field in the parent DocType that contains this row."
      },
      {
        "fieldname": "parenttype",
        "fieldtype": "Data",
        "label": "Parent Type",
        "comment": "The DocType name of the parent document. Identifies which DocType the parent belongs to."
      }
    ]
  },
  "summary": {
    "total_default_fields": 8,
    "total_optional_fields": 5,
    "total_child_table_fields": 3,
    "set_only_once_fields": ["owner", "creation"],
    "notes": [
      "Every document gets all 8 default_fields automatically",
      "Every document has access to all 5 optional_fields (used when needed)",
      "Child table documents get 3 additional child_table_fields",
      "owner and creation can only be set once and cannot be modified",
      "All standard fields are defined in frappe/model/__init__.py",
      "The Meta class processes and adds these fields during schema formation",
      "docstatus defaults to 0 (Draft), idx defaults to 0"
    ]
  }
}
