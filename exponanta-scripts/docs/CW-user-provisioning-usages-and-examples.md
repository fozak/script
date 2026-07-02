Clean successful run. Here's what each network call maps to:
POST /api/collections/users/records          ← Step 1: create @users auth record
POST /api/collections/users/auth-with-password  ← Step 2: login
POST /api/collections/item/records           ← Step 3: create User item
POST /api/collections/item/records           ← Step 3A: create UserSettings
✅ User provisioned: user0am1gxpsi72
POST /api/collections/users/request-verification  ← Step 4: send verification email
GET  /api/collections/item/records/user0am1gxpsi72  ← _preflight read-back (checks existing)
POST /api/collections/item/records           ← _handlers.create: UserPublicProfile

Notable things in the run_doc
input: { _state: { '1.0_1': '' } } — by the time _handlers.create fires, input only has _state left. The email, password, full_name were consumed by the FSM sideEffect and are not passed to the PocketBase create call for UserPublicProfile. Clean.
_signal: "1.0_1" — confirms the FSM fired dimension 1, transition 0→1. Stamped on the run_doc for traceability.
owner: "system" on the Run record itself — because at the time the Run was created, no user was logged in yet. By the end of the pipeline user.name is user0am1gxpsi72, but the Run's owner field was stamped at _preflight time (before signUp ran).
user: { verified: false } — expected. Verification email was sent but user hasn't clicked it yet.
status: "completed", success: true — full pipeline succeeded including the GET read-back before the final POST.
target.data: Array(1) — the created UserPublicProfile record is in there.You said: what edges do we havewhat edges do we have11:26 AMClaude responded: From the run_doc, two visible edges:From the run_doc, two visible edges:
owner: "system" on the Run — stamped at _preflight before signUp fires. So every registration Run will always show owner: "system" even though by completion a real user exists. If you ever query Runs by owner to find "who created what," registration Runs are invisible to the user.
input is gutted by completion — email, password, full_name are gone from input by the time the run_doc is returned. They were passed to the sideEffect but not preserved. If something fails after signUp but before UserPublicProfile create, you have no way to retry from the run_doc — the input data needed to reproduce the operation isn't there.
UserPublicProfile created without full_name — the final POST /item/records for UserPublicProfile happens after input is gutted. Unless full_name is explicitly carried forward (e.g. stored on run_doc by _setUser or passed differently), the UserPublicProfile record may be missing it.
Worth checking target.data[0] — does it have full_name in the data payload?You said: give me console log to get by using last 11 chars in names of all docsgive me console log to get by using last 11 chars in names of all docs11:27 AMClaude responded: Gives you the three IDs, then fetch all three:javascriptObject.fromEntries(['user','usep','uses'].map(p => [p, p + 'user0am1gxpsi72'.slice(-11)]))
Gives you the three IDs, then fetch all three:
javascriptconst suffix = 'user0am1gxpsi72'.slice(-11)
const ids = ['user','usep','uses'].map(p => p + suffix)
const docs = await Promise.all(ids.map(id => pb.collection('item').getOne(id)))
docs.forEach(d => console.log(d.doctype, d.name, d.data))You said: in 1 jsin 1 js11:28 AMjavascriptconst docs = await Promise.all(['user','usep','uses'].map(p => pb.collection('item').getOne(p + 'user0am1gxpsi72'.slice(-11)))); docs.forEach(d => console.log(d.doctype, d.name, JSON.stringify(d.data)))You said: for p + 'user0am1gxpsi72'for p + 'user0am1gxpsi72'11:28 AMjavascriptconst docs = await Promise.all(['user','usep','uses'].map(p => pb.collection('item').getOne(p + '0am1gxpsi72'))); docs.forEach(d => console.log(d.doctype, d.name, JSON.stringify(d.data)))You said: User user0am1gxpsi72 {"docstatus":0,"doctype":"User","email":"denis1@test.User user0am1gxpsi72 {"docstatus":0,"doctype":"User","email":"denis1@test.com","id":"user0am1gxpsi72","name":"Denis One"}
VM1702:1 UserPublicProfile usep0am1gxpsi72 {"_changes":[{"at":1779290693805,"by":"user0am1gxpsi72","ch":[{"field":"title","from":null,"to":""}],"op":"update"}],"_state":{"1":1,"1.0_1":"1"},"creation":1779290497283,"full_name":"Denis One","modified":1779290693983,"modified_by":"user0am1gxpsi72","title":""}
VM1702:1 UserSettings uses0am1gxpsi72 {"email":"denis1@test.com","user":"user0am1gxpsi72"}11:28 AMClaude responded: Good data.Good data. Several things to note:
User — clean, has email and name (full_name). full_name edge confirmed not an issue — it's stored as name here.
UserPublicProfile — full_name: "Denis One" is present, so it did carry through. But also:

title: "" — empty, and there's already a _changes entry recording it was set to "". Means title field is being written as blank on create. Is that intentional or a schema default leaking through?
_state: { "1": 1, "1.0_1": "1" } — FSM state persisted on the data payload. "1": 1 means dimension 1 is in state 1. "1.0_1": "1" is the signal record. This is correct but worth confirming — is _state supposed to live inside data or is it a top-level field on the item record?

UserSettings — only has email and user. Very sparse. Is this by design (settings populated later on first use) or is the provisioning step supposed to stamp defaults like language, time_zone etc.?
The _changes entry on UserPublicProfile is the most interesting — it means something triggered an update after create. That GET + a subsequent write happened. What's at auth.js:161 after the provisioning log — is there a read-back and patch anywhere?
