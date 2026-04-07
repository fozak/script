// ============================================================
// auth.js — Exponanta auth module
// Depends on: pocketbase.umd.js, CW-utils.js
// Load order: pb SDK → CW-utils → auth.js
// No Alpine dependency — fires cw:auth:change event instead
// ============================================================

const SYSTEM_MANAGER_ROLE_ID = 'rolesystemmanag';

// ============================================================
// AVATAR HELPERS
// ============================================================

function getInitials(name) {
  if (!name?.trim()) return '?';
  return name.trim().split(/\s+/)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

function getAvatarColor(userId) {
  if (!userId) return '#3b5bdb';
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#e03131', '#c2255c', '#9c36b5', '#6741d9',
    '#3b5bdb', '#1971c2', '#0c8599', '#2f9e44',
    '#e8590c', '#f08c00'
  ];
  return colors[Math.abs(hash) % colors.length];
}

// ============================================================
// PROFILE CACHE (localStorage keyed by user ID)
// ============================================================

function saveProfile(profile) {
  if (!profile?.id) return;
  localStorage.setItem(profile.id, JSON.stringify(profile));
}

function loadProfile(userId) {
  if (!userId) return null;
  try { return JSON.parse(localStorage.getItem(userId) || 'null'); }
  catch { return null; }
}

function clearProfile(userId) {
  if (userId) localStorage.removeItem(userId);
}

function buildProfile(authModel, itemData = {}) {
  const id     = authModel.id;
  const name   = itemData.name || authModel.name || authModel.email || '';
  const avatar = itemData.avatar || null;
  return {
    id,
    name,
    email:       authModel.email,
    avatar,
    initials:    getInitials(name),
    avatarColor: getAvatarColor(id),
    verified:    authModel.verified || false,
  };
}

// ============================================================
// AUTH STATE EVENT
// Replaces syncAlpineAuth — fire event, let consumers handle it
// app-ui.js listens for this and re-renders navbar
// Alpine pages can also listen if needed
// ============================================================

function _dispatchAuthChange(profile) {
  globalThis.dispatchEvent(new CustomEvent('cw:auth:change', { detail: profile }));

  // backwards compat — sync Alpine store if Alpine is present
  if (typeof Alpine !== 'undefined') {
    const store = Alpine.store('auth');
    if (!store) return;
    if (profile) {
      store.isValid     = true;
      store.verified    = profile.verified;
      store.id          = profile.id;
      store.name        = profile.name;
      store.email       = profile.email;
      store.avatar      = profile.avatar;
      store.initials    = profile.initials;
      store.avatarColor = profile.avatarColor;
    } else {
      store.isValid     = false;
      store.verified    = false;
      store.id          = null;
      store.name        = '';
      store.email       = '';
      store.avatar      = null;
      store.initials    = '';
      store.avatarColor = '#3b5bdb';
    }
  }
}

// ============================================================
// FETCH ITEM PROFILE
// ============================================================

async function fetchItemProfile(userId) {
  try {
    const record = await pb.collection('item').getOne(userId);
    return record?.data || {};
  } catch (e) {
    console.warn('Could not fetch item profile:', e);
    return {};
  }
}

// ============================================================
// PROVISION USER
// Creates: @users auth record + User item + UserPublicProfile item
// Must be called before login (creates auth record first)
// ============================================================

async function provisionUser(email, password, name) {
  const userId    = generateId('User', email);
  const profileId = generateId('UserPublicProfile', userId);

  // Step 1: Create auth user
  await pb.collection('users').create({
    id:              userId,
    email,
    password,
    passwordConfirm: password,
    name,
    emailVisibility: true,
  });

  // Step 2: Login (required — item createRule needs @request.auth.id != "")
  await pb.collection('users').authWithPassword(email, password);

  // Step 3: Create User item record without self-references
  // (PocketBase relation validation requires referenced records to exist first)
  await pb.collection('item').create({
    id:            userId,
    name:          userId,
    doctype:       'User',
    docstatus:     0,
    owner:         '',
    _allowed:      [SYSTEM_MANAGER_ROLE_ID],
    _allowed_read: [],
    data:          { id: userId, email, name, doctype: 'User', docstatus: 0 },
  });

  // Step 3b: add self-reference now that record exists
  // owner stays "" — User doctype never has personal ownership
  // _allowed_read: [userId] — user can read their own record only
  /*  NOT NEEDED 

  await pb.collection('item').update(userId, {
    _allowed_read: [userId],
  });  */

  // Step 4: Create UserPublicProfile item record
  // owner = userId (user owns their public profile)
  // _allowed = [userId] (user edits own public profile)
  // _allowed_read = [roleispublixxxx] (everyone can read)
  await pb.collection('item').create({
    id:            profileId,
    name:          profileId,
    doctype:       'UserPublicProfile',
    docstatus:     0,
    owner:         userId,
    _allowed:      [userId],
    _allowed_read: ['roleispublixxxx'],
    data: {
      id:        profileId,
      doctype:   'UserPublicProfile',
      docstatus: 0,
      full_name: name,
      // other fields empty — user fills in later
    },
  });

  // Step 5: Send verification email
  await pb.collection('users').requestVerification(email);

  console.log('✅ User provisioned:', userId, '+ profile:', profileId);
  return { userId, profileId };
}

// ============================================================
// LOGIN
// ============================================================

async function authLogin(email, password) {
  const authData = await pb.collection('users').authWithPassword(email, password);
  const itemData = await fetchItemProfile(authData.record.id);
  const profile  = buildProfile(authData.record, itemData);
  saveProfile(profile);
  _dispatchAuthChange(profile);
  console.log('✅ Logged in:', profile.id);
  return profile;
}

// ============================================================
// REGISTER + AUTO LOGIN
// ============================================================

async function authRegister(email, password, name) {
  await provisionUser(email, password, name);
  // provisionUser already logged in — just build profile
  const model    = pb.authStore.model;
  const itemData = await fetchItemProfile(model.id);
  const profile  = buildProfile(model, itemData);
  saveProfile(profile);
  _dispatchAuthChange(profile);
  return profile;
}

// ============================================================
// LOGOUT
// ============================================================

function authLogout() {
  const userId = pb.authStore.model?.id;
  pb.authStore.clear();
  clearProfile(userId);
  _dispatchAuthChange(null);
  console.log('✅ Logged out');
}

// ============================================================
// REFRESH (call after email verification or periodically)
// ============================================================

async function authRefresh() {
  try {
    await pb.collection('users').authRefresh();
    const model    = pb.authStore.model;
    const cached   = loadProfile(model.id) || {};
    const profile  = buildProfile(model, cached);
    profile.verified = model.verified;
    saveProfile(profile);
    _dispatchAuthChange(profile);
    console.log('✅ Auth refreshed, verified:', profile.verified);
    return profile;
  } catch (e) {
    console.warn('Auth refresh failed:', e);
    authLogout();
    return null;
  }
}

// ============================================================
// RESTORE ON PAGE LOAD
// ============================================================

function authRestore() {
  if (!pb.authStore.isValid) {
    _dispatchAuthChange(null);
    return null;
  }
  const userId  = pb.authStore.model?.id;
  const profile = loadProfile(userId);
  if (profile) {
    _dispatchAuthChange(profile);
    console.log('✅ Auth restored from cache:', userId);
    return profile;
  }
  // cache miss — fetch fresh
  fetchItemProfile(userId).then(itemData => {
    const profile = buildProfile(pb.authStore.model, itemData);
    saveProfile(profile);
    _dispatchAuthChange(profile);
  });
  return null;
}

// ============================================================
// GUARD — call on protected pages
// ============================================================

function authGuard(requireVerified = false) {
  if (!pb.authStore.isValid) {
    window.location.href = '/login.html';
    return false;
  }
  if (requireVerified) {
    const profile = loadProfile(pb.authStore.model?.id);
    if (!profile?.verified) {
      window.location.href = '/auth/unverified.html';
      return false;
    }
  }
  return true;
}

// ============================================================
// ALPINE STORE DEFAULTS
// Still exported for backwards compat with Alpine pages
// ============================================================

function authStoreDefaults() {
  return {
    isValid:     false,
    verified:    false,
    id:          null,
    name:        '',
    email:       '',
    avatar:      null,
    initials:    '',
    avatarColor: '#3b5bdb',
  };
}

// ============================================================
// EXPORT TO GLOBAL
// ============================================================

Object.assign(globalThis, {
  provisionUser,
  authLogin,
  authRegister,
  authLogout,
  authRefresh,
  authRestore,
  authGuard,
  authStoreDefaults,
  getInitials,
  getAvatarColor,
  buildProfile,
  saveProfile,
  loadProfile,
  clearProfile,
  SYSTEM_MANAGER_ROLE_ID,
});

console.log('✅ auth.js loaded');
