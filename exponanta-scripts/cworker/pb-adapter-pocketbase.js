// ============================================================
// v44.4 pb-adapter-pocketbase.js
// Pure DB connector. No business logic.
// All functions: function(run_doc) — mutate only, no return.
// Reads from run_doc.target.data[0] — never from run_doc.input
// ============================================================

(() => {   //isolate scope

// after — delete the const, read from config
// const PB_TOP = CW._config.topLevelFields; //not used



function _getFieldPath(fieldName) {
  if (PB_TOP.has(fieldName)) return fieldName;
  return `data.${fieldName}`;
}

function _buildWhereClause(where) {
  if (!where || typeof where !== "object") return "";
  const parts = [];

  for (const [key, value] of Object.entries(where)) {
    if (key === "OR") {
      const p = value.map(_buildWhereClause).filter(Boolean);
      if (p.length) parts.push(`(${p.join(" || ")})`);
      continue;
    }
    if (key === "AND") {
      const p = value.map(_buildWhereClause).filter(Boolean);
      if (p.length) parts.push(`(${p.join(" && ")})`);
      continue;
    }
    if (key === "NOT") {
      const p = _buildWhereClause(value);
      if (p) parts.push(`!(${p})`);
      continue;
    }

    const field = _getFieldPath(key);

    if (value === null || value === undefined) {
      parts.push(`${field} = null`);
    } else if (typeof value === "string") {
      parts.push(`${field} = "${value}"`);
    } else if (typeof value === "number" || typeof value === "boolean") {
      parts.push(`${field} = ${value}`);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case "equals":   parts.push(`${field} = "${opValue}"`);  break;
          case "contains": parts.push(`${field} ~ "${opValue}"`);  break;
          case "gt":       parts.push(`${field} > ${opValue}`);    break;
          case "gte":      parts.push(`${field} >= ${opValue}`);   break;
          case "lt":       parts.push(`${field} < ${opValue}`);    break;
          case "lte":      parts.push(`${field} <= ${opValue}`);   break;
          case "not":      parts.push(`${field} != "${opValue}"`); break;
          case "in":
            if (Array.isArray(opValue) && opValue.length)
              parts.push(`(${opValue.map((v) => `${field} = "${v}"`).join(" || ")})`);
            break;
        }
      }
    }
  }
  return parts.join(" && ");
}

function _buildFilter(run_doc) {
  const doctype = run_doc.target_doctype ?? run_doc.source_doctype;
  const parts = [];
  if (doctype) parts.push(`doctype = "${doctype}"`);

  const where = run_doc.query?.where;
  if (where) {
    const clause = _buildWhereClause(where);
    if (clause) parts.push(`(${clause})`);
  }

  const rawFilter = run_doc.query?.filter;
  if (rawFilter) parts.push(`(${rawFilter})`);

  return parts.join(" && ") || undefined;
}

function _buildSort(run_doc) {
  const sort = run_doc.query?.sort;
  if (!sort) return undefined;
  if (typeof sort === "string") return sort;
  return Object.entries(sort)
    .map(([f, dir]) => `${dir === "desc" ? "-" : "+"}${_getFieldPath(f)}`)
    .join(",");
}

// ============================================================
// INIT
// ============================================================

async function init(run_doc) {
  if (globalThis.pb) return;
  const { pb_url } = globalThis.CW._config;
  globalThis.pb = new PocketBase(pb_url);
  globalThis.pb.autoCancellation(false);
  //console.log("✅ PocketBase initialized:", pb_url);
}

// ============================================================
// SELECT — unchanged
// ============================================================

async function select(run_doc) {
  const { collection } = globalThis.CW._config;
  const doctype = run_doc.target_doctype ?? run_doc.source_doctype;
  if (!doctype) {
    run_doc.error = "400 select: missing doctype";
    return;
  }

  let items, meta;

  const where     = run_doc.query?.where || {};
  const whereKeys = Object.keys(where);
  const singleName =
    whereKeys.length === 1 &&
    whereKeys[0] === "name" &&
    typeof where.name === "string" &&
    !run_doc.query?.filter
      ? where.name
      : null;

  if (singleName && !run_doc.query?.perPage) {
    const filter = `doctype = "${doctype}" && (name = "${singleName}")`;
    items = await globalThis.pb.collection(collection).getFullList({ filter });
    meta  = { total: items.length, page: 1, pageSize: items.length, totalPages: 1, hasMore: false };
  } else {
    const params = {};
    const filter = _buildFilter(run_doc);
    if (filter)                    params.filter    = filter;
    const sort = _buildSort(run_doc);
    if (sort)                      params.sort      = sort;
    if (run_doc.query?.fields)     params.fields    = run_doc.query.fields;
    if (run_doc.query?.expand)     params.expand    = run_doc.query.expand;
    if (run_doc.query?.skipTotal !== undefined)
                                   params.skipTotal = run_doc.query.skipTotal;
    else                           params.skipTotal = true;

    const perPage = run_doc.query?.perPage;
    const page    = run_doc.query?.page || 1;

    if (perPage !== undefined) {
      const result = await globalThis.pb.collection(collection).getList(page, perPage, params);
      items = result.items;
      meta  = {
        total:      result.totalItems,
        page:       result.page,
        pageSize:   result.perPage,
        totalPages: result.totalPages,
        hasMore:    result.page < result.totalPages,
      };
    } else {
      if (run_doc.query?.batch) params.batch = run_doc.query.batch;
      items = await globalThis.pb.collection(collection).getFullList(params);
      meta  = { total: items.length, page: 1, pageSize: items.length, totalPages: 1, hasMore: false };
    }
  }

  run_doc.target  = { data: items.map(_mergeRecord).filter(Boolean), meta };
  run_doc.success = true;
}

// ============================================================
// CREATE — reads from target.data[0] (not input)
// ============================================================



// ============================================================
// UPDATE — reads from target.data[0], no fetch, no merge
// ============================================================

async function update(run_doc) {
  const { collection } = globalThis.CW._config;
  const doc = run_doc.target?.data?.[0];
  if (!doc?.id && !doc?.name) {
    run_doc.error = '400 update: no target document';
    return;
  }

  const id = doc.id || doc.name

  // snapshot before _splitRecord consumes files+/files-
  const filesBefore = Array.isArray(doc.files) ? [...doc.files] : []
  const hasFileOp   = Object.keys(doc).some(k => /^[\w]+[+-]$/.test(k))

  const { top, data } = _splitRecord(doc)

  try {
    const pbResult  = await globalThis.pb.collection(collection).update(id, { ...top, data })
    run_doc.target  = { data: [_mergeRecord(pbResult)], meta: { updated: 1 } }
    run_doc.success = true

    // log file changes after PB responds — filenames now known
    if (hasFileOp && CW._config.systemSettings?.logChanges && run_doc.options?._logging !== false) {
      const filesAfter = pbResult.files || []
      if (JSON.stringify(filesBefore) !== JSON.stringify(filesAfter)) {
        await CW._logChanges(run_doc, [{
          field: 'files',
          from:  filesBefore,
          to:    filesAfter,
        }])
      }
    }

  } catch (err) {
 if (err.status === 404 || !err.status) {
 
  await Adapters.pocketbase.create(run_doc);
} else {

       console.error('PB update error:', JSON.stringify(err.response?.data || err.message))
      run_doc.error = err.message
    }
  }
}  
// ============================================================
// DELETE (soft — docstatus = 2)
// ============================================================

async function del(run_doc) {
  if (run_doc.target?.data?.[0]) run_doc.target.data[0].docstatus = 2;
   await Adapters.pocketbase.update(run_doc); 
}

// ============================================================
// SELF-REGISTER
// ============================================================

globalThis.Adapters            = globalThis.Adapters || {};
globalThis.Adapters.pocketbase = { init, select, create, update, delete: del };

//console.log("✅ pb-adapter-pocketbase.js loaded");

// ============================================================
// AUTH METHODS
// Pure PocketBase SDK mirrors. No business logic.
// Reads from run_doc.target.data[0] — never from run_doc.input
// ============================================================
function _setUser(run_doc) {
  run_doc.user = {
    name:     globalThis.pb.authStore.record?.id       ?? null,
    email:    globalThis.pb.authStore.record?.email    ?? null,
    token:    globalThis.pb.authStore.token            ?? '',
    verified: globalThis.pb.authStore.record?.verified ?? false,
  };
  run_doc.success = true;
}

async function fetchItemProfile(userId) {
  try {
    const r = await CW.run({
      operation:      'select',
      target_doctype: 'User',
      query:          { where: { name: userId } },
      view:           'form',
      options:        { render: false },
    })
    return r.target?.data?.[0] || {}
  } catch (e) {
    console.warn('Could not fetch item profile:', e)
    return {}
  }
}

async function authWithPassword(run_doc) {
  const { email, password } = run_doc.target?.data?.[0] || {};
  try {
    await globalThis.pb.collection('users').authWithPassword(email, password);
    _setUser(run_doc);
  } catch (err) { run_doc.error = err.message; }
}

async function authRefresh(run_doc) {
  try {
    await globalThis.pb.collection('users').authRefresh();
    _setUser(run_doc);
  } catch (err) { run_doc.error = err.message; }
}

async function authWithOTP(run_doc) {
  const { otpId, password } = run_doc.target?.data?.[0] || {};
  try {
    await globalThis.pb.collection('users').authWithOTP(otpId, password);
    _setUser(run_doc);
  } catch (err) { run_doc.error = err.message; }
}

async function requestOTP(run_doc) {
  const { email } = run_doc.target?.data?.[0] || {};
  try {
    const result = await globalThis.pb.collection('users').requestOTP(email);
    run_doc.target  = { data: [result], meta: {} };
    run_doc.success = true;
  } catch (err) { run_doc.error = err.message; }
}

async function authClear(run_doc) {
  globalThis.pb.authStore.clear();
  run_doc.user    = { name: null, email: null, token: '', verified: false };
  run_doc.success = true;
}

async function requestPasswordReset(run_doc) {
  const { email } = run_doc.target?.data?.[0] || {};
  try {
    await globalThis.pb.collection('users').requestPasswordReset(email);
    run_doc.success = true;
  } catch (err) { run_doc.error = err.message; }
}

async function confirmPasswordReset(run_doc) {
  const { token, password, passwordConfirm } = run_doc.target?.data?.[0] || {};
  try {
    await globalThis.pb.collection('users').confirmPasswordReset(token, password, passwordConfirm);
    run_doc.success = true;
  } catch (err) { run_doc.error = err.message; }
}

async function requestVerification(run_doc) {
  const { email } = run_doc.target?.data?.[0] || {};
  try {
    await globalThis.pb.collection('users').requestVerification(email);
    run_doc.success = true;
  } catch (err) { run_doc.error = err.message; }
}

async function confirmVerification(run_doc) {
  const { token } = run_doc.target?.data?.[0] || {};
  try {
    await globalThis.pb.collection('users').confirmVerification(token);
    run_doc.success = true;
  } catch (err) { run_doc.error = err.message; }
}

async function requestEmailChange(run_doc) {
  const { email } = run_doc.target?.data?.[0] || {};
  try {
    await globalThis.pb.collection('users').requestEmailChange(email);
    run_doc.success = true;
  } catch (err) { run_doc.error = err.message; }
}

async function confirmEmailChange(run_doc) {
  const { token, password } = run_doc.target?.data?.[0] || {};
  try {
    await globalThis.pb.collection('users').confirmEmailChange(token, password);
    run_doc.success = true;
  } catch (err) { run_doc.error = err.message; }
}

async function provisionUser(run_doc_or_email, password, name) {
  let email, pw, nm
  if (typeof run_doc_or_email === 'object') {
    ;({ email, password: pw, name: nm } = run_doc_or_email.target?.data?.[0] || {})
  } else {
    email = run_doc_or_email; pw = password; nm = name
  }

  const userId = generateId('User', email)
  const usesId = generateId('UserSettings', email)

  await globalThis.pb.collection('users').create({
    id: userId, email, password: pw, passwordConfirm: pw,
    name: nm, emailVisibility: true,
  })
  await globalThis.pb.collection('users').authWithPassword(email, pw)
  await globalThis.pb.collection('item').create({
    id: userId, name: userId, doctype: 'User', docstatus: 0,
    owner: '', _allowed: [CW._config.roles.systemManager], _allowed_read: [],
    data: { id: userId, email, name: nm, doctype: 'User', docstatus: 0 },
  })
  await globalThis.pb.collection('item').create({
    id: usesId, name: usesId, doctype: 'UserSettings', docstatus: 0,
    owner: userId, _allowed: [userId], _allowed_read: [],
    data: { user: userId, email },
  })
  if (!email.includes('.invalid'))
    await globalThis.pb.collection('users').requestVerification(email)

  if (run_doc_or_email?.target) {
    _setUser(run_doc_or_email)
  }
}

async function authLogin(run_doc) {
  const { email, password } = run_doc.target?.data?.[0] || {}
  try {
    await globalThis.pb.collection('users').authWithPassword(email, password)
    const itemData = await fetchItemProfile(globalThis.pb.authStore.record.id)
    const profile  = buildProfile(globalThis.pb.authStore.record, itemData)
    saveProfile(profile)
    _dispatchAuthChange(profile)
    _setUser(run_doc)
  } catch (err) { run_doc.error = err.message }
}

async function authLogout(run_doc) {
  const userId = globalThis.pb.authStore.model?.id
  globalThis.pb.authStore.clear()
  clearProfile(userId)
  _dispatchAuthChange(null)
  run_doc.success = true
}

async function authRestore(run_doc) {
  if (!globalThis.pb.authStore.isValid) {
    globalThis.pb.authStore.clear()
    _dispatchAuthChange(null)
    run_doc.success = true
    return
  }
  const userId  = globalThis.pb.authStore.model?.id
  const profile = loadProfile(userId)
  if (profile) {
    _dispatchAuthChange(profile)
  } else {
    const freshProfile = buildProfile(globalThis.pb.authStore.model, await fetchItemProfile(userId))
    saveProfile(freshProfile)
    _dispatchAuthChange(freshProfile)
  }
  _setUser(run_doc)
}

//---

async function authRegister(email, password, name) {
  await provisionUser(email, password, name)
  const model    = pb.authStore.model
  const itemData = await fetchItemProfile(model.id)
  const profile  = buildProfile(model, itemData)
  saveProfile(profile)
  _dispatchAuthChange(profile)
  return profile
}

Object.assign(globalThis.Adapters.pocketbase, {
  authWithPassword,
  authRefresh,
  authWithOTP,
  requestOTP,
  authClear,
  requestPasswordReset,
  confirmPasswordReset,
  requestVerification,
  confirmVerification,
  requestEmailChange,
  confirmEmailChange,
  provisionUser,
  authLogin,
  authLogout,
  authRestore,
  authRegister
});

globalThis.provisionUser = provisionUser

// eager init — so pb is available before CW.run is called
const { pb_url } = globalThis.CW._config
globalThis.pb = globalThis.pb || new PocketBase(pb_url)
globalThis.pb.autoCancellation(false)

console.log('✅ pb-adapter-pocketbase.js loaded');

})();
