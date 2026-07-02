CW._compileDocument = async function(run_doc) {
  // run_doc is the complete run from CW.runs
  if (!run_doc || !run_doc.target || !run_doc.target.data) {
    console.error('Invalid run_doc structure:', run_doc);
    return;
  }
  
  const doc = run_doc.target.data[0];
  if (!doc) {
    console.warn('No document found in run_doc.target.data[0]');
    return;
  }
  
  // Initialize runtime if not exists
  if (!run_doc.target.runtime) {
    run_doc.target.runtime = {};
  }
  
  const namespace = doc.adapter_name || doc.name;
  
  // ─── Load Scripts (SDK) ─────────────────────────────────
  if (doc.scripts && Array.isArray(doc.scripts)) {
    for (const script of doc.scripts) {
      
      // Only process SDK scripts
      if (script.type === 'sdk' || (!script.type && script.src)) {
        const ns = script.namespace || namespace;
        
        // Already loaded globally?
        if (globalThis[ns]) {
          console.log(`✓ ${ns} already loaded`);
          continue;
        }
        
        // Has cached source?
        if (script.source && script.source.trim() !== "") {
          try {
            (0, eval)(script.source);
            console.log(`✓ Loaded ${ns} (cached)`);
          } catch (e) {
            console.error(`Failed to load ${ns} from cache:`, e);
            throw e;
          }
        }
        // Fetch from CDN
        else if (script.src) {
          try {
            console.log(`📥 Fetching ${ns} from CDN...`);
            
            const response = await Promise.race([
              fetch(script.src),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Fetch timeout')), 10000)
              )
            ]);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            
            script.source = await response.text();
            
            if (script.source.length < 100) {
              throw new Error('Source too small, likely corrupted');
            }
            
            (0, eval)(script.source);
            console.log(`✓ Loaded ${ns} from CDN (${(script.source.length / 1024).toFixed(1)}KB)`);
            
            // Verify global was created
            if (!globalThis[ns]) {
              console.warn(`⚠ ${ns} didn't create global, check namespace`);
            }
            
          } catch (error) {
            console.error(`❌ Failed to load ${ns}:`, error.message);
            throw error;
          }
        }
      }
    }
  }
  
  // ─── Compile Functions ──────────────────────────────────
  if (doc.functions) {
    Object.entries(doc.functions).forEach(([name, fnString]) => {
      try {
        run_doc.target.runtime[name] = eval(`(${fnString})`);
      } catch (e) {
        console.error(`Failed to compile function '${name}':`, e);
      }
    });
    console.log(`✓ Compiled ${Object.keys(doc.functions).length} function(s)`);
  }
  
  // ─── Call init() if present ─────────────────────────────
  if (run_doc.target.runtime.init) {
    try {
      run_doc.target.runtime.init(run_doc);
    } catch (e) {
      console.error('Init function failed:', e);
    }
  }
  
  return run_doc;
};
async ƒ (run_doc) {
  // run_doc is the complete run from CW.runs
  if (!run_doc || !run_doc.target || !run_doc.target.data) {
    console.error('Invalid run_doc structure:', run_doc);
    return;
  }
  
  c…
await CW._compileDocument(CW.getCurrentRun());
VM6918:31 ✓ PocketBase already loaded
VM6918:93 ✓ Compiled 5 function(s)
VM6923:1 ✓ PocketBase initialized: http://143.198.29.88:8090/
{doctype: 'Run', name: 'run0gi1niffdims', creation: 1770241680352, modified: 1770241680389, operation_key: '{"operation":"takeone","doctype":"Adapter","query"…e":"adapterb7l0z4ur"}},"options":{"render":true}}', …}