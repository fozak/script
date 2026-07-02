// NOT IMLEMENTED VERSION  - PIPLELNE ETC 

Here's the updated set, with source[stage] and target sharing {data, meta, schema?} uniformly.
Controller:
jsCW.controller = async function (run_doc) {
  run_doc.status = 'running';
  run_doc.error  = null;

  try {
    CW._resolveInput(run_doc);

    const doc = () => run_doc.target?.data?.[0] || {};

    if (Object.entries(run_doc.input._state || {}).some(([,v]) => v === '')) {
      CW._mergeInput(run_doc);
      CW._clearInput(run_doc);
      const signal = Object.entries(doc()._state || {}).find(([,v]) => v === '');
      run_doc._signal = signal[0];
      await CW._handleSignal(run_doc);

    } else {
      const opConfig = CW._config.operations?.[run_doc.operation] || {};

      if (opConfig.type === 'read' || opConfig.type === 'auth') {
        await CW._handlers[run_doc.operation]?.(run_doc);

      } else {
        const schema   = CW.Schema?.[run_doc.target_doctype];
        const autosave = schema?._autosave ?? 1;

        if (autosave !== 0) {
          run_doc.source = run_doc.source || {};

          for (const stage of CW._getAdapters(run_doc)) {
            if (run_doc.error) break;
            run_doc.source[stage] = run_doc.source[stage] || { data: {}, meta: {} };
            await globalThis.Adapters[stage]?.[run_doc.operation]?.(run_doc);
          }

          if (!run_doc.error) await CW._runMerge(run_doc);

          if (!run_doc.error && run_doc.operation === 'create' && doc()?.name) {
            run_doc.query = Object.assign({}, run_doc.query, {
              where: { name: doc().name },
            });
          }
        }
      }
    }

    run_doc.status  = run_doc.error ? 'failed' : 'completed';
    run_doc.success = !run_doc.error;

  } catch (err) {
    run_doc.error = {
      message: err.message,
      code:    `${run_doc.operation?.toUpperCase()}_FAILED`,
    };
    run_doc.status  = 'failed';
    run_doc.success = false;
  }

  run_doc.modified = Date.now();
  if (CW._updateFromRun) CW._updateFromRun(run_doc);
  if (CW._render && run_doc.options?.render === true) CW._render(run_doc);
};
_runMerge:
jsCW._runMerge = async function (run_doc) {
  // PULL — promote declared fields from each source[stage].data → input
  for (const [stageName, bag] of Object.entries(run_doc.source || {})) {
    const declared = CW.Schema?.[stageName]?.fields?.map(f => f.fieldname) || [];
    const produced = bag?.data || {};
    for (const f of declared) {
      if (f in produced) run_doc.input[f] = produced[f];
    }
  }

  // LOG
  const chain = CW._getAdapters(run_doc);
  const skipLog = chain.some(a => CW._config.adapters.registry?.[a]?.logChanges === 0);
  if (!skipLog) await CW._logChanges(run_doc);

  // MERGE
  CW._mergeInput(run_doc);

  // CLEAN
  CW._clearInput(run_doc);

  // PREFLIGHT + STRIP VIRTUAL
  CW._preflight(run_doc);
  if (!run_doc.error) CW._stripVirtual(run_doc);
};
Adapter convention (e.g. fs.update):
jsasync function update(run_doc) {
  const bag = run_doc.source.fs;       // { data: {}, meta: {} } pre-created by controller
  bag.data.path      = path;
  bag.data.extension = extension;
  bag.data.directory = directory;
  bag.meta.duration_ms = Date.now() - start;
  bag.meta.status = 'ok';
}
Reading upstream (e.g. xlsx.update, reading what fs produced):
jsasync function update(run_doc) {
  const fsData = run_doc.source.fs?.data;
  if (!fsData?.path) return;

  const bag = run_doc.source.xlsx;     // pre-created by controller
  // ... compute ai_content, sheet_names ...
  bag.data.ai_content  = aiContent;
  bag.data.sheet_names = sheetNames;
  bag.meta.status = 'ok';
}
Summary of the change: run_doc.source[stage] is now { data: {...}, meta: {...} } — same two-key shape as target (schema omitted for source[stage] unless a stage genuinely needs its own schema reference, but the slot is available if so). PULL reads bag.data, gated by CW.Schema[stageName].fields. Controller pre-creates { data: {}, meta: {} } per stage instead of {}.You said: and list top 5 strategic issues not yet resolved - like input merged in target without cheking against schema fields, provenance not impemented etcand list top 5 strategic issues not yet resolved - like input merged in target without cheking against schema fields, provenance not impemented etc11:12 AMClaude responded: Top 5 unresolved strategic issues from this conversation:Top 5 unresolved strategic issues from this conversation:
1. _mergeInput writes unfiltered — no schema gate on what reaches target.data[0]
_mergeInput copies every key from input into target.data[0] with no check against CW.Schema[target_doctype].fields. PULL can promote ai_content/sheet_names (or anything else) into input, and it lands on the record regardless of whether CW.Schema['File'].fields declares it. No decision was made on whether the gate belongs in PULL (consumer-schema check), in _mergeInput itself, or nowhere — left explicitly open ("no decision as of now").
2. Provenance/audit trail for source[stage] data is undefined
_logChanges operates on input → target.data[0] diffs (the existing audit mechanism). But source[stage].data — the scratch produced by fs/xlsx/etc — is never logged itself, only whatever subset PULL promotes to input. If xlsx.update regenerates ai_content every run, there's no record of when, from what file version, or by which adapter run that content was last computed — the _changes log (per your memory: "provenance tracking via a _changes log") doesn't currently extend to per-stage adapter outputs, only to final merged-field diffs.
3. PULL's iteration is "all stages with a matching CW.Schema[stageName]" — collision/precedence across stages unresolved
The current _runMerge PULL loops over every source[stage], and for each, every field declared in CW.Schema[stageName].fields. If two stages (e.g. xlsx and some future pdf fallback, or fs and dispatch) both produce a field with the same name, later iteration silently overwrites earlier — no defined precedence, no collision detection. Order-dependent on Object.entries(run_doc.source) insertion order, which itself depends on chain order — implicit, undocumented.
4. merge as guaranteed post-loop step vs. configurable chain entry — partially resolved, not fully reconciled with doctypeAdapters chains as written
We concluded merge should be a guaranteed post-chain call (CW._runMerge), not a chain array entry — but earlier chain examples (['fs', 'dispatch', 'merge', 'pocketbase'], defaultChain: ['pocketbase-read', 'merge', 'pocketbase']) still list 'merge' explicitly. These configs weren't revised to drop 'merge' from the arrays now that it's implicit — so the config shape and the controller's actual behavior currently disagree.
5. CW.Schema[stageName] dual role — shape-descriptor for source[stage].data AND compile target for Adapters[stageName] functions — registry/lookup mechanics not finalized
We agreed doctype: "Schema" records can carry both fields (→ shape descriptor) and functions/config (→ Adapters[name]), compiled by a unified _compileSchemas. But the actual _compileSchemas code wasn't rewritten to add this second compile branch — it's a designed-but-unimplemented addition, and the interaction with existing _state-based schemas (do Task/Event schemas need to be excluded from the new branch, or does the branch naturally no-op for them via "no functions key present") wasn't verified against real schema records.






//working version 

// ============================================================
// CONTROLLER
// ============================================================

CW.controller = async function (run_doc) {
  run_doc.status = 'running';
  run_doc.error  = null;

  try {
    // 1. meta channel — input['.field'] → run_doc.field
    CW._resolveInput(run_doc);

if (
  (run_doc.operation === 'update' || run_doc.operation === 'delete') &&
  !run_doc.target?.data?.[0]?.name
) {
  //await globalThis.Adapters[CW._config.adapters.defaults.db].select(run_doc)

  // await CW._handlers.select(run_doc);

  const _savedOp = run_doc.operation;
  run_doc.operation = 'select';
  await CW._handlers.select(run_doc);
  run_doc.operation = _savedOp;
}

    await CW._logChanges(run_doc)  // ← before merge

    // 2. merge all input → target.data[0] (including virtual + _state)
    CW._mergeInput(run_doc);

    // 3. clear input — everything is now in target.data[0]
    CW._clearInput(run_doc);

    const doc = run_doc.target?.data?.[0] || {};

    // 4. dispatch: signal or data or operation
    const signal = Object.entries(doc._state || {}).find(([,v]) => v === '');

    if (signal) {
      run_doc._signal = signal[0];
      await CW._handleSignal(run_doc);
    } else {
      const opConfig = CW._config.operations?.[run_doc.operation] || {};
      if (opConfig.type === 'read' || opConfig.type === 'auth') {
        await CW._handlers[run_doc.operation]?.(run_doc);
      } else {
        // data change — create or update
        const schema   = CW.Schema?.[run_doc.target_doctype];
        const autosave = schema?._autosave ?? 1;
        if (autosave !== 0) {
          run_doc.operation = doc.name ? 'update' : 'create';
          await CW._handlers[run_doc.operation](run_doc);
          if (!run_doc.error && run_doc.operation === 'create' && run_doc.target?.data?.[0]?.name) {
            run_doc.query = Object.assign({}, run_doc.query, {
              where: { name: run_doc.target.data[0].name },
            });
          }
        }
      }
    }

    run_doc.status  = run_doc.error ? 'failed' : 'completed';
    run_doc.success = !run_doc.error;

  } catch (err) {     //line 475
    run_doc.error = {
      message: err.message,
      code:    `${run_doc.operation?.toUpperCase()}_FAILED`,
    };
    run_doc.status  = 'failed';
    run_doc.success = false;
  }

  run_doc.modified = Date.now();
  if (CW._updateFromRun) CW._updateFromRun(run_doc);
  if (CW._render && run_doc.options?.render === true) CW._render(run_doc);
};