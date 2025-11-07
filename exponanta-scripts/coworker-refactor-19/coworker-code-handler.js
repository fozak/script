// coworker-code-handler.js (browser version)
(function(global) {
  'use strict';
  
  if (typeof global.coworker !== 'undefined') {
    
    // Code handler - executes custom JavaScript with context helpers
    global.coworker._handleCode = async function(context) {
      const code = context.input?.code;
      
      if (!code) {
        throw new Error('Code handler requires input.code');
      }
      
      // Parse function from string
      let fn;
      try {
        // Wrap in parentheses to ensure it's treated as expression
        fn = eval(`(${code})`);
      } catch (parseError) {
        throw new Error(`Code parsing failed: ${parseError.message}`);
      }
      
      if (typeof fn !== 'function') {
        throw new Error('Code must be a function expression');
      }
      
      // Build helper context with 'this' bindings
      const helpers = {
        // Wait for user input from chat interface
        waitForUserInput: async () => {
          return await this._waitForChatInput(context);
        },
        
        // Call Anthropic streaming API
        callAnthropicStream: async (options) => {
          return await this._streamAnthropicResponse(context, options);
        },
        
        // Access to coworker.run for nested operations
        run: async (params) => {
          return await this.run(params);
        }
      };
      
      // Execute with helpers bound as 'this'
      try {
        const result = await fn.call(helpers, context);
        
        return {
          success: true,
          output: result
        };
      } catch (execError) {
        throw new Error(`Code execution failed: ${execError.message}`);
      }
    };
    
    // Helper: Wait for user to submit chat input
    global.coworker._waitForChatInput = async function(context) {
      // Create a pending state that chat UI can detect
      const pendingRunId = context.id;
      
      return new Promise((resolve) => {
        // Store resolver in global registry for chat UI to trigger
        if (!global.coworker._chatInputResolvers) {
          global.coworker._chatInputResolvers = {};
        }
        
        global.coworker._chatInputResolvers[pendingRunId] = resolve;
        
        // Update run status to signal chat UI
        if (typeof CoworkerState !== 'undefined') {
          CoworkerState._updateFromRun({
            ...context,
            status: 'awaiting_input',
            output: { waitingForInput: true }
          });
        }
      });
    };
    
    // Helper: Stream Anthropic API response
    global.coworker._streamAnthropicResponse = async function(context, options) {
      const apiKey = options.apiKey || global.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        throw new Error('Anthropic API key not configured');
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model || 'claude-sonnet-4-5-20250929',
          messages: options.messages || [],
          max_tokens: options.max_tokens || 1024,
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const tokens = [];
      let fullText = '';
      
      // Update run state as tokens arrive
      const updateTokens = (newToken) => {
        tokens.push(newToken);
        fullText += newToken;
        
        if (typeof CoworkerState !== 'undefined') {
          CoworkerState._updateFromRun({
            ...context,
            status: 'running',
            output: {
              tokens: [...tokens],
              fullText: fullText,
              streaming: true
            }
          });
        }
      };
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                
                // Handle content_block_delta events
                if (parsed.type === 'content_block_delta' && 
                    parsed.delta?.text) {
                  updateTokens(parsed.delta.text);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      return {
        tokens: tokens,
        fullText: fullText,
        completed: true
      };
    };
    
    console.log('✅ Code handler installed with waitForUserInput and callAnthropicStream');
  }
  
})(typeof window !== 'undefined' ? window : global);