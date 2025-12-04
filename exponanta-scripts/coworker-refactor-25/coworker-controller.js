// ============================================================
// COWORKER-CONTROLLER.JS
// ============================================================

// ============================================================
// COWORKER VALIDATORS
// ============================================================

coworker.validators = {
  
  /**
   * Validate field based on fieldtype and properties
   */
  validateField(field, value) {
    // Required check
    if (field.reqd && (value == null || value === "")) {
      return `${field.label || field.fieldname} is required`;
    }
    
    // Skip if no value
    if (value == null || value === "") return null;
    
    // Type validation
    const typeChecks = {
      Int: v => Number.isInteger(Number(v)),
      Float: v => !isNaN(Number(v)),
      Email: v => /^\S+@\S+\.\S+$/.test(v),
      Date: v => !isNaN(Date.parse(v))
    };
    
    if (typeChecks[field.fieldtype] && !typeChecks[field.fieldtype](value)) {
      return `${field.label || field.fieldname} must be valid ${field.fieldtype}`;
    }
    
    // Length validation
    if (field.length && value.length > field.length) {
      return `${field.label || field.fieldname} exceeds max length ${field.length}`;
    }
    
    // Range validation
    if (field.min_value != null && Number(value) < field.min_value) {
      return `${field.label || field.fieldname} minimum is ${field.min_value}`;
    }
    if (field.max_value != null && Number(value) > field.max_value) {
      return `${field.label || field.fieldname} maximum is ${field.max_value}`;
    }
    
    return null;
  }
};



coworker.controller = {
  
  validate(run) {
    const errors = [];
    
    run.output?.schema?.fields.forEach(field => {
      const error = coworker.validators.validateField(
        field, 
        run.doc[field.fieldname]
      );
      if (error) errors.push(error);
    });
    
    return { valid: !errors.length, errors };
  },
  
 isComplete(run) {
    return this.validate(run).valid;
  },
  
  // ✅ NEW - Save with merge logic
  async save(run) {
    if (!run.options?.draft) {
      console.warn('save() called on non-draft run');
      return { success: false, error: { message: 'Document not in draft mode' } };
    }
    
    if (run._saving) {
      console.warn('save() already in progress');
      return { success: false, error: { message: 'Save in progress' } };
    }
    
    // Validate
    const validation = this.validate(run);
    if (!validation.valid) {
      run._validationErrors = validation.errors;
      if (typeof coworker._render === 'function') {
        coworker._render(run);
      }
      return { success: false, errors: validation.errors };
    }
    
    // ✅ MERGE: original + delta
    const original = run.output?.data?.[0] || {};
    const delta = run.input || {};
    const merged = { ...original, ...delta };
    
    // Determine if new or update
    const isNew = !merged.name || merged.name.startsWith('new-');
    
    // Save
    run._saving = true;
    if (typeof coworker._render === 'function') {
      coworker._render(run);
    }
    
    try {
      const saveRun = await run.child({
        operation: isNew ? 'create' : 'update',
        doctype: run.source_doctype,
        input: merged,  // ✅ Complete merged document
        query: { where: { name: merged.name } },
        options: { 
          draft: false, 
          includeSchema: false,
          merge: false  // ✅ Tell UPDATE not to merge again
        }
      });
      
      if (saveRun.success) {
        // Update local state (data only, preserve schema)
        run.output.data = [saveRun.output.data[0]];
        run.input = {};
        run.options.draft = false;
        delete run._saving;
        delete run._validationErrors;
        
        if (typeof coworker._render === 'function') {
          coworker._render(run);
        }
        
        return { success: true, data: saveRun.output.data[0] };
      } else {
        run._saveError = saveRun.error?.message;
        delete run._saving;
        
        if (typeof coworker._render === 'function') {
          coworker._render(run);
        }
        
        return { success: false, error: saveRun.error };
      }
    } catch (error) {
      run._saveError = error.message;
      delete run._saving;
      
      if (typeof coworker._render === 'function') {
        coworker._render(run);
      }
      
      return { success: false, error: { message: error.message } };
    }
  },
  
  // ✅ Auto-save (called by fields)
  async autoSave(run) {
    if (!run.options?.draft) return;
    if (run._saving) return;
    if (!this.isComplete(run)) {
      if (typeof coworker._render === 'function') {
        coworker._render(run);
      }
      return;
    }
    
    return await this.save(run);
  }
};