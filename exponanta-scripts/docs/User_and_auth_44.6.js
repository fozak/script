Summary
userFields in config

CW._config.userFields is a new config array — same pattern as systemFields but scoped to User doctype only. Each entry has fieldname, optional in_local_view, and lifecycle hooks onCreate/onUpdate. Current entries:

javascript
userFields: [
  { fieldname: 'password_hash', onCreate: async fn }           // no in_local_view — must never reach client
  { fieldname: 'auth_status',   in_local_view: 1, onCreate: fn }
  { fieldname: 'email_status',  in_local_view: 1, onCreate: fn }
  { fieldname: 'owner',         in_local_view: 1, onCreate: fn }  // sets '' — User owns nothing
  { fieldname: '_allowed',      in_local_view: 1, onCreate: fn }  // sets [systemManager]
  { fieldname: '_allowed_read', in_local_view: 1, onCreate: fn }  // sets []
]
How userFields compile into schema

_compileSchemas runs two passes:

Pass 1 — main loop over all schemas:

Compiles _state sideEffects and rules from strings to functions
Merges systemFields into every schema's fields array — merge not replace, existing field props preserved, systemField props added on top

Pass 2 — after main loop, User only:

javascript
if (CW.Schema.User) {
  for (const uf of CW._config.userFields) {
    const idx = CW.Schema.User.fields.findIndex(f => f.fieldname === uf.fieldname)
    if (idx !== -1) CW.Schema.User.fields[idx] = { ...existing, ...uf }
    else            CW.Schema.User.fields.push(uf)
  }
}

Result — auth_status, email_status, password_hash pushed as new fields (not in Frappe schema). owner, _allowed, _allowed_read already existed — enriched with in_local_view and onCreate hooks merged in. onCreate functions survive compile because userFields loop has no onWrite/onCreate skip filter (unlike systemFields pass which strips hooks).

User concept — run_doc.user and currentUser as projection

Single invariant:

CW.Schema.User.fields[in_local_view: 1] = JWT payload shape = localStorage.currentUser shape

One declaration drives three consumers. buildPayload(doc) reads compiled schema, filters in_local_view fields, returns object. signJWT(payload) encodes it. run_doc.user = { ...payload, token } — decoded payload plus raw JWT string. localStorage.currentUser = run_doc.user — client stores it after auth operation returns.

run_doc.user has two lives:

Browser — stamped by CW.run factory from globalThis.currentUser, untrusted
Worker — overwritten from JWT verification before controller runs, trusted, frozen for entire request

globalThis.currentUser is set by client branch of adapter after receiving run_doc back from Worker. Not by adapter server branch (no localStorage on server). Not by Worker. Client owns the storage, Worker owns the verification.

What D1 create does — extracted

Three new functions added to CW-adapter-d1.js:

_d1Insert(run_doc) — extracted common insert logic:

Gets doc from run_doc.target.data[0]
Calls _splitRecord(doc) → { top, data }
Builds dynamic INSERT INTO item (topKeys, data) VALUES (?, ?, ...) SQL
Binds and runs via globalThis.env.DB.prepare().bind().run()
Sets run_doc.target, run_doc.success on success, run_doc.error on failure

createUser(run_doc) — User-specific create:

Step 1: iterates CW._config.userFields, calls f.onCreate(run_doc) for each — stamps password_hash, auth_status, email_status, owner, _allowed, _allowed_read onto doc
Step 2: calls _d1Insert(run_doc) — generic write
Step 3: buildPayload(doc) → signJWT(payload, JWT_SECRET) → run_doc.user = { ...payload, token }

create(run_doc) — isomorphic entry point:

javascript
async function create(run_doc) {
  if (!globalThis.env?.DB) { await _post(run_doc); return }  // browser → Worker
  if (run_doc.target_doctype === 'User') return createUser(run_doc)  // escape hatch
  await _d1Insert(run_doc)  // generic
}

Three helpers added to CW-utils.js and globalThis: pbkdf2, signJWT, verifyJWT, buildPayload.

Confirmed working — status: completed, success: true, password_hash correctly hashed, auth_status: 1, email_status: 0, JWT issued in run_doc.user.token.

What is NOT done — fields

in_local_view flags wrong on current compiled schema:

password_hash has in_local_view: 1 — must remove, hash must never reach client or JWT
_allowed has in_local_view: 1 — must remove, write ACL not needed client-side
_state has in_local_view: 1 — must remove, FSM state not needed in JWT
email, first_name have no in_local_view: 1 — must add, currently missing from run_doc.user

password field not virtual: 1 — raw password currently appears in _changes audit trail. Security issue, deferred.

tokenKey — not implemented yet. Currently in schema but not generated, not stored, not in JWT. Revocation mechanism not built.

What is NOT done — adapter

updateUser — not implemented. onUpdate hooks in userFields not defined. Password re-hash on change, tokenKey rotation, email immutability enforcement all missing.

select User — no special handling. Generic select returns whatever D1 has including password_hash. Needs in_local_view filter applied on select for User, or at minimum password_hash excluded from select results.

authWithPassword (login) — not implemented. No operation to verify credentials against password_hash in D1 and issue new JWT.

revoked_tokens — table not created, Worker not checking it, logout not implemented.

Anon → real promotion — not implemented. create + update flow not designed for D1 yet.

globalThis.currentUser storage — client branch of adapter after auth operations not yet wiring run_doc.user into localStorage.currentUser.