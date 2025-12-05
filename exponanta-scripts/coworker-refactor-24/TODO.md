this works 

await coworker.run({
  operation: 'update',
  doctype: 'Task',
  query: { where: { name: 'TASK-2025-00008' } },
  input: { subject: 'Changing floors_ updated8' }
});

DOESNT WORK in FORM

in customer works
{
  "customer_name": "Jim Vorough - required field",
  "customer_type": "Individual",
  "name": "Jim Vorough",
  "salutation": "Master",
  "tax_id": "Testnumber"
}

assumption - some required fields 