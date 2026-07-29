// ============================================================
// v 44.4 app-ui.js — Exponanta app shell UI
// NavBar + Toasts — React
// No Alpine dependency
// Listens to: cw:auth:change
// ============================================================

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

// ============================================================
// AUTH STATE EVENT
// ============================================================

function _dispatchAuthChange(profile) {
  globalThis.currentUser = profile || null

  if (globalThis.CW?._config) {
    globalThis.CW._config.currentUser = profile || null;
  }

  globalThis.dispatchEvent(new CustomEvent('cw:auth:change', { detail: profile }));

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

Object.assign(globalThis, {
  saveProfile,
  loadProfile,
  clearProfile,
  _dispatchAuthChange,
  authStoreDefaults,
});

// ============================================================
// TOAST SYSTEM
// ============================================================

let _toastRoot = null;
let _toasts    = [];
let _toastId   = 0;

function _renderToasts() {
  if (!_toastRoot) {
    const el = document.getElementById('toast_container');
    if (!el) return;
    _toastRoot = ReactDOM.createRoot(el);
  }
  _toastRoot.render(ce(ToastContainer, { toasts: [..._toasts] }));
}

const ToastContainer = function({ toasts }) {
  if (!toasts.length) return null;
  return ce('div', {
    style: {
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }
  },
    toasts.map(t => ce(Toast, { key: t.id, toast: t }))
  );
};

const Toast = function({ toast }) {
  const cls = {
    success: 'bg-success',
    error:   'bg-danger',
    warning: 'bg-warning',
    info:    'bg-info',
  }[toast.type] || 'bg-secondary';

  return ce('div', {
    className: `toast show align-items-center text-white border-0 ${cls}`,
    role: 'alert',
    style: { minWidth: '260px' },
  },
    ce('div', { className: 'd-flex' },
      ce('div', { className: 'toast-body' }, toast.message),
      ce('button', {
        type: 'button',
        className: 'btn-close btn-close-white me-2 m-auto',
        onClick: () => _removeToast(toast.id),
      })
    )
  );
};

function _removeToast(id) {
  _toasts = _toasts.filter(t => t.id !== id);
  _renderToasts();
}

function cwToast(message, type = 'success', duration = 3000) {
  const id = ++_toastId;
  _toasts.push({ id, message, type });
  _renderToasts();
  if (duration > 0) setTimeout(() => { _removeToast(id); }, duration);
}

// ============================================================
// PAIRED OPEN
// ============================================================

async function _openPaired(doctype, query) {
  const p = new URLSearchParams()
  p.set('doctype', doctype)
  if (query?.where?.owner) p.set('owner', query.where.owner)
  history.pushState({}, '', '?' + p.toString())
  globalThis.cwStateFromUrl()
}

// ============================================================
// NAV ACTIONS
// ============================================================

function _openProfile() {
  _openPaired('UserPublicProfile', { where: { owner: globalThis.currentUser?.id } });
}

function _openDashboard() {
  _openPaired('Task');
}

// ============================================================
// NAVBAR
// ============================================================

let _navRoot = null;

const NavBar = function({ profile }) {
  const isValid = !!profile;

  return ce('div', { className: 'navbar navbar-expand-md navbar-light d-print-none border-bottom' },
    ce('div', { className: 'container-xl' },

      ce('div', { className: 'd-flex align-items-center gap-1 me-3' },
        ce('button', {
          id: 'back_btn',
          className: 'btn btn-sm btn-outline-secondary',
          onClick: () => globalThis.navigate?.('back'),
        }, '←'),
        ce('button', {
          id: 'forward_btn',
          className: 'btn btn-sm btn-outline-secondary',
          onClick: () => globalThis.navigate?.('forward'),
        }, '→'),
      ),

      ce('nav', { 'aria-label': 'breadcrumb' },
        ce('ol', { className: 'breadcrumb mb-0', id: 'breadcrumbs' },
          ce('li', { className: 'breadcrumb-item active' }, 'Home')
        )
      ),

      ce('div', { className: 'ms-auto d-flex align-items-center gap-2' },

        ce('div', { className: 'd-none d-md-block', style: { width: '200px' } },
          ce(globalThis.SearchBar || 'span', {})
        ),

        !isValid && ce('a', {
          href: '/login.html',
          className: 'btn btn-sm btn-primary',
        }, 'Sign in'),

        isValid && ce('div', { className: 'd-flex align-items-center gap-2' },

          !profile.verified && ce('a', {
            href: '/auth/verify-reminder.html',
            className: 'nav-link px-1 text-warning',
            title: 'Please verify your email',
          }, ce('i', { className: 'ti ti-mail-exclamation' })),

          ce('div', { className: 'dropdown' },
            ce('a', {
              href: '#',
              className: 'd-flex align-items-center text-decoration-none dropdown-toggle gap-2',
              'data-bs-toggle': 'dropdown',
              'aria-expanded': 'false',
            },
              profile.avatar
                ? ce('span', {
                    className: 'avatar avatar-sm rounded-circle',
                    style: { backgroundImage: `url(${profile.avatar})` },
                  })
                : ce('span', {
                    className: 'avatar avatar-sm rounded-circle d-flex align-items-center justify-content-center text-white fw-bold',
                    style: { backgroundColor: profile.avatarColor, fontSize: '0.75rem' },
                  }, profile.initials),
              ce('span', { className: 'd-none d-md-inline small' }, profile.name)
            ),

            ce('div', { className: 'dropdown-menu dropdown-menu-end shadow-sm', style: { minWidth: '220px' } },

              ce('div', { className: 'dropdown-header' },
                ce('div', { className: 'fw-semibold' }, profile.name),
                ce('div', { className: 'text-muted small' }, profile.email),
                !profile.verified && ce('div', { className: 'mt-1' },
                  ce('span', { className: 'badge bg-warning-lt text-warning' },
                    ce('i', { className: 'ti ti-mail me-1' }),
                    'Email not verified'
                  )
                )
              ),

              ce('div', { className: 'dropdown-divider' }),

              ce('a', { className: 'dropdown-item', href: '#',
                onClick: (e) => { e.preventDefault(); _openProfile(); }
              },
                ce('i', { className: 'ti ti-user me-2' }), 'Profile'
              ),
              ce('a', { className: 'dropdown-item', href: '#',
                onClick: (e) => { e.preventDefault(); _openDashboard(); }
              },
                ce('i', { className: 'ti ti-layout-dashboard me-2' }), 'Dashboard'
              ),

              !profile.verified && ce('div', null,
                ce('div', { className: 'dropdown-divider' }),
                ce('a', { className: 'dropdown-item text-warning', href: '#',
                  onClick: async (e) => {
                    e.preventDefault();
                    const r = await CW.run({ operation: 'requestVerification', target_doctype: 'User', input: { email: profile.email } })
                    r.success
                      ? cwToast('Verification email sent!', 'success')
                      : cwToast('Failed to send verification email', 'error')
                  }
                },
                  ce('i', { className: 'ti ti-mail-forward me-2' }), 'Resend verification'
                )
              ),

              ce('div', { className: 'dropdown-divider' }),

              ce('a', { className: 'dropdown-item text-danger', href: '#',
                onClick: (e) => {
                  e.preventDefault();
                  globalThis.authLogout?.();
                  window.location.href = '/login.html';
                }
              },
                ce('i', { className: 'ti ti-logout me-2' }), 'Sign out'
              )
            )
          )
        )
      )
    )
  );
};

// ── Render navbar ────────────────────────────────────────────

function _renderNav(profile) {
  if (!_navRoot) {
    const el = document.getElementById('nav_container');
    if (!el) return;
    _navRoot = ReactDOM.createRoot(el);
  }
  _navRoot.render(ce(NavBar, { profile }));
  if (globalThis._updateNavUI) globalThis._updateNavUI();
}

// ── Listen for auth changes ──────────────────────────────────

globalThis.addEventListener('cw:auth:change', (e) => {
  _renderNav(e.detail);
});


//---

function authGuard(requireVerified = false) {
  if (!globalThis.currentUser) { window.location.href = '/login.html'; return false }
  if (requireVerified && !globalThis.currentUser.verified) { window.location.href = '/auth/unverified.html'; return false }
  return true
}


// ── Expose on CW + globalThis ────────────────────────────────

if (globalThis.CW) {
  globalThis.CW.toast      = cwToast;
  globalThis.CW._renderNav = _renderNav;
}

globalThis.cwToast     = cwToast;
globalThis._openPaired = _openPaired;


Object.assign(globalThis, { authGuard })

// ── Initial render ───────────────────────────────────────────

(function() {
  const profile = globalThis.currentUser || null
  _renderNav(profile)
})();

console.log('✅ app-ui.js loaded');
