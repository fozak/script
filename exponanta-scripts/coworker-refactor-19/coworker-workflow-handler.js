// coworker-workflow-handler.js (browser version, no export)
(function(global) {
  'use strict';
  
  // Wait for coworker to be available
  if (typeof global.coworker !== 'undefined') {
    
    // ADD: Template resolver helper
    global.coworker._resolveTemplates = function(step, results) {
      const resolved = JSON.parse(JSON.stringify(step));
      const prev = results[results.length - 1];
      
      // Helper to replace templates in object
      const replaceInObject = (obj, search, replace) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string' && obj[key].includes(search)) {
            obj[key] = obj[key].replace(search, JSON.stringify(replace));
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            replaceInObject(obj[key], search, replace);
          }
        }
      };
      
      // Replace {{prev.output}}
      if (prev?.output) {
        replaceInObject(resolved, '{{prev.output}}', prev.output);
      }
      
      return resolved;
    };
    
    // Workflow handler
global.coworker._handleWorkflow = async function(context) {
  let children = context.input?.children || [];
  
  // NEW: Use template instead of doctype
  const template = context.template || context.doctype;  // Backward compat
  
  if (template) {
    const tpl = await this.run({ 
      operation: 'select', 
      from: 'Workflow Template',  // Changed from doctype
      input: { where: { name: template } } 
    });
        
        console.log('Template fetch result:', tpl);
        
        if (!tpl.output?.data?.[0]) {
          throw new Error(`Template not found: ${template}`);
        }
        
        children = tpl.output.data[0].children || [];
        console.log('Loaded children:', children);
      }
      
      const results = [];
      let parentRunId = context.id;
      
      for (const child of children) {
        const resolved = this._resolveTemplates(child, results);
        const childRun = await this.run({
          ...resolved,
          options: { ...resolved.options, parentRunId }
        });
        results.push(childRun);
        parentRunId = childRun.id;
        if (!childRun.success) break;
      }
      
      return { success: true, output: { steps: results } };
    };
  }
})(window);