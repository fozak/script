Good catch! Here are the glitches and fixes:
javascript// ============================================================
// GLITCHES IN CURRENT DESIGN
// ============================================================

// GLITCH 1: Duplicate schemas across runs
// ────────────────────────────────────────────────────────────
// Run 1: Load all schemas
CoworkerState.runs['run_001'].output.data = [schema_Task, schema_Project, ...]

// Run 2: User queries Schema doctype again
CoworkerState.runs['run_050'].output.data = [schema_Task, schema_Project, ...]

// MEMORY_DB now has:
MEMORY_DB = [...40 schemas, ...40 DUPLICATE schemas, ...]
// → 80+ schemas instead of 40!


// GLITCH 2: Multiple user documents
// ────────────────────────────────────────────────────────────
// No flag for "current_user" vs other User documents
{doctype: 'User', name: 'admin@example.com'},
{doctype: 'User', name: 'user@example.com'},
{doctype: 'User', name: 'guest@example.com'}
// → Which one is the current user? 🤔


// ============================================================
// FIXES
// ============================================================

// FIX 1: Bootstrap with distinct system flag
// ────────────────────────────────────────────────────────────
await coworker.run({
  operation: 'select',
  doctype: 'Schema',
  input: { take: 1000 },
  options: { 
    adapter: 'pocketbase',
    render: false,
    system: true  // ← Flag as system/bootstrap data
  }
});

// Only query MEMORY_DB for system docs:
coworker.getSchema = function(doctype) {
  // Problem: MEMORY_DB has no run metadata!
  // Can't filter by options.system flag
};


// FIX 2: Dedicated system cache (separate from MEMORY_DB)
// ────────────────────────────────────────────────────────────
coworker.systemCache = {
  schemas: new Map(),
  user: null,
  config: null
};

coworker.bootstrap = async function() {
  // Load schemas
  const schemasRun = await this.run({
    operation: 'select',
    doctype: 'Schema',
    input: { take: 1000 },
    options: { adapter: 'pocketbase', render: false }
  });
  
  // Cache in separate structure
  schemasRun.output.data.forEach(s => 
    this.systemCache.schemas.set(s._schema_doctype, s)
  );
  
  // Load current user (with flag)
  const userRun = await this.run({
    operation: 'select',
    doctype: 'Current User',  // ← Special doctype
    input: { take: 1 },
    options: { adapter: 'pocketbase', render: false }
  });
  this.systemCache.user = userRun.output.data[0];
  
  // Load config
  const configRun = await this.run({
    operation: 'select',
    doctype: 'System Settings',
    input: { take: 1 },
    options: { adapter: 'pocketbase', render: false }
  });
  this.systemCache.config = configRun.output.data[0];
};

// Access from dedicated cache (not MEMORY_DB)
coworker.getSchema = function(doctype) {
  return this.systemCache.schemas.get(doctype);
};

coworker.getUser = function() {
  return this.systemCache.user;
};


// FIX 3: MEMORY_DB with deduplication
// ────────────────────────────────────────────────────────────
Object.defineProperty(window, 'MEMORY_DB', {
  get() {
    if (typeof CoworkerState === 'undefined') return [];
    
    const seen = new Map();
    const allDocs = Object.values(CoworkerState.runs)
      .flatMap(r => r.output?.data || []);
    
    // Deduplicate by doctype + name
    allDocs.forEach(doc => {
      const key = `${doc.doctype}:${doc.name}`;
      if (!seen.has(key)) {
        seen.set(key, doc);
      }
    });
    
    return Array.from(seen.values());
  }
});


// ============================================================
// RECOMMENDED SOLUTION: Hybrid
// ============================================================

// 1. System cache (Map-based, deduplicated by design)
coworker.systemCache = {
  schemas: new Map(),  // Key: _schema_doctype
  user: null,
  config: null
};

// 2. MEMORY_DB (deduplicated getter for runtime data)
Object.defineProperty(window, 'MEMORY_DB', {
  get() {
    const seen = new Map();
    Object.values(CoworkerState.runs)
      .flatMap(r => r.output?.data || [])
      .forEach(doc => {
        const key = `${doc.doctype}:${doc.name}`;
        seen.set(key, doc);  // Overwrites duplicates
      });
    return Array.from(seen.values());
  }
});

// 3. Bootstrap loads into systemCache
coworker.bootstrap = async function() {
  const [schemas, user, config] = await Promise.all([
    this.run({operation:'select', doctype:'Schema', input:{take:1000}}),
    this.run({operation:'select', doctype:'Current User', input:{take:1}}),
    this.run({operation:'select', doctype:'System Settings', input:{take:1}})
  ]);
  
  schemas.output.data.forEach(s => 
    this.systemCache.schemas.set(s._schema_doctype, s)
  );
  this.systemCache.user = user.output.data[0];
  this.systemCache.config = config.output.data[0];
};

// 4. System helpers use dedicated cache
coworker.getSchema = function(dt) {
  return this.systemCache.schemas.get(dt);
};
Best fix: Use systemCache (Map) for bootstrap data, MEMORY_DB (deduplicated) for runtime data. Clean separation! 🎯