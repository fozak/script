Here are the User model invariants:





Identity

id = generateId('User', email) — email is the identity key. Same email always produces same ID.
Email is immutable on a record. Changing email = new record (new ID), retire old.
Anonymous users are real User records. is_anon: 1 is just a flag, not a different type.
One record per email, enforced by deterministic ID.

State

auth_status lives only in D1. Never in JWT. Worker hits D1 to check lock/disable on sensitive operations.
email_status (verified/unverified) lives in D1. JWT carries a snapshot at issue time only.
tokenKey is in D1 and in JWT payload. Mismatch = token revoked.
docstatus: 2 = retired (promoted-away anon, deleted user). Never physically deleted.

Auth

JWT is issued by Worker, signed with JWT_SECRET, HS256. No third party signs tokens.
JWT payload carries: sub (email), name, _allowed_read, auth_status snapshot, email_status snapshot, tokenKey, exp.
localStorage.currentUser is the single client-side store. One key, one shape, always in sync with globalThis.currentUser.
Client is responsible for writing localStorage.currentUser after receiving run_doc back from Worker. Adapter never touches localStorage (it runs server-side).

Schema / CW

is_virtual: 1 fields (token, verification_code) are never persisted to D1. Stripped before write.
systemFields (owner, creation, modified_by, modified) are stamped by the framework, never by caller.
_allowed / _allowed_read are the access control arrays. ACL is record-level, not table-level.
User doctype is the only doctype that can issue tokens. No other doctype has auth behavior.

Promotion

anon → real is always: create new record + retire old. Never mutate email on existing record.
On promotion, globalThis.currentUser and localStorage.currentUser are atomically overwritten with the new identity.

Which of these do you want to challenge or refine before moving to the D1 schema?