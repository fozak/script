user = await CW.run({
  operation:      'create',
  target_doctype: 'UserPublicProfile',
  input:          { "email": "denis1@test.com", "password": "Test1234!", "full_name": "Denis One", _state: { '1.0_1': '' } }
})


CW User Provisioning — What We Have
The 4-piece split
One user = 4 separate records, each with a different concern:
DoctypeCollectionOwnerPurpose@usersPocketBase authPB managedAuth — email, password, tokenUseritem"" (none)Authorization — roles, admin-managedUserSettingsitemuserIdPreferences — self-service, privateUserPublicProfileitemuserIdIdentity — public-facing, world-readable

ID format: user{11}, usep{11}, uses{11}
All three item records share the same 11-char hash suffix derived from email, different 4-char prefix:
email: denis@test.com
User:              user062c67oyuz0
UserPublicProfile: usep062c67oyuz0
UserSettings:      uses062c67oyuz0
The hashEmail() function is a two-state multiply-xor, single pass O(n), no repetition in output (fixed in the session where old ycdd06ycdd0 repetition was identified and replaced).

generateId prefixes — EMAIL_KEYED map
javascriptconst EMAIL_KEYED = {
  'User':              'user',
  'UserPublicProfile': 'usep',
  'UserSettings':      'uses',
}
Schema needs autoname: "field:email" so _preflight → systemFields can call generateId with the email at create time.

Provisioning flow — single entry point
javascriptawait CW.run({
  operation:      'create',
  target_doctype: 'UserPublicProfile',
  input:          { email, password, full_name, _state: { '1.0_1': '' } }
})
The FSM signal 0_1 fires Adapter.pocketbase.signUp → calls provisionUser internally, which creates the first 3 records raw. CW _handlers.create then creates UserPublicProfile as the target doctype.
Why UserPublicProfile is NOT inside provisionUser: it's the CW target — if provisionUser created it too, you'd get a duplicate on every registration.

Module boundaries

auth.js — auth concern: @users, User item, login, requestVerification
provisionUser inside auth.js — also creates UserSettings (needs owner=userId set at login time)
CW _handlers.create — creates UserPublicProfile as the document concern
A future bootstrapUser(userId, name) was discussed for when more doctypes get added, to keep provisionUser clean


Status as of last session (May 5)
The provisioning doc CW-user-provisioning.md was generated and presented. The architecture was fully documented. The 4-way split was the settled design — nothing was deferred or marked as TODO on the split itself.You said: explain state: { '1.explain _state: { '1.0_1': '' }. is the flow, first create record then appy the signal11:18 AMClaude responded: No — the signal fires before the record is created.No — the signal fires before the record is created. Here's the exact sequence:
CW.run({ operation: 'create', target_doctype: 'UserPublicProfile', input: { ..., _state: { '1.0_1': '' } } })
  → _preflight (stamps doctype, owner, modified, etc.)
  → FSM sees _state: { '1.0_1': '' }
  → fires signal 0_1 in dimension 1
  → sideEffect: Adapter.pocketbase.signUp(run_doc)
      → provisionUser()  ← @users, User, UserSettings created here
      → _setUser()       ← pb.authStore now has logged-in user
  → _handlers.create
      → systemFields (autoname → generateId → usep + hash)
      → pb.item.create(UserPublicProfile)  ← record created HERE
So _state: { '1.0_1': '' } is a signal pre-loaded into the input — it tells the FSM to fire transition 0→1 in dimension 1 before the document hits the adapter.

Breaking down '1.0_1'
The key format is dimension.from_to:

1 — dimension index (which FSM axis)
0 — from state
1 — to state
value '' — just a trigger, no payload needed

So { '1.0_1': '' } means: "in dimension 1, fire the transition from state 0 to state 1."
That transition is where signUp is wired as the sideEffect in the UserPublicProfile schema.

Why this design
The FSM fires mid-pipeline intentionally. By the time _handlers.create runs, the user is already authenticated (pb.authStore is set), so systemFields can correctly stamp owner = pb.authStore.model.id on the UserPublicProfile record. If creation happened first, owner would be empty — the user doesn't exist yet.
The signal in input._state is the mechanism for saying "this create operation has a lifecycle event attached to it."