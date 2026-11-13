# CODERULES.md

Distilled from `CW-CODING-RULES-v4.md` and `CODING-rules unresolved.js`, checked against the live code in `CW-state.js`, `CW-config.js`, `CW-utils.js`, `CW-run.js`, `CW-adapter-d1.js`. Where the code and the older rule files disagree, this file says which one wins.

## Top 10 patterns (followed in the code)

1. **`run_doc` is the only unit of work.** Every pipeline stage, adapter method and `onWrite`/`onCreate` hook takes `(run_doc)` and mutates it in place. Nothing returns a value; the operation is `run_doc.operation`, never a second argument.

2. **One fixed pipeline in `CW.controller`.** Resolve `.field` meta-channel → pre-select (update/delete) → `_logChanges` → `_mergeInput` → `_clearInput` → FSM signal *or* operation handler → `_preflight` → `_stripVirtual` → adapters → `_updateFromRun` → `_render`. After the merge, `target.data[0]` is the single source of truth and `input` is never read again.

3. **Run tree via `run_doc.child()`.** Children get `parent_run_id` and inherit `user`. Read child data with `CW._getChildRun(run_doc, fieldname)` from `CW.runs`; never store the child. Pass domain data through `input`, never new `run_doc` properties. `_expand` loads Table / Link / Relationship Panel / ChildRun fields as fire-and-forget select children.

4. **Config-driven resolution.** `CW._resolveAll` resolves operation/doctype aliases, adapter, view, component and container from `CW._config` and `view_components`. Callers never hardcode `component:` or `container:`.

5. **FSM in `_state`, driven by signals.** A signal is `_state["dim.From.To"] = ""`. `_handleSignal` validates transition, `requires` and `rules`, runs `sideEffects`, then writes `_state[dim] = toVal`; the signal key becomes `"1"` or `"-1"`. The `docstatus` dim is mirrored to top-level `doc.docstatus` for SQL. Fetch with `view: "form"` whenever FSM state is needed (`list` strips to `in_list_view` fields).

6. **Schema is declarative and compiled once.** `CW._compileSchemas` merges `systemFields`, then `doctypeFields`, into `schema.fields` / `schema._state` and compiles function strings. After that `schema.fields[*].onWrite/onCreate` is the only hook source (`_preflight` reads nothing else).

7. **Isomorphic adapters keyed on `globalThis.env?.DB`.** DB present → run SQL; absent (browser) → `_post` the `run_doc` to the hub. The Worker is a pure adapter executor and never calls `CW.controller` / `CW.run`.

8. **Security lives in the adapter and SQL, not the client.** `CW._config.sql.aclFilter` always sets `run_doc.d1.acl`, and `_assembleSQL` weaves it into every query. Public read never implies write. Create stamps `doc.domain` from `run_doc.user.domain` (taken from `Origin` in the Worker); a client-supplied domain is never trusted. Client schema `rules` are UI guards only.

9. **One `item` table + JSON `data`.** `_splitRecord` / `_mergeRecord` use `topLevelFields` / `dbColumns` to split real columns from the `data` blob. `autoname: "field:<x>"` is the one source for the semantic name (`_buildIndex`, the `name` field's `onCreate`, `generateId`).

10. **Global state behind a Proxy.** `CW-state.js` owns `CW.runs`, `current_run` and a lazily built index (`_invalidateIndex` on every change). Every run change fires `coworker:state:change`. `CW.<Doctype>` falls through to `globalThis`; `_compileDocument` installs compiled per-document functions there.

## Component and schema rules (from v4)

- Only one naked `CW.run`: the boot call via `cwStateFromUrl()`. Inside components and handlers use `run_doc.child()`.
- `React.useState` is for ephemeral UI only (dropdown, spinner, sort, local textarea). Never document data, selection, FSM state, or `rev` re-render hacks.
- Components are pure render functions of `run_doc`; field components take `{ run_doc, field }` and dispatch via `CW_FIELD_COMPONENTS[field.fieldtype]`. Components never fetch.
- Read a parent record through `CW.runs[run_doc.parent_run_id]?.target?.data?.[0]`, not new properties.
- Secondary classification field is always `docsubtype` (never `post_type`, `task_type`).
- Every `Link` has a matching `Table` on the parent. Never name a schema field `parent` (except `Relationship`). Relationship fieldtypes are only `Link`, `Table`, `Relationship Panel`.
- URL params only encode a `select`; operations are inferred at runtime.
- `top_parent` is propagated only when the schema has `is_hierarchical: 1`; same-doctype hierarchy handling is **pending, do not implement**.
- Schema declares UI via `view_components`, `explicit_edit_intent`, `row_renderer`, `primary`, `action_labels`.

## Function signatures

| Kind | Signature |
|---|---|
| Pipeline | `(run_doc)` |
| Path / child context | `(run_doc, path)`, path = `field.fieldname`; first line `run_doc = CW._getChildRun(run_doc, path) \|\| run_doc` |
| Grid actions | `(run_doc, row)` / `(run_doc, row, btn)`; `row` is the full record |
| Components | `({ run_doc, field })` |
| Adapter | `Adapter.select/create/update/delete(run_doc)` |

## Known drift — code vs. rule (decide before "fixing")

- **Extra arguments:** `_execTransition(run_doc, dim, key)` and `_expand(run_doc, fieldname)` don't follow the single-argument / `path` convention.
- **`run_doc` shape is not actually frozen:** code also sets `doctype`, `autosave`, `source_field`, `d1`, `_signal`, `owner`, `creation`, `docstatus`. Only `_signal` is in the v4 list.
- **`_state` format:** v4 rule 9 says `{ "0": 1 }` (integer dim values). The code stores semantic names (`_state.docstatus = "Draft"`) and keeps signal keys (`"docstatus.Draft.Submitted": "1"`) in `_state`. **The code wins; v4 rule 9 is outdated.**
- **Naked `CW.run`:** `CW._handlers.delete` and helpers in `CW-utils.js` call `CW.run` directly.
- **`eval` of schema/document strings** (`_compileSchemas`, `_compileDocument`) cannot run inside a Worker.
- **Dead code:** commented-out old `_compileSchemas` in `CW-state.js`; `CW.refetchGrid` in `CW-utils.js` (v4 says replaced by `child` with `render: true`).

## Session protocol

- **Scope:** make only the stated change; name other issues, don't fix them. Never refactor, rename or clean up outside the task.
- **Test first:** before proposing a fix, give an IIFE reproducing it (`;(async () => { ... })()` with the `assert(label, got, expected)` helper); update the same IIFE after the fix. Node tests (`node-tests.js`) are the non-browser equivalent.
- Full propose/confirm loop: `CLAUDE-PROTOCOL-use with preambule.txt`.
