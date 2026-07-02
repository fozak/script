How _changes works
_logChanges is called from the controller before _mergeInput. At that point run_doc.input still has the raw field values. It builds a from/to diff by comparing run_doc.input values against the current doc values, builds an entry, then calls _patchDataField to append it to PB.
_patchDataField does a fresh getOne from PB, reads the current _changes array, appends the new entry, and writes back. This is the safe append — always from PB truth, never from stale memory.

What's special about files
files+/files- are in the skip set in _logChanges — they can't be logged in the normal path because at controller time only the raw File object exists, not the PB-generated filename with suffix.
The real filename (bottom_cta_v17yjm2w8o.html) only exists after pb.update responds with pbResult.files.
So update() handles files separately — after the main save it compares filesBefore vs pbResult.files, and if they differ calls CW._logChanges(run_doc, explicitChanges) with the real filenames. This goes through the same _patchDataField path.

Where it was fixed
Original _patchDataField:
javascriptconst mergedData = { ...current.data, [fieldName]: value }  // value = full array from memory
value was next — built from doc._changes in memory before the fresh fetch. The fresh current was fetched but its _changes was ignored. If memory was stale, entries were overwritten.
Fixed _patchDataField:
javascriptconst existing   = Array.isArray(current.data[fieldName]) ? current.data[fieldName] : []
const mergedData = { ...current.data, [fieldName]: [...existing, value] }  // value = single entry
And in _logChanges passing entry not next:
javascriptawait _patchDataField(doc.name, '_changes', entry)
Now _patchDataField always appends to what PB actually has. Memory is never the source of truth for the append. Race condition eliminated.






//==================VERSION1 == WORKING
// ============================================================
// _patchDataField — partial update of a single data field in PB
// ============================================================

/*async function _patchDataField(docName, fieldName, value) {
  const collection = CW._config.collection
  const current    = await globalThis.pb.collection(collection).getOne(docName)
  const mergedData = { ...current.data, [fieldName]: value }
  await globalThis.pb.collection(collection).update(docName, { data: mergedData })
}*/

//=====change to fix

async function _patchDataField(docName, fieldName, value) {
  const collection = CW._config.collection
  const current    = await globalThis.pb.collection(collection).getOne(docName)
  const existing   = Array.isArray(current.data[fieldName]) ? current.data[fieldName] : []
  const mergedData = { ...current.data, [fieldName]: [...existing, value] }
  await globalThis.pb.collection(collection).update(docName, { data: mergedData })
}

// ============================================================
// _logChanges
// ============================================================

async function _logChanges(run_doc, explicitChanges = null) {
  if (run_doc.options?._logging === false) return
  if (!CW._config.systemSettings?.logChanges) return

  const doc = run_doc.target?.data?.[0]
  if (!doc?.name) return

  let changes

  if (explicitChanges) {
    changes = explicitChanges
  } else {
    const skip = new Set(['_changes', 'modified', 'modified_by', 'creation', 'files+', 'files-'])
    changes = Object.entries(run_doc.input)
      .filter(([k]) => !skip.has(k) && k !== '_state')
      .map(([k, v]) => ({ field: k, from: doc[k] ?? null, to: v }))
      .filter(c => JSON.stringify(c.from) !== JSON.stringify(c.to))
  }

  const signals = explicitChanges ? [] : Object.entries(run_doc.input._state || {})
    .filter(([, v]) => v === '')
    .map(([k]) => k)

  if (!changes.length && !signals.length) return

  const entry = {
    at: Date.now(),
    by: run_doc.user?.name || null,
    op: run_doc.operation,
    ...(changes.length && { ch: changes }),
    ...(signals.length && { sig: signals }),
  }

  const existing = Array.isArray(doc._changes) ? doc._changes : []
  const next     = [...existing, entry]

  try {
    //await _patchDataField(doc.name, '_changes', next)
    await _patchDataField(doc.name, '_changes', entry)
    doc._changes = next
  } catch (err) {
    console.warn('[CW] _logChanges failed:', err.message)
  }
}

/// ============================================================
// UPDATE — reads from target.data[0], no fetch, no merge
// ============================================================

async function update(run_doc) {
  const { collection } = globalThis.CW._config;
  const doc = run_doc.target?.data?.[0];
  if (!doc?.id && !doc?.name) {
    run_doc.error = '400 update: no target document';
    return;
  }

  const id = doc.id || doc.name

  // snapshot before _splitRecord consumes files+/files-
  const filesBefore = Array.isArray(doc.files) ? [...doc.files] : []
  const hasFileOp   = Object.keys(doc).some(k => /^[\w]+[+-]$/.test(k))

  const { top, data } = _splitRecord(doc)

  try {
    const pbResult  = await globalThis.pb.collection(collection).update(id, { ...top, data })
    run_doc.target  = { data: [_mergeRecord(pbResult)], meta: { updated: 1 } }
    run_doc.success = true

    // log file changes after PB responds — filenames now known
    if (hasFileOp && CW._config.systemSettings?.logChanges && run_doc.options?._logging !== false) {
      const filesAfter = pbResult.files || []
      if (JSON.stringify(filesBefore) !== JSON.stringify(filesAfter)) {
        await CW._logChanges(run_doc, [{
          field: 'files',
          from:  filesBefore,
          to:    filesAfter,
        }])
      }
    }

  } catch (err) {
    console.error('PB update error:', JSON.stringify(err.response?.data || err.message))
    run_doc.error = err.message
  }
}