//Later 
CW.controller = async function(run_doc) {
  await stage0_rbac(run_doc);            // User authorization check
  await stage1_guardInput(run_doc);      // Schema-level input validation
  await stage2_oplog(run_doc);
  await stage3_merge(run_doc);
  await stage4_validateTransform(run_doc);
  await stage5_fsm(run_doc);
  await stage6_systemFields(run_doc);
  await stage7_persist(run_doc);
  return run_doc;
};



// Single entry point
CW.controller = async function(run_doc) {
  await stage0_guardInput(run_doc);
  await stage1_oplog(run_doc);
  await stage2_merge(run_doc);
  await stage3_validateTransform(run_doc);
  await stage4_fsm(run_doc);
  //<-Apply system fields like modified 
  await stage5_persist(run_doc);
  return run_doc;
};

// Each stage is a separate function
async function stage0_guardInput(run_doc) {
  // Check input keys against schema read_only, system fields
}

async function stage1_oplog(run_doc) {
  // Append input delta to _oplog with causality
}

async function stage2_merge(run_doc) {
  // Object.assign(target.data[0], input)
}

async function stage3_validateTransform(run_doc) {
  // Validate required, types, compute fields, serialize
}

async function stage4_fsm(run_doc) {
  // Call FSM with merged state
}

async function stage5_persist(run_doc) {
  // Debounced _dbUpdate, clear input
}




// usage of version 3

const run_doc = { ... };
const proxy = new Proxy(run_doc, {
  set(target, key, value) {
    target[key] = value;
    if (key === "input") {
      coworker.controller(proxy);
    }
    return true;
  }
});



//version 3 
// elimitation of shot and streaming 

coworker.controller = async function(run_doc) {
  const options = run_doc.options || {};

  // Always merge immediately — target.data[0] is always current truth
  Object.assign(run_doc.target.data[0], run_doc.input);

  // Record causality before input gets collapsed
  if (Object.keys(run_doc.input).length > 0) {
    run_doc._oplog = run_doc._oplog || [];
    run_doc._oplog.push({
      delta:     { ...run_doc.input },
      timestamp: Date.now(),
      source:    options.source  || "user",
      trigger:   options.trigger || "unknown"
    });
  }

  // FSM always sees current merged state
  await coworker.fsm.handle(run_doc);

  // First call persists immediately — subsequent calls debounce
  // so user always gets at least one immediate save on first mutation
  if (!run_doc._saveTimer && Object.keys(run_doc.input).length > 0) {
    await coworker._dbUpdate(run_doc.target.data[0]);
    run_doc.input = {};
    return run_doc;
  }

  clearTimeout(run_doc._saveTimer);
  run_doc._saveTimer = setTimeout(async () => {
    if (Object.keys(run_doc.input).length === 0) return;
    await coworker._dbUpdate(run_doc.target.data[0]);
    run_doc.input = {};
    run_doc._saveTimer = null; // reset so next first mutation saves immediately
  }, options.debounce ?? 300);

  return run_doc;
};
First mutation saves immediately and awaits. Subsequent mutations within 300ms debounce. After timer fires and clears _saveTimer, next mutation is treated as first again.







// version 2
CW.controller = async function(run_doc) {
  const options = run_doc.options || {};

  // Merge input into target immediately so target.data[0] is always
  // the current truth — no stale reads anywhere in the system
  Object.assign(run_doc.target.data[0], run_doc.input);

  // Record every mutation with causality before it gets collapsed
  // into target — this is the only place we know what changed and why
  if (Object.keys(run_doc.input).length > 0) {
    run_doc._oplog = run_doc._oplog || [];
    run_doc._oplog.push({
      delta:     { ...run_doc.input },
      timestamp: Date.now(),
      source:    options.source  || "user",   // who caused the change
      trigger:   options.trigger || "unknown" // what event triggered it
    });
  }

  // FSM runs after merge so it always sees current document state
  // not a stale snapshot — transitions depend on current field values
  await coworker.fsm.handle(run_doc);

  // Shot mode: API call, import, programmatic update
  // Persist immediately and atomically — no debounce needed
  // caller expects the document to be saved when this returns
  if (options.shot) {
    if (Object.keys(run_doc.input).length > 0) {
      await coworker._dbUpdate(run_doc.target.data[0]);
      // Clear input only after confirmed DB write
      // so a failed write leaves input intact for retry
      run_doc.input = {};
    }
    return run_doc;
  }

  // Streaming mode: user is actively editing
  // Reset timer on every mutation so we only persist
  // after user pauses — not on every keystroke
  clearTimeout(run_doc._saveTimer);
  run_doc._saveTimer = setTimeout(async () => {
    // Input may have been cleared by a shot save or explicit save
    // that fired before this timer — skip if nothing to persist
    if (Object.keys(run_doc.input).length === 0) return;
    await coworker._dbUpdate(run_doc.target.data[0]);
    // Clear input after confirmed persist so failed writes
    // retain the delta for the next timer cycle to retry
    run_doc.input = {};
  }, options.debounce ?? 300);

  return run_doc;
};



// version 1


CW.controller = async function(run_doc) {
  const mode = run_doc.options.streaming ? "streaming" : "shot";
  
  // ── MERGE ──────────────────────────────────────────────
  Object.assign(run_doc.target.data[0], run_doc.input);
  
  // ── OPLOG (streaming only) ─────────────────────────────
  if (mode === "streaming" && Object.keys(run_doc.input).length > 0) {
    run_doc._oplog = run_doc._oplog || [];
    run_doc._oplog.push({
      delta:     { ...run_doc.input },
      timestamp: Date.now(),
      source:    options.source  || "user",
      trigger:   options.trigger || "unknown"
    });
  }

  // ── DIRTY ──────────────────────────────────────────────
  run_doc._state = run_doc._state || {};
  run_doc._state.dirty = Object.keys(run_doc.input).length > 0 ? 1 : 0;

  // ── FSM ────────────────────────────────────────────────
  await coworker.fsm.handle(run_doc);

  // ── PERSIST ────────────────────────────────────────────
  const shouldPersist = mode === "shot" || options.persist;
  
  if (shouldPersist) {
    await coworker._dbUpdate(run_doc.target.data[0]);
    run_doc.input       = {};
    run_doc._state.dirty = 0;
  }

  return run_doc;
};