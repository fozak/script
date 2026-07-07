step back from code to my architecture and operation. i think i need to refactor controller into 1) "checkpoints" over very strict stages on run_doc resolving of operations 2) switch to for ... each for part of controller on "batch" operations. on correspondent checkpoint

Yes. The controller right now is a linear sequence that assumes single-record throughout. What you're describing is:

Stage 1 — Resolve
_resolveInput, meta channel, operation inference

Stage 2 — Fetch (if needed)
preselect when no name

Stage 3 — Batch checkpoint
if target.data.length > 1 → iterate stages 4-6 per record, collect results, return

Stage 4 — Log
_logChanges (single record)

Stage 5 — Merge/Clear
_mergeInput, _clearInput (single record)

Stage 6 — Dispatch
_preflight, adapters, persist (single record)

So the batch checkpoint sits between fetch and log — exactly where single-record assumptions begin. Everything before it works on the run_doc as a whole, everything after works on one target.data[0].

Is that the right checkpoint placement?