# CW learn notes

Things learned while setting up users and login on a new domain (softskill.dev).
Run the JS in the browser console of a page that has CW loaded.
Replace `<password>` with a real password. Do not commit real passwords.

## 1. Domain comes first

Every record gets its `domain` from the caller. The adapter checks that the
record's domain equals the caller's domain and answers `403 forbidden` if not.
In the browser, `globalThis.currentUser` supplies it, so set it before the
first create on a new domain:

```js
localStorage.removeItem("currentUser");
globalThis.currentUser = { domain: "softskill.dev" };
```

A stale or expired token in `localStorage` makes the browser stamp one domain
while the server sees another (the server uses the token's domain, or the
`Origin` hostname when there is no valid token). Clear it as above when you
get an unexpected `403 forbidden` on create.

## 2. Create a user

A user is a normal `create` on `User`. The `password_hash` hook hashes the
password and removes the plain `password` from the record.

```js
globalThis.currentUser = { domain: "softskill.dev" };

const created = await CW.run({
  operation: "create",
  target_doctype: "User",
  input: {
    email: "denis@softskill.dev",
    full_name: "Denis V",
    password: "<password>",
  },
  options: { render: false },
});
created.target.data[0]._state;   // { status: "Unverified", docstatus: "Draft" }
```

The new user starts as `Unverified` (default of the `status` state in
`CW.Schema.User`).

## 3. Log in

```js
const r = await CW.run({
  operation: "login",
  target_doctype: "User",
  input: { email: "denis@softskill.dev", password: "<password>" },
  options: { render: false },
});
globalThis.currentUser = r.user;
!!globalThis.currentUser.token;   // must be true before any write
```

Login is blocked until the user is `Active`. For an `Unverified` user it
returns `error: "403 account unverified"` and `r.user` is only
`{ domain }`. Do not assign that to `currentUser`: it wipes the token. If you
did, reload the page; `currentUser` is restored from `localStorage`.

The check is in `login()` in `CW-adapter-d1.js`:

```js
const status = (doc._state || {}).status;
if (status !== "Active") { run_doc.error = `403 account ${status?.toLowerCase() ?? "not active"}`; return; }
```

## 4. Activation is manual (for now)

The only transition `Unverified -> Active` is allowed for System Manager.
On a new domain nobody has that role yet, and a new user cannot update its own
record (update needs owner, `_allowed` or an `item_users` role). So the first
user must be set to `Active` directly in the database.

Database: `nesen-d1` (see `wrangler.toml` in this folder). Run from this folder.

1. Look at the row first (read-only):

```bash
npx wrangler d1 execute nesen-d1 --remote --command "SELECT name, domain, json_extract(data,'$._state') AS st FROM item WHERE doctype='User' AND json_extract(data,'$.email')='denis@softskill.dev'"
```

Expect one row with `domain` `softskill.dev` and `st` like `{"status":"Unverified", ...}`.
If `st` comes back as a quoted string instead of a JSON object, stop:
`json_set` below assumes `_state` is stored as a JSON object.

2. Set it to Active:

```bash
npx wrangler d1 execute nesen-d1 --remote --command "UPDATE item SET data = json_set(data,'$._state.status','Active') WHERE doctype='User' AND domain='softskill.dev' AND json_extract(data,'$.email')='denis@softskill.dev'"
```

3. Check it:

```bash
npx wrangler d1 execute nesen-d1 --remote --command "SELECT json_extract(data,'$._state.status') AS status FROM item WHERE doctype='User' AND domain='softskill.dev' AND json_extract(data,'$.email')='denis@softskill.dev'"
```

Expect `Active`. Then run the login from section 3 again.

This edits the live table, so keep the `WHERE` on `doctype`, `domain` and
email. Replace the email and domain for another user.

## 5. After login: owner, update, public read

- Records created while logged in get `owner` = your user id. Only the owner
  (or `_allowed` / an `item_users` role) can update or delete them. A record
  created while signed out has an empty owner and cannot be updated by you.
- Updates need the token on the server. Check `!!globalThis.currentUser?.token`
  first. With no valid token the update ACL is `(0)` and you get
  `403 forbidden or not found`.
- Update and delete find the record by running a `select` with your `query`
  first, so `query: { where: { path: "..." } }` and `{ where: { name: "..." } }`
  both work.
- A schema with `is_public: true` puts the public role in each new record's
  `_allowed_read`, so signed-out visitors can read it. Records created before
  that flag was added need to be created again (or updated).

## 6. Where things are

| What | File |
|---|---|
| Login status check | `CW-adapter-d1.js`, `login()` |
| User schema and default status | `CW-config.js`, `CW.Schema.User` |
| Domain stamping on the client | `CW-config.js`, `systemFields` `domain` hook |
| Domain from token or Origin on the server | `worker.js`, POST handler |
| Update/delete pre-select | `CW-run.js` |
| Public read flag | `CW-config.js`, `_allowed_read` hook (`schema.is_public`) |
