//last proposal

async function CW.run(operation, doctype, input) {
  
  const schema = CW.Schema[doctype];
  
  // ============================================================
  // PHASE 1: INPUT VALIDATION (guard - validate user input only)
  // ============================================================
  
  // Build minimal run_doc with just user input
  const run_doc = {
    operation: operation,
    schema: schema,
    target: { 
      doctype: doctype, 
      data: [{ ...input }]  // ONLY user input
    }
  };
  
  await CW.inputValidated(run_doc);
  // - iterate only through input fields
  // - validate types, formats, required, unique
  // - NO system fields, NO defaults yet
  
  // ============================================================
  // PHASE 1.5: APPLY SYSTEM SCHEMA (generate system fields)
  // ============================================================
  
  const doc = run_doc.target.data[0];
  
  // System fields
  doc.id = generateId();
  doc.owner = null;
  doc.creation = new Date().toISOString();
  doc.modified = new Date().toISOString();
  doc.docstatus = 0;
  doc._allowed = [];
  doc._allowed_read = ["role_user"];
  
  // Schema defaults
  for (const field of schema.fields) {
    if (field.default && !(field.fieldname in doc)) {
      doc[field.fieldname] = field.default;
    }
  }
  
  // Initialize FSM
  doc._state = {};
  for (const fsmKey in schema._state) {
    doc._state[fsmKey] = {
      value: schema._state[fsmKey].values[0],
      transition: null,
      timestamp: new Date().toISOString()
    };
  }
  
  // ============================================================
  // PHASE 2: TRANSITION DATA CALCULATION (FSM handlers mutate doc)
  // ============================================================
  
  await CW.transitionDataCalculated(run_doc);
  // - triggers initial FSM transitions
  // - handlers mutate doc (hash password, gen tokenKey, etc.)
  
  // ============================================================
  // PHASE 3: SIDE EFFECTS EXECUTION
  // ============================================================
  
  await CW.sideEffectsExecuted(run_doc);
  // - sign JWT → run_doc.jwt
  // - send emails
  // - audit logs
  
  // ============================================================
  // RETURN mutated run_doc
  // ============================================================
  
  return run_doc;
}




// discussion

async function CW.run(operation, doctype, input) {
  
  const schema = CW.Schema[doctype];
  
  // ============================================================
  // PHASE 1: INPUT VALIDATION (guard - validate user input only)
  // ============================================================
  
  // Build minimal run_doc with just user input
  const run_doc = {
    operation: operation,
    schema: schema,
    target: { 
      doctype: doctype, 
      data: [{ ...input }]  // ONLY user input
    }
  };
  
  await CW.inputValidated(run_doc);
  // - iterate only through input fields
  // - validate types, formats, required, unique
  // - NO system fields, NO defaults yet
  
  // ============================================================
  // PHASE 1.5: APPLY SYSTEM SCHEMA (generate system fields)
  // ============================================================
  
  const doc = run_doc.target.data[0];
  
  // System fields
  doc.id = generateId();
  doc.owner = null;
  doc.creation = new Date().toISOString();
  doc.modified = new Date().toISOString();
  doc.docstatus = 0;
  doc._allowed = [];
  doc._allowed_read = ["role_user"];
  
  // Schema defaults
  for (const field of schema.fields) {
    if (field.default && !(field.fieldname in doc)) {
      doc[field.fieldname] = field.default;
    }
  }
  
  // Initialize FSM
  doc._state = {};
  for (const fsmKey in schema._state) {
    doc._state[fsmKey] = {
      value: schema._state[fsmKey].values[0],
      transition: null,
      timestamp: new Date().toISOString()
    };
  }
  
  // ============================================================
  // PHASE 2: TRANSITION DATA CALCULATION (FSM handlers mutate doc)
  // ============================================================
  
  await CW.transitionDataCalculated(run_doc);
  // - triggers initial FSM transitions
  // - handlers mutate doc (hash password, gen tokenKey, etc.)
  
  // ============================================================
  // PHASE 3: SIDE EFFECTS EXECUTION
  // ============================================================
  
  await CW.sideEffectsExecuted(run_doc);
  // - sign JWT → run_doc.jwt
  // - send emails
  // - audit logs
  
  // ============================================================
  // RETURN mutated run_doc
  // ============================================================
  
  return run_doc;
}


// combined 
// 1. input coming (create, User, input {email: "test@example.com", password: "test"})

// 2. User.schema request - is this set has all required - Yes

// 3. Is email and password meet criterias

//4. Unique in set, then check - (select, User, query {where email = input.email} ) if null next

//5. generate SYSTEM fields first name, .... owner, _allowed (as they will be part of JWT)

//6. Resolve other user

//7. Go into FSM? 

"_state": {
  "1": {
    "name": "_auth",
    "values": [0, 1, 2, 3],
    "options": ["Invited/Unverified", "Active/Unverified", "Active/Verified", "Locked"],
    
    "0_1": {
      "label": "Activate User",
      "handler": "async (run_doc) => {
        const u = run_doc.target.data[0];
        
        // Auth state
        u.enabled = true;
        u.invited = false;
        
        // Password (if not already hashed during creation)
        if (u._temp_password) {
          u.password = await CW.Adapter.auth.hashPassword(u._temp_password);
          delete u._temp_password;
        }
        
        // JWT token key (per-user secret)
        u.tokenKey = CW.Adapter.auth.generateTokenKey();
        
        // Session setup
        u.last_login = new Date().toISOString();
      }",
      
      "sideEffects": "async (run_doc) => {
        const u = run_doc.target.data[0];
        
        // Issue JWT
        const jwt = await CW.Adapter.auth.issueJWT(u);
        run_doc.jwt = jwt;
        
        // Send verification email
        await CW.Adapter.email.sendVerification(run_doc);
        
        // Audit log
        await CW.Adapter.audit.log(run_doc, 'user_activated');
      }"
    }
  }
}

//

"_state": {
  "2": {
    "name": "_email_verification",
    "values": [0, 1, 2, 3],
    "options": ["Pending", "Verified", "Bounced", "Changed"],

    "0_1": {
      "label": "Mark Verified",
      "handler": "async (run_doc) => { 
          // prepare data for next state
          u.password = await hash(u.password);     //<-how to reference Adapter functtion 
                                                   // correctly - suggesstion by Adapter name like auth.hash()
          u.tokenKey = generateTokenKey();
          u.enabled = true;
      }",
      "sideEffects": "async (run_doc) => {
          // post-transition effects
          sendVerificationEmail(u.email);
          u.jwt = signJWT(...);
      }"
    }
  }
}



//body.json arrives

const run_doc = await CW.run('create', 'User', {
  email,      
  password, // process_data
});   
// - check doctype.Schema for User and FSM for User doctype 
// if FSM has related transition, use it, envoke funcitons from referenced Adapter like auth

// so operation + doctype -> FSM + Adapter 


// Immediately trigger technical FSM transition
await CW.transition(run_doc, '1', '0_1'); // process_data → Pending

return {
  token: run_doc.jwt,
  user: { id: run_doc.target.data[0].id, email }
};




"_state": {
  "2": {
    "name": "_email_verification",
    "values": [0, 1, 2, 3],
    "options": ["Pending", "Verified", "Bounced", "Changed"],
    
    "0_1": {
      "label": "Mark Verified",
      "handler": "async (run_doc) => { ... }",
      "sideEffects": "async (run_doc) => { ... }"
    }
  }
}


"_state": {
  "2": {
    "name": "_email_verification",
    "values": [0, 1, 2, 3],
    "options": ["Pending", "Verified", "Bounced", "Changed"],
    

      "0_1": {
        "label": "Mark Verified",
        "transition": "async (run_doc) => { run_doc.target.data[0].verified = true; }",
        "sideEffects": "async (run_doc) => { await CW.Adapter[2].log(run_doc); }"
      },


//version 5.1 some additions

fsm = {
  "_schema_doctype": "User",
  
  "_state": {
   "1": {
  "name": "_auth",
  "fieldname": "_auth",
  "values": [0, 1, 2, 3, 4],
  "options": ["Invited", "Active", "Locked", "Password Reset Pending", "Disabled"],
  
  "transitions": {
    "0": [1, 4],      // Invited → Active (verify) | Disabled (cancel)
    "1": [2, 3, 4],   // Active → Locked (security) | Reset (force pw change) | Disabled (deactivate)
    "2": [1, 4],      // Locked → Active (unlock) | Disabled (permanent ban)
    "3": [1, 4],      // Reset → Active (pw changed) | Disabled (cancel account)
    "4": [0]          // Disabled → Invited (re-invite, not direct Active)
  },
  
  "labels": {
    "0_1": "Activate User",
    "0_4": "Cancel Invitation",
    "1_2": "Lock Account",
    "1_3": "Require Password Reset",
    "1_4": "Disable User",
    "2_1": "Unlock Account",
    "2_4": "Permanently Disable",
    "3_1": "Complete Reset & Activate",
    "3_4": "Cancel Account",
    "4_0": "Re-invite User"
  },
  
  "rules": {
    "0_1": "(run_doc) => run_doc.target.data[0].verified === true",
    "3_1": "(run_doc) => !!run_doc.target.data[0].password_changed_at"
  },
  
  "sideEffects": {
    "0_1": "async (run_doc) => { const u = run_doc.target.data[0]; u.enabled = true; u.invited = false; await CW.Adapter.audit.log(run_doc); await CW.Adapter.email.send(run_doc); }",
    "1_2": "async (run_doc) => { const u = run_doc.target.data[0]; u.locked = true; u.enabled = false; await CW.Adapter.security.flag(run_doc); await CW.Adapter.email.send(run_doc); }",
    "1_3": "async (run_doc) => { const u = run_doc.target.data[0]; u.requiredActions = ['PASSWORD_RESET']; await CW.Adapter.email.send(run_doc); }",
    "2_1": "async (run_doc) => { const u = run_doc.target.data[0]; u.locked = false; u.enabled = true; await CW.Adapter.audit.log(run_doc); }",
    "3_1": "async (run_doc) => { const u = run_doc.target.data[0]; u.requiredActions = []; u.enabled = true; await CW.Adapter.audit.log(run_doc); }",
    "4_0": "async (run_doc) => { const u = run_doc.target.data[0]; u.enabled = false; u.invited = true; await CW.Adapter.email.sendInvite(run_doc); }"
  }
},
    
"2": {
  "name": "_email_verification",
  "fieldname": "_email_verification",
  "values": [0, 1, 2, 3],
  "options": ["Pending", "Verified", "Bounced", "Changed"],
  
  "transitions": {
    "0": [1, 2],      // Pending → Verified (user clicks link) | Bounced (delivery failed)
    "1": [3],         // Verified → Changed (user updates email)
    "2": [0],         // Bounced → Pending (retry/new email)
    "3": [0]          // Changed → Pending (verify new email)
  },
  
  "labels": {
    "0_1": "Mark Verified",
    "0_2": "Mark Bounced",
    "1_3": "Email Changed",
    "2_0": "Retry Verification",
    "3_0": "Send New Verification"
  },
  
  "rules": {},
  
  "sideEffects": {
    "0_1": "async (run_doc) => { const u = run_doc.target.data[0]; u.verified = true; await CW.Adapter.audit.log(run_doc); }",
    "0_2": "async (run_doc) => { const u = run_doc.target.data[0]; u.verified = false; await CW.Adapter.email.logBounce(run_doc); }",
    "1_3": "async (run_doc) => { const u = run_doc.target.data[0]; u.verified = false; await CW.Adapter.audit.log(run_doc); }",
    "2_0": "async (run_doc) => { await CW.Adapter.email.sendVerification(run_doc); }",
    "3_0": "async (run_doc) => { await CW.Adapter.email.sendVerification(run_doc); }"
  }
}
  },

  "fields": [
    {
      "fieldname": "_state",
      "fieldtype": "Code",
      "options": "JSON",
      "label": "State",
      "description": "All FSM states"
    },
    {
      "fieldname": "email",
      "fieldtype": "Data",
      "label": "Email",
      "reqd": 1
    },
    {
      "fieldname": "enabled",
      "fieldtype": "Check",
      "label": "Enabled",
      "default": "1"
    },
    {
      "fieldname": "verified",
      "fieldtype": "Check",
      "label": "Email Verified",
      "default": "0"
    },
    {
      "fieldname": "locked",
      "fieldtype": "Check",
      "label": "Locked",
      "default": "0"
    }
  ]
}

// Document instance:
{
  "email": "user@example.com",
  "enabled": true,
  "verified": false,
  "locked": false,
  "_state": {
    "1": {
      "value": 0,
      "transition": null,
      "timestamp": "2025-02-14T10:00:00Z",
      "actions": [
        { "key": "0_1", "label": "Lock Account" },
        { "key": "0_2", "label": "Require Password Reset" },
        { "key": "0_3", "label": "Disable User" }
      ]
    },
    "2": {
      "value": 0,
      "transition": null,
      "timestamp": "2025-02-14T10:00:00Z",
      "actions": [
        { "key": "0_1", "label": "Mark Verified" },
        { "key": "0_2", "label": "Mark Bounced" }
      ]
    }
  }
}




//VERSION 5 not implemented 


{
  "_schema_doctype": "User",
  
  "_state": {
    "1": {
      "name": "_auth",
      "fieldname": "_auth",
      "values": [0, 1, 2, 3],
      "options": ["Active", "Locked", "Password Reset Pending", "Disabled"],
      "transitions": {
        "0": [1, 2, 3],
        "1": [0, 3],
        "2": [0, 1, 3],
        "3": [0]
      },
      "labels": {
        "0_1": "Lock Account",
        "0_2": "Require Password Reset",
        "0_3": "Disable User",
        "1_0": "Unlock Account",
        "1_3": "Disable User",
        "2_0": "Activate After Reset",
        "2_1": "Lock Account",
        "2_3": "Disable User",
        "3_0": "Re-enable User"
      },
      "rules": {
        "0_1": "(run_doc) => run_doc.target.data[0].enabled === true",
        "2_0": "(run_doc) => !!run_doc.target.data[0].password_changed_at"
      },
      "sideEffects": {
        "0_1": "async (run_doc) => { const u = run_doc.target.data[0]; u.locked = true; u.enabled = false; await CW.Adapter.email.send(run_doc); }",
        "0_2": "async (run_doc) => { const u = run_doc.target.data[0]; u.requiredActions = ['PASSWORD_RESET']; await CW.Adapter.email.send(run_doc); }",
        "1_0": "async (run_doc) => { const u = run_doc.target.data[0]; u.locked = false; u.enabled = true; await CW.Adapter.audit.log(run_doc); }",
        "2_0": "async (run_doc) => { const u = run_doc.target.data[0]; u.requiredActions = []; u.enabled = true; await CW.Adapter.audit.log(run_doc); }"
      }
    },
    
    "2": {
      "name": "_email_verification",
      "fieldname": "_email_verification",
      "values": [0, 1, 2],
      "options": ["Pending", "Verified", "Bounced"],
      "transitions": {
        "0": [1, 2],
        "1": [],
        "2": [0]
      },
      "labels": {
        "0_1": "Mark Verified",
        "0_2": "Mark Bounced",
        "2_0": "Resend Verification Email"
      },
      "rules": {},
      "sideEffects": {
        "0_1": "async (run_doc) => { const u = run_doc.target.data[0]; u.verified = true; u.emailVisibility = true; await CW.Adapter.audit.log(run_doc); }",
        "0_2": "async (run_doc) => { const u = run_doc.target.data[0]; u.verified = false; await CW.Adapter.email.markBounced(run_doc); }",
        "2_0": "async (run_doc) => { await CW.Adapter.email.sendVerification(run_doc); }"
      }
    }
  },

  "fields": [
    {
      "fieldname": "_state",
      "fieldtype": "Code",
      "options": "JSON",
      "label": "State",
      "description": "All FSM states"
    },
    {
      "fieldname": "email",
      "fieldtype": "Data",
      "label": "Email",
      "reqd": 1
    },
    {
      "fieldname": "enabled",
      "fieldtype": "Check",
      "label": "Enabled",
      "default": "1"
    },
    {
      "fieldname": "verified",
      "fieldtype": "Check",
      "label": "Email Verified",
      "default": "0"
    },
    {
      "fieldname": "locked",
      "fieldtype": "Check",
      "label": "Locked",
      "default": "0"
    }
  ]
}

// Document instance:
{
  "email": "user@example.com",
  "enabled": true,
  "verified": false,
  "locked": false,
  "_state": {
    "1": {
      "value": 0,
      "transition": null,
      "timestamp": "2025-02-14T10:00:00Z",
      "actions": [
        { "key": "0_1", "label": "Lock Account" },
        { "key": "0_2", "label": "Require Password Reset" },
        { "key": "0_3", "label": "Disable User" }
      ]
    },
    "2": {
      "value": 0,
      "transition": null,
      "timestamp": "2025-02-14T10:00:00Z",
      "actions": [
        { "key": "0_1", "label": "Mark Verified" },
        { "key": "0_2", "label": "Mark Bounced" }
      ]
    }
  }
}



//VERSION 4

//in USer doc
  "_state": {
    "value": 1,                      // current: Active
    "transition": "0_1",             // last transition
    "timestamp": "2025-02-14T10:30:00Z",
    "actions": [
      { "key": "1_2", "label": "Lock Account" },
      { "key": "1_3", "label": "Require Password Reset" },
      { "key": "1_4", "label": "Disable User" }
    ]
  }


TODO  -----
"_state": {
  "value": 1,
  "transition": "0_1",
  "timestamp": "2025-02-14T10:30:00Z",
  "actions": [
    { 
      "key": "1_2", 
      "label": "Lock Account",
      "disabled": false,           // ← rule validation result
      "reason": null               // ← why disabled (if rule fails)
    },
    { 
      "key": "1_3", 
      "label": "Require Password Reset",
      "disabled": false,
      "reason": null
    }
  ]
}
------

"_state" =
{
 
    "name": "_state",
    "values": [0, 1, 2, 3, 4],
    "options": ["Invited", "Active", "Locked", "Password Reset Pending", "Disabled"],
    
    "transitions": {
      "0": [1, 4],
      "1": [2, 3, 4],
      "2": [1, 4],
      "3": [1, 2, 4],
      "4": [1]
    },
    
    "labels": {
      "0_1": "Activate User",
      "0_4": "Cancel Invitation",
      "1_2": "Lock Account",
      "1_3": "Require Password Reset",
      "1_4": "Disable User",
      "2_1": "Unlock Account",
      "2_4": "Disable User",
      "3_1": "Complete Reset",
      "3_2": "Lock Account",
      "3_4": "Disable User",
      "4_1": "Re-enable User"
    },


  "rules": {
    "0_1": "(run_doc) => run_doc.target.data[0].verified === true",
    "1_2": "(run_doc) => run_doc.target.data[0].enabled === true",
    "3_1": "(run_doc) => !!run_doc.target.data[0].password_changed_at"
  },

  "sideEffects": {
    "0_1": "async (run_doc) => { ... }",
    "1_2": "async (run_doc) => { ... }",
    "1_3": "async (run_doc) => { ... }",
    "2_1": "async (run_doc) => { ... }",
    "3_1": "async (run_doc) => { ... }"
  }
}




//User SPECIFIC states (deleted is on higher level CORE, dont include) 

invited  //added , (optional)
enabled = true
locked = true
verified = true //not required 
requiredActions = [] = _state (_state field) /like PASSWORD_RESET_PENDING



//version 4
const fsm = {
  fieldname: "status",
  values: [0, 1, 2, 3, 4, 5, 6],
  options: ["Open", "Working", "Pending Review", "Overdue", "Template", "Completed", "Cancelled"],
  transitions: {
    0: [1, 6],
    1: [2, 3, 6],
    2: [1, 5, 6],
    3: [1, 6],
    5: [0],
    6: [0]
  },
  rules: ["2_5", "1_3"],
  sideEffects: ["2_5", "0_1", "1_2"]
};

// Rules are inline logic
CW.Adapter.rules = {
  "2_5": (run_doc) => run_doc.target.data[0].progress === 100,
  "1_3": (run_doc) => {
    const date = run_doc.target.data[0].exp_end_date;
    return date && new Date(date) < new Date();
  }
};

// Side effects orchestrate other adapters
CW.Adapter.sideEffects = {
  "2_5": async (run_doc) => {
    await CW.Adapter.email.send(run_doc);
  },
  "0_1": async (run_doc) => {
    await CW.Adapter.audit.log(run_doc);
  },
  "1_2": async (run_doc) => {
    await CW.Adapter.notify.reviewer(run_doc);
  }
};

//--------------

async function applyTransition(from, to, run_doc) {
  const key = `${from}_${to}`;
  
  // Check rule
  const rule = CW.Adapter.rules?.[key];
  if (rule && !await rule(run_doc)) {
    throw new Error(`Transition ${key} not allowed`);
  }
  
  const doc = run_doc.target.data[0];
  
  // Update state
  doc[fsm.fieldname] = to;
  doc._state = doc._state || {};
  doc._state.transition = key;           // "2_5"
  doc._state.from = from;                // 2
  doc._state.to = to;                    // 5
  doc._state.label = `${fsm.options[from]} -> ${fsm.options[to]}`;  // "Pending Review -> Completed"
  doc._state.timestamp = new Date().toISOString();
  
  // Execute side effect
  const effect = CW.Adapter.sideEffects?.[key];
  if (effect) await effect(run_doc);
  
  return run_doc;
}


//Version 3

const fsm = {
  fieldname: "status",
  values: [0, 1, 2, 3, 4, 5, 6],
  options: ["Open", "Working", "Pending Review", "Overdue", "Template", "Completed", "Cancelled"],
  transitions: {
    0: [1, 6],
    1: [2, 3, 6],
    2: [1, 5, 6],
    3: [1, 6],
    5: [0],
    6: [0]
  },
  rules: ["2_5", "1_3"],  // just list which transitions have rules
  sideEffects: ["2_5", "0_1", "1_2"]  // which have side effects
};

// Adapters named by transition key
CW.Adapter.rules = {
  "2_5": (run_doc) => run_doc.target.data[0].progress === 100,
  "1_3": (run_doc) => {
    const date = run_doc.target.data[0].exp_end_date;
    return date && new Date(date) < new Date();
  }
};

CW.Adapter.sideEffects = {
  "2_5": (run_doc) => { /* email */ },
  "0_1": (run_doc) => { /* audit */ },
  "1_2": (run_doc) => { /* notify */ }
};

// Execute
const rule = CW.Adapter.rules[key];
if (rule && !await rule(run_doc)) return false;

const effect = CW.Adapter.sideEffects[key];
if (effect) await effect(run_doc);

//Questions 

  sideEffects: {
    "2_5": (doc) => sendCompletionEmail(doc),  //<-another adapter CW.Adapter.email.send(doc,templateName)
    "0_1": (doc) => logTransition(doc, "Open -> Working"),  //<- another
    "1_2": (doc) => notifyReviewer(doc) //<-another
    // add more as needed
  }

// Changes notation, added sideeffects 

// --- FSM Definition ---
const fsm = {
  fieldname: "status",
  values: [0, 1, 2, 3, 4, 5, 6],
  options: ["Open", "Working", "Pending Review", "Overdue", "Template", "Completed", "Cancelled"],
  transitions: {
    0: [1, 6],           // Open -> Working or Cancelled
    1: [2, 3, 6],        // Working -> Pending Review, Overdue, or Cancelled
    2: [1, 5, 6],        // Pending Review -> Working, Completed, or Cancelled
    3: [1, 6],           // Overdue -> Working or Cancelled
    5: [0],              // Completed -> Reopen
    6: [0]               // Cancelled -> Reopen
  },
  rules: {
    "2_5": (doc) => doc.progress === 100, // Can complete only if 100%
    "1_3": (doc) => doc.exp_end_date && new Date(doc.exp_end_date) < new Date() // Auto overdue
  },
  sideEffects: {
    "2_5": (doc) => sendCompletionEmail(doc),
    "0_1": (doc) => logTransition(doc, "Open -> Working"),
    "1_2": (doc) => notifyReviewer(doc)
    // add more as needed
  }
};

// --- Helper Functions ---
function canTransition(doc, to) {
  const from = doc.status;

  // Check valid transition
  if (!fsm.transitions[from]?.includes(to)) return false;

  // Check rule
  const rule = fsm.rules[`${from}_${to}`];
  if (rule && !rule(doc)) return false;

  return true;
}

function executeTransition(doc, to) {
  if (!canTransition(doc, to)) {
    throw new Error(`Invalid transition: ${fsm.options[doc.status]} -> ${fsm.options[to]}`);
  }

  const from = doc.status;
  doc.status = to;

  // Run side effect if exists
  const effect = fsm.sideEffects[`${from}_${to}`];
  if (effect) effect(doc);

  return doc;
}

// --- Example Usage ---
let doc = { status: 2, progress: 100 };
executeTransition(doc, 5); // triggers 2_5 rule and sideEffect




// next version 2.0
// 1. make all fields 1 level, provide execution_level: _state, _beforesave (now _state only) 


      "execution": "_state",
      "fieldname": "status",
      "values": [0, 1, 2, 3, 4, 5, 6],
      "options": ["Open", "Working", "Pending Review", "Overdue", "Template", "Completed", "Cancelled"],
      "transitions": {
        0: [1, 6],           // Open -> Working or Cancelled
        1: [2, 3, 6],        // Working -> Pending Review, Overdue, or Cancelled
        2: [1, 5, 6],        // Pending Review -> Working, Completed, or Cancelled
        3: [1, 6],           // Overdue -> Working or Cancelled
        5: [0],              // Completed -> Reopen
        6: [0]               // Cancelled -> Reopen
      },
      "rules": {
        "2->5": "eval: doc.progress === 100",  // Can complete only if 100%
        "1->3": "eval: doc.exp_end_date && new Date(doc.exp_end_date) < now"  // Auto overdue
      }

    
      "execution": "_state",
      "fieldname": "completed_on",
      "type": "timestamp_at",
      "write_once": true,
      "rules": {
        "null->datetime": "eval: doc._states[1][0] === 5"  // Set when status becomes Completed
      }

    
      "execution": "_state",
      "fieldname": "act_start_date",
      "type": "timestamp_at",
      "write_once": false,
      "rules": {
        "null->datetime": "eval: doc._states[1][0] === 1"  // Set when status becomes Working
      }
    }]
  },
  
// "normal fileds"
    "fieldname":"is_overdue",
     "depends_on": "eval: doc.exp_end_date && new Date(doc.exp_end_date) < now && doc._states[1][0] !== 5"
  
    "fieldname":"time_remaining":
          "depends_on": "eval: doc.exp_end_date ? Math.max(0, (new Date(doc.exp_end_date) - now) / 3600000) : null"












//newer version 

{
  "doctype": "Task",
  "autoname": "TASK-.YYYY.-.#####",
  
  "fields": [
    {"fieldname": "subject", "fieldtype": "Data", "reqd": 1},
    {"fieldname": "project", "fieldtype": "Link", "options": "Project"},
    {"fieldname": "priority", "fieldtype": "Select", "options": "Low\nMedium\nHigh\nUrgent"},
    {"fieldname": "description", "fieldtype": "Text Editor"},
    {"fieldname": "exp_start_date", "fieldtype": "Datetime"},
    {"fieldname": "exp_end_date", "fieldtype": "Datetime"},
    {"fieldname": "expected_time", "fieldtype": "Float"},
    {"fieldname": "progress", "fieldtype": "Percent"},
    // ... other fields
  ],
  
  "_state": {
    1: [{
      "fieldname": "status",
      "values": [0, 1, 2, 3, 4, 5, 6],
      "options": ["Open", "Working", "Pending Review", "Overdue", "Template", "Completed", "Cancelled"],
      "transitions": {
        0: [1, 6],           // Open -> Working or Cancelled
        1: [2, 3, 6],        // Working -> Pending Review, Overdue, or Cancelled
        2: [1, 5, 6],        // Pending Review -> Working, Completed, or Cancelled
        3: [1, 6],           // Overdue -> Working or Cancelled
        5: [0],              // Completed -> Reopen
        6: [0]               // Cancelled -> Reopen
      },
      "rules": {
        "2->5": "eval: doc.progress === 100",  // Can complete only if 100%
        "1->3": "eval: doc.exp_end_date && new Date(doc.exp_end_date) < now"  // Auto overdue
      }
    }],
    
    2: [{
      "fieldname": "completed_on",
      "type": "timestamp_at",
      "write_once": true,
      "rules": {
        "null->datetime": "eval: doc._states[1][0] === 5"  // Set when status becomes Completed
      }
    }],
    
    3: [{
      "fieldname": "act_start_date",
      "type": "timestamp_at",
      "write_once": false,
      "rules": {
        "null->datetime": "eval: doc._states[1][0] === 1"  // Set when status becomes Working
      }
    }]
  },
  
  "computed_fields": {
    "is_overdue": {
      "formula": "eval: doc.exp_end_date && new Date(doc.exp_end_date) < now && doc._states[1][0] !== 5"
    },
    "time_remaining": {
      "formula": "eval: doc.exp_end_date ? Math.max(0, (new Date(doc.exp_end_date) - now) / 3600000) : null"
    }
  },
  
  "helpers": {
    "isFuture": "(v, now) => v && new Date(v) > now"
  }
}


//new version  3(stored in schema)

Final V3 + Inference (10/10) - Complete Example:
Schema:
javascript{
  "doctype": "User",
  
  "_states": {
    1: [{
      "fieldname": "email_verified_at",
      // type auto-inferred as "timestamp_at" from _at suffix
      "write_once": true,
      "rules": {
        "null->datetime": "eval: !h.isActive(doc._states[2][0], now) && !h.isActive(doc._states[3][0], now)"
      }
    }],
    
    2: [{
      "fieldname": "banned_until",
      // type auto-inferred as "timestamp_until" from _until suffix
      "write_permission": "eval: ctx.user?.roles?.includes('Admin')"
    }],
    
    3: [{
      "fieldname": "locked_until",
      // type auto-inferred as "timestamp_until"
      "auto_managed": true
    }],
    
    4: [{
      "fieldname": "trial_until",
      // type auto-inferred as "timestamp_until"
    }],
    
    5: [{
      "fieldname": "onboarding_step",
      "values": [0, 1, 2, 3],  // type auto-inferred as "state_machine" from values
      "options": ["profile", "verification", "preferences", "complete"],
      "transitions": {
        0: [1],
        1: [2],
        2: [3]
      },
      "rules": {
        "1->2": "eval: doc._states[1][0] !== null"  // email must be verified
      }
    }],
    
    6: [{
      "fieldname": "phone_verified_at",
      // type auto-inferred as "timestamp_at"
      "write_once": true
    }],
    
    7: [{
      "fieldname": "premium_until",
      // type auto-inferred as "timestamp_until"
    }]
  },
  
  "helpers": {
    "isActive": "(v, now) => v && new Date(v) > now",
    "isPast": "(v, now) => !v || new Date(v) <= now",
    "isFuture": "(v, now) => v && new Date(v) > now"
  }
}
FSM Engine with Type Inference:
javascriptclass FSM {
  constructor(schema) {
    this.schema = schema;
    this.s = schema._states || {};
    this.h = this.compileHelpers(schema.helpers || {});
  }
  
  // Infer field type from naming convention or explicit declaration
  inferType(field) {
    if (field.type) return field.type;
    if (field.values) return 'state_machine';
    if (field.fieldname?.endsWith('_at')) return 'timestamp_at';
    if (field.fieldname?.endsWith('_until')) return 'timestamp_until';
    return 'unknown';
  }
  
  // Get current value
  get(doc, dim, idx) {
    return doc._states?.[dim]?.[idx] ?? null;
  }
  
  // Set value with type-appropriate validation
  set(doc, dim, idx, val, ctx = {}) {
    if (!doc._states) doc._states = {};
    if (!doc._states[dim]) doc._states[dim] = [];
    
    const field = this.s[dim]?.[idx];
    if (!field) throw new Error(`Field ${dim}.${idx} not defined`);
    
    const type = this.inferType(field);
    const from = doc._states[dim][idx];
    const now = new Date();
    
    // Handle state_machine type
    if (type === 'state_machine') {
      return this.transition(doc, dim, idx, val, ctx);
    }
    
    // Handle timestamp_at type
    if (type === 'timestamp_at') {
      // Write-once check
      if (field.write_once && from !== null && val !== from) {
        throw new Error(`${field.fieldname} is write-once, already set to ${from}`);
      }
      
      // Validate null->datetime transition
      if (from === null && val !== null) {
        const rule = field.rules?.['null->datetime'];
        if (rule && !this.evalRule(rule, doc, now, ctx)) {
          throw new Error(`Cannot set ${field.fieldname}: rule failed`);
        }
      }
      
      // Validate datetime format
      if (val !== null && isNaN(new Date(val))) {
        throw new Error(`${field.fieldname} requires valid datetime, got ${val}`);
      }
    }
    
    // Handle timestamp_until type
    if (type === 'timestamp_until') {
      // Check write permission
      if (field.write_permission && !this.evalRule(field.write_permission, doc, now, ctx)) {
        throw new Error(`No permission to set ${field.fieldname}`);
      }
      
      // Validate datetime format (if not null)
      if (val !== null && isNaN(new Date(val))) {
        throw new Error(`${field.fieldname} requires valid datetime, got ${val}`);
      }
    }
    
    doc._states[dim][idx] = val;
    return doc;
  }
  
  // State machine transition
  transition(doc, dim, idx, toVal, ctx = {}) {
    const field = this.s[dim]?.[idx];
    if (!field) throw new Error(`Field ${dim}.${idx} not defined`);
    
    const type = this.inferType(field);
    if (type !== 'state_machine') {
      throw new Error(`Cannot transition ${field.fieldname}: not a state machine`);
    }
    
    if (!doc._states) doc._states = {};
    if (!doc._states[dim]) doc._states[dim] = [];
    
    const fromVal = doc._states[dim][idx] ?? 0;
    const now = new Date();
    
    // Check allowed transitions
    if (field.transitions) {
      const allowed = field.transitions[fromVal];
      if (!allowed || !allowed.includes(toVal)) {
        throw new Error(
          `Transition ${fromVal}->${toVal} not allowed for ${field.fieldname}`
        );
      }
    }
    
    // Check transition rule
    const ruleKey = `${fromVal}->${toVal}`;
    if (field.rules?.[ruleKey]) {
      if (!this.evalRule(field.rules[ruleKey], doc, now, ctx)) {
        throw new Error(
          `Transition ${ruleKey} rule failed for ${field.fieldname}`
        );
      }
    }
    
    // Check value is in allowed values
    if (field.values && !field.values.includes(toVal)) {
      throw new Error(
        `Value ${toVal} not in allowed values for ${field.fieldname}`
      );
    }
    
    doc._states[dim][idx] = toVal;
    return doc;
  }
  
  // Get computed switch state for timestamp_until (0=inactive, 1=active)
  getSwitch(doc, dim, idx, now = new Date()) {
    const field = this.s[dim]?.[idx];
    const type = this.inferType(field);
    
    if (type !== 'timestamp_until') {
      throw new Error(`${field.fieldname} is not timestamp_until`);
    }
    
    const val = this.get(doc, dim, idx);
    return this.h.isActive(val, now) ? 1 : 0;
  }
  
  // Check if timestamp_at is achieved
  isAchieved(doc, dim, idx) {
    const field = this.s[dim]?.[idx];
    const type = this.inferType(field);
    
    if (type !== 'timestamp_at') {
      throw new Error(`${field.fieldname} is not timestamp_at`);
    }
    
    return this.get(doc, dim, idx) !== null;
  }
  
  // Get semantic field info
  getFieldInfo(dim, idx) {
    const field = this.s[dim]?.[idx];
    if (!field) return null;
    
    return {
      fieldname: field.fieldname,
      type: this.inferType(field),
      options: field.options,
      values: field.values
    };
  }
  
  // Evaluate rule
  evalRule(rule, doc, now, ctx) {
    try {
      const expr = rule.replace(/^eval:\s*/, '');
      const h = this.h;
      const fn = new Function('doc', 'now', 'h', 'ctx', `return ${expr}`);
      return fn(doc, now, h, ctx);
    } catch (e) {
      console.error('Rule evaluation error:', e);
      return false;
    }
  }
  
  // Compile helpers
  compileHelpers(helpers) {
    const compiled = {};
    for (let [name, fn] of Object.entries(helpers)) {
      compiled[name] = new Function('return ' + fn)();
    }
    return compiled;
  }
  
  // Initialize document states
  init(doc) {
    if (!doc._states) doc._states = {};
    
    for (let [dim, fields] of Object.entries(this.s)) {
      const dimNum = parseInt(dim);
      if (!doc._states[dimNum]) {
        doc._states[dimNum] = new Array(fields.length).fill(null);
        
        // Initialize state_machine fields to 0 instead of null
        for (let i = 0; i < fields.length; i++) {
          if (this.inferType(fields[i]) === 'state_machine') {
            doc._states[dimNum][i] = 0;
          }
        }
      }
    }
    
    return doc;
  }
}
Usage Examples:
javascriptconst schema = { /* schema from above */ };
const fsm = new FSM(schema);

// Create new user
const user = {
  email: "user@example.com",
  phone: "+1234567890"
};

// Initialize states
fsm.init(user);
console.log(user._states);
/*
{
  1: [null],  // email_verified_at
  2: [null],  // banned_until
  3: [null],  // locked_until
  4: [null],  // trial_until
  5: [0],     // onboarding_step (state machine starts at 0)
  6: [null],  // phone_verified_at
  7: [null]   // premium_until
}
*/

// ============================================
// SCENARIO 1: User onboarding flow
// ============================================

// Start onboarding
fsm.transition(user, 5, 0, 1);  // profile -> verification
console.log(user._states[5][0]);  // 1

// Try to advance (fails - email not verified)
try {
  fsm.transition(user, 5, 0, 2);
} catch (e) {
  console.error(e.message);  // "Transition 1->2 rule failed"
}

// Verify email
fsm.set(user, 1, 0, new Date().toISOString());
console.log(fsm.isAchieved(user, 1, 0));  // true

// Now can advance onboarding
fsm.transition(user, 5, 0, 2);  // verification -> preferences
fsm.transition(user, 5, 0, 3);  // preferences -> complete

// ============================================
// SCENARIO 2: Admin bans user
// ============================================

const adminCtx = {user: {roles: ['Admin']}};

// Admin sets ban
fsm.set(user, 2, 0, '2025-12-31T23:59:59Z', adminCtx);
console.log(fsm.getSwitch(user, 2, 0));  // 1 (banned)

// Try to verify email again (fails - banned)
try {
  fsm.set(user, 1, 0, new Date().toISOString());
} catch (e) {
  console.error(e.message);  // "email_verified_at is write-once"
}

// Non-admin tries to unban (fails)
const userCtx = {user: {roles: ['User']}};
try {
  fsm.set(user, 2, 0, null, userCtx);
} catch (e) {
  console.error(e.message);  // "No permission to set banned_until"
}

// Admin unbans
fsm.set(user, 2, 0, null, adminCtx);
console.log(fsm.getSwitch(user, 2, 0));  // 0 (not banned)

// ============================================
// SCENARIO 3: Rate limiting (auto-managed)
// ============================================

// System locks user after failed login
const lockUntil = new Date(Date.now() + 15 * 60 * 1000);  // 15 min
fsm.set(user, 3, 0, lockUntil.toISOString());
console.log(fsm.getSwitch(user, 3, 0));  // 1 (locked)

// Check if still locked in 20 minutes
const future = new Date(Date.now() + 20 * 60 * 1000);
console.log(fsm.getSwitch(user, 3, 0, future));  // 0 (unlocked)

// ============================================
// SCENARIO 4: Trial period
// ============================================

// Start trial (30 days)
const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
fsm.set(user, 4, 0, trialEnd.toISOString());
console.log(fsm.getSwitch(user, 4, 0));  // 1 (trial active)

// Check after 31 days
const afterTrial = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
console.log(fsm.getSwitch(user, 4, 0, afterTrial));  // 0 (trial expired)

// ============================================
// SCENARIO 5: Premium subscription
// ============================================

// User subscribes to premium
const premiumEnd = new Date('2026-02-10T00:00:00Z');
fsm.set(user, 7, 0, premiumEnd.toISOString());
console.log(fsm.getSwitch(user, 7, 0));  // 1 (premium active)

// ============================================
// SCENARIO 6: Get field info
// ============================================

console.log(fsm.getFieldInfo(5, 0));
/*
{
  fieldname: "onboarding_step",
  type: "state_machine",
  options: ["profile", "verification", "preferences", "complete"],
  values: [0, 1, 2, 3]
}
*/

console.log(fsm.getFieldInfo(2, 0));
/*
{
  fieldname: "banned_until",
  type: "timestamp_until",
  options: undefined,
  values: undefined
}
*/

// ============================================
// Final state
// ============================================

console.log(user._states);
/*
{
  1: ['2025-02-10T10:30:00.000Z'],  // email verified
  2: [null],                         // not banned
  3: ['2025-02-10T10:45:00.000Z'],  // locked for 15 min
  4: ['2025-03-12T10:30:00.000Z'],  // trial until March 12
  5: [3],                            // onboarding complete
  6: [null],                         // phone not verified
  7: ['2026-02-10T00:00:00.000Z']   // premium until Feb 2026
}
*/
Key Features:
✅ Type inference from naming convention (_at, _until) or values array
✅ Three types handled: state_machine, timestamp_at, timestamp_until
✅ Write-once protection for achievements
✅ Permission checks for sensitive fields
✅ Auto-expiring timestamps
✅ Transition validation for state machines
✅ Computed switches for timestamp_until
✅ Minimal schema - type is inferred when possible
✅ Type-safe - different behaviors enforced by type



//initial version 
core_statemachine = {"config":
 {"doctype": "State Machine",
  "name": "Document_FSM",
  "statemachine_name": "Document_FSM",
  
  "core_dimensions": ["is_submittable", "docstatus", "autosave_enabled", "dirty"],
  
  "core_states": {
    "is_submittable": {
      "values": [0, 1],
      "options": ["false", "true"]
    },
    "docstatus": {
      "values": [0, 1, 2],
      "options": ["Draft", "Submitted", "Cancelled"]
    },
    "autosave_enabled": {
      "values": [0, 1],
      "options": ["false", "true"]
    },
    "dirty": {
      "values": [0, 1],
      "options": ["clean", "dirty"]
    }
  },
  
  "default_dimensions": ["save", "submit", "validate", "cancel"],
  
  "default_states": {
    "save": {
      "values": [0, 1, 2, -1],
      "options": ["idle", "pending", "success", "error"],
      "transitions": {
        "0": [1],
        "1": [2, -1],
        "2": [0],
        "-1": [0, 1]
      }
    },
    "submit": {
      "values": [0, 1, 2, -1],
      "options": ["idle", "pending", "success", "error"],
      "transitions": {
        "0": [1],
        "1": [2, -1],
        "2": [0],
        "-1": [0, 1]
      }
    },
    "validate": {
      "values": [0, 1, 2, -1],
      "options": ["idle", "pending", "valid", "invalid"],
      "transitions": {
        "0": [1],
        "1": [2, -1],
        "2": [0],
        "-1": [0, 1]
      }
    },
    "cancel": {
      "values": [0, 1, 2, -1],
      "options": ["idle", "pending", "success", "error"],
      "transitions": {
        "0": [1],
        "1": [2, -1],
        "2": [0],
        "-1": [0, 1]
      }
    }
  },
  
  "workflow_dimensions": {
    "Sales Order": ["approve", "ship"],
    "Purchase Order": ["approve", "receive"],
    "Task": []
  },
  
  "workflow_states": {
    "approve": {
      "values": [0, 1, 2, -1],
      "options": ["idle", "pending", "approved", "rejected"],
      "transitions": {
        "0": [1],
        "1": [2, -1],
        "2": [0],
        "-1": [0, 1]
      }
    },
    "ship": {
      "values": [0, 1, 2, -1],
      "options": ["idle", "pending", "shipped", "error"],
      "transitions": {
        "0": [1],
        "1": [2, -1],
        "2": [0],
        "-1": [0, 1]
      }
    },
    "receive": {
      "values": [0, 1, 2, -1],
      "options": ["idle", "pending", "received", "error"],
      "transitions": {
        "0": [1],
        "1": [2, -1],
        "2": [0],
        "-1": [0, 1]
      }
    }
  },
  
  "rules": {
    "save": {
      "0_to_1": {
        "requires": {
          "docstatus": 0,
          "dirty": 1,
          "validate": 2,
          "submit": 0,
          "cancel": 0
        }
      },
      "-1_to_1": {
        "requires": {
          "docstatus": 0,
          "dirty": 1,
          "validate": 2,
          "submit": 0,
          "cancel": 0
        }
      }
    },
    "submit": {
      "0_to_1": {
        "requires": {
          "is_submittable": 1,
          "docstatus": 0,
          "dirty": 0,
          "validate": 2,
          "save": 0,
          "cancel": 0
        }
      },
      "-1_to_1": {
        "requires": {
          "is_submittable": 1,
          "docstatus": 0,
          "dirty": 0,
          "validate": 2,
          "save": 0,
          "cancel": 0
        }
      }
    },
    "validate": {
      "0_to_1": {
        "requires": {
          "save": 0,
          "submit": 0,
          "cancel": 0
        }
      },
      "-1_to_1": {
        "requires": {
          "save": 0,
          "submit": 0,
          "cancel": 0
        }
      }
    },
    "cancel": {
      "0_to_1": {
        "requires": {
          "is_submittable": 1,
          "docstatus": 1,
          "save": 0,
          "submit": 0
        }
      },
      "-1_to_1": {
        "requires": {
          "is_submittable": 1,
          "docstatus": 1,
          "save": 0,
          "submit": 0
        }
      }
    }
  },
  
  "sequences": {
    "save": {
      "steps": [
        {
          "dimension": 0,
          "transition": 1
        },
        {
          "execute": "validate",
          "onSuccess": {
            "dimension": 2,
            "transition": 2
          },
          "onFailure": {
            "dimension": 2,
            "transition": -1,
            "then": [
              {
                "dimension": 0,
                "transition": -1
              },
              {
                "stop": true
              }
            ]
          }
        },
        {
          "execute": "dbSave",
          "onSuccess": {
            "dimension": 0,
            "transition": 2,
            "then": [
              {
                "core_dimension": 3,
                "value": 0
              }
            ]
          },
          "onFailure": {
            "dimension": 0,
            "transition": -1,
            "stop": true
          }
        },
        {
          "dimension": 0,
          "transition": 0
        }
      ]
    },
    "submit": {
      "steps": [
        {
          "dimension": 1,
          "transition": 1
        },
        {
          "execute": "validate",
          "onSuccess": {
            "dimension": 2,
            "transition": 2
          },
          "onFailure": {
            "dimension": 2,
            "transition": -1,
            "then": [
              {
                "dimension": 1,
                "transition": -1
              },
              {
                "stop": true
              }
            ]
          }
        },
        {
          "execute": "dbSubmit",
          "onSuccess": {
            "dimension": 1,
            "transition": 2,
            "then": [
              {
                "core_dimension": 1,
                "value": 1
              }
            ]
          },
          "onFailure": {
            "dimension": 1,
            "transition": -1,
            "stop": true
          }
        },
        {
          "dimension": 1,
          "transition": 0
        }
      ]
    },
    "cancel": {
      "steps": [
        {
          "dimension": 3,
          "transition": 1
        },
        {
          "execute": "dbCancel",
          "onSuccess": {
            "dimension": 3,
            "transition": 2,
            "then": [
              {
                "core_dimension": 1,
                "value": 2
              }
            ]
          },
          "onFailure": {
            "dimension": 3,
            "transition": -1,
            "stop": true
          }
        },
        {
          "dimension": 3,
          "transition": 0
        }
      ]
    },
    "validate": {
      "steps": [
        {
          "dimension": 2,
          "transition": 1
        },
        {
          "execute": "validateDocument",
          "onSuccess": {
            "dimension": 2,
            "transition": 2
          },
          "onFailure": {
            "dimension": 2,
            "transition": -1,
            "stop": true
          }
        },
        {
          "dimension": 2,
          "transition": 0
        }
      ]
    }
  }
},
"functions": {// Executes a sequence for a given document and action
  execute: async (document, action, config) => {
    const sequence = config.sequences[action];
    if (!sequence) {
      throw new Error(`Action "${action}" not defined in FSM sequences`);
    }

    // Initialize current action if not present
    if (!document._states.current) {
      document._states.current = config.default_dimensions.map(_ => 0); // idle
    }

    // Map action name → index in current
    const actionIndex = config.default_dimensions.indexOf(action);

    for (const step of sequence.steps) {

      // 1️⃣ If the step is a dimension transition
      if (step.dimension !== undefined) {
        document._states.current[actionIndex] = step.transition;

        // Optional: if step references a core dimension directly
        if (step.core_dimension !== undefined) {
          document._states.core[step.core_dimension] = step.value;
        }

      }

      // 2️⃣ If the step executes another function
      if (step.execute) {
        try {
          const result = await core_statemachine.functions[step.execute](document, config);
          
          if (step.onSuccess) {
            if (step.onSuccess.dimension !== undefined)
              document._states.current[actionIndex] = step.onSuccess.transition;

            if (step.onSuccess.core_dimension !== undefined)
              document._states.core[step.onSuccess.core_dimension] = step.onSuccess.value;

            if (step.onSuccess.then) {
              // Optional chained updates
              for (const t of step.onSuccess.then) {
                if (t.dimension !== undefined)
                  document._states.current[t.dimension] = t.transition;
                if (t.core_dimension !== undefined)
                  document._states.core[t.core_dimension] = t.value;
              }
            }
          }

        } catch (err) {
          if (step.onFailure) {
            if (step.onFailure.dimension !== undefined)
              document._states.current[actionIndex] = step.onFailure.transition;
            if (step.onFailure.then) {
              for (const t of step.onFailure.then) {
                if (t.dimension !== undefined)
                  document._states.current[t.dimension] = t.transition;
              }
            }
            if (step.onFailure.stop) break;
          }
        }
      }

    }

    // Reset action to idle at the end of sequence
    document._states.current[actionIndex] = 0;
    document._states.actions.current = null;

    return document;
  },

  // Example: validateDocument helper function
  validateDocument: async (document, config) => {
    // implement validation logic here, throw if invalid
    if (document._states.core[1] !== 0) { // just an example check
      throw new Error("Document already submitted");
    }
    return true;
  },

  // Example: dbSave helper function
  dbSave: async (document, config) => {
    // simulate DB save
    return true;
  },

  // Example: dbSubmit helper
  dbSubmit: async (document, config) => {
    return true;
  },

  dbCancel: async (document, config) => {
    return true;
  }
}
}





/* we keep in the document  

* Final _states structure (with your unchanged FSM)
* Given your FSM has: */

core_dimensions: ["is_submittable", "docstatus", "autosave_enabled", "dirty"]
default_dimensions: ["save", "submit", "validate", "cancel"]
workflow_dimensions: {"Sales Order": ["approve", "ship"], ...}


document_example = {
  "doctype": "Sales Order",
  "name": "SO-001",
  
  "_states": {
    // Indexed arrays matching FSM dimension order
    "core": [1, 0, 1, 0],      // [is_submittable, docstatus, autosave_enabled, dirty]
    "current": [0, 0, 2, 0],     // [save, submit, validate, cancel]
    "workflow": [0, 0],        // [approve, ship] for Sales Order
    
    // Actions (not indexed, metadata)
    "actions": {
      "current": null,         // current action name OR null
      "available": ["save", "submit", "validate"]  // action names
    },
    

  }
}
/*Key decisions explained
* 1. Core, current, workflow = indexed arrays*/
"core": [1, 0, 1, 0]
//       ^  ^  ^  ^
//       |  |  |  └─ dirty (index 3)
//       |  |  └──── autosave_enabled (index 2)
//       |  └─────── docstatus (index 1)
//       └────────── is_submittable (index 0)
//Maps directly to:
//javascriptfsm.core_dimensions = ["is_submittable", "docstatus", "autosave_enabled", "dirty"]
//2. Actions = names, not indices
"actions": {
  "current": "submit",  // ← action NAME
  "available": ["save", "submit", "validate"]  // ← action NAMES
}
Why names here?

Actions are user-facing intent
UI needs readable names
Controller translates to dimension index when executing

3. Available actions = list of names
javascript"available": ["save", "submit", "validate"]
FSM computes this by checking rules against current state, returns action names.
Complete lifecycle example
Initial state (new document)
javascript"_states": {
  "core": [1, 0, 1, 0],      // is_submittable, docstatus=0 (draft), autosave on, clean
  "current": [0, 0, 0, 0],     // all idle
  "workflow": [0, 0],        // all idle
  "actions": {
    "current": null,
    "available": ["save", "validate"]
  }
}
User triggers validate
javascript// User input
run("update", "SO-001", {
  _states: {
    actions: { current: "validate" }
  }
})

// Controller detects pivot change
// actions.current: null → "validate"

// Controller looks up dimension index
const validateIndex = fsm.default_dimensions.indexOf("validate")  // 2

// FSM starts sequence
// sequences.validate.steps[0]: { dimension: 2, transition: 1 }

// Controller applies
_states.current[2] = 1  // pending
State during validation:
javascript"_states": {
  "core": [1, 0, 1, 0],
  "current": [0, 0, 1, 0],     // validate = 1 (pending)
  "workflow": [0, 0],
  "actions": {
    "current": "validate",
    "available": []          // nothing available while validating
  }
}
Validation completes
javascript// FSM sequence completes
// sequences.validate.steps[2]: { dimension: 2, transition: 2 }

// Controller applies
_states.current[2] = 2  // success
_states.actions.current = null
State after validation:
javascript"_states": {
  "core": [1, 0, 1, 0],
  "current": [0, 0, 2, 0],     // validate = 2 (success)
  "workflow": [0, 0],
  "actions": {
    "current": null,
    "available": ["save", "submit", "validate"]  // more options now
  }
}
User triggers submit
javascriptrun("update", "SO-001", {
  _states: {
    actions: { current: "submit" }
  }
})

// Controller finds submit index
const submitIndex = fsm.default_dimensions.indexOf("submit")  // 1

// FSM executes sequences.submit
// Step 1: dimension 1, transition 1
_states.current[1] = 1

// Step 3 onSuccess: dimension 1, transition 2, then core_dimension 1, value 1
_states.current[1] = 2
_states.core[1] = 1  // docstatus = 1

// Step 4: dimension 1, transition 0
_states.current[1] = 0
Final state (submitted):
javascript"_states": {
  "core": [1, 1, 1, 0],      // docstatus = 1 (submitted)
  "current": [0, 0, 2, 0],     // submit back to idle, validate still success
  "workflow": [0, 0],
  "actions": {
    "current": null,
    "available": ["cancel", "amend"]  // FSM computed new available actions
  }
}
How FSM sequences map to this
Your FSM sequence:
javascript"submit": {
  "steps": [
    { "dimension": 1, "transition": 1 },  // current[1] = 1
    { /* validate check */ },
    { 
      "execute": "dbSubmit",
      "onSuccess": {
        "dimension": 1, "transition": 2,
        "then": [{ "core_dimension": 1, "value": 1 }]
      }
    },
    { "dimension": 1, "transition": 0 }   // current[1] = 0
  ]
}
Maps directly to array mutations:
javascript_states.current[1] = 1      // step 1
_states.current[1] = 2      // step 3 onSuccess
_states.core[1] = 1       // step 3 then
_states.current[1] = 0      // step 4
One-line summary
_states uses indexed arrays for dimensions ([1, 0, 2, 0]) and readable names for actions ("submit"), matching your FSM exactly.

//= multiple state machines =====

we reserve _states globally in every document  for states tracking, we have core_statemachine (core for the system, all doctypes) mapping core_statemachine - mutate _states.core. and additional optional statemachines that are like {doctype}_statemachine, they mutate _states.workflow  no need to define doctype additionally as its defined the schema itsself like task. The whole old state machine is planced under .config the sequencer function is behind funcitons.execute in machine so we have very cliar mapping of 1 state machine to 1 doctype (or general core) and to particular part of _states

3:14 PM
YES! This is very clean architecture
Let me validate the logic:

The architecture
1. _states is globally reserved in ALL documents
javascript
// Every document has _states (universal)
{
  "doctype": "Sales Order",
  "name": "SO-001",
  "_states": {
    "core": [1, 0, 1, 0],      // ← Core State Machine writes here
    "workflow": [0, 0],         // ← Task State Machine writes here (if exists)
    "actions": { ... }
  }
}

{
  "doctype": "Task",
  "name": "TASK-001",
  "_states": {
    "core": [1, 0, 1, 0],      // ← Core State Machine writes here
    "workflow": [0, 0, 0],     // ← Task State Machine writes here
    "actions": { ... }
  }
}
2. Core State Machine = universal for all doctypes
javascript
{
  "doctype": "State Machine",
  "name": "core_statemachine",
  
  // ✅ No document_type - applies to ALL doctypes
  
  // ✅ Targets _states.core
  "target": "_states.core",
  
  "config": {
    "dimensions": ["is_submittable", "docstatus", "autosave_enabled", "dirty"],
    
    "states": {
      "is_submittable": {
        "values": [0, 1],
        "options": ["false", "true"]
      },
      "docstatus": {
        "values": [0, 1, 2],
        "options": ["Draft", "Submitted", "Cancelled"]
      },
      "autosave_enabled": {
        "values": [0, 1],
        "options": ["false", "true"]
      },
      "dirty": {
        "values": [0, 1],
        "options": ["clean", "dirty"]
      }
    },
    
    "sequences": {
      "save": {
        "steps": [
          { "dimension": 3, "transition": 0 }  // dirty → clean
        ]
      },
      "submit": {
        "steps": [
          { "dimension": 1, "transition": 1 }  // docstatus → submitted
        ]
      }
    }
  },
  
  "functions": {
    "execute": async (document, action, config) => {
      // Sequencer logic
      const sequence = config.sequences[action]
      
      for (const step of sequence.steps) {
        if (step.dimension !== undefined) {
          document._states.core[step.dimension] = step.transition
        }
      }
      
      return document
    }
  }
}
3. Doctype-specific State Machine = optional, per doctype
javascript
{
  "doctype": "State Machine",
  "name": "task_statemachine",
  
  // ✅ Name defines doctype (task)
  
  // ✅ Targets _states.workflow
  "target": "_states.workflow",
  
  "config": {
    "dimensions": ["assign", "review", "complete"],
    
    "states": {
      "assign": {
        "values": [0, 1, 2, -1],
        "options": ["idle", "pending", "assigned", "error"]
      },
      "review": {
        "values": [0, 1, 2, -1],
        "options": ["idle", "pending", "reviewed", "rejected"]
      },
      "complete": {
        "values": [0, 1, 2, -1],
        "options": ["idle", "pending", "completed", "error"]
      }
    },
    
    "sequences": {
      "assign": {
        "steps": [
          { "dimension": 0, "transition": 1 },  // assign → pending
          { "execute": "notifyAssignee" },
          { "dimension": 0, "transition": 2 }   // assign → assigned
        ]
      }
    }
  },
  
  "functions": {
    "execute": async (document, action, config) => {
      const sequence = config.sequences[action]
      
      for (const step of sequence.steps) {
        if (step.dimension !== undefined) {
          document._states.workflow[step.dimension] = step.transition
        }
      }
      
      return document
    }
  }
}
4. Doctype schema derives from state machine name
javascript
{
  "doctype": "Task",
  "fields": [
    {
      "fieldname": "_states",
      "type": "FSMState"
      // ✅ No explicit reference needed
      // Field System discovers: task_statemachine exists → use it
    }
  ]
}
Discovery logic
javascript
// Field System discovers state machines by naming convention
async function getStateMachinesForDoctype(doctype) {
  const machines = []
  
  // ✅ Core machine (always present)
  const coreMachine = await loadDocument("State Machine", "core_statemachine")
  machines.push({
    machine: coreMachine,
    target: "_states.core"
  })
  
  // ✅ Doctype-specific machine (optional)
  const doctypeMachineName = `${doctype.toLowerCase()}_statemachine`
  const doctypeMachine = await loadDocument("State Machine", doctypeMachineName)
  
  if (doctypeMachine) {
    machines.push({
      machine: doctypeMachine,
      target: "_states.workflow"
    })
  }
  
  return machines
}

// Usage
const machines = await getStateMachinesForDoctype("Task")
// Returns:
// [
//   { machine: core_statemachine, target: "_states.core" },
//   { machine: task_statemachine, target: "_states.workflow" }
// ]
Execution flow
javascript
async function executeAction(document, action) {
  const machines = await getStateMachinesForDoctype(document.doctype)
  
  for (const { machine, target } of machines) {
    // Check if this machine handles this action
    if (machine.config.sequences[action]) {
      // ✅ Call machine's execute function
      await machine.functions.execute(document, action, machine.config)
    }
  }
  
  return document
}

// Example: Submit a Task
const task = { doctype: "Task", name: "TASK-001", _states: { ... } }

await executeAction(task, "submit")
// → core_statemachine.functions.execute() runs
// → Mutates task._states.core

await executeAction(task, "assign")
// → task_statemachine.functions.execute() runs
// → Mutates task._states.workflow
Clear mapping
State Machine	Target Field	Scope
core_statemachine	_states.core	All doctypes
task_statemachine	_states.workflow	Task only
sales_order_statemachine	_states.workflow	Sales Order only
{doctype}_statemachine	_states.workflow	That doctype only
Benefits of this architecture
✅ Benefit 1: Clear separation
_states.core = universal (save, submit, validate, cancel)
_states.workflow = doctype-specific (assign, approve, ship, etc.)
✅ Benefit 2: Naming convention = discovery
core_statemachine → always loaded
task_statemachine → loaded for Task doctype
No explicit mappings needed
✅ Benefit 3: Config + Functions separation
javascript
"config": {
  // ✅ Pure data (dimensions, states, sequences)
}

"functions": {
  "execute": // ✅ Pure logic (sequencer)
}
✅ Benefit 4: One machine = One target = One doctype
core_statemachine → _states.core → all doctypes
task_statemachine → _states.workflow → Task
Simple, predictable
✅ Benefit 5: Optional workflow machines
javascript
// Sales Order has workflow
sales_order_statemachine exists → _states.workflow used

// Customer has no workflow
customer_statemachine doesn't exist → _states.workflow = [] (empty)
Complete example
Core State Machine
javascript
{
  "name": "core_statemachine",
  "target": "_states.core",
  "config": {
    "dimensions": ["is_submittable", "docstatus", "autosave_enabled", "dirty"],
    "sequences": { ... }
  },
  "functions": {
    "execute": async (doc, action, config) => { /* mutate _states.core */ }
  }
}
Task State Machine
javascript
{
  "name": "task_statemachine",
  "target": "_states.workflow",
  "config": {
    "dimensions": ["assign", "review", "complete"],
    "sequences": { ... }
  },
  "functions": {
    "execute": async (doc, action, config) => { /* mutate _states.workflow */ }
  }
}
Task Document
javascript
{
  "doctype": "Task",
  "name": "TASK-001",
  "_states": {
    "core": [1, 0, 1, 0],      // ← core_statemachine
    "workflow": [0, 0, 0],     // ← task_statemachine
    "actions": {
      "current": null,
      "available": ["save", "assign"]
    }
  }
}
One-line validation
✅ Logic is sound: _states is universal, core_statemachine mutates _states.core (all doctypes), {doctype}_statemachine mutates _states.workflow (optional, per doctype), naming convention enables discovery, config holds data, functions.execute holds sequencer logic — clean 1:1:1 mapping (machine:target:doctype).

// ====STATE MACHINE EVALUATOR====
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function evaluateFSM(fsmConfig, vector_state, doctype) {
  const available = [];
  
  // Get dimensions based on doctype
  const dimensions = [
    ...fsmConfig.default_dimensions,
    ...(fsmConfig.workflow_dimensions[doctype] || [])
  ];
  
  // Early exit: If docstatus != 0, check only cancel
  if (vector_state.docstatus !== 0) {
    if (vector_state.docstatus === 1 && dimensions.includes('cancel')) {
      const cancelIndex = dimensions.indexOf('cancel');
      const stateConfig = fsmConfig.default_states.cancel;
      return evaluateDimension(
        cancelIndex,
        'cancel',
        stateConfig,
        fsmConfig.rules.cancel,
        vector_state
      );
    }
    return [];
  }
  
  // Evaluate all dimensions
  for (let i = 0; i < dimensions.length; i++) {
    const dimensionName = dimensions[i];
    
    // Get state config from default or workflow
    const stateConfig = fsmConfig.default_states[dimensionName] || 
                        fsmConfig.workflow_states[dimensionName];
    
    if (!stateConfig) continue;
    
    const transitions = evaluateDimension(
      i,
      dimensionName,
      stateConfig,
      fsmConfig.rules[dimensionName],
      vector_state
    );
    
    available.push(...transitions);
  }
  
  return available;
}

function evaluateDimension(dimensionIndex, dimensionName, stateConfig, rules, vector_state) {
  const available = [];
  const currentValue = vector_state.default[dimensionIndex];
  
  // Get possible next values from transitions
  const possibleNext = stateConfig.transitions[String(currentValue)] || [];
  
  if (possibleNext.length === 0) return [];
  
  // Check each possible transition
  for (const nextValue of possibleNext) {
    const ruleKey = `${currentValue}_to_${nextValue}`;
    const rule = rules?.[ruleKey];
    
    // No rule = transition always allowed
    if (!rule) {
      available.push({
        dimensionIndex,
        dimensionName,
        from: currentValue,
        to: nextValue,
        action: nextValue === 1 ? dimensionName : null
      });
      continue;
    }
    
    // Check requirements
    if (checkRequirements(rule.requires, vector_state)) {
      available.push({
        dimensionIndex,
        dimensionName,
        from: currentValue,
        to: nextValue,
        action: nextValue === 1 ? dimensionName : null
      });
    }
  }
  
  return available;
}

function checkRequirements(requires, vector_state) {
  if (!requires) return true;
  
  // Check each requirement
  for (const [key, value] of Object.entries(requires)) {
    if (!checkSingleRequirement(key, value, vector_state)) {
      return false;
    }
  }
  
  return true;
}

function checkSingleRequirement(key, value, vector_state) {
  // Check core state first
  if (vector_state.core && key in vector_state.core) {
    const actualValue = vector_state.core[key];
    return Array.isArray(value) ? value.includes(actualValue) : actualValue === value;
  }
  
  // Check default dimensions
  if (vector_state.default && key in vector_state.default) {
    const actualValue = vector_state.default[key];
    return Array.isArray(value) ? value.includes(actualValue) : actualValue === value;
  }
  
  // Check workflow dimensions
  if (vector_state.workflow && key in vector_state.workflow) {
    const actualValue = vector_state.workflow[key];
    return Array.isArray(value) ? value.includes(actualValue) : actualValue === value;
  }
  
  return false;
}

// ============================================================================
// COWORKER.FSM MODULE
// ============================================================================

coworker.FSM = {
  config: null,
  
  async load() {
    const result = await coworker.run({
      operation: "takeone",
      from: "State Machine",
      query: { where: { statemachine_name: "Document_FSM" } }
    });
    
    if (!result.success || !result.target.data[0]) {
      throw new Error("State Machine not found");
    }
    
    this.config = result.target.data[0];
    console.log("✅ FSM loaded:", this.config.statemachine_name);
  },
  
  // Convert document state to flat vector_state for evaluation
  buildVectorState(doc, doctype) {
    const fsm = this.config;
    const vectorState = {};
    
    // Map core dimensions
    fsm.core_dimensions.forEach((dim, i) => {
      vectorState[dim] = doc.fsm_state.core[i];
    });
    
    // Map default dimensions
    fsm.default_dimensions.forEach((dim, i) => {
      vectorState[dim] = doc.fsm_state.default[i];
    });
    
    // Map workflow dimensions
    const workflowDims = fsm.workflow_dimensions[doctype] || [];
    workflowDims.forEach((dim, i) => {
      vectorState[dim] = doc.fsm_state.workflow[i];
    });
    
    // Keep original structure for requirements checking
    vectorState.core = {};
    vectorState.default = {};
    vectorState.workflow = {};
    
    fsm.core_dimensions.forEach((dim, i) => {
      vectorState.core[dim] = doc.fsm_state.core[i];
    });
    
    fsm.default_dimensions.forEach((dim, i) => {
      vectorState.default[dim] = doc.fsm_state.default[i];
    });
    
    workflowDims.forEach((dim, i) => {
      vectorState.workflow[dim] = doc.fsm_state.workflow[i];
    });
    
    return vectorState;
  },
  
  evaluate(doc, doctype) {
    if (!this.config) {
      throw new Error("FSM not loaded. Call FSM.load() first.");
    }
    
    const vectorState = this.buildVectorState(doc, doctype);
    return evaluateFSM(this.config, vectorState, doctype);
  },
  
  getActionsForState(doc, doctype) {
    return this.evaluate(doc, doctype)
      .map(t => t.action)
      .filter(Boolean);
  },
  
  canExecuteAction(action, doc, doctype) {
    return this.getActionsForState(doc, doctype).includes(action);
  },
  
  // Initialize FSM state for new document
  initializeState(doctype, schema) {
    const fsm = this.config;
    
    // Initialize core
    const core = fsm.core_dimensions.map(dim => {
      if (dim === 'is_submittable') return schema.is_submittable ? 1 : 0;
      if (dim === 'docstatus') return 0;
      if (dim === 'autosave_enabled') return 0;
      if (dim === 'dirty') return 0;
      return 0;
    });
    
    // Initialize default (all idle = 0)
    const defaultVector = fsm.default_dimensions.map(() => 0);
    
    // Initialize workflow (all idle = 0)
    const workflowDims = fsm.workflow_dimensions[doctype] || [];
    const workflowVector = workflowDims.map(() => 0);
    
    return {
      core,
      default: defaultVector,
      workflow: workflowVector
    };
  }
};

console.log("✅ FSM module loaded");

//NOT IMPLEMENTED 

//Exactly! You Need a Sequence Player
//You already have the music sheet (FSM sequences), you just need the orchestra conductor (sequence player) to execute it.
//javascript// ═══════════════════════════════════════════════════════════════
// SEQUENCE PLAYER - The Missing Piece
// ═══════════════════════════════════════════════════════════════

coworker.FSM.playSequence = async function(actionName, doc, doctype) {
  const sequence = this.config.sequences[actionName];
  
  if (!sequence) {
    throw new Error(`No sequence defined for action: ${actionName}`);
  }
  
  console.log(`🎬 Playing sequence: ${actionName}`);
  
  // Execute each step in order
  for (let i = 0; i < sequence.steps.length; i++) {
    const step = sequence.steps[i];
    
    console.log(`  Step ${i + 1}/${sequence.steps.length}:`, step);
    
    try {
      await this._executeStep(step, doc, doctype);
    } catch (error) {
      console.error(`❌ Step ${i + 1} failed:`, error);
      throw error;
    }
  }
  
  console.log(`✅ Sequence complete: ${actionName}`);
  return doc;
};

// ═══════════════════════════════════════════════════════════════
// STEP EXECUTOR - Interprets Each Step Type
// ═══════════════════════════════════════════════════════════════

coworker.FSM._executeStep = async function(step, doc, doctype) {
  
  // ─────────────────────────────────────────────────────────────
  // STEP TYPE 1: Update FSM dimension state
  // ─────────────────────────────────────────────────────────────
  if (step.dimension !== undefined && step.transition !== undefined) {
    console.log(`    → Update dimension ${step.dimension} to ${step.transition}`);
    doc.fsm_state.default[step.dimension] = step.transition;
    return;
  }
  
  // ─────────────────────────────────────────────────────────────
  // STEP TYPE 2: Update core dimension
  // ─────────────────────────────────────────────────────────────
  if (step.core_dimension !== undefined && step.value !== undefined) {
    console.log(`    → Update core[${step.core_dimension}] to ${step.value}`);
    doc.fsm_state.core[step.core_dimension] = step.value;
    return;
  }
  
  // ─────────────────────────────────────────────────────────────
  // STEP TYPE 3: Execute sub-operation
  // ─────────────────────────────────────────────────────────────
  if (step.execute) {
    console.log(`    → Execute: ${step.execute}`);
    
    try {
      await this._executeOperation(step.execute, doc, doctype);
      
      // Handle onSuccess
      if (step.onSuccess) {
        console.log(`    ✅ Success, executing onSuccess`);
        await this._handleOutcome(step.onSuccess, doc, doctype);
      }
      
    } catch (error) {
      console.log(`    ❌ Failed, executing onFailure`);
      
      // Handle onFailure
      if (step.onFailure) {
        await this._handleOutcome(step.onFailure, doc, doctype);
        
        if (step.onFailure.stop) {
          throw new Error(`Sequence stopped: ${error.message}`);
        }
      } else {
        throw error;
      }
    }
    
    return;
  }
  
  // ─────────────────────────────────────────────────────────────
  // STEP TYPE 4: Stop execution
  // ─────────────────────────────────────────────────────────────
  if (step.stop) {
    console.log(`    🛑 Stop sequence`);
    throw new Error('Sequence stopped by step directive');
  }
};

// ═══════════════════════════════════════════════════════════════
// OUTCOME HANDLER - Process onSuccess/onFailure
// ═══════════════════════════════════════════════════════════════

coworker.FSM._handleOutcome = async function(outcome, doc, doctype) {
  // Update dimension if specified
  if (outcome.dimension !== undefined && outcome.transition !== undefined) {
    console.log(`      → Set dimension ${outcome.dimension} = ${outcome.transition}`);
    doc.fsm_state.default[outcome.dimension] = outcome.transition;
  }
  
  // Update core dimension if specified
  if (outcome.core_dimension !== undefined && outcome.value !== undefined) {
    console.log(`      → Set core[${outcome.core_dimension}] = ${outcome.value}`);
    doc.fsm_state.core[outcome.core_dimension] = outcome.value;
  }
  
  // Execute "then" steps if present
  if (outcome.then && Array.isArray(outcome.then)) {
    console.log(`      → Execute ${outcome.then.length} then steps`);
    for (const thenStep of outcome.then) {
      await this._executeStep(thenStep, doc, doctype);
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// OPERATION EXECUTOR - Maps FSM execute keys to actual logic
// ═══════════════════════════════════════════════════════════════

coworker.FSM._executeOperation = async function(operationName, doc, doctype) {
  
  const operations = {
    
    // ─────────────────────────────────────────────────────────
    "validate": async () => {
      console.log(`      🔍 Running validation`);
      
      // Get schema
      const schema = await coworker.getSchema(doctype);
      
      // Run field validations
      for (const [fieldname, fieldDef] of Object.entries(schema.fields || {})) {
        if (fieldDef.reqd && !doc[fieldname]) {
          throw new Error(`Required field missing: ${fieldname}`);
        }
        
        // Add more validation rules...
      }
      
      // Run custom validation hooks
      await coworker.hooks.run('validate', doctype, doc);
      
      console.log(`      ✅ Validation passed`);
    },
    
    // ─────────────────────────────────────────────────────────
    "validateDocument": async () => {
      // Alias for validate
      await operations.validate();
    },
    
    // ─────────────────────────────────────────────────────────
    "dbSave": async () => {
      console.log(`      💾 Saving to database`);
      
      // Update audit fields
      doc.modified = new Date();
      doc.modified_by = coworker.user?.name || 'System';
      
      // Execute UPDATE operation
      const result = await coworker.run({
        operation: 'update',
        source_doctype: doctype,
        query: { where: { name: doc.name } },
        input: { data: doc },
        options: { includeSchema: false }
      });
      
      // Merge result back into doc
      Object.assign(doc, result.target.data[0]);
      
      console.log(`      ✅ Saved: ${doc.name}`);
    },
    
    // ─────────────────────────────────────────────────────────
    "dbSubmit": async () => {
      console.log(`      📤 Submitting document`);
      
      // Update submit fields
      doc.docstatus = 1;
      doc.submitted_by = coworker.user?.name || 'System';
      doc.submitted_on = new Date();
      
      // Save to database
      await operations.dbSave();
      
      // Run submit hooks
      await coworker.hooks.run('on_submit', doctype, doc);
      
      console.log(`      ✅ Submitted: ${doc.name}`);
    },
    
    // ─────────────────────────────────────────────────────────
    "dbCancel": async () => {
      console.log(`      🚫 Cancelling document`);
      
      // Update cancel fields
      doc.docstatus = 2;
      doc.cancelled_by = coworker.user?.name || 'System';
      doc.cancelled_on = new Date();
      
      // Save to database
      await operations.dbSave();
      
      // Run cancel hooks
      await coworker.hooks.run('on_cancel', doctype, doc);
      
      console.log(`      ✅ Cancelled: ${doc.name}`);
    }
  };
  
  // Execute the operation
  const handler = operations[operationName];
  
  if (!handler) {
    throw new Error(`Unknown operation: ${operationName}`);
  }
  
  await handler();
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API - User-Facing Actions
// ═══════════════════════════════════════════════════════════════

coworker.actions = {
  
  async save(doctype, doc) {
    // 1. Check if action is allowed
    if (!coworker.FSM.canExecuteAction('save', doc, doctype)) {
      throw new Error('Save not allowed in current state');
    }
    
    // 2. Play the sequence
    await coworker.FSM.playSequence('save', doc, doctype);
    
    return doc;
  },
  
  async submit(doctype, doc) {
    if (!coworker.FSM.canExecuteAction('submit', doc, doctype)) {
      throw new Error('Submit not allowed in current state');
    }
    
    await coworker.FSM.playSequence('submit', doc, doctype);
    return doc;
  },
  
  async cancel(doctype, doc) {
    if (!coworker.FSM.canExecuteAction('cancel', doc, doctype)) {
      throw new Error('Cancel not allowed in current state');
    }
    
    await coworker.FSM.playSequence('cancel', doc, doctype);
    return doc;
  },
  
  async validate(doctype, doc) {
    if (!coworker.FSM.canExecuteAction('validate', doc, doctype)) {
      throw new Error('Validate not allowed in current state');
    }
    
    await coworker.FSM.playSequence('validate', doc, doctype);
    return doc;
  }
};

// ═══════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════

/*
// Initialize FSM
await coworker.FSM.load();

// Load a document
const doc = await coworker.run({
  operation: 'select',
  source_doctype: 'Sales Order',
  query: { where: { name: 'SO-001' } }
});

// Execute action
await coworker.actions.save('Sales Order', doc.target.data[0]);

// OUTPUT:
// 🎬 Playing sequence: save
//   Step 1/8: { dimension: 0, transition: 1 }
//     → Update dimension 0 to 1
//   Step 2/8: { execute: "validate" }
//     → Execute: validate
//       🔍 Running validation
//       ✅ Validation passed
//     ✅ Success, executing onSuccess
//       → Set dimension 2 = 2
//   Step 3/8: { execute: "dbSave" }
//     → Execute: dbSave
//       💾 Saving to database
//       ✅ Saved: SO-001
//     ✅ Success, executing onSuccess
//       → Set dimension 0 = 2
//       → Set core[3] = 0
//   Step 4/8: { dimension: 0, transition: 0 }
//     → Update dimension 0 to 0
// ✅ Sequence complete: save
*/
What This Gives You

Sequence Player (playSequence) - Iterates through FSM sequence steps
Step Interpreter (_executeStep) - Handles different step types (dimension, execute, stop)
Operation Mapper (_executeOperation) - Maps FSM execute keys to actual logic
Outcome Handler (_handleOutcome) - Processes onSuccess/onFailure/then
Public API (coworker.actions.*) - User-facing methods

Key Features
✅ Declarative - Sequences define WHAT, player executes HOW
✅ Error Handling - Automatic onSuccess/onFailure routing
✅ Traceable - Console logs show execution flow
✅ CRUD Integration - Uses your existing UPDATE operation
✅ Hook Integration - Calls validate/on_submit/on_cancel hooks
This is the "missing piece" - the sequence player that brings your FSM to life!