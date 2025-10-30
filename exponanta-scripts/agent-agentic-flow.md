Universal AI Planner System - Complete Summary
Core Philosophy

pb.run() is a dumb executor - just executes operations and records history
AI Planner is the brain - builds context, makes decisions, orchestrates everything
Context flows INTO AI Planner - not built inside run()
History is universal - all operations (fetch, CRUD, cross-domain) in one table


System Architecture Diagram
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                            │
│  • Opens page (booking.com, salesforce.com, any website)           │
│  • Clicks buttons, submits forms                                    │
│  • Types in extension chat UI                                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BROWSER EXTENSION                                │
│  • Content script monitors DOM/Network                              │
│  • Detects user actions                                             │
│  • Extracts semantic meaning                                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌═════════════════════════════════════════════════════════════════════┐
║                         AI PLANNER (THE BRAIN)                      ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  1️⃣ CONTEXT AGGREGATION                                            ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ aiPlanner.currentPage({ url, domain, userId, page })       │  ║
║  │                          ↓                                   │  ║
║  │ aiPlanner.getContext()                                      │  ║
║  │    ├─ getUserHistory(userId, domain)                        │  ║
║  │    ├─ getOperationsHistory(domain)                          │  ║
║  │    │   → All ops on this domain by any user                 │  ║
║  │    │   → Examples: {doctype: Reservation, ids: [123, 234]}  │  ║
║  │    ├─ getRelatedDoctypes(domain)                            │  ║
║  │    │   → Find same doctypes on other domains                │  ║
║  │    │   → {doctype: Reservation, domains: [hotels.com, ...]} │  ║
║  │    └─ getCrossDomainContext(userId)                         │  ║
║  │        → Recent activity across all domains                  │  ║
║  │        → Detect workflows (booking → calendar → email)      │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  2️⃣ DECISION MAKING (via LLM)                                      ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ Build contextual prompt with:                               │  ║
║  │  • Current page context                                      │  ║
║  │  • User history on this domain                              │  ║
║  │  • Known operations with examples                           │  ║
║  │  • Related doctypes from similar domains                    │  ║
║  │  • Cross-domain workflow patterns                           │  ║
║  │  • Conversation memory                                       │  ║
║  │                          ↓                                   │  ║
║  │ Ask LLM: "What should happen next?"                         │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  3️⃣ LLM DECISION OPTIONS                                           ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ ┌─────────────────┐   ┌─────────────────┐                  │  ║
║  │ │  existing_op    │   │ new_operation   │                  │  ║
║  │ │  Known pattern  │   │ Need prototype  │                  │  ║
║  │ └────────┬────────┘   └────────┬────────┘                  │  ║
║  │          │                     │                            │  ║
║  │          ▼                     ▼                            │  ║
║  │   Execute directly      Show code to user                   │  ║
║  │   via pb.run()         Ask: "Test this?"                    │  ║
║  │   NO AI planning        ├─ Works → Register op              │  ║
║  │                         └─ Fails → Retry strategy           │  ║
║  │                                                              │  ║
║  │ ┌─────────────────┐   ┌─────────────────┐                  │  ║
║  │ │   chat_only     │   │    explore      │                  │  ║
║  │ │   Just respond  │   │  Need more info │                  │  ║
║  │ └─────────────────┘   └─────────────────┘                  │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    pb.run() - DUMB EXECUTOR                         │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ async run(operation, input, options) {                        │ │
│  │   const record = {                                            │ │
│  │     id, timestamp, operation, input,                          │ │
│  │     owner: options.owner,  // User ID                         │ │
│  │     agent: options.agent   // AI agent ID or null            │ │
│  │   };                                                          │ │
│  │                                                               │ │
│  │   try {                                                       │ │
│  │     record.output = await this._dispatch(operation, input);  │ │
│  │   } catch (error) {                                          │ │
│  │     record.error = error;                                    │ │
│  │   }                                                          │ │
│  │                                                               │ │
│  │   await this._saveToHistory(record);                        │ │
│  │   return record.output;                                      │ │
│  │ }                                                            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Handles ALL operation types:                                      │
│  • fetch (external APIs)                                           │
│  • create, read, update, delete (CRUD)                            │
│  • call (RPC methods)                                              │
│  • upload (files)                                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     UNIVERSAL HISTORY TABLE                         │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ operation_history {                                           │ │
│  │   id, timestamp, duration, success,                           │ │
│  │   owner (user_id),                                            │ │
│  │   agent (ai_agent_id or null),                               │ │
│  │   operation, doctype, domain,                                 │ │
│  │   input (json), output (json), error (json),                 │ │
│  │   call_reference, resource_type                              │ │
│  │ }                                                             │ │
│  │                                                               │ │
│  │ Examples:                                                     │ │
│  │ • fetch api.github.com by user-123 (agent: null)            │ │
│  │ • create Reservation by ai-planner (owner: user-123)        │ │
│  │ • update Task by user-123 (agent: null)                     │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Indexed by:                                                       │
│  • owner + domain + timestamp                                      │
│  • doctype + domain                                                │
│  • domain + success + timestamp                                    │
└─────────────────────────────────────────────────────────────────────┘

Key Components
1. AI Planner (The Brain)
javascriptclass AIPlanner {
  // Initialize with page context
  async currentPage({ url, domain, userId, page })
  
  // Aggregate all context
  async getContext({ userId, domain, url }) {
    return {
      user: { history on this domain },
      domain: { 
        operations: [all ops with examples],
        doctypes: [related doctypes on similar domains]
      },
      crossDomain: {
        recentActivity: [cross-site history],
        potentialWorkflows: [detected patterns]
      }
    }
  }
  
  // Handle user actions
  async handleUserAction(action)
  async handleChatInput(message)
  
  // Decision logic
  _isExistingOp(intent) → execute directly
  _planNewOperation(intent) → prototype & test
}
2. pb.run() (Dumb Executor)
javascriptasync run(operation, input, options) {
  const record = {
    timestamp, operation, input,
    owner: options.owner,
    agent: options.agent || null
  };
  
  try {
    record.output = await this._dispatch(operation, input);
  } catch (error) {
    record.error = error;
  }
  
  await this._saveToHistory(record);
  return record.output;
}
3. Universal History
javascript{
  id: 'uuid',
  timestamp: 1730332800000,
  operation: 'create',
  doctype: 'Reservation',
  domain: 'booking.com',
  owner: 'user-123',      // Human user
  agent: 'ai-planner',    // AI executed it
  input: { hotel: 'Grand Palace', ... },
  output: { id: 'reservation-456', ... },
  success: true
}
```

---

## **Example Flow: User Books Hotel**
```
1. User opens booking.com
   ↓
2. Extension activates AI Planner
   aiPlanner.currentPage({ url, domain, userId })
   ↓
3. AI Planner aggregates context:
   • User's history on booking.com: [create Reservation × 3]
   • All operations on booking.com: [create Reservation (847 times)]
   • Related doctypes: Reservation used on hotels.com, trivago.com
   • Cross-domain: User adds bookings to Calendar + sends Emails
   ↓
4. User clicks "Book Now"
   ↓
5. AI Planner analyzes:
   "I know this pattern! User wants to create Reservation."
   "I have 847 examples: reservation123, reservation234..."
   → Decision: existing_op
   ↓
6. Execute via pb.run() (NO AI planning)
   pb.run('create', { 
     doctype: 'Reservation',
     data: { hotel, check_in, check_out }
   }, {
     owner: 'user-123',
     agent: 'ai-planner'
   })
   ↓
7. Record to history
   ↓
8. AI suggests next steps based on cross-domain workflow:
   • "Add to Google Calendar?"
   • "Send confirmation email?"
   • "Compare prices on Trivago?"

Key Design Principles
PrincipleImplementationSeparation of ConcernsAI = planning, pb.run() = executionContext-RichAI sees user history, domain patterns, cross-domain workflowsExample-Based LearningAI sees real operation IDs for better understandingUniversal HistorySingle table for all operations (fetch, CRUD, cross-domain)Owner + Agent TrackingKnow if human or AI executed operationCross-Domain IntelligenceSuggest actions across different websitesUser ControlUser approves new operations before addingPrivacy-AwareContext stays with user, not shared globally

Top 3 Psychology Challenges
1. Trust & Timing

Only suggest after 2-3 seconds (let user breathe)
Only show if user stays on page
Remember dismissals

2. Context Accuracy

Show WHY AI thinks this: "You've booked hotels 3 times before"
Let user correct: "I'm not booking, just browsing"
Learn from mistakes

3. Discovery vs. Distraction

First 2 weeks: Always show suggestions (onboarding)
After 2 weeks: Only show unusual patterns
Power users: Easy dismiss with Esc key


Benefits
✅ Works across ANY website (universal)
✅ Learns from ALL users (crowd intelligence)
✅ Suggests cross-domain workflows (hotel → calendar → email)
✅ Privacy-first (context per user)
✅ Testable (can test pb.run() without AI)
✅ Extensible (easy to add new operations)
✅ Agentic (AI can execute on behalf of user)

This is a complete, production-ready architecture for an AI-powered universal workflow assistant! 🎯














































[User opens page with browser extention activated]
          │
          ▼
[AI planner activated]  
          │      
          ▼
[User actions on page or in extention (it has chatUI compoenent)] ──► [existing ops only]
          │                                                                 │
          ▼                                                                 ▼
[Input into chatAI] ──► [AI planner analizing, if existing ops]-> [run(existing ops) no AI planning]
          │
          ▼
[If no existing ops, AI planner iderntifying ]
  ├─ AI chat only → Continue with chat / Continue Next Task
  ├─ New operation  → prototypes, ask to test, test in console / Add to operations
  └─ Fail → Switch Strategy / Explore / Ask User
          │
          ▼
[Save Context & Memory] ──► Loop Back / Terminate
