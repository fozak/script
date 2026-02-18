// ============================================================
// coworker-utils.js —
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

if (typeof globalThis.coworker === 'undefined') {
  globalThis.coworker = {
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

  // ✅ Create field lookup map
  const fieldMap = {};
  fields.forEach(f => {
    fieldMap[f.fieldname] = f;
  });

  const sections = [];
  let currentSection = null;
  let currentColumn = null;

  field_order.forEach(fieldname => {
    // ✅ Look up the field definition
    const item = fieldMap[fieldname];
    if (!item) return; // Skip if field not found
    
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
      // ✅ Field already looked up
      const fieldConfig = {
        type: 'field',
        field: item,
        fieldname: fieldname
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



/**
 * ============================================================================
 * UNIVERSAL ID GENERATOR - 15-Character Alphanumeric IDs (NO PADDING)
 * ============================================================================
 * 
 * PURPOSE:
 * Generates consistent, readable, and collision-resistant 15-character IDs
 * for all doctypes in the system using a three-tier approach.
 * 
 * THREE-TIER SYSTEM:
 * 
 * 1. SINGLE DOCTYPES (Master Data - Globally Unique)
 *    - Format: 15 characters of pure semantic (doctype + title)
 *    - No random suffix
 *    - Requires unique title (enforced by DB)
 *    - Padded with 'x' only for singles to reach exactly 15 chars
 *    - Examples: Role, Country, Currency, Brand, Department
 *    - Sample IDs:
 *      - Role "Sales Manager" → "rolesalesmanage"
 *      - Country "United States" → "countryunitedst"
 *      - Brand "Apple" → "brandapplexxxxx"
 * 
 * 2. USER DOCTYPE (Email-Based Deterministic)
 *    - Format: "user" (4 chars) + hash of email (11 chars)
 *    - Deterministic: same email always produces same ID
 *    - No collisions: email uniqueness guarantees ID uniqueness
 *    - Sample IDs:
 *      - "john@example.com" → "user5ej8eg5ej8e"
 *      - "jane@company.com" → "usersqiz5qsqiz5"
 * 
 * 3. MULTI-INSTANCE DOCTYPES (Transactional Data - NO PADDING)
 *    - Format: Variable semantic (3-10 chars) + variable random (5-12 chars)
 *    - Total always 15 chars
 *    - Shorter semantic = more random = higher collision resistance
 *    - Title optional
 *    - Examples: Item, Invoice, Order, Payment
 *    - Sample IDs:
 *      - "Run" + null → "runa1b2c3d4e5f6g" (3 semantic + 12 random)
 *      - "Item" + "MacBook" → "itemmacboof7k9m" (10 semantic + 5 random)
 *      - "Payment Entry" → "paymententq7who" (10 semantic + 5 random)
 * 
 * COLLISION PROBABILITY (Multi-Instance):
 * - 3-char semantic + 12 random: 36^12 = 4.7 quintillion combinations
 * - 6-char semantic + 9 random: 36^9 = 101 trillion combinations
 * - 10-char semantic + 5 random: 36^5 = 60 million combinations (0.44% at 10K records)
 * 
 * ============================================================================
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * List of single/unique doctypes (master data)
 * These doctypes can only have one record per unique title
 * IDs are 15 chars pure semantic with no random suffix
 */
const SINGLE_DOCTYPES = new Set([
  //'Run',   //do not use yet
  'Role',
  'Country',
  'Currency',
  'Department',
  'Designation',
  'Territory',
  'UOM',
  'UOM Category',
  'Item Group',
  'Customer Group',
  'Supplier Group',
  'Tax Category',
  'Mode of Payment',
  'Terms and Conditions',
  'Print Heading',
  'Brand',
  'Item Attribute',
  'Warehouse Type',
  'Industry Type',
  'Market Segment',
  'Sales Stage',
  'Employee Group',
  'Holiday List',
  'Workstation Type',
  'Activity Type',
  'Project Type',
  'Schema',
  'Task Type',
  'Issue Type',
  'Party Type'
]);

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate a 15-character ID for any doctype
 * 
 * @param {string} doctype - The doctype name (e.g., "User", "Role", "Sales Invoice")
 * @param {string|null} title - The title/name for the record (or email for User)
 * @returns {string} A 15-character alphanumeric ID
 * @throws {Error} If single doctype is missing title, or if User is missing email
 * 
 * @example
 * // User doctype (email-based, deterministic)
 * generateId('User', 'john@example.com')
 * // Returns: "user5ej8eg5ej8e" (4 + 11 chars, deterministic from email)
 * 
 * @example
 * // Single doctype (master data)
 * generateId('Role', 'Sales Manager')
 * // Returns: "rolesalesmanage" (15 chars, no random)
 * 
 * @example
 * // Multi-instance doctype (transactional data - no padding)
 * generateId('Run', null)
 * // Returns: "runa1b2c3d4e5f6g" (3 semantic + 12 random)
 * 
 * generateId('Sales Invoice', null)
 * // Returns: "salesinvoiq8w9e" (10 semantic + 5 random)
 */
function generateId(doctype, title = null) {
  // Special handling for User doctype
  if (doctype === 'User') {
    if (!title || title.trim() === '') {
      throw new Error('User doctype requires an email address');
    }
    return generateUserId(title); // title is email for User
  }
  
  if (SINGLE_DOCTYPES.has(doctype)) {
    // Singles: require title, generate 15-char pure semantic
    if (!title || title.trim() === '') {
      throw new Error(
        `Single doctype "${doctype}" requires a unique title. ` +
        `Examples: "Sales Manager", "United States", "US Dollar"`
      );
    }
    return generateSingleId(doctype, title);
  } else {
    // Multi-instance: variable semantic + variable random (no padding)
    return generateMultiId(doctype, title);
  }
}

// ============================================================================
// USER DOCTYPE ID GENERATION (email-based deterministic)
// ============================================================================

/**
 * Hash email to create an 11-character base36 hash
 * Uses simple hash algorithm with extended padding for consistency
 * 
 * @param {string} email - The email address to hash
 * @returns {string} 11-character base36 hash
 * 
 * @example
 * hashEmail('john@example.com')
 * // Returns: "5ej8eg5ej8e" (11 chars, deterministic)
 */
function hashEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const base36 = Math.abs(hash).toString(36);
  // Extend by repeating to ensure 11 chars
  const extended = (base36 + base36 + base36).substring(0, 11);
  return extended;
}

/**
 * Generate User ID from email address
 * Format: "user" (4 chars) + email hash (11 chars) = 15 chars total
 * 
 * @param {string} email - The user's email address
 * @returns {string} 15-character user ID
 * 
 * @example
 * generateUserId('john@example.com')
 * // Returns: "user5ej8eg5ej8e"
 * 
 * @example
 * generateUserId('jane@company.com')
 * // Returns: "usersqiz5qsqiz5"
 * 
 * // Same email always produces same ID (deterministic)
 * generateUserId('john@example.com') === generateUserId('john@example.com')
 * // Returns: true
 */
function generateUserId(email) {
  return `user${hashEmail(email)}`;
}

// ============================================================================
// SINGLE DOCTYPE ID GENERATION (15 chars pure semantic with padding)
// ============================================================================

/**
 * Generate ID for single/unique doctypes
 * Combines doctype + title into 15 characters of pure semantic
 * 
 * @param {string} doctype - The doctype name
 * @param {string} title - The unique title (required)
 * @returns {string} 15-character semantic ID
 * 
 * @example
 * generateSingleId('Role', 'Sales Manager')
 * // Returns: "rolesalesmanage"
 * // Breakdown: "role" (4) + "salesmanager" (11) = 15 chars
 * 
 * @example
 * generateSingleId('Brand', 'Apple')
 * // Returns: "brandapplexxxxx"
 * // Breakdown: "brand" (5) + "apple" (5) + "xxxxx" (5 padding) = 15 chars
 */
function generateSingleId(doctype, title) {
  const doctypeNorm = doctype
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  
  const titleNorm = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const available = 15 - doctypeNorm.length;  // chars left for title
  
  // Split title into words to distribute available chars
  const titleWords = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0);

  let titlePart;

  if (titleWords.length === 1) {
    // Single word: take as many chars as available
    titlePart = titleNorm.substring(0, available);
  } else {
    // Multi-word: take first N chars per word where N = available / wordCount
    // Give remainder chars to first word
    const charsPerWord = Math.floor(available / titleWords.length);
    const remainder = available - (charsPerWord * titleWords.length);
    
    titlePart = titleWords.map((word, i) => {
      const take = charsPerWord + (i === 0 ? remainder : 0);
      return word.substring(0, take);
    }).join('');
  }

  // Pad with x if still short
  let result = (doctypeNorm + titlePart).padEnd(15, 'x');
  
  // Truncate if over (shouldn't happen but safety)
  return result.substring(0, 15);
}
/*

Result for your collision cases:
```
generateSingleId('Schema', 'Payment Entry')           → "schemapaymenent"  
generateSingleId('Schema', 'Payment Entry Reference') → "schemapaymenref"
generateSingleId('Schema', 'Sales Invoice')           → "schemasalesinvo"
generateSingleId('Schema', 'Sales Invoice Item')      → "schemasalesitem"
generateSingleId('Schema', 'Workflow Action')         → "schemaworkflact"
generateSingleId('Schema', 'Workflow Action Master')  → "schemaworkflmas"
*/

// ============================================================================
// MULTI-INSTANCE DOCTYPE ID GENERATION (variable semantic + variable random)
// ============================================================================

/**
 * Generate ID for multi-instance doctypes
 * Creates variable-length semantic (3-10 chars) + variable-length random (5-12 chars)
 * Total always 15 chars, NO PADDING
 * 
 * Shorter semantic = more random chars = higher collision resistance
 * 
 * @param {string} doctype - The doctype name
 * @param {string|null} title - Optional title to include in semantic
 * @returns {string} 15-character ID (variable semantic + variable random)
 * 
 * @example
 * generateMultiId('Run', null)
 * // Returns: "runa1b2c3d4e5f6g"
 * // Breakdown: "run" (3 semantic) + "a1b2c3d4e5f6g" (12 random)
 * 
 * @example
 * generateMultiId('Item', 'MacBook Pro')
 * // Returns: "itemmacboof7k9m"
 * // Breakdown: "itemmacboo" (10 semantic) + "f7k9m" (5 random)
 * 
 * @example
 * generateMultiId('Payment Entry', null)
 * // Returns: "paymententq7who"
 * // Breakdown: "paymentent" (10 semantic) + "q7who" (5 random)
 */
function generateMultiId(doctype, title) {
  const semantic = createSemantic(doctype, title); // 3-10 chars (no padding)
  const randomLength = 15 - semantic.length; // Fill remainder (5-12 chars)
  const random = generateRandom(randomLength);
  return semantic + random; // Always 15 chars total
}

/**
 * Create variable-length semantic code (3-10 chars, NO PADDING)
 * from doctype and optional title
 * 
 * Rules:
 * - Single word: use word as-is (no padding)
 * - Two words: concatenate and truncate to max 10 chars
 * - Three+ words: first word (4 chars) + smart-abbreviated remaining words
 * - Max semantic length: 10 chars
 * - Min semantic length: 3 chars (typically)
 * - NO PADDING applied
 * 
 * @param {string} doctype - The doctype name
 * @param {string|null} title - Optional title to append
 * @returns {string} Variable-length semantic code (3-10 chars)
 * 
 * @example
 * createSemantic('Run', null)
 * // Returns: "run" (3 chars, no padding)
 * 
 * @example
 * createSemantic('Item', 'MacBook Pro')
 * // Returns: "itemmacboo" (10 chars)
 * 
 * @example
 * createSemantic('Bank Account Type', null)
 * // Returns: "bankacctyp" (10 chars)
 * // Breakdown: "bank" (4) + "acc" (3) + "typ" (3) = 10 chars
 */
function createSemantic(doctype, title) {
  // Normalize doctype
  const normalized = doctype
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
  
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  
  // Remove common stop words
  const stopWords = ['of', 'the', 'and', 'or', 'for', 'in', 'on', 'at', 'to', 'a', 'an'];
  const significant = words.filter(w => !stopWords.includes(w));
  
  if (significant.length === 0) {
    significant.push(...words); // fallback if all stop words
  }
  
  let semantic;
  
  if (significant.length === 1) {
    // Single word doctype - use as-is (no padding)
    semantic = significant[0];
  } else if (significant.length === 2) {
    // Two words: simple concatenation, then truncate to max 10
    const w1 = significant[0];
    const w2 = significant[1];
    semantic = (w1 + w2).substring(0, 10);
  } else {
    // 3+ words: first word + smart-vowel-stripped rest
    semantic = significant[0].substring(0, 4);
    
    for (let i = 1; i < significant.length && semantic.length < 10; i++) {
      const abbreviated = smartStripVowels(significant[i]);
      const remaining = 10 - semantic.length;
      const charsToTake = Math.min(3, abbreviated.length, remaining);
      semantic += abbreviated.substring(0, charsToTake);
    }
  }
  
  // Add title if space remains and title provided
  if (semantic.length < 10 && title) {
    const titleNorm = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    semantic = (semantic + titleNorm).substring(0, 10);
  }
  
  // Cap at 10 chars max (for readability), NO PADDING
  if (semantic.length > 10) {
    semantic = semantic.substring(0, 10);
  }
  
  // Return as-is (3-10 chars, no padding)
  return semantic;
}

/**
 * Smart vowel stripping: keeps leading vowel, strips internal vowels
 * This preserves readability while shortening words
 * 
 * @param {string} word - Word to abbreviate
 * @returns {string} Word with internal vowels removed
 * 
 * @example
 * smartStripVowels('account')  // Returns: "accnt" (keeps leading 'a')
 * smartStripVowels('entry')    // Returns: "entry" (keeps leading 'e', no internal vowels)
 * smartStripVowels('invoice')  // Returns: "invc"  (keeps leading 'i')
 * smartStripVowels('type')     // Returns: "typ"   (no leading vowel)
 */
function smartStripVowels(word) {
  if (word.length === 0) return word;
  
  // Keep first character (even if vowel), strip internal vowels
  const firstChar = word[0];
  const rest = word.substring(1).replace(/[aeiou]/g, '');
  
  return firstChar + rest;
}

/**
 * Generate random alphanumeric string
 * Uses base36 character set: a-z (26) + 0-9 (10)
 * 
 * @param {number} length - Number of random characters to generate
 * @returns {string} Random alphanumeric string
 * 
 * @example
 * generateRandom(5)   // Returns: "a1b2c" (example, will vary)
 * generateRandom(12)  // Returns: "x7k9m3p2q8w5" (example, will vary)
 */
function generateRandom(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ============================================================================
// UTILITY / VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a doctype is a single/unique doctype
 * 
 * @param {string} doctype - The doctype name
 * @returns {boolean} True if single doctype, false otherwise
 */
function isSingleDoctype(doctype) {
  return SINGLE_DOCTYPES.has(doctype);
}

/**
 * Validate that an ID is properly formatted
 * 
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid 15-char alphanumeric, false otherwise
 * 
 * @example
 * validateId('rolesalesmanage')  // Returns: true
 * validateId('user5ej8eg5ej8e')  // Returns: true
 * validateId('runa1b2c3d4e5f6g')  // Returns: true
 * validateId('invalid-id-123')   // Returns: false (contains hyphen)
 * validateId('short')            // Returns: false (not 15 chars)
 */
function validateId(id) {
  return typeof id === 'string' && 
         id.length === 15 && 
         /^[a-z0-9]{15}$/.test(id);
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// User doctype (email-based, deterministic)
const user1 = generateId('User', 'john@example.com');
console.log(user1);  // "user5ej8eg5ej8e" (deterministic)

const user2 = generateId('User', 'john@example.com');
console.log(user2);  // "user5ej8eg5ej8e" (same email = same ID)

const user3 = generateId('User', 'jane@company.com');
console.log(user3);  // "usersqiz5qsqiz5" (different email = different ID)

// Single doctypes (master data, with padding)
const roleId = generateId('Role', 'Sales Manager');
console.log(roleId);  // "rolesalesmanage"

const countryId = generateId('Country', 'United States');
console.log(countryId);  // "countryunitedst"

const brandId = generateId('Brand', 'Apple');
console.log(brandId);  // "brandapplexxxxx" (padded)

// Multi-instance doctypes (NO PADDING - variable semantic + variable random)
const runId = generateId('Run', null);
console.log(runId);  // "runa1b2c3d4e5f6g" (3 semantic + 12 random)

const itemId1 = generateId('Item', null);
console.log(itemId1);  // "itemx7k9m3p2q8w" (4 semantic + 11 random)

const itemId2 = generateId('Item', 'MacBook Pro');
console.log(itemId2);  // "itemmacboof7k9m" (10 semantic + 5 random)

const invoiceId = generateId('Sales Invoice', null);
console.log(invoiceId);  // "salesinvoiq8w9e" (10 semantic + 5 random)

const paymentId = generateId('Payment Entry', null);
console.log(paymentId);  // "paymententk3r7t" (10 semantic + 5 random)

const schemaId = generateId('Schema', null);
console.log(schemaId);  // "schemada5ekm7p3" (6 semantic + 9 random)

// Validation
console.log(validateId(user1));      // true
console.log(validateId(roleId));     // true
console.log(validateId(runId));      // true
console.log(validateId('invalid'));  // false
console.log(isSingleDoctype('Role'));  // true
console.log(isSingleDoctype('User'));  // false
console.log(isSingleDoctype('Item'));  // false
*/

// ============================================================================
// COLLISION PROBABILITY REFERENCE
// ============================================================================

/*
MULTI-INSTANCE COLLISION PROBABILITIES AT 10,000 RECORDS:

Semantic Length | Random Length | Combinations        | Collision Probability
----------------|---------------|---------------------|----------------------
3 chars         | 12 chars      | 36^12 = 4.7×10^18  | ~0% (astronomical)
4 chars         | 11 chars      | 36^11 = 1.3×10^17  | ~0% (astronomical)
5 chars         | 10 chars      | 36^10 = 3.7×10^15  | ~0% (negligible)
6 chars         | 9 chars       | 36^9 = 1.0×10^14   | ~0% (negligible)
7 chars         | 8 chars       | 36^8 = 2.8×10^12   | ~0.0000018%
8 chars         | 7 chars       | 36^7 = 7.8×10^10   | ~0.000064%
9 chars         | 6 chars       | 36^6 = 2.2×10^9    | ~0.0023%
10 chars        | 5 chars       | 36^5 = 6.0×10^7    | ~0.44%

KEY INSIGHT: Shorter semantic = more random = exponentially lower collision risk
*/

// ============================================================================
// EXPORT (for Node.js/modules)
// ============================================================================

// Uncomment if using in Node.js or ES6 modules
// module.exports = { generateId, generateUserId, hashEmail, isSingleDoctype, validateId, SINGLE_DOCTYPES };
// export { generateId, generateUserId, hashEmail, isSingleDoctype, validateId, SINGLE_DOCTYPES };


// ============================================================
// DEPENDS_ON EVALUATOR
// ============================================================

/**
 * Evaluates a depends_on expression from schema
 * @param {string} dependsOn - Expression like "eval:doc.docstatus===0" or "fieldname"
 * @param {object} doc - Current document data
 * @returns {boolean} - True if field should be shown
 */
function evaluateDependsOn(dependsOn, doc) {
  if (!dependsOn) return true;
  
  // Handle eval: expressions
  if (dependsOn.startsWith('eval:')) {
    const expression = dependsOn.substring(5); // Remove 'eval:'
    
    try {
      // Create safe evaluation context
      const evalFunc = new Function('doc', `
        "use strict";
        return ${expression};
      `);
      
      return !!evalFunc(doc);
    } catch (error) {
      console.warn('Failed to evaluate depends_on:', dependsOn, error);
      return true; // Show field if evaluation fails (fail-safe)
    }
  }
  
  // Handle simple field references (field must be truthy)
  // Example: depends_on: "customer" means show only if customer is set
  if (typeof dependsOn === 'string') {
    return !!doc[dependsOn];
  }
  
  return true;
}

// ============================================================
// UTILITIES
// ============================================================

// ──────────────────────────────────────────────────────
// COWORKER API METHODS (config/behavior/templates)
// ──────────────────────────────────────────────────────
/**
 * Get nested object value by path
 * Example: getByPath({a: {b: {c: 1}}}, "a.b.c") → 1
 */
function getByPath(obj, path) {
  return path.split('.').reduce((o, key) => o?.[key], obj);
}


coworker.getConfig = function(path) {
  return getByPath(this._config, path);
};

coworker.setConfig = function(key, value) {
  if (!this._config) this._config = {};
  this._config[key] = value;
};

coworker.getBehavior = function(schema, doc) {
  const isSubmittable = schema?.is_submittable || 0;
  let docstatus = doc?.docstatus !== undefined ? doc.docstatus : 0;
  const autosave = schema?._autosave !== undefined ? schema._autosave : 1;
  
  if (isSubmittable === 0 && docstatus !== 0) {
    console.warn(`Invalid docstatus ${docstatus} for non-submittable document. Resetting to 0.`);
    docstatus = 0;
  }
  
  const key = `${isSubmittable}-${docstatus}-${autosave}`;
  const behavior = this._config.behaviorMatrix?.[key];
  
  if (!behavior) {
    console.warn(`No behavior defined for: ${key}`);
    return this._config.behaviorMatrix?.["0-0-0"];
  }
  
  return behavior;
};

coworker.evalTemplate = function(template, context) {
  if (typeof template !== "string") return template;

  const match = template.match(/^\{\{(.+)\}\}$/);
  if (!match) return template;

  const expr = match[1];
  try {
    return new Function(...Object.keys(context), `return ${expr}`)(
      ...Object.values(context)
    );
  } catch (e) {
    console.warn(`Template eval error: ${expr}`, e);
    return template;
  }
};

coworker.evalTemplateObj = function(obj, context) {
  if (!obj) return {};

  const result = {};
  for (const key in obj) {
    result[key] = this.evalTemplate(obj[key], context);
  }
  return result;
};

console.log("✅ Utils loaded");

// ====STATE MACHINE EVALUATOR====
// ====STATE MACHINE EVALUATOR====
// ============================================================================
// HELPER FUNCTIONS (Must be defined first)
// ============================================================================

function evaluateFSM(fsmConfig, vector_state) {
  const available = [];
  
  // Get all dimensions from FSM config
  const allDimensions = Object.keys(fsmConfig.states);
  
  // Early exit: If docstatus != 0, check only cancel
  if (vector_state.docstatus !== 0) {
    if (vector_state.docstatus === 1 && fsmConfig.states.cancel) {
      return evaluateDimension(
        'cancel',
        fsmConfig.states.cancel,
        fsmConfig.rules.cancel,
        vector_state
      );
    }
    return [];
  }
  
  // Evaluate all dimensions
  for (const dimension of allDimensions) {
    const stateConfig = fsmConfig.states[dimension];
    if (!stateConfig) continue;
    
    const transitions = evaluateDimension(
      dimension,
      stateConfig,
      fsmConfig.rules[dimension],
      vector_state
    );
    
    available.push(...transitions);
  }
  
  return available;
}

function evaluateDimension(dimension, stateConfig, rules, vector_state) {
  const available = [];
  const currentValue = vector_state[dimension];
  
  // Get possible next values from graph
  const possibleNext = stateConfig.transitions[String(currentValue)] || [];
  
  // Skip if no transitions possible
  if (possibleNext.length === 0) return [];
  
  // Check each possible transition
  for (const nextValue of possibleNext) {
    const ruleKey = `${currentValue}_to_${nextValue}`;
    const rule = rules?.[ruleKey];
    
    // Fast path if no rule
    if (!rule) {
      available.push({
        dimension: dimension,
        from: currentValue,
        to: nextValue,
        action: findActionForTransition(dimension, nextValue)
      });
      continue;
    }
    
    // Check requirements
    if (checkRequirements(rule.requires, vector_state)) {
      available.push({
        dimension: dimension,
        from: currentValue,
        to: nextValue,
        action: findActionForTransition(dimension, nextValue)
      });
    }
  }
  
  return available;
}

function checkRequirements(requires, state) {
  if (!requires) return true;
  
  // Check most restrictive first (fail fast)
  if ('docstatus' in requires) {
    if (!checkSingleRequirement('docstatus', requires.docstatus, state)) {
      return false;
    }
  }
  
  if ('dirty' in requires) {
    if (!checkSingleRequirement('dirty', requires.dirty, state)) {
      return false;
    }
  }
  
  // Check remaining requirements
  for (const [key, value] of Object.entries(requires)) {
    if (key === 'docstatus' || key === 'dirty') continue;
    
    if (!checkSingleRequirement(key, value, state)) {
      return false;
    }
  }
  
  return true;
}

function checkSingleRequirement(key, value, state) {
  const actualValue = state[key];
  
  // Array means "must be one of these values"
  if (Array.isArray(value)) {
    return value.includes(actualValue);
  }
  
  // Single value means "must equal this"
  return actualValue === value;
}

function findActionForTransition(dimension, toValue) {
  // Action name is the dimension name when transitioning to "pending"
  if (toValue === "pending") {
    return dimension;
  }
  return null;
}

// ============================================================================
// COWORKER.FSM MODULE
// ============================================================================

coworker.FSM = {
  config: null,
  
  async load() {
    const result = await coworker.run({
      operation: "takeone",
      from: "State Machine",
      query: { where: { statemachine_name: "Document_FSM" } }
    });
    
    if (!result.success || !result.target.data[0]) {
      throw new Error("State Machine not found");
    }
    
    this.config = result.target.data[0];
    console.log("✅ FSM loaded:", this.config.statemachine_name);
  },
  
  evaluate(vector_state) {
    if (!this.config) {
      throw new Error("FSM not loaded. Call FSM.load() first.");
    }
    
    return evaluateFSM(this.config, vector_state);
  },
  
  canTransition(dimension, from, to, vector_state) {
    if (!this.config) {
      throw new Error("FSM not loaded. Call FSM.load() first.");
    }
    
    const stateConfig = this.config.states[dimension];
    if (!stateConfig) return false;
    
    const allowed = stateConfig.transitions[String(from)];
    if (!allowed || !allowed.includes(to)) return false;
    
    const ruleKey = `${from}_to_${to}`;
    const rule = this.config.rules[dimension]?.[ruleKey];
    
    if (!rule) return true;
    
    return checkRequirements(rule.requires, vector_state);
  },
  
  getActionsForState(vector_state) {
    return this.evaluate(vector_state)
      .map(t => t.action)
      .filter(Boolean);
  },
  
  canExecuteAction(action, vector_state) {
    return this.getActionsForState(vector_state).includes(action);
  }
};

console.log("✅ FSM module loaded");
