// ============================================================
// CW-identity.js
// Anonymous-first identity management
// Reads from CW._config.identity
// Depends on: CW-config.js, auth.js (provisionUser)
// ============================================================

(async () => {
  const _cfg = globalThis.CW._config.identity;
  const _hub = globalThis.CW._config.hub;

  // ─── helpers ──────────────────────────────────────────────

  const _isBot = () =>
    _cfg.bot_patterns.some((p) => p.test(navigator.userAgent));

  const _loadUser = () => {
    try {
      return JSON.parse(localStorage.getItem(_cfg.keys.user) || "null");
    } catch {
      return null;
    }
  };

  const _saveUser = (data) => {
    localStorage.setItem(_cfg.keys.user, JSON.stringify(data));
  };

  const _loadUTMs = () => {
    try {
      return JSON.parse(localStorage.getItem(_cfg.keys.utms) || "null");
    } catch {
      return null;
    }
  };

  const _captureUTMs = () => {
    if (_loadUTMs()) return; // first touch wins
    const p = new URLSearchParams(location.search);
    const utms = {};
    for (const k of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
    ]) {
      if (p.get(k)) utms[k] = p.get(k);
    }
    if (Object.keys(utms).length)
      localStorage.setItem(_cfg.keys.utms, JSON.stringify(utms));
  };

  const _getSession = () => {
    let id = sessionStorage.getItem(_cfg.keys.session);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(_cfg.keys.session, id);
    }
    return id;
  };

  // ─── context — sent to hub with every request ─────────────

  const context = () => {
    const user = _loadUser();
    return {
      user_id: globalThis.pb?.authStore?.model?.id || user?.id || null,
      anon_email: user?.email || null,
      session_id: _getSession(),
      type: globalThis.pb?.authStore?.model?.email?.includes(".invalid")
        ? "anon"
        : globalThis.pb?.authStore?.model?.verified
          ? "verified"
          : "user",
      page: location.href,
      referrer: document.referrer,
      utms: _loadUTMs() || {},
    };
  };

  // ─── qualify — passive engagement tracking ─────────────────

  let _qualified = false;
  const _score = { time: false, scroll: false, action: false };

  const _maybeQualify = () => {
    if (_qualified) return;
    const score = Object.values(_score).filter(Boolean).length;
    if (score >= _cfg.qualify.require_score) {
      _qualified = true;
      window.dispatchEvent(
        new CustomEvent("cw:identity:qualified", { detail: context() }),
      );
    }
  };

  const _startQualify = () => {
    setTimeout(() => {
      _score.time = true;
      _maybeQualify();
    }, _cfg.qualify.time_ms);

    window.addEventListener(
      "scroll",
      () => {
        const pct =
          window.scrollY / (document.body.scrollHeight - window.innerHeight);
        if (pct >= _cfg.qualify.scroll_pct) {
          _score.scroll = true;
          _maybeQualify();
        }
      },
      { passive: true },
    );

    document.addEventListener(
      "click",
      () => {
        _score.action = true;
        _maybeQualify();
      },
      { once: true },
    );
  };

  // ─── init ──────────────────────────────────────────────────

  const init = async () => {
    if (_isBot()) return;

    _captureUTMs();
    _startQualify();

    // 1 — pb already logged in
    if (globalThis.pb?.authStore?.isValid) {
      console.log("✅ CW-identity: pb user", pb.authStore.model.id);
      return;
    }

    // 2 — returning anon — silent re-login
    const stored = _loadUser();
    if (stored?.email && stored?.password) {
      try {
        await pb
          .collection("users")
          .authWithPassword(stored.email, stored.password);
        console.log("✅ CW-identity: anon re-login", stored.email);
      } catch {
        // stored credentials failed — fall through to new anon
        localStorage.removeItem(_cfg.keys.user);
        await _createAnon();
      }
      return;
    }

    // 3 — new anon
    await _createAnon();
  };

  // ─── create anon user ──────────────────────────────────────

  const _createAnon = async () => {
    const short = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const email = `${short}${_cfg.pseudo_domain.anon}`;
    const password = crypto.randomUUID();

    try {
      await provisionUser(email, password, "Anonymous");
      _saveUser({
        email,
        password,
        id: pb.authStore.model?.id,
        _state: "anon",
      });
      console.log("✅ CW-identity: anon created", email);
    } catch (e) {
      console.warn("CW-identity: anon provision failed", e);
    }
  };

  // ─── promote anon to real user ─────────────────────────────

  const identify = async (email, password, name) => {
    const stored = _loadUser();
    if (!stored) return;

    try {
      await pb.collection("users").update(pb.authStore.model.id, {
        email,
        password,
        passwordConfirm: password,
        oldPassword: stored.password,
      });
      await pb.collection("users").requestVerification(email);
      _saveUser({ ...stored, email, _state: "registered" });
      console.log("✅ CW-identity: promoted to user", email);
    } catch (e) {
      console.warn("CW-identity: promote failed", e);
    }
  };

  // ─── auth change listener ──────────────────────────────────

  window.addEventListener("cw:auth:change", () => {
    if (pb?.authStore?.isValid) {
      const m = pb.authStore.model;
      const stored = _loadUser() || {};
      _saveUser({
        ...stored,
        id: m.id,
        _state: m.verified ? "verified" : "user",
      });
    }
  });

  // ─── export ────────────────────────────────────────────────

  globalThis.CWIdentity = { context, identify, init };

  await init();

  console.log("✅ CW-identity.js loaded");
})();
