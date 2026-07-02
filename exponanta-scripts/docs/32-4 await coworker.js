/*Issue is that there is no query over runs as we keep runs in memory  */

/* first you ran default db calls */

await coworker.run({
        operation: 'select',
        from: 'Schema',
        options: { adapter: 'pocketbase' }
      });







pb._currentAdapter = "run_memory"; /* otherwise its switching to default


'run_memory'
await coworker.run({
  operation: 'select',
  from: 'Run',
  options: { adapter: 'run_memory' }
});



await coworker.run({
        operation: 'select',
        from: 'Schema',
        options: { adapter: 'memory' }
      });


/* 1 Find the bootstrap run */
const bootstrapRun = Object.values(CoworkerState.runs)
  .find(run => 
    run.source_doctype === 'Schema' && 
    run.query?.where?._schema_doctype === undefined  // No filter = get all
  );

// Check success
console.log('Bootstrap success:', bootstrapRun?.success);
console.log('Schemas loaded:', bootstrapRun?.output?.data?.length);
VM746:9 Bootstrap success: true
VM746:10 Schemas loaded: 55

// Find the bootstrap run for Adapter etc
const bootstrapRun = Object.values(CoworkerState.runs)
  .find(run => 
    run.source_doctype === 'Adapter' && 
    run.query?.where?._schema_doctype === undefined  // No filter = get all
  );

// Check success
console.log('Bootstrap success:', bootstrapRun?.success);
console.log('Schemas loaded:', bootstrapRun?.output?.data?.length);

VM779:9 Bootstrap success: true
VM779:10 Schemas loaded: 3
undefined