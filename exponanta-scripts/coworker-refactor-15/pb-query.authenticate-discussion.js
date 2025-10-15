javascript/**
 * @function pb._handleAuthenticate
 * @description Handles AUTHENTICATE operations
 * @param {string} doctype - Ignored for authenticate
 * @param {Object} query - Query object with data: {username, password}
 * @param {Object} schema - Schema (not used)
 * @param {Object} options - Response options
 * @returns {Promise<Object>} { data, meta? }
 */
pb._handleAuthenticate = async function (doctype, query, schema, options) {
  const { data } = query;
  const { includeMeta = false } = options;
  
  if (!data?.username || !data?.password) {
    throw new Error('AUTHENTICATE requires username and password');
  }
  
  // Call login endpoint
  const response = await fetch(`${this.server}/api/method/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
      usr: data.username,
      pwd: data.password
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Authentication failed');
  }
  
  const result = await response.json();
  
  // Store session
  const userData = {
    name: result.full_name || data.username,
    email: data.username,
    sid: result.sid,
    roles: result.roles || []
  };
  
  sessionStorage.setItem('pb_user', JSON.stringify(userData));
  sessionStorage.setItem('pb_authenticated', 'true');
  
  // Build response following pattern
  const responseObj = { data: [userData] };
  
  if (includeMeta) {
    responseObj.meta = {
      operation: 'authenticate',
      authenticated: true,
      timestamp: new Date().toISOString()
    };
  }
  
  return responseObj;
};
Update pb.query() switch statement:
javascriptswitch(operation.toLowerCase()) {
  case 'authenticate':
  case 'login':
    if (!data) throw new Error('AUTHENTICATE requires data');
    return this._handleAuthenticate(doctype, query, schema, options);
    
  case 'create':
  case 'insert':
    // ... existing code
Sample usage:
javascript// Authenticate
const result = await pb.query('User', {
  operation: 'authenticate',
  data: {
    username: 'admin@example.com',
    password: 'password123'
  }
}, {
  includeMeta: true
});

// Result: { data: [{name, email, sid, roles}], meta: {...} }