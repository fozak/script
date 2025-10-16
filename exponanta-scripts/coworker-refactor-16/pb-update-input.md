so the have doctype Schema with specific fields, and _BaseSchema with contains all meta field (we can more name and doctype field there as well as _last_updated etc).  we just combine in final documents these fields during create and update.Ah, excellent! So you have a two-schema system:
Schema Structure
1. _BaseSchema (meta fields for ALL documents):
javascript{
  name: "string",           // Unique ID
  doctype: "string",        // Document type
  creation: "datetime",     // Created timestamp
  modified: "datetime",     // Last modified timestamp
  owner: "string",          // Created by user
  modified_by: "string",    // Last modified by user
  _last_updated: "datetime",
  _assign: "json",
  _comments: "json",
  _liked_by: "json",
  _seen: "json",
  _user_tags: "json",
  // ... other meta fields
}
2. Doctype-specific Schema (business fields):
javascript// Task schema
{
  subject: "string",
  status: "select",
  priority: "select",
  project: "link",
  // ... business fields
}
3. Final document = Base + Doctype fields merged:
javascript{
  // Base fields
  name: "TASK-001",
  doctype: "Task",
  creation: "2025-10-15 10:00:00",
  modified: "2025-10-15 15:30:00",
  owner: "user@example.com",
  
  // Business fields
  subject: "Fix bug in login",
  status: "Open",
  priority: "High",
  project: "PROJECT-001"
}
Questions for Implementation:
1. Where is _BaseSchema stored?

Is it a special Schema document with _schema_doctype: "_Base"?
Or hardcoded in your system?

2. During CREATE, who sets base fields?

Should _handleCreate automatically add: creation, modified, owner, modified_by?
Or does the user/UI need to provide them?

3. During UPDATE, which base fields auto-update?

Should _handleUpdate automatically update: modified, modified_by, _last_updated?
Should it prevent updating: name, doctype, creation, owner?

4. Should _handleUpdate validate against BOTH schemas?

Check that user isn't trying to update protected base fields?
Check that business fields exist in doctype schema?

5. For field filtering (in_list_view), should it include base fields?

Should name and doctype always be included?
Should other base fields like modified, owner be filterable by view config?

Give me your answers and I'll implement _handleCreate and _handleUpdate correctly! 🎯RetryDDgive me most popual approach to these 2 groups (business and meta fields).Here's the most popular approach used by modern frameworks (Frappe, Strapi, Directus, etc.):
Industry Standard Approach
1. Base Schema Storage
Hardcoded in system - not in database
javascript// pb-base-schema.js
pb.BASE_SCHEMA = {
  // System fields (never user-editable)
  name: { type: "string", system: true, required: true },
  doctype: { type: "string", system: true, required: true },
  
  // Audit fields (auto-managed)
  creation: { type: "datetime", auto: true, onCreate: true },
  modified: { type: "datetime", auto: true, onUpdate: true },
  owner: { type: "string", auto: true, onCreate: true },
  modified_by: { type: "string", auto: true, onUpdate: true },
  
  // Optional meta fields (user can modify)
  _assign: { type: "json", optional: true },
  _comments: { type: "json", optional: true },
  _liked_by: { type: "json", optional: true },
  _seen: { type: "json", optional: true },
  _user_tags: { type: "json", optional: true },
};
2. CREATE - Auto-inject base fields
javascriptpb._handleCreate = async function (doctype, data, schema, options) {
  // User provides only business fields:
  // { subject: "Fix bug", status: "Open" }
  
  // System auto-adds base fields:
  const recordData = {
    // System fields
    name: data.name || this._generateName(doctype),
    doctype: doctype,
    
    // Audit fields (auto-generated)
    creation: new Date().toISOString(),
    modified: new Date().toISOString(),
    owner: this.getCurrentUser(), // or pb.authStore.model?.email
    modified_by: this.getCurrentUser(),
    
    // Business fields (user provided)
    ...data,
  };
  
  // Result:
  // {
  //   name: "TASK-001",
  //   doctype: "Task",
  //   creation: "2025-10-15T10:00:00Z",
  //   modified: "2025-10-15T10:00:00Z",
  //   owner: "user@example.com",
  //   modified_by: "user@example.com",
  //   subject: "Fix bug",
  //   status: "Open"
  // }
};
3. UPDATE - Auto-update audit fields, protect system fields
javascriptpb._handleUpdate = async function (doctype, where, data, schema, options) {
  // ✅ Protected fields (cannot be updated by user)
  const PROTECTED_FIELDS = ['name', 'doctype', 'creation', 'owner'];
  
  // Remove protected fields from user data
  const cleanData = { ...data };
  PROTECTED_FIELDS.forEach(field => delete cleanData[field]);
  
  // ✅ Auto-update audit fields
  cleanData.modified = new Date().toISOString();
  cleanData.modified_by = this.getCurrentUser();
  
  // User sends: { status: "Closed" }
  // System updates: 
  // {
  //   status: "Closed",           // user data
  //   modified: "2025-10-15...",  // auto-added
  //   modified_by: "user@..."     // auto-added
  // }
};
4. Validation - Check both schemas
javascriptpb._validateFields = function(data, schema, operation) {
  const errors = [];
  
  // Check against doctype schema (business fields)
  if (schema?.fields) {
    for (const [key, value] of Object.entries(data)) {
      // Skip base fields (they're always valid)
      if (pb.BASE_SCHEMA[key]) continue;
      
      // Check if field exists in doctype schema
      const fieldDef = schema.fields.find(f => f.fieldname === key);
      if (!fieldDef) {
        errors.push(`Unknown field: ${key}`);
      }
    }
  }
  
  return errors;
};
5. Field Filtering - Base + Business fields
javascriptpb._handleRead = async function (doctype, query, schema, options) {
  // Always include essential base fields
  const baseFields = ['name', 'doctype', 'modified', 'owner'];
  
  // Add business fields from view config
  const viewProp = `in_${view}_view`;
  const businessFields = schema.fields
    .filter(f => f[viewProp])
    .map(f => f.fieldname);
  
  // Combine: base + business
  const fields = [...baseFields, ...businessFields];
  
  // Result for list view:
  // ['name', 'doctype', 'modified', 'owner', 'subject', 'status', 'priority']
};
Summary - Best Practices
AspectApproachBase SchemaHardcoded in code, not in DBSystem FieldsAuto-managed, never user-editable (name, doctype, creation, owner)Audit FieldsAuto-updated on create/update (modified, modified_by)Meta FieldsUser-editable (_assign, _comments, etc)CREATESystem injects base fields + user provides business fieldsUPDATESystem protects system fields, auto-updates audit fieldsValidationCheck business fields against doctype schema onlyFilteringAlways include essential base fields + configured business fields
Want me to implement this full pattern in your code? 🚀