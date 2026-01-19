const adapters = await coworker.run({
  operation: "select",
  from: "Adapter",
  view: "form",
  options: { includeSchema: true }
});


