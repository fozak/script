# CW Component Coding Rules

Rules for writing components in the CW framework.
Follow these exactly. Deviation causes coordination bugs, stale state, and
architectural violations that are hard to debug.

---

## The model in one sentence

Every component is a pure render function of `run_doc`.
It renders once from what it receives. It spawns children. It never manages
state that crosses its own boundary.

---

## DOs

### Boot — one top-level CW.run only

The only legitimate naked `CW.run` call is the single boot call in the HTML
file. It fetches the root data and mounts the root component.

```js
// threads.html — the entire application boot
CW.run({
  operation:      'select',
  target_doctype: 'Channel',
  options:        { render: true },
})
```

Schema resolves component, container, and view automatically from
`target_doctype` and `operation`.

---

### Navigation — always run_doc.child()

Every navigation inside a component uses `run_doc.child()`. No exceptions.

```js
// click a channel → mount ChannelFeed
run_doc.child({
  operation:      'select',
  target_doctype: 'Post',
  query:          { where: { parent: ch.name } },
  options:        { render: true },
})

// click a post → mount PostDetail
run_doc.child({
  operation:      'select',
  target_doctype: 'Post',
  query:          { where: { name: post.name } },
  options:        { render: true },
})

// new post → mount PostEditor
run_doc.child({
  operation:      'create',
  target_doctype: 'Post',
  input:          { parent: channelName },
  options:        { render: true },
})
```

`_resolveAll` resolves `component`, `container`, and `view` from schema.
Do not pass them explicitly unless overriding.

---

### Data fetches — also run_doc.child() with render:false

Fetching subordinate data (comments for a post, channel info for a feed)
is also a child run. The component owns that fetch as a child — it is
part of the node's responsibility.

```js
// load comments for this post
const cr = await run_doc.child({
  operation:      'select',
  target_doctype: 'Comment',
  query:          { where: { parent: post.name } },
  options:        { render: false },
})
const comments = cr.target.data
```

---

### FSM signals — run_doc.child() with _state signal

```js
// publish post
run_doc.child({
  operation:      'update',
  target_doctype: 'Post',
  query:          { where: { name: post.name } },
  input:          { _state: { '0_1': '' } },
  options:        { render: false, internal: true },
})
```

`_execTransition` fires automatically. View switch is a consequence of the
FSM — the component does not need to navigate after a signal.

---

### Data — read from run_doc.target.data only

Data for the component arrives in `run_doc.target.data` at mount time.
Read it directly. Do not re-fetch it.

```js
const ChannelList = function({ run_doc }) {
  const channels = run_doc.target?.data || []
  // render directly — no fetch, no state
}

const PostDetail = function({ run_doc }) {
  const post = run_doc.target?.data?.[0]
  if (!post) return spinner
  // render directly
}
```

---

### React useState — only for ephemeral local UI state

`useState` is legitimate only for state that:
- Has no meaning outside this component
- Is never read by any other component
- Dies when the component unmounts and nothing cares

```js
// legitimate
const [viewMode,    setViewMode]  = React.useState('list')  // grid/card toggle
const [sortCol,     setSortCol]   = React.useState(null)     // sort column
const [isOpen,      setIsOpen]    = React.useState(false)    // dropdown
const [commentBody, setBody]      = React.useState('')       // textarea input
const [saving,      setSaving]    = React.useState(false)    // loading spinner
const [error,       setError]     = React.useState(null)     // validation message
```

---

### Component signature — always run_doc only

Every CW component receives only `run_doc`. No extra props.

```js
const PostDetail  = function({ run_doc }) { ... }
const ChannelFeed = function({ run_doc }) { ... }
const PostEditor  = function({ run_doc }) { ... }
```

Derive everything from `run_doc`:

```js
const doc      = run_doc.target?.data?.[0]
const doctype  = run_doc.target_doctype
const isOwner  = doc?.owner === uid()
const dim0     = CW._getStateDef(doctype)?.['0']
const current  = doc?._state?.['0'] ?? doc?.docstatus ?? 0
```

Exception: pure utility components with no CW dependency may have their
own props.

```js
const Avatar        = ({ name, size }) => ...   // pure utility, no run_doc
const blockPreview  = (body, maxLen) => ...     // pure function
```

---

### Schema drives routing

Do not hardcode `component`, `container`, or `view` in navigation calls.
Define them once in the schema and let `_resolveAll` do the work.

```js
// Post schema
view_components: {
  list: { component: 'ChannelFeed',  container: 'threads_left'  },
  read: { component: 'PostDetail',   container: 'threads_right' },
  edit: { component: 'PostEditor',   container: 'threads_right' },
}
```

Then the call site needs only `operation` and `target_doctype`:

```js
run_doc.child({
  operation:      'select',
  target_doctype: 'Post',
  query:          { where: { name: post.name } },
  options:        { render: true },
})
// component, container, view all resolved from schema
```

---

### Field defaults on input, not context

When creating a child record that needs a parent reference, pass it as a
field default on `input` — not as `context`.

```js
// correct — parent is a field on the record
run_doc.child({
  operation:      'create',
  target_doctype: 'Post',
  input:          { parent: channelName },
  options:        { render: true },
})

// wrong — parent is domain data, not UI context
run_doc.child({
  ...
  context: { channel: channelName },  // ← wrong
})
```

---

## DON'Ts

### Never use naked CW.run inside a component

```js
// WRONG — breaks the node tree
CW.run({ operation: 'select', target_doctype: 'Post', ... })

// RIGHT
run_doc.child({ operation: 'select', target_doctype: 'Post', ... })
```

---

### Never fetch data inside a component

```js
// WRONG — component fetching its own data
const [channels, setChannels] = React.useState([])
React.useEffect(() => {
  CW.run({ operation: 'select', target_doctype: 'Channel', ... })
    .then(r => setChannels(r.target.data))
}, [])

// RIGHT — data arrives in run_doc at mount time
const channels = run_doc.target?.data || []
```

---

### Never use React state for document data

```js
// WRONG — duplicating CW state into React state
const [localPost,   setLocalPost]   = React.useState(post)
const [channels,    setChannels]    = React.useState([])
const [posts,       setPosts]       = React.useState([])
const [comments,    setComments]    = React.useState([])
const [selectedPost, setSelPost]    = React.useState(null)
const [activeChannel, setActiveCh] = React.useState(null)
```

---

### Never use React state for navigation or selection

```js
// WRONG — navigation state in React
const [view,    setView]    = React.useState('channels')
const [editing, setEditing] = React.useState(false)
const [selPost, setSelPost] = React.useState(null)
const [selChan, setSelChan] = React.useState(null)
```

Navigation is the run tree. Selection is expressed by which child run exists.
React never owns these.

---

### Never re-fetch after a signal

```js
// WRONG — manual reload after FSM transition
const [rev, setRev] = React.useState(0)
const onSignal = async (key) => {
  await CW.run({ ..., input: { _state: { [key]: '' } } })
  setRev(v => v + 1)  // ← hack to trigger re-fetch
}

// RIGHT — signal re-mounts the component with fresh data
run_doc.child({
  operation: 'update',
  input:     { _state: { [key]: '' } },
  options:   { render: false, internal: true },
})
// _execTransition fires view switch automatically
// new node mounts with fresh run_doc — no re-fetch needed
```

---

### Never coordinate between components

```js
// WRONG — left panel trying to clear right panel
CW.run({ component: 'PostPlaceholder', container: 'threads_right', ... })
CW.run({ component: 'ChannelFeed',     container: 'threads_left',  ... })

// RIGHT — fire one child run, schema handles container
run_doc.child({
  operation:      'select',
  target_doctype: 'Channel',
  options:        { render: true },
})
// right panel has no active child — shows placeholder naturally
```

---

### Never hardcode component or container in navigation

```js
// WRONG
run_doc.child({
  operation:  'select',
  view:       'read',
  component:  'PostDetail',    // ← hardcoded
  container:  'threads_right', // ← hardcoded
  options:    { render: true },
})

// RIGHT — schema resolves both
run_doc.child({
  operation:      'select',
  target_doctype: 'Post',
  query:          { where: { name: post.name } },
  options:        { render: true },
})
```

---

### Never use CW.controller directly

```js
// WRONG
r.input._state = { '0_1': '' }
await CW.controller(r)

// RIGHT
run_doc.child({
  operation: 'update',
  input:     { _state: { '0_1': '' } },
  options:   { render: false, internal: true },
})
```

---

## Quick reference

| Action | How |
|---|---|
| Boot the app | `CW.run({ operation, target_doctype, options:{ render:true } })` |
| Navigate | `run_doc.child({ operation, target_doctype, query, options:{ render:true } })` |
| Fetch data | `run_doc.child({ operation:'select', ..., options:{ render:false } })` |
| Create record | `run_doc.child({ operation:'create', input:{...}, options:{ render:false } })` |
| FSM signal | `run_doc.child({ operation:'update', input:{ _state:{ key:'' } }, options:{ render:false, internal:true } })` |
| Read data | `run_doc.target?.data` |
| Read one record | `run_doc.target?.data?.[0]` |
| Local UI state | `React.useState(...)` for cosmetic/ephemeral only |
| Document state | Never in React — always in `run_doc` |
