this works 

await coworker.run({
  operation: 'update',
  doctype: 'Task',
  query: { where: { name: 'TASK-2025-00008' } },
  input: { subject: 'Changing floors_ updated8' }
});

