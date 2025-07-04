(function() {
  // Widget configuration and data AI saving to custom_text field
  const WIDGET_CONFIG = {
    "data": {
      "settings": {
        "erpUrl": window.location.origin,
        "aiProvider": "demo",
        "aiApiKey": "",
        "lastQuery": ""
      },
      "history": [],
      "favorites": [
        "Show me all sales invoices from this month",
        "Get customers with outstanding balance greater than 10000",
        "List items with stock quantity below 50",
        "Find all draft purchase orders",
        "Get employee details for HR department"
      ]
    }
  };
  
  // Mock AI responses for demo mode - now with result display
  const mockAIResponses = {
    'invoice': `// Get sales invoices
frappe.call({
  method: 'frappe.client.get_list',
  args: {
    doctype: 'Sales Invoice',
    fields: ['name', 'customer', 'grand_total', 'status', 'posting_date'],
    limit_page_length: 20,
    order_by: 'posting_date desc'
  },
  callback: function(r) {
    if (r.message) {
      displayResults(r.message, 'Sales Invoice');
      return r.message;
    }
  }
});`,
    
    'customer': `// Get customers with outstanding balance
frappe.call({
  method: 'frappe.client.get_list',
  args: {
    doctype: 'Customer',
    fields: ['name', 'customer_name', 'customer_type', 'territory'],
    limit_page_length: 50,
    order_by: 'outstanding_amount desc'
  },
  callback: function(r) {
    if (r.message) {
      displayResults(r.message, 'Customer');
      return r.message;
    }
  }
});`,
    
    'item': `// Get items with low stock
frappe.call({
  method: 'frappe.client.get_list',
  args: {
    doctype: 'Item',
    fields: ['name', 'item_name', 'stock_qty', 'item_group', 'valuation_rate'],
    limit_page_length: 100,
    order_by: 'stock_qty asc'
  },
  callback: function(r) {
    if (r.message) {
      displayResults(r.message, 'Item');
      return r.message;
    }
  }
});`,
    
    'purchase': `// Get draft purchase orders
frappe.call({
  method: 'frappe.client.get_list',
  args: {
    doctype: 'Purchase Order',
    fields: ['name', 'supplier', 'grand_total', 'transaction_date', 'status'],
    limit_page_length: 20,
    order_by: 'transaction_date desc'
  },
  callback: function(r) {
    if (r.message) {
      displayResults(r.message, 'Purchase Order');
      return r.message;
    }
  }
});`,
    
    'employee': `// Get HR department employees
frappe.call({
  method: 'frappe.client.get_list',
  args: {
    doctype: 'Employee',
    fields: ['name', 'employee_name', 'designation', 'department', 'status'],
    limit_page_length: 50,
    order_by: 'employee_name asc'
  },
  callback: function(r) {
    if (r.message) {
      displayResults(r.message, 'Employee');
      return r.message;
    }
  }
});`,
    
    'default': `// Generic frappe call example
frappe.call({
  method: 'frappe.client.get_list',
  args: {
    doctype: 'DocType_Name',
    fields: ['name', 'field1', 'field2'],
    filters: [],
    limit_page_length: 20,
    order_by: 'creation desc'
  },
  callback: function(r) {
    if (r.message) {
      displayResults(r.message, 'DocType_Name');
      return r.message;
    }
  }
});`
  };

  // Results display function
  function displayResults(data, doctype) {
    const resultsContainer = document.getElementById('executionResults');
    if (!resultsContainer || !data || !Array.isArray(data)) {
      return;
    }

    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Create results header
    const header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 15px;
      padding: 10px;
      background: #e8f4fd;
      border-left: 4px solid #2196F3;
      border-radius: 4px;
    `;
    header.innerHTML = `
      <h6 style="margin: 0; color: #1976D2;">
        <i class="fa fa-list mr-2"></i>${doctype} Results (${data.length} items)
      </h6>
    `;
    resultsContainer.appendChild(header);

    // Create results list
    const resultsList = document.createElement('div');
    resultsList.style.cssText = `
      max-height: 350px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
    `;

    data.forEach((item, index) => {
      const resultItem = document.createElement('div');
      resultItem.style.cssText = `
        padding: 12px 15px;
        border-bottom: 1px solid #eee;
        transition: background-color 0.2s;
        cursor: pointer;
      `;
      
      // Hover effect
      resultItem.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#f5f5f5';
      });
      resultItem.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
      });

      // Click handler to open document
      resultItem.addEventListener('click', function() {
        if (item.name) {
          const url = `${window.location.origin}/app/${doctype.toLowerCase().replace(' ', '-')}/${item.name}`;
          window.open(url, '_blank');
        }
      });

      // Build item display content
      let displayContent = '';
      
      // Primary field (usually name or title)
      const primaryField = item.name || item.title || Object.values(item)[0];
      displayContent += `
        <div style="font-weight: 600; color: #2196F3; margin-bottom: 5px;">
          <i class="fa fa-external-link mr-2" style="font-size: 12px;"></i>${primaryField}
        </div>
      `;

      // Secondary fields
      const secondaryFields = Object.entries(item)
        .filter(([key, value]) => key !== 'name' && value !== null && value !== '')
        .slice(0, 3); // Show max 3 additional fields

      if (secondaryFields.length > 0) {
        displayContent += '<div style="font-size: 13px; color: #666;">';
        secondaryFields.forEach(([key, value]) => {
          const fieldLabel = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          displayContent += `<span style="margin-right: 15px;"><strong>${fieldLabel}:</strong> ${value}</span>`;
        });
        displayContent += '</div>';
      }

      resultItem.innerHTML = displayContent;
      resultsList.appendChild(resultItem);
    });

    resultsContainer.appendChild(resultsList);

    // Add summary footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: 10px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 12px;
      color: #666;
    `;
    footer.innerHTML = `
      <i class="fa fa-info-circle mr-2"></i>Click on any item to open in new tab
    `;
    resultsContainer.appendChild(footer);
  }

  // Initialize or load existing data
  function getWidgetData() {
    try {
      let currentValue = cur_frm.get_field('custom_text').value;
      let dataMatch = currentValue.match(/WIDGET_CONFIG\s*=\s*({[\s\S]*?});/);
      if (dataMatch) {
        let extractedConfig = eval('(' + dataMatch[1] + ')');
        return extractedConfig.data;
      }
    } catch (error) {
      console.log('Using default widget data');
    }
    return WIDGET_CONFIG.data;
  }

  // Save updated data back to custom_text
  function saveWidgetData(newData) {
    try {
      let currentCode = cur_frm.get_field('custom_text').value;
      let updatedConfig = { data: newData };
      let newCode = currentCode.replace(
        /WIDGET_CONFIG\s*=\s*{[\s\S]*?};/,
        `WIDGET_CONFIG = ${JSON.stringify(updatedConfig, null, 6)};`
      );
      cur_frm.set_value('custom_text', newCode);
      cur_frm.save();
      console.log('✅ Widget data saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save widget data:', error);
      return false;
    }
  }

  // AI Code Generator Component
  function createAIWidget() {
    const widgetData = getWidgetData();
    let generatedCode = '';
    let isGenerating = false;
    let isExecuting = false;

    // Create main container
    const container = document.createElement('div');
    container.className = 'ai-code-generator-widget';
    container.style.cssText = `
      margin: 20px 0;
      padding: 20px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-color);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `;

    // Create header
    const header = document.createElement('div');
    header.className = 'widget-header d-flex align-items-center justify-content-between mb-3';
    header.innerHTML = `
      <h5 class="mb-0 text-primary">
        <i class="fa fa-robot mr-2"></i>AI Code Generator
      </h5>
      <small class="text-muted">Transform natural language into ERPNext API calls</small>
    `;

    // Create settings panel
    const settingsPanel = document.createElement('div');
    settingsPanel.className = 'settings-panel mb-3';
    settingsPanel.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="fa fa-cog mr-2"></i>Configuration
          </h6>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label class="control-label">AI Provider</label>
                <select class="form-control" id="aiProvider">
                  <option value="demo">Demo Mode (Mock AI)</option>
                  <option value="openai">OpenAI GPT</option>
                </select>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label class="control-label">OpenAI API Key</label>
                <input type="password" class="form-control" id="aiApiKey" value="${widgetData.settings.aiApiKey}">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Create query section
    const querySection = document.createElement('div');
    querySection.className = 'query-section mb-3';
    querySection.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="fa fa-comment mr-2"></i>Natural Language Query
          </h6>
        </div>
        <div class="card-body">
          <div class="form-group">
            <textarea class="form-control" id="queryInput" rows="4">${widgetData.settings.lastQuery}</textarea>
          </div>
          
          <div class="favorites-section mb-3">
            <label class="control-label">💡 Quick Examples:</label>
            <div class="btn-group-vertical d-block">
              ${widgetData.favorites.map(fav => 
                `<button type="button" class="btn btn-sm btn-outline-primary mb-1 favorite-btn" style="text-align: left; white-space: normal;">${fav}</button>`
              ).join('')}
            </div>
          </div>
          
          <div class="action-buttons">
            <button class="btn btn-primary" id="generateBtn">
              <i class="fa fa-magic mr-2"></i>Generate Code
            </button>
            <button class="btn btn-success ml-2" id="executeBtn" disabled>
              <i class="fa fa-play mr-2"></i>Execute Code
            </button>
            <button class="btn btn-secondary ml-2" id="clearBtn">
              <i class="fa fa-trash mr-2"></i>Clear
            </button>
          </div>
        </div>
      </div>
    `;

    // Create results section
    const resultsSection = document.createElement('div');
    resultsSection.className = 'results-section';
    resultsSection.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">
                <i class="fa fa-code mr-2"></i>Generated Code
              </h6>
            </div>
            <div class="card-body">
              <pre class="code-block" id="generatedCode" style="background: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                max-height: 400px;
                overflow-y: auto;
                font-size: 12px;
                line-height: 1.4;">// Generated code will appear here...</pre>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">
                <i class="fa fa-list mr-2"></i>Query Results
              </h6>
            </div>
            <div class="card-body">
              <div class="results-block" id="executionResults" style="background: #f8f9fa;
                padding: 15px;
                border-radius: 4px;
                max-height: 400px;
                overflow-y: auto;
                font-size: 12px;
                line-height: 1.4;">
                <div style="text-align: center; color: #666; padding: 20px;">
                  <i class="fa fa-search" style="font-size: 24px; margin-bottom: 10px;"></i>
                  <p>Execute code to see results here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator text-center mt-3';
    loadingIndicator.style.display = 'none';
    loadingIndicator.innerHTML = `
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only">Loading...</span>
      </div>
      <p class="mt-2 text-muted">AI is generating your code...</p>
    `;

    // Assemble the widget
    container.appendChild(header);
    container.appendChild(settingsPanel);
    container.appendChild(querySection);
    container.appendChild(loadingIndicator);
    container.appendChild(resultsSection);

    // Event handlers
    function setupEventListeners() {
      // Favorite buttons
      container.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          document.getElementById('queryInput').value = this.textContent;
        });
      });

      // Generate code button
      document.getElementById('generateBtn').addEventListener('click', generateCode);
      
      // Execute code button
      document.getElementById('executeBtn').addEventListener('click', executeCode);
      
      // Clear button
      document.getElementById('clearBtn').addEventListener('click', clearResults);

      // Save settings on change
      document.getElementById('aiProvider').addEventListener('change', saveSettings);
      document.getElementById('aiApiKey').addEventListener('change', saveSettings);
    }

    function saveSettings() {
      const newData = {
        ...widgetData,
        settings: {
          ...widgetData.settings,
          aiProvider: document.getElementById('aiProvider').value,
          aiApiKey: document.getElementById('aiApiKey').value,
          lastQuery: document.getElementById('queryInput').value
        }
      };
      saveWidgetData(newData);
    }

    async function generateCode() {
      const query = document.getElementById('queryInput').value.trim();
      const aiProvider = document.getElementById('aiProvider').value;
      
      if (!query) {
        frappe.msgprint('Please enter a query');
        return;
      }

      if (isGenerating) return;
      isGenerating = true;

      // Update UI
      document.getElementById('generateBtn').disabled = true;
      document.getElementById('generateBtn').innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i>Generating...';
      loadingIndicator.style.display = 'block';

      try {
        let code = '';
        
        if (aiProvider === 'demo') {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Simple keyword matching for demo
          const queryLower = query.toLowerCase();
          if (queryLower.includes('invoice')) {
            code = mockAIResponses.invoice;
          } else if (queryLower.includes('customer')) {
            code = mockAIResponses.customer;
          } else if (queryLower.includes('item') || queryLower.includes('stock')) {
            code = mockAIResponses.item;
          } else if (queryLower.includes('purchase')) {
            code = mockAIResponses.purchase;
          } else if (queryLower.includes('employee') || queryLower.includes('hr')) {
            code = mockAIResponses.employee;
          } else {
            code = mockAIResponses.default;
          }
        } else if (aiProvider === 'openai') {
          const apiKey = document.getElementById('aiApiKey').value;
          if (!apiKey) {
            throw new Error('OpenAI API key is required');
          }
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: "gpt-4",
              messages: [
                { 
                  role: "system", 
                  content: `You are an ERPNext/Frappe Framework expert. Generate JavaScript code that uses frappe.call() to interact with ERPNext API based on user queries. 
                  
                  Guidelines:
                  - Use frappe.call() with method 'frappe.client.get_list' or 'frappe.client.get'
                  - Include proper doctype, fields, filters, and limits
                  - Handle common ERPNext doctypes: Sales Invoice, Customer, Item, Purchase Order, Employee, etc.
                  - Use ERPNext filter syntax: [['field', 'operator', 'value']]
                  - In callback function, use: displayResults(r.message, 'DocType_Name'); instead of console.log
                  - Return only executable JavaScript code with comments
                  - The displayResults function expects (data_array, doctype_string) parameters` 
                },
                { role: "user", content: query }
              ],
              temperature: 0.3
            })
          });
          
          if (!response.ok) {
            throw new Error('OpenAI API request failed');
          }
          
          const data = await response.json();
          code = data.choices[0].message.content;
          
          // Clean up code if it's wrapped in markdown
          code = code.replace(/```javascript\n?/g, '').replace(/```\n?/g, '');
        }
        
        generatedCode = code;
        document.getElementById('generatedCode').textContent = code;
        document.getElementById('executeBtn').disabled = false;
        
        // Save query to history
        saveSettings();
        
        frappe.show_alert({
          message: 'Code generated successfully!',
          indicator: 'green'
        }, 3);
        
      } catch (error) {
        frappe.msgprint({
          title: 'Generation Error',
          message: 'Error generating code: ' + error.message,
          indicator: 'red'
        });
      } finally {
        isGenerating = false;
        document.getElementById('generateBtn').disabled = false;
        document.getElementById('generateBtn').innerHTML = '<i class="fa fa-magic mr-2"></i>Generate Code';
        loadingIndicator.style.display = 'none';
      }
    }

    async function executeCode() {
      if (!generatedCode) {
        frappe.msgprint('No code to execute. Generate code first.');
        return;
      }

      if (isExecuting) return;
      isExecuting = true;

      // Update UI
      document.getElementById('executeBtn').disabled = true;
      document.getElementById('executeBtn').innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i>Executing...';

      try {
        // Make displayResults function available globally for the executed code
        window.displayResults = displayResults;
        
        // Execute the generated code
        const executeFunction = new Function(`
          return new Promise((resolve, reject) => {
            try {
              ${generatedCode}
              // If no explicit callback was defined, resolve after a short delay
              setTimeout(() => resolve('Code executed successfully'), 2000);
            } catch (error) {
              reject(error);
            }
          });
        `);
        
        await executeFunction();
        
        frappe.show_alert({
          message: 'Code executed successfully!',
          indicator: 'green'
        }, 3);
        
      } catch (error) {
        const resultsContainer = document.getElementById('executionResults');
        resultsContainer.innerHTML = `
          <div style="color: #d32f2f; padding: 15px; background: #ffebee; border-radius: 4px;">
            <i class="fa fa-exclamation-triangle mr-2"></i>
            <strong>Execution Error:</strong> ${error.message}
          </div>
        `;
        
        frappe.msgprint({
          title: 'Execution Error',
          message: 'Error executing code: ' + error.message,
          indicator: 'red'
        });
      } finally {
        isExecuting = false;
        document.getElementById('executeBtn').disabled = false;
        document.getElementById('executeBtn').innerHTML = '<i class="fa fa-play mr-2"></i>Execute Code';
      }
    }

    function clearResults() {
      document.getElementById('generatedCode').textContent = '// Generated code will appear here...';
      document.getElementById('executionResults').innerHTML = `
        <div style="text-align: center; color: #666; padding: 20px;">
          <i class="fa fa-search" style="font-size: 24px; margin-bottom: 10px;"></i>
          <p>Execute code to see results here</p>
        </div>
      `;
      document.getElementById('queryInput').value = '';
      document.getElementById('executeBtn').disabled = true;
      generatedCode = '';
    }

    // Setup event listeners after DOM is ready
    setTimeout(setupEventListeners, 100);
    return container;
  }

  // Initialize the widget
  try {
    // Find the target container (usually near the custom_text field)
    const targetContainer = document.querySelector('[data-fieldname="custom_text"]')?.closest('.frappe-control');
    
    if (targetContainer) {
      // Remove existing widget if present
      const existingWidget = document.getElementById('ai-code-generator-widget');
      if (existingWidget) {
        existingWidget.remove();
      }

      // Create and inject the widget
      const widgetContainer = createAIWidget();
      widgetContainer.id = 'ai-code-generator-widget';
      targetContainer.parentNode.insertBefore(widgetContainer, targetContainer);
      
      console.log('✅ AI Code Generator Widget rendered successfully');
    } else {
      console.error('❌ Could not find target container for widget');
      frappe.msgprint('Could not initialize AI Code Generator widget');
    }
  } catch (error) {
    console.error('❌ Widget initialization failed:', error);
    frappe.msgprint('Failed to initialize AI Code Generator widget: ' + error.message);
  }
})();