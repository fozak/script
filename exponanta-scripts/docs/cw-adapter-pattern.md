# CW Adapter Pattern

## What is an Adapter

An Adapter is a named async function registered on `globalThis.Adapter` that:
- Receives `run_doc` as its only argument
- Operates on `run_doc.target.data[0]` (the current document)
- Uses `run_doc.child()` for any nested CW operations
- Calls `CW._logThreads()` as its last step if it produces a communication event

```js
globalThis.Adapter.email = {
  send: async function(run_doc) {
    const contact = run_doc.target.data[0]

    // 1. fetch template
    const t = await run_doc.child({
      operation: 'select',
      target_doctype: 'EmailTemplate',
      query: { where: { name: contact.email_template } }
    })
    await CW.controller(t)

    // 2. render
    const render = (str, doc) => new Function('doc', 'return `' + str + '`')(doc)
    const subject = render(t.target.data[0].subject, contact)
    const body    = render(t.target.data[0].body, contact)

    // 3. transport
    await fetch('/api/email', {
      method: 'POST',
      body: JSON.stringify({ to: contact.email, subject, body })
    })

    // 4. log to _threads — Adapter's responsibility
    await CW._logThreads(run_doc, {
      adapter: 'email.send',
      subject,
      data: { to: contact.email, status: 'sent' }
    })
  }
}
```

---

## Two Ways to Call an Adapter

### Way 1 — Direct Call

Call the Adapter directly after selecting the document. Used for standalone actions not tied to a document state change.

```js
// select the document
const r = await CW.run({
  operation: 'select',
  target_doctype: 'Customer',
  query: { where: { name: 'customerabc123' } }
})

// set any input the Adapter needs on the doc
r.target.data[0]._note = 'Called customer, confirmed order'

// call the Adapter directly
await Adapter.note.add(r)
```

**Traceability:** `_threads` entry written by the Adapter. Not in `_changes`.

**When to use:** Standalone actions — adding a note, sending an email manually, logging an inbound call. The action is not a consequence of a document state transition.

---

### Way 2 — FSM SideEffect

The Adapter is registered as a sideEffect string on a Schema FSM transition. It fires automatically when the signal is triggered.

**Schema definition:**
```js
// in Customer schema or SystemSchema
"1": {
  "transitions": { "0": [1] },
  "sideEffects": {
    "0_1": "Adapter.note.add"
  }
}
```

**Call:**
```js
await CW.run({
  operation: 'update',
  target_doctype: 'Customer',
  query: { where: { name: 'customerabc123' } },
  input: {
    _state: { '1.0_1': '' },
    _note: 'Status changed to active'
  }
})
```

**Traceability:** `_changes` entry with `sig: ['1.0_1']` + `_threads` entry written by the Adapter.

**When to use:** Actions that are a consequence of a document state transition — send confirmation email when order is submitted, log note when lead is qualified, notify when task is completed.

---

## When to Use Which

| Situation | Pattern |
|---|---|
| Action triggered by user, not a state change | Direct call |
| Action triggered by FSM transition | FSM sideEffect |
| Script or AgentJob operating on a set of records | Direct call inside script |
| Adapter always fires for a specific doctype transition | FSM sideEffect in Schema |

---

## Traceability Summary

| Pattern | `_changes` | `_threads` |
|---|---|---|
| Direct call | ✗ | ✅ written by Adapter |
| FSM sideEffect | ✅ sig field | ✅ written by Adapter |

For communication Adapters (`email.send`, `note.add`, `sms.send`) — `_threads` is the primary audit trail regardless of how the Adapter was called. `_changes` sig is a bonus when the call is FSM-driven.

---

## Adapter Contract

Every Adapter that produces a communication event **must** call `CW._logThreads()` as its last step:

```js
await CW._logThreads(run_doc, {
  adapter: 'adapter.method',   // required — identifies the adapter
  subject: '...',               // optional — human readable summary
  ref: 'some-doc-name',        // optional — link to related record
  data: { ... }                // optional — nested payload, any shape
})
```

Infrastructure Adapters that don't produce communication events (`cache.invalidate`, `webhook.ping`) do not call `_logThreads`.
