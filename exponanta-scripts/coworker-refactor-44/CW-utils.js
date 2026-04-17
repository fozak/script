// ============================================================
// CW-utils.js v 40
// ============================================================

const CW = globalThis.CW;

// ============================================================
// LAYOUT PARSER
// ============================================================

function parseLayout(field_order, fields) {
  if (!field_order || !fields) return { type: 'container', className: 'form.wrapper', children: [] };

  const fieldMap = {};
  fields.forEach(f => { fieldMap[f.fieldname] = f; });

  const sections = [];
  let currentSection = null;
  let currentColumn = null;

  field_order.forEach(fieldname => {
    const item = fieldMap[fieldname];
    if (!item) return;

    if (item.fieldtype === 'Section Break') {
      currentSection = { type: 'container', className: 'form.section', label: item.label, children: [] };
      sections.push(currentSection);
      currentColumn = null;
    } else if (item.fieldtype === 'Column Break') {
      if (currentSection) {
        currentColumn = { type: 'container', className: 'form.column', children: [] };
        currentSection.columns = currentSection.columns || [];
        currentSection.columns.push(currentColumn);
      }
    } else {
      const fieldConfig = { type: 'field', field: item, fieldname };
      if (currentColumn) {
        currentColumn.children.push(fieldConfig);
      } else if (currentSection) {
        currentSection.directFields = currentSection.directFields || [];
        currentSection.directFields.push(fieldConfig);
      } else {
        if (!sections.length) {
          currentSection = { type: 'container', className: 'form.section', children: [] };
          sections.push(currentSection);
        }
        sections[0].directFields = sections[0].directFields || [];
        sections[0].directFields.push(fieldConfig);
      }
    }
  });

  return {
    type: 'container',
    className: 'form.wrapper',
    children: sections.map(section => {
      const children = [];
      if (section.label) children.push({ type: 'heading', level: 3, className: 'form.sectionLabel', content: section.label });

      const rowChildren = section.columns?.length
        ? section.columns
        : section.directFields?.length
          ? [{ type: 'container', className: 'form.column', children: section.directFields }]
          : [];

      if (rowChildren.length) children.push({ type: 'container', className: 'form.row', children: rowChildren });

      return { type: 'container', className: 'form.section', children };
    })
  };
}

// ============================================================
// HELPERS
// ============================================================

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => { clearTimeout(timeout); func(...args); }, wait);
  };
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) cloned[key] = deepClone(obj[key]);
  }
  return cloned;
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, key) => o?.[key], obj);
}

// ============================================================
// DEPENDS_ON EVALUATOR
// ============================================================

function evaluateDependsOn(dependsOn, doc) {
  if (!dependsOn) return true;
  if (dependsOn.startsWith('eval:')) {
    try {
      const in_list = (arr, val) => Array.isArray(arr) && arr.includes(val);
      const cint = (val) => parseInt(val) || 0;
      const flt = (val) => parseFloat(val) || 0;
      return !!new Function('doc', 'in_list', 'cint', 'flt', `"use strict"; return ${dependsOn.substring(5)};`)(doc, in_list, cint, flt);
    } catch (e) {
      console.warn('Failed to evaluate depends_on:', dependsOn, e);
      return true;
    }
  }
  return !!doc[dependsOn];
}

// ============================================================
// ID GENERATION
// ============================================================

const SINGLE_DOCTYPES = new Set([
  'Role','Country','Currency','Department','Designation','Territory',
  'UOM','UOM Category','Item Group','Customer Group','Supplier Group',
  'Tax Category','Mode of Payment','Terms and Conditions','Print Heading',
  'Brand','Item Attribute','Warehouse Type','Industry Type','Market Segment',
  'Sales Stage','Employee Group','Holiday List','Workstation Type','Activity Type',
  'Project Type','Schema','Task Type','Issue Type','Party Type'
]);

function generateId(doctype, title = null) {
  if (doctype === 'User') {
    if (!title?.trim()) throw new Error('User doctype requires an email address');
    return `user${hashEmail(title)}`;
  }
  return SINGLE_DOCTYPES.has(doctype)
    ? generateSingleId(doctype, title)
    : generateMultiId(doctype, title);
}

function hashEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash = hash & hash;
  }
  const base36 = Math.abs(hash).toString(36);
  return (base36 + base36 + base36).substring(0, 11);
}

function generateSingleId(doctype, title) {
  if (!title?.trim()) throw new Error(`Single doctype "${doctype}" requires a unique title`);
  const dtNorm = doctype.toLowerCase().replace(/[^a-z0-9]/g, '');
  const titleNorm = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const available = 15 - dtNorm.length;
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean);
  let titlePart;
  if (words.length === 1) {
    titlePart = titleNorm.substring(0, available);
  } else {
    const cpp = Math.floor(available / words.length);
    const rem = available - cpp * words.length;
    titlePart = words.map((w, i) => w.substring(0, cpp + (i === 0 ? rem : 0))).join('');
  }
  return (dtNorm + titlePart).padEnd(15, 'x').substring(0, 15);
}

function generateMultiId(doctype, title) {
  const semantic = createSemantic(doctype, title);
  return semantic + generateRandom(15 - semantic.length);
}

function createSemantic(doctype, title) {
  const words = doctype.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/)
    .filter(w => !['of','the','and','or','for','in','on','at','to','a','an'].includes(w));
  const sig = words.length ? words : doctype.toLowerCase().split(/\s+/);

  let semantic;
  if (sig.length === 1) semantic = sig[0];
  else if (sig.length === 2) semantic = (sig[0] + sig[1]).substring(0, 10);
  else {
    semantic = sig[0].substring(0, 4);
    for (let i = 1; i < sig.length && semantic.length < 10; i++) {
      const abbr = sig[i][0] + sig[i].substring(1).replace(/[aeiou]/g, '');
      semantic += abbr.substring(0, Math.min(3, 10 - semantic.length));
    }
  }

  if (semantic.length < 10 && title) {
    semantic = (semantic + title.toLowerCase().replace(/[^a-z0-9]/g, '')).substring(0, 10);
  }

  return semantic.substring(0, 10);
}

function generateRandom(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function validateId(id) {
  return typeof id === 'string' && id.length === 15 && /^[a-z0-9]{15}$/.test(id);
}

// ============================================================
// FSM HELPERS — moved from CW-run.js
// Pure functions — read Schema/config only, no run_doc mutation
// ============================================================

// _getStateDef: merge SystemSchema dim + doctype dim for all dims
// returns { "0": { ...dim0 }, "1": { ...dim1 }, ... }
function _getStateDef(doctype) {
  const sys  = CW.Schema?.SystemSchema?._state || {};
  const dt   = CW.Schema?.[doctype]?._state    || {};
  const dims = new Set([...Object.keys(sys), ...Object.keys(dt)]);
  const merged = {};
  for (const dim of dims) {
    const sysDim = sys[dim] || {};
    const dtDim  = dt[dim]  || {};
    merged[dim] = Object.assign({}, sysDim, dtDim);
    // deep merge sideEffects — dtDim overrides sysDim per key
    merged[dim].sideEffects = Object.assign({}, sysDim.sideEffects || {}, dtDim.sideEffects || {});
  }
  return merged;
}

// _getDimValue: read current value for a dim from doc._state
// falls back to dimDef.fieldname field on doc, then dimDef.values[0]
function _getDimValue(doc, dim, dimDef) {
  var state = doc._state
  if (typeof state === 'string') { try { state = JSON.parse(state) } catch(_) { state = {} } }
  if (state && typeof state === 'object' && dim in state) return state[dim]
  if (dimDef?.fieldname && dimDef.fieldname in doc) return doc[dimDef.fieldname]
  return dimDef?.values?.[0] ?? 0
}

// _getTransitions: returns available transitions for a dim given current doc state
// filters by requires + rules, returns array of { signal, from, to, label, confirm }
// label overrides applied from schema.permissions.transitions for Self and all roles
function _getTransitions(schema, doc, dim) {
  const stateDef = _getStateDef(schema.schema_name || schema.name);
  const dimDef   = stateDef[dim];
  if (!dimDef) return [];

  const current = _getDimValue(doc, dim, dimDef);
  const tos     = dimDef.transitions?.[String(current)] || [];

  // build label overrides from schema.permissions.transitions
  // Self = current user is owner or subject of this document
  const currentUserId = CW._config?.currentUser?.id || ''
  const isSelf = !!(currentUserId && (doc.name === currentUserId || doc.owner === currentUserId))
  const labelOverrides = {}
  for (const p of (schema.permissions || [])) {
    if (p.role === 'Self' && !isSelf) continue
    for (const [signal, label] of Object.entries(p.transitions || {})) {
      if (signal.startsWith(dim + '.')) labelOverrides[signal] = label
    }
  }

  return tos
    .map(to => {
      const bareKey    = `${current}_${to}`;
      const signal     = `${dim}.${bareKey}`;
      const requires   = dimDef.requires?.[bareKey] || {};
      const rule       = dimDef.rules?.[bareKey];
      const reqPassed  = Object.entries(requires).every(([k, v]) => Number(schema[k] ?? 0) === Number(v));
      const rulePassed = typeof rule === 'function'
        ? rule({ target: { data: [doc] }, input: {} })
        : true;
      if (!reqPassed || !rulePassed) return null;
      return {
        signal,
        from:    current,
        to,
        label:   labelOverrides[signal] || dimDef.labels?.[bareKey],
        confirm: dimDef.confirm?.[bareKey],
      };
    })
    .filter(Boolean);
}

// _resolveViewComponent: schema view_components → config views → fallback
// returns { component, container } always
function _resolveViewComponent(doctype, view, fallback_container) {
  const dtViews = CW.Schema?.[doctype]?.view_components;
  if (dtViews?.[view]) return dtViews[view];
  const cfg = CW._config?.views?.[view];
  if (cfg) return cfg;
  return { component: 'MainForm', container: fallback_container || 'main_container' };
}

// ============================================================
// CW METHODS
// ============================================================

CW.getConfig = (path) => getByPath(CW._config, path);

CW.setConfig = (key, value) => { CW._config = CW._config || {}; CW._config[key] = value; };

CW.getBehavior = function(schema, doc) {
  const key = `${schema?.is_submittable || 0}-${doc?.docstatus ?? 0}-${schema?._autosave ?? 1}`;
  return CW._config.behaviorMatrix?.[key] || CW._config.behaviorMatrix?.['0-0-0'];
};

CW.evalTemplate = function(template, context) {
  if (typeof template !== 'string') return template;
  const match = template.match(/^\{\{(.+)\}\}$/);
  if (!match) return template;
  try {
    return new Function(...Object.keys(context), `return ${match[1]}`)(...Object.values(context));
  } catch (e) {
    console.warn('Template eval error:', match[1], e);
    return template;
  }
};

CW.evalTemplateObj = (obj, context) => {
  if (!obj) return {};
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, CW.evalTemplate(v, context)]));
};

// assign FSM helpers to CW — called by CW-run.js and CW-ui.js
CW._getStateDef          = _getStateDef;
CW._getDimValue          = _getDimValue;
CW._getTransitions       = _getTransitions;
CW._resolveViewComponent = _resolveViewComponent;

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
  CW._getFormButtons = _getFormButtons
});

console.log("✅ CW-utils.js v40 loaded");
