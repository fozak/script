const rateLimits = new Map();

export default {
  async fetch(req, env) {
    // 1. Rate limit by IP (FIRST - cheapest check)
    const ip = req.headers.get('CF-Connecting-IP');
    if (!checkRateLimit(ip, rateLimits, 100, 60000)) {
      return new Response('Too Many Requests', { status: 429 });
    }
    
    // 2. Body size limit (cheap validation)
    const contentLength = parseInt(req.headers.get('Content-Length') || 0);
    if (contentLength > 100 * 1024) {
      return new Response('Payload Too Large', { status: 413 });
    }
    
    // 3. Basic request validation
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    
    const contentType = req.headers.get('Content-Type');
    if (!contentType?.includes('application/json')) {
      return new Response('Invalid Content-Type', { status: 400 });
    }
    
    // 4. NOW check auth (expensive operation, protected by rate limit)
    let userAuth = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const jwtPayload = await verifyJWT(token, env.JWT_SECRET);
      
      if (!jwtPayload) {
        return new Response('Invalid token', { status: 401 });
      }
      
      // Fetch user profile with capabilities (expensive DB call)
      userAuth = await getUserWithCapabilities(jwtPayload.sub, env);
      
      if (!userAuth) {
        return new Response('User not found', { status: 401 });
      }
      
      // Secondary rate limit per user
      if (!checkRateLimit(`user:${userAuth.id}`, rateLimits, 1000, 60000)) {
        return new Response('User rate limit exceeded', { status: 429 });
      }
    }
    
    // 5. Parse body (only after all checks)
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }
    
    // 6. Schema validation
    if (!body.operation || typeof body.operation !== 'string') {
      return new Response('Invalid schema', { status: 400 });
    }
    
    // 7. Route to operation handler
    return handleOperation(body, userAuth, env);
  }
};

// ============================================================================
// RATE LIMITING
// ============================================================================

function checkRateLimit(key, rateLimits, max, windowMs) {
  const now = Date.now();
  
  let times = rateLimits.get(key);
  if (!times) {
    times = [];
    rateLimits.set(key, times);
  }
  
  // Remove old timestamps in-place
  while (times.length > 0 && times[0] <= now - windowMs) {
    times.shift();
  }
  
  if (times.length >= max) {
    return false;
  }
  
  times.push(now);
  return true;
}

// ============================================================================
// JWT VALIDATION
// ============================================================================

async function verifyJWT(token, secret) {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    // Verify signature
    const data = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signature = base64UrlDecode(signatureB64);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(data)
    );
    
    if (!valid) return null;
    
    // Decode payload
    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    );
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }
    
    return payload; // { sub: userId, exp, ... }
  } catch {
    return null;
  }
}

function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ============================================================================
// USER AUTHENTICATION & CAPABILITIES
// ============================================================================

async function getUserWithCapabilities(userId, env) {
  const userProfile = await env.DB.prepare(`
    SELECT 
      id,
      owner,
      _allowed,
      _allowed_read,
      data
    FROM item
    WHERE doctype = 'User' 
      AND json_extract(data, '$.user_id') = ?
  `).bind(userId).first();
  
  if (!userProfile) return null;
  
  // Parse capabilities from _allowed_read (JSON array)
  const capabilities = JSON.parse(userProfile._allowed_read || '[]');
  
  return {
    id: userId,
    capabilities: capabilities, // Roles from user profile
    profile: userProfile
  };
}

// ============================================================================
// OPERATION ROUTING
// ============================================================================

async function handleOperation(body, userAuth, env) {
  const { operation, doctype, id, data } = body;
  
  switch (operation) {
    case 'read':
    case 'select':
      if (!doctype || !id) {
        return jsonError('Missing doctype or id', 400);
      }
      return readRecord(doctype, id, userAuth, env);
    
    case 'update':
      if (!doctype || !id || !data) {
        return jsonError('Missing doctype, id, or data', 400);
      }
      return updateRecord(doctype, id, data, userAuth, env);
    
    case 'delete':
      if (!doctype || !id) {
        return jsonError('Missing doctype or id', 400);
      }
      return deleteRecord(doctype, id, userAuth, env);
    
    case 'create':
      if (!doctype || !data) {
        return jsonError('Missing doctype or data', 400);
      }
      return createRecord(doctype, data, userAuth, env);
    
    case 'list':
      if (!doctype) {
        return jsonError('Missing doctype', 400);
      }
      return listRecords(doctype, body.filter, userAuth, env);
    
    default:
      return jsonError('Unknown operation', 400);
  }
}

// ============================================================================
// RBAC ACCESS CONTROL
// ============================================================================

function getUserIdentities(userAuth) {
  if (!userAuth) return [];
  
  // User identities = own user ID + all capabilities from profile
  return [userAuth.id, ...userAuth.capabilities];
}

function hasIntersection(arr1, arr2) {
  if (!arr1 || !arr2) return false;
  if (arr1.length === 0 || arr2.length === 0) return false;
  return arr1.some(item => arr2.includes(item));
}

// ViewRule: Can user read this record?
function canView(owner, allowed, allowedRead, userAuth) {
  // 1. Ownership check
  if (userAuth && owner.includes(userAuth.id)) {
    return true;
  }
  
  // 2. Public access check
  if (allowedRead.includes('roleispublicxxx')) {
    return true;
  }
  
  // No auth = can only access public records
  if (!userAuth) {
    return false;
  }
  
  const userIdentities = getUserIdentities(userAuth);
  
  // 3. Write role match (write implies read)
  if (hasIntersection(userIdentities, allowed)) {
    return true;
  }
  
  // 4. Read-only role match
  if (hasIntersection(userIdentities, allowedRead)) {
    return true;
  }
  
  return false;
}

// UpdateRule: Can user write/delete this record?
function canUpdate(owner, allowed, userAuth) {
  if (!userAuth) return false;
  
  // 1. Ownership check
  if (owner.includes(userAuth.id)) {
    return true;
  }
  
  const userIdentities = getUserIdentities(userAuth);
  
  // 2. Write role match
  if (hasIntersection(userIdentities, allowed)) {
    return true;
  }
  
  return false;
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

async function readRecord(doctype, id, userAuth, env) {
  const record = await env.DB.prepare(`
    SELECT * FROM item WHERE id = ? AND doctype = ?
  `).bind(id, doctype).first();
  
  if (!record) {
    return jsonError('Not found', 404);
  }
  
  // Parse permission arrays
  const owner = JSON.parse(record.owner || '[]');
  const allowed = JSON.parse(record._allowed || '[]');
  const allowedRead = JSON.parse(record._allowed_read || '[]');
  
  // Check ViewRule
  if (!canView(owner, allowed, allowedRead, userAuth)) {
    return jsonError('Forbidden', 403);
  }
  
  return json({
    id: record.id,
    doctype: record.doctype,
    owner: owner,
    _allowed: allowed,
    _allowed_read: allowedRead,
    data: JSON.parse(record.data || '{}'),
    created: record.created,
    modified: record.modified
  });
}

async function updateRecord(doctype, id, data, userAuth, env) {
  if (!userAuth) {
    return jsonError('Authentication required', 401);
  }
  
  const record = await env.DB.prepare(`
    SELECT * FROM item WHERE id = ? AND doctype = ?
  `).bind(id, doctype).first();
  
  if (!record) {
    return jsonError('Not found', 404);
  }
  
  // Parse permission arrays
  const owner = JSON.parse(record.owner || '[]');
  const allowed = JSON.parse(record._allowed || '[]');
  
  // Check UpdateRule
  if (!canUpdate(owner, allowed, userAuth)) {
    return jsonError('Forbidden', 403);
  }
  
  // Perform update
  await env.DB.prepare(`
    UPDATE item 
    SET data = ?, modified = CURRENT_TIMESTAMP
    WHERE id = ? AND doctype = ?
  `).bind(JSON.stringify(data), id, doctype).run();
  
  return json({ success: true, id });
}

async function deleteRecord(doctype, id, userAuth, env) {
  if (!userAuth) {
    return jsonError('Authentication required', 401);
  }
  
  const record = await env.DB.prepare(`
    SELECT * FROM item WHERE id = ? AND doctype = ?
  `).bind(id, doctype).first();
  
  if (!record) {
    return jsonError('Not found', 404);
  }
  
  // Parse permission arrays
  const owner = JSON.parse(record.owner || '[]');
  const allowed = JSON.parse(record._allowed || '[]');
  
  // Check UpdateRule (delete = write operation)
  if (!canUpdate(owner, allowed, userAuth)) {
    return jsonError('Forbidden', 403);
  }
  
  await env.DB.prepare(`
    DELETE FROM item WHERE id = ? AND doctype = ?
  `).bind(id, doctype).run();
  
  return json({ success: true, id });
}

async function createRecord(doctype, data, userAuth, env) {
  if (!userAuth) {
    return jsonError('Authentication required', 401);
  }
  
  const id = crypto.randomUUID();
  
  // Default permissions: owner = creator, _allowed = creator's capabilities
  const owner = [userAuth.id];
  const allowed = userAuth.capabilities;
  const allowedRead = [];
  
  await env.DB.prepare(`
    INSERT INTO item (id, doctype, owner, _allowed, _allowed_read, data, created, modified)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    id,
    doctype,
    JSON.stringify(owner),
    JSON.stringify(allowed),
    JSON.stringify(allowedRead),
    JSON.stringify(data)
  ).run();
  
  return json({ success: true, id });
}

async function listRecords(doctype, filter, userAuth, env) {
  // Simple list - returns all records user can view
  // In production, add pagination, filtering, sorting
  
  const results = await env.DB.prepare(`
    SELECT * FROM item WHERE doctype = ? LIMIT 100
  `).bind(doctype).all();
  
  if (!results.results) {
    return json({ records: [] });
  }
  
  // Filter records based on ViewRule
  const accessible = results.results.filter(record => {
    const owner = JSON.parse(record.owner || '[]');
    const allowed = JSON.parse(record._allowed || '[]');
    const allowedRead = JSON.parse(record._allowed_read || '[]');
    
    return canView(owner, allowed, allowedRead, userAuth);
  });
  
  const records = accessible.map(record => ({
    id: record.id,
    doctype: record.doctype,
    owner: JSON.parse(record.owner || '[]'),
    _allowed: JSON.parse(record._allowed || '[]'),
    _allowed_read: JSON.parse(record._allowed_read || '[]'),
    data: JSON.parse(record.data || '{}'),
    created: record.created,
    modified: record.modified
  }));
  
  return json({ records });
}

// ============================================================================
// UTILITIES
// ============================================================================

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

