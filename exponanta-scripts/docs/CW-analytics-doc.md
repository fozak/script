# CW-analytics.js — Documentation

## Purpose

Tracks which social content posts drove registered users. Links a specific
Content record (representing a social post or campaign link) to a
`UserPublicProfile` via the `content_history` field.

---

## Architecture

### Single responsibility
`CW-analytics.js` owns the full acquisition tracking lifecycle:
1. Read Content hit from URL on page arrival
2. Write to `UserPublicProfile.content_history` — directly if authenticated,
   via `localStorage` buffer if anonymous
3. Flush `localStorage` to profile after `cw:auth:change` (login/registration)

### No coupling to `CW-url.js`
Both files read `location.search` independently via `new URLSearchParams(location.search)`.
`CW-url.js` owns URL → run_doc serialization. `CW-analytics.js` owns acquisition
tracking. Same source (`location.search`), different responsibilities.

### Bootstrap exception
At arrival time, before any `CW.run` exists, `pb.authStore.isValid` is read
directly — same bootstrap exception as `auth.js`. After a run exists,
`run_doc.user` is the source of truth.

---

## Flow

### Arrival — authenticated user
```
URL: empty.html?doctype=Content&name=contentlinkedin01&utm_source=linkedin

trackContentHit()
  → _readFromUrl() — doctype === 'Content' && name present → capture
  → pb.authStore.isValid === true
  → _writeToProfile(userId, incoming) — direct write, skip localStorage
```

### Arrival — anonymous user
```
trackContentHit()
  → _readFromUrl() — capture
  → pb.authStore.isValid === false
  → _saveStored() — write to localStorage key 'cw_acquisition'
  → wait
```

### After login or registration
```
cw:auth:change fires
  → _onAuthChange()
  → _loadStored() — read localStorage
  → _writeToProfile(userId, stored)
  → _clearStored()
```

---

## `content_history` field

### Schema definition on `UserPublicProfile`
```json
{
  "fieldname": "content_history",
  "fieldtype": "Code",
  "hidden": 1,
  "label": "Content history",
  "no_copy": 1,
  "options": "JSON",
  "print_hide": 1,
  "read_only": 1
}
```

### Why `hidden: 1`
`hidden: 1` is evaluated in `MainForm` as the first filter — before `depends_on`,
before `read_only`. The field is never rendered in the form UI regardless of
doc state or user role. The user cannot see or interact with it. Client JS
reads it on profile fetch to drive personalization.

### Why `read_only: 1`
Signals intent — this field is system-written only. `read_only` alone does not
hide it from the form in CW (that requires `hidden: 1`). Both flags are set
for belt-and-suspenders: `hidden` prevents rendering, `read_only` prevents
accidental writes through the form pipeline.

### Stored format
A flat JSON map — one key per Content docname, value is visit metadata:
```json
{
  "contentlinkedin01": {
    "utm_source":   "linkedin",
    "utm_medium":   "social",
    "utm_campaign": "gew2026",
    "ts":           1714391200000
  },
  "contenttwitter01": {
    "utm_source":   "twitter",
    "utm_medium":   "social",
    "utm_campaign": "gew2026",
    "ts":           1714392000000
  }
}
```

### First-touch attribution
Existing keys are never overwritten:
```js
const merged = { ...incoming, ...existing }  // existing wins on collision
```
If a user visits `contentlinkedin01` twice, the second visit is ignored.
The original timestamp and UTM data are preserved.

---

## `_autosave: 1` requirement

**`CW-analytics.js` only works correctly when `UserPublicProfile` has
`_autosave: 1`.**

With `_autosave: 0`, the CW controller skips the data write path entirely
when no FSM signal is present:
```js
const autosave = schema?._autosave ?? 1;
if (autosave !== 0) {
  // data write fires here — skipped when _autosave: 0
}
```

`_writeToProfile` sends no `_state` signal — it is a pure data write.
With `_autosave: 0` the write is silently ignored with no error.

`UserPublicProfile` uses `_autosave: 0` only during the signup form flow
(accumulating email/password/full_name before firing the `1.0_1` signUp
signal). After the record exists, `_autosave: 1` is correct — field changes
save normally and analytics writes land without signals.

---

## `view: 'form'` requirement on fetch

`_writeToProfile` does a select before writing to read the existing
`content_history` for merging. This select must use `view: 'form'`:

```js
const fetchRun = await globalThis.CW.run({
  operation:      'select',
  target_doctype: 'UserPublicProfile',
  query:          { where: { owner: userId } },
  view:           'form',   // required — list view strips content_history
  options:        { render: false },
})
```

Without `view: 'form'`, the select defaults to `list` view. The `list` view
applies `in_list_view` field filtering — `content_history` has no
`in_list_view: 1` flag so it is stripped from the response. The fetch
returns `content_history: undefined`, `existing` becomes `{}`, and every
write overwrites the entire history with only the latest hit.

---

## Two fetches per write — by design

`_writeToProfile` makes two PocketBase calls:

1. **Explicit select** (`view: 'form'`) — reads existing `content_history`
   for merge. Necessary because the merge must happen in JS before the write.

2. **Controller pre-fetch** (inside `CW.run update`) — loads existing doc
   `_state` before `_mergeInput` so FSM state validation works. Added as
   part of the April 28 CW-run.js Phase 1 refactor.

These serve different purposes and cannot be collapsed into one.

---

## Integration

### Load in `empty.html` / `app.html`
```html
<script type="module" src="CW-analytics.js"></script>
```

### Call in boot sequence after `waitForBoot()`
```js
window.addEventListener('load', async () => {
  await waitForBoot()
  cwStateFromUrl()
  trackContentHit()  // fire and forget — no await needed
})
```

### Dependencies
- `CW` global (CW-run.js loaded)
- `pb` global (PocketBase SDK loaded)
- `cw:auth:change` CustomEvent dispatched by `auth.js`
