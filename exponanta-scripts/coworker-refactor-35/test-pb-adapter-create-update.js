
const createRun = await coworker.run({
  operation: 'create',
  target_doctype: 'Customer',
  input: {
    doctype: 'Customer',
    customer_name: 'Acme Corporation',
    status: 'Active',
    city: 'New York'
  }
});

console.log('Created record:', createRun.target.data[0]);


const pbRecord = await pb.collection('item').getOne(createRun.target.data[0].id);
console.log('\n📦 PocketBase Record Structure:');
console.log('Top Level:', {
  id: pbRecord.id,
  name: pbRecord.name,
  doctype: pbRecord.doctype
});
console.log('Data Field:', {
  id: pbRecord.data.id,
  name: pbRecord.data.name,
  doctype: pbRecord.data.doctype,
  customer_name: pbRecord.data.customer_name
});
console.log('\n✅ Structure Validation:');
console.log('  id matches:', pbRecord.id === pbRecord.data.id);
console.log('  name matches:', pbRecord.name === pbRecord.data.name);
console.log('  name = id:', pbRecord.name === pbRecord.id);
console.log('  doctype matches:', pbRecord.doctype === pbRecord.data.doctype);

// Test UPDATE
const updateRun = await coworker.run({
  operation: 'update',
  source_doctype: 'Customer',
  input: {
    name: createRun.target.data[0].name,
    doctype: 'Customer',
    customer_name: 'Acme Corp UPDATED',
    status: 'Premium'
  }
});

console.log('\nUpdated record:', updateRun.target.data[0]);


const pbRecordAfter = await pb.collection('item').getOne(updateRun.target.data[0].id);
console.log('\n📦 After Update:');
console.log('Top Level:', {
  id: pbRecordAfter.id,
  name: pbRecordAfter.name,
  doctype: pbRecordAfter.doctype
});
console.log('Data Field:', {
  id: pbRecordAfter.data.id,
  name: pbRecordAfter.data.name,
  customer_name: pbRecordAfter.data.customer_name
});
