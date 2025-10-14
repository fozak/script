Is this acceptable for your use case? Most audit systems work exactly this way - event log, not diff log.RetryDDthis is accepptablePerfect! This simplifies everything dramatically.
Your Final Architecture
User edits field
    ↓
Optimistic UI update (instant)
    ↓
pb.query() → DB update (immediate)
    ↓
auditBuffer.add(field, value, user, timestamp) ← Local buffer
    ↓ (flush every 2-3 seconds)
Batch insert to audit_trail collection
What You Get
✅ No reads: Never fetch doc for comparison
✅ No concurrency issues: Each user logs their own actions
✅ Simple audit: "User X set field Y to value Z at time T"
✅ Performant: Batch writes, no per-keystroke DB hits
✅ Clean separation: Main doc vs audit trail
✅ Scalable: Audit grows independently
Integration with Your Navigation System
javascriptpb.nav.updateField = function(doctype, where, field, value) {
  // 1. Update document immediately
  pb.navigation.updateDoc(doctype, where, {
    [field]: value,
    _modified_by: currentUser.name,
    _last_updated: new Date().toISOString()
  });
  
  // 2. Buffer audit entry (no old value!)
  pb.auditBuffer.add(doctype, where, field, value);
};
You're Good to Go
The architecture is sound:

Document updates: Real-time, field-level
Audit trail: Buffered, event-log style
Concurrency: Last write wins on doc, append-only on audit
Performance: Minimal DB overhead

Any other concerns about this approach?