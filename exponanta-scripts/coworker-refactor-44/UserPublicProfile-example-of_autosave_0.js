/*UserPublicProfile → Normal SignUp UX
1. Kill dim[0] visibility — yes, empty override
json"_state": {
  "0": {
    "transitions": {},
    "sideEffects": {},
    "labels": {},
    "primary": {}
  },
  "1": { ... }
}
Empty transitions: {} → _getTransitions returns [] for dim[0] → no buttons generated. SystemSchema dim[0] is overridden with nothing. Clean.
Do NOT omit dim[0] entirely — if absent, SystemSchema dim[0] merges in and Submit/Delete appear in menu.

2. is_submittable: 1 — remove it
SystemSchema dim[0] requires["0_1"]: { is_submittable: 1 } — but you've killed dim[0] transitions so requires never evaluates. However is_submittable may affect other logic elsewhere. Since UserPublicProfile uses dim[1] for its lifecycle, it doesn't need is_submittable at all. Remove it.

3. _autosave: 0 — correct, keep it
Signup form should not autosave on field change. User fills email + password + full_name then clicks Sign Up. _autosave: 0 is exactly right.

4. explicit_edit_intent — add it
json"explicit_edit_intent": 1
Without it, MainForm auto-switches to update operation for any record with docstatus: 0:
jsif (!schema?.explicit_edit_intent && (doc.docstatus ?? 0) === 0 && doc.name && run_doc.operation === 'select')
  run_doc.operation = 'update'
After signup the user has a profile record with docstatus: 0 — without explicit_edit_intent the form always opens in edit mode showing Save button. With it, user sees read-only view and must explicitly click Edit.

5. Virtual fields — depends_on guard
email and password are reqd: 1, virtual: 1 — they should only show on create (no doc.name). They already have no depends_on — add it:
json{ "fieldname": "email",    "reqd": 1, "virtual": 1, "depends_on": "eval:!doc.name" },
{ "fieldname": "password", "reqd": 1, "virtual": 1, "depends_on": "eval:!doc.name" }
After signup, email/password fields disappear from the form. Profile fields (title, bio, linkedin) appear via their depends_on: "eval:doc.name". Clean separation between signup form and profile edit form — same schema, same component.

6. dim[1] after signup — no more transitions
After 1.0_1 succeeds, currentVal = 1. transitions["1"] undefined → [] → no buttons. Form goes quiet — no FSM buttons, just Save if editing profile fields. Correct for a profile page.

Result schema*/


{
  "schema_name": "UserPublicProfile",
  "doctype": "Schema",
  "title_field": "full_name",
  "_autosave": 0,
  "explicit_edit_intent": 1,
  "fields": [
    { "fieldname": "email",     "fieldtype": "Data",     "label": "Email",     "reqd": 1, "virtual": 1, "depends_on": "eval:!doc.name" },
    { "fieldname": "password",  "fieldtype": "Password", "label": "Password",  "reqd": 1, "virtual": 1, "depends_on": "eval:!doc.name" },
    { "fieldname": "full_name", "fieldtype": "Data",     "label": "Full Name", "reqd": 1 },
    { "fieldname": "section_identity", "fieldtype": "Section Break", "label": "Identity", "depends_on": "eval:doc.name" },
    { "fieldname": "title",     "fieldtype": "Data",     "label": "Title",     "depends_on": "eval:doc.name" },
    { "fieldname": "bio",       "fieldtype": "Text",     "label": "Bio",       "depends_on": "eval:doc.name" },
    { "fieldname": "linkedin",  "fieldtype": "Data",     "label": "LinkedIn",  "depends_on": "eval:doc.name" },
    { "fieldname": "website",   "fieldtype": "Data",     "label": "Website",   "depends_on": "eval:doc.name" }
  ],
  "_state": {
    "0": {
      "transitions": {},
      "sideEffects": {},
      "labels": {},
      "primary": {}
    },
    "1": {
      "values": [0, 1],
      "options": ["Draft", "SignedUp"],
      "transitions": { "0": [1] },
      "labels":  { "0_1": "Sign Up" },
      "primary": { "0_1": true },
      "sideEffects": { "0_1": "Adapter.pocketbase.signUp" }
    }
  }
}


//prev.

{
  "schema_name": "UserPublicProfile",
  "doctype": "Schema",
  "title_field": "full_name",
  "_autosave": 0,
  "is_submittable": 1,
  "fields": [
    { "fieldname": "email",     "fieldtype": "Data",     "label": "Email",     "reqd": 1, "virtual": 1 },
    { "fieldname": "password",  "fieldtype": "Password", "label": "Password",  "reqd": 1, "virtual": 1 },
    { "fieldname": "full_name", "fieldtype": "Data",     "label": "Full Name", "reqd": 1 },
    { "fieldname": "section_identity", "fieldtype": "Section Break", "label": "Identity", "depends_on": "eval:doc.name" },
    { "fieldname": "title",     "fieldtype": "Data",     "label": "Title",     "depends_on": "eval:doc.name" },
    { "fieldname": "bio",       "fieldtype": "Text",     "label": "Bio",       "depends_on": "eval:doc.name" },
    { "fieldname": "linkedin",  "fieldtype": "Data",     "label": "LinkedIn",  "depends_on": "eval:doc.name" },
    { "fieldname": "website",   "fieldtype": "Data",     "label": "Website",   "depends_on": "eval:doc.name" }
  ],
  "_state": {
    "1": {
      "values": [0, 1],
      "options": ["Draft", "SignedUp"],
      "transitions": { "0": [1] },
      "labels": { "0_1": "Sign Up" },
      "primary": { "0_1": true },
      "sideEffects": { "0_1": "Adapter.pocketbase.signUp" }
    }
  }
},