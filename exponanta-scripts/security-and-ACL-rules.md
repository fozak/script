Preliminary decision

1. Create 2 records in users + item. Roles to be managed in item. we need to prevent anything then Basic in creation

// 1 operation 
const user1 = await pb.collection('users').create({ id: 'u23456789012345',
  email: 'test1-' + 123 + '@example.com',
  password: 'Test123456!',
  passwordConfirm: 'Test123456!'
});


//2 operation
const user1 = await pb.collection('item').create({
  id: 'u23456789012345',
  name: 'u23456789012345',
  data: {
    email: 'test1-' + 123 + '@example.com'
  }
});

TODO. Coworker run shown accept collection: in options


this works
//-------------------------------------------------------- 
@request.body.roles:isset != true

//---------------------------------------------------------

PocketBase Roles Management – 3 Methods
1️⃣ Parallel Item Collection with Backlinks

Idea:

Create a separate items collection to store extended user info (roles, permissions, etc.)

Link each user via userId or backrelation

Fetch roles via expand or backrelation syntax

Pros:

Flexible, can store complex permissions

Works with existing PB relational system

Cons:

Requires extra collection

Must manage creation of item records (hooks or client code)

Needs server-side protection to prevent role escalation

Summary: Flexible but more complex, prone to errors if user creates their own item with admin roles.

2️⃣ Auth/Server Hooks to Assign Default Roles

Idea:

Use beforeCreate / afterAuth hooks

When a user registers, automatically create linked record or assign roles

Server-side code sets default roles like ["basic"]

Pros:

Secure — clients cannot override roles

Automatic role assignment

Cons:

Requires coding hooks / server-side Node.js

Slightly more setup than Admin UI

Still more complex than default field method

Summary: Secure, automated, but involves extra server logic.

3️⃣ Default Roles on Users with Field Protection ✅ Easiest

Idea:

Add a roles field directly in the users collection

Set default value: ["basic"]

Mark field as protected/read-only so users cannot modify it

Implementation Steps:

Add field in Admin UI:

Collections → users → Fields → Add Field
name: roles
type: JSON / Select Multiple
default: ["basic"]
values: ["basic","editor","manager","admin"]
protected: true


Set Update Rule:

@request.auth.id = id


Allows user to update own record, but cannot modify roles

Admins can override roles if needed:

@request.auth.roles ?~ "admin"


Pros:

Simple — no extra collections, no hooks needed

Default value automatically assigned on registration

Roles are safely protected from user edits

Easy to query in client code: pb.authStore.model.roles

Cons:

Less flexible if you want very complex per-user permissions

Summary: Easiest, simplest, and safe for most apps.

✅ Recommendation

Use Method 3 – Default Roles on Users with Field Protection

Only consider Method 1 or 2 if you need complex multi-collection permissions or dynamic role assignments.

If you want, I can also create a ready-made Node.js script that:

Adds roles field to users

Sets default ["basic"]

Marks it protected

Backfills existing users

This would fully automate Method 3.

Do you want me to do that?
Skip to content\nChat history\nNew chat\nCtrl\nShift\nO\nSearch chats\nCtrl\nK\nLibrary\nProjects\nGPTs\nExplore\nFrappe GPT\nPersonalized Career Counseling\nYour chats\nDocType system flag in Frappe\nPocketBase user collection\nSystem doctype flags in Frappe\nConsolidate system fields\nUnified doctype approach\nOpen history in VS Code\nExplain getter function\nQuerying run records\nВремя приготовления лечо\nFrappe-like field update\nDocument tree logic JS\nEfficient unified doctype\nFrappe document delete process\nRun document type\nQwen latest developments\nStudent interest in entrepreneurship\nBrookline MA municipality members\nOSS query tools for JSON\nFetch in Frappe field\nProcessing configs with functions\nField enrichment coverage\nFax request explanation\nBest US Fax Apps\nShuttle bus services Boston Cambridge\nRotary club management rules\nInvoice generation example\nSimplified pipeline result\nForeigners on NGO boards\nDenis D\nFree\nUpgrade\nChatGPT\nShare\nAdd people\nYou said:\nis there any doctype flag in frappe showing that its system or public kind of doctype like Schemal\nYou said:\nis there any role in frappe like All\nYou said:\nif is behind record.data. will i be able to check data: {    "role": "All"} first BEFORE @request.auth.name = data._owner\r\n|| @request.auth.roles ?~ data._allowed_roles\r\n|| @request.auth.roles ?~ data._allowed_roles_read\r\n|| @request.auth.name ~ data._allowed_users\r\n|| @request.auth.name ~ data._allowed_users_read\r\n   \nYou said:\nit is embedded "permissions": [\r\n  {\r\n   "create": 1,\r\n   "delete": 1,\r\n   "email": 1,\r\n   "print": 1,\r\n   "read": 1,\r\n   "report": 1,\r\n   "role": "All",\r\n   "share": 1,\r\n   "write": 1\r\n  },\nYou said:\ncheck pocketbase documentation in what sequence this const hasAccess = hasAllRoleAccess ||\r\n                  (@request.auth.name === data._owner) ||\r\n                  (@request.auth.roles ?~ data._allowed_roles) ||\r\n                  (@request.auth.roles ?~ data._allowed_roles_read) ||\r\n                  (@request.auth.name ~ data._allowed_users) ||\r\n                  (@request.auth.name ~ data._allowed_users_read); executed. is this executed if 1st condition made\nYou said:\nno help me optimize I want to have the SAME collection rules. Some records SHOULD be public for read. how to setup\nYou said:\n??? pocketbase canot resolve like this permissions?.role = "All" || \r\n@request.auth.name = _owner || \r\n@request.auth.roles ?~ _allowed_roles || \r\n@request.auth.roles ?~ _allowed_roles_read || \r\n@request.auth.name ~ _allowed_users || \r\n@request.auth.name ~ _allowed_users_read\r\nYou said:\nDo i need  something else, if i have these rules and in user collection roles column\nYou said:\nthe only point is that i nechanizm when the user collection recieves updates from item collection for particular user. System user set up has role in user_124cd that is synced to user\nYou said:\ncan i use directly SQLite view like -- Optimized query using CTE to pre-compute schema permissions\nWITH schema_perms AS (\n    SELECT\n        json_extract(s.data, \'$.name\') AS doctype_name,\n        json_extract(p.value, \'$.role\') AS role\n    FROM item s\n    JOIN json_each(s.data, \'$.permissions\') AS p\n    WHERE s.doctype = \'Schema\'\n      AND (\n          json_extract(p.value, \'$.read\') = 1 OR\n          json_extract(p.value, \'$.write\') = 1 OR\n          json_extract(p.value, \'$.create\') = 1 OR\n          json_extract(p.value, \'$.delete\') = 1\n      )\n    GROUP BY doctype_name, role\n)\nSELECT\n    u.name AS id,\n    u.name AS user_name,\n    json_group_array(DISTINCT sp.doctype_name) AS permitted_doctypes\nFROM item u\nJOIN item r\n    ON r.doctype = \'Has Role\'\n   AND json_extract(r.data, \'$.parent\') = u.name\nJOIN schema_perms sp\n    ON sp.role = json_extract(r.data, \'$.role\')\nWHERE u.doctype = \'User\'\nGROUP BY u.name;\nYou said:\nwill this work 1. Don\'t Sync at All - Use Backrelations (SIMPLEST)\r\nInstead of duplicating data, query it when needed using PocketBase\'s backrelation syntax:\r\n// NO hook needed!\r\n// Just query the relationship in reverse\r\n\r\n// Get user with all their roles from items\r\nconst user = await pb.collection(\'users\').getOne(userId, {\r\n  expand: \'items_via_user.role\'  // Auto-fetch related items\r\n});\r\n\r\n// Access roles\r\nconst roles = user.expand?.items_via_user?.map(item => item.role) || [];\r\nIn your rules, use backrelations:\r\n// users collection listRule:\r\n"@request.auth.id = id || @request.auth.items_via_user.role ?~ \'admin\'"\r\nHow it works:\r\nitems_via_user = automatic backrelation (PocketBase creates this)\r\nFormat: {collection}_via_{relationField}\r\nNo sync needed - always curren\nYou said:\nlets check several scenarios. 1) if user is owner, then on create record.data.owner=user_123, no issue at all, we just need to pull username from user collection. how to set user.name? \nYou said:\nhow to populate name column in user system collection\nYou said:\ndo pb prevents in users collection email duplicates?\nYou said:\nexplain first // ============================================================================\r\n// POCKETBASE CORE - Client initialization and utilities\r\n// ============================================================================\r\n\r\nwindow.pb = window.pb || new PocketBase("http://143.198.29.88:8090/");\r\n// DISABLE auto-cancellation properly in UMD build\r\nwindow.pb.autoCancellation(false);\r\n\r\n// Global config\r\nwindow.MAIN_COLLECTION = window.MAIN_COLLECTION || \'item\';\r\nwindow.currentUser = pb.authStore.model;  then I have \r\n{avatar: \'\', collectionId: \'_pb_users_auth_\', collectionName: \'users\', created: \'2025-07-19 21:53:31.566Z\', email: \'8o1@example.com\', …}\r\navatar\r\n: \r\n""\r\ncollectionId\r\n: \r\n"_pb_users_auth_"\r\ncollectionName\r\n: \r\n"users"\r\ncreated\r\n: \r\n"2025-07-19 21:53:31.566Z"\r\nemail\r\n: \r\n"8o1@example.com"\r\nemailVisibility\r\n: \r\nfalse\r\nid\r\n: \r\n"hr635eof2uuoaa9"\r\nname\r\n: \r\n"User qz3"\r\nupdated\r\n: \r\n"2025-08-15 19:04:42.224Z"\r\nverified\r\n: \r\nfalse\nYou said:\ncan currentUser see own user.roles\nYou said:\nit looks like local data my pb data for this user IS different\nYou said:\nare u sure that currentUSer (not admin) can list users\nYou said:\nconst me = await pb.collection(\'users\').getOne(pb.authStore.model.id);\nconsole.log(me.name, me.roles);\n\nClient.ts:417  GET http://143.198.29.88:8090/api/collections/users/records/hr635eof2uuoaa9 404 (Not Found)\nsend @ Client.ts:417\ngetOne @ CrudService.ts:165\ngetOne @ RecordService.ts:242\n(anonymous) @ VM2018:1Understand this error\nClient.ts:417 Fetch failed loading: GET "http://143.198.29.88:8090/api/collections/users/records/hr635eof2uuoaa9".\nsend @ Client.ts:417\ngetOne @ CrudService.ts:165\ngetOne @ RecordService.ts:242\n(anonymous) @ VM2018:1\nClient.ts:549 Uncaught ClientResponseError 404: The requested resource wasn\'t found.\n    at Client.ts:447:23\n    at async <anonymous>:1:12\nYou said:\npb.authStore.model.id\n\'hr635eof2uuoaa9\'\nconst me = await pb.collection(\'users\').authRefresh();\nClient.ts:417  POST http://143.198.29.88:8090/api/collections/users/auth-refresh 401 (Unauthorized)\nsend @ Client.ts:417\nauthRefresh @ RecordService.ts:729\n(anonymous) @ VM2079:1Understand this error\nClient.ts:417 Fetch failed loading: POST "http://143.198.29.88:8090/api/collections/users/auth-refresh".\nsend @ Client.ts:417\nauthRefresh @ RecordService.ts:729\n(anonymous) @ VM2079:1\nClient.ts:549 Uncaught ClientResponseError 401: The request requires valid record authorization token.\n    at Client.ts:447:23\n    at async <anonymous>:1:12\nYou said:\nhow to support the sync of local client to db if tocken is long lived (authorefresh?)\nYou said:\non self registrstion, then i need to run function that populates the name field\nYou said:\nif i have alsready currentUser\nYou said:\nthis is somehow tricky now update rule id = @request.auth.id so user can update himself, inluding nama and role. Suggestions\nYou said:\nfind pocketbase user discussions on self managing of user record\nYou said:\nexplain username. there is NO username in collection\nYou said:\nin the context of this discussion How to check if a username is already in use when a user is updating their profile #4157\r\n Answered by ganigeorgiev\r\nshyakadavis asked this question in Q&A\r\n\r\nshyakadavis\r\non Jan 15, 2024\r\nHi;\r\n\r\nSay I want a user to be able to update their name and username on their profiles, how would I first check that the new username is not already in use?\r\n\r\nTook me a while to get here, but I just learned about locked rules (handy feature) whereby I have to bypass it to first access the users collection.\r\n\r\nFrom this, #1018 (comment), I was very curious/worried if not doing that optional bypass won\'t override the current user session with admin privileges, hence a security disaster?\r\n\r\nIf, however, this is the recommended way, how do I immediately log out that admin after doing my check?\r\n\r\nI was thinking of adding 2 new .env vars, PUBLIC_ADMIN_EMAIL & PUBLIC_ADMIN_PASSWORD but I\'m not sure about the best course of action here.\r\n\r\nFor context, I am using SvelteKit and doing those checks in form actions.\r\n\r\nThank you for the help.\r\n\r\nAnswered by ganigeorgiev\r\non Jan 15, 2024\r\nHow to check if a username is already in use when a user is updating their profile\r\n\r\nYou don\'t have to manually check for duplicated usernames. The username field has builtin unique validator that should return an error on update if you are trying to set a value that already exists (in the future there will be also policies to prevent usernames reuse and to forbid using a deleted/old username that has recently changed).\r\n\r\nI was thinking of adding 2 new .env vars, PUBLIC_ADMIN_EMAIL & PUBLIC_ADMIN_PASSWORD but I\'m not sure about the best course of action here.\r\n\r\nI\'m not sure that I understand what is your goal, but note that admins have access and can modify everything (including your db sch…\r\n\r\nView full answer \r\nReplies:2 comments · 1 reply\r\n\r\nshyakadavis\r\non Jan 15, 2024\r\nAuthor\r\nThis is my +page.server.ts if it helps:\r\n\r\nimport { fail, redirect, type NumericRange, error } from \'@sveltejs/kit\';\r\nimport { message, setError, superValidate } from \'sveltekit-superforms/server\';\r\nimport { ClientResponseError } from \'pocketbase\';\r\n\r\nimport { profile_schema, type ProfileData } from \'$lib/types/user\';\r\n\r\nexport const load = async ({ locals }) => {\r\n\tif (!locals.user) redirect(302, \'/auth/login\');\r\n\r\n\tconst profile = (await locals.pb.collection(\'users\').getOne(locals.user.id)) as ProfileData;\r\n\r\n\tif (!profile) error(404);\r\n\r\n\tconst form = await superValidate(profile, profile_schema);\r\n\r\n\treturn { form, profile };\r\n};\r\n\r\nexport const actions = {\r\n\tdefault: async (event) => {\r\n\t\tif (!event.locals.user) redirect(302, \'/auth/login\');\r\n\r\n\t\tconst form = await superValidate(event, profile_schema);\r\n\r\n\t\tif (!form.valid) return fail(400, { form });\r\n\r\n\t\ttry {\r\n\t\t\tconst filter = username="${form.data.username}";\r\n\r\n\t\t\tconst user = await event.locals.pb.collection(\'users\').getFirstListItem(filter);\r\n\r\n\t\t\tif (user && user.id !== event.locals.user.id) {\r\n\t\t\t\treturn setError(form, \'username\', \'Username already in use.\');\r\n\t\t\t}\r\n\r\n\t\t\tawait event.locals.pb.collection(\'users\').update(event.locals.user.id, form.data);\r\n\t\t} catch (error) {\r\n\t\t\tif (error instanceof ClientResponseError) {\r\n\t\t\t\tconsole.error({ status: error.status, message: error.message });\r\n\t\t\t\tconsole.table({ ...error.response });\r\n\t\t\t\treturn message(form, error.message, { status: error.status as NumericRange<400, 599> });\r\n\t\t\t}\r\n\t\t\tconsole.error(error);\r\n\t\t\treturn message(form, \'An unknown error occurred\', { status: 500 });\r\n\t\t}\r\n\r\n\t\treturn message(form, \'Profile updated successfully\');\r\n\t}\r\n};\r\n0 replies\r\n\r\nganigeorgiev\r\non Jan 15, 2024\r\nMaintainer\r\nHow to check if a username is already in use when a user is updating their profile\r\n\r\nYou don\'t have to manually check for duplicated usernames. The username field has builtin unique validator that should return an error on update if you are trying to set a value that already exists (in the future there will be also policies to prevent usernames reuse and to forbid using a deleted/old username that has recently changed).\r\n\r\nI was thinking of adding 2 new .env vars, PUBLIC_ADMIN_EMAIL & PUBLIC_ADMIN_PASSWORD but I\'m not sure about the best course of action here.\r\n\r\nI\'m not sure that I understand what is your goal, but note that admins have access and can modify everything (including your db schema) and it is safe to be authenticated as admin only in a server-side context (in this case it is also safe to have a single global SDK instance; one such example could be #3792 (reply in thread)).\r\n\r\n1 reply\r\n@shyakadavis\r\nshyakadavis\r\non Jan 15, 2024\r\nAuthor\r\nThe username field has builtin unique validator that should return an error on update\r\n\r\nAh, got it.\r\n\r\nThen I\'m good with this, thank you.\r\n\r\ncatch (error) {\r\n\t\t\tif (error instanceof ClientResponseError) {\r\n\t\t\t\tif (error.response.data.username.code === \'validation_invalid_username\') {\r\n\t\t\t\t\treturn setError(form, \'username\', error.response.data.username.message);\r\n\t\t\t\t}\r\n\t\t\t\treturn message(form, error.message, { status: error.status as NumericRange<400, 599> });\r\n\t\t\t}\r\nI\'m not sure that I understand what is your goal\r\n\r\nNever mind that; I was just worried of doing another auth await pb.admins.authWithPassword(...) when I already have another user logged in, but I\'m glad to know that:\r\n\r\nit is safe to be authenticated as admin only in a server-side context\r\n\r\nI don\'t 100% get it, though, but I\'ll read more of that thread, and if I ever run into an issue with this, I\'ll be sure to ask for help.\r\n\r\nThank you.\r\n\r\nYou said:\nTHERE IS NO username in user collection. WHat they are talking about\nYou said:\nIF it goesnt exist, how pocketbase provide uniqness in sourcecode \nYou said:\nlets step back to backlinks in rules\nYou said:\nso if i manage the user extended props in item collection, how to link here to pull roles from item record\nYou said:\nremind how to refresh in consolde the currentUser\nYou said:\nbut how to backlink records NOT manually. can i link by email in users.email -> item.data.email\nYou said:\nthen 1) user record created by USER in users collections 2) automatically created item record with some defult roles 3) they are linked. How to achive .THE EASIEST way\nYou said:\nfind the most easiest way to assign roles, even creative\nYou said:\ncan i then protect the roles from USER himself\nChatGPT said:\n\nYes — you can protect the roles from the user, even if the user owns their own record, using the simplest possible PocketBase setup.\n\nBelow is the easiest, safest pattern that works reliably.\n\n✅ EASIEST WAY TO PROTECT ROLES FROM THE USER\n1. Store roles only on the Item record, not on users\n\nYour users collection should contain ONLY public-safe fields:\n\nbash\nCopy code\nusers/\n  email\n  name\n  verified\n  ...\n\n\nCreate a parallel collection:\n\npgsql\nCopy code\nitems/\n  user (relation → users)\n  roles (json / select / text)\n\n✅ 2. Give ownership to admin, not user\n\nIn items:\n\nRule: Create → anyone\n\nSo the app can create the item on signup.\n\nRule: Read → user owns it\njs\nCopy code\nuser.id = @request.auth.id\n\nRule: Update → ADMIN ONLY\njs\nCopy code\n@request.auth.email = "admin@example.com"\n\n\nor\n\njs\nCopy code\n@request.auth.role = "admin"\n\nRule: Delete → nobody\n\nUnless you want admins to delete.\n\n➡ Result:\nUser can READ their roles, but cannot modify them at all.\n\n✅ 3. Auto-create the Item with roles on first login (super easy)\n\nIn PocketBase:\n\nSettings → Auth → Auth Hooks → "After User Auth"\n\nAdd:\n\njs\nCopy code\nconst existing = await pb.collection("items")\n  .getFirstListItem(`user="${authRecord.id}"`)\n  .catch(() => null);\n\nif (!existing) {\n  await pb.collection("items").create({\n    user: authRecord.id,\n    roles: ["basic"]  // default roles\n  });\n}\n\n\n➡ This auto-creates an item record on login/signup.\n\nNo migrations. No backend code. No complexity.\n\n🔥 BONUS: EASIEST CREATIVE APPROACH\n✔ Hide roles in a completely separate collection\n✔ User can’t even see the collection in UI\n✔ Only admin can update it\n✔ Your app can read it via PocketBase SDK\n\nUse:\n\nsql\nCopy code\nuser → roles_map → roles\n\n\nUser has no idea roles exist.\n\n🔐 Summary\nFeature\tHow\nAuto-assign roles\tAuth Hook creates item with default roles\nLink user → item\tStore user.id in the item\nProtect roles\tMake item writable only by admin\nUser can’t change roles\tUpdate rule blocks them\nEasiest possible\tNo triggers, no scripts, no migrations\n\nIf you want, I can generate ready-to-paste PocketBase rules for each collection.\n\nYou said:\nwho and how will create parallel record in item collection\nChatGPT said:\n\nHere are ALL possible ways, but I’ll show you THE EASIEST and recommended one first.\n\n✅ THE EASIEST WAY: PocketBase Auth Hook\n\nPocketBase has built-in Auth Hooks that run automatically after the user signs up or logs in.\n\nWho creates the item record?\n\nPocketBase itself (through your hook).\n\nHow?\n\nGo to PocketBase dashboard\n\nSettings → Auth → Auth Hooks\n\nFind: “After Auth with Provider”\n\nPaste this code:\n\njs\nCopy code\nconst user = authRecord;\n\nconst existing = await pb.collection("items")\n  .getFirstListItem(`user="${user.id}"`)\n  .catch(() => null);\n\nif (!existing) {\n  await pb.collection("items").create({\n    user: user.id,\n    roles: ["basic"]   // default roles\n  });\n}\n\n✔ What this does:\n\nUser signs up → PB automatically runs this code\n\nIt checks if an items record exists\n\nIf not → creates one automatically with default roles\n\nUser never sees or edits roles\n\n✅ Alternative options (if you prefer other ways)\nOption 2: Client app creates item after signup\n\nYour JS code (frontend) does it:\n\njs\nCopy code\nconst user = await pb.collection("users").authWithPassword(email, pass);\n\nawait pb.collection("items").create({\n  user: user.record.id,\n  roles: ["basic"]\n});\n\n\n✔ Very simple\n❌ User must not be allowed to change roles — so you still protect fields using rules.\n\nOption 3: Cloudflare Worker / Server script\n\nIf you run a backend, you can create the item from there.\n\nBut since you want the easiest way, skip this.\n\nOption 4: Migration script\n\nWhen migrating user data.\n\nYou don’t need this for live app logic.\n\n🏆 Recommended summary\nMethod\tAuto?\tEasiest?\tSecure?\tRecommended\nAuth Hook (PB built-in)\t✅ Yes\t⭐⭐⭐⭐⭐\t⭐⭐⭐⭐⭐\tYES\nFrontend create record\t❌ No\t⭐⭐⭐⭐\t⭐⭐\tok\nBackend service\t❌ No\t⭐⭐\t⭐⭐⭐\tfor pros\nMigrations\t❌ No\t⭐\t⭐⭐\tadmin use only\n🔥 So the real answer:\n\nPocketBase creates the item record automatically using an Auth Hook you write once.\n\nNo user action. No admin action. Fully automatic.\n\nIf you want, I can write the full, final complete PocketBase rule set for users + items so roles stay 100% protected.\n\nYou said:\nconst user = await pb.collection("users").authWithPassword(email, pass);\r\n\r\nawait pb.collection("items").create({\r\n  user: user.record.id,\r\n  roles: ["Admin"] \n}); breaks everything\nYou said:\nwill this work ✅ Simpler Alternative: Roles on Users with Field Protection\r\nOption A: Default Roles on Registration (Built-in)\r\nIn PocketBase Admin → Collections → users → Fields → roles: Set Default value:\r\n["basic"]\r\nThis automatically assigns roles on creation - no hooks needed!\nYou said:\nhow password reset works in pocketbase \nYou said:\ncoming back to ✅ Simpler Alternative: Roles on Users with Field Protection\r\nOption A: Default Roles on Registration (Built-in)\r\nIn PocketBase Admin → Collections → users → Fields → roles: Set Default value:\r\n["basic"]\r\nThis automatically assigns roles on creation - no hooks needed! \nYou said:\nAdmin UI → Collections → users → Fields → Add Field: is there API to call to set not manually\nYou said:\nwill it update sqlite, so i can migrate with preset\nYou said:\n// create the field\nawait pb.collection(\'users\').schema.add({\n  name: \'roles\',\n  type: \'json\',\n  required: false,\n  unique: false,\n  options: {\n    values: [\'basic\',\'editor\',\'manager\',\'admin\'],\n    default: [\'basic\']\n  }\n});\nVM2312:2 Uncaught TypeError: Cannot read properties of undefined (reading \'add\')\n    at <anonymous>:2:36\n(anonymous) @ VM2312:2Understand this error\n// create the field\nawait pb.collection(\'users\').schema.update({\n  name: \'roles\',\n  type: \'json\',\n  required: false,\n  unique: false,\n  options: {\n    values: [\'basic\',\'editor\',\'manager\',\'admin\'],\n    default: [\'basic\']\n  }\n});\n\nVM2325:2 Uncaught TypeError: Cannot read properties of undefined (reading \'update\')\n    at <anonymous>:2:36\nYou said:\ncheck sdk source on githbub\n\nChatGPT can make mistakes. Check important info.\nAsk ChatGPT'


1. Add a top-level boolean field for public access

Example field: is_public (type: bool)

For public read records, set is_public = true.

2. Update your viewRule to check it first, then fallback to normal ACL:
is_public = true ||
@request.auth.name = _owner ||
@request.auth.roles ?~ _allowed_roles ||
@request.auth.roles ?~ _allowed_roles_read ||
@request.auth.name ~ _allowed_users ||
@request.auth.name ~ _allowed_users_read


is_public = true is top-level, so PocketBase can resolve it.

This achieves the same effect as "All" without trying to iterate over a nested array.

3. Write/update/delete rules

Keep normal ACL only (do not allow is_public to bypass write/delete).

@request.auth.name = _owner ||
@request.auth.roles ?~ _allowed_roles ||
@request.auth.name ~ _allowed_users


Only the owner, roles, or allowed users can modify.


Based on my exploration of the PocketBase codebase, here's how rules with || (OR) operators are resolved:
Order of Rule Evaluation
1. Parsing Order: Left-to-Right Sequential
Rules are parsed sequentially from left to right as they appear:
@request.auth.name = data.owner
|| @request.auth.roles ?~ data._allowed_roles
|| @request.auth.roles ?~ data._allowed_roles_read
|| @request.auth.name ~ data._allowed_users
|| @request.auth.name ~ data._allowed_users_read
This happens in filter.go:107-153:
func buildParsedFilterExpr(data []fexpr.ExprGroup, ...) {
    for _, group := range data {
        // Process each condition in order
        if group.Join == fexpr.JoinOr {
            op = "OR"
        }
        result.parts = append(result.parts, expr)
    }
}
2. SQL Generation: All Conditions Combined
All conditions are converted to a single SQL expression:
(auth_name = owner OR auth_roles LIKE '%allowed_roles%' OR auth_roles LIKE '%allowed_roles_read%' OR ...)
3. Execution: Database Short-Circuit Evaluation
At runtime, the database engine evaluates the SQL using short-circuit logic:
If the first condition is TRUE → Rest are skipped (rule passes)
If the first condition is FALSE → Check second condition
Process continues until ONE condition is TRUE or all fail
Key Points
✅ Order matters for performance: Place the most likely-to-match or cheapest conditions first ✅ All @request.auth.* fields are resolved from static data (no DB query) except relations like roles which may require JOINs - see record_field_resolver_runner.go:200-249 ✅ Plain auth fields (id, email, verified, collectionId, collectionName) are fastest - from record_field_resolver_runner.go:26-33 ✅ Relation fields like @request.auth.roles require JOIN operations - slower
Optimization Tip
For your specific rule, consider ordering like this for best performance:
@request.auth.name = data.owner          // Fast: plain field, exact match
|| @request.auth.name ~ data._allowed_users    // Medium: plain field, LIKE
|| @request.auth.name ~ data._allowed_users_read
|| @request.auth.roles ?~ data._allowed_roles  // Slower: relation field
|| @request.auth.roles ?~ data._allowed_roles_read
how to setup public records the fastest
I'll search for how public records are configured in PocketBase and what's the most performant approach.
Grep "accessRule.*=.*"""
⎿
2 lines of output
Grep "Empty rule"
⎿
2 lines of output
Read c:\python\pocketbase-source-github\pocketbase\core\record_query.go (lines 590-639)
Grep "ListRule.*string" (glob: *.go)
⎿
4 lines of output
Read c:\python\pocketbase-source-github\pocketbase\core\collection_model.go (lines 2-101)
Read c:\python\pocketbase-source-github\pocketbase\core\collection_model.go (lines 341-390)
Fastest Way to Setup Public Records in PocketBase
Based on the code in record_query.go:589-629, here's how rule evaluation works:
// Line 596-597: nil = Only superusers can access
if accessRule == nil {
    return false, nil
}

// Line 600-602: Empty string = Public (FASTEST!)
if *accessRule == "" {
    return true, nil  // ← Immediate return, no parsing/queries
}

// Line 605+: Any other rule = Parse, resolve, and execute query (SLOWER)
Answer: Set Rules to Empty String ""
In the Admin UI:
Go to your collection settings
Set the following rules to empty (not null):
List rule: "" (empty)
View rule: "" (empty)
Create rule: "" (empty) if you want anyone to create
Update rule: "" (empty) if you want anyone to update
Delete rule: "" (empty) if you want anyone to delete
Via API/Code:
// Collection struct from collection_model.go:357-361
{
  "listRule": "",      // ← Empty string = public
  "viewRule": "",      // ← Empty string = public
  "createRule": "",    // etc.
  "updateRule": null,  // ← null = only superusers
  "deleteRule": null
}
Why Empty String is Fastest
Rule Value	Performance	Access
"" (empty)	INSTANT ✅	Everyone (public)
null	INSTANT ❌	Only superusers
"@request.auth.id != ''"	SLOW	Parses + resolves + SQL query
Any expression	SLOWEST	Full rule engine processing
Performance Comparison
Empty string rule (""): 
└─ Check if empty → Return true (3 operations)

Simple rule ("@request.auth.id != ''"):
└─ Parse expression
   └─ Resolve @request.auth.id field
      └─ Build SQL query
         └─ Execute database query
            └─ Return result (100+ operations)
Common Patterns
Fully public collection (read-only):
{
  "listRule": "",
  "viewRule": "",
  "createRule": null,
  "updateRule": null,
  "deleteRule": null
}
Fully public (anyone can do anything):
{
  "listRule": "",
  "viewRule": "",
  "createRule": "",
  "updateRule": "",
  "deleteRule": ""
}
Public read, authenticated write:
{
  "listRule": "",
  "viewRule": "",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.id != ''",
  "deleteRule": "@request.auth.id != ''"
}
Key Takeaway
✅ Use "" (empty string) for public access - it's the absolute fastest because it skips all rule processing
❌ Never use complex rules when "" works - even simple expressions are orders of magnitude slower
i need to have universal rules set for public and not public in ONE collection for listRule. can this make it is_public = true ||
@request.auth.name = _owner ||
Yes! This is a perfect pattern for mixed public/private records. Here's how to optimize it:
Recommended Rule
is_public = true || @request.auth.name = owner
Performance Order Analysis
Based on the resolution order I found earlier, this is already optimized:
✅ is_public = true checks first (direct field lookup - FAST)
✅ @request.auth.name = owner checks only if first fails (plain auth field - MEDIUM)
Why This Order is Optimal
Public record (is_public = true):
└─ Check is_public → TRUE → Skip auth check (1 comparison)

Private record owned by user:
└─ Check is_public → FALSE
   └─ Check @request.auth.name = owner → TRUE (2 comparisons)

Private record NOT owned by user:
└─ Check is_public → FALSE
   └─ Check @request.auth.name = owner → FALSE (2 comparisons, denied)

Anonymous user viewing public record:
└─ Check is_public → TRUE → Skip auth check (works perfectly!)
Field Naming Note
Remove the underscore prefix from _owner:
✅ owner (recommended - standard PocketBase convention)
❌ _owner (works but underscores are typically for internal fields)
Complete Example
// Collection fields
{
  "name": "posts",
  "fields": [
    {
      "name": "title",
      "type": "text"
    },
    {
      "name": "is_public",
      "type": "bool",
      "default": false  // Private by default
    },
    {
      "name": "owner",
      "type": "text"  // or "relation" to users collection
    }
  ],
  
  // Rules
  "listRule": "is_public = true || @request.auth.name = owner",
  "viewRule": "is_public = true || @request.auth.name = owner",
  "createRule": "@request.auth.id != ''",
  "updateRule": "@request.auth.name = owner",
  "deleteRule": "@request.auth.name = owner"
}
Even Better: Use Relations
If owner is a relation to your auth collection:
// Better approach with relation field
{
  "name": "owner",
  "type": "relation",
  "options": {
    "collectionId": "your_users_collection_id",
    "cascadeDelete": false,
    "maxSelect": 1
  }
}

// Rule becomes:
"listRule": "is_public = true || owner.id = @request.auth.id"
Performance comparison:
Text field: @request.auth.name = owner
├─ Resolve @request.auth.name (static, fast)
└─ Compare with owner field (fast)

Relation field: owner.id = @request.auth.id  
├─ Resolve owner.id (may require JOIN, slower)
└─ Resolve @request.auth.id (static, fast)
Recommended Final Rule
Fastest (text field):
"listRule": "is_public = true || @request.auth.name = owner"
Most robust (relation field):
"listRule": "is_public = true || owner = @request.auth.id"
Both work perfectly! The text field version is slightly faster, but the relation version provides better data integrity and allows you to fetch owner details easily