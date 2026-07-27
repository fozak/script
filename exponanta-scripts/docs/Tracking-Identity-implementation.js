Pseudo-Email Identity System — Documentation

Concept

Anon users are real PocketBase users with a pseudo-email instead of a real one. No separate anon handling — one User doctype, one auth system, different _state.

Pseudo-email formats:

14928f1f75f5@user.anon.invalid    → anonymous visitor
16172016234@user.phone.invalid    → phone-only user
denis@nesen.org                   → real email user

.invalid is IETF RFC2606 reserved — guaranteed never a real domain.

Identity States

_state: 'anon'       → pseudo-email, auto-provisioned, no user input
_state: 'user'       → real email, registered, unverified
_state: 'verified'   → real email, verified

Transitions:

anon → user      → user provides real email + password
user → verified  → user clicks verification email

Modules

CW-config.js — configuration:

javascript
CW._config.identity = {
  keys: {
    user:    'cw_user',      // localStorage
    utms:    'cw_utms',      // localStorage
    session: 'cw_session',   // sessionStorage
  },
  pseudo_domain: {
    anon:  '@user.anon.invalid',
    phone: '@user.phone.invalid',
  },
  qualify: {
    time_ms:       120000,   // 2 min
    scroll_pct:    0.5,      // 50%
    require_score: 2,        // 2 of 3
  },
  bot_patterns: [/bot/i, /crawler/i, /spider/i, /headless/i],
}

CW._config.hub = {
  url: "https://hub.i771468.workers.dev/",
}

auth.js — one change only:

javascript
// skip verification for pseudo-emails
if (!email.includes('.invalid')) {
  await pb.collection('users').requestVerification(email)
}

pb-adapter-pocketbase.js — one change only:

javascript
// eager pb init so CW-identity.js can use pb immediately
const { pb_url } = globalThis.CW._config
globalThis.pb = globalThis.pb || new PocketBase(pb_url)
globalThis.pb.autoCancellation(false)

CW-identity.js — new module:

Responsibilities:

bot detection — skip provisioning for bots
UTM capture — first touch wins, stored in localStorage
session id — one per tab via sessionStorage
anon provisioning — calls provisionUser with pseudo-email on first visit
silent re-login — returning anon re-auths from localStorage credentials
qualify tracking — fires cw:identity:qualified when 2 of 3 signals met
context() — returns full identity object for hub requests

Exports to globalThis:

javascript
CWIdentity.context()   // returns current identity object
CWIdentity.identify()  // promotes anon to real user
CWIdentity.init()      // runs on load

Context shape:

javascript
{
  user_id:    "user0bfldhrg5l6",          // pb id, always present
  anon_email: "14928f1f75f5@user.anon.invalid",  // null for real users
  session_id: "7e3428bc-...",             // this conversation
  type:       "anon|user|verified",
  page:       "https://nesen.org/chat",
  referrer:   "https://google.com",
  utms:       { utm_source: "...", ... },
}

CW-hub-client.js — new module:

Responsibilities:

injects widget CSS + DOM
manages widget state (idle → pre_chat → chatting → waiting → responded)
calls CWIdentity.context() on every message
opens SSE to hub with context params
renders messages in widget UI

Load order:

html
<script src="/assets/CW-config.js"></script>
<script src="/assets/pb-adapter-pocketbase.js"></script>  <!-- pb eager init -->
<script src="/assets/auth.js"></script>                   <!-- provisionUser -->
<script src="/assets/CW-identity.js"></script>            <!-- identity init -->
<script src="/assets/CW-hub-client.js"></script>          <!-- widget -->

Hub Worker (hub-worker.js on Cloudflare Workers)

single GET endpoint — SSE + processing in same request context
receives: id, text, user_id, session_id, type, page
processes in same request via TransformStream
no Durable Objects needed — same request context solves cross-request I/O
logs to D1 events table (append only, one doctype per event type)

D1 schema:

sql
CREATE TABLE events (
  id         TEXT PRIMARY KEY,
  doctype    TEXT NOT NULL,
  created_at INTEGER,
  data       TEXT    -- JSON, all fields including user_id, session_id etc
)

Key decisions:

.invalid TLD — IETF reserved, never real, safe forever
anon IS a PB user — same auth system, same JWT, same ACL
owner on Session doctype set via existing onCreate systemField — no special handling
no conversion of anon → user — registration creates new real user record
D1 is append-only journal — no reads on hot path
SSE in same request context — no Durable Objects needed