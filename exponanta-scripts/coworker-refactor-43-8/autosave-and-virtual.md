_autosave & virtual fields — Design Rules
_autosave
valuebehavior1 (default)fields save automatically on change via data-change branch in controller0no automatic saves — FSM transitions are the only save path
When _autosave: 0, every state where the user can edit must have an explicit Save transition:
json"transitions": { "0": [1], "1": [2], "2": [2] }
"labels":       { "0_1": "Sign Up", "1_2": "Save", "2_2": "Save" }
Without 1_2 and 2_2 — user edits are silently lost. With _autosave: 1 these transitions are unnecessary — fields save on change, FSM only carries business-meaningful transitions (0_1 Sign Up etc).

virtual fields
Virtual fields exist only as input carriers — they are never persisted to DB.
json{ "fieldname": "email", "fieldtype": "Data", "reqd": 1, "virtual": 1 }
Rules:

Consumed by sideEffects at create time (e.g. signUp reads email + password)
Stripped by _stripVirtual before DB write — never saved
Never present on loaded records
reqd validation for virtual fields must only fire on create, never update — _preflight uses !f.virtual filter on update

depends_on pattern for signup forms:
json{ "fieldname": "email",    "virtual": 1, "reqd": 1, "depends_on": "eval:!doc.name" },
{ "fieldname": "password", "virtual": 1, "reqd": 1, "depends_on": "eval:!doc.name" }
!doc.name — fields visible only before record is created. After signup they disappear. Profile fields use depends_on: "eval:doc.name" — opposite, appear only after record exists. Same schema, same form component, two distinct UX states.

Together — UserPublicProfile pattern
_autosave: 0          — explicit save only
virtual email/password — signup input, consumed once, never persisted
dim[1] FSM            — Sign Up (0_1) → Save (1_2) → Save (2_2)
depends_on !doc.name  — signup fields hidden after creation
depends_on doc.name   — profile fields shown after creation
One schema. One form component. Two completely different UX flows — signup and profile edit — driven entirely by schema declarations.