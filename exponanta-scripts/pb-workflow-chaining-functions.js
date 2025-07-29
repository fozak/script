// ==============================================
// 🔗 Simple Function Chain Engine for PocketBase
// Pure function composition approach
// ==============================================

// ==============================================
// 📋 Function Registry
// ==============================================
window.businessFunctions = window.businessFunctions || {};
window.functionChains = window.functionChains || {};

// Register a business function
pb.registerFunction = function(name, func, description = '') {
  window.businessFunctions[name] = {
    func,
    description,
    registeredAt: new Date().toISOString()
  };
  console.log(`✅ Registered function: ${name}`);
};

// Get registered function
pb.getFunction = function(name) {
  const registered = window.businessFunctions[name];
  return registered ? registered.func : null;
};

// ==============================================
// 🔗 Function Chain Registration
// ==============================================

// Register a function chain for specific trigger
pb.registerChain = function(doctype, trigger, functionNames, options = {}) {
  const key = `${doctype}.${trigger}`;
  
  if (!window.functionChains[key]) {
    window.functionChains[key] = [];
  }
  
  window.functionChains[key].push({
    functions: functionNames,
    async: options.async || [],
    condition: options.condition,
    description: options.description
  });
  
  console.log(`✅ Registered chain: ${key} -> [${functionNames.join(', ')}]`);
};

// Get chains for trigger
pb.getChains = function(doctype, trigger) {
  const key = `${doctype}.${trigger}`;
  return window.functionChains[key] || [];
};

// ==============================================
// 🚀 Function Pipeline Execution
// ==============================================

// Execute function pipeline
pb.runPipeline = async function(functionNames, doc, context = {}) {
  let result = { doc, context, success: true, errors: [] };
  
  console.log(`🔗 Running pipeline: [${functionNames.join(' → ')}]`);
  
  for (const functionName of functionNames) {
    try {
      console.log(`  🔄 Executing: ${functionName}`);
      
      const func = this.getFunction(functionName);
      if (!func) {
        throw new Error(`Function not found: ${functionName}`);
      }
      
      // Execute function with current result
      const startTime = Date.now();
      const output = await func(result.doc, result.context);
      const executionTime = Date.now() - startTime;
      
      // Update result
      if (output && typeof output === 'object') {
        result.doc = output.doc || result.doc;
        result.context = { ...result.context, ...output.context };
      }
      
      console.log(`  ✅ Completed: ${functionName} (${executionTime}ms)`);
      
    } catch (error) {
      console.error(`  ❌ Failed: ${functionName}`, error);
      result.errors.push({ function: functionName, error: error.message });
      result.success = false;
      break; // Stop on first error
    }
  }
  
  return result;
};

// Execute chains with async support
pb.executeChains = async function(doctype, trigger, doc, context = {}) {
  const chains = this.getChains(doctype, trigger);
  
  if (chains.length === 0) {
    console.log(`⏭️ No chains found for: ${doctype}.${trigger}`);
    return { success: true, results: [] };
  }
  
  const results = [];
  
  for (const chain of chains) {
    try {
      // Check condition if exists
      if (chain.condition) {
        const conditionMet = new Function('doc', 'context', `return ${chain.condition}`)(doc, context);
        if (!conditionMet) {
          console.log(`⏭️ Chain condition not met, skipping`);
          continue;
        }
      }
      
      // Separate sync and async functions
      const syncFunctions = chain.functions.filter(f => !chain.async.includes(f));
      const asyncFunctions = chain.functions.filter(f => chain.async.includes(f));
      
      // Execute sync functions in sequence
      let result = { doc, context, success: true };
      if (syncFunctions.length > 0) {
        result = await this.runPipeline(syncFunctions, doc, context);
      }
      
      // Execute async functions in parallel (fire and forget)
      if (asyncFunctions.length > 0) {
        asyncFunctions.forEach(funcName => {
          setTimeout(async () => {
            try {
              const func = this.getFunction(funcName);
              if (func) await func(result.doc, result.context);
            } catch (error) {
              console.error(`❌ Async function failed: ${funcName}`, error);
            }
          }, 0);
        });
      }
      
      results.push(result);
      
    } catch (error) {
      console.error(`❌ Chain execution failed:`, error);
      results.push({ success: false, error: error.message });
    }
  }
  
  return { success: results.every(r => r.success), results };
};

// ==============================================
// 🎯 Enhanced Document Operations
// ==============================================

// Enhanced updateDoc with chain execution
pb.updateDocWithChains = async function(name, data) {
  const existingDoc = await this.getDoc(name);
  if (!existingDoc) throw new Error(`Document not found: ${name}`);
  
  const oldDoc = { ...existingDoc };
  
  // Update the document
  const updatedDoc = await this.collection(window.MAIN_COLLECTION).update(existingDoc.id, { data });
  const fullUpdatedDoc = { ...existingDoc, data: { ...existingDoc.data, ...data } };
  
  // Detect changes and execute chains
  const context = { oldDoc, changes: data, timestamp: new Date().toISOString() };
  
  // Execute field change chains
  for (const [field, newValue] of Object.entries(data)) {
    if (oldDoc.data[field] !== newValue) {
      await this.executeChains(existingDoc.doctype, `field_change.${field}`, fullUpdatedDoc, {
        ...context,
        field,
        oldValue: oldDoc.data[field],
        newValue
      });
    }
  }
  
  // Execute status change chains
  if (data.status && oldDoc.data.status !== data.status) {
    await this.executeChains(existingDoc.doctype, `status_change.${data.status}`, fullUpdatedDoc, {
      ...context,
      oldStatus: oldDoc.data.status,
      newStatus: data.status
    });
  }
  
  // Execute general update chain
  await this.executeChains(existingDoc.doctype, 'after_update', fullUpdatedDoc, context);
  
  return updatedDoc;
};

// Enhanced createDoc with chain execution
pb.createDocWithChains = async function(doctype, data = {}) {
  // Create document first
  const doc = await this.createDoc(doctype, data);
  
  // Execute after_create chains
  await this.executeChains(doctype, 'after_create', doc, {
    timestamp: new Date().toISOString()
  });
  
  return doc;
};

// ==============================================
// 📝 Example Usage & Registration
// ==============================================

// Example business functions
pb.registerFunction('validateOrder', async (doc, context) => {
  console.log(`📋 Validating order: ${doc.name}`);
  if (!doc.data.customer) throw new Error('Customer is required');
  return { doc, context: { ...context, validated: true } };
});

pb.registerFunction('sendEmail', async (doc, context) => {
  console.log(`📧 Sending email for: ${doc.name}`);
  // Email logic here
  return { doc, context: { ...context, emailSent: true } };
});

pb.registerFunction('updateInventory', async (doc, context) => {
  console.log(`📦 Updating inventory for: ${doc.name}`);
  // Inventory logic here
  return { doc, context: { ...context, inventoryUpdated: true } };
});

pb.registerFunction('createDeliveryNote', async (doc, context) => {
  console.log(`🚚 Creating delivery note for: ${doc.name}`);
  // Create delivery note
  return { doc, context: { ...context, deliveryNoteCreated: true } };
});

pb.registerFunction('notifyWarehouse', async (doc, context) => {
  console.log(`🔔 Notifying warehouse for: ${doc.name}`);
  // Notification logic here
  return { doc, context: { ...context, warehouseNotified: true } };
});

// ==============================================
// 🚀 Example Chain Registrations
// ==============================================

// Sales Order status change chains
pb.registerChain('Sales Order', 'status_change.Submitted', [
  'validateOrder',
  'sendEmail'
]);

pb.registerChain('Sales Order', 'status_change.Approved', [
  'updateInventory',
  'createDeliveryNote',
  'sendEmail',
  'notifyWarehouse'
], {
  async: ['sendEmail', 'notifyWarehouse'], // These run async
  description: 'Handle sales order approval'
});

// Field change chains
pb.registerChain('Sales Order', 'field_change.customer', [
  'validateOrder'
]);

// General chains
pb.registerChain('Sales Order', 'after_create', [
  'validateOrder'
]);

console.log('🔗 Function Chain Engine loaded!');
console.log('💡 Example usage:');
console.log('await pb.updateDocWithChains("SO-001", { status: "Approved" });');