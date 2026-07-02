[SIGNIN - your flow]
user signs in
        ↓
verify password
        ↓
generateToken(user)
  payload: {
    sub: user.email,
    name: user.name,
    _allowed_read: user._allowed_read,  // full roles
    exp: now + 86400
  }
  sign with jwtSecret
        ↓
return token to client

[EVERY REQUEST - your flow]
client sends Bearer token
        ↓
gateway verifyJWT(token, jwtSecret)
  ├── signature check
  └── exp check
        ↓ valid
run_doc.user = payload  // full stub, no DB hit
{
  sub: "user@example.com",
  name: "John",
  _allowed_read: ["System Manager"]
}
        ↓
controller uses run_doc.user._allowed_read
for permission checks




generateToken: "async function(run_doc) {
  const user = run_doc.target.data[0];
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: user.email,
    name: user.name,
    _allowed_read: user._allowed_read,
    exp: Math.floor(Date.now() / 1000) + 86400
  }));
  const data = header + '.' + payload;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(this.config.jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  run_doc.ephemeral = run_doc.ephemeral || {};
  run_doc.ephemeral.token = data + '.' + btoa(String.fromCharCode(...new Uint8Array(sig)));
  return run_doc;
}"



auth_adapter = {
  doctype: "Adapter",
  name: "auth-fsm-controller",
  adapter_name: "auth-fsm",
  _states: "",
  permissions: "",

  config: {
    fieldStates: {
      auth_status: {
        graph: {
          0: { 1: {} },
          1: { 2: {}, 3: {}, 4: {} },
          2: { 1: {}, 4: {} },
          3: { 1: {}, 4: {} },
          4: { 1: {} },
        },
        rules: {
          "0->1": "doc.email_status === 2",
          "3->1": "doc.locked_until && new Date(doc.locked_until) < now",
        },
      },
      email_status: {
        graph: {
          0: { 1: {} },
          1: { 2: {}, 3: {}, 0: {} },
          3: { 1: {} },
          2: {},
        },
        rules: {
          "0->1": "doc.email && doc.email.includes('@')",
          "1->2": "doc.verification_code_valid === true",
        },
      },
    },
    security: {
      maxLoginAttempts: 3,
      lockDuration: 900000,
      verificationCodeExpiry: 3600000,
      sessionTimeout: 86400000,
    },
  },

  functions: {

    
    signup:
      "async function(run_doc) { const email = run_doc.input.email; const password = run_doc.input.password; const storage = run_doc.target.storage; const existing = await storage.get(email); if (existing) { if (existing.email_status !== 2) { run_doc.output = { success: false, error: 'Email already registered but not verified', suggestion: {operation: 'resend_verification', email} }; return run_doc; } run_doc.output = { success: false, error: 'Email already registered', suggestion: {operation: 'signin', email} }; return run_doc; } const user = { name: email, doctype: 'User', email: email, password: await this.hashPassword(password), auth_status: 0, email_status: 0, verification_code: this.generateCode(), verification_code_expires_at: new Date(Date.now() + this.config.security.verificationCodeExpiry).toISOString(), created_at: new Date().toISOString() }; await storage.put(user); await this.sendVerificationEmail(user); run_doc.doc = user; run_doc.input = {email_status: 1}; await this.transitionField(run_doc); run_doc.output = { success: true, user: this.sanitizeUser(run_doc.doc), nextStep: {operation: 'verify_email', email} }; return run_doc; }",

    signin:
      "async function(run_doc) { const email = run_doc.input.email; const password = run_doc.input.password; const storage = run_doc.target.storage; const user = await storage.get(email); if (!user) { run_doc.output = { success: false, error: 'Account not found', suggestion: {operation: 'signup', email} }; return run_doc; } if (user.auth_status === 3) { const lockExpired = user.locked_until && new Date(user.locked_until) < new Date(); if (!lockExpired) { run_doc.output = { success: false, error: 'Account locked due to failed login attempts', lockedUntil: user.locked_until }; return run_doc; } run_doc.doc = user; run_doc.input = {auth_status: 1}; await this.transitionField(run_doc); user.auth_status = 1; } if (user.email_status !== 2) { run_doc.output = { success: false, error: 'Email not verified', suggestion: {operation: 'resend_verification', email} }; return run_doc; } const passwordValid = await this.verifyPassword(password, user.password); if (!passwordValid) { user.failed_login_attempts = (user.failed_login_attempts || 0) + 1; if (user.failed_login_attempts >= this.config.security.maxLoginAttempts) { user.locked_until = new Date(Date.now() + this.config.security.lockDuration).toISOString(); run_doc.doc = user; run_doc.input = {auth_status: 3, locked_until: user.locked_until}; await this.transitionField(run_doc); run_doc.output = { success: false, error: 'Account locked due to too many failed attempts', lockedUntil: user.locked_until }; return run_doc; } await storage.put(user); run_doc.output = { success: false, error: 'Invalid password', attemptsRemaining: this.config.security.maxLoginAttempts - user.failed_login_attempts }; return run_doc; } user.failed_login_attempts = 0; user.last_login_at = new Date().toISOString(); run_doc.doc = user; run_doc.input = {auth_status: 1}; await this.transitionField(run_doc); const token = await this.generateToken(run_doc.doc); run_doc.output = { success: true, user: this.sanitizeUser(run_doc.doc), token: token }; return run_doc; }",

    verifyEmail:
      "async function(run_doc) { const email = run_doc.input.email; const code = run_doc.input.code; const storage = run_doc.target.storage; const user = await storage.get(email); if (!user) { run_doc.output = {success: false, error: 'User not found'}; return run_doc; } if (user.email_status === 2) { run_doc.output = {success: false, error: 'Email already verified'}; return run_doc; } if (user.verification_code_expires_at && new Date(user.verification_code_expires_at) < new Date()) { run_doc.output = { success: false, error: 'Verification code expired', suggestion: {operation: 'resend_verification', email} }; return run_doc; } if (user.verification_code !== code) { run_doc.output = {success: false, error: 'Invalid verification code'}; return run_doc; } user.verification_code_valid = true; run_doc.doc = user; run_doc.input = {email_status: 2}; await this.transitionField(run_doc); run_doc.output = { success: true, user: this.sanitizeUser(run_doc.doc), nextStep: {operation: 'signin', email} }; return run_doc; }",

    resendVerification:
      "async function(run_doc) { const email = run_doc.input.email; const storage = run_doc.target.storage; const user = await storage.get(email); if (!user) { run_doc.output = {success: false, error: 'User not found'}; return run_doc; } if (user.email_status === 2) { run_doc.output = {success: false, error: 'Email already verified'}; return run_doc; } user.verification_code = this.generateCode(); user.verification_code_expires_at = new Date(Date.now() + this.config.security.verificationCodeExpiry).toISOString(); user.verification_code_valid = false; await storage.put(user); await this.sendVerificationEmail(user); run_doc.doc = user; run_doc.input = {email_status: 1}; await this.transitionField(run_doc); run_doc.output = { success: true, message: 'Verification email sent' }; return run_doc; }",

    signout:
      "async function(run_doc) { const token = run_doc.input.token; await this.invalidateToken(token); run_doc.output = {success: true}; return run_doc; }",

    transitionField:
      "async function(run_doc) { const doc = run_doc.doc; const input = run_doc.input; const now = new Date(); const schema = run_doc.target.schema; for (let [fieldname, config] of Object.entries(this.config.fieldStates)) { if (!input.hasOwnProperty(fieldname)) continue; const fromValue = doc[fieldname]; const toValue = input[fieldname]; if (fromValue === toValue) continue; const allowed = config.graph[fromValue]; if (!allowed || !allowed.hasOwnProperty(toValue)) { throw new Error(`Invalid transition ${fieldname}: ${fromValue} -> ${toValue}`); } const ruleKey = `${fromValue}->${toValue}`; const rule = config.rules?.[ruleKey]; if (rule) { const passed = this.evalRule(rule, doc, run_doc.ctx, now); if (!passed) { throw new Error(`Rule failed for ${fieldname} ${ruleKey}`); } } doc[fieldname] = toValue; } await this.computeFields(run_doc); const storage = run_doc.target.storage; await storage.put(doc); return run_doc; }",

    computeFields:
      "async function(run_doc) { const schema = run_doc.target.schema; const doc = run_doc.doc; const now = new Date(); if (!schema || !schema.fields) return run_doc; const deps = this.buildDependencyGraph(schema); const changed = Object.keys(run_doc.input || {}); const affected = this.getAffectedFields(changed, deps); const order = this.topologicalSort(affected, deps); for (let fieldname of order) { const field = schema.fields.find(f => f.fieldname === fieldname); if (!field?.depends_on) continue; doc[fieldname] = this.evalRule(field.depends_on, doc, run_doc.ctx, now); } return run_doc; }",

    evalRule:
      "function(rule, doc, ctx, now) { now = now || new Date(); const h = { isFuture: (v, now) => v && new Date(v) > now, isPast: (v, now) => !v || new Date(v) <= now }; try { return new Function('doc', 'ctx', 'now', 'h', `return ${rule}`)(doc, ctx, now, h); } catch (error) { throw new Error(`Rule evaluation failed: ${rule}\\n${error.message}`); } }",

    buildDependencyGraph:
      "function(schema) { const graph = new Map(); for (let field of schema.fields) { const deps = new Set(); if (field.depends_on) { const matches = field.depends_on.matchAll(/doc\\.([a-zA-Z_][a-zA-Z0-9_]*)/g); for (let match of matches) { deps.add(match[1]); } } if (this.config.fieldStates[field.fieldname]?.rules) { for (let rule of Object.values(this.config.fieldStates[field.fieldname].rules)) { const matches = rule.matchAll(/doc\\.([a-zA-Z_][a-zA-Z0-9_]*)/g); for (let match of matches) { deps.add(match[1]); } } } graph.set(field.fieldname, Array.from(deps)); } return graph; }",

    getAffectedFields:
      "function(changed, graph) { const affected = new Set(changed); const queue = [...changed]; while (queue.length > 0) { const field = queue.shift(); for (let [f, deps] of graph) { if (deps.includes(field) && !affected.has(f)) { affected.add(f); queue.push(f); } } } return Array.from(affected); }",

    topologicalSort:
      "function(fields, graph) { const visited = new Set(); const temp = new Set(); const result = []; const visit = (field) => { if (temp.has(field)) { throw new Error(`Circular dependency detected: ${field}`); } if (visited.has(field)) return; temp.add(field); const deps = graph.get(field) || []; for (let dep of deps) { if (fields.includes(dep)) { visit(dep); } } temp.delete(field); visited.add(field); result.push(field); }; for (let field of fields) { if (!visited.has(field)) { visit(field); } } return result; }",

    hashPassword: "async function(password) { return 'hashed_' + password; }",

    verifyPassword:
      "async function(password, hash) { return 'hashed_' + password === hash; }",

    generateCode:
      "function() { return Math.floor(100000 + Math.random() * 900000).toString(); }",

    generateToken:
      "async function(user) { return 'token_' + user.email + '_' + Date.now(); }",

    invalidateToken: "async function(token) { return true; }",

    sendVerificationEmail:
      "async function(user) { console.log('Verification email sent to', user.email, 'Code:', user.verification_code); }",

    sanitizeUser:
      "function(user) { const {password, verification_code, password_reset_token, ...safe} = user; return safe; }",
  },

  scripts: [],
};
