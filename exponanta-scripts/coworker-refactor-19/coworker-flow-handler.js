// coworker-flow-handler.js (browser version)
(function(global) {
  'use strict';
  
  if (typeof global.coworker !== 'undefined') {
    
    // Template resolver helper (keeps variable substitution)
    global.coworker._resolveTemplates = function(step, results) {
      const resolved = JSON.parse(JSON.stringify(step));
      const prev = results[results.length - 1];
      
      const replaceInObject = (obj, search, replace) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string' && obj[key].includes(search)) {
            obj[key] = obj[key].replace(search, JSON.stringify(replace));
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            replaceInObject(obj[key], search, replace);
          }
        }
      };
      
      if (prev?.output) {
        replaceInObject(resolved, '{{prev.output}}', prev.output);
      }
      
      return resolved;
    };
    
    // Flow handler
    global.coworker._handleFlow = async function(context) {
      let steps = context.input?.steps || [];
      
      // Load from template if specified
      const template = context.template || context.doctype;
      
      if (template) {
        const tpl = await this.run({ 
          operation: 'select', 
          from: 'flow_template',
          input: { where: { name: template } } 
        });
        
        if (!tpl.output?.data?.[0]) {
          throw new Error(`Flow template not found: ${template}`);
        }
        
        steps = tpl.output.data[0].steps || [];
      }
      
      if (!steps.length) {
        throw new Error('Flow requires steps (provide input.steps or template)');
      }
      
      // Generate flowId for this execution
      const flowId = generateId('flow');
      const flowType = context.input?.flowType || 'workflow';
      
      const results = [];
      let parentRunId = context.id;
      
      // Execute each step
for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const resolved = this._resolveTemplates(step, results);
  
  const stepId = generateId('step');
  const step_order = `step-${i + 1}`;
  const step_title = step.step_title || `${resolved.operation}-${resolved.doctype}`.toLowerCase();
  
  const childRun = await this.run({
    ...resolved,
    options: { 
      ...resolved.options, 
      parentRunId,
      flowId,
      flowType,
      stepId,
      step_order,
      step_title
    }
  });
  
  results.push(childRun);
  parentRunId = childRun.id;
  
  if (!childRun.success && !step.continueOnError) break;
}
      
      const allSuccess = results.every(r => r.success);
      
      return { 
        success: allSuccess, 
        output: { 
          flowId,
          flowType,
          steps: results,
          completedSteps: results.length,
          totalSteps: steps.length
        } 
      };
    };
    
    // Alias for backward compatibility
    global.coworker._handleWorkflow = async function(context) {
      return this._handleFlow({
        ...context,
        input: {
          ...context.input,
          flowType: 'workflow'
        }
      });
    };
  }
})(window);

