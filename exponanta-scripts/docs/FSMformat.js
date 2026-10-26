//https://claude.ai/chat/cfe7aa3f-6270-4d4e-958f-f244b40f180d

status: {
  default: "Unverified",
  labels: {
    "Unverified.Active": "Activate",     // declares the edge + button text
    "Active.Locked":     "Lock Account",
  },
  "Unverified.Active": async (run_doc) => {   // guard: runs before commit
    const doc = run_doc.target.data[0]
    if (!doc.token) { run_doc.error = "Verification token is missing"; return }
    // verify; on failure set run_doc.error
  },
}

Rules that matter

labels is the edge list. An edge exists only if it has a label. States are derived from the edge keys, so values is unnecessary. The exception is docstatus, which needs explicit numbering.
A two-part key is a guard. It runs before the commit, reports denial through run_doc.error, and returns nothing. No guard means the edge is allowed.
The signal is data. input: { "status.Unverified.Active": "", token } is a claim. The key is the intent, token is evidence declared as a virtual field, and a plain field is a record change. The caller labels nothing, and the schema classifies each entry.
The stored state is the authority. The controller loads the document first, and the engine rejects a signal whose From doesn’t match the stored state.
_state is written by the engine only. Callers send claims, and the engine writes the facts and the results (1 or -1).

Notifications are not in the schema

Unverified.Active.notify is deleted. A resolver decides whether an edge notifies by looking up a template under the exact edge key. No template means silence, so no null entries and no wildcards.
The channel, the recipient field and the template come from the doctype, System Settings and the template store.

Fallible outward effects get a sub-FSM

An email or webhook is recorded as Pending, then Sent or Failed, under a key such as Unverified.Active.notified, written in the same commit as the parent edge.
A failure never rolls back the parent state. Retry is an ordinary signal.
Inward, infallible effects (view switch, docstatus sync, provisioning) stay plain functions.

Open decisions

Whether the first delivery attempt happens immediately after commit or waits for a sweep.
Whether one failed claim rejects the whole request. I recommended all-or-nothing.
A startup report that lists, for every edge, its guard, its resolved template and its recipient, so the implicit parts are visible.

Fixes needed in _handleSignal for this to work: await the guard and check run_doc.error, commit before running effects, and accept only signal keys from input._state.