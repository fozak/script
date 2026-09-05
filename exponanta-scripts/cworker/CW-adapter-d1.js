// ============================================================
// CW-adapter-d1.js
// version 687
// Pure D1/SQLite connector. No business logic.
// All functions: function(run_doc) — mutate only, no return.
// Reads from run_doc.target.data[0] — never from run_doc.input
// Isomorphic: direct D1 in Worker, _post to hub in browser
// ============================================================

(() => {
  const cfg = () => globalThis.CW._config;

  // ============================================================
  // RECORD HELPERS
  // ============================================================

  function _splitRecord(doc) {
    const top = {};
    const data = {};
    for (const [k, v] of Object.entries(doc)) {
      if (
        CW._config.topLevelFields.has(k) ||
        /^[\w]+[+-]$|^[+-][\w]+$/.test(k) ||
        v instanceof File
      ) {
        top[k] =
          Array.isArray(v) || (v && typeof v === "object")
            ? JSON.stringify(v)
            : v;
      } else {
        data[k] = v;
      }
    }
    return { top, data };
  }

  function _mergeRecord(rec) {
    const raw = rec.data;
    const doc = Object.assign(
      {},
      typeof raw === "string" ? JSON.parse(raw || "{}") : raw || {},
    );
    for (const k of CW._config.topLevelFields) {
      if (!(k in rec)) continue;
      const v = rec[k];
      if (typeof v === "string" && (v.startsWith("[") || v.startsWith("{"))) {
        try {
          doc[k] = JSON.parse(v);
        } catch {
          doc[k] = v;
        }
      } else {
        doc[k] = v;
      }
    }
    return doc;
  }

  // ============================================================
  // TRANSPORT — browser → Worker → D1
  // ============================================================

  const _post = async (run_doc) => {
    const res = await fetch(cfg().hub.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        //Authorization: globalThis.currentUser?.token || "",
        Authorization: globalThis.currentUser?.token
          ? `Bearer ${globalThis.currentUser.token}`
          : "",
      },
      body: JSON.stringify(run_doc),
    });
    Object.assign(run_doc, await res.json());
  };

  // ============================================================
  // RecordFieldResolver
  // ============================================================

  function RecordFieldResolver(run_doc) {
    const params = [];

    function resolveField(key) {
      return cfg().topLevelFields.has(key)
        ? `item.${key}`
        : `json_extract(item.data, '$.${key}')`;
    }

    function resolveOperator(field, op, value) {
      switch (op) {
        case "equals":
          params.push(value);
          return `${field} = ?`;
        case "contains":
          params.push(`%${value}%`);
          return `${field} LIKE ?`;
        case "gt":
          params.push(value);
          return `${field} > ?`;
        case "gte":
          params.push(value);
          return `${field} >= ?`;
        case "lt":
          params.push(value);
          return `${field} < ?`;
        case "lte":
          params.push(value);
          return `${field} <= ?`;
        case "not":
          params.push(value);
          return `${field} != ?`;
        case "in":
          if (Array.isArray(value) && value.length) {
            value.forEach((v) => params.push(v));
            return `${field} IN (${value.map(() => "?").join(",")})`;
          }
          return null;
        default:
          return null;
      }
    }

    function resolve(where) {
      if (!where || typeof where !== "object") return "";
      const parts = [];
      for (const [key, value] of Object.entries(where)) {
        if (key === "OR") {
          const p = value.map((w) => resolve(w)).filter(Boolean);
          if (p.length) parts.push(`(${p.join(" OR ")})`);
          continue;
        }
        if (key === "AND") {
          const p = value.map((w) => resolve(w)).filter(Boolean);
          if (p.length) parts.push(`(${p.join(" AND ")})`);
          continue;
        }
        if (key === "NOT") {
          const p = resolve(value);
          if (p) parts.push(`NOT (${p})`);
          continue;
        }
        const field = resolveField(key);
        if (value === null || value === undefined) {
          parts.push(`${field} IS NULL`);
        } else if (typeof value === "string") {
          params.push(value);
          parts.push(`${field} = ?`);
        } else if (typeof value === "number" || typeof value === "boolean") {
          params.push(value);
          parts.push(`${field} = ?`);
        } else if (typeof value === "object" && !Array.isArray(value)) {
          for (const [op, opValue] of Object.entries(value)) {
            const expr = resolveOperator(field, op, opValue);
            if (expr) parts.push(expr);
          }
        }
      }
      return parts.join(" AND ");
    }

    return { resolve, params };
  }

  // ============================================================
  // AUTH HELPERS — User only
  // ============================================================

  function _buildUserPayload(doc) {
    const schema = CW.Schema?.User;
    const fields = (schema?.fields || [])
      .filter((f) => f.in_local_view)
      .map((f) => f.fieldname);
    const payload = Object.fromEntries(
      fields.filter((k) => k in doc).map((k) => [k, doc[k]]),
    );

    // resolve FSM dims into JWT
    const stateDef = CW._getStateDef("User");
    const state =
      (typeof doc._state === "string"
        ? tryParseJSON(doc._state)
        : doc._state) || {};
    for (const [dim, dimDef] of Object.entries(stateDef)) {
      if (!(dim in state)) continue;
      if (dim === "docstatus") {
        payload[dim] = dimDef.values.indexOf(state[dim]); // 'Draft' → 0
      } else {
        payload[dim] = state[dim]; // 'Invited', 'Unverified' etc
      }
    }

    return payload;
  }

  async function _issueToken(doc, run_doc) {
    const payload = _buildUserPayload(doc);
    const token = await signJWT(payload, globalThis.env.JWT_SECRET);
    run_doc.user = { ...payload, token };
  }

  /* ── NEW: OAuth code exchange not used──────────────────────────────
  async function _exchangeOAuthCode(provider, code) {
    const oauthCfg = CW._config.oauth?.[provider];
    if (!oauthCfg) return null;

    const tokenRes = await fetch(oauthCfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: globalThis.env[`${provider.toUpperCase()}_CLIENT_ID`],
        client_secret:
          globalThis.env[`${provider.toUpperCase()}_CLIENT_SECRET`],
        redirect_uri: `${CW._config.hub.url}auth/${provider}/callback`,
        grant_type: "authorization_code",
      }),
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) return null;

    const userRes = await fetch(oauthCfg.userInfoUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const raw = await userRes.json();
    return oauthCfg.mapUser(raw);
  }
    */

  //==========REFACTORING =======================================

  // ============================================================
  // QUERY BUILDER — replaces _buildFilter
  // ============================================================

  function _buildDoctypeFilter(run_doc) {
    const doctype = run_doc.target_doctype ?? run_doc.source_doctype;
    if (doctype)
      run_doc.d1.conditions.push({
        key: "doctypeFilter",
        sql: `item.doctype = ?`,
        params: [doctype],
      });
  }

  function _buildUserWhere(run_doc) {
    if (!run_doc.query?.where) return;
    const resolver = RecordFieldResolver(run_doc);
    const clause = resolver.resolve(run_doc.query.where);
    if (clause)
      run_doc.d1.conditions.push({
        key: "userWhere",
        sql: `(${clause})`,
        params: resolver.params,
      });
  }

  function _buildSortD1(run_doc) {
    const sort = run_doc.query?.sort;
    if (!sort) {
      run_doc.d1.sort = "item.modified DESC";
      return;
    }
    if (typeof sort === "string") {
      run_doc.d1.sort = sort;
      return;
    }
    run_doc.d1.sort = Object.entries(sort)
      .map(([f, dir]) => {
        const col = cfg().topLevelFields.has(f)
          ? `item.${f}`
          : `json_extract(item.data, '$.${f}')`;
        return `${col} ${dir === "desc" ? "DESC" : "ASC"}`;
      })
      .join(", ");
  }

  function _buildLimitD1(run_doc) {
    const perPage = run_doc.query?.perPage;
    const page = run_doc.query?.page || 1;
    if (!perPage) {
      run_doc.d1.limit = { sql: "", params: [] };
      return;
    }
    run_doc.d1.limit = {
      sql: "LIMIT ? OFFSET ?",
      params: [perPage, (page - 1) * perPage],
    };
  }

  function _assembleSQL(run_doc) {
    run_doc.d1.sql = `
      SELECT DISTINCT item.* FROM item
      LEFT JOIN json_each(item._allowed)      __je_allowed
      LEFT JOIN json_each(item._allowed_read) __je_allowed_read
      WHERE ${run_doc.d1.conditions.map((c) => c.sql).join(" AND ")}
      ORDER BY ${run_doc.d1.sort}
      ${run_doc.d1.limit.sql}
    `.trim();

    run_doc.d1.params = [
      ...run_doc.d1.conditions.flatMap((c) => c.params),
      ...run_doc.d1.limit.params,
    ];
  }

  function _buildQuery(run_doc) {
    run_doc.d1 = { conditions: [] };
    cfg().sql.aclFilter(run_doc);
    _buildDoctypeFilter(run_doc);
    _buildUserWhere(run_doc);
    _buildSortD1(run_doc);
    _buildLimitD1(run_doc);
    _assembleSQL(run_doc);
  }

  // ============================================================
  // SELECT
  // ============================================================

  async function select(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc);
      return;
    }

    _buildQuery(run_doc);

    try {
      const rows = await globalThis.env.DB.prepare(run_doc.d1.sql)
        .bind(...run_doc.d1.params)
        .all();
      run_doc.target = {
        data: rows.results.map(_mergeRecord),
        meta: { total: rows.results.length },
      };
      run_doc.success = true;
    } catch (err) {
      run_doc.d1.error = {
        sql: run_doc.d1.sql,
        params: run_doc.d1.params,
        msg: err.message,
      };
      run_doc.error = err.message;
    }
  }

  // ============================================================
  // CREATE
  // ============================================================

  async function create(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc);
      if (
        run_doc.target_doctype === "User" &&
        run_doc.success &&
        run_doc.user?.token
      ) {
        localStorage.setItem("", JSON.stringify(run_doc.user));
        globalThis.currentUser = run_doc.user;
      }
      return;
    }

    const doc = run_doc.target?.data?.[0];
    if (!doc) {
      run_doc.error = "400 create: no target document";
      return;
    }

    const { top, data } = _splitRecord(doc);
    const topKeys = Object.keys(top);
    const topVals = Object.values(top).map((v) => (v === undefined ? null : v));

    try {
      await globalThis.env.DB.prepare(
        `
      INSERT INTO ${cfg().collection}
      (${topKeys.join(", ")}, data)
      VALUES (${topKeys.map(() => "?").join(", ")}, ?)
    `,
      )
        .bind(...topVals, JSON.stringify(data))
        .run();

      run_doc.target = {
        data: [_mergeRecord({ ...top, data: JSON.stringify(data) })],
        meta: { name: doc.name },
      };
      run_doc.success = true;
    } catch (err) {
      run_doc.error = err.message;
    }

    // User only — issue JWT post-write
    if (run_doc.target_doctype === "User" && !run_doc.error) {
      await _issueToken(run_doc.target.data[0], run_doc);
    }
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async function update(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc);
      if (
        run_doc.target_doctype === "User" &&
        run_doc.success &&
        run_doc.user?.token
      ) {
        localStorage.setItem("currentUser", JSON.stringify(run_doc.user));
        globalThis.currentUser = run_doc.user;
      }
      return;
    }

    const doc = run_doc.target?.data?.[0];
    const name = doc?.name || run_doc.query?.where?.name;
    if (!name) {
      run_doc.error = "400 update: no record name";
      return;
    }

    const { top, data } = _splitRecord(doc);
    const sets = Object.keys(top).map((k) => `${k} = ?`);
    const vals = Object.values(top);

    try {
      await globalThis.env.DB.prepare(
        `UPDATE ${cfg().collection} SET ${sets.join(", ")}, data = ? WHERE name = ?`,
      )
        .bind(...vals, JSON.stringify(data), name)
        .run();

      // exact PB analog — _mergeRecord on reassembled raw row
      run_doc.target = {
        data: [_mergeRecord({ ...top, data: JSON.stringify(data) })],
        meta: { updated: 1 },
      };
      run_doc.success = true;
    } catch (err) {
      run_doc.error = err.message;
    }

    // User only — re-issue JWT post-write
    if (run_doc.target_doctype === "User" && !run_doc.error) {
      await _issueToken(run_doc.target.data[0], run_doc);
    }
  }

  // ============================================================
  // DELETE
  // ============================================================
//dummy delete
  async function _delete(run_doc) {
    /*if (!globalThis.env?.DB) {
      await _post(run_doc);
      return;
    }

    const name = run_doc.target?.data?.[0]?.name || run_doc.query?.where?.name;
    if (!name) {
      run_doc.error = "400 delete: no record name";
      return;
    }

    try {
      await globalThis.env.DB.prepare(
        `DELETE FROM ${cfg().collection} WHERE name = ?`,
      )
        .bind(name)
        .run();
      run_doc.success = true;
    } catch (err) {
      run_doc.error = err.message;
    }*/
  }


  // ============================================================
  // AUTH OPERATIONS
  // ============================================================

  async function login(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc);
      if (run_doc.success && run_doc.user?.token) {
        localStorage.setItem("currentUser", JSON.stringify(run_doc.user));
        globalThis.currentUser = run_doc.user;
      }
      return;
    }

    const { email, password } = run_doc.target?.data?.[0] || {};
    if (!email || !password) {
      run_doc.error = "400 email and password required";
      return;
    }

    const row = await globalThis.env.DB.prepare(
      `SELECT * FROM item WHERE doctype = 'User' AND json_extract(data, '$.email') = ? LIMIT 1`,
    )
      .bind(email)
      .first();
    if (!row) {
      run_doc.error = "401 invalid credentials";
      return;
    }

    const doc = _mergeRecord(row);

    // guard OAuth users — no password_hash means OAuth registration
    if (!doc.password_hash) {
      run_doc.error = "403 use provider login";
      return;
    }

    // verify password
    const [saltHex] = doc.password_hash.split(":");
    const saltBytes = new Uint8Array(
      saltHex.match(/.{2}/g).map((b) => parseInt(b, 16)),
    );
    const computed = await pbkdf2(password, saltBytes);
    if (computed !== doc.password_hash) {
      run_doc.error = "401 invalid credentials";
      return;
    }

    // check status
    const state =
      (typeof doc._state === "string"
        ? tryParseJSON(doc._state)
        : doc._state) || {};
    const status = state.status;
    if (status !== "Active") {
      run_doc.error = `403 account ${status?.toLowerCase() ?? "not active"}`;
      return;
    }

    run_doc.target = { data: [doc] };
    await _issueToken(doc, run_doc);
    run_doc.success = true;
  }

  async function logout(run_doc) {
    if (!globalThis.env?.DB) {
      await _post(run_doc);
      localStorage.removeItem("currentUser");
      globalThis.currentUser = null;
      run_doc.success = true;
      return;
    }
    run_doc.success = true;
  }
  //----------------------------------------------------------

  async function oauthLogin(run_doc) {
    const { provider, return_url } = run_doc.target?.data?.[0] || {};
    const cfg = CW._config.oauth?.[provider];
    if (!cfg) {
      run_doc.error = "Unknown provider";
      return;
    }

    const params = new URLSearchParams({
      client_id: globalThis.env[`${provider.toUpperCase()}_CLIENT_ID`],
      redirect_uri: `${CW._config.hub.url}auth/${provider}/callback`,
      response_type: "code",
      scope: cfg.scope,
      state: btoa(return_url || "/"),
    });

    run_doc.target.data[0].redirect_url = `${cfg.authUrl}?${params}`;
    run_doc.success = true;
  }

  async function oauthCallback(run_doc) {
    const { provider, code, state } = run_doc.target?.data?.[0] || {};
    const return_url = atob(state || btoa("/"));
    const cfg = CW._config.oauth?.[provider];
    if (!cfg) {
      run_doc.error = "Unknown provider";
      return;
    }
    if (!code) {
      run_doc.error = "no_code";
      return;
    }

    // exchange code
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        ...cfg.mapParams(
          globalThis.env,
          `${CW._config.hub.url}auth/${provider}/callback`,
        ),
      }),
    });
    const { access_token } = await tokenRes.json();
    if (!access_token) {
      run_doc.error = "token_failed";
      return;
    }

    // get user info
    const raw = await (
      await fetch(cfg.userInfoUrl, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
    ).json();
    const providerUser = cfg.mapUser(raw);
    const domain = new URL(return_url).hostname;

    // find or create user
    const r = await run_doc.child({
      operation: "create",
      target_doctype: "User",
      input: {
        email: providerUser.email,
        full_name: providerUser.full_name,
        user_image: providerUser.user_image,
        providers: providerUser.providers,
        domain: domain,
      },
      options: { render: false },
    });

    const errorStr =
      typeof r.error === "string" ? r.error : JSON.stringify(r.error);
    if (!r.success && !errorStr.includes("UNIQUE")) {
      run_doc.error = errorStr;
      return;
    }

    let token = r.user?.token;
    if (!token) {
      const sel = await run_doc.child({
        operation: "select",
        target_doctype: "User",
        query: { where: { email: providerUser.email } },
        options: { render: false },
      });
      const doc = sel.target?.data?.[0];
      token = await signJWT(buildPayload(doc), globalThis.env.JWT_SECRET);
    }

    run_doc.target.data[0].token = token;
    run_doc.target.data[0].return_url = return_url;
    run_doc.success = true;
  }

  async function cwPost(run_doc) {
    // already handled by CW.controller via normal POST dispatch
    // this is a passthrough — Worker calls controller directly for POST
    run_doc.success = true;
  }

  async function shell(run_doc) {
    // Worker serves shell.html — no adapter logic needed
    run_doc.success = true;
  }

  // ============================================================
  // ADAPTER SURFACE
  // ============================================================

  globalThis.Adapters = globalThis.Adapters || {};
  globalThis.Adapters["d1"] = {
    select,
    create,
    update,
    delete: _delete,
    login,
    logout,
    oauthLogin,
    oauthCallback,
    cwPost,
    shell,
  };
})();