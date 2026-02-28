// ./auth-adapter.js


const config = {
  rateLimit: {
    ip:   { max: 100,  window: 60000 },
    user: { max: 1000, window: 60000 },
  },
  bodySize:    102400,
  methods:     ["POST"],
  contentType: "application/json",

  jwtSecret:
    (typeof process !== "undefined" && process.env?.JWT_SECRET) ||
    "change-this-secret-in-production",
  jwtAlgorithm: "HS256",

  accessTokenExpiry:    "15m",
  refreshTokenExpiry:   "30d",
  accessTokenExpiryMs:  15 * 60 * 1000,
  refreshTokenExpiryMs: 30 * 24 * 60 * 60 * 1000,

  passwordHashIterations: 100000,
  saltLength:             16,
  maxFailedAttempts:      5,
  lockDurationMs:         15 * 60 * 1000,
  maxRefreshTokens:       5,

  userDoctype:        "User",
  userEmailField:     "email",
  emailVerifiedField: "email_verified",

  defaultRoles: ["Desk User"],
  adminRole:    "System Manager",
  publicRole:   "Is Public",

  includeInJWT: ["_allowed_read", "email_verified"],
};

let _rateLimits = new Map();

function checkRateLimit(key) {
  const now    = Date.now();
  const isUser = key.startsWith("user:");
  const cfg    = isUser ? config.rateLimit.user : config.rateLimit.ip;
  let times    = _rateLimits.get(key) || [];
  times        = times.filter(t => t > now - cfg.window);
  if (times.length >= cfg.max) return false;
  times.push(now);
  _rateLimits.set(key, times);
  return true;
}

async function execute(payload, run_doc) {

  const adapterKey = `Adapter.${CW._config.adapters.payloadAdapters['Request']}.${execute.name}`;
  //const adapterKey = `Adapter.${CW._config.adapters.payloadAdapters['Request']}`;

  const ip = payload.headers?.get("CF-Connecting-IP")
    || payload.headers?.get("X-Forwarded-For")
    || "unknown";

  if (!checkRateLimit(`ip:${ip}`)) {
    run_doc.input[adapterKey] = "-1";
    run_doc.error = "429 Too Many Requests";
    return;
  }

  const contentLength = parseInt(payload.headers?.get("Content-Length") || 0);
  if (contentLength > config.bodySize) {
    run_doc.input[adapterKey] = "-1";
    run_doc.error = "413 Payload Too Large";
    return;
  }

  if (!config.methods.includes(payload.method)) {
    run_doc.input[adapterKey] = "-1";
    run_doc.error = "405 Method Not Allowed";
    return;
  }

  const contentType = payload.headers?.get("Content-Type") || "";
  if (!contentType.includes(config.contentType)) {
    run_doc.input[adapterKey] = "-1";
    run_doc.error = "400 Invalid Content-Type";
    return;
  }

  let body;
  try {
    body = await payload.json();
  } catch {
    run_doc.input[adapterKey] = "-1";
    run_doc.error = "400 Invalid JSON";
    return;
  }

  if (!body.operation) {
    run_doc.input[adapterKey] = "-1";
    run_doc.error = "400 Missing operation";
    return;
  }

  // ── auth: verify token if present ─────────────────────────
  const token = payload.headers?.get("Authorization")?.replace("Bearer ", "") || null;
  let authenticated = 0;
  let jwtPayload = null;

 if (token && token.split('.').length === 3) {
    jwtPayload = await verifyJWT(token, config.jwtSecret);
    authenticated = jwtPayload ? 1 : 0;
  }

  // ── write to input (body as-is) ────────────────────────────
// routing fields — prefixed
for (const [key, val] of Object.entries(body)) {
  if (key === 'input') continue;
  run_doc.input[`.${key}`] = val;
}

// data fields — flat
Object.assign(run_doc.input, body.input, { [adapterKey]: "1" });

  // Object.assign(run_doc.input, body, { [adapterKey]: "1" });

  // ── write to user (adapter namespace only) ─────────────────
  run_doc.user = {
    [adapterKey]: {
      ip,
      method:        payload.method,
      contentType,
      token,
      authenticated,
      ...(jwtPayload && { jwt: jwtPayload }),
    },
  };
}



async function generateToken(run_doc) {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto required");

  const user = run_doc.target.data[0];
  const cfg  = globalThis.CW._config.adapters.registry.auth.config;
  const now  = Math.floor(Date.now() / 1000);
  const exp  = now + Math.floor(cfg.accessTokenExpiryMs / 1000);

  function base64urlFromBytes(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64urlFromJSON(obj) {
    return base64urlFromBytes(new TextEncoder().encode(JSON.stringify(obj)));
  }

  const header  = base64urlFromJSON({ alg: cfg.jwtAlgorithm || 'HS256', typ: 'JWT' });
  const payload = base64urlFromJSON({
    sub:            user.email,
    email:          user.email,
    name:           user.name,
    _allowed_read:  user._allowed_read,
    email_verified: user.email_verified ? 1 : 0,
    exp,
  });

  const data = `${header}.${payload}`;
  const key  = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(cfg.jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  user.token = `${data}.${base64urlFromBytes(new Uint8Array(sig))}`;

  return run_doc;
}

async function verifyJWT(token, jwtSecret) {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto required");
  if (!token || !jwtSecret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  function base64urlToBytes(str) {
    try {
      str = str.replace(/-/g, "+").replace(/_/g, "/");
      const padded = str + "===".slice((str.length + 3) % 4);
      return new Uint8Array([...atob(padded)].map(c => c.charCodeAt(0)));
    } catch { return null; }
  }

  const signatureBytes = base64urlToBytes(signatureB64);
  if (!signatureBytes) return null;

  const dataBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  let key;
  try {
    key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
  } catch { return null; }

  let valid;
  try {
    valid = await crypto.subtle.verify("HMAC", key, signatureBytes, dataBytes);
  } catch { return null; }

  if (!valid) return null;

  let payload;
  try {
    const bytes = base64urlToBytes(payloadB64);
    if (!bytes) return null;
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export default { config, execute, checkRateLimit, generateToken, verifyJWT };

Object.assign(globalThis, { execute, checkRateLimit, generateToken, verifyJWT });