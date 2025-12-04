// ============================================================================
// BADGES
// ============================================================================

// Just 2 technical stages - draft = true, draft = false (saved)
const badges = {
  draft/unsaved: { text: "Unsaved — required fields missing", variant: "danger" },
 //then saved = draft = false
  Open: { text: "Open", variant: "primary" },
  "Pending Review": { text: "Pending Review", variant: "warning" },

  Cancelled: { text: "Cancelled", variant: "secondary" },
  
};

// ============================================================================
// SIMULATED SCHEMA
// ============================================================================
const TaskSchema = {
  doctype: "Task",
  autoname: "TASK-.YYYY.-.#####",
  fields: [
    { fieldname: "subject", fieldtype: "Data", reqd: 1 },
    {
      fieldname: "status",
      fieldtype: "Select",
      default: "Open",
      options: "Open\nWorking\nPending Review\nOverdue\nTemplate\nCompleted\nCancelled"
    }
  ]
};

// ============================================================================
// CONTEXT / DOC STATE
// ============================================================================
const ctx = { doc: {} };

// ============================================================================
// SHOW BADGE FUNCTION
// ============================================================================
function showBadge(badge) {
  console.log(`Badge: ${badge.text} [${badge.variant}]`);
}

// ============================================================================
// VALIDATE REQUIRED FIELDS
// ============================================================================
function hasRequiredFields(doc, schema) {
  return schema.fields
    .filter(f => f.reqd)
    .every(f => doc[f.fieldname] && doc[f.fieldname] !== "");
}

// ============================================================================
// AUTO-SAVE / INLINE SAVE FLOW
// ============================================================================
function inlineSave() {
  const requiredFilled = hasRequiredFields(ctx.doc, TaskSchema);

  // STEP 1: Missing required fields
  if (!requiredFilled) {
    if (!ctx.doc.name) {
      showBadge(badges.draft); // new doc, missing fields
    } else {
      showBadge(badges.unsaved); // existing doc, required fields missing
    }
    return;
  }

  // STEP 2: Apply default status if missing
  if (!ctx.doc.status) {
    ctx.doc.status = TaskSchema.fields.find(f => f.fieldname === "status").default;
  }

  // STEP 3: Apply system fields 
  if (!ctx.doc.name) {

    ctx.doc.owner = ...;
  }

  // STEP 4: Save / update simulated DB
  console.log("Saved to DB:", ctx.doc);

  // STEP 5: Show badge according to status
  showBadge(badges[ctx.doc.status] || badges.Open);
}