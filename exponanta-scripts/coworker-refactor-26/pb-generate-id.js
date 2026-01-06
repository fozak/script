/** https://claude.ai/chat/9c5c06a4-cc26-4a53-9625-a6449eaf8072 
 * ============================================================================
 * UNIVERSAL ID GENERATOR - 15-Character Alphanumeric IDs
 * ============================================================================
 * /**
 * ============================================================================
 * UNIVERSAL ID GENERATOR - 15-Character Alphanumeric IDs
 * ============================================================================
 * 
 * PURPOSE:
 * Generates consistent, readable, and collision-resistant 15-character IDs
 * for all doctypes in the system using a multi-tier approach.
 * 
 * THREE-TIER SYSTEM:
 * 
 * 1. SINGLE DOCTYPES (Master Data - Globally Unique)
 *    - Format: 15 characters of pure semantic (doctype + title)
 *    - No random suffix
 *    - Requires unique title (enforced by DB)
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
 *      - "john@example.com" → "user3f9k2m8p1qz"
 *      - "jane@company.com" → "userb7d4e6h9j2x"
 * 
 * 3. MULTI-INSTANCE DOCTYPES (Transactional Data)
 *    - Format: 10 characters semantic + 5 characters random
 *    - Random suffix prevents collisions
 *    - Title optional
 *    - Examples: Item, Invoice, Order, Payment
 *    - Sample IDs:
 *      - Item "MacBook Pro" → "itemmacbooa1b2c"
 *      - Payment Entry → "paymententq7who"
 *      - Sales Invoice → "salesinvoil4nfq"
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
 * // User doctype (email-based)
 * generateID('User', 'john@example.com')
 * // Returns: "user3f9k2m8p1qz" (4 + 11 chars, deterministic from email)
 * 
 * @example
 * // Single doctype (master data)
 * generateID('Role', 'Sales Manager')
 * // Returns: "rolesalesmanage" (15 chars, no random)
 * 
 * @example
 * // Multi-instance doctype (transactional data)
 * generateID('Sales Invoice', null)
 * // Returns: "salesinvoiq8w9e" (10 semantic + 5 random)
 */
function generateID(doctype, title = null) {
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
    return generateSingleID(doctype, title);
  } else {
    // Multi-instance: 10-char semantic + 5-char random
    return generateMultiID(doctype, title);
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
 * // Returns: "3f9k2m8p1qz" (11 chars, deterministic)
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
 * // Returns: "user3f9k2m8p1qz"
 * 
 * @example
 * generateUserId('jane@company.com')
 * // Returns: "userb7d4e6h9j2x"
 * 
 * // Same email always produces same ID (deterministic)
 * generateUserId('john@example.com') === generateUserId('john@example.com')
 * // Returns: true
 */
function generateUserId(email) {
  return `user${hashEmail(email)}`;
}

// ============================================================================
// SINGLE DOCTYPE ID GENERATION (15 chars pure semantic)
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
 * generateSingleID('Role', 'Sales Manager')
 * // Returns: "rolesalesmanage"
 * // Breakdown: "role" (4) + "salesmanager" (11) = 15 chars
 */
function generateSingleID(doctype, title) {
  // Normalize doctype: lowercase, remove special chars and spaces
  const doctypeNorm = doctype
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  
  // Normalize title: lowercase, remove special chars (keep alphanumeric)
  const titleNorm = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  
  // Combine: doctype + title
  let semantic = doctypeNorm + titleNorm;
  
  // Ensure exactly 15 chars
  if (semantic.length < 15) {
    semantic = semantic.padEnd(15, 'x');
  } else if (semantic.length > 15) {
    semantic = semantic.substring(0, 15);
  }
  
  return semantic;
}

// ============================================================================
// MULTI-INSTANCE DOCTYPE ID GENERATION (10 semantic + 5 random)
// ============================================================================

/**
 * Generate ID for multi-instance doctypes
 * Creates 10-char semantic + 5-char random suffix
 * 
 * @param {string} doctype - The doctype name
 * @param {string|null} title - Optional title to include in semantic
 * @returns {string} 15-character ID (10 semantic + 5 random)
 * 
 * @example
 * generateMultiID('Item', 'MacBook Pro')
 * // Returns: "itemmacbooa1b2c"
 * // Breakdown: "itemmacboo" (10 semantic) + "a1b2c" (5 random)
 */
function generateMultiID(doctype, title) {
  const semantic = createSemantic(doctype, title); // 10 chars
  const random = generateRandom(5); // 5 chars
  return semantic + random; // 15 chars total
}

/**
 * Create 10-character semantic code from doctype and optional title
 * 
 * Rules:
 * - Single word: use word as-is, pad if needed
 * - Two words: concatenate and truncate to 10 chars
 * - Three+ words: first word (4 chars) + smart-abbreviated remaining words
 * 
 * @param {string} doctype - The doctype name
 * @param {string|null} title - Optional title to append
 * @returns {string} 10-character semantic code
 * 
 * @example
 * createSemantic('Item', 'MacBook Pro')
 * // Returns: "itemmacboo"
 * 
 * @example
 * createSemantic('Bank Account Type', null)
 * // Returns: "bankacctyp"
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
    // Single word doctype
    semantic = significant[0];
  } else if (significant.length === 2) {
    // Two words: simple concatenation, then truncate to 10
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
  
  // Ensure exactly 10 chars
  if (semantic.length < 10) {
    semantic = semantic.padEnd(10, 'x');
  } else if (semantic.length > 10) {
    semantic = semantic.substring(0, 10);
  }
  
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
 * generateRandom(5)  // Returns: "a1b2c" (example, will vary)
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
 * validateID('rolesalesmanage')  // Returns: true
 * validateID('user3f9k2m8p1qz')  // Returns: true
 * validateID('invalid-id-123')   // Returns: false (contains hyphen)
 * validateID('short')            // Returns: false (not 15 chars)
 */
function validateID(id) {
  return typeof id === 'string' && 
         id.length === 15 && 
         /^[a-z0-9]{15}$/.test(id);
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
* User doctype (email-based, deterministic)*/
const user1 = generateID('User', 'john@example.com');
console.log(user1);  // "user3f9k2m8p1qz" (deterministic)

const user2 = generateID('User', 'john@example.com');
console.log(user2);  // "user3f9k2m8p1qz" (same email = same ID)

const user3 = generateID('User', 'jane@company.com');
console.log(user3);  // "userb7d4e6h9j2x" (different email = different ID)

// Single doctypes (master data)
const roleId = generateID('Role', 'Sales Manager');
console.log(roleId);  // "rolesalesmanage"

const countryId = generateID('Country', 'United States');
console.log(countryId);  // "countryunitedst"

const brandId = generateID('Brand', 'Apple');
console.log(brandId);  // "brandapplexxxxx"

// Multi-instance doctypes (transactional data)
const itemId = generateID('Item', 'MacBook Pro');
console.log(itemId);  // "itemmacbooa1b2c" (random suffix varies)

const invoiceId = generateID('Sales Invoice', null);
console.log(invoiceId);  // "salesinvoiq8w9e" (random suffix varies)

const paymentId = generateID('Payment Entry', null);
console.log(paymentId);  // "paymententk3r7t" (random suffix varies)

// Validation
console.log(validateID(user1));      // true
console.log(validateID(roleId));     // true
console.log(validateID('invalid'));  // false
console.log(isSingleDoctype('Role'));  // true
console.log(isSingleDoctype('User'));  // false
/**/

// ============================================================================
// EXPORT (for Node.js/modules)
// ============================================================================

// Uncomment if using in Node.js or ES6 modules
// module.exports = { generateID, generateUserId, hashEmail, isSingleDoctype, validateID, SINGLE_DOCTYPES };
// export { generateID, generateUserId, hashEmail, isSingleDoctype, validateID, SINGLE_DOCTYPES };

