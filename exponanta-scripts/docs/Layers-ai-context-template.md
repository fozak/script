# AI Context Document — [TASK NAME]

> This document is passed to the AI agent on every call.
> Two sections: STABLE (never changes) + LEARNINGS (append-only per run).

---

## SECTION 1 — STABLE: Layers

> What the system is. AI must never violate these boundaries.

### ⚠️ The Section 1 Challenge (for larger frameworks)

Section 1 is the hardest part to get right at scale. Three problems compound each other:

**Problem 1 — Context rot.**
LLM performance drops 50–70% as context grows from 1K to 32K tokens. If you dump the entire framework description into every AI call, you burn the budget on stable content, leaving less room for the actual task and learnings. A large Section 1 that ships whole every call will silently degrade output quality.

**Problem 2 — The AI names it, the harness finds it.**
Don't ask the AI to decide what context it needs — that costs extra AI calls just to build context before doing any work. Instead, give each layer/concept a canonical short name. The AI references it by name in its output; the harness looks up and injects the full definition on the next call. The AI names; infrastructure retrieves.

**Problem 3 — Narrative vs. addressable slices.**
A prose description of your architecture ("Layer 2 is responsible for...") cannot be selectively injected. Write Section 1 as named, independent slices so the harness can include only what the current task touches.

### Solution: Split Section 1 into 1.A / 1.B / 1.C

```
Section 1.A — Core invariants     always included, keep under 200 tokens
Section 1.B — Layer descriptions  included only if task touches that layer (by name)
Section 1.C — Layer examples      included only if creating/modifying that layer
```

The harness decides which slices to inject based on the task, not the AI.

---

### 1.A — Core Invariants (always included)

```
Layer 1 — [name]    → [description, who owns it, never touch rule]
Layer 2 — [name]    → [description, what is allowed]
Layer 3 — [name]    → [description, active work zone]
```

**Invariants (ship every call, never expand this block):**
- Lower layers provide services to higher layers. Never reverse.
- Layer N may use Layer N-1 but never Layer N+1.
- [Add your specific hard constraints here — keep to 3–5 lines max]

---

### 1.B — Layer Detail Slices (injected by name when relevant)

> Each slice is self-contained. Harness injects `layer:[name]` when task references it.

**layer:Layer1**
[Full description of Layer 1 — purpose, contents, what calls it, what it may not call]

**layer:Layer2**
[Full description of Layer 2]

**layer:Layer3**
[Full description of Layer 3]

---

### 1.C — Layer Example Slices (injected when generating/modifying that layer)

> Kept separate from 1.B so examples don't bloat every call.

**examples:Layer2**
[Before/after pair specific to Layer 2 operations]

**examples:Layer3**
[Before/after pair specific to Layer 3 operations]

---

## SECTION 2 — STABLE: Input/Output Examples

> Concrete before/after pairs. AI uses these for GENERATION, not judgment.
> Oracle verifies the output — not the AI comparing to these examples.

### Example 1 — [happy path]

**Input:**
```json
{
  "field": "value",
  "type": "expected_type"
}
```

**Expected Output:**
```json
{
  "field": "transformed_value",
  "layer": "correct_layer"
}
```

**Why:** [One sentence explaining the rule this demonstrates]

---

### Example 2 — [edge case / common mistake]

**Input:**
```json
{ "field": "edge_value" }
```

**Expected Output:**
```json
{ "field": "handled_correctly" }
```

**Why:** [What rule this edge case tests]

---

### Example 3 — [failure case — what NOT to do]

**Input:**
```json
{ "field": "bad_input" }
```

**Wrong Output (reject this):**
```json
{ "field": "shortcut_that_breaks_layer_2" }
```

**Why it's wrong:** [Specific layer or rule violated]

---

## SECTION 3 — STABLE: Rules

> Explicit constraints. AI must follow all of these.

1. **[Rule name]:** [One sentence. Concrete, not abstract.]
2. **[Rule name]:** [One sentence.]
3. **Never do X** — [what X is and why]
4. **Always do Y** — [what Y is and why]
5. **When in doubt** — [default behavior]

---

## SECTION 4 — LEARNINGS (append-only)

> AI writes here after each run. Never delete. Read before generating.
> Format: iteration → observation → action taken → outcome → rule derived.

```json
{
  "learnings": [
    {
      "iteration": 1,
      "timestamp": "2026-05-29T00:00:00Z",
      "observation": "Input had missing required field X",
      "action_taken": "Added default value for X",
      "outcome": "PASS",
      "rule_derived": "Always default X to null when absent, never skip"
    },
    {
      "iteration": 2,
      "timestamp": "2026-05-29T01:00:00Z",
      "observation": "Layer 2 function called Layer 3 — cross-layer violation",
      "action_taken": "Moved call to Layer 3 caller instead",
      "outcome": "PASS",
      "rule_derived": "Layer 2 never calls Layer 3. Move cross-layer calls upward."
    },
    {
      "iteration": 3,
      "timestamp": "2026-05-29T02:00:00Z",
      "observation": "Oracle failed: output schema missing 'status' field",
      "action_taken": "Added status field to transform",
      "outcome": "FAIL — still missing in nested objects",
      "rule_derived": null
    },
    {
      "iteration": 4,
      "timestamp": "2026-05-29T03:00:00Z",
      "observation": "Applied status field recursively to nested objects",
      "action_taken": "Walk all nested objects, not just root",
      "outcome": "PASS",
      "rule_derived": "Status field must be applied recursively. Root-only is insufficient."
    }
  ],
  "derived_rules_summary": [
    "Always default X to null when absent",
    "Layer 2 never calls Layer 3",
    "Status field must be applied recursively"
  ],
  "status": "active",
  "frozen": false
}
```

---

## SECTION 5 — PLANNER PROMPT (AI reads this each call)

> Paste this as the system prompt for each AI call.
> Harness injects 1.A always; 1.B and 1.C only for layers the task touches.

```
You are an agent operating within a layered system.

CORE INVARIANTS — always apply (Section 1.A):
[paste Section 1.A here — always]

LAYER DETAIL — relevant to this task (Section 1.B, injected by harness):
[paste layer:[name] slice here — conditional]

RULES (always follow):
[paste Section 3 here]

LEARNINGS — derived rules only, read first (Section 4 summary):
[paste derived_rules_summary array here — NOT the full learnings history]

YOUR TASK THIS CALL:
1. Apply derived_rules_summary before anything else.
2. If you need context on a layer not shown above, output "needs_context": ["layer:Name"]
   and stop — the harness will inject it on the next call.
3. Perform the requested operation.
4. After completion, append ONE new entry to LEARNINGS:
   - observation: what you noticed
   - action_taken: what you did
   - outcome: PASS or FAIL
   - rule_derived: new rule if outcome was PASS, null if FAIL

Return:
{
  "output": { ... },
  "needs_context": [],
  "new_learning": { ... },
  "next_action": "scan | refine | test | freeze | done"
}
```

---

## SECTION 6 — ORACLE CHECKLIST

> Deterministic checks run AFTER AI output. AI does not judge these.

- [ ] Output matches schema (JSON schema validate)
- [ ] No cross-layer calls in generated code (grep/AST check)
- [ ] Required fields present (field list check)
- [ ] [Your specific structural check]
- [ ] [Your specific byte-level check]

**If oracle FAILS:** feed failure back to AI as `observation` in next learning entry.  
**If oracle PASSES:** append learning, increment iteration, optionally freeze.

---

## Usage

```
New AI call:
  1. Read SECTION 4 (learnings) — apply derived_rules_summary first
  2. Read SECTION 3 (rules)
  3. Read SECTION 2 (examples) — for generation reference only
  4. Do the work
  5. Return output + new_learning entry

After call:
  1. Run SECTION 6 oracle checks
  2. Append new_learning to SECTION 4
  3. If all oracle checks pass AND 3+ consecutive PASSes: set frozen: true
```
