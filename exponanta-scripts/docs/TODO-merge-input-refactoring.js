no after merge the target data becomes the source of truth only and should rewrite db

Yes — so after merge, target.data[0] is the full document to write. Everything in it goes to DB.

The problem is owner: "system" is in target.data[0] after merge — either from the pre-fetch or from input. And _splitRecord puts it in top fields, PocketBase validates it as a relation, fails.

The fix is _splitRecord should strip owner when it's not a valid user ID — or more precisely, on update, owner should never be in the write payload since it's set_on: 'create' only.

the owner in target should be initial, is he

Yes — on update, the pre-fetch populates target.data[0] with the existing record from DB, which has the original owner set at create time (e.g. "user0am1gxpsi72"). That's a valid user ID — PocketBase accepts it.

The problem is JSON.parse(JSON.stringify(r)) in your input contains owner: "system" which overwrites the valid owner during _mergeInput. Then _splitRecord sends "system" to PocketBase which fails relation validation.

So the fix is _preflight or _mergeInput should not let read_only fields from input overwrite target.data[0].

yes

So the fix is in _mergeInput — skip read_only fields:

js
const schema = CW.Schema?.[run_doc.target_doctype];
const readOnlyFields = new Set(
  (schema?.fields || [])
    .filter(f => f.read_only)
    .map(f => f.fieldname)
);

for (const [k, v] of Object.entries(run_doc.input)) {
  if (readOnlyFields.has(k)) continue;
  target[k] = v;
}
owner, creation, modified_by etc — all read_only: 1 in schema — never overwrite target.data[0] from input. Pre-fetched values survive untouched.

yes

So the owner problem is solved by this fix. And your JSON.parse(JSON.stringify(r)) as input will work correctly — owner: "system" gets skipped during merge, the pre-fetched valid owner stays in target.data[0], PocketBase accepts it.

Want to verify this is actually where _mergeInput lives in your code or move on?