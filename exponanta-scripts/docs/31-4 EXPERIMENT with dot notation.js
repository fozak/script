//the goal is to provide - dont USED

const Dotmem = new Proxy({}, {
  get(_, doctype) {
    if (typeof CoworkerState === 'undefined') return [];

    const rows = Object.values(CoworkerState.runs)
      .flatMap(r => r.output?.data || [])
      .filter(d => d.doctype === doctype);

    return new Proxy(rows, {
      get(target, prop) {
        // special helpers
        if (prop === 'count') return target.length;

        // field projection
        if (typeof prop === 'string' && prop in (target[0] || {})) {
          return target.map(r => r[prop]);
        }

        // lookup by name / id
        const found = target.find(r => r.name === prop || r.id === prop);
        if (found) return found;

        return target[prop]; // fallback (map, filter, etc.)
      }
    });
  }
});


const result = await coworker.run({
  operation: "takeone",        // CRUD operation
  doctype: "Adapter",         // target doctype
  query: {
    where: {
      adapter_name: "JSONPlaceholder" // your filter
    }
  }
});

//
result.output.data[0].functions

// 2️⃣ Deserialize JSON
const functionSources = JSON.parse(result.output.data[0].functions);

// 3️⃣ Capability registry (recommended over raw global)
globalThis.capabilities = globalThis.capabilities || {};

// 4️⃣ Activate functions
for (const [name, source] of Object.entries(functionSources)) {
  capabilities[name] = eval(`(${source})`);
}

// 5️⃣ (Optional) also expose directly on global for console use
Object.assign(globalThis, capabilities);

console.log("Activated capabilities:", Object.keys(capabilities));


// ============================================================================

const run_doc1 = {
  adapter: {
    name: result.output.data[0].adapter_name,
    config:
      typeof result.output.data[0].config === "string"
        ? JSON.parse(result.output.data[0].config)
        : result.output.data[0].config
  },
  input: {
    id: 1
  },
  target: {}
};

What happened step-by-step (based on your console output)
1️⃣ run_doc1 was created correctly
const run_doc1 = {
  adapter: {
    name: "JSONPlaceholder",
    config: { base_url: "...", timeout: 5000 }
  },
  input: { id: 1 },
  target: {}
};


✔ config is deserialized
✔ adapter context is correct
✔ target is mutable (important)

2️⃣ await get_post(run_doc1) executed successfully

Console shows:

Fetch finished loading: GET "https://jsonplaceholder.typicode.com/posts/1"


✔ HTTP call worked
✔ fetch available
✔ run_doc.adapter.config.base_url resolved correctly

3️⃣ Function mutated run_doc1.target (by design)

Result:

target: {
  doctype: "BlogPost",
  data: [
    {
      doctype: "BlogPost",
      name: "blogpost32l27dx",
      post_id: 1,
      user_id: 1,
      title: "...",
      body: "..."
    }
  ]
}


This proves:

The function received context

It ran inside your system, not standalone

It returned via mutation, not return value

Exactly how your adapter model intends.

Important subtle point (why await get_post(run_doc1) returns the same object)

Your function ends with:

return run_doc;


But since objects are passed by reference:

run_doc1 is already mutated

The returned value === the same object

So both of these are true:

await get_post(run_doc1);
run_doc1.target;        // populated


No copy. No transform. In-place execution.

Final confirmation (this is the “green light”)

✔ Adapter document loaded
✔ JSON config deserialized at execution boundary
✔ Functions activated
✔ Context passed
✔ Target produced

This is the cleanest possible confirmation that your design works.

From here, natural next steps (only if you want them):

add run_doc.success = true

attach run_doc.operation

enforce adapter permissions

sandbox function execution

But as-is: this is correct and done.
