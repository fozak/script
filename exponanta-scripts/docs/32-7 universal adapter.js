Let’s define a universal, functional Adapter template for your system, fully aligned with your run() + run_doc approach. This template will work for FSM transitions, business rules, schema validation, and field processing, with automatic persistence, error handling, and child operations.

🔹 Universal Adapter Template
const Adapter = {
  // ----------------------------
  // 1️⃣ Static config: constants, rules, run chains
  // ----------------------------
  config: {
    // Example FSM transitions
    transitions: {
      "cold → loading_schemas": {
        run: {
          operation: "select",
          from: "Schema",
          view: "form",
          options: { adapter: "pocketbase" }
        },
        when: {
          "0.status": "completed" // reference by child run index
        },
        next: "loading_schemas → loading_adapters"
      },
      "loading_schemas → loading_adapters": {
        run: {
          operation: "select",
          from: "Adapter",
          options: { adapter: "pocketbase" }
        },
        when: {
          "0.status": "completed"
        },
        next: "loading_adapters → ready"
      },
      "loading_adapters → ready": {}
    },

    // Generic business rules (Level 5)
    businessRules: [
      {
        name: "completedTaskRequiresFields",
        condition: "eval: run_doc.output.data[0].status === 'Completed'",
        fields: ["completed_by", "completed_on"],
        errorMessage: "Completed tasks must have 'completed_by' and 'completed_on'"
      }
    ],

    // Field dependencies (Level 6)
    fieldDependencies: [
      { fieldname: "review_date", dependsOn: "eval:run_doc.output.data[0].status === 'Closed' || run_doc.output.data[0].status === 'Pending Review'" }
    ]
  },

  // ----------------------------
  // 2️⃣ Functions: all async, receives run_doc
  // ----------------------------
  functions: {
    // Generic FSM transition function
    transition: async function(run_doc) {
      const name = run_doc.input.transition_name;
      const [from, to] = name.split(" → ");
      const t = run_doc.adapter.config.transitions[name];

      if (!t) {
        run_doc.output = { final_state: to };
        return run_doc; // persisted automatically by run()
      }

      // ✅ Run child operations if defined
      if (t.run) {
        const child_run_doc = await coworker.run(t.run); // auto-persisted
        run_doc.child_run_ids.push(child_run_doc.name);
      }

      // ✅ Evaluate "when" conditions
      if (t.when) {
        const allMet = Object.entries(t.when).every(([key, expected]) => {
          const [index, property] = key.split(".");
          const childRun = run_doc.child_run_ids[index]
            ? CoworkerState.runs[run_doc.child_run_ids[index]]
            : null;
          return childRun?.[property] === expected;
        });
        if (!allMet) {
          throw new Error(`Transition conditions not met: ${name}`);
        }
      }

      // ✅ Recurse to next transition if exists
      if (t.next) {
        run_doc.input.transition_name = t.next;
        return await run_doc.adapter.functions.transition(run_doc);
      }

      run_doc.output = { final_state: to };
      return run_doc; // auto-persisted
    },

    // Generic business rules evaluator (Level 5)
    evaluateBusinessRules: async function(run_doc) {
      const rules = run_doc.adapter.config.businessRules || [];
      for (const rule of rules) {
        try {
          const passed = eval(rule.condition); // run_doc in scope
          if (!passed) {
            if (!run_doc.errors) run_doc.errors = [];
            run_doc.errors.push({
              level: 5,
              rule: rule.name,
              message: rule.errorMessage
            });
          }
        } catch (err) {
          run_doc.errors = run_doc.errors || [];
          run_doc.errors.push({
            level: 5,
            rule: rule.name,
            message: err.message
          });
        }
      }

      run_doc.success = !run_doc.errors?.length;
      run_doc.status = run_doc.success ? "success" : "failed";
      return run_doc; // persisted automatically
    },

    // Example: field dependency evaluator (Level 6)
    evaluateFieldDependencies: async function(run_doc) {
      const deps = run_doc.adapter.config.fieldDependencies || [];
      for (const dep of deps) {
        const visible = eval(dep.dependsOn);
        run_doc.output.fieldVisibility = run_doc.output.fieldVisibility || {};
        run_doc.output.fieldVisibility[dep.fieldname] = visible;
      }
      return run_doc; // auto-persisted
    }
  }
};

🔹 Key Features of This Template

Universal run_doc context

Every function receives the same structure

Full path access: run_doc.output.data[0].status

All operations go through run()

Child operations auto-generate child run_docs

Hierarchy is tracked via child_run_ids

Config vs Functions separation

config = static constants, transitions, rules

functions = all executable logic on run_doc

Error reporting and semantic messages

Each Level can push structured errors into run_doc.errors

Level mapping in one Adapter

Level 3 = operations in t.run

Level 5 = business rules in evaluateBusinessRules()

Level 6 = field dependencies in evaluateFieldDependencies()

Level 7 = field processing can be another function

Highly reusable

Same adapter structure can handle any DocType

Minimal per-document boilerplate