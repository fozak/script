// ═══════════════════════════════════════════════════════════════
// Controller mutates run_doc, doesn't return new object
// ═══════════════════════════════════════════════════════════════

// React component has run_doc reference:
const run_doc = { /* ... */ };

// Call controller with mutations:
await coworker.controller.input(run_doc, { title: 'Updated' });

// Controller mutates run_doc in place:
// - run_doc.target.data[0].title = 'Updated'
// - run_doc.target.data[0]._states.available_actions = [...]

// React reads from SAME run_doc object:
const actions = run_doc.target.data[0]._states.available_actions;

// Render buttons:
{actions.map(action => <button>{action}</button>)}