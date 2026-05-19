# FSM and `depends_on` in CW Framework

## Overview

In the CW framework, `depends_on` controls **both UI visibility and validation**. A field that is hidden by its `depends_on` condition is also skipped in `_preflight` required field validation. This means the schema itself encodes which fields are required for which FSM state — no separate validation rules needed.

---

## How `depends_on` Works

Every field in a schema can have a `depends_on` expression:

```json
{
  "fieldname": "full_name",
  "fieldtype": "Data",
  "label": "Full Name",
  "reqd": 1,
  "depends_on": "eval:..."
}
```

The expression is evaluated by `evaluateDependsOn(depends_on, doc, run_doc)`:

- **`doc`** = `run_doc.target?.data?.[0] || {}` — the persisted document data
- **`run_doc`** = the full run context, including `run_doc.input._state` (active signals)

If the expression returns `false`:
- The field is **hidden** in the UI (filtered out in MainForm)
- The field is **skipped** in `_preflight` required validation

This means `reqd: 1` is only enforced when the field is actually visible.

---

## Signal Format

Signals in `_state` follow the format:

```
"dim.from_to": value
```

| Value | Meaning |
|-------|---------|
| `""` | Signal pending (user just clicked) |
| `"1"` | Signal succeeded (transition completed) |
| `"-1"` | Signal failed (validation or FSM error) |

Examples:
- `"1.0_1": ""` — dim 1, transition 0→1 (Sign In), pending
- `"1.0_2": "1"` — dim 1, transition 0→2 (Sign Up), succeeded
- `"1.0_1": "-1"` — dim 1, transition 0→1 (Sign In), failed

---

## Example: UserPublicProfile

This schema demonstrates FSM-driven field visibility across three states: unauthenticated, signing in, and signing up.

### FSM — Dim 1 (Auth Flow)

```json
"1": {
  "values": [0, 1, 2],
  "options": ["Unauthenticated", "SignIn Ready", "SignUp Ready"],
  "transitions": {
    "0": [1, 2],
    "1": [1],
    "2": [2]
  },
  "labels": {
    "0_1": "Sign In",
    "0_2": "Sign Up",
    "1_1": "Submit",
    "2_2": "Create Account"
  },
  "primary": {
    "0_1": true,
    "0_2": true,
    "1_1": true,
    "2_2": true
  },
  "sideEffects": {
    "1_1": "Adapter.pocketbase.signIn",
    "2_2": "Adapter.pocketbase.signUp"
  }
}
```

**State machine:**

```
State 0 (Unauthenticated)
  ├── 0→1 "Sign In"  → State 1 (SignIn Ready)
  └── 0→2 "Sign Up"  → State 2 (SignUp Ready)

State 1 (SignIn Ready)
  └── 1→1 "Submit"   → sideEffect: signIn

State 2 (SignUp Ready)
  └── 2→2 "Create Account" → sideEffect: signUp
```

---

### Field Visibility Matrix

| Field | State 0 (No action) | State 1 (Sign In) | State 2 (Sign Up) | Authenticated (`doc.name`) |
|-------|--------------------|--------------------|-------------------|---------------------------|
| `full_name` | ❌ | ❌ | ✅ (reqd) | ✅ |
| `email` | ❌ | ✅ (reqd) | ✅ (reqd) | ✅ |
| `password` | ❌ | ✅ (reqd) | ✅ (reqd) | ✅ |
| `title`, `organization`, etc. | ❌ | ❌ | ❌ | ✅ |
| `bio`, `linkedin`, etc. | ❌ | ❌ | ❌ | ✅ |

---

### `depends_on` Expressions

**`email` and `password`** — visible for both Sign In and Sign Up (any dim 1 signal present):

```json
"depends_on": "eval:Object.keys(run_doc.input._state || {}).some(k => k.startsWith('1.'))"
```

This checks: "Is there any signal in dim 1?" — whether pending (`""`), failed (`"-1"`), or succeeded (`"1"`).

**`full_name`** — visible for Sign Up only (signal ends with `_2`):

```json
"depends_on": "eval:Object.keys(run_doc.input._state || {}).some(k => k.startsWith('1.') && k.endsWith('_2'))"
```

This checks: "Is there a Sign Up signal in dim 1?" — only `1.0_2` or `1.2_2` match.

**Profile fields** (`title`, `organization`, `bio`, `linkedin`, etc.) — visible only when authenticated:

```json
"depends_on": "eval:doc.name"
```

This checks: "Does the persisted document have a name?" — true only after the record is created.

---

### Why `-1` Signals Work

When a user clicks "Sign In" with empty fields:
1. Signal `"1.0_1": ""` is set
2. `_preflight` validates → fails (email empty)
3. Signal marked `"1.0_1": "-1"`
4. Form re-renders — `depends_on` checks for ANY dim 1 signal (including `-1`) → fields stay visible
5. User fills in email and password
6. Clicks "Sign In" again → signal reset to `"1.0_1": ""`
7. Validation passes → transition succeeds → `signIn` side effect fires

The `-1` value keeps fields visible after a failed attempt, so the user can correct and retry.

---

### Validation in `_preflight`

Because `depends_on` is evaluated in `_preflight`, the Sign In and Sign Up paths have different effective required fields:

**Sign In path** (signal `1.0_1` → ends with `_1`):
- `full_name` → `depends_on` false (ends with `_2` check fails) → **skipped**
- `email` → `depends_on` true → **required**
- `password` → `depends_on` true → **required**

**Sign Up path** (signal `1.0_2` → ends with `_2`):
- `full_name` → `depends_on` true → **required**
- `email` → `depends_on` true → **required**
- `password` → `depends_on` true → **required**

No separate validation rules needed. The `depends_on` expression encodes the required set for each FSM state.

---

## Key Principles

1. **`depends_on` is the single source of truth** for field visibility and validation scope.
2. **Hidden fields are never validated** — `_preflight` skips `reqd` check for hidden fields.
3. **Signal presence drives visibility** — use `run_doc.input._state` to check what the user has clicked, regardless of whether the transition succeeded.
4. **`doc.name` drives authenticated state** — profile fields appear only after a record exists.
5. **`-1` signals are stable** — a failed signal keeps fields visible for retry; the next button click resets the signal to `""`.
