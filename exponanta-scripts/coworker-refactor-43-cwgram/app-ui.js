// ============================================================
// app-ui.js — Exponanta app shell UI
// NavBar + Toasts — React, reads pb.authStore directly
// No Alpine dependency
// Listens to: cw:auth:change, cw:toast
// ============================================================

const ce = React.createElement;

// ============================================================
// TOAST SYSTEM
// Usage: CW.toast('Saved', 'success')
//        CW.toast('Error saving', 'error')
//        CW.toast('Processing...', 'info')
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

// Public API — attached to CW
function cwToast(message, type = 'success', duration = 3000) {
  const id = ++_toastId;
  _toasts.push({ id, message, type });
  _renderToasts();
  if (duration > 0) setTimeout(() => { _removeToast(id); }, duration);
}

// ============================================================
// NAVBAR
// Reads pb.authStore directly — no store/state needed
// Re-renders on cw:auth:change event
// ============================================================

let _navRoot    = null;
let _navProfile = null;

const NavBar = function({ profile }) {
  const isValid = !!profile;

  return ce('div', { className: 'navbar navbar-expand-md navbar-light d-print-none border-bottom' },
    ce('div', { className: 'container-xl' },

      // ── CW navigation ──────────────────────────────────────
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

      // ── Breadcrumbs ─────────────────────────────────────────
      ce('nav', { 'aria-label': 'breadcrumb' },
        ce('ol', { className: 'breadcrumb mb-0', id: 'breadcrumbs' },
          ce('li', { className: 'breadcrumb-item active' }, 'Home')
        )
      ),

      // ── Right side ──────────────────────────────────────────
      ce('div', { className: 'ms-auto d-flex align-items-center gap-2' },

        // logged out
        !isValid && ce('a', {
          href: '/login.html',
          className: 'btn btn-sm btn-primary',
        }, 'Sign in'),

        // logged in
        isValid && ce('div', { className: 'd-flex align-items-center gap-2' },

          // unverified warning
          !profile.verified && ce('a', {
            href: '/auth/verify-reminder.html',
            className: 'nav-link px-1 text-warning',
            title: 'Please verify your email',
          }, ce('i', { className: 'ti ti-mail-exclamation' })),

          // avatar dropdown
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

              // user info header
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
                  onClick: (e) => {
                    e.preventDefault();
                    pb.collection('users').requestVerification(profile.email)
                      .then(() => cwToast('Verification email sent!', 'success'))
                      .catch(() => cwToast('Failed to send verification email', 'error'));
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

// ── Nav actions ──────────────────────────────────────────────

function _openProfile() {
  if (!globalThis.CW) return;
  const userId = pb.authStore.model?.id;
  if (!userId) return;
  CW.run({
    operation:      'select',
    target_doctype: 'UserPublicProfile',
    query:          { where: { owner: userId } },
    view:           'form',
    component:      'MainForm',
    container:      'main_container',
    options:        { render: true },
  });
}

function _openDashboard() {
  if (!globalThis.CW) return;
  CW.run({
    operation:      'select',
    target_doctype: 'Task',
    query:          { take: 20 },
    view:           'list',
    component:      'MainGrid',
    container:      'main_container',
    options:        { render: true },
  });
}

// ── Render navbar ────────────────────────────────────────────

function _renderNav(profile) {
  if (!_navRoot) {
    const el = document.getElementById('nav_container');
    if (!el) return;
    _navRoot = ReactDOM.createRoot(el);
  }
  _navProfile = profile;
  _navRoot.render(ce(NavBar, { profile }));
  // re-sync back/forward button disabled state after render
  if (globalThis._updateNavUI) globalThis._updateNavUI();
}

// ── Listen for auth changes ──────────────────────────────────

globalThis.addEventListener('cw:auth:change', (e) => {
  _renderNav(e.detail);
});

// ── Expose on CW ────────────────────────────────────────────

if (globalThis.CW) {
  globalThis.CW.toast    = cwToast;
  globalThis.CW._renderNav = _renderNav;
}

// Also expose globally for auth.js / console
globalThis.cwToast = cwToast;

console.log('✅ app-ui.js loaded');
