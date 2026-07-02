const httpJsonAdapter = {
  adapter_name: "http-json",
  adapter_type: "external_api",
  
  config: {
    base_url: "https://jsonplaceholder.typicode.com",
    timeout: 5000
  },
  
  functions: {
    // ════════════════════════════════════════════════════════
    // execute = main operation (complete pipeline)
    // ════════════════════════════════════════════════════════
    execute: `
      async function (run_doc) {
        await this.functions.start(run_doc);
        
        run_doc.state.current = \`\${this.adapter_name}:execute\`;
        
        const res = await fetch(
          this.config.base_url + '/posts/' + run_doc.input.id
        );
        const data = await res.json();
        
        run_doc.target = {
          data: [{
            doctype: "BlogPost",
            name: "POST-" + data.id,
            post_id: data.id,
            user_id: data.userId,
            title: data.title,
            body: data.body
          }]
        };
        
        await this.functions.end(run_doc);
        return run_doc;
      }
    `,
    
    // ════════════════════════════════════════════════════════
    // create_post = another operation (complete pipeline)
    // ════════════════════════════════════════════════════════
    create_post: `
      async function (run_doc) {
        await this.functions.start(run_doc);
        
        run_doc.state.current = \`\${this.adapter_name}:create_post\`;
        
        const res = await fetch(
          this.config.base_url + '/posts',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: run_doc.input.title,
              body: run_doc.input.body,
              userId: run_doc.input.user_id || 1
            })
          }
        );
        
        const data = await res.json();
        
        run_doc.target = {
          data: [{
            doctype: "BlogPost",
            name: "POST-" + data.id,
            post_id: data.id,
            user_id: data.userId,
            title: data.title,
            body: data.body
          }]
        };
        
        await this.functions.end(run_doc);
        return run_doc;
      }
    `,
    
    // ════════════════════════════════════════════════════════
    // Helpers
    // ════════════════════════════════════════════════════════
    start: `
      async function (run_doc) {
        run_doc.state.current = \`\${this.adapter_name}:start\`;
      }
    `,
    
    end: `
      async function (run_doc) {
        run_doc.state.current = \`\${this.adapter_name}:end\`;
      }
    `
  }
};

// ════════════════════════════════════════════════════════
// Registry
// ════════════════════════════════════════════════════════
const AdapterRegistry = {
  "http-json": httpJsonAdapter
};

// ════════════════════════════════════════════════════════
// Hydration
// ════════════════════════════════════════════════════════
function hydrateAdapter(adapter) {
  if (adapter._hydrated) return;
  
  for (const [fnName, fnString] of Object.entries(adapter.functions)) {
    const fn = eval(`(${fnString})`);
    adapter.functions[fnName] = fn.bind(adapter);
  }
  
  adapter._hydrated = true;
}

// ════════════════════════════════════════════════════════
// Run
// ════════════════════════════════════════════════════════
async function run({ operation, input, options = {} }) {
  const adapter = AdapterRegistry[options.adapter];
  
  if (!adapter) {
    throw new Error(`Adapter "${options.adapter}" not found`);
  }
  
  hydrateAdapter(adapter);
  
  const run_doc = {
    operation,
    input,
    options,
    source: null,
    target: null,
    state: {
      current: null,
      stack: [],
      checkpoints: []
    }
  };
  
  // Call the operation function directly
  await adapter.functions[operation](run_doc);
  
  return run_doc;
}


/*====== USAGE ===============================================


// Main operation
await run({
  operation: "execute",
  input: { id: 5 },
  options: { adapter: "http-json" }
});

// Other operation
await run({
  operation: "create_post",
  input: { title: "Test", body: "Content" },
  options: { adapter: "http-json" }
});


*/