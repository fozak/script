const fsmAdapter = {
  doctype: "Adapter",
  name: "fsm-controller",

  config: {
    transitions: [
      "cold → loading_schemas",
      "loading_schemas → ready",
      "ready → saving",
      "saving → ready",
      "ready → error"
    ]
  },

  functions: {
    execute: `
      async function (run_doc) {
        if (!run_doc.fsm) {
          const first = this.config.transitions[0];
          const initial = first.split('→')[0].trim();
          run_doc.fsm = { state: initial };
        }

        const to = run_doc.options?.transition;
        if (!to) return run_doc;

        await this.transition(run_doc, to);
        return run_doc;
      }
    `,

    transition: `
      async function (run_doc, to) {
        const from = run_doc.fsm.state;
        const key = from + ' → ' + to;

        if (!this.config.transitions.includes(key)) {
          throw new Error('FSM: invalid transition ' + key);
        }

        const guard = this['can_' + from + '_to_' + to];
        if (guard && !(await guard.call(this, run_doc))) {
          throw new Error('FSM: guard blocked ' + key);
        }

        run_doc.fsm.state = to;

        const action = this[from + '_to_' + to];
        if (action) {
          await action.call(this, run_doc);
        }
      }
    `,

    // Guards
    can_ready_to_saving: `
      async function (run_doc) {
        return run_doc.ui?.fieldsEditable !== false;
      }
    `,

    // Actions
    cold_to_loading_schemas: `
      async function (run_doc) {
        run_doc._pipeline.state = 'fsm:loading_schemas';
      }
    `,
    loading_schemas_to_ready: `
      async function (run_doc) {
        run_doc._pipeline.state = 'fsm:ready';
      }
    `,
    ready_to_saving: `
      async function (run_doc) {
        run_doc._pipeline.state = 'fsm:saving';
      }
    `,
    saving_to_ready: `
      async function (run_doc) {
        run_doc._pipeline.state = 'fsm:ready';
      }
    `,
    ready_to_error: `
      async function (run_doc) {
        run_doc._pipeline.state = 'fsm:error';
      }
    `
  }
};

