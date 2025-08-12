/* Key inputs 
- all data and schemas are from ERPnext and stored in 1 collection item in PocketBase
item.name - used as id for all db operations - TASK-2025-00027 
item.doctype - text, doctype type - Task
item.meta - json, storing the doctype, and schema id of doctype schema:
{
  "doctype": "Task",
  "schema": "SCHEMA-0001"
}
item.data - json, json data of doc (Erpnext format)
{
  "_assign": null,
  "_comments": null,
  "_liked_by": null,
  "_seen": "[\"Administrator\"]",
  "_user_tags": null,
  "act_end_date": null,
  "act_start_date": null,
  "actual_time": 0,
  "closing_date": null,
  "color": "#39E4A5",
  "company": "Expo (Demo)",
  "completed_by": null,
  "completed_on": null,
  "creation": "2025-06-11 12:34:12.818353",
  "custom_attach": null,
  "custom_itemgroup": null,
  "custom_new_check": 0,
  "department": null,
  "depends_on_tasks": "",
  "description": "<div class=\"ql-editor read-mode\"><p><img src=\"/private/files/vYfr6wt.jpg?fid=3e162b69a8\" style=\"\" width=\"272\"></p></div>",
  "docstatus": 0,
  "duration": 0,
  "exp_end_date": "2025-06-11",
  "exp_start_date": "2025-06-11",
  "expected_time": 0,
  "idx": 1,
  "is_group": 1,
  "is_milestone": 0,
  "is_template": 0,
  "issue": null,
  "lft": 53,
  "modified": "2025-06-11 21:28:44.330211",
  "modified_by": "Administrator",
  "name": "TASK-2025-00027",
  "old_parent": "",
  "owner": "Administrator",
  "parent_task": null,
  "priority": "Low",
  "progress": 0,
  "project": "PROJ-0009",
  "project_code": null,
  "review_date": null,
  "rgt": 54,
  "start": 0,
  "status": "Overdue",
  "subject": "Interior inspections for 18-point inspections",
  "task_code": null,
  "task_weight": 0,
  "template_task": "TASK-2025-00020",
  "total_billing_amount": 0,
  "total_costing_amount": 0,
  "total_expense_claim": 0,
  "type": null,
  "workflow_state": null
}

in the same collection 'item', stored the SCHEMA for this doctype:
pb.getSchema = async function(doctype) {
    const schemaResult = await this.collection(window.MAIN_COLLECTION).getList(1, 1, {
       filter: `doctype = "Schema" && meta.for_doctype = "${doctype}"`
     });
         
    return schemaResult.items.length > 0 ? schemaResult.items[0].data : null;
};
result 
{
    "actions": [],
    "allow_import": 1,
    "autoname": "TASK-.YYYY.-.#####",
    "creation": "2013-01-29 19:25:50",
    "doctype": "DocType",
    "document_type": "Setup",
    "engine": "InnoDB",
    "field_order": [
      "subject",
      "project",
      "issue",
      "type",
      "color",
      "is_group",
      "is_template",
      "column_break0",
      "status",
      "priority",
      "task_weight",
      "parent_task",
      "completed_by",
      "completed_on",
      "sb_timeline",
      "exp_start_date",
      "expected_time",
      "start",
      "column_break_11",
      "exp_end_date",
      "progress",
      "duration",
      "is_milestone",
      "sb_details",
      "description",
      "sb_depends_on",
      "depends_on",
      "depends_on_tasks",
      "sb_actual",
      "act_start_date",
      "actual_time",
      "column_break_15",
      "act_end_date",
      "sb_costing",
      "total_costing_amount",
      "column_break_20",
      "total_billing_amount",
      "sb_more_info",
      "review_date",
      "closing_date",
      "column_break_22",
      "department",
      "company",
      "lft",
      "rgt",
      "old_parent",
      "template_task"
    ],
    "fields": [
      {
        "allow_in_quick_entry": 1,
        "fieldname": "subject",
        "fieldtype": "Data",
        "in_global_search": 1,
        "in_standard_filter": 1,
        "label": "Subject",
        "reqd": 1,
        "search_index": 1
      },

      ....
}

user is doctype "User", Browsing History is doctype "Browsing History", etc
*/

//key funsions defined in pb-document-lib.js already

//filestart:pb-document-lib.js:1-10
// pb-document-lib.js v1.02\
// // ==============================================
// 🎯 PocketBase Frappe Database Functions
// Name-based operations (names are globally unique IDs)
// ==============================================

(function() {
   function initPocketBaseFrappeLib() {
    if (typeof pb === 'undefined' || typeof PocketBase === 'undefined') {
      console.warn('PocketBase not ready, retrying in 100ms...');
      setTimeout(initPocketBaseFrappeLib, 100);
      return;
    }
  
  // Global config
  window.MAIN_COLLECTION = window.MAIN_COLLECTION || 'item';

  // ==============================================
  // 📋 Document Database Operations
  // ==============================================

  pb.getDoc = async function(name) {
    const records = await this.collection(window.MAIN_COLLECTION).getFullList({
      filter: `name = "${name}"`
    });
    return records.length > 0 ? records[0] : null;
  };

  pb.createDoc = async function(doctype, data = {}) {
    // Step 1: Create with temp name
    const tempDoc = await this.collection(window.MAIN_COLLECTION).create({
      doctype,
      name: `temp-${Date.now()}`,
      data
    });
    
    // Step 2: Update with proper name
    const finalName = `${doctype.replace(/\s+/g, '-')}-${tempDoc.id}`;
    await this.collection(window.MAIN_COLLECTION).update(tempDoc.id, {
      name: finalName
    });
    
    return { ...tempDoc, name: finalName };
  };

  pb.updateDoc = async function(name, data) {
    const doc = await this.getDoc(name);
    if (!doc) throw new Error(`Document not found: ${name}`);
    
    return await this.collection(window.MAIN_COLLECTION).update(doc.id, { data });
  };

  pb.deleteDoc = async function(name) {
    const doc = await this.getDoc(name);
    if (!doc) throw new Error(`Document not found: ${name}`);
    
    return await this.collection(window.MAIN_COLLECTION).delete(doc.id);
  };

  pb.listDocs = async function(doctype, filter = '') {
    let fullFilter = `doctype = "${doctype}"`;
    if (filter) fullFilter += ` && (${filter})`;
    
    return await this.collection(window.MAIN_COLLECTION).getFullList({ 
      filter: fullFilter 
    });
  };

  // ==============================================
  // 👥 Child Table Database Operations
  // ==============================================

  pb.createChild = async function(childDoctype, parentName, parentDoctype, parentField, data = {}) {
    const childData = {
      parent: parentName,
      parenttype: parentDoctype,
      parentfield: parentField,
      ...data
    };
    
    return await this.createDoc(childDoctype, childData);
  };

  pb.listChildren = async function(childDoctype, parentName) {
    return await this.collection(window.MAIN_COLLECTION).getFullList({
      filter: `doctype = "${childDoctype}" && data.parent = "${parentName}"`
    });
  };

  pb.updateChild = async function(childName, fieldName, value) {
    const child = await this.getDoc(childName);
    if (!child) throw new Error(`Child document not found: ${childName}`);
    
    const newData = { ...child.data, [fieldName]: value };
    return await this.collection(window.MAIN_COLLECTION).update(child.id, { data: newData });
  };

  pb.deleteChildren = async function(childNames) {
    const promises = childNames.map(async (name) => {
      const doc = await this.getDoc(name);
      if (doc) {
        return this.collection(window.MAIN_COLLECTION).delete(doc.id);
      }
    });
    return await Promise.allSettled(promises);
  };

  // ==============================================
  // 📝 Schema Database Operations
  // ==============================================

pb.getSchema = async function(doctype) {
    const schemaResult = await this.collection(window.MAIN_COLLECTION).getList(1, 1, {
       filter: `doctype = "Schema" && meta.for_doctype = "${doctype}"`
     });
         
    return schemaResult.items.length > 0 ? schemaResult.items[0].data : null;
};




// I am working on describing the frontend with React on abbstrct level like this 

/*currentUser is pb.collection('users') 
  .authWithPassword('xxx@example.com', '8o16dhxxxzmg4o9')
  .then(() => {
    console.log('✅ Login successful');
    console.log('📛 Username:', pb.authStore.model?.username);
    console.log('📧 Email:', pb.authStore.model?.email);
    console.log('🔐 Token:', pb.authStore.token);
  })
  .catch((err) => {
    console.error('❌ Login failed:', err);
  });
*/
 
function App({ currentUser }) {
  const [context, setContext] = React.useState(null);

  // Build context on mount (or when currentUserName changes)
  React.useEffect(() => {
    async function buildAppContext(currentUser) {


      const currentUser = await pb.getDoc(pb.authStore.model?.email); //this is correct as username defined by email is defined by pb.AuthStore

      const browsingHistory = await pb.listDocs("BrowsingHistory"); // pb filters itself and should provide only the current user's history

      const currentDoc = browsingHistory[0] ?? null;

      return {
        currentUser,
        browsingHistory,
        currentDoc,
        currentDoctype: currentDoc?.target_type ?? null,
        currentName: currentDoc?.target_name ?? null,
      };
    }

    buildAppContext(currentUserName).then(setContext);
  }, [currentUserName]);

  if (!context) return <div>Loading...</div>;

  // BrowsingHistoryNavigator component nested here with all logic
  return (
    <BrowsingHistoryNavigator context={context} />
  );

  // Navigation component with all logic inside:
  function BrowsingHistoryNavigator({ context }) {
    const { browsingHistory } = context;
    const [position, setPosition] = React.useState(
      browsingHistory.length > 0 ? browsingHistory.length - 1 : -1
    );

    const currentEntry = position >= 0 ? browsingHistory[position] : null;

    const goBack = () => {
      if (position > 0) setPosition(position - 1);
    };

    const goForward = () => {
      if (position < browsingHistory.length - 1) setPosition(position + 1);
    };

    return (
      <nav>
        <button onClick={goBack} disabled={position <= 0}>
          Back
        </button>
        <button onClick={goForward} disabled={position >= browsingHistory.length - 1}>
          Forward
        </button>
        <span>
          Current:{" "}
          {currentEntry
            ? `${currentEntry.target_type} - ${currentEntry.target_name}`
            : "None"}
        </span>
      </nav>
    );
  }
}

// i need to prototype frontend like 
<DocPage
  doctype={currentDoctype}
  name={currentName}
  dataProvider={() => pb.getDoc(currentDoctype, currentName)}
>
  <SidePanel>
    <DocList
      doctype={currentDoctype}
      filterBy={{ user: currentUser.id }}
      onSelect={(doc) => Router.navigate({ doctype: currentDoctype, name: doc.name })}
    />
    <NewButton
      onClick={() => {
        const name = pb.createDoc(currentDoctype, { user: currentUser.id });
        Router.navigate({ doctype: currentDoctype, name });
      }}
    />
  </SidePanel>

  <MainPanel>
    <DocHeader editableFields={["title"]} onUpdate={pb.updateDoc} />
    <DocBody editable onUpdate={pb.updateDoc} />
    <DocFooter>
      <DeleteButton
        onClick={() => {
          pb.deleteDoc(currentDoctype, currentName);
          Router.navigateToList(currentDoctype);
        }}
      />
    </DocFooter>
  </MainPanel>
</DocPage>

//QUESTION - what github react lib I might use to prototype this?

//prototype of main App
import React, { useState, useEffect } from 'react';

// Assuming pb is available globally from your existing setup
// and pb.authStore.model contains the current user

function App() {
  const [context, setContext] = useState(null);

  // Build context on mount (or when current user changes)
  useEffect(() => {
    async function buildAppContext() {
      try {
        // Get current user from PocketBase auth store
        const currentUser = pb.authStore.model;
        
        if (!currentUser) {
          throw new Error('No authenticated user');
        }

        // Get browsing history for current user
        // pb should filter automatically based on current user context
        const browsingHistory = await pb.listDocs("Browsing History");
        
        // Get the most recent browsing entry (last item in history)
        const currentDoc = browsingHistory.length > 0 ? browsingHistory[browsingHistory.length - 1] : null;
        
        return {
          currentUser,
          browsingHistory,
          currentDoc,
          currentDoctype: currentDoc?.data?.target_type ?? null,
          currentName: currentDoc?.data?.target_name ?? null,
        };
      } catch (error) {
        console.error('Error building app context:', error);
        return null;
      }
    }

    buildAppContext().then(setContext);
  }, [pb.authStore.model?.id]); // Re-run if user changes

  if (!context) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <div className="mt-2">Loading application context...</div>
        </div>
      </div>
    );
  }

  // BrowsingHistoryNavigator component nested here with all logic
  return <BrowsingHistoryNavigator context={context} />;

  // Navigation component with all logic inside:
  function BrowsingHistoryNavigator({ context }) {
    const { browsingHistory, currentUser } = context;
    const [position, setPosition] = useState(
      browsingHistory.length > 0 ? browsingHistory.length - 1 : -1
    );

    const currentEntry = position >= 0 ? browsingHistory[position] : null;

    const goBack = () => {
      if (position > 0) setPosition(position - 1);
    };

    const goForward = () => {
      if (position < browsingHistory.length - 1) setPosition(position + 1);
    };

    // Function to navigate to a specific document and update browsing history
    const navigateToDoc = async (doctype, name) => {
      try {
        // Create new browsing history entry
        await pb.createDoc("Browsing History", {
          target_type: doctype,
          target_name: name,
          user: currentUser.id,
          timestamp: new Date().toISOString()
        });

        // Reload context to get updated browsing history
        const updatedContext = await buildAppContext();
        setContext(updatedContext);
      } catch (error) {
        console.error('Error navigating to document:', error);
      }
    };

    return (
      <div className="container-fluid">
        {/* Bootstrap CSS */}
        <link 
          href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/css/bootstrap.min.css" 
          rel="stylesheet" 
        />

        {/* Navigation Bar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-light mb-4">
          <div className="navbar-brand">
            <strong>ERP Document System</strong>
          </div>
          
          <div className="navbar-nav mr-auto">
            <div className="nav-item">
              <div className="btn-group">
                <button 
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={goBack} 
                  disabled={position <= 0}
                  title="Go Back"
                >
                  ← Back
                </button>
                <button 
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={goForward} 
                  disabled={position >= browsingHistory.length - 1}
                  title="Go Forward"
                >
                  Forward →
                </button>
              </div>
            </div>
          </div>

          <div className="navbar-text">
            <strong>Current: </strong>
            {currentEntry ? (
              <span className="badge badge-primary">
                {currentEntry.data?.target_type} - {currentEntry.data?.target_name}
              </span>
            ) : (
              <span className="text-muted">None</span>
            )}
          </div>

          <div className="navbar-text ml-3">
            <small className="text-muted">
              User: {currentUser?.email || currentUser?.name || 'Unknown'}
            </small>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="row">
          <div className="col-12">
            
            {/* Context Information */}
            <div className="alert alert-info">
              <h6>Application Context</h6>
              <div className="row">
                <div className="col-md-3">
                  <strong>Current User:</strong><br />
                  <small>{currentUser?.email || currentUser?.name || 'N/A'}</small>
                </div>
                <div className="col-md-3">
                  <strong>Browsing History:</strong><br />
                  <small>{browsingHistory.length} entries</small>
                </div>
                <div className="col-md-3">
                  <strong>Current Position:</strong><br />
                  <small>
                    {browsingHistory.length > 0 ? `${position + 1} / ${browsingHistory.length}` : 'No history'}
                  </small>
                </div>
                <div className="col-md-3">
                  <strong>Current Document:</strong><br />
                  <small>
                    {currentEntry?.data?.target_type} - {currentEntry?.data?.target_name || 'None'}
                  </small>
                </div>
              </div>
            </div>

            {/* Browsing History Table */}
            {browsingHistory.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Browsing History</h6>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-sm table-striped">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Document Type</th>
                          <th>Document Name</th>
                          <th>Timestamp</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {browsingHistory.map((entry, index) => (
                          <tr 
                            key={entry.id || index} 
                            className={index === position ? 'table-active' : ''}
                          >
                            <td>
                              <span className="badge badge-secondary">{index + 1}</span>
                              {index === position && (
                                <span className="badge badge-success ml-1">Current</span>
                              )}
                            </td>
                            <td>
                              <span className="badge badge-info">
                                {entry.data?.target_type || 'Unknown'}
                              </span>
                            </td>
                            <td>
                              <code>{entry.data?.target_name || 'Unknown'}</code>
                            </td>
                            <td>
                              <small className="text-muted">
                                {entry.data?.timestamp ? 
                                  new Date(entry.data.timestamp).toLocaleString() : 
                                  'Unknown'
                                }
                              </small>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setPosition(index)}
                                disabled={index === position}
                              >
                                Go Here
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* No History State */}
            {browsingHistory.length === 0 && (
              <div className="alert alert-warning">
                <h6>No Browsing History</h6>
                <p className="mb-0">
                  No browsing history found for the current user. 
                  Start by navigating to a document to build your history.
                </p>
              </div>
            )}

            {/* Debug Information */}
            <div className="mt-4">
              <details className="mb-3">
                <summary className="btn btn-sm btn-outline-secondary">
                  Debug Information
                </summary>
                <div className="mt-2">
                  <div className="card">
                    <div className="card-body">
                      <h6>Raw Context Data:</h6>
                      <pre className="bg-light p-2" style={{ fontSize: '0.8em', maxHeight: '300px', overflow: 'auto' }}>
                        {JSON.stringify(context, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </details>
            </div>

          </div>
        </div>
      </div>
    );
  }
}

export default App;

// STOPPED HERE -> decide on browsingHistory https://chatgpt.com/c/68952b15-a7a0-8328-9b85-1694604d3891