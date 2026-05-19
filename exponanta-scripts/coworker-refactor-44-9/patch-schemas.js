// patch-schemas.js — run with: node patch-schemas.js
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.argv[2] || 'db.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const NAME_FIELD = {
  fieldname: "name",
  fieldtype: "Data",
  label:     "Name",
  in_list_view: 1,
  read_only: 1,
  hidden:    0
};

let patched = 0;
let skipped = 0;

for (const schema of db) {
  // only process Schema doctype records
  if (schema.doctype !== 'Schema') continue;

  // skip if no title_field — needs manual decision
  if (!schema.title_field) {
    console.log(`⚠️  SKIP (no title_field): ${schema.schema_name || schema.name}`);
    skipped++;
    continue;
  }

  // 1. patch field_order — name always first, deduplicated
  const existingOrder = schema.field_order || [];
  schema.field_order = [
    'name',
    ...existingOrder.filter(f => f !== 'name')
  ];

  // 2. patch fields[] — add name field if missing
  const fields = schema.fields || [];
  const hasNameField = fields.some(f => f.fieldname === 'name');
  if (!hasNameField) {
    schema.fields = [NAME_FIELD, ...fields];
  }

  console.log(`✅ PATCHED: ${schema.schema_name || schema.name} (title_field: ${schema.title_field})`);
  patched++;
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log(`\nDone. Patched: ${patched}, Skipped: ${skipped}`);