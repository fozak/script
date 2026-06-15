// ============================================================
// CW-utils.js v 40
// ============================================================

const CW = globalThis.CW;

// ============================================================
// LAYOUT PARSER
// ============================================================

function parseLayout(field_order, fields) {
  if (!field_order || !fields)
    return { type: "container", className: "form.wrapper", children: [] };

  const fieldMap = {};
  fields.forEach((f) => {
    fieldMap[f.fieldname] = f;
  });

  const sections = [];
  let currentSection = null;
  let currentColumn = null;

  field_order.forEach((fieldname) => {
    const item = fieldMap[fieldname];
    if (!item) return;

    if (item.fieldtype === "Section Break") {
      currentSection = {
        type: "container",
        className: "form.section",
        label: item.label,
        children: [],
      };
      sections.push(currentSection);
      currentColumn = null;
    } else if (item.fieldtype === "Column Break") {
      if (currentSection) {
        currentColumn = {
          type: "container",
          className: "form.column",
          children: [],
        };
        currentSection.columns = currentSection.columns || [];
        currentSection.columns.push(currentColumn);
      }
    } else {
      const fieldConfig = { type: "field", field: item, fieldname };
      if (currentColumn) {
        currentColumn.children.push(fieldConfig);
      } else if (currentSection) {
        currentSection.directFields = currentSection.directFields || [];
        currentSection.directFields.push(fieldConfig);
      } else {
        if (!sections.length) {
          currentSection = {
            type: "container",
            className: "form.section",
            children: [],
          };
          sections.push(currentSection);
        }
        sections[0].directFields = sections[0].directFields || [];
        sections[0].directFields.push(fieldConfig);
      }
    }
  });

  return {
    type: "container",
    className: "form.wrapper",
    children: sections.map((section) => {
      const children = [];
      if (section.label)
        children.push({
          type: "heading",
          level: 3,
          className: "form.sectionLabel",
          content: section.label,
        });

      const rowChildren = section.columns?.length
        ? section.columns
        : section.directFields?.length
          ? [
              {
                type: "container",
                className: "form.column",
                children: section.directFields,
              },
            ]
          : [];

      if (rowChildren.length)
        children.push({
          type: "container",
          className: "form.row",
          children: rowChildren,
        });

      return { type: "container", className: "form.section", children };
    }),
  };
}

// ============================================================
// HELPERS
// ============================================================

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      clearTimeout(timeout);
      func(...args);
    }, wait);
  };
}

function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) cloned[key] = deepClone(obj[key]);
  }
  return cloned;
}

function getByPath(obj, path) {
  return path.split(".").reduce((o, key) => o?.[key], obj);
}

// ============================================================
// DEPENDS_ON EVALUATOR
// ============================================================

function evaluateDependsOn(dependsOn, doc, run_doc) {
  if (!dependsOn) return true;
  if (dependsOn.startsWith("eval:")) {
    try {
      const in_list = (arr, val) => Array.isArray(arr) && arr.includes(val);
      const cint = (val) => parseInt(val) || 0;
      const flt = (val) => parseFloat(val) || 0;
      return !!new Function(
        "doc",
        "run_doc",
        "in_list",
        "cint",
        "flt",
        `"use strict"; return ${dependsOn.substring(5)};`,
      )(doc, run_doc, in_list, cint, flt);
    } catch (e) {
      console.warn("Failed to evaluate depends_on:", dependsOn, e);
      return true;
    }
  }
  return !!doc[dependsOn];
}

// ============================================================
// ID GENERATION
// ============================================================

const SINGLE_DOCTYPES = new Set([
  "Role",
  "Country",
  "Currency",
  "Department",
  "Designation",
  "Territory",
  "UOM",
  "UOM Category",
  "Item Group",
  "Customer Group",
  "Supplier Group",
  "Tax Category",
  "Mode of Payment",
  "Terms and Conditions",
  "Print Heading",
  "Brand",
  "Item Attribute",
  "Warehouse Type",
  "Industry Type",
  "Market Segment",
  "Sales Stage",
  "Employee Group",
  "Holiday List",
  "Workstation Type",
  "Activity Type",
  "Project Type",
  "Schema",
  "Task Type",
  "Issue Type",
  "Party Type",
]);

const EMAIL_KEYED = {
  User: "user",
  UserPublicProfile: "usep",
  UserSettings: "uses",
};

const PATH_KEYED = {
  File: "file",
};

function generateId(doctype, title = null) {
  if (EMAIL_KEYED[doctype]) {
    if (!title?.trim()) throw new Error(`${doctype} requires an email address`);
    return (EMAIL_KEYED[doctype] + hashString(title)).substring(0, 15);
  }

  if (PATH_KEYED[doctype]) {
    if (!title?.trim()) throw new Error(`${doctype} requires a path`);
    return (PATH_KEYED[doctype] + hashString(title)).substring(0, 15);
  }

  return SINGLE_DOCTYPES.has(doctype)
    ? generateSingleId(doctype, title)
    : generateMultiId(doctype, title);
}

function hashString(email) {
  let h1 = 0,
    h2 = 0x9747b28c;
  for (let i = 0; i < email.length; i++) {
    const c = email.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x9e3779b9);
    h2 = Math.imul(h2 ^ c, 0x85ebca77);
  }
  h1 ^= h2 >>> 13;
  h2 ^= h1 >>> 11;
  const combined =
    (Math.abs(h1) * 1000000 + Math.abs(h2)) % Number.MAX_SAFE_INTEGER;
  return Math.abs(combined).toString(36).padStart(11, "0").substring(0, 11);
}

function generateSingleId(doctype, title) {
  if (!title?.trim())
    throw new Error(`Single doctype "${doctype}" requires a unique title`);
  const dtNorm = doctype.toLowerCase().replace(/[^a-z0-9]/g, "");
  const titleNorm = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const available = 15 - dtNorm.length;
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  let titlePart;
  if (words.length === 1) {
    titlePart = titleNorm.substring(0, available);
  } else {
    const cpp = Math.floor(available / words.length);
    const rem = available - cpp * words.length;
    titlePart = words
      .map((w, i) => w.substring(0, cpp + (i === 0 ? rem : 0)))
      .join("");
  }
  return (dtNorm + titlePart).padEnd(15, "x").substring(0, 15);
}

function generateMultiId(doctype, title) {
  const semantic = createSemantic(doctype, title);
  return semantic + generateRandom(15 - semantic.length);
}

function createSemantic(doctype, title) {
  const words = doctype
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(
      (w) =>
        ![
          "of",
          "the",
          "and",
          "or",
          "for",
          "in",
          "on",
          "at",
          "to",
          "a",
          "an",
        ].includes(w),
    );
  const sig = words.length ? words : doctype.toLowerCase().split(/\s+/);

  let semantic;
  if (sig.length === 1) semantic = sig[0];
  else if (sig.length === 2) semantic = (sig[0] + sig[1]).substring(0, 10);
  else {
    semantic = sig[0].substring(0, 4);
    for (let i = 1; i < sig.length && semantic.length < 10; i++) {
      const abbr = sig[i][0] + sig[i].substring(1).replace(/[aeiou]/g, "");
      semantic += abbr.substring(0, Math.min(3, 10 - semantic.length));
    }
  }

  if (semantic.length < 10 && title) {
    semantic = (
      semantic + title.toLowerCase().replace(/[^a-z0-9]/g, "")
    ).substring(0, 10);
  }

  return semantic.substring(0, 10);
}

function generateRandom(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function validateId(id) {
  return (
    typeof id === "string" && id.length === 15 && /^[a-z0-9]{15}$/.test(id)
  );
}

// ============================================================
// FSM HELPERS — moved from CW-run.js
// Pure functions — read Schema/config only, no run_doc mutation
// ============================================================

// _getStateDef: merge SystemSchema dim + doctype dim for all dims
// returns { "0": { ...dim0 }, "1": { ...dim1 }, ... }
function _getStateDef(doctype) {
  const sys = CW.Schema?.SystemSchema?._state || {};
  const dt = CW.Schema?.[doctype]?._state || {};
  const dims = new Set([...Object.keys(sys), ...Object.keys(dt)]);
  const merged = {};
  for (const dim of dims) {
    const sysDim = sys[dim] || {};
    const dtDim = dt[dim] || {};
    merged[dim] = Object.assign({}, sysDim, dtDim);
    // deep merge sideEffects — dtDim overrides sysDim per key
    merged[dim].sideEffects = Object.assign(
      {},
      sysDim.sideEffects || {},
      dtDim.sideEffects || {},
    );
  }
  return merged;
}

// _getDimValue: read current value for a dim from doc._state
// falls back to dimDef.fieldname field on doc, then dimDef.values[0]
function _getDimValue(doc, dim, dimDef) {
  var state = doc._state;
  if (typeof state === "string") {
    try {
      state = JSON.parse(state);
    } catch (_) {
      state = {};
    }
  }
  if (state && typeof state === "object") {
  if (dim in state && typeof state[dim] === "number") return state[dim];
  
  const prefix = dim + ".";
  var current = null;
  for (const [k, v] of Object.entries(state)) {
    if (!k.startsWith(prefix)) continue;
    const rest = k.slice(prefix.length);
    const parts = rest.split("_");
    if (parts.length !== 2) continue;
    const from = parseInt(parts[0]);
    const to = parseInt(parts[1]);
    if (isNaN(from) || isNaN(to)) continue;
    if (v === "1") current = to;
    if (v === "-1") current = from;
  }
  if (current !== null) return current;
}
  if (dimDef?.fieldname && dimDef.fieldname in doc)
    return doc[dimDef.fieldname];
  return dimDef?.values?.[0] ?? 0;
}

// _getTransitions: returns available transitions for a dim given current doc state
// filters by requires + rules, returns array of { signal, from, to, label, confirm }
// label overrides applied from schema.permissions.transitions for Self and all roles
function _getTransitions(schema, doc, dim, run_doc) {
  const stateDef = _getStateDef(schema.schema_name || schema.name);
  const dimDef = stateDef[dim];
  if (!dimDef) return [];

  const current = _getDimValue(doc, dim, dimDef);
  const tos = dimDef.transitions?.[String(current)] || [];

  // build label overrides from schema.permissions.transitions
  // Self = current user is owner or subject of this document
  const currentUserId = CW._config?.currentUser?.id || "";
  const isSelf = !!(
    currentUserId &&
    (doc.name === currentUserId || doc.owner === currentUserId)
  );
  const labelOverrides = {};
  for (const p of schema.permissions || []) {
    if (p.role === "Self" && !isSelf) continue;
    for (const [signal, label] of Object.entries(p.transitions || {})) {
      if (signal.startsWith(dim + ".")) labelOverrides[signal] = label;
    }
  }

  // relationship_roles — parent schema drives transition visibility per type
  const parentDoctype = CW.runs?.[run_doc?.parent_run_id]?.target_doctype || doc.parenttype;
  const parentSchema = CW.Schema?.[parentDoctype];
  const relRole = parentSchema?.relationship_roles?.[doc.related_doctype]?.[doc.type];

  return tos
    .map((to) => {
      const bareKey = `${current}_${to}`;
      const signal = `${dim}.${bareKey}`;
      const requires = dimDef.requires?.[bareKey] || {};
      const rule = dimDef.rules?.[bareKey];
      const reqPassed = Object.entries(requires).every(
        ([k, v]) => Number(schema[k] ?? 0) === Number(v),
      );
      const rulePassed =
        typeof rule === "function"
          ? rule({
              target: { data: [doc] },
              input: {},
              target_doctype: schema.schema_name || schema.name,
            })
          : true;
      if (!reqPassed || !rulePassed) return null;
      if (relRole?.transitions && !relRole.transitions.includes(bareKey)) return null;
      return {
        signal,
        from: current,
        to,
        label: labelOverrides[signal] || dimDef.labels?.[bareKey],
        confirm: dimDef.confirm?.[bareKey],
      };
    })
    .filter(Boolean);
}

// _getFormButtons: returns { outside, menu } button groups for MainForm
// outside: Save + primary dim 0 buttons
// menu: Edit + non-primary dim 0 + dim 1+ buttons
/*function _getFormButtons(run_doc) {
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  const schema = CW.Schema?.[doctype];
  const doc = run_doc.target?.data?.[0] || {};*/


function _getFormButtons(run_doc, row) {
  const doctype  = run_doc.target_doctype || run_doc.source_doctype;
  const schema   = CW.Schema?.[doctype];
  const doc      = row || run_doc.target?.data?.[0] || {};

  const stateDef = CW._getStateDef(doctype);
  const dim0 = stateDef?.["0"];
  const explicit = !!(schema?.explicit_edit_intent ?? 0);
  const editing =
    ["update", "create"].includes(run_doc.operation) &&
    (doc.docstatus ?? 0) === 0;
  const isOwner = doc.owner === CW._config?.currentUser?.id;
  const actLabels = dim0?.action_labels || {};

  const outside = [];
  const menu = [];

  if (explicit && editing)
    outside.push({ type: "save", label: actLabels.save || "Save" });

  if (explicit && !editing && isOwner)
    menu.push({ type: "edit", label: actLabels.edit || "Edit" });

  // all dims — primary → outside, non-primary → menu
  Object.keys(stateDef).forEach((dim) => {
    const dimDef = stateDef[dim];
    const btns = _getTransitions(schema, doc, dim, run_doc);
    btns.forEach((b) => {
      const bareKey = b.signal.slice(b.signal.indexOf(".") + 1);
      if (dimDef?.primary?.[bareKey]) {
        outside.push({ type: "fsm", ...b });
      } else {
        menu.push({ type: "fsm", ...b });
      }
    });
  });

  return { outside, menu };
}

// _resolveViewComponent: schema view_components → config views → fallback
// returns { component, container } always
function _resolveViewComponent(doctype, view, fallback_container) {
  const dtViews = CW.Schema?.[doctype]?.view_components;
  if (dtViews?.[view]) return dtViews[view];
  const cfg = CW._config?.views?.[view];
  if (cfg) return cfg;
  return {
    component: "MainForm",
    container: fallback_container || "main_container",
  };
}
//== get fiels===============================================================================

function _getListFields(run_doc) {
  const doctype = run_doc.target_doctype || run_doc.source_doctype;
  const schema = CW.Schema?.[doctype];
  const view = run_doc.view || 'list';
  const skipTypes = new Set(['Section Break','Column Break','Tab Break','HTML','Button','Table']);
  const viewFlag = `in_${view}_view`;

  const fields = (schema?.fields || [])
    .filter(f => f[viewFlag] && !skipTypes.has(f.fieldtype));

  if (fields.length > 0) return fields;

  // fallback — derive from actual data
  const data = run_doc.target?.data || [];
  return Object.keys(data[0] || {})
    .filter(k => !k.startsWith('_') && k !== 'doctype')
    .slice(0, 6)
    .map(k => ({ fieldname: k, label: k }));
};
// ============================================================
// CW METHODS
// ============================================================

CW.getConfig = (path) => getByPath(CW._config, path);

CW.setConfig = (key, value) => {
  CW._config = CW._config || {};
  CW._config[key] = value;
};

CW.getBehavior = function (schema, doc) {
  const key = `${schema?.is_submittable || 0}-${doc?.docstatus ?? 0}-${schema?._autosave ?? 1}`;
  return (
    CW._config.behaviorMatrix?.[key] || CW._config.behaviorMatrix?.["0-0-0"]
  );
};

CW.evalTemplate = function (template, context) {
  if (typeof template !== "string") return template;
  const match = template.match(/^\{\{(.+)\}\}$/);
  if (!match) return template;
  try {
    return new Function(...Object.keys(context), `return ${match[1]}`)(
      ...Object.values(context),
    );
  } catch (e) {
    console.warn("Template eval error:", match[1], e);
    return template;
  }
};

CW.evalTemplateObj = (obj, context) => {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, CW.evalTemplate(v, context)]),
  );
};

// ─── searchGrid ───────────────────────────────────────────────────────────────
// Universal search/navigation from SearchBar.
//
//   ""          → restore current grid, no filter
//   "test"      → filter current grid by title_field
//   "task"      → switch to Task list, no filter
//   "task test" → switch to Task list, filter by "test"
//
// Same doctype as current grid → child run (rerender in place)
// Different doctype            → new CW.run (new grid)
// ─────────────────────────────────────────────────────────────────────────────

// ─── _parseSmartSearch ────────────────────────────────────────────────────────
// Parses smart search term into PocketBase filter string.
// "toyota status:open priority:high" →
//   data.subject ~ "toyota" && data.status = "open" && data.priority = "high"
// ─────────────────────────────────────────────────────────────────────────────

function _parseSmartSearch(term, schema) {
  if (!term?.trim()) return "";

  const fields = schema?.fields?.filter((f) => f.in_list_view) || [];
  const parts = term.trim().split(/\s+/);
  const filters = [];
  const text = [];

  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx > 0) {
      const key = part.slice(0, colonIdx).toLowerCase();
      const val = part.slice(colonIdx + 1);
      const field = fields.find(
        (f) =>
          f.fieldname.toLowerCase() === key ||
          (f.label || "").toLowerCase() === key,
      );
      if (field && val) {
        const path = CW._config.topLevelFields.has(field.fieldname)
          ? field.fieldname
          : `data.${field.fieldname}`;
        const op = ["Data", "Small Text", "Text", "Long Text"].includes(
          field.fieldtype,
        )
          ? "~"
          : "=";
        filters.push(`${path} ${op} "${val}"`);
        continue;
      }
    }
    text.push(part);
  }

  if (text.length) {
    const textTerm = text.join(" ");
    const titleField = schema?.title_field || "name";

    // title_field always first
    const titlePath = CW._config.LevelFields.has(titleField)
      ? titleField
      : `data.${titleField}`;

    // all search_index fields
    const searchFields = (schema?.fields || []).filter(
      (f) => f.search_index && f.fieldname !== titleField,
    );

    const searchParts = [
      `${titlePath} ~ "${textTerm}"`,
      ...searchFields.map((f) => {
        const path = CW._config.topLevelFields.has(f.fieldname)
          ? f.fieldname
          : `data.${f.fieldname}`;
        return `${path} ~ "${textTerm}"`;
      }),
    ];

    filters.push(`(${searchParts.join(" || ")})`);
  }

  return filters.join(" && ");
}

// ─── searchGrid ───────────────────────────────────────────────────────────────

function searchGrid(term) {
  const gridRun =
    CW.runs[CW.current_run]?.component === "MainGrid"
      ? CW.runs[CW.current_run]
      : Object.values(CW.runs).findLast(
          (r) => r.component === "MainGrid" && r.status === "completed",
        );

  const parts = (term || "").trim().split(/\s+/);
  const firstWord = parts[0].toLowerCase();
  const matchedDt = Object.keys(CW.Schema || {}).find(
    (dt) => dt.toLowerCase() === firstWord,
  );
  const doctype = matchedDt || gridRun?.target_doctype;
  if (!doctype) return;

  const searchTerm = matchedDt
    ? parts.slice(1).join(" ").trim()
    : (term || "").trim();
  const schema = CW.Schema?.[doctype];
  const filter = _parseSmartSearch(searchTerm, schema);
  const container = gridRun?.container || "main_container";

  const op = {
    operation: "select",
    target_doctype: doctype,
    query: { filter },
    component: "MainGrid",
    container,
    options: { render: true },
  };

  if (gridRun && gridRun.target_doctype === doctype) return gridRun.child(op);
  return CW.run(op);
}

const _profile = CW._config?.fieldInteractionConfig?.activeProfile ?? "default";
const _searchDelay =
  CW._config?.fieldInteractionConfig?.profiles?.[_profile]?.onChange
    ?.debounce ??
  CW._config?.fieldInteractionConfig?.triggers?.onChange?.debounce ??
  300;

const searchGridDebounced = debounce(searchGrid, _searchDelay);



//==============================================================


// ─── search ──────────────────────────────────────────────────────────────────

function search(run_doc) {
  const profile     = CW._config?.fieldInteractionConfig?.activeProfile ?? 'default';
  const searchDelay = CW._config?.fieldInteractionConfig?.profiles?.[profile]?.onChange?.debounce ??
                      CW._config?.fieldInteractionConfig?.triggers?.onChange?.debounce ?? 300;

  const term    = run_doc.search || '';
  const parts   = term.trim().split(/\s+/);
  const first   = parts[0]?.toLowerCase();
  const matched = Object.keys(CW.Schema || {}).find(dt => dt.toLowerCase() === first);

  if (matched && matched !== run_doc.target_doctype) {
    run_doc.search = parts.slice(1).join(' ').trim();
    return run_doc.child({
      operation:      'select',
      target_doctype: matched,
      search:         run_doc.search,
      component:      run_doc.component,
      container:      run_doc.container,
      view:           run_doc.view,
      options:        { render: true },
    });
  }

  const schema = CW.Schema?.[run_doc.target_doctype];
  run_doc.query.filter = _parseSmartSearch(term, schema);
  return CW.refetchGrid(run_doc);
}

const searchDebounced = debounce(search, 
  (() => {
    const p = CW._config?.fieldInteractionConfig?.activeProfile ?? 'default';
    return CW._config?.fieldInteractionConfig?.profiles?.[p]?.onChange?.debounce ??
           CW._config?.fieldInteractionConfig?.triggers?.onChange?.debounce ?? 300;
  })()
);

CW.search          = search;
CW.searchDebounced = searchDebounced;

// ============================================================
// _patchDataField — partial update of a single data field in PB
// ============================================================

/*async function _patchDataField(docName, fieldName, value) {
  const collection = CW._config.collection
  const current    = await globalThis.pb.collection(collection).getOne(docName)
  const mergedData = { ...current.data, [fieldName]: value }
  await globalThis.pb.collection(collection).update(docName, { data: mergedData })
}*/

//=====change to fix

//=====change to fix

/*async function _patchDataField(docName, fieldName, value) {
  const collection = CW._config.collection
  const current    = await globalThis.pb.collection(collection).getOne(docName)
  const existing   = Array.isArray(current.data[fieldName]) ? current.data[fieldName] : []
  const mergedData = { ...current.data, [fieldName]: [...existing, value] }
  await globalThis.pb.collection(collection).update(docName, { data: mergedData })
}*/

async function _patchDataField(docName, fieldName, value) {
  const collection = CW._config.collection;
  try {
    const current  = await globalThis.pb.collection(collection).getOne(docName);
    const existing = Array.isArray(current.data[fieldName]) ? current.data[fieldName] : [];
    await globalThis.pb.collection(collection).update(docName, {
      data: { [fieldName]: [...existing, value] }  // ← only _changes field, no spread
      
    });
  } catch (err) {
    if (err?.status === 404) return;
    throw err;
  }
}

// ============================================================
// _logChanges
// ============================================================

async function _logChanges(run_doc, explicitChanges = null) {
  //console.log('[_logChanges] input keys:', Object.keys(run_doc.input));

  if (run_doc.options?._logging === false) return;
  if (!CW._config.systemSettings?.logChanges) return;

  const adapters = CW._getAdapters(run_doc);
  if (adapters.some(a => CW._config.adapters.registry?.[a]?.logChanges === 0)) return;

  const doc = run_doc.target?.data?.[0];
  if (!doc?.name) return;

  // find Script sibling in run tree
const parentRun = CW.runs?.[run_doc.parent_run_id];  // ← MISSING
const sourceRuns = parentRun?.child_run_ids
  ?.map(id => CW.runs[id])
  ?.filter(r => r?.target_doctype === 'Script' && r?.success);
const provenance = sourceRuns?.length
  ? { Script: sourceRuns.map(r => r.target?.data?.[0]?.title).join(', ') }
  : {};
  
  let changes;

  if (explicitChanges) {
    changes = explicitChanges;
  } else {
    const skip = new Set(['_changes', 'modified', 'modified_by', 'creation', 'files+', 'files-']);
    changes = Object.entries(run_doc.input)
      .filter(([k]) => !skip.has(k) && k !== '_state')
      .map(([k, v]) => ({
        field: k,
        from: doc[k] ?? null,
        to: v,
        source: CW._getAdapters(run_doc).join(','),
        ...provenance
      }))
      .filter(c => JSON.stringify(c.from) !== JSON.stringify(c.to));
  }

  const signals = explicitChanges ? [] : Object.entries(run_doc.input._state || {})
    .filter(([, v]) => v === '')
    .map(([k]) => k);

  if (!changes.length && !signals.length) return;

  const entry = {
    at: Date.now(),
    by: run_doc.user?.name || null,
    op: run_doc.operation,
    ...(changes.length && { ch: changes }),
    ...(signals.length && { sig: signals }),
  };

  const existing = Array.isArray(doc._changes) ? doc._changes : [];
  const next     = [...existing, entry];

  try {
    await _patchDataField(doc.name, '_changes', entry);
    doc._changes = next;
  } catch (err) {
    console.warn('[CW] _logChanges failed:', err.message);
  }
}

// ============================================================
// _logThreads
// ============================================================

async function _logThreads(run_doc, entry) {
  if (run_doc.options?._logging === false) return
  if (!CW._config.systemSettings?.logThreads) return

  const doc = run_doc.target?.data?.[0]
  if (!doc?.name) return

  const threadEntry = {
    at:      Date.now(),
    by:      run_doc.user?.name || null,
    adapter: entry.adapter,
    ...(entry.ref     && { ref:     entry.ref }),
    ...(entry.subject && { subject: entry.subject }),
    ...(entry.data    && { data:    entry.data }),
  }

  const existing = Array.isArray(doc._threads) ? doc._threads : []
  const next     = [...existing, threadEntry]

  try {
    await _patchDataField(doc.name, '_threads', next)

  
    doc._threads = next
  } catch (err) {
    console.warn('[CW] _logThreads failed:', err.message)
  }
}


// ─── getGridSelected ─────────────────────────────────────────────────────────
// Returns array of selected names from run_doc.query.where.name.in

function getGridSelected(run_doc) {
  return run_doc.query?.where?.name?.in || [];
}

// ─── toggleSelected ──────────────────────────────────────────────────────────
// Add or remove a single name from query.where.name.in

function toggleSelected(run_doc, name) {
  const current = getGridSelected(run_doc);
  const next = current.includes(name)
    ? current.filter(n => n !== name)
    : [...current, name];
  run_doc.query.where = next.length ? { name: { in: next } } : {};
  CW._render(run_doc);
}

// ─── toggleAllSelected ───────────────────────────────────────────────────────
// Select all rows or clear selection

function toggleAllSelected(run_doc) {
  const all = (run_doc.target?.data || []).map(r => r.name);
  const current = getGridSelected(run_doc);
  run_doc.query.where = current.length === all.length && all.length > 0
    ? {}
    : { name: { in: all } };
  CW._render(run_doc);
}

// ─── clearSelected ───────────────────────────────────────────────────────────
// Clear selection after bulk action fires

function clearSelected(run_doc) {
  if (run_doc.query.where) delete run_doc.query.where.name;
  if (run_doc.query.where && Object.keys(run_doc.query.where).length === 0) 
    run_doc.query.where = {};
  CW._render(run_doc);
}

// ─── refetchGrid ─────────────────────────────────────────────────────────────
// Fire new child select from current run_doc.query state (sort, page, filter)

function refetchGrid(run_doc) {
  return run_doc.child({
    operation:      'select',
    target_doctype: run_doc.target_doctype,
    query:          { ...run_doc.query },
    component:      run_doc.component,
    container:      run_doc.container,
    options:        { render: true },
  });
}






// ============================================================
// _resolveQuery
// ============================================================

function _resolveQuery(run_doc, fieldname) {
  const schema = CW.Schema?.[run_doc.target_doctype]
  const field  = schema?.fields?.find(f => f.fieldname === fieldname)
  const doc    = run_doc.target?.data?.[0]

  if (!field?.run_args?.query) return field?.run_args?.query

  try {
    return JSON.parse(
      JSON.stringify(field.run_args.query).replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
        const val = path.split('.').reduce((o, k) => o?.[k], { doc })
        return val !== undefined ? val : ''
      })
    )
  } catch(e) {
    console.warn('[CW._resolveQuery]', fieldname, e.message)
    return field.run_args.query
  }
}



// ============================================================
// runChain
// ============================================================

async function runChain(notebookName) {
  // root — load the notebook template
  const notebook_run = await CW.run({
    operation: 'select',
    target_doctype: 'Run',
    query: { where: { name: notebookName } },
    view: 'form',
    options: { render: false }
  });

  const cells = JSON.parse(notebook_run.target.data[0].steps);
  let prev = notebook_run;

  // cell1 — load select template
  const selectCell = cells.find(c => c.type === 'select');
  const selectTemplate = await prev.child({
    operation: 'select',
    target_doctype: 'Run',
    query: { where: { name: selectCell.name } },
    view: 'form',
    options: { render: false }
  });
  prev = selectTemplate;
  const st = selectTemplate.target.data[0];

  // cell2 — execute select
  const parent = await prev.child({
    operation: st.operation,
    target_doctype: st.target_doctype,
    query: JSON.parse(st.query),
    options: { render: false }
  });
  prev = parent;

  // cell3..N — load script templates and execute
  const scriptCells = cells.filter(c => c.type === 'script');
  const fns = [];
  for (const cell of scriptCells) {
    const t = await prev.child({
      operation: 'select',
      target_doctype: 'Run',
      query: { where: { name: cell.name } },
      view: 'form',
      options: { render: false }
    });
    prev = t;
    const template = t.target.data[0];
    const script = await prev.child({
      operation: template.operation,
      target_doctype: template.target_doctype,
      query: JSON.parse(template.query),
      options: { render: false }
    });
    prev = script;
    fns.push(new Function('doc', script.target.data[0].code));
  }

  // last cell — update
  await Promise.all(parent.target.data.map(async doc =>
    prev.child({
      operation: 'update',
      target_doctype: st.target_doctype,
      query: { where: { name: doc.name } },
      input: Object.assign({}, ...await Promise.all(fns.map(fn => fn(doc)))),
      options: { render: false, expand: false }
    })
  ));
}

// ─── assign to CW ─────────────────────────────────────────────────────────────

CW.runChain = runChain;


// ─── assign to CW ────────────────────────────────────────────────────────────

CW.getGridSelected   = getGridSelected;
CW.toggleSelected    = toggleSelected;
CW.toggleAllSelected = toggleAllSelected;
CW.clearSelected     = clearSelected;
CW.refetchGrid       = refetchGrid;


// assign FSM helpers to CW — called by CW-run.js and CW-ui.js
CW._getStateDef = _getStateDef;
CW._getDimValue = _getDimValue;
CW._getTransitions = _getTransitions;
CW._resolveViewComponent = _resolveViewComponent;
CW._getFormButtons = _getFormButtons;
CW.searchGrid = searchGrid;
CW.searchGridDebounced = searchGridDebounced;
CW._patchDataField = _patchDataField;
CW._logChanges = _logChanges;
CW._logThreads = _logThreads;
CW._getListFields = _getListFields;
CW._resolveQuery = _resolveQuery;

// ============================================================
// PERSIST STUB
// ============================================================

const persist = async (run_doc) => {
  console.log("[persist] would save", { ...run_doc.target.data[0] });
};

Object.assign(globalThis, {
  generateId,
  parseLayout,
  debounce,
  deepClone,
  getByPath,
  evaluateDependsOn,
  validateId,
  persist,
  searchGrid,
  searchGridDebounced,
});

console.log("✅ CW-utils.js v41 loaded");
