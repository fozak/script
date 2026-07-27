Searched the web
Searched the web
Here's what 2026 best practices say:

The modern approach is: System Prompt + Intent Routing + Context Injection

1 — System prompt is the foundation
without clear system-level guidance, LLMs default to general-purpose behavior — system prompts provide critical differentiation ensuring responses are consistently appropriate for the intended context. 
Tetrate

For your hub worker system prompt:

You are NESEN's assistant. You help entrepreneurs 
in Boston/Cambridge area learn about our weekly 
Thursday meetings at 1 Broadway Cambridge.
You know: meeting schedule, membership, community.
You do NOT discuss unrelated topics.
If unsure — offer to connect with Denis directly.
2 — Intent classification before answering
limit defined intents to fewer than 20, use 3-5 example pairs of "User Query → Intent" in your prompt for few-shot learning. 
IrisAgent

Your intents for NESEN:

meeting_info    → "when do you meet", "next event"
membership      → "how to join", "cost", "who can join"
location        → "where are you", "address"
speaker         → "who is speaking", "topics"
human_handoff   → "talk to someone", "contact Denis"
out_of_scope    → everything else
3 — Context injection per message
bring page context into the widget automatically so users do not have to restate what they were viewing. 
Facebook

What your hub receives and injects into prompt:

javascript
`User is on page: ${page}
User type: ${user_type}
Message: ${text}`
4 — Uncertainty handling
when the bot is uncertain about user intent, ask a focused clarifying question or offer 2-4 scoped options rather than guessing. 
Fuselab Creative

5 — Always provide human escape
make sure your chatbot includes an easy-to-access route for transferring to a live agent — provide a simple button or typed command like "Speak to a human." 
Jotform

For your hub worker — the modern pattern:

javascript
const systemPrompt = `You are NESEN assistant...`

const messages = [
  { role: 'system', content: systemPrompt },
  ...history,  // prior turns for context
  { role: 'user', content: `Page: ${page}\n\n${text}` }
]
Simple, covers all 2026 best practices without over-engineering. Ready to wire this into the hub worker?