is dim[0].0_1 for submittable a kind entry point for dim[1] specific workflow (logically), i know its not implemented like this

11:47 AM
Yes — logically it's exactly that.

dim[0]: 0 → 1 (submit)
              ↓
        this is the gate that says "document is now real and locked"
        only after this does dim[1] workflow make sense to act on

dim[1]: 0 → 1 → 2 → ...
        (workflow runs independently, but semantically
         meaningful only when dim[0] >= 1)
So dim[0] state 1 = "document exists and is authoritative." dim[1] is the business journey that happens to that authoritative document.

The logical dependency is: dim[1] transitions should only fire when dim[0] = 1 (submitted). A draft shouldn't be approvable, cancellable by workflow, or triggering external side effects.

Right now it's not enforced — dim[1] can fire regardless of dim[0] state. The UserPublicProfile signup case actually inverts this: dim[1] 0_1 fires before the record even exists in dim[0] terms, which is the exception that proves the rule.

So the clean mental model:

dim[1] on create (0_1 before dim[0] exists) — bootstrap/provisioning exception, like signup
dim[1] otherwise — should only fire when dim[0] = 1
That's a two-line guard in the FSM processor: check dim[0] state before allowing dim[1] transitions, with an explicit bootstrap: true flag on schemas that need the exception.

Worth implementing or still premature?

USer profile is a bit specific. its bad example

11:47 AM
Agreed. UserPublicProfile is the worst possible example to reason from because it has the provisioning exception baked in — dim[1] 0_1 fires before the record exists, which is the opposite of the normal pattern.

A cleaner example to reason from would be Event:

dim[0]: 0=draft → 1=submitted → 2=cancelled
dim[1]: 0=pending → 1=active → 2=completed → 3=archived
Here the logical dependency is clear:

Event must be submitted (dim[0]=1) before it can go active (dim[1] 0_1)
Cancelling (dim[0] 0_2) should block any further dim[1] transitions
dim[1] workflow is the business journey of an already-real document
This is the pattern worth designing the FSM guard around. UserPublicProfile signup is a one-off infrastructure exception that should be explicitly flagged in the schema, not used as a design reference.

Do you have Event schema already or is that the next one to define?