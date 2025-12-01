all runs are kept in coworkerState in my code // ============================================================
// COWORKER STATE - Centralized State Management
// ============================================================

window.CoworkerState = {
  runs: {},
  current_run: null,

  _updateFromRun: function(run_doc) {
    this.runs[run_doc.name] = run_doc;
    this.current_run = run_doc.name;
    
    // Emit state change event
    window.dispatchEvent(new CustomEvent('coworker:state:change', {
      detail: { run: run_doc }
    }));
  },So we have run_doc on every run. and // ============================================================================
// pb-adapter-memory.js - Queries CoworkerState.runs
// ============================================================================

pb._adapters = pb._adapters || {};

// Define MEMORY_DB as a getter that computes from CoworkerState
Object.defineProperty(window, 'MEMORY_DB', {
  get() {
    if (typeof CoworkerState === 'undefined') return [];
    return Object.values(CoworkerState.runs).flatMap(r => r.output?.data || []);
  },
  enumerable: true,
  configurable: true
});so basically we work with getter of runs array accumulated in coworkerState. give diagram of flow with ->Show moreHere's the data flow diagram:
┌─────────────────────────────────────────────────────────────┐
│ BOOTSTRAP (init session)                                    │
└─────────────────────────────────────────────────────────────┘

PocketBase DB
    │
    │ coworker.run({operation:'select', doctype:'Schema'})
    ↓
┌──────────────┐
│   run_doc    │ {name:'run_001', output:{data:[40 schemas]}}
└──────────────┘
    │
    │ CoworkerState._updateFromRun(run_doc)
    ↓
┌────────────────────────────────────────────────────────────┐
│ CoworkerState.runs = {                                     │
│   'run_001': {output:{data:[schema1, schema2, ...]}},     │
│   'run_002': {output:{data:[user]}},                       │
│   'run_003': {output:{data:[config]}}                      │
│ }                                                          │
└────────────────────────────────────────────────────────────┘
    │
    │ window.MEMORY_DB (computed getter)
    ↓
┌────────────────────────────────────────────────────────────┐
│ MEMORY_DB = [                                              │
│   ...run_001.output.data,  // 40 schemas                  │
│   ...run_002.output.data,  // 1 user                      │
│   ...run_003.output.data   // 1 config                    │
│ ]                                                          │
│ → Flat array of 42 documents                              │
└────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ RUNTIME ACCESS (zero DB calls)                             │
└─────────────────────────────────────────────────────────────┘

User calls: coworker.getSchema('Task')
    │
    ↓
MEMORY_DB.find(d => d._schema_doctype === 'Task')
    │
    │ (computes on-the-fly)
    ↓
Object.values(CoworkerState.runs)
    │
    ↓
.flatMap(r => r.output?.data || [])
    │
    ↓
[schema1, schema2, ...user, config]
    │
    │ .find(...)
    ↓
Return: {_schema_doctype:'Task', fields:[...]}


┌─────────────────────────────────────────────────────────────┐
│ NEW OPERATION (adds to pool)                                │
└─────────────────────────────────────────────────────────────┘

coworker.run({operation:'create', doctype:'Task', ...})
    │
    ↓
CoworkerState.runs['run_004'] = {..., output:{data:[new_task]}}
    │
    ↓
MEMORY_DB (auto-updates via getter)
    │
    ↓
[...existing 42 docs, new_task]  // Now 43 docs
Key insight: MEMORY_DB is a live computed view over CoworkerState.runs, not a separate cache! Every new run automatically expands the memory pool. 🔄DDExplain how long CoworkerState exist (is in js script) - unit reload of tab?CoworkerState lifetime:
javascript// ============================================================
// CoworkerState LIFECYCLE
// ============================================================

// CREATION
// ────────────────────────────────────────────────────────────
window.CoworkerState = { runs: {}, current_run: null };
// Created when: JavaScript file loads (page load/refresh)


// LIFETIME
// ────────────────────────────────────────────────────────────
Browser Tab Open (page active)
    │
    ├─ User navigates within SPA → CoworkerState PERSISTS ✅
    │  (React Router, no page reload)
    │
    ├─ User refreshes (F5/Ctrl+R) → CoworkerState DESTROYED ❌
    │  (JavaScript re-executes, window object resets)
    │
    ├─ User closes tab → CoworkerState DESTROYED ❌
    │  (Tab process terminated)
    │
    └─ User opens new tab → NEW CoworkerState instance ❌
       (Separate window object per tab)


// DESTRUCTION TRIGGERS
// ────────────────────────────────────────────────────────────
✅ PERSISTS through:
- SPA navigation (pushState/replaceState)
- AJAX/fetch calls
- DOM mutations
- React re-renders

❌ DESTROYED by:
- Page refresh (F5)
- Browser reload (Ctrl+R)
- Tab close
- Navigation to different domain
- window.location.href = '...' (full page load)


// DURATION
// ────────────────────────────────────────────────────────────
Typical session: 5 minutes to 2 hours
Max practical: Until browser tab closed or page refreshed


// MEMORY IMPLICATIONS
// ────────────────────────────────────────────────────────────
If user runs 1000 operations:
CoworkerState.runs = { run_001: {...}, ..., run_1000: {...} }
                      └─ ~1MB to 10MB (depending on data)

On refresh: Memory cleared, starts fresh ✅
Answer: CoworkerState exists from page load until page refresh/close. It's a pure JavaScript in-memory object with no persistence across page reloads. Session = single tab lifetime without refresh. 🔄DDand so getter MEMORY_DBExactly! MEMORY_DB has the same lifetime as CoworkerState:
javascript// ============================================================
// MEMORY_DB LIFECYCLE (identical to CoworkerState)
// ============================================================

// MEMORY_DB is just a COMPUTED VIEW over CoworkerState.runs
Object.defineProperty(window, 'MEMORY_DB', {
  get() {
    return Object.values(CoworkerState.runs).flatMap(r => r.output?.data || []);
  }
});


// TIMELINE
// ────────────────────────────────────────────────────────────

Page Load (t=0)
    │
    ↓
CoworkerState = { runs: {} }
MEMORY_DB = []  // Empty (getter returns [])
    │
    ↓ Bootstrap runs
CoworkerState.runs = { run_001: {...}, run_002: {...} }
MEMORY_DB = [schema1, schema2, ...user, config]  // 42 docs
    │
    ↓ User creates Task
CoworkerState.runs = { run_001, run_002, run_003 }
MEMORY_DB = [...42 docs, new_task]  // 43 docs (auto-updated!)
    │
    ↓ User refreshes (F5)
CoworkerState = { runs: {} }  // RESET ❌
MEMORY_DB = []  // RESET ❌
    │
    ↓ Bootstrap again
MEMORY_DB = [schema1, schema2, ...]  // Fresh load


// KEY PROPERTIES
// ────────────────────────────────────────────────────────────

✅ MEMORY_DB is ALWAYS in sync with CoworkerState.runs
   (it's computed on every access)

✅ No separate cache to manage
   (single source of truth: CoworkerState.runs)

✅ Auto-grows as operations run
   (every run with output.data expands MEMORY_DB)

❌ Zero persistence across page reload
   (must re-bootstrap on every session)

❌ Grows unbounded during session
   (no cleanup unless you manually delete from CoworkerState.runs)


// EXAMPLE SESSION
// ────────────────────────────────────────────────────────────

// t=0: Page loads
MEMORY_DB.length  // → 0

// t=1s: Bootstrap (3 runs)
MEMORY_DB.length  // → 42

// t=5min: User creates 10 tasks
MEMORY_DB.length  // → 52

// t=10min: User updates 5 tasks (creates 5 new run_docs)
MEMORY_DB.length  // → 52 (updates don't add docs, just modify)

// t=15min: User refreshes page
MEMORY_DB.length  // → 0 (everything lost!)

// t=16min: Bootstrap again
MEMORY_DB.length  // → 42 (back to baseline)
Summary: MEMORY_DB = ephemeral computed view with zero persistence. Lifetime = single page session (load → refresh/close). 🔄