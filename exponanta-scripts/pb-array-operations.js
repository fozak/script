//get docs from pb

//then

const flatDocs = docs.map(doc => ({
  ...doc.data,      // spread all keys from data
  name: doc.name,    // overwrite data.name with top-level name
  doctype: doc.doctype
}));

flatDocs[0].name

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
    "color": null,
    "company": "Expo (Demo)",
    "completed_by": null,
    "completed_on": null,
    "creation": "2025-04-16 23:40:51.669427",
    "custom_attach": null,
    "custom_itemgroup": null,
    "custom_new_check": 0,
    "department": null,
    "depends_on_tasks": "",
    "description": null,
    "docstatus": 1,
    "duration": 0,
    "exp_end_date": null,
    "exp_start_date": null,
    "expected_time": 0,
    "idx": 2,
    "is_group": 0,
    "is_milestone": 0,
    "is_template": 0,
    "issue": null,
    "lft": 5,
    "modified": "2025-05-21 19:54:04.418572",
    "modified_by": "Administrator",
    "name": "TASK-2025-00003",
    "old_parent": "",
    "owner": "Administrator",
    "parent_task": null,
    "priority": "Low",
    "progress": 0,
    "project": "PROJ-0009",
    "project_code": null,
    "review_date": null,
    "rgt": 6,
    "start": 0,
    "status": "Open",
    "subject": "New Task Created4",
    "task_code": null,
    "task_weight": 0,
    "template_task": null,
    "total_billing_amount": 0,
    "total_costing_amount": 0,
    "total_expense_claim": 0,
    "type": "RFI",
    "workflow_state": "Pending",
    "doctype": "Task"
}

function createArrayDB(arr) {
  return {
    // ==============================================
    // Generate a random ID
    // ==============================================
    generateId: async function () {
      const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
      let id = '';
      for (let i = 0; i < 15; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
      }
      return id;
    },

    // ==============================================
    // Get a document by name
    // ==============================================
    getDoc: async function (name) {
      const doc = arr.find(d => d.name === name);
      return doc || null;
    },

    // ==============================================
    // Update a document by name
    // ==============================================
    updateDoc: async function (name, newData) {
      const index = arr.findIndex(d => d.name === name);
      if (index === -1) throw new Error(`Document not found: ${name}`);

      arr[index] = { ...arr[index], ...newData };
      return arr[index];
    },

    // ==============================================
    // Delete a document by name
    // ==============================================
    deleteDoc: async function (name) {
      const index = arr.findIndex(d => d.name === name);
      if (index === -1) throw new Error(`Document not found: ${name}`);

      const [deleted] = arr.splice(index, 1);
      return deleted;
    },

    // ==============================================
    // List documents by doctype with optional filter function
    // ==============================================
    listDocs: async function (doctype, filterFn = null) {
      let result = arr.filter(d => d.doctype === doctype);
      if (typeof filterFn === 'function') {
        result = result.filter(filterFn);
      }
      return result;
    },

    // ==============================================
    // Create a new document
    // ==============================================
    createDoc: async function (data) {
      if (!data.name) data.name = await this.generateId();
      arr.push(data);
      return data;
    },
  };
}
