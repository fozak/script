



const fsmAdapter = {
  doctype: "Adapter",
  name: "fsm-controller",

  config: {
    // Map docstatus to FSM states
    docstatusMap: {
      0: "ready",
      1: "submitted", 
      2: "cancelled"
    },
    
    graph: {
      cold: { ready: { always: true } },
      ready: { 
        saving: { requires: "update" },
        submitting: { requires: "submit" },
        error: { always: true }
      },
      saving: { ready: { always: true } },
      submitting: { submitted: { always: true } },
      submitted: { cancelling: { requires: "cancel" } },
      cancelling: { cancelled: { always: true } },
      cancelled: { amending: { requires: "amend" } },
      amending: { ready: { always: true } }
    }
  },

  functions: {
    execute: `
      async function (run_doc) {
        // Sync FSM state with docstatus on entry
        if (run_doc.fsm.state === 'cold') {
          const targetState = this.config.docstatusMap[run_doc.doc.docstatus || 0];
          run_doc.fsm.state = targetState;
          run_doc._pipeline.state = 'fsm:' + targetState;
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
        const edge = this.config.graph[from]?.[to];
        
        if (!edge) {
          throw new Error('FSM: invalid transition ' + from + ' → ' + to);
        }

        if (!edge.always && edge.requires) {
          const behavior = this.getBehavior(run_doc);
          if (!behavior.guardian.allowOperations.includes(edge.requires)) {
            throw new Error('FSM: operation not allowed: ' + edge.requires);
          }
        }

        const action = this[from + '_to_' + to];
        if (action) await action.call(this, run_doc);
        
        run_doc.fsm.state = to;
        
        // Verify docstatus matches FSM state after action
        this.validateSync(run_doc);
      }
    `,

    validateSync: `
      function (run_doc) {
        const expectedState = this.config.docstatusMap[run_doc.doc.docstatus];
        const actualState = run_doc.fsm.state;
        
        // Allow transient states (saving, submitting, etc)
        if (!expectedState) return;
        
        // Terminal states must match
        if (['ready', 'submitted', 'cancelled'].includes(actualState)) {
          if (actualState !== expectedState) {
            throw new Error(
              'FSM: state mismatch - FSM=' + actualState + 
              ' but docstatus=' + run_doc.doc.docstatus
            );
          }
        }
      }
    `,

    // Actions that change docstatus
    submitting_to_submitted: `
      async function (run_doc) {
        run_doc.doc.docstatus = 1;
        run_doc._pipeline.state = 'fsm:submitted';
      }
    `,

    cancelling_to_cancelled: `
      async function (run_doc) {
        run_doc.doc.docstatus = 2;
        run_doc._pipeline.state = 'fsm:cancelled';
      }
    `,

    cancelled_to_amending: `
      async function (run_doc) {
        run_doc.doc.docstatus = 0;
        run_doc.doc.amended_from = run_doc.doc.name;
        run_doc.doc.name = null;
        run_doc._pipeline.state = 'fsm:amending';
      }
    `,

    amending_to_ready: `
      async function (run_doc) {
        // Amending → ready means we saved the new doc
        run_doc._pipeline.state = 'fsm:ready';
      }
    `
  }
};