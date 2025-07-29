// ==============================================
// 🔄 Simple Workflow Engine for PocketBase
// Based on Frappe's workflow pattern
// ==============================================

// ==============================================
// 📋 Simple Schemas
// ==============================================

// Workflow Definition
const workflowSchema = {
  name: "Workflow",
  fields: [
    { fieldname: "workflow_name", fieldtype: "Data", label: "Workflow Name", reqd: 1 },
    { fieldname: "document_type", fieldtype: "Data", label: "Document Type", reqd: 1 },
    { fieldname: "workflow_state_field", fieldtype: "Data", label: "State Field", default: "workflow_state" },
    { fieldname: "is_active", fieldtype: "Check", label: "Is Active", default: 1 }
  ]
};

// Workflow States
const workflowStateSchema = {
  name: "Workflow State",
  fields: [
    { fieldname: "workflow", fieldtype: "Link", options: "Workflow", reqd: 1 },
    { fieldname: "state_name", fieldtype: "Data", label: "State Name", reqd: 1 },
    { fieldname: "is_initial", fieldtype: "Check", label: "Is Initial State" },
    { fieldname: "is_final", fieldtype: "Check", label: "Is Final State" },
    { fieldname: "update_field", fieldtype: "Data", label: "Update Field" },
    { fieldname: "update_value", fieldtype: "Data", label: "Update Value" }
  ]
};

// Workflow Transitions 
const workflowTransitionSchema = {
  name: "Workflow Transition",
  fields: [
    { fieldname: "workflow", fieldtype: "Link", options: "Workflow", reqd: 1 },
    { fieldname: "action", fieldtype: "Data", label: "Action", reqd: 1 },
    { fieldname: "from_state", fieldtype: "Link", options: "Workflow State", reqd: 1 },
    { fieldname: "to_state", fieldtype: "Link", options: "Workflow State", reqd: 1 },
    { fieldname: "condition", fieldtype: "Code", label: "Condition Script" },
    { fieldname: "tasks", fieldtype: "JSON", label: "Transition Tasks" }
  ]
};

// ==============================================
// 🎯 Task Registry
// ==============================================
window.workflowTasks = window.workflowTasks || {};

// Register a workflow task
pb.registerWorkflowTask = function(taskName, taskFunction) {
  window.workflowTasks[taskName] = taskFunction;
  console.log(`✅ Registered workflow task: ${taskName}`);
};

// ==============================================
// 🔄 Core Workflow Functions
// ==============================================

// Apply workflow action to document
pb.applyWorkflow = async function(docName, action) {
  try {
    // Get the document
    const doc = await this.getDoc(docName);
    if (!doc) throw new Error(`Document not found: ${docName}`);
    
    // Get workflow for this document type
    const workflow = await this.getWorkflow(doc.doctype);
    if (!workflow) throw new Error(`No workflow found for: ${doc.doctype}`);
    
    // Get available transitions
    const transitions = await this.getTransitions(doc, workflow);
    
    // Find the requested transition
    const transition = transitions.find(t => t.action === action);
    if (!transition) throw new Error(`Invalid workflow action: ${action}`);
    
    // Check transition condition if exists
    if (transition.condition) {
      const conditionMet = new Function('doc', transition.condition)(doc);
      if (!conditionMet) throw new Error(`Transition condition not met for: ${action}`);
    }
    
    console.log(`🔄 Applying workflow action: ${action} on ${docName}`);
    
    // Update workflow state
    const updateData = {};
    updateData[workflow.workflow_state_field] = transition.to_state;
    
    // Get next state details
    const nextState = await this.getDoc(transition.to_state);
    
    // Update additional field if specified
    if (nextState.update_field && nextState.update_value) {
      updateData[nextState.update_field] = nextState.update_value;
    }
    
    // Execute transition tasks
    if (transition.tasks && Array.isArray(transition.tasks)) {
      await this.executeTransitionTasks(doc, transition.tasks);
    }
    
    // Update the document
    const updatedDoc = await this.updateDoc(docName, updateData);
    
    // Add workflow comment/log
    await this.addWorkflowComment(docName, action, transition.to_state);
    
    console.log(`✅ Workflow transition completed: ${action}`);
    return updatedDoc;
    
  } catch (error) {
    console.error(`❌ Workflow transition failed:`, error);
    throw error;
  }
};

// Get workflow for document type
pb.getWorkflow = async function(doctype) {
  const workflows = await this.listDocs('Workflow', 
    `data.document_type = "${doctype}" && data.is_active = true`
  );
  return workflows[0] || null;
};

// Get available transitions for current document state
pb.getTransitions = async function(doc, workflow) {
  const currentState = doc.data[workflow.workflow_state_field] || 'Draft';
  
  const transitions = await this.listDocs('Workflow Transition',
    `data.workflow = "${workflow.name}" && data.from_state = "${currentState}"`
  );
  
  return transitions.map(t => t.data);
};

// Execute transition tasks
pb.executeTransitionTasks = async function(doc, tasks) {
  for (const task of tasks) {
    try {
      const { name, async = false, params = {} } = task;
      
      if (!window.workflowTasks[name]) {
        console.warn(`⚠️ Workflow task not found: ${name}`);
        continue;
      }
      
      const taskFunction = window.workflowTasks[name];
      
      if (async) {
        // Execute asynchronously (don't wait)
        setTimeout(() => {
          taskFunction(doc, params).catch(err => 
            console.error(`❌ Async task failed: ${name}`, err)
          );
        }, 0);
      } else {
        // Execute synchronously
        await taskFunction(doc, params);
      }
      
      console.log(`✅ Task executed: ${name}`);
      
    } catch (error) {
      console.error(`❌ Task failed: ${task.name}`, error);
      // Continue with other tasks unless critical
      if (task.critical) throw error;
    }
  }
};

// Add workflow comment/log
pb.addWorkflowComment = async function(docName, action, newState) {
  try {
    await this.createDoc('Workflow Log', {
      document_name: docName,
      action: action,
      new_state: newState,
      user: 'current_user', // Replace with actual user
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Could not create workflow log:', error);
  }
};

// ==============================================
// 🔧 Setup Functions
// ==============================================

// Setup workflow schemas
pb.setupWorkflowSchemas = async function() {
  const schemas = [
    { 
      for_doctype: 'Workflow', 
      data: workflowSchema 
    },
    { 
      for_doctype: 'Workflow State', 
      data: workflowStateSchema 
    },
    { 
      for_doctype: 'Workflow Transition', 
      data: workflowTransitionSchema 
    }
  ];
  
  for (const { for_doctype, data } of schemas) {
    try {
      // Check if schema exists by meta.for_doctype
      const existing = await this.listDocs('Schema', `meta.for_doctype = "${for_doctype}"`);
      
      if (existing.length === 0) {
        await this.createSchema(for_doctype, data);
        console.log(`✅ Created schema: ${for_doctype}`);
      } else {
        console.log(`⏭️ Schema already exists: ${for_doctype}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create schema ${for_doctype}:`, error);
    }
  }
};

// ==============================================
// 📝 Example Usage
// ==============================================

// Register some common workflow tasks
pb.registerWorkflowTask('send_email', async (doc, params) => {
  console.log(`📧 Sending email for ${doc.name}:`, params.template);
  // Email sending logic here
});

pb.registerWorkflowTask('update_status', async (doc, params) => {
  console.log(`📝 Updating status for ${doc.name} to:`, params.status);
  // Status update logic here
});

pb.registerWorkflowTask('create_notification', async (doc, params) => {
  console.log(`🔔 Creating notification for ${doc.name}:`, params.message);
  // Notification creation logic here
});

// ==============================================
// 🚀 Usage Examples
// ==============================================


 //1. Setup schemas
await pb.setupWorkflowSchemas();

// 2. Create a workflow
await pb.createDoc('Workflow', {
  workflow_name: 'Sales Order Approval',
  document_type: 'Sales Order',
  workflow_state_field: 'approval_status',
  is_active: true
});

// 3. Create states
await pb.createDoc('Workflow State', {
  workflow: 'Sales Order Approval',
  state_name: 'Draft',
  is_initial: true
});

await pb.createDoc('Workflow State', {
  workflow: 'Sales Order Approval', 
  state_name: 'Pending Approval',
  update_field: 'submitted_date',
  update_value: new Date().toISOString()
});

// 4. Create transition
await pb.createDoc('Workflow Transition', {
  workflow: 'Sales Order Approval',
  action: 'Submit for Approval',
  from_state: 'Draft',
  to_state: 'Pending Approval',
  tasks: [
    { name: 'send_email', params: { template: 'approval_request' } },
    { name: 'create_notification', params: { message: 'Order submitted for approval' } }
  ]
});

// 5. Apply workflow action
await pb.applyWorkflow('SO-2024-001', 'Submit for Approval');


console.log('🔄 Simple Workflow Engine loaded!');
console.log('💡 Run pb.setupWorkflowSchemas() to get started');