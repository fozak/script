// ============================================================
// CW-ui.js — React 18 UMD, no JSX, Tabler CSS
// ============================================================

const CW = globalThis.CW;
const ce = React.createElement;

// ============================================================
// RENDER SYSTEM
// ============================================================

// ============================================================
// RENDER SYSTEM
// ============================================================

CW._reactRoots = new Map();
CW._navStack   = [];
CW._navIndex   = -1;
CW.current_run = null;

CW._getOrCreateRoot = function (containerId) {
  if (!CW._reactRoots.has(containerId)) {
    const el = document.getElementById(containerId);
    if (el) CW._reactRoots.set(containerId, ReactDOM.createRoot(el));
  }
  return CW._reactRoots.get(containerId);
};

CW._isNavRun = function (run_doc) {
  return run_doc.component != null && run_doc.options?.render === true;
};

CW._render = function (run_doc) {
  if (!run_doc?.component || !run_doc?.container) return;
  const Comp = globalThis[run_doc.component];
  if (!Comp) return;
  if (CW._isNavRun(run_doc)) {
    if (CW._navStack[CW._navIndex] !== run_doc.name) {
      CW._navStack.push(run_doc.name);
      CW._navIndex = CW._navStack.length - 1;
    }
    CW.current_run = run_doc.name;
    _updateNavUI();
  }
  CW._getOrCreateRoot(run_doc.container)
    ?.render(ce(Comp, { run_doc, data: run_doc.target?.data || [] }));
};

CW.getCurrentRun = function () {
  return CW.runs[CW.current_run] || null;
};

// ============================================================
// NAVIGATION
// ============================================================

function _renderRun(run_doc) {
  if (CW._navStack[CW._navIndex] !== run_doc.name) {
    CW._navStack.push(run_doc.name);
    CW._navIndex = CW._navStack.length - 1;
  }
  CW.current_run = run_doc.name;
  CW._getOrCreateRoot(run_doc.container)
    ?.render(ce(globalThis[run_doc.component], { run_doc, data: run_doc.target?.data || [] }));
  _updateNavUI();
}

function navigate(direction) {
  const to = direction === 'back' ? CW._navIndex - 1 : CW._navIndex + 1;
  if (to < 0 || to >= CW._navStack.length) return false;
  CW._navIndex   = to;
  CW.current_run = CW._navStack[to];
  const run_doc  = CW.runs[CW.current_run];
  CW._getOrCreateRoot(run_doc.container)
    ?.render(ce(globalThis[run_doc.component], { run_doc, data: run_doc.target?.data || [] }));
  _updateNavUI();
  return true;
}

function navigateTo(runName) {
  const run_doc = CW.runs[runName];
  if (!run_doc || CW.current_run === runName) return false;
  _renderRun(run_doc);
  return true;
}

function _findGridRun(doctype) {
  for (let i = CW._navIndex - 1; i >= 0; i--) {
    const r = CW.runs[CW._navStack[i]];
    if (r?.view === 'list' &&
       (r.source_doctype === doctype || r.target_doctype === doctype))
      return CW._navStack[i];
  }
  return null;
}

function _getBreadcrumbs() {
  const current = CW.getCurrentRun();
  if (!current) return [{ text: 'Home', runName: null }];

  const home = CW._navStack[0] || null;

  if (current.view === 'list')
    return [
      { text: 'Home', runName: home },
      { text: current.source_doctype || current.target_doctype || 'List', runName: null },
    ];

 if (current.view === 'form') {
  const doctype  = current.source_doctype || current.target_doctype;
  const doc      = current.target?.data?.[0] || {};
  const docname  = doc[CW.Schema?.[doctype]?.title_field || 'name'] || doc.name || 'New';
  const gridRun  = _findGridRun(doctype);
  return [
    { text: 'Home', runName: home !== gridRun ? home : null },
    { text: doctype, runName: gridRun },
    { text: docname, runName: null },
  ];
}

  return [{ text: 'Home', runName: home }];
}

function _updateNavUI() {
  const bb = document.getElementById('back_btn');
  const fb = document.getElementById('forward_btn');
  if (bb) bb.disabled = CW._navIndex <= 0;
  if (fb) fb.disabled = CW._navIndex >= CW._navStack.length - 1;
  const el = document.getElementById('breadcrumbs');
  if (el)
    el.innerHTML = _getBreadcrumbs()
      .map((c, i, arr) => {
        const last = i === arr.length - 1;
        if (last)      return `<li class="breadcrumb-item active">${c.text}</li>`;
        if (c.runName) return `<li class="breadcrumb-item"><a href="#" onclick="navigateTo('${c.runName}');return false;">${c.text}</a></li>`;
        return         `<li class="breadcrumb-item">${c.text}</li>`;
      })
      .join('');
}

globalThis.navigate   = navigate;
globalThis.navigateTo = navigateTo;
globalThis.addEventListener('coworker:state:change', _updateNavUI);
// ============================================================
// BlockNote field
// ============================================================

const BlockNoteField = function ({
  field,
  run_doc,
  readOnly,
  timerRef,
  debounce,
}) {
  React.useEffect(() => {
    if (readOnly) return;
    let alive = true;
    import("./editor.js").then(({ mount }) => {
      if (!alive) return;
      mount({
        run_doc,
        fieldname: field.fieldname,
        onChange: (json) => {
          run_doc.input[field.fieldname] = json;
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            CW.controller(run_doc).catch((err) => console.error("[CW]", err));
          }, debounce);
        },
      });
    });
    return () => {
      alive = false;
      import("./editor.js").then(({ unmount }) => unmount(run_doc));
    };
  }, [run_doc.name]);

  if (readOnly) {
    const DisplayComp = globalThis[field.display || "TextRenderer"];
    return DisplayComp
      ? ce(DisplayComp, {
          content: run_doc.target?.data?.[0]?.[field.fieldname],
          run_doc,
        })
      : ce(
          "div",
          { className: "text-muted fst-italic" },
          "(no renderer for " + (field.display || "TextRenderer") + ")",
        );
  }

  return ce("div", {
    id: run_doc.name,
    style: {
      position: "relative",
      border: "1px solid var(--tblr-border-color)",
      borderRadius: "4px",
      minHeight: "240px",
    },
  });
};

//==============================================================
// FilePicker
//==============================================================

const Filepicker = function ({ field, run_doc, readOnly }) {
  const containerId = `${run_doc.name}-${field.fieldname}`

  React.useEffect(() => {
    let alive = true
    import('./filepicker.js').then(({ mount }) => {
      if (!alive) return
      mount({ run_doc, fieldname: field.fieldname, readOnly })
    })
    return () => {
      alive = false
      import('./filepicker.js').then(({ unmount }) => unmount(run_doc, field.fieldname))
    }
  }, [run_doc.name])

  return ce('div', { id: containerId })
}

// ============================================================
// CWComponent — fieldtype: Component
// ============================================================

const CWComponent = function ({
  field,
  run_doc,
  readOnly,
  timerRef,
  debounce,
}) {
  const containerId = run_doc.name + "_" + field.fieldname;

  React.useEffect(() => {
    if (readOnly) return;
    let alive = true;
    import(field.component)
      .then(({ mount }) => {
        if (!alive) return;
        mount({
          run_doc,
          fieldname: field.fieldname,
          onChange: (value) => {
            run_doc.input[field.fieldname] = value;
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(
              () =>
                CW.controller(run_doc).catch((e) =>
                  console.error("[CWComponent]", e),
                ),
              debounce,
            );
          },
        });
      })
      .catch((err) => {
        console.error("[CWComponent] module not found:", field.component, err);
        const el = document.getElementById(containerId);
        if (el)
          el.innerHTML =
            '<span class="text-danger">Component not loaded: ' +
            field.component +
            "</span>";
      });
    return () => {
      alive = false;
      import(field.component)
        .then(({ unmount }) => unmount?.(run_doc))
        .catch(() => {});
    };
  }, [run_doc.name]);

  if (readOnly) {
    const DisplayComp = globalThis[field.display || "TextRenderer"];
    return DisplayComp
      ? ce(DisplayComp, {
          content: run_doc.target?.data?.[0]?.[field.fieldname],
          run_doc,
        })
      : ce(
          "div",
          { className: "text-muted fst-italic" },
          "(no renderer: " + (field.display || "TextRenderer") + ")",
        );
  }

  return ce("div", {
    id: containerId,
    style: {
      position: "relative",
      border: "1px solid var(--tblr-border-color)",
      borderRadius: "4px",
      minHeight: "120px",
    },
  });
};

// ============================================================
// FIELD RENDERER
// ============================================================

const FieldRenderer = function ({ field, run_doc }) {

  const doc_ = run_doc.target?.data?.[0] || {};
  const readOnly =
    (doc_.docstatus ?? 0) !== 0 ||
    !["update", "create"].includes(run_doc.operation) ||
    field.read_only === 1;
  const initial = doc_[field.fieldname];
  
  const safeInitial =
    initial === null || initial === undefined
      ? field.fieldtype === "Check"
        ? 0
        : ""
      : field.fieldtype === "Check"
        ? Number(initial)
        : initial;

  const [prevName, setPrevName] = React.useState(doc_.name);
  const [localVal, setLocalVal] = React.useState(safeInitial);

  if (prevName !== doc_.name) {
    setPrevName(doc_.name);
    if (prevName !== null) setLocalVal(safeInitial);
  }

  const timerRef = React.useRef(null);
  const debounce =
    CW._config?.fieldInteractionConfig?.onChange?.debounce ?? 5000;

  const linkSchema = CW.Schema?.[field.options];
  const titleField = linkSchema?.title_field || "name";
  const [linkOpts, setLinkOpts] = React.useState([]);
  const [isOpen, setIsOpen] = React.useState(false);
//== serach in Link
const childRun  = CW._getChildRun(run_doc, field.fieldname);
  const linkRec   = childRun?.target?.data?.[0];
  const linkLabel = linkRec?.[titleField] || linkRec?.name || '';

  const [searchText, setSearch] = React.useState(
    field.fieldtype === "Link" ? linkLabel || safeInitial || "" : "",
  );

  if (prevName !== doc_.name && field.fieldtype === "Link")
    setSearch(safeInitial || "");

  const childSchema = CW.Schema?.[field.options];

  const commitField = (val) => {
    if (val === run_doc.target?.data?.[0]?.[field.fieldname]) return;
    run_doc.input[field.fieldname] = val;
    CW.controller(run_doc).catch((err) => console.error("[CW]", err));
  };

  const onChange = (val) => {
    setLocalVal(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commitField(val), debounce);
  };

  const onBlur = (val) => {
    clearTimeout(timerRef.current);
    commitField(val);
  };

  if (field.fieldtype === "BlockNote")
    return ce(BlockNoteField, { field, run_doc, readOnly, timerRef, debounce });

  if (field.fieldtype === "Filepicker")
    return ce(Filepicker, { field, run_doc, readOnly });

  if (field.fieldtype === "Component")
    return ce(CWComponent, { field, run_doc, readOnly, timerRef, debounce });

  if (field.fieldtype === "SharePanel")
    return ce(SharePanel, { field, run_doc, readOnly });

  if (field.fieldtype === "Section Break")
    return ce(
      "div",
      { className: "col-12 mt-3" },
      field.label ? ce("h5", { className: "mb-2" }, field.label) : null,
      ce("hr", { className: "mt-0" }),
    );

  if (field.fieldtype === "Column Break") return null;

  // Datetime — special formatting needed before readOnly gate
  if (field.fieldtype === "Datetime") {
    const ts = Number(localVal);
    const display =
      ts && !isNaN(ts)
        ? new Date(ts).toISOString().slice(0, 16)
        : localVal || "";
    return ce("input", {
      type: "datetime-local",
      className: "form-control",
      value: display,
      readOnly: readOnly,
      onChange: readOnly
        ? undefined
        : (e) => onChange(new Date(e.target.value).getTime()),
      onBlur: readOnly
        ? undefined
        : (e) => onBlur(new Date(e.target.value).getTime()),
    });
  }

  // universal readOnly gate — all editable fieldtypes below never execute when readOnly
  if (readOnly)
    return ce("input", {
      type: "text",
      className: "form-control",
      value:
        typeof localVal === "object"
          ? JSON.stringify(localVal)
          : String(localVal ?? ""),
      readOnly: true,
    });

  if (field.fieldtype === "Check")
    return ce(
      "div",
      { className: "form-check" },
      ce("input", {
        type: "checkbox",
        className: "form-check-input",
        checked: !!localVal,
        onChange: (e) => {
          const v = e.target.checked ? 1 : 0;
          setLocalVal(v);
          commitField(v);
        },
      }),
    );

  if (field.fieldtype === "Select") {
    const opts = (field.options || "").split("\n").filter(Boolean);
    return ce(
      "select",
      {
        className: "form-select",
        value: localVal,
        onChange: (e) => {
          setLocalVal(e.target.value);
          commitField(e.target.value);
        },
      },
      ce("option", { value: "" }, ""),
      opts.map((o) => ce("option", { key: o, value: o }, o)),
    );
  }

  if (["Int", "Float", "Currency", "Percent"].includes(field.fieldtype))
    return ce("input", {
      type: "number",
      className: "form-control",
      value: localVal,
      step: field.fieldtype === "Int" ? "1" : "0.01",
      onChange: (e) =>
        onChange(
          field.fieldtype === "Int"
            ? parseInt(e.target.value) || 0
            : parseFloat(e.target.value) || 0,
        ),
      onBlur: (e) =>
        onBlur(
          field.fieldtype === "Int"
            ? parseInt(e.target.value) || 0
            : parseFloat(e.target.value) || 0,
        ),
    });

  if (field.fieldtype === "Date")
    return ce("input", {
      type: "date",
      className: "form-control",
      value: localVal,
      onChange: (e) => onChange(e.target.value),
      onBlur: (e) => onBlur(e.target.value),
    });

  if (field.fieldtype === "Time")
    return ce("input", {
      type: "time",
      className: "form-control",
      value: localVal,
      onChange: (e) => onChange(e.target.value),
      onBlur: (e) => onBlur(e.target.value),
    });

  if (["Text", "Long Text", "Text Editor"].includes(field.fieldtype))
    return ce("textarea", {
      className: "form-control",
      rows: field.fieldtype === "Long Text" ? 6 : 3,
      value: localVal,
      onChange: (e) => onChange(e.target.value),
      onBlur: (e) => onBlur(e.target.value),
    });

  if (field.fieldtype === "Code") {
    const dv =
      typeof localVal === "object"
        ? JSON.stringify(localVal, null, 2)
        : localVal || "";
    return ce("textarea", {
      className: "form-control font-monospace",
      rows: 6,
      value: dv,
      onChange: (e) => {
        setLocalVal(e.target.value);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          try {
            run_doc.input[field.fieldname] = JSON.parse(e.target.value);
          } catch (_) {
            run_doc.input[field.fieldname] = e.target.value;
          }
          CW.controller(run_doc).catch((err) => console.error("[CW]", err));
        }, 300);
      },
      onBlur: (e) => {
        clearTimeout(timerRef.current);
        try {
          run_doc.input[field.fieldname] = JSON.parse(e.target.value);
        } catch (_) {
          run_doc.input[field.fieldname] = e.target.value;
        }
        CW.controller(run_doc).catch((err) => console.error("[CW]", err));
      },
    });
  }

  if (field.fieldtype === "Password")
    return ce("input", {
      type: "password",
      className: "form-control",
      value: localVal,
      onChange: (e) => onChange(e.target.value),
      onBlur: (e) => onBlur(e.target.value),
    });
//Table and Uggrid refactoring
if (field.fieldtype === "Table")
  return ce(UniversalGrid, { run_doc, field });

  if (field.fieldtype === "Dynamic Link") {
    field = { ...field, fieldtype: "Link", options: doc_[field.options] || "" };
  }

  if (field.fieldtype === "Link") {
    const loadOptions = async () => {
      if (isOpen) return;  // already open — return
      if (!field.options) return;
      const cr = await run_doc.child({
        operation: "select",
        target_doctype: field.options,
        query: { take: 50, select: ["name", titleField] },
        options: { render: false },
        source_field: field.fieldname,
      });
      if (cr.success) {
        const opts = cr.target?.data || [];
        const current = opts.find((o) => o.name === localVal);
        if (current) setSearch(current[titleField] || current.name);
        setLinkOpts(opts);
        setIsOpen(true);
      }
    };
    return ce(
      "div",
      { className: "position-relative" },
      ce("input", {
        type: "text",
        className: "form-control",
        value: searchText,
        placeholder: `Select ${field.label || field.fieldname}...`,
        readOnly,
        onFocus: () => {
          if (!readOnly) loadOptions();
        },
        onChange: (e) => setSearch(e.target.value),
        onBlur: () => {
          setTimeout(() => setIsOpen(false), 200);
        },
      }),
      isOpen &&
        linkOpts.length > 0 &&
        ce(
          "div",
          {
            className: "dropdown-menu show w-100",
            style: { maxHeight: "200px", overflowY: "auto", zIndex: 1050 },
          },
          linkOpts
            .filter((o) => o.name)
            .map((o) =>
              ce(
                "button",
                {
                  key: o.name,
                  className: "dropdown-item",
                  type: "button",
                  onMouseDown: (e) => {
                    e.preventDefault();
                    setSearch(o[titleField] || o.name);
                    setIsOpen(false);
                    commitField(o.name);
                  },
                },
                o[titleField] || o.name,
              ),
            ),
        ),
    );
  }

if (field.fieldtype === "Relationship Panel")
    return ce(RelationshipPanel, { run_doc, field });

  return ce("input", {
    type: "text",
    className: "form-control",
    value: localVal,
    readOnly: readOnly,
    onChange: readOnly ? undefined : (e) => onChange(e.target.value),
    onBlur: readOnly ? undefined : (e) => onBlur(e.target.value),
  });
};

// ============================================================
// FORM ACTIONS
// Renders outside + ••• button groups from CW._getFormButtons
// ============================================================

const FormActions = function ({ run_doc }) {
  const { outside, menu } = CW._getFormButtons(run_doc);

  const onFsmClick = (btn) => {
    if (btn.confirm && !window.confirm(btn.confirm)) return;
    run_doc.input._state = Object.assign(
      {},
      Object.fromEntries(
        Object.entries(run_doc.input._state || {}).filter(([, v]) => v === "1"),
      ),
      { [btn.signal]: "" },
    );
    CW.controller(run_doc).catch((err) => console.error("[CW]", err));
  };

  return ce(
    "div",
    { className: "d-flex gap-2 align-items-center" },

    // outside •••: Save + primary FSM buttons
    ...outside.map((btn) =>
      btn.type === "save"
        ? ce(
            "button",
            {
              key: "save",
              className: "btn btn-primary btn-sm",
              onClick: () => {
                run_doc.operation = "select";
                CW._render(run_doc);
              },
            },
            btn.label,
          )
        : ce(
            "button",
            {
              key: btn.signal,
              className: "btn btn-primary btn-sm",
              onClick: () => onFsmClick(btn),
            },
            btn.label,
          ),
    ),

    // ••• dropdown: Edit + non-primary dim 0 + dim 1+
    menu.length > 0 &&
      ce(
        "div",
        { key: "menu", className: "dropdown" },
        ce(
          "button",
          {
            className: "btn btn-ghost-secondary btn-sm",
            "data-bs-toggle": "dropdown",
            "aria-expanded": "false",
          },
          "•••",
        ),
        ce(
          "ul",
          { className: "dropdown-menu dropdown-menu-end" },
          ...menu.map((btn) =>
            btn.type === "edit"
              ? ce(
                  "li",
                  { key: "edit" },
                  ce(
                    "button",
                    {
                      className: "dropdown-item",
                      onClick: () => {
                        run_doc.operation = "update";
                        CW._render(run_doc);
                      },
                    },
                    btn.label,
                  ),
                )
              : ce(
                  "li",
                  { key: btn.signal },
                  ce(
                    "button",
                    {
                      className: "dropdown-item",
                      onClick: () => onFsmClick(btn),
                    },
                    btn.label,
                  ),
                ),
          ),
        ),
      ),
  );
};

// ============================================================
// MAIN FORM
// ============================================================

const MainForm = function ({ run_doc }) {
  console.log('MainForm render', 'time:', Date.now());
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  const schema = CW.Schema?.[doctype];
  const doc = run_doc.target?.data?.[0] || {};

  // auto-switch to update for non-explicit-intent doctypes with editable records
  if (
    !schema?.explicit_edit_intent &&
    (doc.docstatus ?? 0) === 0 &&
    doc.name &&
    run_doc.operation === "select"
  )
    run_doc.operation = "update";

  if (!schema)
    return ce(
      "div",
      { className: "alert alert-warning" },
      `Schema not found: ${doctype}`,
    );

  const title = doc[schema.title_field || "name"] || doc.name || "New";

  const fields = schema.fields || [];
  //============================================================

  const skipTypes = new Set(["Column Break", "Tab Break", "HTML"]);

  // badge from dim 0 current state

  const stateDef = CW._getStateDef(doctype);
  const dim0 = stateDef?.["0"];
  const current = CW._getDimValue(doc, "0", dim0);
  const badgeLabel = dim0?.options?.[current] || "";
  const badgeCls =
    ["bg-warning", "bg-success", "bg-danger"][current] || "bg-secondary";

  return ce(
    "div",
    { className: "card" },
    ce(
      "div",
      {
        className:
          "card-header d-flex justify-content-between align-items-center",
      },
      ce("h3", { className: "card-title mb-0" }, title),
      ce(
        "div",
        { className: "d-flex gap-2 align-items-center" },
        CW._config.ui?.show_state_badges !== false && badgeLabel
          ? ce("span", { className: `badge ${badgeCls}` }, badgeLabel)
          : null,
        ce(FormActions, { run_doc }),
      ),
    ),
    ce(
      "div",
      { className: "card-body" },
      ce(
        "div",
        { className: "row g-3" },
        fields
          .filter((f) => !f.hidden) //added hidden
          .filter((f) => evaluateDependsOn(f.depends_on, doc, run_doc))
          .filter((f) => !skipTypes.has(f.fieldtype))
          .map((f) =>
            f.fieldtype === "Section Break"
              ? ce(
                  "div",
                  { key: f.fieldname, className: "col-12 mt-2" },
                  f.label ? ce("h5", { className: "mb-1" }, f.label) : null,
                  ce("hr", { className: "mt-0 mb-2" }),
                )
              : ce(
                  "div",
                  {
                    key: f.fieldname,
                    className:
              ["Relationship Panel", "Table"].includes(f.fieldtype)
  ? "col-12"
  : "col-md-6",
                  },
                  f.label &&
                    f.fieldtype !== "Relationship Panel" &&
                    ce(
                      "label",
                      { className: "form-label" },
                      f.label,
                      f.reqd &&
                        ce("span", { className: "text-danger ms-1" }, "*"),
                    ),
                  f.fieldtype === "Relationship Panel" &&
                    ce(
                      "h6",
                      { className: "mb-2 text-muted" },
                      f.label || "Relationships",
                    ),
                  ce(FieldRenderer, { field: f, run_doc }),
                ),
          ),
      ),
    ),
    run_doc.error &&
      ce(
        "div",
        { className: "card-footer" },
        ce(
          "div",
          { className: "alert alert-danger mb-0" },
          typeof run_doc.error === "string"
            ? run_doc.error
            : run_doc.error.message,
        ),
      ),
  );
};

// ============================================================
// MAIN GRID
// ============================================================

const MainGrid = function ({ run_doc, data }) {
  const doctype = run_doc.source_doctype || run_doc.target_doctype;
  const schema = CW.Schema?.[doctype];
  const titleField = schema?.title_field || "name";

  const [viewMode, setViewMode] = React.useState("list");
  const [sortCol, setSortCol] = React.useState(null);
  const [sortDir, setSortDir] = React.useState("asc");
  const [searchTerm, setSearchTerm] = React.useState("");
  const searchTimerRef = React.useRef(null);

  const _profile =
    CW._config?.fieldInteractionConfig?.activeProfile ?? "default";
  const _searchDelay =
    CW._config?.fieldInteractionConfig?.profiles?.[_profile]?.onChange
      ?.debounce ??
    CW._config?.fieldInteractionConfig?.triggers?.onChange?.debounce ??
    300;

  const listFields = React.useMemo(
    () => CW._getListFields(run_doc),
    [doctype, data.length],
  );

  const rows = React.useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = String(a[sortCol] ?? "");
      const bv = String(b[sortCol] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [data, sortCol, sortDir]);

  const toggleSort = (fieldname) => {
    if (sortCol === fieldname)
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(fieldname);
      setSortDir("asc");
    }
  };

  const onCardAction = async (record, btn) => {
    if (btn.confirm && !window.confirm(btn.confirm)) return;
    await run_doc.child({
      operation: "update",
      target_doctype: doctype,
      query: { where: { name: record.name } },
      input: { _state: { [btn.signal]: "" } },
      options: { render: false, internal: true },
    });
  };

  const onRowClick = (record) => {
    run_doc.child({
      operation: "select",
      target_doctype: record.doctype || doctype,
      query: { where: { name: record.name } },
      view: "form",
      options: { render: true },
    });
  };

  const onNew = () => {
    run_doc.child({
      operation: "create",
      target_doctype: doctype,
      view: "form",
      options: { render: true },
    });
  };

  const onSearchChange = (val) => {
    setSearchTerm(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => CW.searchGrid(val), _searchDelay);
  };

  const onSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      clearTimeout(searchTimerRef.current);
      CW.searchGrid(searchTerm);
    }
    if (e.key === "Escape") {
      setSearchTerm("");
      clearTimeout(searchTimerRef.current);
      CW.searchGrid("");
    }
  };

  const toolbar = ce(
    "div",
    { className: "d-flex align-items-center gap-2 mb-2 px-1" },

    ce(
      "button",
      { className: "btn btn-primary btn-sm flex-shrink-0", onClick: onNew },
      "+ New",
    ),

    ce(
      "div",
      { className: "input-group input-group-sm flex-grow-1" },
      ce("span", { className: "input-group-text" }, "🔍"),
      ce("input", {
        type: "text",
        className: "form-control",
        placeholder:
          "Search or filter…  e.g. toyota  status:Open  priority:High",
        value: searchTerm,
        onChange: (e) => onSearchChange(e.target.value),
        onKeyDown: onSearchKeyDown,
      }),
      searchTerm &&
        ce(
          "button",
          {
            className: "btn btn-outline-secondary",
            onClick: () => {
              setSearchTerm("");
              CW.searchGrid("");
            },
            title: "Clear search",
          },
          "×",
        ),
    ),

    ce(
      "div",
      { className: "btn-group btn-group-sm flex-shrink-0" },
      ce(
        "button",
        {
          className: `btn ${viewMode === "list" ? "btn-secondary" : "btn-outline-secondary"}`,
          onClick: () => setViewMode("list"),
          title: "List",
        },
        "≡",
      ),
      ce(
        "button",
        {
          className: `btn ${viewMode === "card" ? "btn-secondary" : "btn-outline-secondary"}`,
          onClick: () => setViewMode("card"),
          title: "Card",
        },
        "⊞",
      ),
    ),
  );

  if (!rows.length)
    return ce(
      "div",
      { className: "card" },
      ce(
        "div",
        { className: "card-header" },
        ce("h3", { className: "card-title mb-0" }, doctype),
      ),
      ce(
        "div",
        { className: "card-body" },
        toolbar,
        ce("div", { className: "alert alert-info mb-0" }, "No records found"),
      ),
    );

  const listView = ce(
    "div",
    { className: "table-responsive" },
    ce(
      "table",
      { className: "table table-vcenter table-hover card-table mb-0" },
      ce(
        "thead",
        {},
        ce(
          "tr",
          {},
          listFields.map((f) =>
            ce(
              "th",
              {
                key: f.fieldname,
                style: { cursor: "pointer", userSelect: "none" },
                onClick: () => toggleSort(f.fieldname),
              },
              f.label || f.fieldname,
              sortCol === f.fieldname
                ? sortDir === "asc"
                  ? " ↑"
                  : " ↓"
                : " ↕",
            ),
          ),
        ),
      ),
      ce(
        "tbody",
        {},
        rows.map((row) =>
          ce(
            "tr",
            {
              key: row.id || row.name,
              style: { cursor: "pointer" },
              onClick: () => onRowClick(row),
            },
            listFields.map((f) =>
              ce("td", { key: f.fieldname }, String(row[f.fieldname] ?? "")),
            ),
          ),
        ),
      ),
    ),
  );

  const cardView = ce(
    "div",
    { className: "row g-2" },
    rows.map((record) => {
      const btns = CW._getTransitions(schema, record, "0");
      const title = record[titleField] || record.name;
      return ce(
        "div",
        { key: record.id || record.name, className: "col-12" },
        ce(
          "div",
          { className: "card card-sm" },
          ce(
            "div",
            { className: "card-body" },
            ce(
              "div",
              { className: "d-flex justify-content-between align-items-start" },
              ce(
                "div",
                {
                  style: { flex: 1, cursor: "pointer" },
                  onClick: () => onRowClick(record),
                },
                ce("div", { className: "fw-bold mb-1" }, title),
                ce(
                  "div",
                  { className: "d-flex flex-wrap gap-3" },
                  listFields.map((f) =>
                    record[f.fieldname] != null && record[f.fieldname] !== ""
                      ? ce(
                          "span",
                          { key: f.fieldname, className: "text-muted small" },
                          ce(
                            "span",
                            { className: "text-secondary" },
                            `${f.label || f.fieldname}: `,
                          ),
                          String(record[f.fieldname]),
                        )
                      : null,
                  ),
                ),
              ),
              btns.length > 0 &&
                ce(
                  "div",
                  { className: "d-flex gap-1 ms-3 flex-shrink-0" },
                  btns.map((btn) =>
                    ce(
                      "button",
                      {
                        key: btn.signal,
                        className: btn.signal.endsWith("_2")
                          ? "btn btn-sm btn-danger"
                          : "btn btn-sm btn-outline-primary",
                        onClick: (e) => {
                          e.stopPropagation();
                          onCardAction(record, btn);
                        },
                      },
                      btn.label,
                    ),
                  ),
                ),
            ),
          ),
        ),
      );
    }),
  );

  return ce(
    "div",
    { className: "card" },
    ce(
      "div",
      { className: "card-header" },
      ce("h3", { className: "card-title mb-0" }, doctype),
    ),
    ce(
      "div",
      { className: viewMode === "list" ? "card-body p-0" : "card-body" },
      ce(
        "div",
        { className: viewMode === "list" ? "px-3 pt-3 pb-2" : "pb-2" },
        toolbar,
      ),
      viewMode === "list" ? listView : cardView,
    ),
  );
};

// ============================================================
// MultiSelectPanel — reusable multi-source async multi-select
// ============================================================

const MultiSelectPanel = function ({
  sources,
  value,
  onChange,
  readOnly,
  run_doc,
  grouped,
}) {
  const [selected, setSelected] = React.useState(
    Array.isArray(value) ? value : [],
  );
  const [search, setSearch] = React.useState("");
  const [opts, setOpts] = React.useState([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [labels, setLabels] = React.useState({});

  React.useEffect(() => {
    setSelected(Array.isArray(value) ? value : []);
  }, [JSON.stringify(value)]);

  React.useEffect(() => {
    if (!selected.length) return;
    const unresolved = selected.filter((id) => !labels[id]);
    if (!unresolved.length) return;
    (async () => {
      const newLabels = { ...labels };
      for (const src of sources) {
        const schema = CW.Schema?.[src.doctype];
        const labelField = src.labelField || schema?.title_field || "name";
        const cr = await run_doc.child({
  operation: "select",
  target_doctype: src.doctype,
  query: { take: 100 },
  options: { render: false },
  source_field: "_allowed",  // ← add — needs source_field prop threaded in from SharePanel
});
        for (const rec of cr.target?.data || []) {
          const id = src.transform ? src.transform(rec.name) : rec.name;
          if (unresolved.includes(id))
            newLabels[id] = {
              label: rec[labelField] || rec.name,
              icon: src.icon || "•",
            };
        }
      }
      setLabels(newLabels);
    })();
  }, [JSON.stringify(selected)]);

  const loadOpts = async (term) => {
    setLoading(true);
    const results = [];
    for (const src of sources) {
      const schema = CW.Schema?.[src.doctype];
      const labelField = src.labelField || schema?.title_field || "name";
      const cr = await run_doc.child({
  operation: "select",
  target_doctype: src.doctype,
  query: { filter: term ? `data.${labelField} ~ "${term}"` : "", take: 20 },
  options: { render: false },
  source_field: "_allowed",  // ← add — same, needs prop
});
      for (const rec of cr.target?.data || []) {
        const id = src.transform ? src.transform(rec.name) : rec.name;
        if (!selected.includes(id))
          results.push({
            id,
            label: rec[labelField] || rec.name,
            icon: src.icon || "•",
            source: src.doctype,
          });
      }
    }
    setOpts(results);
    setLoading(false);
    setIsOpen(true);
  };

  const onSelect = (opt) => {
    const next = [...selected, opt.id];
    setSelected(next);
    setSearch("");
    setIsOpen(false);
    onChange?.(next);
  };

  const onRemove = (id) => {
    const next = selected.filter((s) => s !== id);
    setSelected(next);
    onChange?.(next);
  };

  const groupedOpts = React.useMemo(() => {
    if (!grouped) return [{ label: null, items: opts }];
    const map = {};
    for (const opt of opts) {
      if (!map[opt.source]) map[opt.source] = [];
      map[opt.source].push(opt);
    }
    return Object.entries(map).map(([label, items]) => ({ label, items }));
  }, [opts, grouped]);

  return ce(
    "div",
    { className: "cw-multiselect" },
    ce(
      "div",
      { className: "d-flex flex-wrap gap-1 mb-2" },
      selected.map((id) => {
        const info = labels[id];
        return ce(
          "span",
          {
            key: id,
            className:
              "badge bg-secondary-subtle text-secondary-emphasis d-flex align-items-center gap-1",
            style: { fontSize: 13, padding: "4px 8px" },
          },
          info?.icon && ce("span", {}, info.icon),
          ce("span", {}, info?.label || id),
          !readOnly &&
            ce("button", {
              className: "btn-close ms-1",
              style: { fontSize: 10 },
              onClick: () => onRemove(id),
            }),
        );
      }),
    ),
    !readOnly &&
      ce(
        "div",
        { className: "position-relative" },
        ce("input", {
          type: "text",
          className: "form-control form-control-sm",
          placeholder: "Search...",
          value: search,
          onChange: (e) => {
            setSearch(e.target.value);
            loadOpts(e.target.value);
          },
          onFocus: () => loadOpts(search),
          onBlur: () => setTimeout(() => setIsOpen(false), 200),
        }),
        isOpen &&
          ce(
            "div",
            {
              className: "dropdown-menu show w-100",
              style: { maxHeight: 240, overflowY: "auto", zIndex: 1050 },
            },
            loading &&
              ce(
                "div",
                { className: "dropdown-item text-muted small" },
                "Loading...",
              ),
            !loading &&
              opts.length === 0 &&
              ce(
                "div",
                { className: "dropdown-item text-muted small" },
                "No results",
              ),
            !loading &&
              groupedOpts
                .map((group, gi) => [
                  group.label &&
                    ce(
                      "h6",
                      { key: `hdr-${gi}`, className: "dropdown-header" },
                      group.label,
                    ),
                  ...group.items.map((opt) =>
                    ce(
                      "button",
                      {
                        key: opt.id,
                        className:
                          "dropdown-item d-flex align-items-center gap-2",
                        type: "button",
                        onMouseDown: (e) => {
                          e.preventDefault();
                          onSelect(opt);
                        },
                      },
                      ce("span", {}, opt.icon),
                      ce("span", {}, opt.label),
                    ),
                  ),
                ])
                .flat(),
          ),
      ),
  );
};
globalThis.MultiSelectPanel = MultiSelectPanel;

// ============================================================
// SharePanel — _allowed + _allowed_read via MultiSelectPanel
// ============================================================

const SharePanel = function ({ field, run_doc, readOnly }) {
  const doc = run_doc.target?.data?.[0] || {};
  const doctype = run_doc.target_doctype;

  const allSources = [
    {
      doctype: "UserPublicProfile",
      labelField: "full_name",
      icon: "👤",
      transform: (id) => "user" + id.slice(4),
    },
    {
      doctype: "Role",
      labelField: "role_name",
      icon: "🔑",
    },
  ];

  const commit = (field, next) => {
run_doc.child({
  operation: "update",
  target_doctype: doctype,
  query: { where: { name: doc.name } },
  input: { [field]: next },
  options: { internal: true, render: false },
  source_field: field,  // ← add — field is "_allowed" or "_allowed_read"
})
  };

  return ce(
    "div",
    { className: "d-flex flex-column gap-3" },
    ce(
      "div",
      {},
      ce("label", { className: "form-label fw-medium" }, "✏️ Can edit"),
      ce(MultiSelectPanel, {
        sources: allSources,
        value: doc._allowed || [],
        onChange: (next) => commit("_allowed", next),
        readOnly,
        run_doc,
        grouped: true,
      }),
    ),
    ce(
      "div",
      {},
      ce("label", { className: "form-label fw-medium" }, "👁 Can view"),
      ce(MultiSelectPanel, {
        sources: allSources,
        value: doc._allowed_read || [],
        onChange: (next) => commit("_allowed_read", next),
        readOnly,
        run_doc,
        grouped: true,
      }),
    ),
  );
};
globalThis.SharePanel = SharePanel;

// ============================================================
// RelationshipPanel — uses MultiSelectPanel for record search
// ============================================================

const RelationshipPanel = function ({ run_doc }) {
  const doc = run_doc.target?.data?.[0] || {};
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  const docName = doc.name;

  const typeMap = React.useMemo(() => {
    const map = {};
    const dtConf = CW._config?.relationshipTypes?.[doctype] || {};
    for (const [relatedDoctype, types] of Object.entries(dtConf)) {
      for (const type of types) map[type] = relatedDoctype;
    }
    return map;
  }, [doctype]);

  const allTypes = Object.keys(typeMap);

  const [rels, setRels] = React.useState([]);
  const [loaded, setLoaded] = React.useState(false);
  const [selType, setSelType] = React.useState("");
  const [selName, setSelName] = React.useState("");
  const [selTitle, setSelTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const loadRels = React.useCallback(async () => {
    if (!docName) return;
    const cr = await run_doc.child({
  operation: "select",
  target_doctype: "Relationship",
  query: { where: { parent: docName, parentfield: "relationships" } },
  view: "form",
  options: { render: false },
  source_field: "relationships",  // ← add
});
    if (cr.success) setRels(cr.target?.data || []);
    setLoaded(true);
  }, [docName]);

  React.useEffect(() => {
    loadRels();
  }, [docName]);

  const onAdd = async () => {
    if (!selType || !selName) return;
    setSaving(true);
    const cr = await run_doc.child({
      operation: "create",
      target_doctype: "Relationship",
      input: {
        related_doctype: typeMap[selType],
        related_name: selName,
        related_title: selTitle || selName,
        type: selType,
        notes,
        parent: docName,
        parenttype: doctype,
        parentfield: "relationships",
      
      }, 
      source_field: "relationships",  // ← add
      options: { render: false },
    });
    setSaving(false);
    if (!cr.error) {
      setSelType("");
      setSelName("");
      setSelTitle("");
      setNotes("");
      await loadRels();
    }
  };

  const onRelAction = async (rel, btn) => {
    const cr = await run_doc.child({
      operation: "update",
      target_doctype: "Relationship",
      query: { where: { name: rel.name } },
      input: { _state: { [btn.signal]: "" } },
      options: { render: false, internal: true },
       source_field: "relationships",  // ← add
    });
    if (!cr.error) await loadRels();
  };

  const statusBadge = (rel) => {
    const dim0 = CW._getStateDef("Relationship")?.["0"];
    const cur = CW._getDimValue(rel, "0", dim0);
    const label = dim0?.options?.[cur] || "";
    const cls =
      ["bg-warning text-dark", "bg-success", "bg-danger"][cur] ||
      "bg-secondary";
    return label ? ce("span", { className: `badge ${cls} ms-1` }, label) : null;
  };

  const relatedDoctype = typeMap[selType] || "";
  const titleField = CW.Schema?.[relatedDoctype]?.title_field || "name";

  const relSource = relatedDoctype
    ? [
        {
          doctype: relatedDoctype,
          labelField: titleField,
          icon: "🔗",
        },
      ]
    : [];

  return ce(
    "div",
    { className: "mt-3" },

    loaded &&
      rels.length > 0 &&
      ce(
        "div",
        { className: "mb-3" },
        rels.map((rel) => {
          const relSchema = CW.Schema?.Relationship || {};
          const btns = CW._getTransitions(relSchema, rel, "0");
          return ce(
            "div",
            {
              key: rel.id || rel.name,
              className:
                "border rounded p-2 mb-2 d-flex justify-content-between align-items-center",
              style: { cursor: "pointer" },
              onClick: (e) => {
                // Don't navigate if user clicked a button
                if (e.target.tagName === "BUTTON") return;
                run_doc.child({
                  operation: "select",
                  target_doctype: "Relationship",
                  query: { where: { name: rel.name } },
                  view: "form",
                  options: { render: true },
                   source_field: "relationships",  // ← add
                });
              },
            },
            ce(
              "div",
              {},
              ce(
                "div",
                { className: "d-flex align-items-center gap-2" },
                ce(
                  "span",
                  { className: "fw-medium" },
                  rel.related_title || rel.related_name,
                ),
                ce("span", { className: "text-muted small" }, rel.type),
                statusBadge(rel),
              ),
              rel.notes &&
                ce("div", { className: "text-muted small mt-1" }, rel.notes),
            ),
            ce(
              "div",
              { className: "d-flex gap-1" },
              btns.map((btn) =>
                ce(
                  "button",
                  {
                    key: btn.signal,
                    className: btn.signal.endsWith("_2")
                      ? "btn btn-sm btn-outline-danger"
                      : btn.signal.endsWith("_0")
                        ? "btn btn-sm btn-outline-secondary"
                        : "btn btn-sm btn-outline-success",
                    onClick: () => onRelAction(rel, btn),
                  },
                  btn.label,
                ),
              ),
            ),
          );
        }),
      ),

    loaded &&
      rels.length === 0 &&
      ce("div", { className: "text-muted small mb-2" }, "No relationships yet"),

    allTypes.length === 0
      ? ce(
          "div",
          { className: "text-muted small" },
          `No relationship types configured for ${doctype}`,
        )
      : ce(
          "div",
          { className: "d-flex flex-column gap-2" },
          ce(
            "div",
            { className: "d-flex gap-2 align-items-start flex-wrap" },
            ce(
              "select",
              {
                className: "form-select form-select-sm",
                style: { width: "140px" },
                value: selType,
                onChange: (e) => {
                  setSelType(e.target.value);
                  setSelName("");
                  setSelTitle("");
                },
              },
              ce("option", { value: "" }, "Type..."),
              allTypes.map((t) => ce("option", { key: t, value: t }, t)),
            ),
            selType &&
              ce(
                "div",
                { style: { width: "200px" } },
                ce(MultiSelectPanel, {
                  sources: relSource,
                  value: selName ? [selName] : [],
                  onChange: (next) => {
                    const id = next[next.length - 1];
                    setSelName(id || "");
                    setSelTitle(id || "");
                  },
                  readOnly: false,
                  run_doc,
                  grouped: false,
                }),
              ),
            selType &&
              ce("input", {
                type: "text",
                className: "form-control form-control-sm",
                style: { width: "160px" },
                placeholder: "Notes (optional)",
                value: notes,
                onChange: (e) => setNotes(e.target.value),
              }),
            selType &&
              ce(
                "button",
                {
                  className: "btn btn-sm btn-primary",
                  disabled: !selName || saving,
                  onClick: onAdd,
                },
                saving ? "..." : "+ Add",
              ),
          ),
        ),
  );
};
globalThis.RelationshipPanel = RelationshipPanel;

const SearchBar = function () {
  const [term, setTerm] = React.useState("");

  return ce("input", {
    className: "form-control form-control-sm",
    placeholder: "Search...",
    value: term,
    onChange: (e) => {
      setTerm(e.target.value);
      CW.searchGrid(e.target.value);
    },
  });
};

const LeftPaneChat = function () {
  const [messages, setMessages] = React.useState([]);
  const [term, setTerm] = React.useState("");
  const listRef = React.useRef(null);

  React.useEffect(() => {
    if (listRef.current)
      listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    const t = term.trim();
    if (!t) return;
    setTerm("");
    CW.searchGrid(t);
    setMessages((prev) => [
      ...prev,
      { text: t, type: "user", id: Date.now() },
      { text: `→ ${t}`, type: "system", id: Date.now() + 1 },
    ]);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return ce(
    "div",
    { className: "d-flex flex-column h-100" },
    ce(
      "div",
      {
        ref: listRef,
        className: "flex-grow-1 overflow-auto p-2 d-flex flex-column gap-1",
      },
      messages.length === 0 &&
        ce(
          "div",
          {
            className: "text-muted text-center small py-3",
          },
          "status:Open · priority:High · or plain text",
        ),
      messages.map((m) =>
        ce(
          "div",
          {
            key: m.id,
            className: `small px-2 py-1 rounded ${m.type === "user" ? "align-self-end bg-primary-subtle" : "align-self-start text-muted"}`,
          },
          m.text,
        ),
      ),
    ),
    ce(
      "div",
      { className: "p-2 border-top d-flex gap-2 align-items-end" },
      ce("textarea", {
        className: "form-control form-control-sm",
        rows: 2,
        placeholder: "status:Open",
        value: term,
        onChange: (e) => setTerm(e.target.value),
        onKeyDown,
        style: { resize: "none", fontSize: 13 },
      }),
      ce(
        "button",
        {
          className: "btn btn-sm btn-outline-secondary",
          onClick: handleSend,
        },
        "Send",
      ),
    ),
  );
};

// ============================================================
// UniversalGrid — CW-ui.js addition
// React 18 UMD, no JSX, Tabler CSS
// Modes: MainGrid | Table | Relationship
// ============================================================
//==========================Toolbar first =====================

// ============================================================
// GridToolbar
// ============================================================

const GridToolbar = function ({ run_doc, field }) {
  const mode     = !field ? 'MainGrid' : field.fieldtype === 'Table' ? 'Table' : 'Relationship';
  const doctype  = mode === 'MainGrid' ? (run_doc.target_doctype || run_doc.source_doctype) : field.options;
  const schema   = CW.Schema?.[doctype] || {};
  const rows     = run_doc.target?.data || [];
  const selected = CW.getGridSelected(run_doc);

  const [searchVal, setSearchVal] = React.useState(run_doc.search || '');

  if (selected.length > 0) {
    const selectedDocs  = rows.filter(r => selected.includes(r.name));
    const allSignalSets = selectedDocs.map(doc => {
      const btns = CW._getFormButtons(run_doc, doc);
      return [...btns.outside, ...btns.menu].filter(b => b.type === 'fsm');
    });
    const commonBtns = allSignalSets.length === 0 ? [] :
      allSignalSets[0].filter(b =>
        allSignalSets.every(set => set.some(s => s.signal === b.signal))
      );

    return ce('div', { className: 'd-flex align-items-center gap-2 px-3 py-2 border-bottom' },
      ce('button', {
        className: 'btn btn-sm btn-ghost-secondary',
        onClick:   () => CW.clearSelected(run_doc)
      }, selected.length + ' selected  ×'),
      commonBtns.map(btn =>
        ce('button', {
          key:       btn.signal,
          className: 'btn btn-sm btn-secondary',
          onClick:   async () => {
            if (btn.confirm && !window.confirm(btn.confirm)) return;
            for (const name of selected) {
              await run_doc.child({
                operation:      'update',
                target_doctype: doctype,
                query:          { where: { name } },
                input:          { _state: { [btn.signal]: '' } },
                options:        { render: false, internal: true },
              });
            }
            CW.clearSelected(run_doc);
            CW.refetchGrid(run_doc);
          }
        }, btn.label)
      )
    );
  }

  return ce('div', { className: 'd-flex align-items-center gap-2 px-3 py-2 border-bottom' },
    mode === 'MainGrid' && ce('button', {
      className: 'btn btn-sm btn-primary',
      onClick:   () => run_doc.child({ operation: 'create', target_doctype: doctype, options: { render: true } })
    }, '+ New'),
    mode === 'MainGrid' && ce('input', {
      type:        'text',
      className:   'form-control form-control-sm ms-2',
      placeholder: 'Search ' + (schema.label || doctype) + '...',
      value:       searchVal,
      onChange:    e => { setSearchVal(e.target.value); run_doc.search = e.target.value; CW.searchDebounced(run_doc); }
    })
  );
};


//===========================Grid NO DEPENDENCIES===============================
/*
const UniversalGrid = function ({ run_doc, field }) {
  console.log('[UniversalGrid render]', field?.fieldname, 'time:', Date.now());

   if (!run_doc) return null;

   const parentRun = run_doc;  //added
  

  run_doc = CW._getChildRun(run_doc, field?.fieldname) || run_doc




  const mode = !field
    ? "MainGrid"
    : field.fieldtype === "Table"
      ? "Table"
      : "Relationship";
  const doctype =
    mode === "MainGrid"
      ? run_doc.target_doctype || run_doc.source_doctype
      : field.options;
  const schema = CW.Schema?.[doctype] || {};
  const titleField = schema.title_field || "name";
  const rows = run_doc.target?.data || [];
  const columns = Object.keys(rows[0] || {});

 


  const selected = CW.getGridSelected(run_doc);
  const allChecked = selected.length === rows.length && rows.length > 0;

  const [hoveredRow, setHoveredRow] = React.useState(null);

    const [, force] = React.useReducer(x => x + 1, 0);  // ← add here

  const cv = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const renderRow = (row) => {
    const isHovered = hoveredRow === row.name;
    const isSelected = selected.includes(row.name);
    const btns =
      isHovered && CW._getFormButtons
        ? CW._getFormButtons(run_doc, row)?.outside || []
        : [];

    return ce(
      "tr",
      {
        key: row.name,
        className: isSelected ? "table-active" : "",
        onMouseEnter: () => setHoveredRow(row.name),
        onMouseLeave: () => setHoveredRow(null),
      },
      ce(
        "td",
        {
          key: "__chk",
          style: { width: 36 },
          

          onClick: (e) => {
            e.stopPropagation();
            CW.toggleSelected(run_doc, row.name);
            force();
          },
        },
        isHovered || isSelected
          ? ce("input", {
              type: "checkbox",
              className: "form-check-input",
              checked: isSelected,
              readOnly: true,
            })
          : ce("span", { className: "cw-grid-circle" }),
      ),
      columns.map((k) =>
        ce(
          "td",
          {
            key: k,
            className: k === titleField ? "fw-medium" : "text-secondary",
            style: k === titleField ? { cursor: "pointer" } : {},
            onClick:
              k === titleField
                ? () =>
                    run_doc.child({   
                      operation: "update",  
                      target_doctype: doctype,
                      query: { where: { name: row.name } },
                      view: "form",
                      options: { render: true },

                    })
                : undefined,
          },
          cv(row[k]),
        ),
      ),
      ce(
        "td",
        { key: "__act", className: "text-end pe-3", style: { width: 160 } },
        btns.map((btn) =>
          ce(
            "button",
            {
              key: btn.signal,
              className: "btn btn-sm btn-ghost-secondary ms-1",
              onClick: async (e) => {
                e.stopPropagation();
                await run_doc.child({
                  operation: "update",
                  target_doctype: doctype,
                  query: { where: { name: row.name } },
                  input: { _state: { [btn.signal]: "" } },
                  options: { render: false, internal: true },
                });
                CW.refetchGrid(run_doc);
              },
            },
            btn.label,
          ),
        ),
      ),
    );
  };

  return ce(
    "div",
    { className: "cw-universal-grid" },
    ce(GridToolbar, { run_doc, field }),
    ce(
      "div",
      { className: "table-responsive" },
      ce(
        "table",
        { className: "table table-hover table-sm mb-0" },
        ce(
          "thead",
          null,
          ce(
            "tr",
            null,
            ce(
              "th",
              {
                key: "__chk",
                style: { width: 36 },
                //onClick: () => CW.toggleAllSelected(parentRun),  // ← parentRun
                onClick: () => CW.toggleAllSelected(run_doc),
              },
              allChecked
                ? ce("input", {
                    type: "checkbox",
                    className: "form-check-input",
                    checked: true,
                    readOnly: true,
                  })
                : null,
            ),
            columns.map((k) =>
              ce(
                "th",
                { key: k },
                schema.fields?.find((f) => f.fieldname === k)?.label || k,
              ),
            ),
            ce("th", { key: "__act", style: { width: 160 } }),
          ),
        ),
        ce("tbody", null, rows.map(renderRow)),
      ),
    ),
    rows.length === 0 &&
      ce("div", { className: "text-center text-secondary py-5" }, "No records"),
  );
};
*/

/* TanStack grid version */

const UniversalGrid = function({ run_doc, field }) {
  run_doc = CW._getChildRun(run_doc, field?.fieldname) || run_doc

  const RT      = globalThis.TanStackTable
  const schema  = CW.Schema?.[run_doc.target_doctype] || {}
  const rows    = run_doc.target?.data || []
  const titleField = schema.title_field || 'name'

  const columns = (schema.fields?.filter(f => f.in_list_view) || [])
    .map(f => ({
      accessorKey: f.fieldname,
      header:      f.label || f.fieldname,
    }))

  const table = RT.useReactTable({
    data:                  rows,
    columns,
    getCoreRowModel:       RT.getCoreRowModel(),
    getSortedRowModel:     RT.getSortedRowModel(),
    getFilteredRowModel:   RT.getFilteredRowModel(),
    getPaginationRowModel: RT.getPaginationRowModel(),
  })

  if (!RT) return ce('div', null, 'TanStack Table not loaded')

  return ce('div', { className: 'cw-universal-grid' },
    ce('div', { className: 'table-responsive' },
      ce('table', { className: 'table table-hover table-sm mb-0' },
        ce('thead', null,
          table.getHeaderGroups().map(hg =>
            ce('tr', { key: hg.id },
              hg.headers.map(h =>
                ce('th', {
                  key:     h.id,
                  onClick: h.column.getToggleSortingHandler(),
                  style:   { cursor: 'pointer', userSelect: 'none' },
                }, h.column.columnDef.header)
              )
            )
          )
        ),
        ce('tbody', null,
          table.getRowModel().rows.map(row =>
            ce('tr', {
              key:     row.id,
              style:   { cursor: 'pointer' },
              onClick: () => run_doc.child({
                operation:      'select',
                target_doctype: run_doc.target_doctype,
                query:          { where: { name: row.original.name } },
                view:           'form',
                options:        { render: true },
              })
            },
              row.getVisibleCells().map(cell =>
                ce('td', {
                  key:       cell.id,
                  className: cell.column.id === titleField ? 'fw-medium' : 'text-secondary',
                },
                  RT.flexRender(cell.column.columnDef.cell, cell.getContext())
                )
              )
            )
          )
        )
      )
    ),
    rows.length === 0 &&
      ce('div', { className: 'text-center text-secondary py-5' }, 'No records')
  )
}



globalThis.UniversalGrid = UniversalGrid;
console.log("✅ UniversalGrid loaded");

// ============================================================
// COMPONENT REGISTRY
// ============================================================

globalThis.MainForm = MainForm;
globalThis.MainGrid = MainGrid;
globalThis.SearchBar = SearchBar;
globalThis.LeftPaneChat = LeftPaneChat;

console.log("✅ CW-ui.js loaded");
