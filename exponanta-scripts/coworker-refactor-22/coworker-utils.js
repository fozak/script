// ============================================================
// coworker-utils.js — MERGED UTILITIES from pb-utils.js + coworker-utils.js v 21
// ============================================================


// ============================================================
// BASIC HELPERS
// ============================================================

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}



// ============================================================
// FINGERPRINTING + NORMALIZATION SYSTEM
// ============================================================

class Fingerprinter {
  static async hash(txt) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    const bytes = new Uint8Array(buf);
    const b32 = '0123456789abcdefghjkmnpqrstvwxyz';
    let bits = 0, val = 0, out = '';
    for (let i = 0; i < bytes.length && out.length < 15; i++) {
      val = (val << 8) | bytes[i];
      bits += 8;
      while (bits >= 5 && out.length < 15) {
        out += b32[(val >> (bits -= 5)) & 31];
      }
    }
    return out.padEnd(15, '0');
  }

  static normalize(value, type = 'string') {
    if (value === null || value === undefined) return '';

    switch (type) {
      case 'email':  return this.normalizeEmail(value);
      case 'phone':  return this.normalizePhone(value);
      case 'date':   return this.normalizeDate(value);
      case 'number': return String(Number(value));
      case 'string':
      default:
        return this.normalizeString(value);
    }
  }

  static normalizeString(str) {
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static normalizeEmail(email) {
    const cleaned = String(email).toLowerCase().trim();
    const [local, domain] = cleaned.split('@');
    if (!domain) return cleaned;

    const normalizedLocal = domain.includes('gmail.com')
      ? local.replace(/\./g, '').split('+')[0]
      : local.split('+')[0];

    return `${normalizedLocal}@${domain}`;
  }

  static normalizePhone(phone) {
    const digits = String(phone).replace(/\D/g, '');
    return digits.length === 11 && digits[0] === '1'
      ? digits.slice(1)
      : digits;
  }

  static normalizeDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  }

  static async fingerprint(obj, schema) {
    const parts = [];

    for (const [field, config] of Object.entries(schema)) {
      const value = obj[field];
      if (!value) continue;

      const normalized = this.normalize(value, config.type);
      if (!normalized) continue;

      const weight = config.weight || 1;
      for (let i = 0; i < weight; i++) parts.push(normalized);
    }

    if (!parts.length) return null;

    return await this.hash(parts.join('|'));
  }
}



// ============================================================
// COWORKER GLOBAL INITIALIZATION
// ============================================================

if (typeof window.coworker === 'undefined') {
  window.coworker = {
    _config: {},
    _handlers: {},
    _renderers: {}
  };
  console.log('✅ coworker object initialized');
}



// ============================================================
// PARSE LAYOUT
// ============================================================

function parseLayout(field_order, fields) {
  if (!field_order || !fields) {
    return {
      type: 'container',
      className: 'form.wrapper',
      children: []
    };
  }

  const sections = [];
  let currentSection = null;
  let currentColumn = null;

  field_order.forEach(item => {
    if (item.fieldtype === 'Section Break') {
      currentSection = {
        type: 'container',
        className: 'form.section',
        label: item.label,
        children: []
      };
      sections.push(currentSection);
      currentColumn = null;

    } else if (item.fieldtype === 'Column Break') {
      if (currentSection) {
        currentColumn = {
          type: 'container',
          className: 'form.column',
          children: []
        };
        if (!currentSection.columns) currentSection.columns = [];
        currentSection.columns.push(currentColumn);
      }

    } else {
      if (!item.fieldname || !fields[item.fieldname]) return;

      const fieldConfig = {
        type: 'field',
        field: fields[item.fieldname],
        fieldname: item.fieldname
      };

      if (currentColumn) {
        currentColumn.children.push(fieldConfig);
      } else if (currentSection) {
        if (!currentSection.directFields) currentSection.directFields = [];
        currentSection.directFields.push(fieldConfig);
      } else {
        if (!sections.length) {
          currentSection = {
            type: 'container',
            className: 'form.section',
            children: []
          };
          sections.push(currentSection);
        }
        if (!sections[0].directFields) sections[0].directFields = [];
        sections[0].directFields.push(fieldConfig);
      }
    }
  });

  return {
    type: 'container',
    className: 'form.wrapper',
    children: sections.map(section => {
      const children = [];

      if (section.label) {
        children.push({
          type: 'heading',
          level: 3,
          className: 'form.sectionLabel',
          content: section.label
        });
      }

      const rowChildren = [];

      if (section.columns?.length) {
        rowChildren.push(...section.columns);
      } else if (section.directFields?.length) {
        rowChildren.push({
          type: 'container',
          className: 'form.column',
          children: section.directFields
        });
      }

      if (rowChildren.length) {
        children.push({
          type: 'container',
          className: 'form.row',
          children: rowChildren
        });
      }

      return {
        type: 'container',
        className: 'form.section',
        children
      };
    })
  };
}



// ============================================================
// THE ONLY VALID generateId()
// ============================================================

function generateId(doctype) {
  const chars = '0123456789abcdefghjkmnpqrstvwxyz'; // lowercase, no vowels
  let hash = '';
  for (let i = 0; i < 15; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${doctype.toLowerCase()}_${hash}`;
}



// ============================================================
// debounce + deepClone
// ============================================================

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));

  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}
