// ============================================================
// CW-config.js
// ============================================================

globalThis.CW.defaultFields = [
  "name",
  "doctype",
  "docstatus",
  "owner",
  "modified",
  "modified_by",
  "_state",
  "parent",
  "parentfield",
  "parenttype",
  "idx",
  "_allowed",
  "_allowed_read",
  "files",
  "_changes",
  "_threads", // ← add both
];

globalThis.CW._config = {
  ui: {
    show_state_badges: false,
  },

  systemSettings: {
    logChanges: 1, // 0 = off, 1 = on
    logThreads: 1,
  },

  doctypeAliases: {
    todo: "ToDo",
  },

  pb_url: "http://143.198.29.88:8090",
  collection: "item",

  topLevelFields: new Set([
    "id",
    "name",
    "doctype",
    "docstatus",
    "owner",
    "_allowed",
    "_allowed_read",
    "created",
    "files",
  ]),

  publicDoctypes: ["Event", "WebPage", "UserPublicProfile", "Session"],

  publicSites: {
    "exponanta.com": "/var/www/exponanta.com",
    "cfeglobal.org": "/var/www/cfeglobal.org",
  },

  trackable_doctypes: ["Content", "Event"],

  runParams: [
    { path: "target_doctype", url: "doctype", type: "string" },
    { path: "operation", url: "operation", type: "string", default: "select" },
    { path: "view", url: "view", type: "string" },
    { path: "component", url: "component", type: "string" },
    { path: "container", url: "container", type: "string" },
    { path: "source_doctype", url: "source_doctype", type: "string" },
    { path: "query.filter", url: "filter", type: "string" },
    { path: "query.sort", url: "sort", type: "string" },
    { path: "query.fields", url: "fields", type: "string" },
    { path: "query.expand", url: "expand", type: "string" },
    { path: "query.perPage", url: "perPage", type: "int" },
    { path: "query.page", url: "page", type: "int" },
    { path: "query.where.name", url: "name", type: "string" },
  ],

  calendar: {
    weekDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    monthNames: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    bookingWindowDays: 60,
    defaultDuration: 30,
    defaultBuffer: 10,
    defaultStartHour: 8,
    defaultEndHour: 18,
    timezones: Intl.supportedValuesOf("timeZone"),
  },

  systemFields: [
    {
      name: "doctype",
      fetch: true,
      hidden: 1,
      in_list_view: 1,
      onWrite: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc) doc.doctype = doc.doctype || run_doc.target_doctype;
      },
    },
    {
      name: "name",
      fetch: true,
      hidden: 0,
      in_list_view: 1,
      fieldtype: "Data",
      onCreate: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (!doc || doc.name) return;
        const s = CW.Schema?.[run_doc.target_doctype];
        const a = s?.autoname;
        doc.name = a?.startsWith("field:")
          ? generateId(run_doc.target_doctype, doc[a.slice(6)])
          : generateId(run_doc.target_doctype);
      },
    },
    {
      name: "docstatus",
      fetch: true,
      hidden: 1,
      in_list_view: 1,
      onCreate: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc && doc.docstatus === undefined) doc.docstatus = 0;
      },
    },
    {
      name: "creation",
      fetch: true,
      hidden: 1,
      read_only: 1,
      fieldtype: "Datetime",
      label: "Created",
      in_list_view: 1,
      onCreate: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc) doc.creation = Date.now();
      },
    },
    {
      name: "owner",
      fetch: true,
      hidden: 0,
      read_only: 1,
      fieldtype: "Data",
      label: "Owner",
      in_list_view: 0,
      onCreate: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc)
          doc.owner =
            doc.doctype === "User"
              ? ""
              : globalThis.pb?.authStore?.model?.id || "";
      },
    },
    {
      name: "modified",
      fetch: true,
      hidden: 0,
      read_only: 1,
      fieldtype: "Datetime",
      label: "Modified",
      in_list_view: 0,
      onWrite: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc) doc.modified = Date.now();
      },
    },
    {
      name: "modified_by",
      fetch: true,
      hidden: 0,
      read_only: 1,
      fieldtype: "Data",
      label: "Modified By",
      in_list_view: 0,
      onWrite: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (doc) doc.modified_by = globalThis.pb?.authStore?.model?.id || "";
      },
    },
    {
      name: "_state",
      fetch: true,
      in_list_view: 1,
      hidden: 0,
      read_only: 1,
      fieldtype: "Data",
      label: "State",
    },
    {
      name: "top_parent",
      fetch: true,
      hidden: 1,
      onCreate: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (!doc) return;
        const parentRun = CW.runs[run_doc.parent_run_id];
        const p = parentRun?.target?.data?.[0];
        if (!p || p.doctype !== run_doc.target_doctype) return;
        doc.top_parent = p.top_parent || p.name;
      },
    },
    {
      name: "parent",
      fetch: true,
      hidden: 1,
      fieldtype: "Data",
      in_list_view: 1,
      label: "Parent",
    },
    {
      name: "parenttype",
      fetch: true,
      hidden: 1,
      fieldtype: "Data",
      in_list_view: 1,
      label: "Parent Type",
    },
    {
      name: "parentfield",
      fetch: true,
      hidden: 1,
      fieldtype: "Data",
      in_list_view: 1,
      label: "Parent Field",
    },
    { name: "idx", fetch: true, hidden: 1 },
    {
      name: "_allowed",
      fetch: true,
      hidden: 0,
      read_only: 0,
      fieldtype: "SharePanel",
      label: "Sharing",
      in_list_view: 0,
      onWrite: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (!doc) return;
        const schema = CW.Schema?.[run_doc.target_doctype];
        const linkFields = (schema?.fields || []).filter(
          (f) => f.fieldtype === "Link",
        );
        const hasParent = !!(doc.parent && doc.parenttype);
        const hasLinks = linkFields.some((f) => doc[f.fieldname]);
        if (!hasParent && !hasLinks && run_doc.operation !== "create") return;

        const roles = (schema?.permissions || [])
          .filter((p) => p.role && (p.write === 1 || p.create === 1))
          .map((p) => generateId("Role", p.role));

        if (hasParent) {
          const parentRun = CW.runs[run_doc.parent_run_id];
          const p = parentRun?.target?.data?.[0];
          if (p?._allowed) roles.push(...p._allowed);
        }

        for (const f of linkFields) {
          const linked = Object.values(CW.runs).find(
            (r) =>
              r.target_doctype === f.options &&
              r.target?.data?.[0]?.name === doc[f.fieldname],
          )?.target?.data?.[0];
          if (linked?._allowed) roles.push(...linked._allowed);
        }

        doc._allowed = [...new Set([...(doc._allowed || []), ...roles])];

        if (
          run_doc.target_doctype === "Relationship" &&
          doc.related_name &&
          doc.related_doctype
        ) {
          const parentRun = CW.runs[run_doc.parent_run_id];
          const parentDoc = parentRun?.target?.data?.[0];
          const relatedRun = Object.values(CW.runs).find(
            (r) =>
              r.target_doctype === doc.related_doctype &&
              r.target?.data?.[0]?.name === doc.related_name,
          );
          const relatedDoc = relatedRun?.target?.data?.[0];
          if (parentDoc && relatedDoc) {
            run_doc.child({
              operation: "update",
              target_doctype: doc.related_doctype,
              query: { where: { name: doc.related_name } },
              target: { data: [relatedDoc] },
              input: {
                _allowed: [...new Set([...(parentDoc._allowed || [])])],
              },
              options: { render: false, internal: true },
              source_field: "_allowed", // ← add
            });
          }
        }
      },
    },
    {
      name: "_allowed_read",
      fetch: true,
      hidden: 0,
      onWrite: (run_doc) => {
        const doc = run_doc.target?.data?.[0];
        if (!doc) return;
        const schema = CW.Schema?.[run_doc.target_doctype];
        const linkFields = (schema?.fields || []).filter(
          (f) => f.fieldtype === "Link",
        );
        const hasParent = !!(doc.parent && doc.parenttype);
        const hasLinks = linkFields.some((f) => doc[f.fieldname]);
        if (!hasParent && !hasLinks && run_doc.operation !== "create") return;

        const roles = (schema?.permissions || [])
          .filter(
            (p) => p.role && p.read === 1 && !(p.write === 1 || p.create === 1),
          )
          .map((p) => generateId("Role", p.role));
        if (schema?.is_public && !roles.includes("roleispublixxxx"))
          roles.push("roleispublixxxx");

        if (hasParent) {
          const parentRun = CW.runs[run_doc.parent_run_id];
          const p = parentRun?.target?.data?.[0];
          if (p?._allowed_read) roles.push(...p._allowed_read);
        }

        for (const f of linkFields) {
          const linked = Object.values(CW.runs).find(
            (r) =>
              r.target_doctype === f.options &&
              r.target?.data?.[0]?.name === doc[f.fieldname],
          )?.target?.data?.[0];
          if (linked?._allowed_read) roles.push(...linked._allowed_read);
        }

        doc._allowed_read = [
          ...new Set([...(doc._allowed_read || []), ...roles]),
        ];

        if (
          run_doc.target_doctype === "Relationship" &&
          doc.related_name &&
          doc.related_doctype
        ) {
          const parentDoc = CW.runs[run_doc.parent_run_id]?.target?.data?.[0];
          const relatedDoc = Object.values(CW.runs).find(
            (r) =>
              r.target_doctype === doc.related_doctype &&
              r.target?.data?.[0]?.name === doc.related_name,
          )?.target?.data?.[0];
          if (parentDoc && relatedDoc) {
            run_doc.child({
              operation: "update",
              target_doctype: doc.related_doctype,
              query: { where: { name: doc.related_name } },
              target: { data: [relatedDoc] },
              input: {
                _allowed_read: [
                  ...new Set([...(parentDoc._allowed_read || [])]),
                ],
              },
              options: { render: false, internal: true },
              source_field: "_allowed_read", // ← add
            });
          }
        }
      },
    },
    {
      name: "files",
      fetch: true,
      hidden: 0,
      read_only: 0,
      fieldtype: "Filepicker",
      label: "Attachments",
      in_list_view: 0,
    },
    {
      name: "_changes",
      fetch: true,
      in_list_view: 1,
      hidden: 0,
      read_only: 1,
      onCreate: (run_doc) => {
        if (!CW._config.systemSettings?.logChanges) return;
        if (run_doc.options?._logging === false) return;
        console.log("onCreate fired");
        const doc = run_doc.target?.data?.[0];
        if (!doc) return;
        const skip = new Set([
          "_changes",
          "modified",
          "modified_by",
          "creation",
          "_state",
          "_allowed",
          "_allowed_read",
          "files",
          "name",
          "doctype",
          "docstatus",
          "owner",
        ]);
        const ch = Object.entries(doc)
          .filter(
            ([k, v]) =>
              !skip.has(k) && v !== null && v !== undefined && v !== "",
          )
          .map(([field, to]) => ({ field, from: null, to }));
        if (!ch.length) return;
        doc._changes = [
          {
            at: Date.now(),
            by: run_doc.user?.name || null,
            op: "create",
            ch,
          },
        ];
      },
    },
  ],

  // ============================================================
  // SYSTEM CONFIG
  // ============================================================
  debug: true,
  adapters: {
    // Default adapter per category
    defaults: {
      db: "pocketbase",
      auth: "auth",
      storage: null, // Future
      email: null, // Future
    },
    payloadAdapters: {
      Request: "auth",
      Object: null, //was "run-builder"
      Run: null,
    },

    // Adapter registry (defines what's available)
    registry: {
      // ──────────────────────────────────────────────────────
      // DATABASE ADAPTERS
      // ──────────────────────────────────────────────────────
      pocketbase: {
        type: "db",
        name: "PocketBase",
        description: "PocketBase cloud database",
        handler: "_dbAdapters.pocketbase",
        capabilities: ["select", "create", "update", "delete"], // ✅ "select" not "query"
        config: {
          url: "http://127.0.0.1:8090", //not used, set in CW._config.pb_url
          collection: "item",
        },
      },

      memory: {
        type: "db",
        name: "Memory",
        description: "In-memory storage (volatile)",
        handler: "_dbAdapters.memory",
        capabilities: ["select", "create", "update", "delete"],
        config: {
          maxRecords: 10000,
        },
      },

      storage: {
        type: "db",
        name: "Local Storage",
        description: "Browser localStorage persistence",
        handler: "_dbAdapters.storage",
        capabilities: ["select", "create", "update", "delete"],
        config: {
          prefix: "coworker_",
          maxSize: 5 * 1024 * 1024, // 5MB
        },
      },

      // ──────────────────────────────────────────────────────
      // AUTH ADAPTERS
      // ──────────────────────────────────────────────────────
      auth: {
        type: "auth",
        name: "auth",
        description: "",
        handler: "_authAdapters.jwt", // not used
        capabilities: [
          // HTTP gateway
          "parse_request",
          "rate_limit",
          // Auth
          "signup",
          "signin",
          "signout",
          "refresh",
          "verifyJWT",
          "change_password",
        ],
        config: {
          // ── HTTP Gateway ──────────────────────────────────────
          rateLimit: {
            ip: { max: 100, window: 60000 },
            user: { max: 1000, window: 60000 },
          },
          bodySize: 102400,
          methods: ["POST"],
          contentType: "application/json",

          // ── JWT Auth ──────────────────────────────────────────
          jwtSecret:
            (typeof process !== "undefined" && process.env?.JWT_SECRET) ||
            "change-this-secret-in-production",
          jwtAlgorithm: "HS256",

          // Token expiration
          accessTokenExpiry: "15m", // 15 minutes
          refreshTokenExpiry: "30d", // 30 days

          // For internal calculations
          accessTokenExpiryMs: 15 * 60 * 1000, // 15 minutes
          refreshTokenExpiryMs: 30 * 24 * 60 * 60 * 1000, // 30 days

          // Security settings
          passwordHashIterations: 100000,
          saltLength: 16,
          maxFailedAttempts: 5,
          lockDurationMs: 15 * 60 * 1000, // 15 minutes
          maxRefreshTokens: 5, // Max concurrent sessions per user

          // User doctype fields
          userDoctype: "User",
          userEmailField: "email",
          emailVerifiedField: "email_verified", // <-- 1/0 field

          // Default roles
          defaultRoles: ["Desk User"],
          adminRole: "System Manager",
          publicRole: "Is Public",

          // Optional: include any flags in JWT payload
          includeInJWT: ["_allowed_read", "email_verified"], // ensures payload has 1/0
        },
      },
    },
  },

  relationshipTypes: {
    Event: {
      User: [
        "Attendee",
        "Speaker",
        "Volunteer",
        "Organizer",
        "Sponsor Contact",
      ],
      Organization: ["Sponsor", "Partner", "Media Partner"],
      Event: ["Related Event", "Follow-up Event"],
    },
    Task: {
      User: ["Assignee", "Reviewer", "Observer"],
      Task: ["Blocks", "Blocked By", "Related"],
      Project: ["Belongs To"],
      Role: ["Read Access", "Write Access"], //experimental
      Customer: ["Customer"],
    },
    User: {
      Role: ["Has Role"],
      User: ["Editor", "Delegate", "Assistant"],
    },
  },

  relationshipAccessMap: {
    Event: {
      User: {
        Attendee: "read",
        Speaker: "read",
        Volunteer: "read",
        Organizer: "write",
        "Sponsor Contact": "read",
      },
      Organization: {
        Sponsor: "none",
        Partner: "none",
        "Media Partner": "none",
      },
      Event: {
        "Related Event": "none",
        "Follow-up Event": "none",
      },
    },
    Task: {
      User: {
        Assignee: "write",
        Reviewer: "read",
        Observer: "read",
      },
      Task: {
        Blocks: "none",
        "Blocked By": "none",
        Related: "none",
      },
      Project: {
        "Belongs To": "none",
      },
    },
    User: {
      Role: {
        "Has Role": "read",
      },
      User: {
        Editor: "write",
        Delegate: "write",
        Assistant: "read",
      },
    },
  },

  // ============================================================
  // OPERATION ALIASES (existing)
  // ============================================================
  operationAliases: {
    // CRUD aliases
    read: "select",
    insert: "create",
    query: "select",
    fetch: "select",
    add: "create",
    remove: "delete",
    modify: "update",
    patch: "update",

    // Auth aliases (✅ NEW)
    login: "signin",
    register: "signup",
    logout: "signout",
    refresh_token: "refresh",
  },

  // ============================================================
  // DOCTYPE ALIASES (existing)
  // ============================================================
  doctypeAliases: {
    user: "User",
    order: "Sales Order",
    customer: "Customer",
    item: "Item",
    invoice: "Sales Invoice",
  },

  // ============================================================
  // OPERATION BEHAVIOR CONFIGURATION
  // ============================================================
  operations: {
    // ──────────────────────────────────────────────────────
    // READ OPERATIONS
    // ──────────────────────────────────────────────────────
    select: {
      type: "read",
      adapterType: "db", // ✅ NEW: Explicit adapter type
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    takeone: {
      type: "read",
      adapterType: "db", // ✅ NEW
      draft: true, // ✅ error corrected the true is correct
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },

    // ──────────────────────────────────────────────────────
    // WRITE OPERATIONS
    // ──────────────────────────────────────────────────────
    create: {
      type: "write",
      adapterType: "db", // ✅ NEW
      draft: true,
      requiresSchema: true,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
    update: {
      type: "write",
      adapterType: "db", // ✅ NEW
      draft: true,
      requiresSchema: true,
      validate: true,
      fetchOriginals: true,
      bypassController: false,
    },
    delete: {
      type: "write",
      adapterType: "db", // ✅ NEW
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: true,
      bypassController: false,
    },
    upsert: {
      type: "write",
      adapterType: "db", // ✅ NEW
      draft: true,
      requiresSchema: true,
      validate: true,
      fetchOriginals: true,
      bypassController: false,
    },
    bulk_update: {
      type: "write",
      adapterType: "db", // ✅ NEW
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },

    // ──────────────────────────────────────────────────────
    // AUTH OPERATIONS (✅ NEW)
    // ──────────────────────────────────────────────────────
    signup: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
    signin: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
    signout: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    refresh: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    verifyJWT: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    change_password: {
      type: "auth",
      adapterType: "auth",
      draft: false,
      requiresSchema: false,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
  },

  /* OLD: Operation behavior configuration for controller
  operations: {
    select: {
      type: "read",
      draft: false, // ✅ ADD THIS - Reading, not editable
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    takeone: {
      type: "read",
      draft: false, // ✅ ADD THIS - Viewing, not editable
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
    create: {
      type: "write",
      draft: true, // ✅ ADD THIS - Creating, editable
      requiresSchema: true,
      validate: true,
      fetchOriginals: false,
      bypassController: false,
    },
    update: {
      type: "write",
      draft: true, // ✅ ADD THIS - Editing, editable
      requiresSchema: true,
      validate: true,
      fetchOriginals: true,
      bypassController: false,
    },
    delete: {
      type: "write",
      draft: false, // ✅ ADD THIS - Deleting, not editable
      requiresSchema: false,
      validate: false,
      fetchOriginals: true,
      bypassController: false,
    },
    upsert: {
      type: "write",
      draft: true, // ✅ ADD THIS - Upserting, editable
      requiresSchema: true,
      validate: true,
      fetchOriginals: true,
      bypassController: false,
    },
    bulk_update: {
      type: "write",
      draft: false, // ✅ ADD THIS - Bulk ops, not draft-based
      requiresSchema: false,
      validate: false,
      fetchOriginals: false,
      bypassController: false,
    },
  }, */

  /* ✅ INITIAL
  views: {
    list: {
      component: "MainGrid",
      container: "main_container",
      options: {
        render: true,
      },
    },
    form: {
      component: "MainForm",
      container: "main_container",
      options: {
        render: true,
      },
    },
    chat: {
      component: "MainChat",
      container: "right_pane",
      options: {
        render: true,
      },
    },
    edit: { component: 'MainForm', container: 'main_container' },  // ← added
  read: { component: 'MainForm', container: 'main_container' } // ← added
  },*/

  views: {
    list: { component: "UniversalGrid", container: "right_pane" }, //MainGrid
    form: { component: "MainForm", container: "right_pane" },
    read: { component: "MainForm", container: "right_pane" },
    edit: { component: "MainForm", container: "right_pane" },
  },

  // old structure
  // Operation → View mapping
  operationToView: {
    select: "list",
    create: "form",
    update: "form",
    delete: null,
    takeone: "form", // Internal operation for rendering
  },

  // View → Component mapping
  viewToComponent: {
    list: "MainGrid",
    form: "MainForm",
    chat: "MainChat",
    grid: "MainGrid",
    detail: "MainForm",
    conversation: "MainChat",
  },

  // View → Container mapping
  viewToContainer: {
    list: "main_container",
    form: "main_container",
    chat: "right_pane",
    grid: "main_container",
    detail: "main_container",
    MainGrid: "main_container",
    MainForm: "main_container",
    MainChat: "right_pane",
  },

  behaviorMatrix: {
    // ═══════════════════════════════════════════════════════════
    // MATRIX: [is_submittable]-[docstatus]-[_autosave]
    // Only 8 meaningful combinations (2 × 4 × 1 for non-submittable)
    // ═══════════════════════════════════════════════════════════

    // ───────────────────────────────────────────────────────────
    // Non-Submittable Documents (is_submittable = 0)
    // ───────────────────────────────────────────────────────────

    "0-0-0": {
      name: "Non-Submittable, Manual Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "delete"],
        badge: null,
      },
      controller: {
        autoSave: false, // Don't auto-save
        validateOnChange: true, // But do validate for feedback
      },
      guardian: {
        allowOperations: ["update", "delete", "takeone"],
        blockOperations: [],
      },
    },

    "0-0-1": {
      name: "Non-Submittable, Auto-Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "delete"], // Keep save button anyway
        badge: null,
      },
      controller: {
        autoSave: true, // Auto-save enabled
        validateOnChange: true, // Validate before saving
      },
      guardian: {
        allowOperations: ["update", "delete", "takeone"],
        blockOperations: [],
      },
    },

    // ───────────────────────────────────────────────────────────
    // Submittable Documents - DRAFT (is_submittable = 1, docstatus = 0)
    // ───────────────────────────────────────────────────────────

    "1-0-0": {
      name: "Submittable Draft, Manual Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "submit", "delete"],
        badge: { label: "Draft", class: "warning" },
      },
      controller: {
        autoSave: false,
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["update", "submit", "delete", "takeone"],
        blockOperations: ["cancel", "amend"],
      },
    },

    "1-0-1": {
      name: "Submittable Draft, Auto-Save",
      ui: {
        fieldsEditable: true,
        showButtons: ["save", "submit", "delete"],
        badge: { label: "Draft", class: "warning" },
      },
      controller: {
        autoSave: true,
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["update", "submit", "delete", "takeone"],
        blockOperations: ["cancel", "amend"],
      },
    },

    // ───────────────────────────────────────────────────────────
    // Submittable Documents - SUBMITTED (is_submittable = 1, docstatus = 1)
    // ───────────────────────────────────────────────────────────

    "1-1-0": {
      name: "Submitted Document, Manual Save",
      ui: {
        fieldsEditable: false, // Unless field.allow_on_submit
        showButtons: ["cancel"],
        badge: { label: "Submitted", class: "success" },
      },
      controller: {
        autoSave: false,
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["cancel", "takeone"],
        blockOperations: ["update", "submit", "delete", "amend"],
        exceptions: {
          update: { condition: "field.allow_on_submit === 1" },
        },
      },
    },

    "1-1-1": {
      name: "Submitted Document, Auto-Save",
      ui: {
        fieldsEditable: false, // Unless field.allow_on_submit
        showButtons: ["cancel"],
        badge: { label: "Submitted", class: "success" },
      },
      controller: {
        autoSave: true, // For allow_on_submit fields
        validateOnChange: true,
      },
      guardian: {
        allowOperations: ["cancel", "takeone"],
        blockOperations: ["update", "submit", "delete", "amend"],
        exceptions: {
          update: { condition: "field.allow_on_submit === 1" },
        },
      },
    },

    // ───────────────────────────────────────────────────────────
    // Submittable Documents - CANCELLED (is_submittable = 1, docstatus = 2)
    // ───────────────────────────────────────────────────────────

    "1-2-0": {
      name: "Cancelled Document",
      ui: {
        fieldsEditable: false,
        showButtons: ["amend"],
        badge: { label: "Cancelled", class: "danger" },
      },
      controller: {
        autoSave: false,
        validateOnChange: false,
      },
      guardian: {
        allowOperations: ["amend", "takeone"],
        blockOperations: ["update", "submit", "delete", "cancel"],
      },
    },

    "1-2-1": {
      name: "Cancelled Document",
      ui: {
        fieldsEditable: false,
        showButtons: ["amend"],
        badge: { label: "Cancelled", class: "danger" },
      },
      controller: {
        autoSave: false, // Doesn't matter, nothing editable
        validateOnChange: false,
      },
      guardian: {
        allowOperations: ["amend", "takeone"],
        blockOperations: ["update", "submit", "delete", "cancel"],
      },
    },
  },
  //not used see below
  /* fieldInteractionConfig: {
    // ═══════════════════════════════════════════════════════════
    // Field interaction triggers (independent of auto-save)
    // ═══════════════════════════════════════════════════════════

    triggers: {
      onChange: {
        enabled: true, // Fire on every change
        debounce: 300, // Wait 300ms after last change
        action: "write_draft", // Always write to draft
      },

      onBlur: {
        enabled: true, // Fire when field loses focus
        debounce: 0, // Immediate
        action: "validate", // Validate when leaving field
      },
    },

    // You can configure different profiles
    profiles: {
      default: {
        onChange: { enabled: true, debounce: 300, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "validate" },
        onButtonClick: {
          enabled: true,
          action: "workflow_action",
          debounce: 0,
        },
      },

      blur_save: {
        onChange: { enabled: true, debounce: 0, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "auto_save" },
      },

      instant: {
        onChange: { enabled: true, debounce: 0, action: "auto_save" },
        onBlur: { enabled: false },
      },

      manual_only: {
        onChange: { enabled: true, debounce: 0, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "validate" },
      },
    },

    // Active profile
    activeProfile: "default",
  },*/

  fieldComponents: {
    Table: "UniversalGrid",
  },

  // ✅ Field types - NOT USED
  fieldTypes: {
    // ════════════════════════════════════════════════════════
    // TEXT INPUTS
    // ════════════════════════════════════════════════════════

    Data: {
      element: "input",
      props: { type: "text" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    Text: {
      element: "textarea",
      props: { rows: 3 },
      state: { localValue: "{{value}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    "Long Text": {
      element: "textarea",
      props: { rows: 6 },
      state: { localValue: "{{value}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    // ════════════════════════════════════════════════════════
    // NUMERIC INPUTS
    // ════════════════════════════════════════════════════════

    Int: {
      element: "input",
      props: {
        type: "number",
      },
      state: { localValue: "{{value || 0}}" },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseInt", // Parse to integer
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    Float: {
      element: "input",
      props: {
        type: "number",
        step: "0.01",
      },
      state: { localValue: "{{value || 0}}" },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseFloat", // Parse to float
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    Currency: {
      element: "input",
      props: {
        type: "number",
        step: "0.01",
      },
      state: { localValue: "{{value || 0}}" },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseFloat", // Parse to float
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    // ════════════════════════════════════════════════════════
    // BOOLEAN
    // ════════════════════════════════════════════════════════

    Check: {
      element: "input",
      props: {
        type: "checkbox",
        checked: "{{value || false}}", // Use checked, not value
        disabled: "{{readOnly}}",
      },
      state: { localValue: "{{value || false}}" },
      events: {
        onChange: {
          updateState: "localValue",
          extract: "checked", // Extract e.target.checked instead of value
          delegate: "onChange",
        },
        // No onBlur for checkbox - change is immediate
      },
    },

    // ════════════════════════════════════════════════════════
    // DATE/TIME
    // ════════════════════════════════════════════════════════

    Date: {
      element: "input",
      props: { type: "date" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
        // No debounce for date picker - selection is final
      },
    },

    Datetime: {
      element: "input",
      props: { type: "datetime-local" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
      },
    },

    Time: {
      element: "input",
      props: { type: "time" },
      state: { localValue: "{{value}}" },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
      },
    },

    // ════════════════════════════════════════════════════════
    // SELECT
    // ════════════════════════════════════════════════════════

    Select: {
      element: "select",
      props: {
        disabled: "{{readOnly}}",
      },
      state: { localValue: "{{value}}" },
      children: [
        {
          element: "option",
          props: { value: "" },
          content: "",
        },
        {
          repeat:
            "{{(field.options || '').split('\\n').filter(o => o.trim())}}",
          element: "option",
          props: { value: "{{item}}" },
          content: "{{item}}",
        },
      ],
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
        // No onBlur for select - selection is final
      },
    },
    // ════════════════════════════════════════════════════════
    // LAYOUT FIELDS - NO INLINE STYLES
    // ════════════════════════════════════════════════════════

    "Section Break": {
      layoutOnly: true,
      render: function ({ field }) {
        if (!field.label) {
          return React.createElement("div", {
            className: globalThis.CWStyles.form.sectionBreak, // ✅ CSS only
          });
        }

        return React.createElement(
          "div",
          { className: globalThis.CWStyles.form.sectionBreak }, // ✅ CSS only
          React.createElement(
            "h4",
            {
              className: globalThis.CWStyles.form.sectionBreakTitle, // ✅ CSS only
            },
            field.label,
          ),
        );
      },
    },

    "Tab Break": {
      layoutOnly: true,
      render: function ({ field }) {
        return React.createElement(
          "div",
          { className: globalThis.CWStyles.form.tabBreak }, // ✅ CSS only
          field.label &&
            React.createElement(
              "h3",
              {
                className: globalThis.CWStyles.form.tabBreakTitle, // ✅ CSS only
              },
              field.label,
            ),
        );
      },
    },

    "Column Break": {
      layoutOnly: true,
      render: function () {
        return null; // ✅ CSS Grid handles layout
      },
    },

    Code: {
      element: "textarea",
      props: {
        rows: 10,
        className: "{{CWStyles.field.code}}",
      },
      state: {
        // ✅ Stringify objects for display in textarea
        localValue:
          "{{typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : (value || '')}}",
      },
      events: {
        onChange: {
          updateState: "localValue",
          // ✅ Try to parse JSON, otherwise keep as string
          delegate: function (value) {
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          },
        },
        onBlur: { delegate: "onBlur" },
        onKeyDown: {
          custom: true,
          handler: function (e, setState, handlers, field) {
            if (e.key === "Tab") {
              e.preventDefault();
              const start = e.target.selectionStart;
              const end = e.target.selectionEnd;
              const value = e.target.value;
              const newValue =
                value.substring(0, start) + "  " + value.substring(end);

              setState((prev) => ({ ...prev, localValue: newValue }));
              setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd = start + 2;
              }, 0);
            }
          },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    // ATTACH IMAGE - NO INLINE STYLES
    // ════════════════════════════════════════════════════════

    "Attach Image": {
      customComponent: true,
      render: function AttachImage({ field, value, handlers, run }) {
        const [preview, setPreview] = React.useState(value || null);
        const [uploading, setUploading] = React.useState(false);

        const handleFileSelect = async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
          }

          const reader = new FileReader();
          reader.onload = (e) => setPreview(e.target.result);
          reader.readAsDataURL(file);

          setUploading(true);
          const base64 = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.readAsDataURL(file);
          });

          if (handlers.onChange) {
            handlers.onChange(field.fieldname, base64);
          }
          setUploading(false);
        };

        const handleRemove = () => {
          setPreview(null);
          if (handlers.onChange) {
            handlers.onChange(field.fieldname, null);
          }
        };

        return React.createElement(
          "div",
          { className: globalThis.CWStyles.field.attachImageWrapper },

          preview &&
            React.createElement(
              "div",
              { className: globalThis.CWStyles.field.attachImagePreview },
              React.createElement("img", { src: preview }),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: globalThis.CWStyles.field.attachImageRemove,
                  onClick: handleRemove,
                },
                "×",
              ),
            ),

          !preview &&
            React.createElement("input", {
              type: "file",
              accept: "image/*",
              onChange: handleFileSelect,
              disabled: field.read_only || uploading,
            }),

          uploading &&
            React.createElement(
              "span",
              { className: globalThis.CWStyles.field.attachImageUploading },
              "Uploading...",
            ),
        );
      },
    },

    // ════════════════════════════════════════════════════════
    // MISSING EASY TYPES
    // ════════════════════════════════════════════════════════

    Percent: {
      element: "input",
      props: {
        type: "number",
        step: "0.01",
        min: "0",
        max: "100",
      },
      state: {
        localValue: "{{value === null || value === undefined ? '' : value}}",
      },
      events: {
        onChange: {
          updateState: "localValue",
          transform: "parseFloat",
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
      suffix: "%", // ✅ Will display % after input
    },

    "Text Editor": {
      element: "textarea",
      props: {
        rows: 10,
        className: "{{CWStyles.field.textarea}}",
      },
      state: {
        localValue: "{{value || ''}}",
      },
      events: {
        onChange: {
          updateState: "localValue",
          delegate: "onChange",
        },
        onBlur: { delegate: "onBlur" },
      },
    },

    Password: {
      element: "input",
      props: {
        type: "password",
        autoComplete: "current-password", //was autocomplete
      },
      state: { localValue: "{{value || ''}}" },
      events: {
        onChange: { updateState: "localValue", delegate: "onChange" },
        onBlur: { delegate: "onBlur" },
      },
    },

    // ════════════════════════════════════════════════════════
    // FIX: Read Only - Proper className concatenation
    // ════════════════════════════════════════════════════════

    "Read Only": {
      element: "input",
      props: {
        type: "text",
        readOnly: true,
        // ✅ Concatenate inside single template expression
        className: "{{CWStyles.field.input + ' ' + CWStyles.input.readOnly}}",
      },
      state: { localValue: "{{value || ''}}" },
      events: {}, // No events for read-only
    },

    HTML: {
      layoutOnly: true,
      render: function ({ field, value }) {
        // Display HTML content from field.options or value
        const htmlContent = field.options || value || "";

        return React.createElement("div", {
          className: globalThis.CWStyles.field.html,
          dangerouslySetInnerHTML: { __html: htmlContent },
        });
      },
    },

    Button: {
      customComponent: true,
      render: function ButtonField({ field, handlers, run }) {
        const handleClick = () => {
          if (handlers?.onButtonClick) {
            handlers.onButtonClick(field.fieldname, field.label);
          }
        };

        return React.createElement(
          "button",
          {
            type: "button",
            className: globalThis.CWStyles.button.primary,
            onClick: handleClick,
            disabled: field.read_only,
          },
          field.label || "Button",
        );
      },
    },

    // ════════════════════════════════════════════════════════
    // COMPLEX FIELDS (inline component definitions)
    // ════════════════════════════════════════════════════════

    Link: {
      customComponent: true,
      render: function LinkField({ field, value, handlers, run }) {
        const [options, setOptions] = React.useState([]);
        const [isOpen, setIsOpen] = React.useState(false);
        const [searchText, setSearchText] = React.useState(value || "");

        const loadOptions = async () => {
          const childRun = await run.child({
            operation: "select",
            doctype: field.options,
            query: { take: 50 },
            options: { render: false },
          });
          if (childRun.success) {
            const data = Array.isArray(childRun.target?.data)
              ? childRun.target.data
              : [];
            setOptions(data);
            setIsOpen(true);
          }
        };

        const handleSelect = (option) => {
          setSearchText(option.name);
          setIsOpen(false);
          if (handlers.onChange) {
            handlers.onChange(field.fieldname, option.name);
          }
          if (handlers.onBlur) {
            handlers.onBlur(field.fieldname, option.name);
          }
        };

        return React.createElement(
          "div",
          { className: globalThis.CWStyles.field.link },
          React.createElement("input", {
            type: "text",
            className: globalThis.CWStyles.field.linkInput,
            value: searchText,
            onFocus: loadOptions,
            onChange: (e) => setSearchText(e.target.value),
            placeholder: `Select ${field.label}...`,
            readOnly: field.read_only,
          }),
          isOpen &&
            Array.isArray(options) &&
            React.createElement(
              "div",
              {
                className: globalThis.CWStyles.field.linkDropdown,
                style: { display: "block" },
              },
              options.map((opt) =>
                React.createElement(
                  "div",
                  {
                    key: opt.name,
                    className: globalThis.CWStyles.field.linkOption,
                    onClick: () => handleSelect(opt),
                  },
                  opt.name,
                ),
              ),
            ),
        );
      },
    },
  },

  // ✅ Element defaults - applied automatically
  elementDefaults: {
    input: {
      className: "{{CWStyles.field.input}}",
      readOnly: "{{readOnly}}",
      placeholder: "{{field.placeholder}}",
    },

    textarea: {
      className: "{{CWStyles.field.textarea}}",
      readOnly: "{{readOnly}}",
      placeholder: "{{field.placeholder}}",
    },

    select: {
      className: "{{CWStyles.field.select}}",
      disabled: "{{readOnly}}",
    },
  },

  // ✅ Interaction config
  fieldInteractionConfig: {
    activeProfile: "default",
    profiles: {
      default: {
        onChange: { enabled: true, debounce: 300, action: "write_draft" },
        onBlur: { enabled: true, debounce: 0, action: "auto_save" },
        onButtonClick: {
          enabled: true,
          debounce: 0,
          action: "workflow_action",
        },
      },
    },
  },

  //== version 2 = checking for wrong combitations https://claude.ai/chat/fc16e068-e05b-4631-9ec0-928dface364a

  // ============================================================
  // FIELD HANDLERS CONFIG (Rendering Only)
  // ============================================================
  field_handlers: {
    // ===== TEXT FIELDS =====
    Data: {
      component: "FieldData",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    Text: {
      component: "FieldText",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Long Text": {
      component: "FieldLongText",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Small Text": {
      component: "FieldText",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Read Only": {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },

    // ===== NUMERIC FIELDS =====
    Int: {
      component: "FieldInt",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Float: {
      component: "FieldFloat",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Currency: {
      component: "FieldCurrency",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Percent: {
      component: "FieldFloat",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Rating: {
      component: "FieldInt",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },
    Duration: {
      component: "FieldFloat",
      category: "numeric",
      jstype: "number",
      value_processor: "numeric",
    },

    // ===== BOOLEAN FIELDS =====
    Check: {
      component: "FieldCheck",
      category: "boolean",
      jstype: "boolean",
      value_processor: "boolean",
    },

    // ===== CHOICE FIELDS =====
    Select: {
      component: "FieldSelect",
      category: "choice",
      jstype: "string",
      value_processor: "text",
      _optionsResolver: "_resolverSelect",
    },

    // ===== REFERENCE FIELDS =====
    Link: {
      component: "FieldLink",
      category: "reference",
      jstype: "string",
      value_processor: "text",
      _optionsResolver: "_resolverLink",
    },
    "Dynamic Link": {
      component: "FieldLink",
      category: "reference",
      jstype: "string",
      value_processor: "text",
    },

    // ===== DATE/TIME FIELDS =====
    Date: {
      component: "FieldDate",
      category: "date",
      jstype: "string",
      value_processor: "date",
    },
    Datetime: {
      component: "FieldDatetime",
      category: "date",
      jstype: "string",
      value_processor: "date",
    },
    Time: {
      component: "FieldTime",
      category: "date",
      jstype: "string",
      value_processor: "text",
    },

    // ===== MULTI-VALUE FIELDS =====
    MultiSelect: {
      _handler: "_handleMultiSelectField",
      category: "multi",
      jstype: "array",
      value_processor: "multi",
    },
    MultiCheck: {
      _handler: "_handleMultiCheckField",
      category: "multi",
      jstype: "array",
      value_processor: "multi",
    },

    // ===== CHILD TABLE FIELDS =====
    Table: {
      _handler: "_handleTableField",
      category: "child",
      jstype: "array",
      value_processor: "multi",
    },
    "Table MultiSelect": {
      _handler: "_handleTableMultiSelectField",
      category: "child",
      jstype: "array",
      value_processor: "multi",
    },

    // ===== MEDIA FIELDS =====
    Attach: {
      _handler: "_handleAttachField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },
    "Attach Image": {
      _handler: "_handleAttachImageField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },
    Image: {
      _handler: "_handleAttachImageField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },
    Signature: {
      _handler: "_handleSignatureField",
      category: "media",
      jstype: "string",
      value_processor: "text",
    },

    // ===== SPECIAL FIELDS =====
    HTML: {
      _handler: "_handleHTMLField",
      category: "layout",
      jstype: "string",
      value_processor: "text",
    },
    "HTML Editor": {
      _handler: "_handleHTMLEditorField",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    Code: {
      _handler: "_handleCodeField",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    "Markdown Editor": {
      _handler: "_handleMarkdownField",
      category: "text",
      jstype: "string",
      value_processor: "text",
    },
    JSON: {
      _handler: "_handleJSONField",
      category: "data",
      jstype: "object",
      value_processor: "text",
    },
    Geolocation: {
      _handler: "_handleGeolocationField",
      category: "data",
      jstype: "object",
      value_processor: "text",
    },

    // ===== INPUT FIELDS =====
    Autocomplete: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },
    Barcode: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },
    Color: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },
    Phone: {
      component: "FieldData",
      category: "input",
      jstype: "string",
      value_processor: "text",
    },

    // ===== LAYOUT FIELDS (no component needed) =====
    "Section Break": {
      category: "layout",
      jstype: "null",
    },
    "Column Break": {
      category: "layout",
      jstype: "null",
    },
    Heading: {
      category: "layout",
      jstype: "null",
    },
    Fold: {
      category: "layout",
      jstype: "null",
    },

    // ===== CONTROL FIELDS =====
    Button: {
      category: "control",
      jstype: "null",
    },
  },

  // ============================================================
  // FIELD METADATA (from Configuration doctype)
  // ============================================================
  fieldtypes: {
    all_fieldtypes: {
      Attach: { category: "media", jstype: "string" },
      AttachImage: { category: "media", jstype: "string" },
      Autocomplete: { category: "input", jstype: "string" },
      Barcode: { category: "input", jstype: "string" },
      Button: { category: "control", jstype: "null" },
      Check: { category: "boolean", jstype: "boolean" },
      Code: { category: "text", jstype: "string" },
      Color: { category: "input", jstype: "string" },
      "Column Break": { category: "layout", jstype: "null" },
      Currency: { category: "numeric", jstype: "number" },
      Data: { category: "text", jstype: "string" },
      Date: { category: "date", jstype: "string" },
      Datetime: { category: "date", jstype: "string" },
      Duration: { category: "numeric", jstype: "number" },
      "Dynamic Link": { category: "reference", jstype: "string" },
      Float: { category: "numeric", jstype: "number" },
      Fold: { category: "layout", jstype: "null" },
      Geolocation: { category: "data", jstype: "object" },
      Heading: { category: "layout", jstype: "null" },
      HTML: { category: "layout", jstype: "string" },
      "HTML Editor": { category: "text", jstype: "string" },
      Image: { category: "media", jstype: "string" },
      Int: { category: "numeric", jstype: "number" },
      JSON: { category: "data", jstype: "object" },
      Link: { category: "reference", jstype: "string" },
      "Long Text": { category: "text", jstype: "string" },
      "Markdown Editor": { category: "text", jstype: "string" },
      MultiCheck: { category: "multi", jstype: "array" },
      MultiSelect: { category: "multi", jstype: "array" },
      Percent: { category: "numeric", jstype: "number" },
      Phone: { category: "input", jstype: "string" },
      "Read Only": { category: "input", jstype: "string" },
      Rating: { category: "numeric", jstype: "number" },
      "Section Break": { category: "layout", jstype: "null" },
      Select: { category: "choice", jstype: "string" },
      Signature: { category: "media", jstype: "string" },
      "Small Text": { category: "text", jstype: "string" },
      Table: { category: "child", jstype: "array" },
      "Table MultiSelect": { category: "child", jstype: "array" },
      Text: { category: "text", jstype: "string" },
      Time: { category: "date", jstype: "string" },
    },

    boolean_fieldtypes: ["Check"],
    child_fieldtypes: ["Table", "Table MultiSelect"],
    date_fieldtypes: ["Date", "Datetime", "Duration", "Time"],
    html_fieldtypes: ["HTML", "HTML Editor", "Markdown Editor"],
    layout_fieldtypes: ["Column Break", "Fold", "Heading", "Section Break"],
    multi_value_fieldtypes: ["MultiCheck", "MultiSelect", "Table MultiSelect"],
    numeric_fieldtypes: [
      "Currency",
      "Duration",
      "Float",
      "Int",
      "Percent",
      "Rating",
    ],
    text_fieldtypes: [
      "Autocomplete",
      "Barcode",
      "Code",
      "Color",
      "Data",
      "Long Text",
      "Phone",
      "Read Only",
      "Select",
      "Small Text",
      "Text",
    ],

    link_behavior: {
      default: "lazy",
      overrides: {
        Company: "cached",
        Role: "lazy",
        User: "eager",
      },
    },

    std_fields_override: {
      creation: {
        jstype: "string",
        description: "ISO datetime string when created",
      },
      docstatus: { jstype: "number", enum: [0, 1, 2] },
      idx: { jstype: "number" },
      modified: { jstype: "string" },
      modified_by: { jstype: "string", link: "User" },
      name: { jstype: "string", description: "Primary key" },
      owner: { jstype: "string", link: "User" },
      parent: { jstype: "string", link: "Any" },
      parentfield: { jstype: "string" },
      parenttype: { jstype: "string" },
    },
  },

  // ============================================================
  // RENDER BEHAVIOR
  // ============================================================
  render_behavior: {
    value_processors: {
      boolean: "Boolean(value)",
      date: "new Date(value).toISOString()",
      numeric: "Number(value)",
      text: "String(value)",
      multi: "Array.isArray(value) ? value : []",
    },
  },

  // ============================================================
  // LAYOUT RULES
  // ============================================================
  layout_rules: {
    "Section Break": {
      type: "container",
      className: "form.section",
      creates_section: true,
      header: { type: "heading", level: 3, className: "form.sectionLabel" },
    },
    "Column Break": {
      type: "container",
      className: "form.column",
      creates_column: true,
    },
    _default: {
      type: "field",
      wrapper: { type: "container", className: "form.fieldWrapper" },
    },
  },

  // ============================================================
  // RENDER MAP (Universal Renderer Config)
  // ============================================================
  render_map: {
    container: { element: "div" },
    heading: { element: (cfg) => `h${cfg.level || 2}` },
    label: { element: "label" },
    field: { handler: "_renderField" },
    button: { element: "button" },
    link: { element: "a" },
    component: { handler: "_renderComponent" },
  },
};

console.log("Coworker Config Loaded:", CW._config);
