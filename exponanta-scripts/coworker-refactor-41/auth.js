// ============================================================
// auth.js — version 40
// Exponanta auth module
// Depends on: pocketbase.umd.js, adapter-pocketbase.js, CW-utils.js
// Load order: pb SDK → adapter → CW-utils → auth.js → Alpine
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
  try {
    return JSON.parse(localStorage.getItem(userId) || 'null');
  } catch {
    return null;
  }
}

function clearProfile(userId) {
  if (userId) localStorage.removeItem(userId);
}

function buildProfile(authModel, itemData = {}) {
  const id = authModel.id;
  const name = itemData.name || authModel.name || authModel.email || '';
  const avatar = itemData.avatar || null;
  return {
    id,
    name,
    email: authModel.email,
    avatar,
    initials: getInitials(name),
    avatarColor: getAvatarColor(id),
    verified: authModel.verified || false
  };
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
// ALPINE STORE SYNC
// ============================================================

function syncAlpineAuth(profile) {
  if (typeof Alpine === 'undefined') return;
  const store = Alpine.store('auth');
  if (!store) return;
  if (profile) {
    store.isValid    = true;
    store.verified   = profile.verified;
    store.id         = profile.id;
    store.name       = profile.name;
    store.email      = profile.email;
    store.avatar     = profile.avatar;
    store.initials   = profile.initials;
    store.avatarColor = profile.avatarColor;
  } else {
    store.isValid    = false;
    store.verified   = false;
    store.id         = null;
    store.name       = '';
    store.email      = '';
    store.avatar     = null;
    store.initials   = '';
    store.avatarColor = '#3b5bdb';
  }
}

// ============================================================
// PROVISION USER (registration)
// ============================================================

async function provisionUser(email, password, name) {
  const userId = generateId('User', email);

  // Step 1: Create auth user
  await pb.collection('users').create({
    id: userId,
    email,
    password,
    passwordConfirm: password,
    name,
    emailVisibility: true
  });

  // Step 2: Login
  await pb.collection('users').authWithPassword(email, password);

  // Step 3: Create item record
  await pb.collection('item').create({
    id: userId,
    name: userId,
    doctype: 'User',
    docstatus: 0,
    data: { id: userId, email, name, doctype: 'User', docstatus: 0 },
    _allowed: [SYSTEM_MANAGER_ROLE_ID],
    _allowed_read: []
  });

  // Step 4: Send verification email
  await pb.collection('users').requestVerification(email);

  return userId;
}

// ============================================================
// LOGIN
// ============================================================

async function authLogin(email, password) {
  const authData = await pb.collection('users').authWithPassword(email, password);
  const itemData = await fetchItemProfile(authData.record.id);
  const profile = buildProfile(authData.record, itemData);
  saveProfile(profile);
  syncAlpineAuth(profile);
  console.log('✅ Logged in:', profile.id);
  return profile;
}

// ============================================================
// REGISTER + AUTO LOGIN
// ============================================================

async function authRegister(email, password, name) {
  await provisionUser(email, password, name);
  const profile = await authLogin(email, password);
  return profile;
}

// ============================================================
// LOGOUT
// ============================================================

function authLogout() {
  const userId = pb.authStore.model?.id;
  pb.authStore.clear();
  clearProfile(userId);
  syncAlpineAuth(null);
  console.log('✅ Logged out');
}

// ============================================================
// REFRESH (call after email verification)
// ============================================================

async function authRefresh() {
  try {
    await pb.collection('users').authRefresh();
    const model = pb.authStore.model;
    const cached = loadProfile(model.id) || {};
    const profile = buildProfile(model, cached);
    profile.verified = model.verified; // get fresh verified status
    saveProfile(profile);
    syncAlpineAuth(profile);
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
    syncAlpineAuth(null);
    return null;
  }
  const userId = pb.authStore.model?.id;
  const profile = loadProfile(userId);
  if (profile) {
    syncAlpineAuth(profile);
    console.log('✅ Auth restored from cache:', userId);
    return profile;
  }
  // Cache miss — fetch fresh
  fetchItemProfile(userId).then(itemData => {
    const profile = buildProfile(pb.authStore.model, itemData);
    saveProfile(profile);
    syncAlpineAuth(profile);
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
// ALPINE STORE DEFINITION — call in Alpine.store() before init
// ============================================================

function authStoreDefaults() {
  return {
    isValid: false,
    verified: false,
    id: null,
    name: '',
    email: '',
    avatar: null,
    initials: '',
    avatarColor: '#3b5bdb'
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
  clearProfile
});

console.log('✅ auth.js loaded');