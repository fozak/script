updateMany — summary
What was fixed:
Two changes to controller:

Added updateMany to the preselect condition so query fetches records before the handler runs
Guarded log/merge/clear with operation !== 'updateMany' so the handler owns the full pipeline per record

updateMany handler snapshots input once as patch, then per record: puts old record in target.data[0], restores patch into input, runs log → merge → clear → update.
How to call:
javascriptCW.run({
  operation:      'updateMany',
  target_doctype: 'Task',
  view:           'form',        // required for correct `from` in _changes
  query:          { where: { status: 'Pending' } },  // drives preselect
  input:          { exp_end_date: '2026-09-15' }     // patch applied to every record
});
query — filters which records to update. input — flat patch applied to all of them. view: 'form' — ensures full records are fetched so _logChanges has correct from values.no. give exact lines that was changedController — line 1: preselect condition
javascript// before
(run_doc.operation === "update" || run_doc.operation === "delete") &&

// after
(run_doc.operation === "update" || run_doc.operation === "delete" || run_doc.operation === "updateMany") &&
Controller — line 2: guard log/merge/clear
javascript// before
await CW._logChanges(run_doc);
CW._mergeInput(run_doc);
CW._clearInput(run_doc);

// after
if (run_doc.operation !== 'updateMany') {
  await CW._logChanges(run_doc);
  CW._mergeInput(run_doc);
  CW._clearInput(run_doc);
}
Handler — updateMany replaced:
javascriptupdateMany: async function (run_doc) {
  const docs  = run_doc.target?.data || [];
  const patch = { ...run_doc.input };

  for (let i = 0; i < docs.length; i++) {
    if (run_doc.error) break;

    run_doc.target.data[0] = docs[i];
    run_doc.input = { ...patch };

    await CW._logChanges(run_doc);
    CW._mergeInput(run_doc);
    CW._clearInput(run_doc);

    await CW._handlers.update(run_doc);

    docs[i] = run_doc.target.data[0];
  }

  run_doc.target.data = docs;
},