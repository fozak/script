// patch-schemas-3.js — fixes name field: ensures reqd:0, read_only:1, hidden:0
// run with: node patch-schemas-3.js db.json
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.argv[2] || 'db.json');
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

let patched = 0;

for (const schema of db) {
  if (schema.doctype !== 'Schema') continue;

  const nameField = (schema.fields || []).find(f => f.fieldname === 'name');
  if (!nameField) continue;

  let changed = false;

  if (nameField.reqd)       { nameField.reqd      = 0; changed = true; }
  if (!nameField.read_only) { nameField.read_only  = 1; changed = true; }
  if (nameField.hidden)     { nameField.hidden     = 0; changed = true; }
  if (!nameField.in_list_view) { nameField.in_list_view = 1; changed = true; }

  if (changed) {
    console.log(`✅ FIXED: ${schema.schema_name || schema.name}`);
    patched++;
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log(`\nDone. Fixed: ${patched}`);
