//"Project" && (data.customer="Grant Plastics Ltd.")) || (doctype = "Schema"

file:///C:/python/script/exponanta-scripts/pb-docs-and-schemas.html



//get one and schema

// Even more efficient - single query version
async function fetchBothByNameOptimized(recordName) {
  try {
    // Get all records and let the filter handle the logic
    const records = await pb.collection('item').getFullList({
      filter: `name = "${recordName}"`
    });
    
    const record = records[0];
    if (!record) {
      throw new Error(`Record with name "${recordName}" not found`);
    }
    
    // Single query to get both document and schema
    const allRecords = await pb.collection('item').getFullList({
      filter: `name = "${recordName}" || (doctype = "Schema" && meta.for_doctype = "${record.doctype}")`
    });
    
    const document = allRecords.find(r => r.name === recordName);
    const schema = allRecords.find(r => r.doctype === 'Schema');
    
    return { document, schema };
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Usage examples
fetchBothByNameOptimized('TASK-2025-00011');


//get one 
async function fetchRecord() {
  try {
    const record = await pb.collection('item').getOne('a6v04us71cjkpp7');   //a6v04us71cjkpp7 - schema
    console.log('Record:', record);
  } catch (error) {
    console.error('Error fetching record:', error);
  }
}

fetchRecord();


//universal

async function fixMissingSchemasForDoctype(doctype) {
  const pb = new PocketBase('http://127.0.0.1:8090');

  // Fetch in sequence, NOT in Promise.all
  const docs = await pb.collection('item').getFullList(1000, {
    filter: `doctype="${doctype}"`
  });

  const schemas = await pb.collection('item').getFullList(1000, {
    filter: `doctype="Schema" && meta.for_doctype="${doctype}"`
  });

  if (schemas.length > 0) {
    const schemaName = schemas[0].name;

    for (const doc of docs) {
      if (!doc.meta?.schema) {
        await pb.collection('item').update(doc.id, {
          meta: { ...(doc.meta || {}), schema: schemaName }
        });
      }
    }
  }
}

// Example usage
fixMissingSchemasForDoctype("Task");




//adding schema to doctypes
(async () => {
  const pb = new PocketBase('http://127.0.0.1:8090');

  // Use unique requestKey for each fetch to avoid auto-cancel
  const tasks = await pb.collection('item').getFullList(1000, {
    filter: 'doctype="Task"'
  }, {
    requestKey: 'fetch-tasks'
  });

  const schemas = await pb.collection('item').getFullList(1000, {
    filter: 'doctype="Schema" && meta.for_doctype="Task"'
  }, {
    requestKey: 'fetch-schemas'
  });

  if (schemas.length > 0) {
    const schemaName = schemas[0].name;

    for (const doc of tasks) {
      if (!doc.meta?.schema) {
        await pb.collection('item').update(doc.id, {
          meta: { ...(doc.meta || {}), schema: schemaName }
        });
      }
    }
  }
})();




(async () => {
  const pb = new PocketBase('http://127.0.0.1:8090');
  
  const docs1 = await pb.collection('item').getFullList(1000, {
    filter: `doctype="Task"`
  });

  const docs2 = await pb.collection('item').getFullList(1000, {
    filter: `doctype="Schema"` && `meta.for_doctype="Task"`
  });
  //if docs1.meta.schema = Null or missing 
  // then set in all docs1.meta.schema to docs2[0].name
  const itemSet = docs.find(d => d.name === itemSetId && d.doctype === "Item Set");
  const lineItems = docs.filter(d => d.doctype === "Line Item");
  const prices = new Map(docs.filter(d => d.doctype === "Item Price")
    .map(p => [p.data.item_code, p]));
  
  // Get child names and fetch them
  const childNames = [...new Set(lineItems.map(l => l.data.child).filter(Boolean))];
  const childDocs = childNames.length ? await pb.collection('item').getFullList(200, {
    filter: childNames.map(name => `name="${name}"`).join(' || ')
  }) : [];
  
  const childMap = new Map(childDocs.map(d => [d.name, d]));
  
  // Resolve
  const resolvedLineItems = lineItems.map(line => ({
    lineItem: line,
    childDoc: childMap.get(line.data.child) || null,
    priceEntry: line.data.is_priced && childMap.get(line.data.child) ? 
      prices.get(childMap.get(line.data.child).data?.item_code || childMap.get(line.data.child).name) || null : null
  }));
  
  console.log(JSON.stringify({ itemSet, lineItems: resolvedLineItems }, null, 2));
})();




(async () => {
  const pb = new PocketBase('http://127.0.0.1:8090');
  const itemSetId = 'SET-2025-00001';
  
  // ONE QUERY TO GET EVERYTHING
  const docs = await pb.collection('item').getFullList(1000, {
    filter: `(name="${itemSetId}" && doctype="Item Set") || 
             (data.parent="${itemSetId}" && doctype="Line Item" && data.parenttype="Item Set") ||
             (doctype="Item Price" && data.selling=1)`
  });
  
  // Separate and build lookups
  const itemSet = docs.find(d => d.name === itemSetId && d.doctype === "Item Set");
  const lineItems = docs.filter(d => d.doctype === "Line Item");
  const prices = new Map(docs.filter(d => d.doctype === "Item Price")
    .map(p => [p.data.item_code, p]));
  
  // Get child names and fetch them
  const childNames = [...new Set(lineItems.map(l => l.data.child).filter(Boolean))];
  const childDocs = childNames.length ? await pb.collection('item').getFullList(200, {
    filter: childNames.map(name => `name="${name}"`).join(' || ')
  }) : [];
  
  const childMap = new Map(childDocs.map(d => [d.name, d]));
  
  // Resolve
  const resolvedLineItems = lineItems.map(line => ({
    lineItem: line,
    childDoc: childMap.get(line.data.child) || null,
    priceEntry: line.data.is_priced && childMap.get(line.data.child) ? 
      prices.get(childMap.get(line.data.child).data?.item_code || childMap.get(line.data.child).name) || null : null
  }));
  
  console.log(JSON.stringify({ itemSet, lineItems: resolvedLineItems }, null, 2));
})();