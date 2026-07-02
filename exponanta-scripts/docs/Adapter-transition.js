{
  "_allowed": "",
  "_allowed_read": "",
  "adapter_name": "memory",
  "config": "{\"operators\":{\"=\":\"String(a) === String(b)\",\"!=\":\"String(a) !== String(b)\",\">\":\"Number(a) > Number(b)\",\">=\":\"Number(a) >= Number(b)\",\"<\":\"Number(a) < Number(b)\",\"<=\":\"Number(a) <= Number(b)\",\"~\":\"new RegExp(b, 'i').test(String(a))\"}}",
  "doctype": "Adapter",
  "functions": "{\"transition\":\"async function(run_doc) { const name = run_doc.input.transition_name; const [from, to] = name.split(' → '); const t = run_doc.adapter.config.transitions[name]; if (!t) { run_doc.output = { final_state: to }; return run_doc; } if (t.run) { await coworker.run(t.run); } if (t.when) { const run = Object.values(CoworkerState.runs).find(r => Object.entries(t.when).every(([key, value]) => r[key] === value)); if (!run) throw new Error('Run failed: ' + name); } if (t.next) { run_doc.input.transition_name = t.next; return await run_doc.adapter.functions.transition(run_doc); } run_doc.output = { final_state: to }; return run_doc; }\"}",
  "id": "adapterypzff9x5",
  "is_default": 1,
  "name": "adapterypzff9x5"
}