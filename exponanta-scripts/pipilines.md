https://claude.ai/chat/615601ed-6f9c-4f82-852e-96c8f2449f1e

1. Gmail Fetch Adapter
javascript// ============================================================================
// GMAIL FETCH ADAPTER
// ============================================================================

const GmailFetchAdapter = {
  name: 'gmail',
  
  /**
   * @method init
   * @description Initialize Gmail API client
   */
  async init(context) {
    // Get Gmail provider from context
    this.provider = context.pb._getGmailProvider?.(context.pb.emailAccount);
    if (!this.provider) {
      throw new Error('Gmail provider not configured');
    }
    console.log('✅ Gmail adapter initialized');
  },
  
  /**
   * @method fetch
   * @description Fetch data from Gmail
   */
  async fetch(context, config) {
    const {
      operation = 'getThreads',
      sender,
      limit = 10,
      query,
      source = 'source'  // Which cache to get senders from
    } = config;
    
    // Get senders from context
    const sourceData = context.cache[source];
    if (!sourceData) {
      throw new Error(`No source data found: ${source}`);
    }
    
    const senders = Array.isArray(sourceData)
      ? sourceData.map(d => d.email || d.sender)
      : [sourceData.email || sourceData.sender];
    
    const results = [];
    
    switch (operation) {
      case 'getThreads':
        for (const sender of senders) {
          const threads = await this.provider.getThreadsFromSenderWithSubject(
            sender,
            limit
          );
          results.push({
            sender,
            threads,
            count: threads.length
          });
        }
        break;
        
      case 'search':
        const messages = await this.provider.searchMessages(query);
        results.push({
          query,
          messages,
          count: messages.length
        });
        break;
        
      case 'getMessage':
        for (const messageId of senders) {
          const message = await this.provider.getMessage(messageId);
          results.push(message);
        }
        break;
        
      default:
        throw new Error(`Unknown Gmail operation: ${operation}`);
    }
    
    // Create ExternalAction document
    await context.pb.query('ExternalAction', {
      operation: 'create',
      data: {
        pipeline_execution: context.execution.data[0].name,
        action_type: 'fetch_gmail',
        provider: 'gmail',
        status: 'Success',
        request_data: config,
        response_data: { resultsCount: results.length },
        messages_processed: results.reduce((sum, r) => sum + (r.count || 1), 0)
      }
    });
    
    return {
      provider: 'gmail',
      operation,
      results,
      totalCount: results.length
    };
  },
  
  /**
   * @method cleanup
   */
  async cleanup(context) {
    console.log('🧹 Gmail adapter cleanup');
  }
};

// Register adapter
pb.registerAdapter('fetch', 'gmail', GmailFetchAdapter);

2. OpenAI Process Adapter
javascript// ============================================================================
// OPENAI PROCESS ADAPTER
// ============================================================================

const OpenAIProcessAdapter = {
  name: 'openai',
  
  async init(context) {
    // Initialize OpenAI client
    this.apiKey = context.config.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    console.log('✅ OpenAI adapter initialized');
  },
  
  async process(context, config) {
    const {
      operation = 'categorize',
      source = 'source',
      threads = '@fetch_gmail.results',
      categories = '@categories',
      model = 'gpt-4'
    } = config;
    
    // Resolve data sources
    const sourceData = context.cache[source];
    const threadsData = resolveFieldValue(threads, null, context);
    const categoriesData = resolveFieldValue(categories, null, context);
    
    const results = [];
    
    for (let i = 0; i < sourceData.length; i++) {
      const item = sourceData[i];
      const itemThreads = threadsData?.[i]?.threads || [];
      
      // Call OpenAI
      const aiResult = await this.callOpenAI({
        operation,
        item,
        threads: itemThreads,
        categories: categoriesData,
        model
      });
      
      results.push({
        ...item,
        aiResult
      });
    }
    
    // Track external action
    await context.pb.query('ExternalAction', {
      operation: 'create',
      data: {
        pipeline_execution: context.execution.data[0].name,
        action_type: 'process_ai',
        provider: 'openai',
        status: 'Success',
        request_data: config,
        response_data: { processed: results.length }
      }
    });
    
    return {
      operation,
      processed: results.length,
      data: results
    };
  },
  
  async callOpenAI({ operation, item, threads, categories, model }) {
    // Simulate AI call (replace with actual OpenAI API)
    const prompt = this.buildPrompt(operation, item, threads, categories);
    
    // TODO: Actual OpenAI API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    const data = await response.json();
    
    return {
      category: data.choices[0].message.content,
      confidence: 0.95,
      model,
      requestId: data.id
    };
  },
  
  buildPrompt(operation, item, threads, categories) {
    switch (operation) {
      case 'categorize':
        return `Categorize this sender: ${item.email}
        
Available categories: ${categories.map(c => c.name).join(', ')}
Recent emails: ${threads.map(t => t.subject).join(', ')}

Return only the category name.`;
        
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },
  
  async cleanup(context) {
    console.log('🧹 OpenAI adapter cleanup');
  }
};

pb.registerAdapter('process', 'openai', OpenAIProcessAdapter);

3. Gmail Sync Adapter
javascript// ============================================================================
// GMAIL SYNC ADAPTER
// ============================================================================

const GmailSyncAdapter = {
  name: 'gmail',
  
  async init(context) {
    this.provider = context.pb._getGmailProvider?.(context.pb.emailAccount);
    if (!this.provider) {
      throw new Error('Gmail provider not configured');
    }
    console.log('✅ Gmail sync adapter initialized');
  },
  
  async sync(context, config) {
    const {
      operation = 'applyLabels',
      source = '@process_openai.data',
      labelMapping = 'aiResult.category'
    } = config;
    
    const data = resolveFieldValue(source, null, context);
    const synced = [];
    
    switch (operation) {
      case 'applyLabels':
        for (const item of data) {
          const category = getNestedValue(item, labelMapping);
          
          if (category) {
            // Get Gmail label ID for category
            const labelId = await this.provider.getLabelForCategory(category);
            
            // Get message IDs from threads
            const messageIds = item.threads?.map(t => t.id) || [];
            
            if (messageIds.length > 0) {
              await this.provider.batchModifyMessages(messageIds, {
                addLabelIds: [labelId]
              });
              
              synced.push({
                sender: item.email,
                category,
                labelId,
                messagesLabeled: messageIds.length
              });
            }
          }
        }
        break;
        
      default:
        throw new Error(`Unknown sync operation: ${operation}`);
    }
    
    // Track external action
    await context.pb.query('ExternalAction', {
      operation: 'create',
      data: {
        pipeline_execution: context.execution.data[0].name,
        action_type: 'sync_gmail',
        provider: 'gmail',
        status: 'Success',
        request_data: config,
        response_data: { synced: synced.length },
        messages_processed: synced.reduce((sum, s) => sum + s.messagesLabeled, 0)
      }
    });
    
    return {
      operation,
      synced: synced.length,
      results: synced
    };
  },
  
  async cleanup(context) {
    console.log('🧹 Gmail sync adapter cleanup');
  }
};

pb.registerAdapter('sync', 'gmail', GmailSyncAdapter);

4. Outlook Adapter (Example)
javascript// ============================================================================
// OUTLOOK FETCH ADAPTER
// ============================================================================

const OutlookFetchAdapter = {
  name: 'outlook',
  
  async init(context) {
    // Initialize Outlook client
    this.client = context.pb._getOutlookClient?.(context.pb.emailAccount);
    console.log('✅ Outlook adapter initialized');
  },
  
  async fetch(context, config) {
    const { operation = 'getMessages', sender, source = 'source' } = config;
    
    const sourceData = context.cache[source];
    const results = [];
    
    for (const item of sourceData) {
      const messages = await this.client.getMessages({
        filter: `from/emailAddress/address eq '${item.email}'`,
        top: config.limit || 10
      });
      
      results.push({
        sender: item.email,
        messages,
        count: messages.length
      });
    }
    
    return {
      provider: 'outlook',
      operation,
      results
    };
  },
  
  async cleanup(context) {
    console.log('🧹 Outlook adapter cleanup');
  }
};

pb.registerAdapter('fetch', 'outlook', OutlookFetchAdapter);

5. Stripe Adapter (Example)
javascript// ============================================================================
// STRIPE FETCH ADAPTER
// ============================================================================

const StripeFetchAdapter = {
  name: 'stripe',
  
  async init(context) {
    this.stripe = require('stripe')(context.config.stripeApiKey);
    console.log('✅ Stripe adapter initialized');
  },
  
  async fetch(context, config) {
    const { operation = 'getCustomers', source = 'source' } = config;
    
    const sourceData = context.cache[source];
    const results = [];
    
    for (const item of sourceData) {
      switch (operation) {
        case 'getCustomers':
          const customers = await this.stripe.customers.list({
            email: item.email,
            limit: 1
          });
          results.push({
            email: item.email,
            stripeCustomer: customers.data[0] || null
          });
          break;
          
        case 'getInvoices':
          const invoices = await this.stripe.invoices.list({
            customer: item.stripe_customer_id,
            limit: config.limit || 10
          });
          results.push({
            customer: item.stripe_customer_id,
            invoices: invoices.data
          });
          break;
      }
    }
    
    return {
      provider: 'stripe',
      operation,
      results
    };
  },
  
  async cleanup(context) {
    console.log('🧹 Stripe adapter cleanup');
  }
};

pb.registerAdapter('fetch', 'stripe', StripeFetchAdapter);

🎯 Usage Examples
Example 1: Newsletter Categorization (Universal)
javascript// Register all adapters first
pb.registerAdapter('fetch', 'gmail', GmailFetchAdapter);
pb.registerAdapter('process', 'openai', OpenRetryDDwhich approach you recommend out af the above🎯 I recommend the LAST approach: Universal Adapter System
Here's why, and how to implement it practically:

✅ Why Universal Adapters Win
1. Separation of Concerns
javascript// Core pipeline logic = stable
// Adapters = pluggable and replaceable

// Change Gmail to Outlook? Just swap the adapter
pb.pipeline('CategorizeSenders')
  .fetch('outlook', {...})  // ← Changed from 'gmail'
  .process('openai', {...})
  .sync('outlook', {...})
2. Testability
javascript// Mock adapters for testing
const MockGmailAdapter = {
  async fetch(ctx, config) {
    return { results: MOCK_DATA };
  }
};

pb.registerAdapter('fetch', 'gmail-mock', MockGmailAdapter);

// Test pipeline without hitting real Gmail API
await pb.pipeline('test')
  .fetch('gmail-mock', {...})
  .execute();
3. Extensibility
javascript// Add new providers WITHOUT touching core code
pb.registerAdapter('fetch', 'salesforce', SalesforceAdapter);
pb.registerAdapter('fetch', 'hubspot', HubspotAdapter);
pb.registerAdapter('fetch', 'notion', NotionAdapter);

// Now use them immediately
pb.pipeline('EnrichContacts')
  .source('Contact', {...})
  .fetch('salesforce', {...})
  .fetch('hubspot', {...})
  .fetch('notion', {...})
  .process('openai', { operation: 'enrich' })
  .sync('internal', {...})
4. Reusability
javascript// Same adapter, different pipelines
pb.pipeline('Pipeline1').fetch('gmail', {...}).execute();
pb.pipeline('Pipeline2').fetch('gmail', {...}).execute();
pb.pipeline('Pipeline3').fetch('gmail', {...}).execute();
5. Configuration Management
javascript// Adapters can have their own config
const gmailConfig = {
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  rateLimitPerMinute: 100
};

pb.registerAdapter('fetch', 'gmail', createGmailAdapter(gmailConfig));

🏗️ Recommended Implementation Strategy
Phase 1: Start Simple (Week 1)
javascript// ============================================================================
// MINIMAL VIABLE ADAPTER SYSTEM
// ============================================================================

// 1. Core registry (20 lines)
const ADAPTERS = { fetch: {}, process: {}, sync: {} };

pb.registerAdapter = (type, name, adapter) => {
  ADAPTERS[type][name] = adapter;
};

// 2. Simple pipeline (50 lines)
pb.pipeline = async (name) => {
  const ctx = { cache: {}, stages: [] };
  
  return {
    fetch(adapter, config) {
      ctx.stages.push({ type: 'fetch', adapter, config });
      return this;
    },
    
    process(adapter, config) {
      ctx.stages.push({ type: 'process', adapter, config });
      return this;
    },
    
    async execute() {
      for (const stage of ctx.stages) {
        const adapter = ADAPTERS[stage.type][stage.adapter];
        const result = await adapter[stage.type](ctx, stage.config);
        ctx.cache[stage.adapter] = result;
      }
      return ctx.cache;
    }
  };
};

// 3. One adapter to prove it works (30 lines)
pb.registerAdapter('fetch', 'gmail', {
  async fetch(ctx, config) {
    // Actual Gmail API call
    return { threads: [...] };
  }
});

// 4. Use it immediately
const result = await pb
  .pipeline('test')
  .fetch('gmail', { sender: 'x@y.com' })
  .execute();
Benefits:

✅ Working in 1 day
✅ Proves the concept
✅ Can iterate quickly


Phase 2: Add Tracking (Week 2)
javascript// Add document tracking like Inbox Zero
pb.pipeline = async (name) => {
  const ctx = { cache: {}, stages: [], documents: {} };
  
  // Create execution document
  ctx.execution = await pb.query('PipelineExecution', {
    operation: 'create',
    data: { pipeline_name: name, status: 'Running' }
  });
  
  return {
    fetch(adapter, config) {
      ctx.stages.push({ 
        type: 'fetch', 
        adapter, 
        config,
        trackAs: 'ExternalAction'  // ← Track externals like Inbox Zero
      });
      return this;
    },
    
    async execute() {
      for (const stage of ctx.stages) {
        // Create stage tracking doc
        const stageDoc = await pb.query('PipelineStage', {
          operation: 'create',
          data: { 
            parent: ctx.execution.data[0].name,
            stage_type: stage.type 
          }
        });
        
        // Execute
        const adapter = ADAPTERS[stage.type][stage.adapter];
        const result = await adapter[stage.type](ctx, stage.config);
        
        // Update tracking
        await pb.query('PipelineStage', {
          operation: 'update',
          where: { name: stageDoc.name },
          data: { status: 'Success', output_data: result }
        });
        
        ctx.cache[stage.adapter] = result;
        ctx.documents[stage.adapter] = stageDoc;
      }
      
      return { 
        result: ctx.cache,
        tracking: ctx.documents 
      };
    }
  };
};
Benefits:

✅ Full audit trail
✅ Debuggable
✅ Production-ready


Phase 3: Add More Adapters (Ongoing)
javascript// Just keep adding adapters as needed
pb.registerAdapter('fetch', 'outlook', OutlookAdapter);
pb.registerAdapter('fetch', 'salesforce', SalesforceAdapter);
pb.registerAdapter('process', 'anthropic', AnthropicAdapter);
pb.registerAdapter('sync', 'notion', NotionAdapter);

📊 Comparison Matrix
ApproachComplexityFlexibilityTestabilityProduction ReadyRecommendationPure Pipeline⭐ Low⭐⭐ Medium⭐⭐⭐ High⭐⭐ Medium❌ Too rigidShared Context⭐⭐ Medium⭐⭐⭐ High⭐⭐ Medium⭐⭐⭐ High❌ Hard to extendDocument Chain⭐⭐⭐ High⭐⭐⭐ High⭐⭐ Medium⭐⭐⭐⭐ Very High✅ Good for complex workflowsUniversal Adapters⭐⭐ Medium⭐⭐⭐⭐⭐ Excellent⭐⭐⭐⭐⭐ Excellent⭐⭐⭐⭐⭐ Excellent✅✅ BEST

🎯 Final Recommendation: Hybrid
Combine Document Chain + Universal Adapters:
javascript// ============================================================================
// RECOMMENDED: BEST OF BOTH WORLDS
// ============================================================================

pb.pipeline = async (name) => {
  const ctx = {
    cache: {},
    stages: [],
    documents: {},
    execution: null  // ← Document tracking (like Inbox Zero)
  };
  
  // Create execution document
  ctx.execution = await pb.query('PipelineExecution', {
    operation: 'create',
    data: { pipeline_name: name, status: 'Queued' }
  });
  
  return {
    // Source from internal DB
    source(doctype, query) {
      ctx.stages.push({
        type: 'source',
        doctype,
        query,
        handler: async (context) => {
          const result = await context.pb.query(doctype, query);
          context.cache.source = result.data;
          return result.data;
        }
      });
      return this;
    },
    
    // Fetch using adapters (universal!)
    fetch(adapterName, config) {
      ctx.stages.push({
        type: 'fetch',
        adapter: adapterName,
        config,
        handler: async (context) => {
          const adapter = ADAPTERS.fetch[adapterName];
          const result = await adapter.fetch(context, config);
          
          // Track external action (like Inbox Zero)
          await context.pb.query('ExternalAction', {
            operation: 'create',
            data: {
              pipeline_execution: context.execution.data[0].name,
              action_type: `fetch_${adapterName}`,
              provider: adapterName,
              status: 'Success',
              response_data: result
            }
          });
          
          context.cache[`fetch_${adapterName}`] = result;
          return result;
        }
      });
      return this;
    },
    
    // Process using adapters (universal!)
    process(adapterName, config) {
      ctx.stages.push({
        type: 'process',
        adapter: adapterName,
        config,
        handler: async (context) => {
          const adapter = ADAPTERS.process[adapterName];
          const result = await adapter.process(context, config);
          context.cache[`process_${adapterName}`] = result;
          return result;
        }
      });
      return this;
    },
    
    // Create documents (Frappe-like)
    createDoc(doctype, config) {
      ctx.stages.push({
        type: 'createDoc',
        doctype,
        config,
        handler: async (context) => {
          // Map fields and create doc
          const created = await createDocumentFromMapping(context, doctype, config);
          context.documents[doctype] = created;
          return created;
        }
      });
      return this;
    },
    
    // Sync using adapters (universal!)
    sync(adapterName, config) {
      ctx.stages.push({
        type: 'sync',
        adapter: adapterName,
        config,
        handler: async (context) => {
          const adapter = ADAPTERS.sync[adapterName];
          const result = await adapter.sync(context, config);
          
          // Track sync action
          await context.pb.query('ExternalAction', {
            operation: 'create',
            data: {
              pipeline_execution: context.execution.data[0].name,
              action_type: `sync_${adapterName}`,
              provider: adapterName,
              status: 'Success',
              response_data: result
            }
          });
          
          return result;
        }
      });
      return this;
    },
    
    // Execute pipeline
    async execute() {
      for (const stage of ctx.stages) {
        const stageDoc = await createStageDocument(ctx, stage);
        
        try {
          await stage.handler(ctx);
          await updateStageSuccess(ctx, stageDoc);
        } catch (error) {
          await updateStageFailed(ctx, stageDoc, error);
          throw error;
        }
      }
      
      await markPipelineComplete(ctx);
      
      return {
        execution: ctx.execution,
        documents: ctx.documents,
        cache: ctx.cache
      };
    }
  };
};

💡 Why This Hybrid?
✅ Universal Adapters → Easy to add new systems (Gmail, Outlook, Salesforce, etc.)
✅ Document Tracking → Full audit trail like Inbox Zero
✅ Functional → No classes, pure functions
✅ Frappe-native → Creates proper Frappe documents
✅ Testable → Mock adapters for testing
✅ Extensible → Add new features without breaking existing code

🚀 Start Here (Implementation Order)

Week 1: Simple adapter registry + 1 Gmail adapter
Week 2: Add document tracking (PipelineExecution, PipelineStage)
Week 3: Add 2-3 more adapters (OpenAI, Outlook, internal sync)
Week 4: Add field mapping and createDoc functionality
Ongoing: Add adapters as needed

This is the most maintainable, scalable approach! 🎯