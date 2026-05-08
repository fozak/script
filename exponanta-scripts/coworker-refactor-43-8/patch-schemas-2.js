// patch-schemas-2.js — run with: node patch-schemas-2.js db.json
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.argv[2] || 'db.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const NAME_FIELD = {
  fieldname:    "name",
  fieldtype:    "Data",
  label:        "Name",
  in_list_view: 1,
  read_only:    1,
  hidden:       0
};

// Group 1 — title_field: "name" (no better display field)
const TITLE_IS_NAME = new Set([
  "SystemSchema",
  "Payment Entry Reference",
  "Dependent Task",
  "Sales Invoice Item",
  "System Settings",
  "Workflow Transition",
  "All",
  "Has Role",
  "Workflow Document State",
  "Ontology Relation",
  "DocType",
  "Node",
  "Node Link",
  "Parent Template",
  "Child Template",
  "SystemFields",
  "Run",
]);

// Group 2 — title_field: specific semantic field
const TITLE_FIELD_MAP = {
  "Role":                 "role_name",
  "Company":              "company_name",
  "Adapter":              "adapter_name",
  "State Machine":        "statemachine_name",
  "Workflow":             "workflow_name",
  "Workflow State":       "workflow_state_name",
  "Workflow Action Master": "workflow_action_name",
  "Has Children":         "child_name",
};

let patched = 0;
let skipped = 0;

for (const schema of db) {
  if (schema.doctype !== 'Schema') continue;
  if (schema.title_field) {
    // already has title_field — skip, was handled in pass 1
    continue;
  }

  const schemaName = schema.schema_name || schema.name;

  // resolve which title_field to set
  let titleField = null;
  if (TITLE_IS_NAME.has(schemaName)) {
    titleField = 'name';
  } else if (TITLE_FIELD_MAP[schemaName]) {
    titleField = TITLE_FIELD_MAP[schemaName];
  } else {
    console.log(`⚠️  STILL UNHANDLED: ${schemaName}`);
    skipped++;
    continue;
  }

  // set title_field
  schema.title_field = titleField;

  // patch field_order — name always first
  const existingOrder = schema.field_order || [];
  schema.field_order = ['name', ...existingOrder.filter(f => f !== 'name')];

  // patch fields[] — add name field if missing
  const fields = schema.fields || [];
  const hasNameField = fields.some(f => f.fieldname === 'name');
  if (!hasNameField) {
    schema.fields = [NAME_FIELD, ...fields];
  }

  // for semantic field groups — also ensure in_list_view on the title field
  if (titleField !== 'name') {
    const tf = schema.fields.find(f => f.fieldname === titleField);
    if (tf && !tf.in_list_view) {
      tf.in_list_view = 1;
      console.log(`   → set in_list_view on "${titleField}"`);
    } else if (!tf) {
      console.log(`   ⚠️  title_field "${titleField}" not found in fields[] — add manually`);
    }
  }

  console.log(`✅ PATCHED: ${schemaName} (title_field: ${titleField})`);
  patched++;
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log(`\nDone. Patched: ${patched}, Skipped: ${skipped}`);
